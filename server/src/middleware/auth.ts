import { NextFunction, Response } from 'express';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../types/http';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;

type UserWithMemberships = Prisma.UserGetPayload<{
  include: { memberships: { include: { org: true } } };
}>;

// Verify JWT access token and get user from database
const verifyToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const token = authHeader.split('Bearer ')[1];

    let decoded: jwt.JwtPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    } catch {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const decodedId = decoded?.id as string | undefined;
    if (!decodedId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token payload'
      });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: decodedId },
      include: {
        memberships: {
          include: {
            org: true
          }
        }
      }
    }) as UserWithMemberships | null;

    if (!dbUser) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Extract orgId from header or use first membership
    const orgIdHeader = req.headers['x-org-id'] as string | undefined;
    let currentOrg = null;

    if (orgIdHeader) {
      currentOrg = dbUser.memberships.find(m => m.orgId === orgIdHeader) || null;
      if (!currentOrg) {
        return res.status(403).json({
          success: false,
          error: 'Organization not found or access denied'
        });
      }
    } else if (dbUser.memberships.length > 0) {
      currentOrg = dbUser.memberships[0];
    }

    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      emailVerified: decoded.emailVerified || false,
      orgId: currentOrg?.orgId || null,
      role: currentOrg?.role || null,
      permissions: currentOrg?.permissions || [],
      memberships: dbUser.memberships.map(m => ({
        orgId: m.orgId,
        orgName: m.org.name,
        role: m.role,
        permissions: m.permissions
      }))
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};

// Optional authentication - continues even if no token
const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
        const decodedId = decoded?.id as string | undefined;

        if (decodedId) {
          const dbUser = await prisma.user.findUnique({
            where: { id: decodedId },
            include: {
              memberships: {
                include: {
                  org: true
                }
              }
            }
          }) as UserWithMemberships | null;

          if (dbUser) {
            const orgIdHeader = req.headers['x-org-id'] as string | undefined;
            let currentOrg = null;

            if (orgIdHeader) {
              currentOrg = dbUser.memberships.find(m => m.orgId === orgIdHeader) || null;
            } else if (dbUser.memberships.length > 0) {
              currentOrg = dbUser.memberships[0];
            }

            req.user = {
              id: dbUser.id,
              email: dbUser.email,
              name: dbUser.name,
              emailVerified: decoded.emailVerified || false,
              orgId: currentOrg?.orgId || null,
              role: currentOrg?.role || null,
              permissions: currentOrg?.permissions || [],
              memberships: dbUser.memberships.map(m => ({
                orgId: m.orgId,
                orgName: m.org.name,
                role: m.role,
                permissions: m.permissions
              }))
            };
          }
        }
      } catch {
        // Token invalid — continue as unauthenticated
        req.user = null;
      }
    }
    next();
  } catch (error) {
    next();
  }
};

// Require organization context
const requireOrg = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.orgId) {
    return res.status(403).json({
      success: false,
      error: 'Organization context required. Include x-org-id header.'
    });
  }
  next();
};

export {
  verifyToken,
  optionalAuth,
  requireOrg
};
