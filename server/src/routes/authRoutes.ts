import { Router } from 'express';
import * as authController from '../controllers/authController';
import * as userController from '../controllers/userController';
import * as verificationController from '../controllers/verificationController';
import { verifyToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleAuth';
import { validate } from '../middleware/validate';
import { authSchemas, tokenParam } from '../validation/schemas';
import { auditAction } from '../middleware/auditAction';

const router = Router();

// Public routes (no auth required)
// POST /api/auth/firebase-login - Login with Firebase token
router.post('/firebase-login', validate({ body: authSchemas.firebaseLogin }), authController.firebaseLogin);
// POST /api/auth/direct-login - Login with email/password (bypasses Firebase)
router.post('/direct-login', validate({ body: authSchemas.directLogin }), authController.directLogin);
// POST /api/auth/register - Register new user
router.post('/register', validate({ body: authSchemas.register }), authController.register);
// POST /api/auth/register-checkout - Create Stripe Checkout for registration
router.post('/register-checkout', validate({ body: authSchemas.registerCheckout }), authController.registerCheckout);
// POST /api/auth/complete-registration - Complete registration after Stripe payment
router.post('/complete-registration', validate({ body: authSchemas.completeRegistration }), authController.completeRegistration);
// POST /api/auth/register-free - Register without payment
router.post('/register-free', validate({ body: authSchemas.registerFree }), authController.registerFree);
// GET /api/auth/invite/:token - Validate invite token
router.get('/invite/:token', validate({ params: tokenParam }), authController.validateInvite);
// POST /api/auth/accept-invite - Accept invite and create account
router.post('/accept-invite', validate({ body: authSchemas.acceptInvite }), authController.acceptInvite);

// All routes below require authentication
router.use(verifyToken);

// GET /api/auth/me - Get current user profile
router.get('/me', userController.getCurrentUser);

// POST /api/auth/token - Create custom token
router.post('/token', authController.createCustomToken);

// Email verification codes (for sensitive actions like Connect Cards)
router.post('/send-verification-code', verificationController.sendCode);
router.post('/verify-code', validate({ body: authSchemas.verificationCode }), verificationController.verifyCode);

// PUT /api/auth/profile - Update user profile
router.put('/profile', validate({ body: authSchemas.profile }), userController.updateProfile);

// DELETE /api/auth/account - Deactivate account
router.delete('/account', userController.deactivateAccount);

// POST /api/auth/verify-email - Verify email
router.post('/verify-email', validate({ body: authSchemas.emailOnly }), userController.verifyEmail);

// Admin only routes
router.get('/users', requireAdmin, userController.getAllUsers);
router.post('/users/role', requireAdmin, validate({ body: authSchemas.setUserRole }), auditAction({ action: 'ADMIN_UPDATE', entityType: 'UserRole', entityId: req => String(req.body.uid || 'unknown') }), userController.setUserRole);
router.post('/users/employee', requireAdmin, validate({ body: authSchemas.employee }), auditAction({ action: 'ADMIN_CREATE', entityType: 'Employee', entityId: req => String(req.body.email || 'unknown') }), userController.createEmployee);

export default router;
