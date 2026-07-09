import { Router } from 'express';
import * as recurringChargeController from '../controllers/recurringChargeController';
import { requireOrg, verifyToken } from '../middleware/auth';
import { auditAction } from '../middleware/auditAction';
import { validate } from '../middleware/validate';
import { idParam, recurringChargeSchemas } from '../validation/schemas';

const router = Router();

// All routes require authentication and org context
router.use(verifyToken);
router.use(requireOrg);

// Recurring charge management
router.post('/', validate({ body: recurringChargeSchemas.create }), recurringChargeController.createRecurringCharge);
router.get('/', validate({ query: recurringChargeSchemas.filters }), recurringChargeController.getAllRecurringCharges);
router.get('/:id', validate({ params: idParam }), recurringChargeController.getRecurringChargeById);
router.put('/:id', validate({ params: idParam, body: recurringChargeSchemas.update }), auditAction({ action: 'UPDATE', entityType: 'RecurringCharge', entityId: req => req.params.id }), recurringChargeController.updateRecurringCharge);
router.post('/:id/pause', validate({ params: idParam }), auditAction({ action: 'UPDATE', entityType: 'RecurringCharge', entityId: req => req.params.id }), recurringChargeController.pauseRecurringCharge);
router.post('/:id/resume', validate({ params: idParam }), auditAction({ action: 'UPDATE', entityType: 'RecurringCharge', entityId: req => req.params.id }), recurringChargeController.resumeRecurringCharge);
router.post('/:id/cancel', validate({ params: idParam }), auditAction({ action: 'DELETE', entityType: 'RecurringCharge', entityId: req => req.params.id }), recurringChargeController.cancelRecurringCharge);
router.delete('/:id', validate({ params: idParam }), auditAction({ action: 'DELETE', entityType: 'RecurringCharge', entityId: req => req.params.id }), recurringChargeController.deleteRecurringCharge);

// Scheduler endpoint (could be called by cron job or manually)
router.post('/scheduler/run', recurringChargeController.runScheduler);

export default router;
