import { Router } from 'express';
import * as organizationController from '../controllers/organizationController';
import { requireOrg, verifyToken } from '../middleware/auth';

const router = Router();

// Stripe Checkout flow (no org context needed)
router.post('/checkout', verifyToken, organizationController.createCheckoutSession);
router.post('/complete-checkout', verifyToken, organizationController.completeCheckout);

// All other routes require organization context
router.get('/', verifyToken, requireOrg, organizationController.getOrganization);
router.put('/', verifyToken, requireOrg, organizationController.updateOrganization);

// Member management
router.get('/members', verifyToken, requireOrg, organizationController.getMembers);
router.post('/invite', verifyToken, requireOrg, organizationController.inviteUser);
router.put('/members/:memberId', verifyToken, requireOrg, organizationController.updateMember);
router.delete('/members/:memberId', verifyToken, requireOrg, organizationController.removeMember);

export default router;
