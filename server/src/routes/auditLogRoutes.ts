import { Router } from 'express';
import * as auditLogController from '../controllers/auditLogController';
import { requireOrg, verifyToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { auditLogSchemas } from '../validation/schemas';

const router = Router();

router.use(verifyToken);
router.use(requireOrg);

// Get audit logs (admin only, read-only)
router.get('/', validate({ query: auditLogSchemas.filters }), auditLogController.getAuditLogs);

export default router;
