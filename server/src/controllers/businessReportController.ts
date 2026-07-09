import { Response } from 'express';
import PDFDocument from 'pdfkit';
import prisma from '../config/database';
import { transporter } from '../config/email';
import { AuthenticatedRequest } from '../types/http';
import { getAccountName, resolveLegacyKey } from '../config/defaultAccounts';
import { getPresignedUrl, uploadToS3 } from '../services/s3Service';
import { normalizePhoneNumberToE164, sendSms } from '../services/smsService';

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<Response | void> | Response | void;

const SALES_REPORT_KEY = 'sales';
const INVENTORY_REPORT_KEY = 'inventory';
const EXPENSES_REPORT_KEY = 'expenses';
const WAGES_REPORT_KEY = 'wages';
const VALID_REPORTS = new Set([INVENTORY_REPORT_KEY, EXPENSES_REPORT_KEY, WAGES_REPORT_KEY, SALES_REPORT_KEY]);
const VALID_CHANNELS = new Set(['message', 'email']);
const VALID_CADENCES = new Set(['weekly', 'monthly']);
const REPORT_LABELS: Record<string, string> = {
  [INVENTORY_REPORT_KEY]: 'Inventory',
  [EXPENSES_REPORT_KEY]: 'Expenses',
  [WAGES_REPORT_KEY]: 'Wages',
  [SALES_REPORT_KEY]: 'Sales',
};
const LEGACY_REPORT_KEY_TO_KEY: Record<string, string> = {
  labor: WAGES_REPORT_KEY,
  inventory: INVENTORY_REPORT_KEY,
  supplies: INVENTORY_REPORT_KEY,
  wages: WAGES_REPORT_KEY,
  advertising: EXPENSES_REPORT_KEY,
  car_truck: EXPENSES_REPORT_KEY,
  commissions_fees: EXPENSES_REPORT_KEY,
  contract_labor: EXPENSES_REPORT_KEY,
  insurance: EXPENSES_REPORT_KEY,
  office_expense: EXPENSES_REPORT_KEY,
  rent: EXPENSES_REPORT_KEY,
  repairs_maintenance: EXPENSES_REPORT_KEY,
  taxes_licenses: EXPENSES_REPORT_KEY,
  travel: EXPENSES_REPORT_KEY,
  meals: EXPENSES_REPORT_KEY,
  utilities: EXPENSES_REPORT_KEY,
  other_expenses: EXPENSES_REPORT_KEY,
  operations: EXPENSES_REPORT_KEY,
  tax: EXPENSES_REPORT_KEY,
  transportation: EXPENSES_REPORT_KEY,
  miscellaneous: EXPENSES_REPORT_KEY,
};
const INVENTORY_CATEGORY_KEYS = new Set(['inventory', 'supplies', 'inventory_purchases', 'materials_supplies']);
const WAGES_CATEGORY_KEYS = new Set(['labor', 'wages', 'direct_labor']);
const EXPENSE_CATEGORY_KEYS = new Set([
  'advertising',
  'car_truck',
  'commissions_fees',
  'contract_labor',
  'insurance',
  'office_expense',
  'rent',
  'repairs_maintenance',
  'taxes_licenses',
  'travel',
  'meals',
  'utilities',
  'other_expenses',
  'operations',
  'tax',
  'transportation',
  'miscellaneous',
]);
const REPORT_SMS_LINK_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

const normalizeStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string').map(item => item.trim().toLowerCase()).filter(Boolean);
};

const normalizeReportKey = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (normalized === SALES_REPORT_KEY) return SALES_REPORT_KEY;
  if (normalized === EXPENSES_REPORT_KEY) return EXPENSES_REPORT_KEY;
  if (LEGACY_REPORT_KEY_TO_KEY[normalized]) return LEGACY_REPORT_KEY_TO_KEY[normalized];
  if (normalized === 'auto expenses') return EXPENSES_REPORT_KEY;
  if (normalized === 'commissions & fees') return EXPENSES_REPORT_KEY;
  if (normalized === 'contract labor') return EXPENSES_REPORT_KEY;
  if (normalized === 'office expense') return EXPENSES_REPORT_KEY;
  if (normalized === 'repairs & maintenance') return EXPENSES_REPORT_KEY;
  if (normalized === 'taxes & licenses') return EXPENSES_REPORT_KEY;
  if (normalized === 'other expenses') return EXPENSES_REPORT_KEY;

  return LEGACY_REPORT_KEY_TO_KEY[resolveLegacyKey(normalized)] || normalized;
};

