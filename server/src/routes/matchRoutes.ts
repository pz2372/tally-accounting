import { Router } from 'express';
import * as matchController from '../controllers/matchController';
import { requireOrg, verifyToken } from '../middleware/auth';

const router = Router();

// All routes require authentication and org context
router.use(verifyToken);
router.use(requireOrg);

// Matching operations
router.post('/run/:statementId', matchController.runMatching);
router.get('/', matchController.getAllMatches);
router.post('/:id/approve', matchController.approveMatch);
router.post('/:id/reject', matchController.rejectMatch);
router.delete('/:id', matchController.deleteMatch);

export default router;
