import { MatchStatus, Prisma } from '@prisma/client';
import { Response } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../types/http';

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<Response | void> | Response | void;

// Reusable matching function - can be called from HTTP handler or Plaid sync
export async function executeMatching(
  orgId: string,
  statementId: string,
  options?: { minConfidence?: number; dateRangeDays?: number }
): Promise<{ matchCount: number; matches: Array<{ cardTxnId: string; expenseId: string; score: number; amountDiff: number; daysDiff: number }> }> {
  const { minConfidence = 0.7, dateRangeDays = 7 } = options || {};

  const safeMinConfidence = Number.isFinite(minConfidence) ? minConfidence : 0.7;
  const safeDateRangeDays = Number.isFinite(dateRangeDays) ? dateRangeDays : 7;

  const statement = await prisma.statement.findFirst({
    where: { id: statementId, orgId },
    include: { transactions: true }
  });

  if (!statement) {
    throw new Error('Statement not found');
  }

  // Get all expenses for org that do not already have matches
  const expenses = await prisma.expense.findMany({
    where: {
      orgId,
      matches: { none: {} },
      deletedAt: null
    }
  });

  const matches: Array<{ cardTxnId: string; expenseId: string; score: number; amountDiff: number; daysDiff: number }> = [];

  // Simple matching algorithm - can be enhanced
  for (const transaction of statement.transactions) {
    const txnDate = transaction.transactionDate ?? transaction.postedDate;
    if (!txnDate) continue;

    for (const expense of expenses) {
      const expenseDate = expense.expenseDate;
      const daysDiff = Math.abs(
        (txnDate.getTime() - expenseDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff > safeDateRangeDays) continue;

      // Amount match (within 1% or exact)
      const amountDiff = Math.abs(transaction.amountCents - expense.amountCents);
      const amountConfidence = amountDiff === 0
        ? 1.0
        : (1.0 - (amountDiff / Math.max(transaction.amountCents, expense.amountCents)));

      if (amountConfidence < 0.99) continue;

      // Merchant similarity (basic)
      let merchantConfidence = 0.5;
      const txMerchant = (transaction.merchantNorm || transaction.merchantRaw || '').toLowerCase();
      const expenseMerchant = (expense.merchant || '').toLowerCase();

      if (txMerchant && expenseMerchant) {
        if (txMerchant === expenseMerchant) {
          merchantConfidence = 1.0;
        } else if (txMerchant.includes(expenseMerchant) || expenseMerchant.includes(txMerchant)) {
          merchantConfidence = 0.8;
        }
      }

      // Overall confidence
      const confidence = (amountConfidence * 0.6)
        + (merchantConfidence * 0.3)
        + (0.1 * (1 - daysDiff / safeDateRangeDays));

      if (confidence >= safeMinConfidence) {
        matches.push({
          cardTxnId: transaction.id,
          expenseId: expense.id,
          score: Math.round(confidence * 100) / 100,
          amountDiff,
          daysDiff: Math.round(daysDiff)
        });
      }
    }
  }

  // Create match records
  await prisma.$transaction(async (tx) => {
    for (const match of matches) {
      await tx.receiptMatch.upsert({
        where: {
          expenseId_cardTxnId: {
            expenseId: match.expenseId,
            cardTxnId: match.cardTxnId
          }
        },
        update: {
          score: match.score,
          status: match.score >= 0.9 ? 'MATCHED' : 'NEEDS_REVIEW'
        },
        create: {
          orgId,
          cardTxnId: match.cardTxnId,
          expenseId: match.expenseId,
          score: match.score,
          status: match.score >= 0.9 ? 'MATCHED' : 'NEEDS_REVIEW'
        }
      });
    }
  });

  return { matchCount: matches.length, matches };
}

// Run matching algorithm for a statement (HTTP handler)
export const runMatching: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { statementId } = req.params;
    const { minConfidence = 0.7, dateRangeDays = 7 } = req.body;

    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }

    const minConfidenceValue = typeof minConfidence === 'number'
      ? minConfidence
      : Number.parseFloat(String(minConfidence));
    const dateRangeDaysValue = typeof dateRangeDays === 'number'
      ? dateRangeDays
      : Number.parseInt(String(dateRangeDays), 10);

    const result = await executeMatching(orgId, statementId, {
      minConfidence: Number.isFinite(minConfidenceValue) ? minConfidenceValue : 0.7,
      dateRangeDays: Number.isFinite(dateRangeDaysValue) ? dateRangeDaysValue : 7
    });

    res.json({
      success: true,
      message: `Found ${result.matchCount} matches`,
      matches: result.matches
    });
  } catch (error) {
    console.error('runMatching error:', error);
    if (error instanceof Error && error.message === 'Statement not found') {
      return res.status(404).json({
        success: false,
        error: 'Statement not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Get all matches for organization
export const getAllMatches: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { status, statementId } = req.query;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const where: Prisma.ReceiptMatchWhereInput = { orgId };
    const statusValue = typeof status === 'string' ? status : undefined;
    const statementIdValue = typeof statementId === 'string' ? statementId : undefined;
    const isMatchStatus = (value: string): value is MatchStatus => (
      value === 'MATCHED' || value === 'NEEDS_REVIEW' || value === 'REJECTED'
    );

    if (statusValue && isMatchStatus(statusValue)) {
      where.status = statusValue;
    }
    if (statementIdValue) {
      where.cardTxn = { statementId: statementIdValue };
    }
    
    const matches = await prisma.receiptMatch.findMany({
      where,
      include: {
        expense: true,
        cardTxn: {
          include: {
            statement: true
          }
        }
      },
      orderBy: { score: 'desc' }
    });
    
    res.json({
      success: true,
      matches
    });
  } catch (error) {
    console.error('getAllMatches error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Approve a match (creates expense from receipt)
export const approveMatch: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const match = await prisma.receiptMatch.findFirst({
      where: { id, orgId },
      include: {
        expense: true,
        cardTxn: true
      }
    });
    
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }
    
    if (match.status === 'MATCHED') {
      return res.status(400).json({
        success: false,
        error: 'Match already approved'
      });
    }
    
    // Update match status
    const updatedMatch = await prisma.receiptMatch.update({
      where: { id },
      data: { status: 'MATCHED' }
    });
    
    res.json({
      success: true,
      message: 'Match approved',
      match: updatedMatch
    });
  } catch (error) {
    console.error('approveMatch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Reject a match
export const rejectMatch: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const match = await prisma.receiptMatch.findFirst({
      where: { id, orgId }
    });
    
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }
    
    const updatedMatch = await prisma.receiptMatch.update({
      where: { id },
      data: { status: 'REJECTED' }
    });
    
    res.json({
      success: true,
      message: 'Match rejected',
      match: updatedMatch
    });
  } catch (error) {
    console.error('rejectMatch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Delete a match
export const deleteMatch: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const match = await prisma.receiptMatch.findFirst({
      where: { id, orgId }
    });
    
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }
    
    await prisma.receiptMatch.delete({
      where: { id }
    });
    
    res.json({
      success: true,
      message: 'Match deleted'
    });
  } catch (error) {
    console.error('deleteMatch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

