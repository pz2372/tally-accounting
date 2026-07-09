import { Router } from 'express';
import * as matchController from '../controllers/matchController';
import { requireOrg, verifyToken } from '../middleware/auth';
import { auditAction } from '../middleware/auditAction';
import { validate } from '../middleware/validate';
import { idParam, matchSchemas, statementIdParam } from '../validation/schemas';

const router = Router();

// All routes require authentication and org context
router.use(verifyToken);
router.use(requireOrg);

// Matching operations
router.post('/run/:statementId', validate({ params: statementIdParam, body: matchSchemas.run }), auditAction({ action: 'MATCH_RUN', entityType: 'Statement', entityId: req => req.params.statementId }), matchController.runMatching);
router.get('/', validate({ query: matchSchemas.filters }), matchController.getAllMatches);
router.post('/:id/approve', validate({ params: idParam }), auditAction({ action: 'APPROVE', entityType: 'ReceiptMatch', entityId: req => req.params.id }), matchController.approveMatch);
router.post('/:id/reject', validate({ params: idParam }), auditAction({ action: 'REJECT', entityType: 'ReceiptMatch', entityId: req => req.params.id }), matchController.rejectMatch);
router.delete('/:id', validate({ params: idParam }), auditAction({ action: 'DELETE', entityType: 'ReceiptMatch', entityId: req => req.params.id }), matchController.deleteMatch);

export default router;
