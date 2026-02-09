import { NextFunction, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { getAuth } from '../config/firebase';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../types/http';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
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

    try {
      // First try to verify as JWT access token
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
      const decodedId = decoded?.id as string | undefined;

      if (!decodedId) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token payload'
        });
      }

      // Get user from database
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
        currentOrg = dbUser.memberships.find(m => m.orgId === orgIdHeader);
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
    } catch (jwtError) {
      // If JWT verification fails, try Firebase token (backward compatibility)
      try {
        const decodedToken = await getAuth().verifyIdToken(token) as DecodedIdToken;

        // Get user from database by Firebase UID
        let dbUser = await prisma.user.findUnique({
          where: { firebaseUid: decodedToken.uid },
          include: {
            memberships: {
              include: {
                org: true
              }
            }
          }
        }) as UserWithMemberships | null;

        // If user doesn't exist in database, create them
        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              firebaseUid: decodedToken.uid,
              email: decodedToken.email || '',
              name: decodedToken.name
            },
            include: {
              memberships: {
                include: {
                  org: true
                }
              }
            }
          }) as UserWithMemberships;
        }

        // Extract orgId from header or use first membership
        const orgIdHeader = req.headers['x-org-id'] as string | undefined;
        let currentOrg = null;

        if (orgIdHeader) {
          currentOrg = dbUser.memberships.find(m => m.orgId === orgIdHeader);
        } else if (dbUser.memberships.length > 0) {
          currentOrg = dbUser.memberships[0];
        }

        req.user = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          emailVerified: decodedToken.email_verified,
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
      } catch (firebaseError) {
        console.error('Token verification error:', firebaseError);
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }
    }
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
        const decodedToken = await getAuth().verifyIdToken(token) as DecodedIdToken;

        if (!decodedToken.email) {
          return next();
        }

        // Get user from database
        const dbUser = await prisma.user.findUnique({
          where: { email: decodedToken.email },
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
            currentOrg = dbUser.memberships.find(m => m.orgId === orgIdHeader);
          } else if (dbUser.memberships.length > 0) {
            currentOrg = dbUser.memberships[0];
          }

          req.user = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            emailVerified: decodedToken.email_verified,
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
      } catch (error) {
        // Token invalid but continue anyway
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
