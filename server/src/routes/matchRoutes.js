const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const { verifyToken, requireOrg } = require('../middleware/auth');

// All routes require authentication and org context
router.use(verifyToken);
router.use(requireOrg);

// Matching operations
router.post('/run/:statementId', matchController.runMatching);
router.get('/', matchController.getAllMatches);
router.post('/:id/approve', matchController.approveMatch);
router.post('/:id/reject', matchController.rejectMatch);
router.delete('/:id', matchController.deleteMatch);

module.exports = router;
