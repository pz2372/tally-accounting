import { Prisma } from '@prisma/client';
import { Response } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../types/http';

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<Response | void> | Response | void;

// Upload card statement with transactions
export const uploadStatement: Handler = async (req, res) => {
  try {
    const { orgId, userId } = req.user;
    const { provider, statementMonth, sourceType, transactions } = req.body;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({
        success: false,
        error: 'Transactions array is required'
      });
    }
    
    // Create statement with transactions in a transaction
    const statement = await prisma.$transaction(async (tx) => {
      const newStatement = await tx.statement.create({
        data: {
          orgId,
          provider,
          statementMonth,
          sourceType: sourceType || 'csv',
          uploadedById: userId
        }
      });
      
      // Create all transactions
      const transactionData = transactions.map(t => ({
        statementId: newStatement.id,
        postedDate: new Date(t.postedDate || t.postDate || t.transactionDate),
        transactionDate: t.transactionDate ? new Date(t.transactionDate) : null,
        merchantRaw: t.merchant,
        merchantNorm: t.merchantNorm || null,
        amountCents: Number.parseInt(String(t.amountCents), 10),
        currency: t.currency || 'USD',
        last4: t.last4 || null
      }));
      
      await tx.statementTransaction.createMany({
        data: transactionData
      });
      
      return newStatement;
    });
    
    res.status(201).json({
      success: true,
      message: 'Statement uploaded successfully',
      statement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all statements for organization
export const getAllStatements: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { provider, statementMonth } = req.query;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const where: Prisma.StatementWhereInput = { orgId };
    const providerValue = typeof provider === 'string' ? provider : undefined;
    const statementMonthValue = typeof statementMonth === 'string' ? statementMonth : undefined;
    if (providerValue) where.provider = providerValue;
    if (statementMonthValue) where.statementMonth = statementMonthValue;
    
    const statements = await prisma.statement.findMany({
      where,
      include: {
        uploadedBy: {
          select: { id: true, email: true, name: true }
        },
        _count: {
          select: { transactions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      statements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get statement by ID with transactions
export const getStatementById: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const statement = await prisma.statement.findFirst({
      where: { id, orgId },
      include: {
        uploadedBy: {
          select: { id: true, email: true, name: true }
        },
        transactions: {
          include: {
            matches: {
              include: {
                expense: {
                }
              }
            }
          },
          orderBy: { postedDate: 'desc' }
        }
      }
    });
    
    if (!statement) {
      return res.status(404).json({
        success: false,
        error: 'Statement not found'
      });
    }
    
    res.json({
      success: true,
      statement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get transactions for a statement
export const getStatementTransactions: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;
    const { hasMatch, merchant } = req.query;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    // Verify statement belongs to org
    const statement = await prisma.statement.findFirst({
      where: { id, orgId }
    });
    
    if (!statement) {
      return res.status(404).json({
        success: false,
        error: 'Statement not found'
      });
    }
    
    const where: Prisma.StatementTransactionWhereInput = { statementId: id };
    const merchantValue = typeof merchant === 'string' ? merchant : undefined;
    if (merchantValue) {
      where.OR = [
        { merchantRaw: { contains: merchantValue, mode: 'insensitive' } },
        { merchantNorm: { contains: merchantValue, mode: 'insensitive' } }
      ];
    }
    
    const transactions = await prisma.statementTransaction.findMany({
      where,
      include: {
        matches: {
          include: {
            expense: {
            }
          }
        }
      },
      orderBy: { postedDate: 'desc' }
    });
    
    // Filter by match status if requested
    let filteredTransactions = transactions;
    if (hasMatch !== undefined) {
      const shouldHaveMatch = hasMatch === 'true';
      filteredTransactions = transactions.filter(t => 
        shouldHaveMatch ? t.matches.length > 0 : t.matches.length === 0
      );
    }
    
    res.json({
      success: true,
      transactions: filteredTransactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete statement and all its transactions
export const deleteStatement: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    // Verify statement belongs to org
    const statement = await prisma.statement.findFirst({
      where: { id, orgId }
    });
    
    if (!statement) {
      return res.status(404).json({
        success: false,
        error: 'Statement not found'
      });
    }
    
    // Delete in transaction (will cascade to transactions and matches)
    await prisma.$transaction(async (tx) => {
      // Delete matches first
      await tx.receiptMatch.deleteMany({
        where: {
          cardTxn: { statementId: id }
        }
      });
      
      // Delete transactions
      await tx.statementTransaction.deleteMany({
        where: { statementId: id }
      });
      
      // Delete statement
      await tx.statement.delete({
        where: { id }
      });
    });
    
    res.json({
      success: true,
      message: 'Statement deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

