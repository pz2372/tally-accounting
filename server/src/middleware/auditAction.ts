import { NextFunction, Response } from 'express';
import { audit } from '../services/auditService';
import { AuthenticatedRequest } from '../types/http';

type AuditActionOptions = {
  action: string;
  entityType: string;
  entityId?: (req: AuthenticatedRequest) => string | null | undefined;
  metadata?: (req: AuthenticatedRequest) => Record<string, unknown> | null | undefined;
};

export const auditAction = (options: AuditActionOptions) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      const orgId = req.user?.orgId;
      if (!orgId) return;

      audit({
        orgId,
        userId: req.user?.id ?? null,
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId?.(req) || req.params.id || req.params.memberId || 'bulk',
        metadata: {
          method: req.method,
          path: req.originalUrl,
          ...(options.metadata?.(req) ?? {}),
        },
      });
    });

    next();
  };
};
