import express from 'express';
import { verifyToken } from '../middleware/auth';
import { extractReceiptData } from '../controllers/receiptController';

const router = express.Router();

// POST /api/receipts/extract - Extract data from receipt image using Claude Vision
router.post('/extract', verifyToken, extractReceiptData);

export default router;
