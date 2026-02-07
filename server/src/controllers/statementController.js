const prisma = require('../config/database');

// Upload card statement with transactions
exports.uploadStatement = async (req, res) => {
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
      const newStatement = await tx.cardStatement.create({
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
        orgId,
        transactionDate: new Date(t.transactionDate),
        postDate: t.postDate ? new Date(t.postDate) : null,
        merchant: t.merchant,
        amountCents: parseInt(t.amountCents),
        currency: t.currency || 'USD',
        description: t.description,
        category: t.category,
        rawCsvLine: t.rawCsvLine
      }));
      
      await tx.cardTransaction.createMany({
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
exports.getAllStatements = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { provider, statementMonth } = req.query;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const where = { orgId };
    if (provider) where.provider = provider;
    if (statementMonth) where.statementMonth = statementMonth;
    
    const statements = await prisma.cardStatement.findMany({
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
exports.getStatementById = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const statement = await prisma.cardStatement.findFirst({
      where: { id, orgId },
      include: {
        uploadedBy: {
          select: { id: true, email: true, name: true }
        },
        transactions: {
          include: {
            matches: {
              include: {
                receipt: true
              }
            }
          },
          orderBy: { transactionDate: 'desc' }
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
exports.getStatementTransactions = async (req, res) => {
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
    const statement = await prisma.cardStatement.findFirst({
      where: { id, orgId }
    });
    
    if (!statement) {
      return res.status(404).json({
        success: false,
        error: 'Statement not found'
      });
    }
    
    const where = { statementId: id };
    if (merchant) {
      where.merchant = { contains: merchant, mode: 'insensitive' };
    }
    
    const transactions = await prisma.cardTransaction.findMany({
      where,
      include: {
        matches: {
          include: {
            receipt: true
          }
        }
      },
      orderBy: { transactionDate: 'desc' }
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
exports.deleteStatement = async (req, res) => {
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
    const statement = await prisma.cardStatement.findFirst({
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
          transaction: { statementId: id }
        }
      });
      
      // Delete transactions
      await tx.cardTransaction.deleteMany({
        where: { statementId: id }
      });
      
      // Delete statement
      await tx.cardStatement.delete({
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

module.exports = exports;