const normalizeReportArray = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  const reports = value
    .filter((item): item is string => typeof item === 'string')
    .map(normalizeReportKey)
    .filter(Boolean);
  return Array.from(new Set(reports));
};

const getReportValidationMessage = () =>
  'reports must include inventory, expenses, wages, sales, or a combination';

const parseDateRange = (startDate: unknown, endDate: unknown) => {
  if (typeof startDate !== 'string' || typeof endDate !== 'string') {
    return null;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const isRangeOverTwoMonths = (start: Date, end: Date) => {
  const maxEnd = new Date(start);
  maxEnd.setMonth(maxEnd.getMonth() + 2);
  maxEnd.setHours(23, 59, 59, 999);
  return end.getTime() > maxEnd.getTime();
};

const getStartOfDay = (date: Date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const getEndOfDay = (date: Date) => {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

const getNextWeeklyRunAt = (from = new Date()) => {
  const nextRunAt = new Date(from);
  const daysUntilMonday = (8 - nextRunAt.getDay()) % 7;
  nextRunAt.setDate(nextRunAt.getDate() + daysUntilMonday);
  nextRunAt.setHours(9, 0, 0, 0);

  if (nextRunAt.getTime() <= from.getTime()) {
    nextRunAt.setDate(nextRunAt.getDate() + 7);
  }

  return nextRunAt;
};

const getNextMonthlyRunAt = (from = new Date()) => {
  const nextRunAt = new Date(from.getFullYear(), from.getMonth(), 1, 9, 0, 0, 0);

  if (nextRunAt.getTime() <= from.getTime()) {
    nextRunAt.setMonth(nextRunAt.getMonth() + 1);
  }

  return nextRunAt;
};

const getNextRunAt = (cadence: string, from = new Date()) => {
  return cadence === 'weekly' ? getNextWeeklyRunAt(from) : getNextMonthlyRunAt(from);
};

const getNextFutureRunAt = (cadence: string, scheduledAt: Date, now = new Date()) => {
  let nextRunAt = new Date(scheduledAt);

  do {
    if (cadence === 'weekly') {
      nextRunAt.setDate(nextRunAt.getDate() + 7);
    } else {
      nextRunAt.setMonth(nextRunAt.getMonth() + 1);
    }
  } while (nextRunAt.getTime() <= now.getTime());

  return nextRunAt;
};

const getAutomatedReportRange = (cadence: string, scheduledAt: Date) => {
  if (cadence === 'weekly') {
    const start = getStartOfDay(scheduledAt);
    start.setDate(start.getDate() - 7);
    const end = getEndOfDay(start);
    end.setDate(end.getDate() + 6);
    return { start, end };
  }

  const start = new Date(scheduledAt.getFullYear(), scheduledAt.getMonth() - 1, 1, 0, 0, 0, 0);
  const end = new Date(scheduledAt.getFullYear(), scheduledAt.getMonth(), 0, 23, 59, 59, 999);
  return { start, end };
};

const summarizeExpenses = (expenses: Array<{
  amountCents: number;
  merchant: string | null;
  categoryKey: string | null;
  categoryNameSnapshot: string | null;
}>) => {
  const byCategory: Record<string, { categoryKey: string; categoryName: string; amountCents: number; count: number }> = {};
  const byMerchant: Record<string, { merchant: string; amountCents: number; count: number }> = {};
  let totalCents = 0;

  expenses.forEach(expense => {
    totalCents += expense.amountCents;

    const categoryKey = expense.categoryKey || 'uncategorized';
    const categoryName = expense.categoryNameSnapshot || getAccountName(categoryKey) || categoryKey;
    byCategory[categoryKey] = byCategory[categoryKey] || { categoryKey, categoryName, amountCents: 0, count: 0 };
    byCategory[categoryKey].amountCents += expense.amountCents;
    byCategory[categoryKey].count += 1;

    const merchant = expense.merchant || 'Unknown';
    byMerchant[merchant] = byMerchant[merchant] || { merchant, amountCents: 0, count: 0 };
    byMerchant[merchant].amountCents += expense.amountCents;
    byMerchant[merchant].count += 1;
  });

  return {
    totalCents,
    count: expenses.length,
    byCategory: Object.values(byCategory).sort((a, b) => b.amountCents - a.amountCents),
    topMerchants: Object.values(byMerchant).sort((a, b) => b.amountCents - a.amountCents).slice(0, 10),
  };
};

const summarizeCategoryExpenses = (
  expenses: Array<{
    amountCents: number;
    merchant: string | null;
    categoryKey: string | null;
    categoryNameSnapshot: string | null;
    expenseDate: Date;
    notes: string | null;
  }>,
  fallbackCategoryName: string
) => {
  const summary = summarizeExpenses(expenses);

  return {
    ...summary,
    entries: expenses
      .map(expense => ({
        date: expense.expenseDate.toISOString(),
        merchant: expense.merchant || 'Unknown',
        categoryName: expense.categoryNameSnapshot || (expense.categoryKey ? getAccountName(expense.categoryKey) : undefined) || fallbackCategoryName,
        notes: expense.notes || '',
        amountCents: expense.amountCents,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
  };
};

const summarizeInventoryItems = (items: Array<{
  normalizedName: string;
  rawName: string;
  quantity: number | null;
  unit: string | null;
  totalCents: number | null;
  purchasedAt: Date;
  merchant: string | null;
}>) => {
  const byItem: Record<string, {
    normalizedName: string;
    quantity: number;
    unit: string | null;
    amountCents: number;
    count: number;
    examples: string[];
  }> = {};

  items.forEach(item => {
    const key = item.normalizedName || item.rawName;
    byItem[key] = byItem[key] || {
      normalizedName: key,
      quantity: 0,
      unit: item.unit || null,
      amountCents: 0,
      count: 0,
      examples: [],
    };

    byItem[key].quantity += item.quantity || 0;
    byItem[key].amountCents += item.totalCents || 0;
    byItem[key].count += 1;
    if (item.rawName && !byItem[key].examples.includes(item.rawName) && byItem[key].examples.length < 3) {
      byItem[key].examples.push(item.rawName);
    }
    if (!byItem[key].unit && item.unit) {
      byItem[key].unit = item.unit;
    }
  });

  const itemTotals = Object.values(byItem).sort((a, b) => b.amountCents - a.amountCents);

  return {
    totalCents: itemTotals.reduce((sum, item) => sum + item.amountCents, 0),
    count: items.length,
    itemTotals,
    entries: items
      .map(item => ({
        date: item.purchasedAt.toISOString(),
        merchant: item.merchant || 'Unknown',
        itemName: item.rawName || item.normalizedName,
        normalizedName: item.normalizedName,
        quantity: item.quantity,
        unit: item.unit,
        amountCents: item.totalCents || 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
  };
};

const getReportFilterKeys = (reportKey: string) => {
  if (reportKey === INVENTORY_REPORT_KEY) return INVENTORY_CATEGORY_KEYS;
  if (reportKey === WAGES_REPORT_KEY) return WAGES_CATEGORY_KEYS;
  if (reportKey === EXPENSES_REPORT_KEY) return EXPENSE_CATEGORY_KEYS;
  return new Set([reportKey]);
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatCurrency = (amountCents: number) => {
  return `$${(amountCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const generateBusinessReportPdfBuffer = (
  payload: Record<string, unknown>,
  reports: string[],
  startDate: Date,
  endDate: Date,
  orgName: string
): Promise<Buffer> => {
  const doc = new PDFDocument({ margin: 42, size: 'LETTER' });
  const chunks: Buffer[] = [];
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const leftMargin = doc.page.margins.left;

  doc.on('data', chunk => chunks.push(Buffer.from(chunk)));

  const resetTextX = () => {
    doc.x = leftMargin;
  };

  const ensureSpace = (height: number) => {
    if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      resetTextX();
    }
  };

  const sectionTitle = (title: string, subtitle?: string) => {
    ensureSpace(54);
    resetTextX();
    let y = doc.y + 12;
    doc
      .font('Helvetica-Bold')
      .fontSize(15)
      .fillColor('#111827')
      .text(title, leftMargin, y, { width: pageWidth, align: 'left', lineBreak: false });
    y += 20;
    if (subtitle) {
      resetTextX();
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#6B7280')
        .text(subtitle, leftMargin, y, { width: pageWidth, align: 'left' });
      y += 13;
    }
    resetTextX();
    doc.y = y + 4;
  };

  const metricRow = (label: string, value: string) => {
    ensureSpace(18);
    resetTextX();
    const y = doc.y;
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#4B5563')
      .text(label, leftMargin, y, { width: pageWidth, align: 'left', lineBreak: false });
    const labelWidth = doc.widthOfString(label);
    doc
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(value, leftMargin + labelWidth + 8, y, {
        width: Math.max(40, pageWidth - labelWidth - 8),
        align: 'left',
      });
    resetTextX();
    doc.y = y + 16;
  };

  const drawTableHeader = (columns: Array<{ label: string; x: number; width: number; align?: 'left' | 'right' }>) => {
    ensureSpace(28);
    const y = doc.y;
    resetTextX();
    doc.roundedRect(leftMargin, y, pageWidth, 22, 4).fill('#F3F4F6');
    columns.forEach(column => {
      doc.y = y + 7;
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#374151')
        .text(column.label, leftMargin + column.x, y + 7, {
          width: column.width,
          align: column.align || 'left',
        });
    });
    resetTextX();
    doc.y = y + 28;
  };

  const drawRow = (
    columns: Array<{ text: string; x: number; width: number; align?: 'left' | 'right' }>,
    index: number,
    rowHeight = 24
  ) => {
    ensureSpace(rowHeight + 6);
    const y = doc.y;
    if (index % 2 === 0) {
      doc.rect(leftMargin, y - 4, pageWidth, rowHeight).fill('#FAFAFA');
    }
    columns.forEach(column => {
      doc.y = y;
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#111827')
        .text(column.text, leftMargin + column.x, y, {
          width: column.width,
          align: column.align || 'left',
          ellipsis: true,
        });
    });
    resetTextX();
    doc.y = y + rowHeight;
  };

  resetTextX();
  let y = doc.y;
  doc
    .font('Helvetica-Bold')
    .fontSize(22)
    .fillColor('#111827')
    .text('Business Report', leftMargin, y, { width: pageWidth, align: 'left', lineBreak: false });
  y += 30;
  resetTextX();
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#6B7280');
  [
    orgName,
    `${formatDate(startDate)} - ${formatDate(endDate)}`,
    `Reports: ${reports.map(report => REPORT_LABELS[report] || report).join(', ')}`,
    `Generated: ${formatDate(new Date())}`,
  ].forEach(line => {
    doc.text(line, leftMargin, y, { width: pageWidth, align: 'left', lineBreak: false });
    y += 13;
  });
  resetTextX();
  doc.y = y + 6;

  const expenseReports = payload.expenseReports as Record<string, ReturnType<typeof summarizeCategoryExpenses> | ReturnType<typeof summarizeInventoryItems>> | undefined;
  if (expenseReports) {
    reports
      .filter(report => report !== SALES_REPORT_KEY)
      .forEach(report => {
        const summary = expenseReports[report];
        const label = REPORT_LABELS[report] || report;
        if (!summary) return;

        sectionTitle(label, `${label} expenses for the selected range`);
        metricRow(`Total ${label.toLowerCase()} cost`, `${formatCurrency(summary.totalCents)} across ${summary.count} records`);

        if ('itemTotals' in summary) {
          drawTableHeader([
            { label: 'Item', x: 0, width: 230 },
            { label: 'Quantity', x: 250, width: 100 },
            { label: 'Lines', x: 365, width: 60, align: 'right' },
            { label: 'Amount', x: 450, width: 78, align: 'right' },
          ]);
          summary.itemTotals.forEach((item, index) => {
            const quantity = item.quantity > 0 ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : '-';
            drawRow([
              { text: item.normalizedName, x: 0, width: 230 },
              { text: quantity, x: 250, width: 100 },
              { text: String(item.count), x: 365, width: 60, align: 'right' },
              { text: formatCurrency(item.amountCents), x: 450, width: 78, align: 'right' },
            ], index);
          });

          sectionTitle(`Itemized ${label}`, `Every itemized ${label.toLowerCase()} line in the selected range`);
          drawTableHeader([
            { label: 'Date', x: 0, width: 62 },
            { label: 'Vendor', x: 72, width: 130 },
            { label: 'Item', x: 212, width: 170 },
            { label: 'Qty', x: 392, width: 70 },
            { label: 'Total', x: 470, width: 58, align: 'right' },
          ]);
          summary.entries.forEach((entry, index) => {
            const quantity = entry.quantity ? `${entry.quantity}${entry.unit ? ` ${entry.unit}` : ''}` : '-';
            drawRow([
              { text: formatDate(new Date(entry.date)), x: 0, width: 62 },
              { text: entry.merchant, x: 72, width: 130 },
              { text: entry.itemName, x: 212, width: 170 },
              { text: quantity, x: 392, width: 70 },
              { text: formatCurrency(entry.amountCents), x: 470, width: 58, align: 'right' },
            ], index);
          });
        } else {
          drawTableHeader([
            { label: 'Date', x: 0, width: 62 },
            { label: 'Vendor', x: 72, width: 150 },
            { label: 'Category', x: 232, width: 110 },
            { label: 'Notes', x: 352, width: 122 },
            { label: 'Amount', x: 480, width: 48, align: 'right' },
          ]);
          summary.entries.forEach((entry, index) => {
            drawRow([
              { text: formatDate(new Date(entry.date)), x: 0, width: 62 },
              { text: entry.merchant, x: 72, width: 150 },
              { text: entry.categoryName, x: 232, width: 110 },
              { text: entry.notes || '-', x: 352, width: 122 },
              { text: formatCurrency(entry.amountCents), x: 480, width: 48, align: 'right' },
            ], index);
          });
          if (summary.entries.length === 0) {
            doc.font('Helvetica').fontSize(10).fillColor('#6B7280').text(`No ${label.toLowerCase()} entries found for this range.`);
          }
        }
      });
  }

  const sales = payload.sales as {
    totalDays: number;
    grossSalesCents: number;
    netSalesCents: number;
    cashCents: number;
    tipsCents: number;
    taxCents: number;
    discountsCents: number;
    refundsCents: number;
  } | undefined;
  if (sales) {
    sectionTitle('Sales', 'Sales totals for the selected range');
    metricRow('Days reported', String(sales.totalDays));
    metricRow('Gross sales', formatCurrency(sales.grossSalesCents));
    metricRow('Net sales', formatCurrency(sales.netSalesCents));
    metricRow('Cash', formatCurrency(sales.cashCents));
    metricRow('Tips', formatCurrency(sales.tipsCents));
    metricRow('Tax', formatCurrency(sales.taxCents));
    metricRow('Discounts', formatCurrency(sales.discountsCents));
    metricRow('Refunds', formatCurrency(sales.refundsCents));
  }

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
};

const buildReportPayload = async (orgId: string, reports: string[], startDate: Date, endDate: Date) => {
  const payload: Record<string, unknown> = {
    dateRange: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    reports,
  };

  const expenseReportKeys = reports.filter(report => report !== SALES_REPORT_KEY);

  if (expenseReportKeys.length > 0) {
    const expenses = await prisma.expense.findMany({
      where: {
        orgId,
        deletedAt: null,
        expenseDate: { gte: startDate, lte: endDate },
      },
      select: {
        amountCents: true,
        merchant: true,
        categoryKey: true,
        categoryNameSnapshot: true,
        expenseDate: true,
        notes: true,
      },
    });

    const expenseReports: Record<string, ReturnType<typeof summarizeCategoryExpenses> | ReturnType<typeof summarizeInventoryItems>> = {};
    let inventoryItemsSummary: ReturnType<typeof summarizeInventoryItems> | null = null;

    if (expenseReportKeys.includes(INVENTORY_REPORT_KEY)) {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { inventoryItemizedTrackerEnabled: true },
      });

      if (org?.inventoryItemizedTrackerEnabled) {
        const inventoryItems = await prisma.inventoryItem.findMany({
          where: {
            orgId,
            purchasedAt: { gte: startDate, lte: endDate },
          },
          select: {
            normalizedName: true,
            rawName: true,
            quantity: true,
            unit: true,
            totalCents: true,
            purchasedAt: true,
            merchant: true,
          },
          orderBy: { purchasedAt: 'asc' },
        });

        if (inventoryItems.length > 0) {
          inventoryItemsSummary = summarizeInventoryItems(inventoryItems);
        }
      }
    }

    expenseReportKeys.forEach(reportKey => {
      const label = REPORT_LABELS[reportKey] || reportKey;
      if (reportKey === INVENTORY_REPORT_KEY && inventoryItemsSummary) {
        expenseReports[reportKey] = inventoryItemsSummary;
        return;
      }

      const filterKeys = getReportFilterKeys(reportKey);
      expenseReports[reportKey] = summarizeCategoryExpenses(
        expenses.filter(expense => expense.categoryKey && filterKeys.has(expense.categoryKey)),
        label
      );
    });

    payload.expenseReports = expenseReports;
  }

  if (reports.includes(SALES_REPORT_KEY)) {
    const salesReports = await prisma.salesReport.findMany({
      where: {
        orgId,
        businessDate: { gte: startDate, lte: endDate },
      },
      orderBy: { businessDate: 'asc' },
    });

    payload.sales = salesReports.reduce(
      (summary, report) => {
        summary.totalDays += 1;
        summary.grossSalesCents += report.grossSalesCents || 0;
        summary.netSalesCents += report.netSalesCents || 0;
        summary.cashCents += report.cashCents || 0;
        summary.tipsCents += report.tipsCents || 0;
        summary.taxCents += report.taxCents || 0;
        summary.discountsCents += report.discountsCents || 0;
        summary.refundsCents += report.refundsCents || 0;
        return summary;
      },
      {
        totalDays: 0,
        grossSalesCents: 0,
        netSalesCents: 0,
        cashCents: 0,
        tipsCents: 0,
        taxCents: 0,
        discountsCents: 0,
        refundsCents: 0,
      }
    );
  }

  return payload;
};

export const createPdfReport: Handler = async (req, res) => {
  try {
    const { orgId, id: userId, role } = req.user || {};
    const reports = normalizeReportArray(req.body.reports);
    const range = parseDateRange(req.body.startDate, req.body.endDate);

    if (!orgId || !userId) {
      return res.status(403).json({ success: false, error: 'Organization context required' });
    }
    if (role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    if (reports.length === 0 || reports.some(report => !VALID_REPORTS.has(report))) {
      return res.status(400).json({ success: false, error: getReportValidationMessage() });
    }
    if (!range) {
      return res.status(400).json({ success: false, error: 'Valid startDate and endDate are required' });
    }
    if (range.end.getTime() < range.start.getTime()) {
      return res.status(400).json({ success: false, error: 'endDate must be on or after startDate' });
    }
    if (isRangeOverTwoMonths(range.start, range.end)) {
      return res.status(400).json({ success: false, error: 'Date range cannot exceed 2 months' });
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });
    const payload = await buildReportPayload(orgId, reports, range.start, range.end);
    const pdfBuffer = await generateBusinessReportPdfBuffer(payload, reports, range.start, range.end, org?.name || 'Business');
    const fileName = `business-report-${range.start.toISOString().slice(0, 10)}-${range.end.toISOString().slice(0, 10)}.pdf`;

    res.json({
      success: true,
      message: 'Business PDF report created',
      fileName,
      mimeType: 'application/pdf',
      pdfBase64: pdfBuffer.toString('base64'),
    });
  } catch (error) {
    console.error('createPdfReport error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getAutomation: Handler = async (req, res) => {
  try {
    const { orgId, id: userId, role } = req.user || {};

    if (!orgId || !userId) {
      return res.status(403).json({ success: false, error: 'Organization context required' });
    }
    if (role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const automation = await prisma.businessReportAutomation.findUnique({
      where: { orgId_createdById: { orgId, createdById: userId } },
    });

    res.json({
      success: true,
      automation: automation?.isActive ? { ...automation, reports: normalizeReportArray(automation.reports) } : null,
    });
  } catch (error) {
    console.error('getAutomation error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const deactivateAutomation = async (orgId: string, userId: string) => {
  const existing = await prisma.businessReportAutomation.findUnique({
    where: { orgId_createdById: { orgId, createdById: userId } },
  });

  if (existing) {
    await prisma.businessReportAutomation.update({
      where: { id: existing.id },
      data: {
        isActive: false,
        nextRunAt: null,
      },
    });
  }
};

export const saveAutomation: Handler = async (req, res) => {
  try {
    const { orgId, id: userId, role } = req.user || {};
    const action = typeof req.body.action === 'string' ? req.body.action.trim().toLowerCase() : '';
    const shouldRemoveAutomation =
      action === 'remove' ||
      action === 'delete' ||
      req.body.removeAutomation === true ||
      req.body.deleteAutomation === true ||
      req.body.isActive === false;
    const reports = normalizeReportArray(req.body.reports);
    const deliveryChannels = normalizeStringArray(req.body.deliveryChannels);
    const cadence = typeof req.body.cadence === 'string' ? req.body.cadence.trim().toLowerCase() : '';
    const rawMessageRecipient = typeof req.body.messageRecipient === 'string' ? req.body.messageRecipient.trim() : null;
    const messageRecipient = normalizePhoneNumberToE164(rawMessageRecipient);
    const emailRecipient = typeof req.body.emailRecipient === 'string' ? req.body.emailRecipient.trim() : null;

    if (!orgId || !userId) {
      return res.status(403).json({ success: false, error: 'Organization context required' });
    }
    if (role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    if (shouldRemoveAutomation) {
      await deactivateAutomation(orgId, userId);

      return res.json({
        success: true,
        message: 'Business report automation removed',
        automation: null,
      });
    }
    if (reports.length === 0 || reports.some(report => !VALID_REPORTS.has(report))) {
      return res.status(400).json({ success: false, error: getReportValidationMessage() });
    }
    if (deliveryChannels.length === 0 || deliveryChannels.some(channel => !VALID_CHANNELS.has(channel))) {
      return res.status(400).json({ success: false, error: 'deliveryChannels must include message, email, or both' });
    }
    if (!VALID_CADENCES.has(cadence)) {
      return res.status(400).json({ success: false, error: 'cadence must be weekly or monthly' });
    }
    if (deliveryChannels.includes('message') && !messageRecipient) {
      return res.status(400).json({ success: false, error: 'A valid messageRecipient phone number is required for message delivery' });
    }
    if (deliveryChannels.includes('email') && !emailRecipient) {
      return res.status(400).json({ success: false, error: 'emailRecipient is required for email delivery' });
    }

    const automation = await prisma.businessReportAutomation.upsert({
      where: { orgId_createdById: { orgId, createdById: userId } },
      update: {
        reports,
        deliveryChannels,
        messageRecipient: deliveryChannels.includes('message') ? messageRecipient : null,
        emailRecipient: deliveryChannels.includes('email') ? emailRecipient : null,
        cadence,
        isActive: true,
        nextRunAt: getNextRunAt(cadence),
      },
      create: {
        orgId,
        createdById: userId,
        reports,
        deliveryChannels,
        messageRecipient: deliveryChannels.includes('message') ? messageRecipient : null,
        emailRecipient: deliveryChannels.includes('email') ? emailRecipient : null,
        cadence,
        nextRunAt: getNextRunAt(cadence),
      },
    });

    res.json({
      success: true,
      message: 'Business report automation saved',
      automation,
    });
  } catch (error) {
    console.error('saveAutomation error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteAutomation: Handler = async (req, res) => {
  try {
    const { orgId, id: userId, role } = req.user || {};

    if (!orgId || !userId) {
      return res.status(403).json({ success: false, error: 'Organization context required' });
    }
    if (role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    await deactivateAutomation(orgId, userId);

    res.json({
      success: true,
      message: 'Business report automation removed',
      automation: null,
    });
  } catch (error) {
    console.error('deleteAutomation error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const testSmsDelivery: Handler = async (req, res) => {
  try {
    const { orgId, id: userId, role } = req.user || {};
    const rawMessageRecipient = typeof req.body.messageRecipient === 'string' ? req.body.messageRecipient.trim() : null;
    let messageRecipient = normalizePhoneNumberToE164(rawMessageRecipient);

    if (!orgId || !userId) {
      return res.status(403).json({ success: false, error: 'Organization context required' });
    }
    if (role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    if (!messageRecipient) {
      const automation = await prisma.businessReportAutomation.findUnique({
        where: { orgId_createdById: { orgId, createdById: userId } },
        select: { messageRecipient: true },
      });
      messageRecipient = normalizePhoneNumberToE164(automation?.messageRecipient);
    }

    if (!messageRecipient) {
      return res.status(400).json({ success: false, error: 'A valid messageRecipient phone number is required' });
    }

    const message = await sendSms(
      messageRecipient,
      'Tally: This is a test SMS from your business report automation setup.'
    );

    res.json({
      success: true,
      message: 'Test SMS queued',
      sms: {
        sid: message.sid,
        status: message.status,
        to: message.to,
      },
    });
  } catch (error) {
    console.error('testSmsDelivery error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send test SMS',
    });
  }
};

export const runAutomationScheduler: Handler = async (_req, res) => {
  try {
    const now = new Date();
    const dueAutomations = await prisma.businessReportAutomation.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
      },
      include: {
        org: { select: { name: true } },
        createdBy: { select: { email: true, name: true } },
      },
      orderBy: { nextRunAt: 'asc' },
    });

    const results: Array<{
      automationId: string;
      orgId: string;
      status: 'sent' | 'skipped' | 'failed';
      emailSent?: boolean;
      messageSent?: boolean;
      pdfDownloadUrl?: string;
      deliveryErrors?: string[];
      error?: string;
      nextRunAt?: string;
    }> = [];

    for (const automation of dueAutomations) {
      const scheduledAt = automation.nextRunAt || now;
      const range = getAutomatedReportRange(automation.cadence, scheduledAt);
      const nextRunAt = getNextFutureRunAt(automation.cadence, scheduledAt, now);

      try {
        const reports = normalizeReportArray(automation.reports);
        const payload = await buildReportPayload(automation.orgId, reports, range.start, range.end);
        const pdfBuffer = await generateBusinessReportPdfBuffer(
          payload,
          reports,
          range.start,
          range.end,
          automation.org.name || 'Business'
        );
        const fileName = `business-report-${range.start.toISOString().slice(0, 10)}-${range.end.toISOString().slice(0, 10)}.pdf`;

        let emailSent = false;
        let messageSent = false;
        let pdfDownloadUrl: string | null = null;
        const deliveryErrors: string[] = [];

        if (automation.deliveryChannels.includes('email')) {
          const to = automation.emailRecipient || automation.createdBy.email;
          if (!to) {
            deliveryErrors.push('No email recipient available');
          } else {
            try {
              await transporter.sendMail({
                from: `"Tally" <${process.env.SMTP_USER}>`,
                to,
                subject: `${automation.org.name || 'Business'} ${automation.cadence === 'weekly' ? 'Weekly' : 'Monthly'} Business Report`,
                html: `
                  <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:28px;background:#f8fafc;color:#0f172a;">
                    <h2 style="margin:0 0 8px;">Your business report is ready</h2>
                    <p style="margin:0 0 16px;color:#475569;">
                      Attached is the ${automation.cadence} report for <strong>${automation.org.name || 'your business'}</strong>.
                    </p>
                    <p style="margin:0;color:#475569;">
                      Report range: ${formatDate(range.start)} - ${formatDate(range.end)}
                    </p>
                  </div>
                `,
                attachments: [
                  {
                    filename: fileName,
                    content: pdfBuffer,
                    contentType: 'application/pdf',
                  },
                ],
              });
              emailSent = true;
            } catch (error) {
              deliveryErrors.push(`Email delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (automation.deliveryChannels.includes('message')) {
          if (!automation.messageRecipient) {
            deliveryErrors.push('No message recipient available');
          } else {
            try {
              const upload = await uploadToS3(
                pdfBuffer,
                fileName,
                'application/pdf',
                `business-reports/${automation.orgId}`
              );
              pdfDownloadUrl = await getPresignedUrl(upload.key, REPORT_SMS_LINK_EXPIRY_SECONDS);

              await sendSms(
                automation.messageRecipient,
                `Tally: Your ${automation.cadence} business report for ${automation.org.name || 'your business'} is ready: ${pdfDownloadUrl}`
              );
              messageSent = true;
            } catch (error) {
              deliveryErrors.push(`SMS delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (!emailSent && !messageSent && deliveryErrors.length > 0) {
          results.push({
            automationId: automation.id,
            orgId: automation.orgId,
            status: 'failed',
            emailSent,
            messageSent,
            deliveryErrors,
          });
          continue;
        }

        await prisma.businessReportAutomation.update({
          where: { id: automation.id },
          data: {
            lastSentAt: scheduledAt,
            nextRunAt,
          },
        });

        results.push({
          automationId: automation.id,
          orgId: automation.orgId,
          status: emailSent || messageSent ? 'sent' : 'skipped',
          emailSent,
          messageSent,
          ...(pdfDownloadUrl ? { pdfDownloadUrl } : {}),
          ...(deliveryErrors.length > 0 ? { deliveryErrors } : {}),
          nextRunAt: nextRunAt.toISOString(),
        });
      } catch (error) {
        console.error('runAutomationScheduler item error:', error);
        results.push({
          automationId: automation.id,
          orgId: automation.orgId,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${dueAutomations.length} business report automations`,
      processed: dueAutomations.length,
      results,
    });
  } catch (error) {
    console.error('runAutomationScheduler error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
