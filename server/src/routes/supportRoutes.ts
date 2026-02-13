import { Router } from 'express';
import * as supportController from '../controllers/supportController';
import { verifyToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(verifyToken);

// POST /api/support - Create a support ticket
router.post('/', supportController.createTicket);

// GET /api/support - Get user's tickets
router.get('/', supportController.getTickets);

export default router;
