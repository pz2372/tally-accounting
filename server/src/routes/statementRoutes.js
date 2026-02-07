const express = require('express');
const router = express.Router();
const statementController = require('../controllers/statementController');
const { verifyToken, requireOrg } = require('../middleware/auth');

// All routes require authentication and org context
router.use(verifyToken);
router.use(requireOrg);

// Statement management
router.post('/', statementController.uploadStatement);
router.get('/', statementController.getAllStatements);
router.get('/:id', statementController.getStatementById);
router.get('/:id/transactions', statementController.getStatementTransactions);
router.delete('/:id', statementController.deleteStatement);

module.exports = router;
