import { Router } from 'express';
import * as recurringChargeController from '../controllers/recurringChargeController';
import { requireOrg, verifyToken } from '../middleware/auth';

const router = Router();

// All routes require authentication and org context
router.use(verifyToken);
router.use(requireOrg);

// Recurring charge management
router.post('/', recurringChargeController.createRecurringCharge);
router.get('/', recurringChargeController.getAllRecurringCharges);
router.get('/:id', recurringChargeController.getRecurringChargeById);
router.put('/:id', recurringChargeController.updateRecurringCharge);
router.post('/:id/pause', recurringChargeController.pauseRecurringCharge);
router.post('/:id/resume', recurringChargeController.resumeRecurringCharge);
router.post('/:id/cancel', recurringChargeController.cancelRecurringCharge);
router.delete('/:id', recurringChargeController.deleteRecurringCharge);

// Scheduler endpoint (could be called by cron job or manually)
router.post('/scheduler/run', recurringChargeController.runScheduler);

export default router;
