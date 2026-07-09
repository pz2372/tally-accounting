import { Router } from 'express';
import * as accountController from '../controllers/accountController';
import { requireOrg, verifyToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleAuth';
import { auditAction } from '../middleware/auditAction';
import { validate } from '../middleware/validate';
import { accountSchemas } from '../validation/schemas';

const router = Router();

router.use(verifyToken);
router.use(requireOrg);

// Get org's Chart of Accounts (all accounts with overrides, grouped by type)
router.get('/', accountController.getAccounts);

// Update account overrides (enable/disable, visibility)
router.put('/batch', requireAdmin, validate({ body: accountSchemas.batchUpdate }), auditAction({ action: 'ADMIN_UPDATE', entityType: 'AccountSettings' }), accountController.updateAccounts);

export default router;
