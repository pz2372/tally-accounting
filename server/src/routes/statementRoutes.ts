import { Router } from 'express';
import * as statementController from '../controllers/statementController';
import { requireOrg, verifyToken } from '../middleware/auth';

const router = Router();

// All routes require authentication and org context
router.use(verifyToken);
router.use(requireOrg);

// Statement management
router.post('/', statementController.uploadStatement);
router.get('/', statementController.getAllStatements);
router.get('/unmatched', statementController.getUnmatchedTransactions);
router.get('/:id', statementController.getStatementById);
router.get('/:id/transactions', statementController.getStatementTransactions);
router.delete('/:id', statementController.deleteStatement);

export default router;
