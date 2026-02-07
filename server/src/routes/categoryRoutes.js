const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { verifyToken, requireOrg } = require('../middleware/auth');

// Seed preset categories (system-wide, run once)
router.post('/seed', categoryController.seedPresetCategories);

// Get all preset categories (public)
router.get('/presets', categoryController.getAllPresetCategories);

// Organization-specific routes (require auth and org context)
router.use(verifyToken);
router.use(requireOrg);

// Get organization's enabled categories
router.get('/', categoryController.getOrgCategories);

// Enable a preset category for organization
router.post('/', categoryController.enableCategory);

// Update organization category (custom name, sort order, disable)
router.put('/:id', categoryController.updateOrgCategory);

// Disable category
router.delete('/:id', categoryController.disableCategory);

module.exports = router;
