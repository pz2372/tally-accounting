import { Router } from 'express';
import * as authController from '../controllers/authController';
import * as userController from '../controllers/userController';
import * as verificationController from '../controllers/verificationController';
import { verifyToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleAuth';

const router = Router();

// Public routes (no auth required)
// POST /api/auth/firebase-login - Login with Firebase token
router.post('/firebase-login', authController.firebaseLogin);
// POST /api/auth/register - Register new user
router.post('/register', authController.register);
// GET /api/auth/invite/:token - Validate invite token
router.get('/invite/:token', authController.validateInvite);
// POST /api/auth/accept-invite - Accept invite and create account
router.post('/accept-invite', authController.acceptInvite);

// All routes below require authentication
router.use(verifyToken);

// GET /api/auth/me - Get current user profile
router.get('/me', userController.getCurrentUser);

// POST /api/auth/token - Create custom token
router.post('/token', authController.createCustomToken);

// Email verification codes (for sensitive actions like Connect Cards)
router.post('/send-verification-code', verificationController.sendCode);
router.post('/verify-code', verificationController.verifyCode);

// PUT /api/auth/profile - Update user profile
router.put('/profile', userController.updateProfile);

// DELETE /api/auth/account - Deactivate account
router.delete('/account', userController.deactivateAccount);

// POST /api/auth/verify-email - Verify email
router.post('/verify-email', userController.verifyEmail);

// Admin only routes
router.get('/users', requireAdmin, userController.getAllUsers);
router.post('/users/role', requireAdmin, userController.setUserRole);
router.post('/users/employee', requireAdmin, userController.createEmployee);

export default router;
