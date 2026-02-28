import { getAuth } from '../config/firebase';
import prisma from '../config/database';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import { Response } from 'express';
import { AuthenticatedRequest } from '../types/http';
import { PRESET_CATEGORIES } from '../config/categories';

import { Request } from 'express';

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<Response | void> | Response | void;
type PublicHandler = (req: Request, res: Response) => Promise<Response | void> | Response | void;

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET: Secret = process.env.JWT_SECRET;
const JWT_EXPIRES_IN: SignOptions['expiresIn'] = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

// Register user - create Firebase user, create DB user, return access token
export const register: Handler = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    let userRecord;
    try {
      userRecord = await getAuth().createUser({
        email,
        password,
        displayName: name || undefined
      });
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        return res.status(409).json({
          success: false,
          error: 'Email already in use'
        });
      }

      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to create Firebase user'
      });
    }

    const { uid } = userRecord;

    // Create user in database if needed
    let user = await prisma.user.findUnique({
      where: { firebaseUid: uid },
      include: {
        memberships: {
          include: {
            org: {
              include: {
                subscription: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          firebaseUid: uid,
          email,
          name: name || null,
        },
        include: {
          memberships: {
            include: {
              org: {
                include: {
                  subscription: true
                }
              }
            }
          }
        }
      });
    }

    const accessToken = jwt.sign(
      {
        id: user.id,
        firebaseUid: uid,
        email: user.email,
        emailVerified: userRecord.emailVerified || false
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: userRecord.emailVerified || false,
        createdAt: user.createdAt,
        organizations: user.memberships.map(m => ({
          id: m.orgId,
          name: m.org.name,
          dba: m.org.dba,
          role: m.role,
          permissions: m.permissions,
          subscription: m.org.subscription
        }))
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
};

// Firebase login - verify Firebase token and return access token
export const firebaseLogin: Handler = async (req, res) => {
  try {
    const { firebaseToken } = req.body;
    
    if (!firebaseToken) {
      return res.status(400).json({
        success: false,
        error: 'Firebase token is required'
      });
    }
    
    // Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(firebaseToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Firebase token'
      });
    }
    
    const { uid, email, email_verified, name, picture } = decodedToken;
    
    // Calculate current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Find or create user in database with basic organization list
    let user = await prisma.user.findUnique({
      where: { firebaseUid: uid },
      include: {
        memberships: {
          include: {
            org: {
              include: {
                subscription: true
              }
            }
          }
        }
      }
    });
    
    if (user && !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Invalid login credentials'
      });
    }

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          firebaseUid: uid,
          email: email || '',
          name: name || null,
        },
        include: {
          memberships: {
            include: {
              org: {
                include: {
                  subscription: true
                }
              }
            }
          }
        }
      });
    }
    
    // Load detailed data only for the first organization
    let firstOrgData = null;
    if (user.memberships.length > 0) {
      const firstOrgId = user.memberships[0].orgId;
      
      firstOrgData = await prisma.organization.findUnique({
        where: { id: firstOrgId },
        include: {
          orgCategories: true,
          expenses: {
            where: {
              expenseDate: { gte: startOfMonth, lte: endOfMonth }
            }
          },
          matches: {
            where: {
              createdAt: { gte: startOfMonth, lte: endOfMonth }
            },
            include: {
              expense: true,
              cardTxn: true
            }
          }
        }
      });
    }
    
    // Generate access token
    const accessToken = jwt.sign(
      {
        id: user.id,
        firebaseUid: uid,
        email: user.email,
        emailVerified: email_verified || false
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: email_verified || false,
        createdAt: user.createdAt,
        organizations: user.memberships.map(m => ({
          id: m.orgId,
          name: m.org.name,
          dba: m.org.dba,
          role: m.role,
          permissions: m.permissions,
          subscription: m.org.subscription
        }))
      },
      presetCategories: PRESET_CATEGORIES,
      firstOrgData: firstOrgData ? {
        orgId: firstOrgData.id,
        categoryOverrides: firstOrgData.orgCategories,
        expenses: firstOrgData.expenses,
        matches: firstOrgData.matches
      } : null,
      syncedAt: new Date().toISOString(),
      syncPeriod: {
        start: startOfMonth.toISOString(),
        end: endOfMonth.toISOString()
      }
    });
  } catch (error) {
    console.error('Firebase login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
};

// Create custom token — only for the currently authenticated user's own Firebase UID
export const createCustomToken: Handler = async (req, res) => {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { firebaseUid: true }
    });

    if (!dbUser?.firebaseUid) {
      return res.status(400).json({
        success: false,
        error: 'No Firebase account linked to this user'
      });
    }

    const customToken = await getAuth().createCustomToken(dbUser.firebaseUid);
    res.json({
      success: true,
      token: customToken
    });
  } catch (error) {
    console.error('createCustomToken error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create token'
    });
  }
};

