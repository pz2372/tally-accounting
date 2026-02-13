import { Router } from 'express';
import * as authController from '../controllers/authController';
import * as userController from '../controllers/userController';
import { verifyToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleAuth';

const router = Router();

// Public routes (no auth required)
// POST /api/auth/firebase-login - Login with Firebase token
router.post('/firebase-login', authController.firebaseLogin);
// POST /api/auth/register - Register new user
router.post('/register', authController.register);

// All routes below require authentication
router.use(verifyToken);

// GET /api/auth/me - Get current user profile
router.get('/me', userController.getCurrentUser);

// POST /api/auth/token - Create custom token
router.post('/token', authController.createCustomToken);

// PUT /api/auth/profile - Update user profile
router.put('/profile', userController.updateProfile);

// POST /api/auth/verify-email - Verify email
router.post('/verify-email', userController.verifyEmail);

// Admin only routes
router.get('/users', requireAdmin, userController.getAllUsers);
router.post('/users/role', requireAdmin, userController.setUserRole);
router.post('/users/employee', requireAdmin, userController.createEmployee);

export default router;
