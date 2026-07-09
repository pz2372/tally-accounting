import { Router } from 'express';
import * as statementController from '../controllers/statementController';
import { requireOrg, verifyToken } from '../middleware/auth';
import { uploadSingle } from '../middleware/upload';
import { auditAction } from '../middleware/auditAction';
import { uploadLimiter } from '../middleware/rateLimits';
import { validate } from '../middleware/validate';
import { idParam, statementSchemas } from '../validation/schemas';

const router = Router();

// All routes require authentication and org context
router.use(verifyToken);
router.use(requireOrg);

// Statement management
router.post('/with-file', uploadLimiter, uploadSingle, validate({ body: statementSchemas.create }), statementController.uploadStatementWithFile);
router.post('/', validate({ body: statementSchemas.create }), statementController.uploadStatement);
router.get('/', validate({ query: statementSchemas.filters }), statementController.getAllStatements);
router.get('/unmatched', validate({ query: statementSchemas.unmatched }), statementController.getUnmatchedTransactions);
router.get('/:id', validate({ params: idParam }), statementController.getStatementById);
router.get('/:id/file', validate({ params: idParam }), statementController.getStatementFile);
router.get('/:id/file-url', validate({ params: idParam }), statementController.getStatementFileUrl);
router.get('/:id/transactions', validate({ params: idParam, query: statementSchemas.transactions }), statementController.getStatementTransactions);
router.delete('/:id', validate({ params: idParam }), auditAction({ action: 'DELETE', entityType: 'Statement', entityId: req => req.params.id }), statementController.deleteStatement);

export default router;
