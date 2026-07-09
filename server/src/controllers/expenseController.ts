import { Prisma } from '@prisma/client';
import { Response } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../types/http';
import { uploadToS3, getS3Object, extractS3Key, getPresignedUrl } from '../services/s3Service';
import { PRESET_CATEGORIES, isValidCategoryName, getCategoryKey, getCategoryName } from '../config/categories';

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<Response | void> | Response | void;

const INVENTORY_KEYS = new Set(['inventory', 'supplies', 'inventory_purchases', 'materials_supplies']);
const INVENTORY_ITEM_RETENTION_YEARS = 2;
const RECEIPT_EXPORT_LINK_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

type InventoryItemInput = {
  name?: string;
  normalizedName?: string;
  quantity?: string | number;
  unit?: string;
  unitPrice?: string | number;
  total?: string | number;
};

const parseMoneyToCents = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseFloat(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
};

const parseQuantity = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseFloat(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const parseExportDateRange = (startDate: unknown, endDate: unknown) => {
  if (typeof startDate !== 'string' || typeof endDate !== 'string') return null;

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const escapeCsvValue = (value: unknown) => {
  const text = value === undefined || value === null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const titleCase = (value: string) => {
  return value
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const normalizeInventoryName = (value: string) => {
  const lowerValue = value.toLowerCase();
  const meatCutMap: Array<[RegExp, string]> = [
    [/\bchicken\s+thighs?\b|\bchicken\s+thigh\s+meat\b|\bthighs?\s+chicken\b|\bthighs?\b.*\bchicken\b/, 'Chicken Thighs'],
    [/\bchicken\s+legs?\b|\blegs?\s+chicken\b|\bchicken\s+drumsticks?\b|\bdrumsticks?\s+chicken\b|\bchicken\s+leg\s+quarters?\b|\bleg\s+quarters?\b.*\bchicken\b/, 'Chicken Legs'],
    [/\bchicken\s+breasts?\b|\bbreasts?\s+chicken\b/, 'Chicken Breasts'],
    [/\bchicken\s+wings?\b|\bwings?\s+chicken\b/, 'Chicken Wings'],
  ];
  const matchedMeatCut = meatCutMap.find(([pattern]) => pattern.test(lowerValue));
  if (matchedMeatCut) return matchedMeatCut[1];

  const cleaned = value
    .replace(/\b(organic|fresh|small|large|medium|mini|jumbo|ripe|green|red|yellow|hass|haas|bag|case|box|bulk|each|ea|lb|lbs|pound|pounds|oz|ounce|ounces|\d+(\.\d+)?)\b/gi, ' ')
    .replace(/[^a-zA-Z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const normalized = titleCase(cleaned || value.trim());
  const singularProduceMap: Record<string, string> = {
    Avocado: 'Avocados',
    Tomato: 'Tomatoes',
    Potato: 'Potatoes',
    Onion: 'Onions',
    Carrot: 'Carrots',
    Lemon: 'Lemons',
    Lime: 'Limes',
    Pepper: 'Peppers',
  };

  return singularProduceMap[normalized] || normalized;
};

const parseInventoryItems = (rawItems: unknown): InventoryItemInput[] => {
  if (!rawItems) return [];

  try {
    const parsed = typeof rawItems === 'string' ? JSON.parse(rawItems) : rawItems;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getInventoryItemRetentionCutoff = () => {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - INVENTORY_ITEM_RETENTION_YEARS);
  cutoff.setHours(0, 0, 0, 0);
  return cutoff;
};

const saveInventoryItemsForExpense = async ({
  orgId,
  expenseId,
  expenseDate,
  merchant,
  categoryKey,
  items,
}: {
  orgId: string;
  expenseId: string;
  expenseDate: Date;
  merchant?: string | null;
  categoryKey?: string | null;
  items: InventoryItemInput[];
}) => {
  if (!categoryKey || !INVENTORY_KEYS.has(categoryKey) || items.length === 0) return;

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { inventoryItemizedTrackerEnabled: true },
  });
  if (!org?.inventoryItemizedTrackerEnabled) return;

  const data = items
    .map(item => {
      const rawName = String(item.name || item.normalizedName || '').trim();
      if (!rawName) return null;

      return {
        orgId,
        expenseId,
        rawName,
        normalizedName: normalizeInventoryName(String(item.normalizedName || rawName)),
        quantity: parseQuantity(item.quantity),
        unit: item.unit ? String(item.unit).trim() : null,
        unitPriceCents: parseMoneyToCents(item.unitPrice),
        totalCents: parseMoneyToCents(item.total),
        purchasedAt: expenseDate,
        merchant: merchant || null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (data.length > 0) {
    await prisma.$transaction([
      prisma.inventoryItem.deleteMany({
        where: {
          orgId,
          purchasedAt: { lt: getInventoryItemRetentionCutoff() },
        },
      }),
      prisma.inventoryItem.createMany({ data }),
    ]);
  }
};

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

    await prisma.expense.updateMany({
      where: { id, orgId },
      data: updateData,
    });

    const expense = await prisma.expense.findFirst({
      where: { id, orgId },
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

    await prisma.expense.updateMany({ where: { id, orgId }, data: { deletedAt: new Date() } });

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

    await prisma.expense.updateMany({ where: { id, orgId }, data: { receiptNotNeeded: true } });

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

    const { merchant, amountCents, paymentMethod, categoryName, expenseDate, notes, ocrText, confidence, inventoryItems } = req.body;

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

    const parsedExpenseDate = new Date(String(expenseDate));
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
        expenseDate: parsedExpenseDate,
        notes,
      },
      include: {
        matches: {
          include: { cardTxn: { include: { statement: true } } }
        }
      }
    });

    await saveInventoryItemsForExpense({
      orgId,
      expenseId: expense.id,
      expenseDate: parsedExpenseDate,
      merchant,
      categoryKey: resolved.categoryKey,
      items: parseInventoryItems(inventoryItems),
    });

    res.status(201).json({ success: true, message: 'Expense created successfully', expense });
  } catch (error) {
    console.error('createExpenseWithReceipt error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const exportReceiptImages: Handler = async (req, res) => {
  try {
    const { orgId, role } = req.user;
    const range = parseExportDateRange(req.query.startDate, req.query.endDate);

    if (!orgId) {
      return res.status(403).json({ success: false, error: 'Organization context required' });
    }
    if (role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    if (!range) {
      return res.status(400).json({ success: false, error: 'Valid startDate and endDate are required' });
    }
    if (range.end.getTime() < range.start.getTime()) {
      return res.status(400).json({ success: false, error: 'endDate must be on or after startDate' });
    }

    const expenses = await prisma.expense.findMany({
      where: {
        orgId,
        deletedAt: null,
        receiptUrl: { not: null },
        expenseDate: { gte: range.start, lte: range.end },
      },
      select: {
        id: true,
        expenseDate: true,
        merchant: true,
        amountCents: true,
        currency: true,
        categoryKey: true,
        categoryNameSnapshot: true,
        notes: true,
        receiptUrl: true,
      },
      orderBy: { expenseDate: 'asc' },
    });

    const rows = await Promise.all(expenses.map(async expense => {
      let receiptImageUrl = expense.receiptUrl || '';
      const s3Key = receiptImageUrl ? extractS3Key(receiptImageUrl) : null;
      if (s3Key) {
        receiptImageUrl = await getPresignedUrl(s3Key, RECEIPT_EXPORT_LINK_EXPIRY_SECONDS);
      }

      const categoryName = expense.categoryNameSnapshot || (expense.categoryKey ? getCategoryName(expense.categoryKey) : '') || '';
      const description = [
        expense.merchant || 'Unknown merchant',
        categoryName,
        expense.notes || '',
      ].filter(Boolean).join(' - ');

      return [
        expense.id,
        expense.expenseDate.toISOString().slice(0, 10),
        expense.merchant || '',
        categoryName,
        (expense.amountCents / 100).toFixed(2),
        expense.currency,
        expense.notes || '',
        description,
        receiptImageUrl,
      ];
    }));

    const headers = [
      'Expense ID',
      'Date',
      'Merchant',
      'Category',
      'Amount',
      'Currency',
      'Notes',
      'Description',
      'Receipt Image URL',
    ];
    const csv = [headers, ...rows]
      .map(row => row.map(escapeCsvValue).join(','))
      .join('\n');
    const fileName = `receipt-images-${range.start.toISOString().slice(0, 10)}-${range.end.toISOString().slice(0, 10)}.csv`;

    res.json({
      success: true,
      fileName,
      mimeType: 'text/csv',
      count: rows.length,
      csvBase64: Buffer.from(csv, 'utf8').toString('base64'),
    });
  } catch (error) {
    console.error('exportReceiptImages error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get expense receipt image (proxy through server for private S3)
export const getExpenseImage: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;

    if (!orgId) {
      return res.status(403).json({ success: false, error: 'Organization context required' });
    }

    const expense = await prisma.expense.findFirst({
      where: { id, orgId },
      select: { receiptUrl: true },
    });

    if (!expense || !expense.receiptUrl) {
      return res.status(404).json({ success: false, error: 'Receipt image not found' });
    }

    const s3Key = extractS3Key(expense.receiptUrl);
    if (!s3Key) {
      return res.status(404).json({ success: false, error: 'Invalid file reference' });
    }

    const s3Response = await getS3Object(s3Key);

    res.setHeader('Content-Type', s3Response.ContentType || 'image/jpeg');
    if (s3Response.ContentLength) {
      res.setHeader('Content-Length', s3Response.ContentLength);
    }
    res.setHeader('Cache-Control', 'private, max-age=3600');

    const stream = s3Response.Body as NodeJS.ReadableStream;
    stream.pipe(res);
  } catch (error) {
    console.error('getExpenseImage error:', error);
    res.status(500).json({ success: false, error: 'Failed to load image' });
  }
};
