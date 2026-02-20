import { Prisma, RecurringChargeStatus } from '@prisma/client';
import { Response } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../types/http';

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<Response | void> | Response | void;

// Create recurring charge
export const createRecurringCharge: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    const {
      name,
      merchant,
      amountCents,
      currency,
      orgCategoryId,
      presetCategoryId,
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
    
    // Validate category if provided - prefer orgCategoryId
    let finalOrgCategoryId: string | null = null;
    if (orgCategoryId) {
      const category = await prisma.orgCategory.findFirst({
        where: { id: orgCategoryId, orgId, isEnabled: true }
      });
      
      if (!category) {
        return res.status(404).json({
          success: false,
          error: 'Organization category not found or not enabled'
        });
      }
      finalOrgCategoryId = orgCategoryId;
    } else if (presetCategoryId) {
      const preset = await prisma.presetCategory.findFirst({
        where: { id: presetCategoryId, isActive: true }
      });
      
      if (!preset) {
        return res.status(404).json({
          success: false,
          error: 'Preset category not found or not active'
        });
      }
      // For recurring charges with preset category, store null and will use preset name when creating expenses
      finalOrgCategoryId = null;
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
        orgCategoryId: finalOrgCategoryId,
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
    console.error('createRecurringCharge error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Get all recurring charges for organization
export const getAllRecurringCharges: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { status, includeDeleted } = req.query;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const where: Prisma.RecurringChargeWhereInput = { orgId };
    const statusValue = typeof status === 'string' ? status : undefined;
    const includeDeletedValue = typeof includeDeleted === 'string' ? includeDeleted : undefined;
    const isRecurringChargeStatus = (value: string): value is RecurringChargeStatus => (
      value === 'ACTIVE' || value === 'PAUSED' || value === 'CANCELED'
    );

    if (statusValue && isRecurringChargeStatus(statusValue)) {
      where.status = statusValue;
    }
    if (!includeDeletedValue || includeDeletedValue === 'false') {
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
    console.error('getAllRecurringCharges error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Get recurring charge by ID
export const getRecurringChargeById: Handler = async (req, res) => {
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
    console.error('getRecurringChargeById error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Update recurring charge
export const updateRecurringCharge: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;
    const {
      name,
      merchant,
      amountCents,
      orgCategoryId,
      presetCategoryId,
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
    
    const updateData: Prisma.RecurringChargeUncheckedUpdateInput = {};
    if (name !== undefined) updateData.name = name;
    if (merchant !== undefined) updateData.merchant = merchant;
    if (amountCents !== undefined) {
      updateData.amountCents = Number.parseInt(String(amountCents), 10);
    }
    
    // Handle category update - prefer orgCategoryId
    if (orgCategoryId !== undefined || presetCategoryId !== undefined) {
      if (orgCategoryId) {
        const category = await prisma.orgCategory.findFirst({
          where: { id: orgCategoryId, orgId, isEnabled: true }
        });
        
        if (!category) {
          return res.status(404).json({
            success: false,
            error: 'Organization category not found or not enabled'
          });
        }
        updateData.orgCategoryId = orgCategoryId;
      } else if (presetCategoryId) {
        const preset = await prisma.presetCategory.findFirst({
          where: { id: presetCategoryId, isActive: true }
        });
        
        if (!preset) {
          return res.status(404).json({
            success: false,
            error: 'Preset category not found or not active'
          });
        }
        // For recurring charges with preset category, store null
        updateData.orgCategoryId = null;
      }
    }
    
    if (dayOfMonth !== undefined) {
      const dayOfMonthValue = Number.parseInt(String(dayOfMonth), 10);
      if (dayOfMonthValue < 1 || dayOfMonthValue > 31) {
        return res.status(400).json({
          success: false,
          error: 'Day of month must be between 1 and 31'
        });
      }
      updateData.dayOfMonth = dayOfMonthValue;
    }
    
    if (useLastDay !== undefined) updateData.useLastDay = useLastDay;
    if (endDate !== undefined) {
      updateData.endDate = endDate ? new Date(String(endDate)) : null;
    }
    
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
    console.error('updateRecurringCharge error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Pause recurring charge
export const pauseRecurringCharge: Handler = async (req, res) => {
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
    console.error('pauseRecurringCharge error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Resume recurring charge
export const resumeRecurringCharge: Handler = async (req, res) => {
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
    console.error('resumeRecurringCharge error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Cancel recurring charge
export const cancelRecurringCharge: Handler = async (req, res) => {
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
    console.error('cancelRecurringCharge error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Soft delete recurring charge
export const deleteRecurringCharge: Handler = async (req, res) => {
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
    console.error('deleteRecurringCharge error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Run scheduler - create expense instances for due charges
export const runScheduler: Handler = async (req, res) => {
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
    console.error('runScheduler error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

