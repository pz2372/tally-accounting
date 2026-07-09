import { Router } from 'express';
import * as categoryController from '../controllers/categoryController';
import { requireOrg, verifyToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleAuth';
import { auditAction } from '../middleware/auditAction';
import { validate } from '../middleware/validate';
import { categorySchemas } from '../validation/schemas';

const router = Router();

// Get all preset categories (from constants — no auth needed)
router.get('/presets', categoryController.getAllPresetCategories);

// Organization-specific routes (require auth and org context)
router.use(verifyToken);
router.use(requireOrg);

// Get org's category settings (presets merged with per-org overrides)
router.get('/', categoryController.getOrgCategories);

// Update category overrides (disable / hide from employees)
router.put('/batch', requireAdmin, validate({ body: categorySchemas.batchUpdate }), auditAction({ action: 'ADMIN_UPDATE', entityType: 'CategorySettings' }), categoryController.updateOrgCategories);

export default router;
