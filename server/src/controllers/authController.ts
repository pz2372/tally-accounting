import { getAuth } from '../config/firebase';
import prisma from '../config/database';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import { Response } from 'express';
import { AuthenticatedRequest } from '../types/http';

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<Response | void> | Response | void;

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
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
      error: error.message
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
          orgCategories: {
            include: {
              preset: true
            }
          },
          expenses: {
            where: {
              expenseDate: {
                gte: startOfMonth,
                lte: endOfMonth
              }
            },
            include: {
              orgCategory: {
                include: {
                  preset: true
                }
              }
            }
          },
          matches: {
            where: {
              createdAt: {
                gte: startOfMonth,
                lte: endOfMonth
              }
            },
            include: {
              expense: true,
              cardTxn: true
            }
          }
        }
      });
    }
    
    // Fetch all preset categories
    const presetCategories = await prisma.presetCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
    
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
          role: m.role,
          permissions: m.permissions,
          subscription: m.org.subscription
        }))
      },
      presetCategories,
      firstOrgData: firstOrgData ? {
        orgId: firstOrgData.id,
        categories: firstOrgData.orgCategories,
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
      error: error.message
    });
  }
};

// Create custom token
export const createCustomToken: Handler = async (req, res) => {
  try {
    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({
        success: false,
        error: 'UID is required'
      });
    }
    
    const customToken = await getAuth().createCustomToken(uid);
    res.json({
      success: true,
      token: customToken
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

