const express = require('express');
const router = express.Router();
const { verifyToken, requireOrg } = require('../middleware/auth');
const organizationController = require('../controllers/organizationController');

// Create organization (no org context needed)
router.post('/', verifyToken, organizationController.createOrganization);

// All other routes require organization context
router.get('/', verifyToken, requireOrg, organizationController.getOrganization);
router.put('/', verifyToken, requireOrg, organizationController.updateOrganization);

// Member management
router.get('/members', verifyToken, requireOrg, organizationController.getMembers);
router.post('/invite', verifyToken, requireOrg, organizationController.inviteUser);
router.put('/members/:memberId', verifyToken, requireOrg, organizationController.updateMember);
router.delete('/members/:memberId', verifyToken, requireOrg, organizationController.removeMember);

module.exports = router;
