const prisma = require('../config/database');

// Run matching algorithm for a statement
exports.runMatching = async (req, res) => {
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
    
    // Verify statement belongs to org
    const statement = await prisma.cardStatement.findFirst({
      where: { id: statementId, orgId },
      include: {
        transactions: true
      }
    });
    
    if (!statement) {
      return res.status(404).json({
        success: false,
        error: 'Statement not found'
      });
    }
    
    // Get all receipts for org in relevant date range
    const receipts = await prisma.receipt.findMany({
      where: {
        orgId,
        expense: null // Only unmatched receipts
      }
    });
    
    const matches = [];
    
    // Simple matching algorithm - can be enhanced
    for (const transaction of statement.transactions) {
      for (const receipt of receipts) {
        if (!receipt.totalCents || !receipt.receiptDate) continue;
        
        // Date proximity check
        const daysDiff = Math.abs(
          (new Date(transaction.transactionDate) - new Date(receipt.receiptDate)) / (1000 * 60 * 60 * 24)
        );
        
        if (daysDiff > dateRangeDays) continue;
        
        // Amount match (within 1% or exact)
        const amountDiff = Math.abs(transaction.amountCents - receipt.totalCents);
        const amountConfidence = amountDiff === 0 ? 1.0 : 
          (1.0 - (amountDiff / Math.max(transaction.amountCents, receipt.totalCents)));
        
        if (amountConfidence < 0.99) continue; // Require very close amount match
        
        // Merchant similarity (basic)
        let merchantConfidence = 0.5;
        if (transaction.merchant && receipt.merchant) {
          const txMerchant = transaction.merchant.toLowerCase();
          const rcMerchant = receipt.merchant.toLowerCase();
          
          if (txMerchant === rcMerchant) {
            merchantConfidence = 1.0;
          } else if (txMerchant.includes(rcMerchant) || rcMerchant.includes(txMerchant)) {
            merchantConfidence = 0.8;
          }
        }
        
        // Overall confidence
        const confidence = (amountConfidence * 0.6) + (merchantConfidence * 0.3) + (0.1 * (1 - daysDiff / dateRangeDays));
        
        if (confidence >= minConfidence) {
          matches.push({
            transactionId: transaction.id,
            receiptId: receipt.id,
            confidence: Math.round(confidence * 100) / 100,
            amountDiff,
            daysDiff: Math.round(daysDiff)
          });
        }
      }
    }
    
    // Create match records
    await prisma.$transaction(async (tx) => {
      for (const match of matches) {
        await tx.receiptMatch.create({
          data: {
            orgId,
            transactionId: match.transactionId,
            receiptId: match.receiptId,
            confidence: match.confidence,
            status: match.confidence >= 0.9 ? 'AUTO_MATCHED' : 'SUGGESTED'
          }
        });
      }
    });
    
    res.json({
      success: true,
      message: `Found ${matches.length} matches`,
      matches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all matches for organization
exports.getAllMatches = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { status, statementId } = req.query;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const where = { orgId };
    if (status) where.status = status;
    if (statementId) {
      where.transaction = { statementId };
    }
    
    const matches = await prisma.receiptMatch.findMany({
      where,
      include: {
        receipt: true,
        transaction: {
          include: {
            statement: true
          }
        }
      },
      orderBy: { confidence: 'desc' }
    });
    
    res.json({
      success: true,
      matches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Approve a match (creates expense from receipt)
exports.approveMatch = async (req, res) => {
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
        receipt: true,
        transaction: true
      }
    });
    
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }
    
    if (match.status === 'APPROVED') {
      return res.status(400).json({
        success: false,
        error: 'Match already approved'
      });
    }
    
    // Check if receipt already has an expense
    if (match.receipt.expenseId) {
      return res.status(400).json({
        success: false,
        error: 'Receipt already converted to expense'
      });
    }
    
    // Update match status
    const updatedMatch = await prisma.receiptMatch.update({
      where: { id },
      data: { status: 'APPROVED' }
    });
    
    res.json({
      success: true,
      message: 'Match approved',
      match: updatedMatch
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Reject a match
exports.rejectMatch = async (req, res) => {
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete a match
exports.deleteMatch = async (req, res) => {
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = exports;
