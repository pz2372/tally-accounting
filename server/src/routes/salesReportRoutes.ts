import { Router } from 'express';
import * as salesReportController from '../controllers/salesReportController';
import { requireOrg, verifyToken } from '../middleware/auth';
import { uploadSingle } from '../middleware/upload';

const router = Router();

// All routes require authentication and org context
router.use(verifyToken);
router.use(requireOrg);

// Sales report management
router.post('/with-receipt', uploadSingle, salesReportController.createSalesReportWithReceipt);
router.post('/', salesReportController.uploadSalesReport);
router.get('/', salesReportController.getAllSalesReports);
router.get('/analytics', salesReportController.getSalesAnalytics);
router.get('/monthly-summary', salesReportController.getMonthlySummary);
router.get('/:id', salesReportController.getSalesReportById);
router.get('/:id/image', salesReportController.getSalesReportImage);
router.put('/:id', salesReportController.updateSalesReport);
router.post('/:id/approve', salesReportController.approveSalesReport);
router.post('/:id/reject', salesReportController.rejectSalesReport);
router.delete('/:id', salesReportController.deleteSalesReport);

export default router;
