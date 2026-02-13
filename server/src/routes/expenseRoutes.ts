import { Router } from 'express';
import * as expenseController from '../controllers/expenseController';
import { requireOrg, verifyToken } from '../middleware/auth';
import { uploadSingle } from '../middleware/upload';

const router = Router();

// All routes require authentication and organization context
router.use(verifyToken);
router.use(requireOrg);

// GET /api/expenses - Get all expenses with filters
router.get('/', expenseController.getAllExpenses);

// GET /api/expenses/:id - Get expense by ID
router.get('/:id', expenseController.getExpenseById);

// POST /api/expenses - Create new expense
router.post('/', expenseController.createExpense);

// POST /api/expenses/with-receipt - Create expense with receipt image (combined flow)
router.post('/with-receipt', uploadSingle, expenseController.createExpenseWithReceipt);

// PUT /api/expenses/:id - Update expense
router.put('/:id', expenseController.updateExpense);

// DELETE /api/expenses/:id - Delete expense
router.delete('/:id', expenseController.deleteExpense);

export default router;
