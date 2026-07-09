import { Router } from 'express';
import * as salesReportController from '../controllers/salesReportController';
import { requireOrg, verifyToken } from '../middleware/auth';
import { uploadSingle } from '../middleware/upload';
import { requireAdmin } from '../middleware/roleAuth';
import { auditAction } from '../middleware/auditAction';
import { reportLimiter, uploadLimiter } from '../middleware/rateLimits';
import { validate } from '../middleware/validate';
import { idParam, salesReportSchemas } from '../validation/schemas';

const router = Router();

// All routes require authentication and org context
router.use(verifyToken);
router.use(requireOrg);

// Sales report management
router.post('/with-receipt', uploadLimiter, uploadSingle, validate({ body: salesReportSchemas.create }), salesReportController.createSalesReportWithReceipt);
router.post('/', validate({ body: salesReportSchemas.create }), salesReportController.uploadSalesReport);
router.get('/', validate({ query: salesReportSchemas.filters }), salesReportController.getAllSalesReports);
router.get('/analytics', reportLimiter, validate({ query: salesReportSchemas.analytics }), salesReportController.getSalesAnalytics);
router.get('/monthly-summary', reportLimiter, validate({ query: salesReportSchemas.month }), salesReportController.getMonthlySummary);
router.get('/:id', validate({ params: idParam }), salesReportController.getSalesReportById);
router.get('/:id/image', validate({ params: idParam }), salesReportController.getSalesReportImage);
router.put('/:id', validate({ params: idParam, body: salesReportSchemas.update }), auditAction({ action: 'UPDATE', entityType: 'SalesReport', entityId: req => req.params.id }), salesReportController.updateSalesReport);
router.post('/:id/approve', requireAdmin, validate({ params: idParam }), auditAction({ action: 'APPROVE', entityType: 'SalesReport', entityId: req => req.params.id }), salesReportController.approveSalesReport);
router.post('/:id/reject', requireAdmin, validate({ params: idParam, body: salesReportSchemas.reject }), auditAction({ action: 'REJECT', entityType: 'SalesReport', entityId: req => req.params.id }), salesReportController.rejectSalesReport);
router.delete('/:id', validate({ params: idParam }), auditAction({ action: 'DELETE', entityType: 'SalesReport', entityId: req => req.params.id }), salesReportController.deleteSalesReport);

export default router;
