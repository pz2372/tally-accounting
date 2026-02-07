const prisma = require('../config/database');

// Get all expenses for the organization
exports.getAllExpenses = async (req, res) => {
  try {
    const { orgId } = req.user;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const { startDate, endDate, categoryId, minAmount, maxAmount } = req.query;
    
    const where = { orgId };
    
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }
    
    if (categoryId) {
      where.orgCategoryId = categoryId;
    }
    
    if (minAmount || maxAmount) {
      where.amountCents = {};
      if (minAmount) where.amountCents.gte = parseInt(minAmount);
      if (maxAmount) where.amountCents.lte = parseInt(maxAmount);
    }
    
    const expenses = await prisma.expense.findMany({
      where,
      include: {
        receipt: true,
        orgCategory: {
          include: {
            preset: true
          }
        },
        matches: {
          include: {
            cardTxn: {
              include: {
                statement: true
              }
            }
          }
        }
      },
      orderBy: {
        expenseDate: 'desc'
      }
    });
    
    res.json({ 
      success: true,
      expenses
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Get expense by ID
exports.getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const { orgId } = req.user;
    
    const expense = await prisma.expense.findFirst({
      where: { 
        id,
        orgId
      },
      include: {
        receipt: true,
        orgCategory: {
          include: {
            preset: true
          }
        },
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
    });
    
    if (!expense) {
      return res.status(404).json({ 
        success: false,
        error: 'Expense not found'
      });
    }
    
    res.json({ 
      success: true,
      expense
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Create new expense
exports.createExpense = async (req, res) => {
  try {
    const { merchant, amountCents, orgCategoryId, expenseDate, notes, receiptId } = req.body;
    const { orgId } = req.user;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    // Validate required fields
    if (!amountCents || !orgCategoryId || !expenseDate) {
      return res.status(400).json({
        success: false,
        error: 'Amount, category, and expense date are required'
      });
    }
    
    // Verify category belongs to org and get name snapshot
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
    
    const expenseData = {
      orgId,
      merchant,
      amountCents: parseInt(amountCents),
      orgCategoryId,
      categoryNameSnapshot: orgCategory.customName || orgCategory.preset.name,
      expenseDate: new Date(expenseDate),
      notes
    };
    
    // If receiptId provided, verify it belongs to this org
    if (receiptId) {
      const receipt = await prisma.receipt.findFirst({
        where: { id: receiptId, orgId }
      });
      
      if (!receipt) {
        return res.status(404).json({
          success: false,
          error: 'Receipt not found'
        });
      }
      
      expenseData.receiptId = receiptId;
    }
    
    const expense = await prisma.expense.create({
      data: expenseData,
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
      message: 'Expense created successfully',
      expense
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Update expense
exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { orgId } = req.user;
    const { merchant, amountCents, orgCategoryId, expenseDate, notes, receiptId } = req.body;
    
    // Check if expense exists and belongs to org
    const existing = await prisma.expense.findFirst({
      where: { id, orgId }
    });
    
    if (!existing) {
      return res.status(404).json({ 
        success: false,
        error: 'Expense not found'
      });
    }
    
    const updateData = {};
    if (merchant !== undefined) updateData.merchant = merchant;
    if (amountCents !== undefined) updateData.amountCents = parseInt(amountCents);
    if (expenseDate) updateData.expenseDate = new Date(expenseDate);
    if (notes !== undefined) updateData.notes = notes;
    
    // If category is being changed, verify and update snapshot
    if (orgCategoryId) {
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
      
      updateData.orgCategoryId = orgCategoryId;
      updateData.categoryNameSnapshot = orgCategory.customName || orgCategory.preset.name;
    }
    
    if (receiptId !== undefined) {
      if (receiptId) {
        // Verify receipt belongs to org
        const receipt = await prisma.receipt.findFirst({
          where: { id: receiptId, orgId }
        });
        if (!receipt) {
          return res.status(404).json({
            success: false,
            error: 'Receipt not found'
          });
        }
      }
      updateData.receiptId = receiptId;
    }
    
    const expense = await prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        receipt: true,
        orgCategory: {
          include: {
            preset: true
          }
        }
      }
    });
    
    res.json({ 
      success: true,
      message: 'Expense updated successfully',
      expense
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Delete expense
exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { orgId } = req.user;
    
    // Check if expense exists and belongs to org
    const existing = await prisma.expense.findFirst({
      where: { id, orgId }
    });
    
    if (!existing) {
      return res.status(404).json({ 
        success: false,
        error: 'Expense not found'
      });
    }
    
    await prisma.expense.delete({
      where: { id }
    });
    
    res.json({ 
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};
