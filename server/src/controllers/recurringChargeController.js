const prisma = require('../config/database');

// Create recurring charge
exports.createRecurringCharge = async (req, res) => {
  try {
    const { orgId } = req.user;
    const {
      name,
      merchant,
      amountCents,
      currency,
      orgCategoryId,
      dayOfMonth,
      useLastDay,
      startDate,
      endDate
    } = req.body;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    if (!name || !amountCents || !dayOfMonth || !startDate) {
      return res.status(400).json({
        success: false,
        error: 'Name, amount, day of month, and start date are required'
      });
    }
    
    // Validate day of month
    if (dayOfMonth < 1 || dayOfMonth > 31) {
      return res.status(400).json({
        success: false,
        error: 'Day of month must be between 1 and 31'
      });
    }
    
    // Validate category if provided
    if (orgCategoryId) {
      const category = await prisma.orgCategory.findFirst({
        where: { id: orgCategoryId, orgId, isEnabled: true }
      });
      
      if (!category) {
        return res.status(404).json({
          success: false,
          error: 'Category not found or not enabled'
        });
      }
    }
    
    // Calculate next run date
    const start = new Date(startDate);
    const now = new Date();
    let nextRunAt = new Date(start);
    
    if (useLastDay) {
      // Set to last day of the month
      nextRunAt = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    } else {
      nextRunAt.setDate(dayOfMonth);
    }
    
    // If next run is in the past, move to next month
    while (nextRunAt < now) {
      nextRunAt.setMonth(nextRunAt.getMonth() + 1);
      if (useLastDay) {
        nextRunAt = new Date(nextRunAt.getFullYear(), nextRunAt.getMonth() + 1, 0);
      } else {
        nextRunAt.setDate(dayOfMonth);
      }
    }
    
    const charge = await prisma.recurringCharge.create({
      data: {
        orgId,
        name,
        merchant,
        amountCents: parseInt(amountCents),
        currency: currency || 'USD',
        orgCategoryId,
        dayOfMonth: parseInt(dayOfMonth),
        useLastDay: useLastDay || false,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        nextRunAt,
        status: 'ACTIVE'
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
      message: 'Recurring charge created successfully',
      charge
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all recurring charges for organization
exports.getAllRecurringCharges = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { status, includeDeleted } = req.query;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const where = { orgId };
    if (status) where.status = status;
    if (!includeDeleted || includeDeleted === 'false') {
      where.deletedAt = null;
    }
    
    const charges = await prisma.recurringCharge.findMany({
      where,
      include: {
        orgCategory: {
          include: {
            preset: true
          }
        },
        _count: {
          select: { instances: true }
        }
      },
      orderBy: { nextRunAt: 'asc' }
    });
    
    res.json({
      success: true,
      charges
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get recurring charge by ID
exports.getRecurringChargeById = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const charge = await prisma.recurringCharge.findFirst({
      where: { id, orgId },
      include: {
        orgCategory: {
          include: {
            preset: true
          }
        },
        instances: {
          include: {
            expense: true
          },
          orderBy: { runDate: 'desc' }
        }
      }
    });
    
    if (!charge) {
      return res.status(404).json({
        success: false,
        error: 'Recurring charge not found'
      });
    }
    
    res.json({
      success: true,
      charge
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update recurring charge
exports.updateRecurringCharge = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;
    const {
      name,
      merchant,
      amountCents,
      orgCategoryId,
      dayOfMonth,
      useLastDay,
      endDate
    } = req.body;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const existing = await prisma.recurringCharge.findFirst({
      where: { id, orgId, deletedAt: null }
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Recurring charge not found'
      });
    }
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (merchant !== undefined) updateData.merchant = merchant;
    if (amountCents !== undefined) updateData.amountCents = parseInt(amountCents);
    if (orgCategoryId !== undefined) {
      if (orgCategoryId) {
        const category = await prisma.orgCategory.findFirst({
          where: { id: orgCategoryId, orgId, isEnabled: true }
        });
        
        if (!category) {
          return res.status(404).json({
            success: false,
            error: 'Category not found or not enabled'
          });
        }
      }
      updateData.orgCategoryId = orgCategoryId;
    }
    
    if (dayOfMonth !== undefined) {
      if (dayOfMonth < 1 || dayOfMonth > 31) {
        return res.status(400).json({
          success: false,
          error: 'Day of month must be between 1 and 31'
        });
      }
      updateData.dayOfMonth = parseInt(dayOfMonth);
    }
    
    if (useLastDay !== undefined) updateData.useLastDay = useLastDay;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    
    const charge = await prisma.recurringCharge.update({
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
      message: 'Recurring charge updated successfully',
      charge
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Pause recurring charge
exports.pauseRecurringCharge = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const charge = await prisma.recurringCharge.findFirst({
      where: { id, orgId, deletedAt: null }
    });
    
    if (!charge) {
      return res.status(404).json({
        success: false,
        error: 'Recurring charge not found'
      });
    }
    
    const updatedCharge = await prisma.recurringCharge.update({
      where: { id },
      data: { status: 'PAUSED' }
    });
    
    res.json({
      success: true,
      message: 'Recurring charge paused',
      charge: updatedCharge
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Resume recurring charge
exports.resumeRecurringCharge = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const charge = await prisma.recurringCharge.findFirst({
      where: { id, orgId, deletedAt: null }
    });
    
    if (!charge) {
      return res.status(404).json({
        success: false,
        error: 'Recurring charge not found'
      });
    }
    
    const updatedCharge = await prisma.recurringCharge.update({
      where: { id },
      data: { status: 'ACTIVE' }
    });
    
    res.json({
      success: true,
      message: 'Recurring charge resumed',
      charge: updatedCharge
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Cancel recurring charge
exports.cancelRecurringCharge = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const charge = await prisma.recurringCharge.findFirst({
      where: { id, orgId, deletedAt: null }
    });
    
    if (!charge) {
      return res.status(404).json({
        success: false,
        error: 'Recurring charge not found'
      });
    }
    
    const updatedCharge = await prisma.recurringCharge.update({
      where: { id },
      data: { status: 'CANCELED' }
    });
    
    res.json({
      success: true,
      message: 'Recurring charge canceled',
      charge: updatedCharge
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Soft delete recurring charge
exports.deleteRecurringCharge = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const charge = await prisma.recurringCharge.findFirst({
      where: { id, orgId, deletedAt: null }
    });
    
    if (!charge) {
      return res.status(404).json({
        success: false,
        error: 'Recurring charge not found'
      });
    }
    
    await prisma.recurringCharge.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        status: 'CANCELED'
      }
    });
    
    res.json({
      success: true,
      message: 'Recurring charge deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Run scheduler - create expense instances for due charges
exports.runScheduler = async (req, res) => {
  try {
    const { orgId } = req.user;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const now = new Date();
    
    // Find all active charges that are due
    const dueCharges = await prisma.recurringCharge.findMany({
      where: {
        orgId,
        status: 'ACTIVE',
        deletedAt: null,
        nextRunAt: {
          lte: now
        },
        OR: [
          { endDate: null },
          { endDate: { gte: now } }
        ]
      },
      include: {
        orgCategory: {
          include: {
            preset: true
          }
        }
      }
    });
    
    const created = [];
    
    for (const charge of dueCharges) {
      // Check if instance already exists for this run date
      const existing = await prisma.recurringChargeInstance.findUnique({
        where: {
          recurringChargeId_runDate: {
            recurringChargeId: charge.id,
            runDate: charge.nextRunAt
          }
        }
      });
      
      if (existing) continue;
      
      // Create instance and expense
      const result = await prisma.$transaction(async (tx) => {
        // Create expense
        const expense = await tx.expense.create({
          data: {
            orgId: charge.orgId,
            merchant: charge.merchant,
            amountCents: charge.amountCents,
            currency: charge.currency,
            orgCategoryId: charge.orgCategoryId,
            categoryNameSnapshot: charge.orgCategory?.customName || charge.orgCategory?.preset?.name,
            expenseDate: charge.nextRunAt,
            notes: `Auto-generated from recurring charge: ${charge.name}`
          }
        });
        
        // Create instance
        const instance = await tx.recurringChargeInstance.create({
          data: {
            orgId: charge.orgId,
            recurringChargeId: charge.id,
            runDate: charge.nextRunAt,
            expenseId: expense.id
          }
        });
        
        // Calculate next run date
        let nextRun = new Date(charge.nextRunAt);
        nextRun.setMonth(nextRun.getMonth() + 1);
        
        if (charge.useLastDay) {
          nextRun = new Date(nextRun.getFullYear(), nextRun.getMonth() + 1, 0);
        } else {
          nextRun.setDate(charge.dayOfMonth);
        }
        
        // Update charge
        await tx.recurringCharge.update({
          where: { id: charge.id },
          data: {
            lastRunAt: charge.nextRunAt,
            nextRunAt: nextRun
          }
        });
        
        return { instance, expense };
      });
      
      created.push({
        chargeId: charge.id,
        chargeName: charge.name,
        expenseId: result.expense.id,
        instanceId: result.instance.id
      });
    }
    
    res.json({
      success: true,
      message: `Created ${created.length} expense instances`,
      created
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = exports;
