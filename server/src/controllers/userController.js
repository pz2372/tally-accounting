const { getAuth, getFirestore } = require('../config/firebase');
const { USER_ROLES } = require('../middleware/roleAuth');

// Get current user profile with role
exports.getCurrentUser = async (req, res) => {
  try {
    const db = getFirestore();
    const user = await getAuth().getUser(req.user.uid);
    
    // Get user role from Firestore
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    
    res.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        role: userData.role || USER_ROLES.EMPLOYEE,
        businessId: userData.businessId,
        createdAt: user.metadata.creationTime,
        lastSignIn: user.metadata.lastSignInTime
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

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { displayName, photoURL } = req.body;
    const db = getFirestore();
    
    const updateData = {};
    if (displayName) updateData.displayName = displayName;
    if (photoURL) updateData.photoURL = photoURL;
    
    await getAuth().updateUser(req.user.uid, updateData);
    
    // Update Firestore user doc
    await db.collection('users').doc(req.user.uid).update({
      displayName,
      updatedAt: new Date()
    });
    
    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Verify email
exports.verifyEmail = async (req, res) => {
  try {
    await getAuth().updateUser(req.user.uid, {
      emailVerified: true
    });
    
    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const db = getFirestore();
    
    // Delete from Firestore
    await db.collection('users').doc(req.user.uid).delete();
    
    // Delete from Auth
    await getAuth().deleteUser(req.user.uid);
    
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

// Admin only - Get all users
exports.getAllUsers = async (req, res) => {
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Admin only - Set user role
exports.setUserRole = async (req, res) => {
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Admin only - Create employee account
exports.createEmployee = async (req, res) => {
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
