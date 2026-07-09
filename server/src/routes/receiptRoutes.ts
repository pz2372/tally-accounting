import express from 'express';
import { requireOrg, verifyToken } from '../middleware/auth';
import { extractReceiptData } from '../controllers/receiptController';
import { aiExtractionLimiter } from '../middleware/rateLimits';
import { validate } from '../middleware/validate';
import { receiptSchemas } from '../validation/schemas';

const router = express.Router();

// POST /api/receipts/extract - Extract data from receipt image using Claude Vision
router.post('/extract', verifyToken, requireOrg, aiExtractionLimiter, validate({ body: receiptSchemas.extract }), extractReceiptData);

export default router;
