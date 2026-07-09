import { RequestHandler, Router } from 'express';
import * as businessReportController from '../controllers/businessReportController';
import { requireOrg, verifyToken } from '../middleware/auth';
import { auditAction } from '../middleware/auditAction';
import { reportLimiter, smsLimiter } from '../middleware/rateLimits';
import { validate } from '../middleware/validate';
import { businessReportSchemas } from '../validation/schemas';

const router = Router();

const requireSchedulerSecret: RequestHandler = (req, res, next) => {
  const schedulerSecret = process.env.SCHEDULER_SECRET;
  if (!schedulerSecret) {
    return res.status(503).json({ success: false, error: 'Scheduler secret is not configured' });
  }
  if (req.header('x-scheduler-secret') !== schedulerSecret) {
    return res.status(401).json({ success: false, error: 'Invalid scheduler secret' });
  }
  next();
};

router.post('/automation/scheduler/run', requireSchedulerSecret, businessReportController.runAutomationScheduler);

router.use(verifyToken);
router.use(requireOrg);

router.post('/create-pdf', reportLimiter, validate({ body: businessReportSchemas.createPdf }), auditAction({ action: 'REPORT_CREATE', entityType: 'BusinessReport' }), businessReportController.createPdfReport);
router.get('/automation', businessReportController.getAutomation);
router.all('/automation/remove', auditAction({ action: 'DELETE', entityType: 'BusinessReportAutomation' }), businessReportController.deleteAutomation);
router.all('/automation/delete', auditAction({ action: 'DELETE', entityType: 'BusinessReportAutomation' }), businessReportController.deleteAutomation);
router.post('/automation', validate({ body: businessReportSchemas.automation }), auditAction({ action: 'REPORT_AUTOMATION_SAVE', entityType: 'BusinessReportAutomation' }), businessReportController.saveAutomation);
router.delete('/automation', auditAction({ action: 'DELETE', entityType: 'BusinessReportAutomation' }), businessReportController.deleteAutomation);
router.post('/automation/test-sms', smsLimiter, validate({ body: businessReportSchemas.testSms }), auditAction({ action: 'SMS_TEST', entityType: 'BusinessReportAutomation' }), businessReportController.testSmsDelivery);

export default router;
