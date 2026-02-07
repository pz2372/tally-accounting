const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleAuth');

// Public routes (no auth required)
// POST /api/auth/firebase-login - Login with Firebase token
router.post('/firebase-login', authController.firebaseLogin);

// All routes below require authentication
router.use(verifyToken);

// GET /api/auth/me - Get current user profile
router.get('/me', userController.getCurrentUser);

// POST /api/auth/token - Create custom token
router.post('/token', authController.createCustomToken);

// PUT /api/auth/profile - Update user profile
router.put('/profile', userController.updateProfile);

// POST /api/auth/verify-email - Verify email
router.post('/verify-email', authController.verifyEmail);

// DELETE /api/auth/user - Delete user account
router.delete('/user', authController.deleteUser);

// Admin only routes
router.get('/users', requireAdmin, userController.getAllUsers);
router.post('/users/role', requireAdmin, userController.setUserRole);
router.post('/users/employee', requireAdmin, userController.createEmployee);

module.exports = router;
