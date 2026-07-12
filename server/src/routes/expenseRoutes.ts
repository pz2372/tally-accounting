import { Router } from 'express';
import * as expenseController from '../controllers/expenseController';
import { requireOrg, verifyToken } from '../middleware/auth';
import { uploadSingle } from '../middleware/upload';
import { auditAction } from '../middleware/auditAction';
import { exportLimiter, uploadLimiter } from '../middleware/rateLimits';
import { validate } from '../middleware/validate';
import { expenseSchemas, idParam } from '../validation/schemas';

const router = Router();

// All routes require authentication and organization context
router.use(verifyToken);
router.use(requireOrg);

// GET /api/expenses - Get all expenses with filters
router.get('/', validate({ query: expenseSchemas.filters }), expenseController.getAllExpenses);

// GET /api/expenses/export/receipt-images - Export receipt image links and descriptions
router.get('/export/receipt-images', exportLimiter, validate({ query: expenseSchemas.filters }), auditAction({ action: 'EXPORT', entityType: 'ExpenseReceiptImages' }), expenseController.exportReceiptImages);

// GET /api/expenses/:id/image - Get expense receipt image (proxy)
router.get('/:id/image', validate({ params: idParam }), expenseController.getExpenseImage);

// GET /api/expenses/:id - Get expense by ID
router.get('/:id', validate({ params: idParam }), expenseController.getExpenseById);

// POST /api/expenses - Create new expense
router.post('/', validate({ body: expenseSchemas.create }), expenseController.createExpense);

// POST /api/expenses/with-receipt - Create expense with receipt image (combined flow)
router.post('/with-receipt', uploadLimiter, uploadSingle, validate({ body: expenseSchemas.withReceipt }), expenseController.createExpenseWithReceipt);

// PUT /api/expenses/:id/dismiss-receipt - Dismiss missing receipt (admin only)
router.put('/:id/dismiss-receipt', validate({ params: idParam }), auditAction({ action: 'ADMIN_UPDATE', entityType: 'Expense', entityId: req => req.params.id }), expenseController.dismissMissingReceipt);

// PUT /api/expenses/:id - Update expense
router.put('/:id', validate({ params: idParam, body: expenseSchemas.update }), expenseController.updateExpense);

// DELETE /api/expenses/:id - Delete expense
router.delete('/:id', validate({ params: idParam }), auditAction({ action: 'DELETE', entityType: 'Expense', entityId: req => req.params.id }), expenseController.deleteExpense);

export default router;
