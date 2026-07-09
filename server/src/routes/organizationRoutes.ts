import { Router } from 'express';
import * as organizationController from '../controllers/organizationController';
import { requireOrg, verifyToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleAuth';
import { auditAction } from '../middleware/auditAction';
import { validate } from '../middleware/validate';
import { memberIdParam, organizationSchemas } from '../validation/schemas';

const router = Router();

// Stripe Checkout flow (no org context needed)
router.post('/checkout', verifyToken, validate({ body: organizationSchemas.checkout }), organizationController.createCheckoutSession);
router.post('/complete-checkout', verifyToken, validate({ body: organizationSchemas.completeCheckout }), organizationController.completeCheckout);

// All other routes require organization context
router.get('/', verifyToken, requireOrg, organizationController.getOrganization);
router.put('/', verifyToken, requireOrg, requireAdmin, validate({ body: organizationSchemas.update }), auditAction({ action: 'ADMIN_UPDATE', entityType: 'Organization', entityId: req => req.user?.orgId }), organizationController.updateOrganization);

// Member management
router.get('/members', verifyToken, requireOrg, organizationController.getMembers);
router.post('/invite', verifyToken, requireOrg, requireAdmin, validate({ body: organizationSchemas.invite }), auditAction({ action: 'ADMIN_INVITE', entityType: 'OrgMember', entityId: req => String(req.body.email || 'unknown') }), organizationController.inviteUser);
router.put('/members/:memberId', verifyToken, requireOrg, requireAdmin, validate({ params: memberIdParam, body: organizationSchemas.memberUpdate }), auditAction({ action: 'ADMIN_UPDATE', entityType: 'OrgMember', entityId: req => req.params.memberId }), organizationController.updateMember);
router.delete('/members/:memberId', verifyToken, requireOrg, requireAdmin, validate({ params: memberIdParam }), auditAction({ action: 'DELETE', entityType: 'OrgMember', entityId: req => req.params.memberId }), organizationController.removeMember);

export default router;
