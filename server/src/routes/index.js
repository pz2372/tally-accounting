const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

// GET /api/health - Health check
router.get('/health', healthController.healthCheck);

// GET / - Server info
router.get('/', healthController.getInfo);

module.exports = router;
