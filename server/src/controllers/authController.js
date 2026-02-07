const { getAuth } = require('../config/firebase');
const prisma = require('../config/database');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Firebase login - verify Firebase token and return access token
exports.firebaseLogin = async (req, res) => {
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
    
    // Find or create user in database
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

// Get current user profile with organizations
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
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
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: req.user.emailVerified,
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create custom token
exports.createCustomToken = async (req, res) => {
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

// Verify email (stub - email verification handled by Firebase Auth)
exports.verifyEmail = async (req, res) => {
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name }
    });
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete user (removes from database, Firebase deletion handled separately)
exports.deleteUser = async (req, res) => {
  try {
    // Delete user from database (cascades to memberships)
    await prisma.user.delete({
      where: { id: req.user.id }
    });
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
