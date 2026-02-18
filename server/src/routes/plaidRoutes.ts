import { Router } from 'express';
import { verifyToken, requireOrg } from '../middleware/auth';
import * as plaidController from '../controllers/plaidController';

const router = Router();

router.post('/webhook', plaidController.handleWebhook); // no auth — called by Plaid
router.post('/create-link-token', verifyToken, plaidController.createLinkToken);
router.post('/exchange-token', verifyToken, requireOrg, plaidController.exchangeToken);
router.get('/accounts', verifyToken, requireOrg, plaidController.getAccounts);
router.delete('/items/:itemId', verifyToken, requireOrg, plaidController.removeItem);

export default router;
