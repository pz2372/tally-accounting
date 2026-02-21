import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { extractReceiptData } from '../controllers/receiptController';

const router = express.Router();

// POST /api/receipts/extract - Extract data from receipt image using Claude Vision
router.post('/extract', authenticateToken, extractReceiptData);

export default router;
