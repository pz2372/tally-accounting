import { Prisma } from '@prisma/client';
import { Response } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../types/http';
import { uploadToS3 } from '../services/s3Service';
import { PRESET_CATEGORIES, isValidCategoryName, getCategoryKey, getCategoryName } from '../config/categories';

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<Response | void> | Response | void;

// Resolve categoryKey + categoryNameSnapshot from a category name.
// Returns null if the category name is invalid or disabled for this org.
async function resolveCategory(
  categoryName: string,
  orgId: string
): Promise<{ categoryKey: string; categoryNameSnapshot: string } | null> {
  if (!isValidCategoryName(categoryName)) return null;

  const key = getCategoryKey(categoryName)!;

  // Check if org has explicitly disabled this category
  const override = await prisma.orgCategory.findUnique({
    where: { orgId_categoryKey: { orgId, categoryKey: key } },
  });
  if (override && !override.isEnabled) return null;

  return { categoryKey: key, categoryNameSnapshot: categoryName };
}

// Get all expenses for the organization
export const getAllExpenses: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;

    if (!orgId) {
      return res.status(403).json({ success: false, error: 'Organization context required' });
    }

    const { startDate, endDate, categoryKey: categoryKeyFilter, minAmount, maxAmount } = req.query;

    const where: Prisma.ExpenseWhereInput = { orgId, deletedAt: null };

    if (typeof startDate === 'string' || typeof endDate === 'string') {
      where.expenseDate = {};
      if (typeof startDate === 'string') where.expenseDate.gte = new Date(startDate);
      if (typeof endDate   === 'string') where.expenseDate.lte = new Date(endDate);
    }

    if (typeof categoryKeyFilter === 'string') {
      where.categoryKey = categoryKeyFilter;
    }

    if (typeof minAmount === 'string' || typeof maxAmount === 'string') {
      where.amountCents = {};
      if (typeof minAmount === 'string') where.amountCents.gte = Number.parseInt(minAmount, 10);
      if (typeof maxAmount === 'string') where.amountCents.lte = Number.parseInt(maxAmount, 10);
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        matches: {
          include: { cardTxn: { include: { statement: true } } }
        }
      },
      orderBy: { expenseDate: 'desc' }
    });

    res.json({ success: true, expenses });
  } catch (error) {
    console.error('getAllExpenses error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get expense by ID
export const getExpenseById: Handler = async (req, res) => {
  try {
    const { id } = req.params;
    const { orgId } = req.user;

    const expense = await prisma.expense.findFirst({
      where: { id, orgId },
      include: {
        matches: {
          include: { cardTxn: { include: { statement: true } } }
        }
      }
    });

    if (!expense) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }

    res.json({ success: true, expense });
  } catch (error) {
    console.error('getExpenseById error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Create new expense
export const createExpense: Handler = async (req, res) => {
  try {
    const { merchant, amountCents, paymentMethod, categoryName, expenseDate, notes } = req.body;
    const { orgId } = req.user;

    if (!orgId) {
      return res.status(403).json({ success: false, error: 'Organization context required' });
    }

    if (!amountCents || !categoryName || !expenseDate) {
      return res.status(400).json({ success: false, error: 'Amount, category, and expense date are required' });
    }

    const resolved = await resolveCategory(categoryName, orgId);
    if (!resolved) {
      return res.status(404).json({ success: false, error: `Category "${categoryName}" not found or disabled` });
    }

    const expense = await prisma.expense.create({
      data: {
        orgId,
        merchant,
        amountCents: Number.parseInt(String(amountCents), 10),
        paymentMethod: paymentMethod || 'CREDIT_CARD',
        categoryKey: resolved.categoryKey,
        categoryNameSnapshot: resolved.categoryNameSnapshot,
        expenseDate: new Date(String(expenseDate)),
        notes,
      },
      include: {
        matches: {
          include: { cardTxn: { include: { statement: true } } }
        }
      }
    });

    res.status(201).json({ success: true, message: 'Expense created successfully', expense });
  } catch (error) {
    console.error('createExpense error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Update expense
export const updateExpense: Handler = async (req, res) => {
  try {
    const { id } = req.params;
    const { orgId } = req.user;
    const { merchant, amountCents, paymentMethod, categoryName, expenseDate, notes } = req.body;

    const existing = await prisma.expense.findFirst({ where: { id, orgId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }

    const updateData: Prisma.ExpenseUncheckedUpdateInput = {};
    if (merchant      !== undefined) updateData.merchant      = merchant;
    if (amountCents   !== undefined) updateData.amountCents   = Number.parseInt(String(amountCents), 10);
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (expenseDate)                 updateData.expenseDate   = new Date(String(expenseDate));
    if (notes         !== undefined) updateData.notes         = notes;

    if (categoryName !== undefined) {
      const resolved = await resolveCategory(categoryName, orgId);
      if (!resolved) {
        return res.status(404).json({ success: false, error: `Category "${categoryName}" not found or disabled` });
      }
      updateData.categoryKey          = resolved.categoryKey;
      updateData.categoryNameSnapshot = resolved.categoryNameSnapshot;
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        matches: {
          include: { cardTxn: { include: { statement: true } } }
        }
      }
    });

    res.json({ success: true, message: 'Expense updated successfully', expense });
  } catch (error) {
    console.error('updateExpense error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Delete expense (soft delete)
export const deleteExpense: Handler = async (req, res) => {
  try {
    const { id } = req.params;
    const { orgId } = req.user;

    const existing = await prisma.expense.findFirst({ where: { id, orgId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }

    await prisma.expense.update({ where: { id }, data: { deletedAt: new Date() } });

    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('deleteExpense error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Dismiss missing receipt (admin only)
export const dismissMissingReceipt: Handler = async (req, res) => {
  try {
    const { id } = req.params;
    const { orgId, role } = req.user;

    if (role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const existing = await prisma.expense.findFirst({ where: { id, orgId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }

    await prisma.expense.update({ where: { id }, data: { receiptNotNeeded: true } });

    res.json({ success: true, message: 'Receipt dismissed successfully' });
  } catch (error) {
    console.error('dismissMissingReceipt error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Create expense with receipt image (combined flow)
export const createExpenseWithReceipt: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;

    if (!orgId) {
      return res.status(403).json({ success: false, error: 'Organization context required' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Receipt image is required' });
    }

    const { merchant, amountCents, paymentMethod, categoryName, expenseDate, notes, ocrText, confidence } = req.body;

    if (!amountCents || !categoryName || !expenseDate) {
      return res.status(400).json({ success: false, error: 'Amount, category, and expense date are required' });
    }

    const resolved = await resolveCategory(categoryName, orgId);
    if (!resolved) {
      return res.status(404).json({ success: false, error: `Category "${categoryName}" not found or disabled` });
    }

    const s3Result = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      `receipts/${orgId}`
    );

    const expense = await prisma.expense.create({
      data: {
        orgId,
        receiptUrl: s3Result.url,
        ocrText,
        confidence: confidence ? parseFloat(String(confidence)) : null,
        merchant,
        amountCents: Number.parseInt(String(amountCents), 10),
        paymentMethod: paymentMethod || 'CREDIT_CARD',
        categoryKey: resolved.categoryKey,
        categoryNameSnapshot: resolved.categoryNameSnapshot,
        expenseDate: new Date(String(expenseDate)),
        notes,
      },
      include: {
        matches: {
          include: { cardTxn: { include: { statement: true } } }
        }
      }
    });

    res.status(201).json({ success: true, message: 'Expense created successfully', expense });
  } catch (error) {
    console.error('createExpenseWithReceipt error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
