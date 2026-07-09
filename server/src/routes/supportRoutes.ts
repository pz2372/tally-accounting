import { Router } from 'express';
import * as supportController from '../controllers/supportController';
import { verifyToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { supportSchemas } from '../validation/schemas';

const router = Router();

// All routes require authentication
router.use(verifyToken);

// POST /api/support - Create a support ticket
router.post('/', validate({ body: supportSchemas.create }), supportController.createTicket);

// GET /api/support - Get user's tickets
router.get('/', supportController.getTickets);

export default router;
