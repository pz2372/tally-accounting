import { Router } from 'express';
import * as healthController from '../controllers/healthController';

const router = Router();

// GET /api/health - Health check
router.get('/health', healthController.healthCheck);

// GET / - Server info
router.get('/', healthController.getInfo);

export default router;
