import { getAuth, getFirestore } from '../config/firebase';
import { USER_ROLES } from '../middleware/roleAuth';
import prisma from '../config/database';
import { Response } from 'express';
import { AuthenticatedRequest } from '../types/http';

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<Response | void> | Response | void;

// Get current user profile with role
export const getCurrentUser: Handler = async (req, res) => {
  try {
    // Load user from Prisma with organizations
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        memberships: {
          include: {
            org: { include: { subscription: true } },
          },
        },
      },
    });

    res.json({
      success: true,
      user: {
        id: dbUser?.id,
        email: dbUser?.email,
        name: dbUser?.name,
        emailVerified: req.user.emailVerified || false,
        createdAt: dbUser?.createdAt,
        organizations: dbUser?.memberships.map(m => ({
          id: m.orgId,
          name: m.org.name,
          dba: m.org.dba,
          role: m.role,
          permissions: m.permissions,
          subscription: m.org.subscription,
        })) || [],
      }
    });
  } catch (error) {
    console.error('getCurrentUser error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
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
    console.error('createCustomToken error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Update user profile
export const updateProfile: Handler = async (req, res) => {
  try {
    const { displayName } = req.body;
    const userId = req.user.id;

    const updateData: { name?: string } = {};
    if (displayName !== undefined) updateData.name = displayName?.trim() || null;

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Verify email (stub - email verification handled by Firebase Auth)
export const verifyEmail: Handler = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // In production, you would send verification email via Firebase
    res.json({
      success: true,
      message: 'Verification email sent'
    });
  } catch (error) {
    console.error('verifyEmail error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Deactivate account
export const deactivateAccount: Handler = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user to find Firebase UID
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Soft delete in database
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    // Delete from Firebase Auth
    if (user.firebaseUid) {
      try {
        await getAuth().deleteUser(user.firebaseUid);
      } catch (firebaseError) {
        console.error('Firebase delete error:', firebaseError);
      }
    }

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    console.error('deactivateAccount error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Admin only - Get all users
export const getAllUsers: Handler = async (req, res) => {
  try {
    const db = getFirestore();
    const usersSnapshot = await db.collection('users').get();

    const users = [];
    usersSnapshot.forEach(doc => {
      users.push({
        uid: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('getAllUsers error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Admin only - Set user role
export const setUserRole: Handler = async (req, res) => {
  try {
    const { uid, role } = req.body;

    if (!uid || !role) {
      return res.status(400).json({
        success: false,
        error: 'UID and role are required'
      });
    }

    if (![USER_ROLES.ADMIN, USER_ROLES.EMPLOYEE].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be "admin" or "employee"'
      });
    }

    const db = getFirestore();
    await db.collection('users').doc(uid).set({
      role,
      updatedAt: new Date()
    }, { merge: true });

    res.json({
      success: true,
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('setUserRole error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Admin only - Create employee account
export const createEmployee: Handler = async (req, res) => {
  try {
    const { email, password, displayName, businessId } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Create user in Firebase Auth
    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName,
      emailVerified: false
    });

    // Create user profile in Firestore
    const db = getFirestore();
    await db.collection('users').doc(userRecord.uid).set({
      email,
      displayName,
      role: USER_ROLES.EMPLOYEE,
      businessId: businessId || req.user.businessId,
      createdBy: req.user.uid,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Employee account created successfully',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        role: USER_ROLES.EMPLOYEE
      }
    });
  } catch (error) {
    console.error('createEmployee error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
