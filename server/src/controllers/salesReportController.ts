import { Prisma, SalesReportSource, SalesReportStatus } from '@prisma/client';
import { Response } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../types/http';
import { uploadToS3, getPresignedUrl, extractS3Key, getS3Object } from '../services/s3Service';

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<Response | void> | Response | void;

// Upload daily sales report from scanned receipt
export const createSalesReportWithReceipt: Handler = async (req, res) => {
  try {
    const { orgId, userId } = req.user;

    if (!orgId) {
      return res.status(403).json({ success: false, error: 'Organization context required' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Receipt image is required' });
    }

    const {
      businessDate, merchant, notes,
      grossSalesCents, netSalesCents, cashCents,
      tipsCents, taxCents, discountsCents, refundsCents,
    } = req.body;

    if (!businessDate) {
      return res.status(400).json({ success: false, error: 'Business date is required' });
    }

    // Upload to S3 - use salereports bucket instead of receipts
    const s3Result = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      `salereports/${orgId}`
    );

    const toInt = (val: any): number | null => {
      if (val === undefined || val === null || val === '') return null;
      const parsed = Number.parseInt(String(val), 10);
      return Number.isNaN(parsed) ? null : parsed;
    };

    // Create sales report record with the scanned image
    const report = await prisma.salesReport.create({
      data: {
        orgId,
        businessDate: new Date(businessDate),
        source: 'MANUAL_ENTRY',
        uploadedById: userId,
        fileUrl: s3Result.url,
        fileType: req.file.mimetype,
        fileHash: null,
        grossSalesCents: toInt(grossSalesCents),
        netSalesCents: toInt(netSalesCents),
        cashCents: toInt(cashCents),
        tipsCents: toInt(tipsCents),
        taxCents: toInt(taxCents),
        discountsCents: toInt(discountsCents),
        refundsCents: toInt(refundsCents),
        currency: 'USD',
        notes: notes || merchant || null,
        status: 'PENDING'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Sales report created successfully',
      report
    });
  } catch (error: any) {
    console.error('createSalesReportWithReceipt error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Upload daily sales report (legacy)
export const uploadSalesReport: Handler = async (req, res) => {
  try {
    const { orgId, userId } = req.user;
    const {
      businessDate,
      source,
      grossSalesCents,
      netSalesCents,
      cashCents,
      tipsCents,
      taxCents,
      discountsCents,
      refundsCents,
      currency,
      notes,
      parsedPayload,
      fileUrl,
      fileType,
      fileHash,
    } = req.body;

    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }

    if (!businessDate) {
      return res.status(400).json({
        success: false,
        error: 'Business date is required'
      });
    }

    // Check if report already exists for this date
    const existing = await prisma.salesReport.findUnique({
      where: {
        orgId_businessDate: {
          orgId,
          businessDate: new Date(businessDate)
        }
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Sales report already exists for this date'
      });
    }

    const sourceValue = typeof source === 'string' ? source : undefined;
    const isSalesReportSource = (value: string): value is SalesReportSource => (
      value === 'POS_UPLOAD' || value === 'MANUAL_ENTRY' || value === 'API_IMPORT'
    );

    const report = await prisma.salesReport.create({
      data: {
        orgId,
        businessDate: new Date(businessDate),
        source: sourceValue && isSalesReportSource(sourceValue) ? sourceValue : 'MANUAL_ENTRY',
        uploadedById: userId,
        fileUrl: fileUrl || null,
        fileType: fileType || null,
        fileHash: fileHash || null,
        grossSalesCents: grossSalesCents ? Number.parseInt(String(grossSalesCents), 10) : null,
        netSalesCents: netSalesCents ? Number.parseInt(String(netSalesCents), 10) : null,
        cashCents: cashCents ? Number.parseInt(String(cashCents), 10) : null,
        tipsCents: tipsCents ? Number.parseInt(String(tipsCents), 10) : null,
        taxCents: taxCents ? Number.parseInt(String(taxCents), 10) : null,
        discountsCents: discountsCents ? Number.parseInt(String(discountsCents), 10) : null,
        refundsCents: refundsCents ? Number.parseInt(String(refundsCents), 10) : null,
        currency: currency || 'USD',
        notes,
        parsedPayload: parsedPayload || undefined,
        status: 'PENDING'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Sales report uploaded successfully',
      report
    });
  } catch (error) {
    console.error('uploadSalesReport error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Get all sales reports for organization
export const getAllSalesReports: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { startDate, endDate, status, source } = req.query;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const where: Prisma.SalesReportWhereInput = { orgId };
    const startDateValue = typeof startDate === 'string' ? startDate : undefined;
    const endDateValue = typeof endDate === 'string' ? endDate : undefined;
    const statusValue = typeof status === 'string' ? status : undefined;
    const sourceValue = typeof source === 'string' ? source : undefined;
    const isSalesReportStatus = (value: string): value is SalesReportStatus => (
      value === 'PENDING' || value === 'APPROVED' || value === 'REJECTED' || value === 'NEEDS_REVIEW'
    );
    const isSalesReportSource = (value: string): value is SalesReportSource => (
      value === 'POS_UPLOAD' || value === 'MANUAL_ENTRY' || value === 'API_IMPORT'
    );
    
    if (statusValue && isSalesReportStatus(statusValue)) where.status = statusValue;
    if (sourceValue && isSalesReportSource(sourceValue)) where.source = sourceValue;
    
    if (startDateValue || endDateValue) {
      where.businessDate = {};
      if (startDateValue) where.businessDate.gte = new Date(startDateValue);
      if (endDateValue) where.businessDate.lte = new Date(endDateValue);
    }
    
    const reports = await prisma.salesReport.findMany({
      where,
      include: {
        uploadedBy: {
          select: { id: true, email: true, name: true }
        }
      },
      orderBy: { businessDate: 'desc' }
    });
    
    res.json({
      success: true,
      reports
    });
  } catch (error) {
    console.error('getAllSalesReports error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Get sales report by ID
export const getSalesReportById: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const report = await prisma.salesReport.findFirst({
      where: { id, orgId },
      include: {
        uploadedBy: {
          select: { id: true, email: true, name: true }
        }
      }
    });
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Sales report not found'
      });
    }

    // Generate presigned URL for private S3 file
    let signedFileUrl: string | null = null;
    if (report.fileUrl) {
      const s3Key = extractS3Key(report.fileUrl);
      if (s3Key) {
        signedFileUrl = await getPresignedUrl(s3Key);
      }
    }

    res.json({
      success: true,
      report: { ...report, fileUrl: signedFileUrl || report.fileUrl }
    });
  } catch (error) {
    console.error('getSalesReportById error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Update sales report
export const updateSalesReport: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;
    const {
      grossSalesCents,
      netSalesCents,
      cashCents,
      tipsCents,
      taxCents,
      discountsCents,
      refundsCents,
      notes
    } = req.body;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const existing = await prisma.salesReport.findFirst({
      where: { id, orgId }
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Sales report not found'
      });
    }
    
    const updateData: Prisma.SalesReportUpdateInput = {};
    if (grossSalesCents !== undefined) {
      updateData.grossSalesCents = Number.parseInt(String(grossSalesCents), 10);
    }
    if (netSalesCents !== undefined) {
      updateData.netSalesCents = Number.parseInt(String(netSalesCents), 10);
    }
    if (cashCents !== undefined) {
      updateData.cashCents = Number.parseInt(String(cashCents), 10);
    }
    if (tipsCents !== undefined) {
      updateData.tipsCents = Number.parseInt(String(tipsCents), 10);
    }
    if (taxCents !== undefined) {
      updateData.taxCents = Number.parseInt(String(taxCents), 10);
    }
    if (discountsCents !== undefined) {
      updateData.discountsCents = Number.parseInt(String(discountsCents), 10);
    }
    if (refundsCents !== undefined) {
      updateData.refundsCents = Number.parseInt(String(refundsCents), 10);
    }
    if (notes !== undefined) updateData.notes = notes;
    
    const report = await prisma.salesReport.update({
      where: { id },
      data: updateData
    });
    
    res.json({
      success: true,
      message: 'Sales report updated successfully',
      report
    });
  } catch (error) {
    console.error('updateSalesReport error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Approve sales report
export const approveSalesReport: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
const report = await prisma.salesReport.findFirst({
      where: { id, orgId }
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Sales report not found'
      });
    }

    const updatedReport = await prisma.salesReport.update({
      where: { id },
      data: { status: 'APPROVED' }
    });
    
    res.json({
      success: true,
      message: 'Sales report approved',
      report: updatedReport
    });
  } catch (error) {
    console.error('approveSalesReport error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Reject sales report
export const rejectSalesReport: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;
    const { notes } = req.body;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const report = await prisma.salesReport.findFirst({
      where: { id, orgId }
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Sales report not found'
      });
    }

    const updateData: Prisma.SalesReportUpdateInput = { status: 'REJECTED' };
    if (notes) {
      updateData.notes = notes;
    }
    
    const updatedReport = await prisma.salesReport.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Sales report rejected',
      report: updatedReport
    });
  } catch (error) {
    console.error('rejectSalesReport error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Delete sales report
export const deleteSalesReport: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
const report = await prisma.salesReport.findFirst({
      where: { id, orgId }
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Sales report not found'
      });
    }

    await prisma.salesReport.delete({
      where: { id }
    });
    
    res.json({
      success: true,
      message: 'Sales report deleted successfully'
    });
  } catch (error) {
    console.error('deleteSalesReport error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Get monthly summary (aggregated sales reports + expenses for a month)
export const getMonthlySummary: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { month } = req.query; // format: "2026-02"

    if (!orgId) {
      return res.status(403).json({ success: false, error: 'Organization context required' });
    }

    const monthStr = typeof month === 'string' ? month : undefined;
    if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
      return res.status(400).json({ success: false, error: 'Month is required in YYYY-MM format' });
    }

    const [year, mon] = monthStr.split('-').map(Number);
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 0, 23, 59, 59, 999); // last moment of last day

    // 1. Aggregate all sales reports for the month
    const salesReports = await prisma.salesReport.findMany({
      where: {
        orgId,
        businessDate: { gte: startDate, lte: endDate },
      },
    });

    let grossSalesCents = 0;
    let netSalesCents = 0;
    let cashCents = 0;
    let tipsCents = 0;
    let taxCents = 0;
    let discountsCents = 0;
    let refundsCents = 0;

    for (const r of salesReports) {
      grossSalesCents += r.grossSalesCents || 0;
      netSalesCents += r.netSalesCents || 0;
      cashCents += r.cashCents || 0;
      tipsCents += r.tipsCents || 0;
      taxCents += r.taxCents || 0;
      discountsCents += r.discountsCents || 0;
      refundsCents += r.refundsCents || 0;
    }

    // 2. Aggregate all expenses for the month (non-deleted)
    const expenses = await prisma.expense.findMany({
      where: {
        orgId,
        deletedAt: null,
        expenseDate: { gte: startDate, lte: endDate },
      },
    });

    let totalExpensesCents = 0;
    let cashExpensesCents = 0;
    const categoryTotals: Record<string, number> = {};

    for (const e of expenses) {
      totalExpensesCents += e.amountCents;
      if (e.paymentMethod === 'CASH') {
        cashExpensesCents += e.amountCents;
      }
      const catKey = e.categoryNameSnapshot || e.categoryKey || 'Other';
      categoryTotals[catKey] = (categoryTotals[catKey] || 0) + e.amountCents;
    }

    const expenseCategories = Object.entries(categoryTotals).map(([name, amountCents]) => ({
      name,
      amountCents,
    }));
    expenseCategories.sort((a, b) => b.amountCents - a.amountCents);

    // 3. Computed values
    // Cash after expenses = cash revenue - cash expenses
    const cashAfterExpensesCents = cashCents - cashExpensesCents;
    // Net profit = net sales - total expenses
    const netProfitCents = netSalesCents - totalExpensesCents;

    res.json({
      success: true,
      summary: {
        month: monthStr,
        grossSalesCents,
        netSalesCents,
        cashCents,
        tipsCents,
        taxCents,
        discountsCents,
        refundsCents,
        totalExpensesCents,
        cashExpensesCents,
        cashAfterExpensesCents,
        netProfitCents,
        expenseCategories,
        salesReportCount: salesReports.length,
      },
    });
  } catch (error) {
    console.error('getMonthlySummary error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get sales analytics/summary
export const getSalesAnalytics: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { startDate, endDate } = req.query;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }
    
    const startDateValue = typeof startDate === 'string' ? startDate : undefined;
    const endDateValue = typeof endDate === 'string' ? endDate : undefined;

    if (!startDateValue || !endDateValue) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }

    const reports = await prisma.salesReport.findMany({
      where: {
        orgId,
        status: 'APPROVED',
        businessDate: {
          gte: new Date(startDateValue),
          lte: new Date(endDateValue)
        }
      },
      orderBy: { businessDate: 'asc' }
    });
    
    // Calculate totals
    const analytics = {
      totalDays: reports.length,
      totalGrossSalesCents: 0,
      totalNetSalesCents: 0,
      totalCashCents: 0,
      totalTipsCents: 0,
      totalTaxCents: 0,
      totalDiscountsCents: 0,
      totalRefundsCents: 0,
      averageGrossSalesCents: 0,
      averageNetSalesCents: 0,
      currency: reports[0]?.currency || 'USD',
      reports: reports
    };
    
    reports.forEach(report => {
      analytics.totalGrossSalesCents += report.grossSalesCents || 0;
      analytics.totalNetSalesCents += report.netSalesCents || 0;
      analytics.totalCashCents += report.cashCents || 0;
      analytics.totalTipsCents += report.tipsCents || 0;
      analytics.totalTaxCents += report.taxCents || 0;
      analytics.totalDiscountsCents += report.discountsCents || 0;
      analytics.totalRefundsCents += report.refundsCents || 0;
    });
    
    if (reports.length > 0) {
      analytics.averageGrossSalesCents = Math.round(analytics.totalGrossSalesCents / reports.length);
      analytics.averageNetSalesCents = Math.round(analytics.totalNetSalesCents / reports.length);
    }
    
    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('getSalesAnalytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Proxy S3 image for a sales report
export const getSalesReportImage: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;

    if (!orgId) {
      return res.status(403).json({ success: false, error: 'Organization context required' });
    }

    const report = await prisma.salesReport.findFirst({
      where: { id, orgId },
      select: { fileUrl: true, fileType: true },
    });

    if (!report || !report.fileUrl) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }

    const s3Key = extractS3Key(report.fileUrl);
    if (!s3Key) {
      return res.status(404).json({ success: false, error: 'Invalid file reference' });
    }

    const s3Response = await getS3Object(s3Key);

    res.setHeader('Content-Type', report.fileType || 'image/jpeg');
    if (s3Response.ContentLength) {
      res.setHeader('Content-Length', s3Response.ContentLength);
    }
    res.setHeader('Cache-Control', 'private, max-age=3600');

    const stream = s3Response.Body as NodeJS.ReadableStream;
    stream.pipe(res);
  } catch (error) {
    console.error('getSalesReportImage error:', error);
    res.status(500).json({ success: false, error: 'Failed to load image' });
  }
};

