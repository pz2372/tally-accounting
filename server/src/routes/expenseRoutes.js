const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { verifyToken, requireOrg } = require('../middleware/auth');

// All routes require authentication and organization context
router.use(verifyToken);
router.use(requireOrg);

// GET /api/expenses - Get all expenses with filters
router.get('/', expenseController.getAllExpenses);

// GET /api/expenses/:id - Get expense by ID
router.get('/:id', expenseController.getExpenseById);

// POST /api/expenses - Create new expense
router.post('/', expenseController.createExpense);

// PUT /api/expenses/:id - Update expense
router.put('/:id', expenseController.updateExpense);

// DELETE /api/expenses/:id - Delete expense
router.delete('/:id', expenseController.deleteExpense);

module.exports = router;
