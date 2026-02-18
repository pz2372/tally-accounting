import { Prisma } from '@prisma/client';
import { Response } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../types/http';
import { uploadToS3 } from '../services/s3Service';

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<Response | void> | Response | void;

// Get all expenses for the organization
export const getAllExpenses: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const { startDate, endDate, categoryId, minAmount, maxAmount } = req.query;
    
    const where: Prisma.ExpenseWhereInput = { orgId, deletedAt: null };
    const startDateValue = typeof startDate === 'string' ? startDate : undefined;
    const endDateValue = typeof endDate === 'string' ? endDate : undefined;
    const categoryIdValue = typeof categoryId === 'string' ? categoryId : undefined;
    const minAmountValue = typeof minAmount === 'string' ? minAmount : undefined;
    const maxAmountValue = typeof maxAmount === 'string' ? maxAmount : undefined;
    
    if (startDateValue || endDateValue) {
      where.expenseDate = {};
      if (startDateValue) where.expenseDate.gte = new Date(startDateValue);
      if (endDateValue) where.expenseDate.lte = new Date(endDateValue);
    }
    
    if (categoryIdValue) {
      where.orgCategoryId = categoryIdValue;
    }
    
    if (minAmountValue || maxAmountValue) {
      where.amountCents = {};
      if (minAmountValue) where.amountCents.gte = Number.parseInt(minAmountValue, 10);
      if (maxAmountValue) where.amountCents.lte = Number.parseInt(maxAmountValue, 10);
    }
    
    const expenses = await prisma.expense.findMany({
      where,
      include: {
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
export const getExpenseById: Handler = async (req, res) => {
  try {
    const { id } = req.params;
    const { orgId } = req.user;
    
    const expense = await prisma.expense.findFirst({
      where: { 
        id,
        orgId
      },
      include: {
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
export const createExpense: Handler = async (req, res) => {
  try {
    const { merchant, amountCents, paymentMethod, orgCategoryId, presetCategoryId, expenseDate, notes } = req.body;
    const { orgId } = req.user;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    // Validate required fields
    if (!amountCents || (!orgCategoryId && !presetCategoryId) || !expenseDate) {
      return res.status(400).json({
        success: false,
        error: 'Amount, category (orgCategoryId or presetCategoryId), and expense date are required'
      });
    }
    
    let categoryName: string;
    let finalOrgCategoryId: string | null = null;
    
    // Handle category selection - prefer orgCategoryId, fallback to presetCategoryId
    if (orgCategoryId) {
      // Verify org category belongs to org and get name snapshot
      const orgCategory = await prisma.orgCategory.findFirst({
        where: { id: orgCategoryId, orgId, isEnabled: true },
        include: { preset: true }
      });
      
      if (!orgCategory) {
        return res.status(404).json({
          success: false,
          error: 'Organization category not found or not enabled'
        });
      }
      
      categoryName = orgCategory.customName || orgCategory.preset.name;
      finalOrgCategoryId = orgCategoryId;
    } else if (presetCategoryId) {
      // Use preset category directly
      const presetCategory = await prisma.presetCategory.findFirst({
        where: { id: presetCategoryId, isActive: true }
      });
      
      if (!presetCategory) {
        return res.status(404).json({
          success: false,
          error: 'Preset category not found or not active'
        });
      }
      
      categoryName = presetCategory.name;
      finalOrgCategoryId = null;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either orgCategoryId or presetCategoryId is required'
      });
    }
    
    const expense = await prisma.expense.create({
      data: {
        orgId,
        merchant,
        amountCents: Number.parseInt(String(amountCents), 10),
        paymentMethod: paymentMethod || 'CREDIT_CARD',
        orgCategoryId: finalOrgCategoryId,
        categoryNameSnapshot: categoryName,
        expenseDate: new Date(String(expenseDate)),
        notes
      },
      include: {
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
export const updateExpense: Handler = async (req, res) => {
  try {
    const { id } = req.params;
    const { orgId } = req.user;
    const { merchant, amountCents, paymentMethod, orgCategoryId, presetCategoryId, expenseDate, notes } = req.body;
    
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
    
    const updateData: Prisma.ExpenseUncheckedUpdateInput = {};
    if (merchant !== undefined) updateData.merchant = merchant;
    if (amountCents !== undefined) {
      updateData.amountCents = Number.parseInt(String(amountCents), 10);
    }
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (expenseDate) updateData.expenseDate = new Date(String(expenseDate));
    if (notes !== undefined) updateData.notes = notes;
    
    // If category is being changed, verify and update snapshot
    if (orgCategoryId !== undefined || presetCategoryId !== undefined) {
      if (orgCategoryId) {
        // Use org category
        const orgCategory = await prisma.orgCategory.findFirst({
          where: { id: orgCategoryId, orgId, isEnabled: true },
          include: { preset: true }
        });
        
        if (!orgCategory) {
          return res.status(404).json({
            success: false,
            error: 'Organization category not found or not enabled'
          });
        }
        
        updateData.orgCategoryId = orgCategoryId;
        updateData.categoryNameSnapshot = orgCategory.customName || orgCategory.preset.name;
      } else if (presetCategoryId) {
        // Use preset category directly
        const presetCategory = await prisma.presetCategory.findFirst({
          where: { id: presetCategoryId, isActive: true }
        });
        
        if (!presetCategory) {
          return res.status(404).json({
            success: false,
            error: 'Preset category not found or not active'
          });
        }
        
        updateData.orgCategoryId = null;
        updateData.categoryNameSnapshot = presetCategory.name;
      }
    }
    
    const expense = await prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
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
export const deleteExpense: Handler = async (req, res) => {
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
    
    await prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() }
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

// Create expense with receipt image (combined flow)
export const createExpenseWithReceipt: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }

    // Check for uploaded file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Receipt image is required'
      });
    }

    // Extract expense data from request body
    const { 
      merchant, 
      amountCents,
      paymentMethod, 
      orgCategoryId,
      presetCategoryId, 
      expenseDate, 
      notes,
      ocrText,
      confidence
    } = req.body;

    // Validate required fields
    if (!amountCents || (!orgCategoryId && !presetCategoryId) || !expenseDate) {
      return res.status(400).json({
        success: false,
        error: 'Amount, category (orgCategoryId or presetCategoryId), and expense date are required'
      });
    }

    let categoryName: string;
    let finalOrgCategoryId: string | null = null;
    
    // Handle category selection - prefer orgCategoryId, fallback to presetCategoryId
    if (orgCategoryId) {
      // Verify org category belongs to org and get name snapshot
      const orgCategory = await prisma.orgCategory.findFirst({
        where: { id: orgCategoryId, orgId, isEnabled: true },
        include: { preset: true }
      });
      
      if (!orgCategory) {
        return res.status(404).json({
          success: false,
          error: 'Organization category not found or not enabled'
        });
      }
      
      categoryName = orgCategory.customName || orgCategory.preset.name;
      finalOrgCategoryId = orgCategoryId;
    } else if (presetCategoryId) {
      // Use preset category directly
      const presetCategory = await prisma.presetCategory.findFirst({
        where: { id: presetCategoryId, isActive: true }
      });
      
      if (!presetCategory) {
        return res.status(404).json({
          success: false,
          error: 'Preset category not found or not active'
        });
      }
      
      categoryName = presetCategory.name;
      finalOrgCategoryId = null;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either orgCategoryId or presetCategoryId is required'
      });
    }

    // Upload image to S3
    const s3Result = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      `${orgId}/receipts`
    );

    // Create expense with receipt URL directly in expense record
    const expense = await prisma.expense.create({
      data: {
        orgId,
        receiptUrl: s3Result.url,
        ocrText,
        confidence: confidence ? parseFloat(String(confidence)) : null,
        merchant,
        amountCents: Number.parseInt(String(amountCents), 10),
        paymentMethod: paymentMethod || 'CREDIT_CARD',
        orgCategoryId: finalOrgCategoryId,
        categoryNameSnapshot: categoryName,
        expenseDate: new Date(String(expenseDate)),
        notes
      },
      include: {
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
    console.error('Create expense with receipt error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create expense with receipt'
    });
  }
};
