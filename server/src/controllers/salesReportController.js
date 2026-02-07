const prisma = require('../config/database');

// Upload daily sales report
exports.uploadSalesReport = async (req, res) => {
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
    const existing = await prisma.dailySalesReport.findUnique({
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
    
    const report = await prisma.dailySalesReport.create({
      data: {
        orgId,
        businessDate: new Date(businessDate),
        source: source || 'MANUAL',
        uploadedById: userId,
        grossSalesCents: grossSalesCents ? parseInt(grossSalesCents) : null,
        netSalesCents: netSalesCents ? parseInt(netSalesCents) : null,
        cashCents: cashCents ? parseInt(cashCents) : null,
        tipsCents: tipsCents ? parseInt(tipsCents) : null,
        taxCents: taxCents ? parseInt(taxCents) : null,
        discountsCents: discountsCents ? parseInt(discountsCents) : null,
        refundsCents: refundsCents ? parseInt(refundsCents) : null,
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all sales reports for organization
exports.getAllSalesReports = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { startDate, endDate, status, source } = req.query;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const where = { orgId };
    
    if (status) where.status = status;
    if (source) where.source = source;
    
    if (startDate || endDate) {
      where.businessDate = {};
      if (startDate) where.businessDate.gte = new Date(startDate);
      if (endDate) where.businessDate.lte = new Date(endDate);
    }
    
    const reports = await prisma.dailySalesReport.findMany({
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get sales report by ID
exports.getSalesReportById = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const report = await prisma.dailySalesReport.findFirst({
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update sales report
exports.updateSalesReport = async (req, res) => {
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
    
    const existing = await prisma.dailySalesReport.findFirst({
      where: { id, orgId }
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Sales report not found'
      });
    }
    
    const updateData = {};
    if (grossSalesCents !== undefined) updateData.grossSalesCents = parseInt(grossSalesCents);
    if (netSalesCents !== undefined) updateData.netSalesCents = parseInt(netSalesCents);
    if (cashCents !== undefined) updateData.cashCents = parseInt(cashCents);
    if (tipsCents !== undefined) updateData.tipsCents = parseInt(tipsCents);
    if (taxCents !== undefined) updateData.taxCents = parseInt(taxCents);
    if (discountsCents !== undefined) updateData.discountsCents = parseInt(discountsCents);
    if (refundsCents !== undefined) updateData.refundsCents = parseInt(refundsCents);
    if (notes !== undefined) updateData.notes = notes;
    
    const report = await prisma.dailySalesReport.update({
      where: { id },
      data: updateData
    });
    
    res.json({
      success: true,
      message: 'Sales report updated successfully',
      report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Approve sales report
exports.approveSalesReport = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const report = await prisma.dailySalesReport.findFirst({
      where: { id, orgId }
    });
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Sales report not found'
      });
    }
    
    const updatedReport = await prisma.dailySalesReport.update({
      where: { id },
      data: { status: 'APPROVED' }
    });
    
    res.json({
      success: true,
      message: 'Sales report approved',
      report: updatedReport
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Reject sales report
exports.rejectSalesReport = async (req, res) => {
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
    
    const report = await prisma.dailySalesReport.findFirst({
      where: { id, orgId }
    });
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Sales report not found'
      });
    }
    
    const updateData = { status: 'REJECTED' };
    if (notes) {
      updateData.notes = notes;
    }
    
    const updatedReport = await prisma.dailySalesReport.update({
      where: { id },
      data: updateData
    });
    
    res.json({
      success: true,
      message: 'Sales report rejected',
      report: updatedReport
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete sales report
exports.deleteSalesReport = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const report = await prisma.dailySalesReport.findFirst({
      where: { id, orgId }
    });
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Sales report not found'
      });
    }
    
    await prisma.dailySalesReport.delete({
      where: { id }
    });
    
    res.json({
      success: true,
      message: 'Sales report deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get sales analytics/summary
exports.getSalesAnalytics = async (req, res) => {
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
    
    const reports = await prisma.dailySalesReport.findMany({
      where: {
        orgId,
        status: 'APPROVED',
        businessDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = exports;
