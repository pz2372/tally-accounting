import { Prisma, SalesReportSource, SalesReportStatus } from '@prisma/client';
import { Response } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../types/http';

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<Response | void> | Response | void;

// Upload daily sales report
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
      parsedPayload
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
    
    res.json({
      success: true,
      report
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

