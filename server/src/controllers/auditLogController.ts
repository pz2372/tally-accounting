import { Response } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../types/http';

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<Response | void> | Response | void;

// Get audit logs for the organization (admin only).
// Query params: entityType, entityId, userId, startDate, endDate, limit, offset
export const getAuditLogs: Handler = async (req, res) => {
  try {
    const { orgId, role } = req.user;

    if (role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    if (!orgId) {
      return res.status(403).json({ success: false, error: 'Organization context required' });
    }

    const { entityType, entityId, userId, startDate, endDate } = req.query;
    const take = Math.min(Number(req.query.limit) || 50, 200);
    const skip = Number(req.query.offset) || 0;

    const where: Record<string, unknown> = { orgId };
    if (typeof entityType === 'string') where.entityType = entityType;
    if (typeof entityId === 'string') where.entityId = entityId;
    if (typeof userId === 'string') where.userId = userId;
    if (typeof startDate === 'string' || typeof endDate === 'string') {
      const createdAt: Record<string, Date> = {};
      if (typeof startDate === 'string') createdAt.gte = new Date(startDate);
      if (typeof endDate === 'string') createdAt.lte = new Date(endDate);
      where.createdAt = createdAt;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ success: true, logs, total, limit: take, offset: skip });
  } catch (error) {
    console.error('getAuditLogs error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
