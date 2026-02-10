import { Router } from 'express';
import * as categoryController from '../controllers/categoryController';
import { requireOrg, verifyToken } from '../middleware/auth';

const router = Router();

// Seed preset categories (system-wide, run once)
router.post('/seed', categoryController.seedPresetCategories);

// Get all preset categories (public)
router.get('/presets', categoryController.getAllPresetCategories);

// Organization-specific routes (require auth and org context)
router.use(verifyToken);
router.use(requireOrg);

// Get organization's enabled categories
router.get('/', categoryController.getOrgCategories);

// Batch update categories (enable/disable multiple)
router.put('/batch', categoryController.batchUpdateCategories);

// Enable a preset category for organization
router.post('/', categoryController.enableCategory);

// Update organization category (custom name, sort order, disable)
router.put('/:id', categoryController.updateOrgCategory);

// Disable category
router.delete('/:id', categoryController.disableCategory);

export default router;
