const { getFirestore } = require('../config/firebase');

const USER_ROLES = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee'
};

// Check if user has required role
const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(req.user.uid).get();
      
      if (!userDoc.exists) {
        return res.status(403).json({
          success: false,
          error: 'User profile not found'
        });
      }
      
      const userData = userDoc.data();
      const userRole = userData.role || USER_ROLES.EMPLOYEE;
      
      // Check if user has required role
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }
      
      req.user.role = userRole;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Role verification error'
      });
    }
  };
};

// Check if user is admin
const requireAdmin = requireRole(USER_ROLES.ADMIN);

// Check if user is admin or employee
const requireAuth = requireRole([USER_ROLES.ADMIN, USER_ROLES.EMPLOYEE]);

module.exports = {
  USER_ROLES,
  requireRole,
  requireAdmin,
  requireAuth
};
