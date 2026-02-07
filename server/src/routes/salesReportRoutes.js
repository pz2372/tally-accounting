const express = require('express');
const router = express.Router();
const salesReportController = require('../controllers/salesReportController');
const { verifyToken, requireOrg } = require('../middleware/auth');

// All routes require authentication and org context
router.use(verifyToken);
router.use(requireOrg);

// Sales report management
router.post('/', salesReportController.uploadSalesReport);
router.get('/', salesReportController.getAllSalesReports);
router.get('/analytics', salesReportController.getSalesAnalytics);
router.get('/:id', salesReportController.getSalesReportById);
router.put('/:id', salesReportController.updateSalesReport);
router.post('/:id/approve', salesReportController.approveSalesReport);
router.post('/:id/reject', salesReportController.rejectSalesReport);
router.delete('/:id', salesReportController.deleteSalesReport);

module.exports = router;
