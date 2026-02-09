import { Router } from 'express';
import * as receiptController from '../controllers/receiptController';
import { requireOrg, verifyToken } from '../middleware/auth';

const router = Router();

// All receipt routes require authentication and organization context
router.use(verifyToken);
router.use(requireOrg);

// Receipt CRUD
router.post('/', receiptController.uploadReceipt);
router.get('/', receiptController.getAllReceipts);
router.get('/:id', receiptController.getReceiptById);
router.put('/:id', receiptController.updateReceipt);
router.delete('/:id', receiptController.deleteReceipt);

// Convert receipt to expense
router.post('/:id/convert', receiptController.convertToExpense);

export default router;
