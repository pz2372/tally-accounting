import { Router } from 'express';
import { verifyToken, requireOrg } from '../middleware/auth';
import * as plaidController from '../controllers/plaidController';
import { requireAdmin } from '../middleware/roleAuth';
import { auditAction } from '../middleware/auditAction';
import { validate } from '../middleware/validate';
import { itemIdParam, plaidSchemas } from '../validation/schemas';

const router = Router();

router.post('/webhook', plaidController.handleWebhook); // no auth — called by Plaid
router.post('/create-link-token', verifyToken, requireAdmin, plaidController.createLinkToken);
router.post('/exchange-token', verifyToken, requireOrg, requireAdmin, validate({ body: plaidSchemas.exchangeToken }), auditAction({ action: 'ADMIN_CONNECT', entityType: 'PlaidItem' }), plaidController.exchangeToken);
router.get('/accounts', verifyToken, requireOrg, plaidController.getAccounts);
router.delete('/items/:itemId', verifyToken, requireOrg, requireAdmin, validate({ params: itemIdParam }), auditAction({ action: 'DELETE', entityType: 'PlaidItem', entityId: req => req.params.itemId }), plaidController.removeItem);

export default router;
