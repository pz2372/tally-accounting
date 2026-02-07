const prisma = require('../config/database');

// Upload receipt (stores metadata, actual file upload handled by middleware)
exports.uploadReceipt = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { imageUrl, merchant, totalCents, receiptDate, ocrText, confidence } = req.body;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const receipt = await prisma.receipt.create({
      data: {
        orgId,
        imageUrl,
        merchant,
        totalCents: totalCents ? parseInt(totalCents) : null,
        receiptDate: receiptDate ? new Date(receiptDate) : null,
        ocrText,
        confidence: confidence ? parseFloat(confidence) : null
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Receipt uploaded successfully',
      receipt
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all receipts for organization
exports.getAllReceipts = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { startDate, endDate, merchant, hasExpense } = req.query;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const where = { orgId };
    
    if (startDate || endDate) {
      where.receiptDate = {};
      if (startDate) where.receiptDate.gte = new Date(startDate);
      if (endDate) where.receiptDate.lte = new Date(endDate);
    }
    
    if (merchant) {
      where.merchant = { contains: merchant, mode: 'insensitive' };
    }
    
    if (hasExpense === 'false') {
      where.expense = null;
    } else if (hasExpense === 'true') {
      where.expense = { isNot: null };
    }
    
    const receipts = await prisma.receipt.findMany({
      where,
      include: {
        expense: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json({
      success: true,
      receipts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get receipt by ID
exports.getReceiptById = async (req, res) => {
  try {
    const { id } = req.params;
    const { orgId } = req.user;
    
    const receipt = await prisma.receipt.findFirst({
      where: { id, orgId },
      include: {
        expense: {
          include: {
            matches: {
              include: {
                cardTxn: {
                  include: {
                    statement: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found'
      });
    }
    
    res.json({
      success: true,
      receipt
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update receipt
exports.updateReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { orgId } = req.user;
    const { merchant, totalCents, receiptDate, ocrText } = req.body;
    
    const existing = await prisma.receipt.findFirst({
      where: { id, orgId }
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found'
      });
    }
    
    const updateData = {};
    if (merchant !== undefined) updateData.merchant = merchant;
    if (totalCents !== undefined) updateData.totalCents = totalCents ? parseInt(totalCents) : null;
    if (receiptDate !== undefined) updateData.receiptDate = receiptDate ? new Date(receiptDate) : null;
    if (ocrText !== undefined) updateData.ocrText = ocrText;
    
    const receipt = await prisma.receipt.update({
      where: { id },
      data: updateData,
      include: {
        expense: true
      }
    });
    
    res.json({
      success: true,
      message: 'Receipt updated successfully',
      receipt
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete receipt
exports.deleteReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { orgId } = req.user;
    
    const existing = await prisma.receipt.findFirst({
      where: { id, orgId }
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found'
      });
    }
    
    await prisma.receipt.delete({
      where: { id }
    });
    
    res.json({
      success: true,
      message: 'Receipt deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Convert receipt to expense
exports.convertToExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { orgId } = req.user;
    const { orgCategoryId, notes, amountCents, expenseDate } = req.body;
    
    const receipt = await prisma.receipt.findFirst({
      where: { id, orgId }
    });
    
    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found'
      });
    }
    
    // Check if receipt already has an expense
    const existingExpense = await prisma.expense.findFirst({
      where: { receiptId: id }
    });
    
    if (existingExpense) {
      return res.status(400).json({
        success: false,
        error: 'Receipt already has an associated expense'
      });
    }
    
    if (!orgCategoryId) {
      return res.status(400).json({
        success: false,
        error: 'Category is required'
      });
    }
    
    // Verify category and get name snapshot
    const orgCategory = await prisma.orgCategory.findFirst({
      where: { id: orgCategoryId, orgId, isEnabled: true },
      include: { preset: true }
    });
    
    if (!orgCategory) {
      return res.status(404).json({
        success: false,
        error: 'Category not found or not enabled'
      });
    }
    
    // Create expense from receipt data
    const expense = await prisma.expense.create({
      data: {
        orgId,
        receiptId: id,
        merchant: receipt.merchant,
        amountCents: amountCents || receipt.totalCents || 0,
        orgCategoryId,
        categoryNameSnapshot: orgCategory.customName || orgCategory.preset.name,
        expenseDate: expenseDate ? new Date(expenseDate) : receipt.receiptDate || new Date(),
        notes
      },
      include: {
        receipt: true,
        orgCategory: {
          include: {
            preset: true
          }
        }
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Receipt converted to expense successfully',
      expense
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = exports;
