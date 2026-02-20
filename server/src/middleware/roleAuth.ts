import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../types/http';

const USER_ROLES = {
  ADMIN: 'ADMIN',
  EMPLOYEE: 'EMPLOYEE'
};

// Check if user has required role — reads from req.user set by verifyToken
const requireRole = (roles: string[] | string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(403).json({
        success: false,
        error: 'No role assigned in current organization'
      });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Check if user is admin
const requireAdmin = requireRole(USER_ROLES.ADMIN);

// Check if user is admin or employee
const requireAuth = requireRole([USER_ROLES.ADMIN, USER_ROLES.EMPLOYEE]);

export {
  USER_ROLES,
  requireRole,
  requireAdmin,
  requireAuth
};