// Validate invite token (public)
export const validateInvite: PublicHandler = async (req, res) => {
  try {
    const { token } = req.params;

    const invite = await prisma.inviteToken.findUnique({
      where: { token },
      include: {
        user: { select: { email: true } },
        org: { select: { name: true } },
      },
    });

    if (!invite) {
      return res.status(404).json({ success: false, error: 'Invalid invite link' });
    }

    if (invite.usedAt) {
      return res.status(400).json({ success: false, error: 'This invite has already been used' });
    }

    if (invite.expiresAt < new Date()) {
      return res.status(400).json({ success: false, error: 'This invite has expired' });
    }

    res.json({
      success: true,
      email: invite.user.email,
      orgName: invite.org.name,
    });
  } catch (error) {
    console.error('validateInvite error:', error);
    res.status(500).json({ success: false, error: 'Failed to validate invite' });
  }
};

// Accept invite — set password, create Firebase user, activate account (public)
export const acceptInvite: PublicHandler = async (req, res) => {
  try {
    const { token, name, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ success: false, error: 'Token and password are required' });
    }

    const invite = await prisma.inviteToken.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            memberships: {
              include: {
                org: { include: { subscription: true } },
              },
            },
          },
        },
      },
    });

    if (!invite) {
      return res.status(404).json({ success: false, error: 'Invalid invite link' });
    }

    if (invite.usedAt) {
      return res.status(400).json({ success: false, error: 'This invite has already been used' });
    }

    if (invite.expiresAt < new Date()) {
      return res.status(400).json({ success: false, error: 'This invite has expired' });
    }

    // Create Firebase auth user
    let userRecord;
    try {
      userRecord = await getAuth().createUser({
        email: invite.user.email,
        password,
        displayName: name || undefined,
      });
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        return res.status(409).json({ success: false, error: 'An account with this email already exists. Please log in instead.' });
      }
      console.error('Firebase createUser error:', error);
      return res.status(400).json({ success: false, error: 'Failed to create account' });
    }

    // Update the DB user with Firebase UID and name
    const user = await prisma.user.update({
      where: { id: invite.userId },
      data: {
        firebaseUid: userRecord.uid,
        name: name?.trim() || null,
      },
      include: {
        memberships: {
          include: {
            org: { include: { subscription: true } },
          },
        },
      },
    });

    // Mark invite as used
    await prisma.inviteToken.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });

    // Generate JWT
    const accessToken = jwt.sign(
      {
        id: user.id,
        firebaseUid: userRecord.uid,
        email: user.email,
        emailVerified: userRecord.emailVerified || false,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: userRecord.emailVerified || false,
        createdAt: user.createdAt,
        organizations: user.memberships.map((m) => ({
          id: m.orgId,
          name: m.org.name,
          dba: m.org.dba,
          role: m.role,
          permissions: m.permissions,
          subscription: m.org.subscription,
        })),
      },
    });
  } catch (error) {
    console.error('acceptInvite error:', error);
    res.status(500).json({ success: false, error: 'Failed to accept invite' });
  }
};

