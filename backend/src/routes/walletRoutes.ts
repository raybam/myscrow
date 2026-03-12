import { Router } from 'express';
import { getBalance, withdrawFunds, getBanks, resolveBankDetails } from '../controllers/walletController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/balance', authenticate, getBalance);
router.get('/banks', authenticate, getBanks);
router.post('/resolve-account', authenticate, resolveBankDetails);
router.post('/withdraw', authenticate, withdrawFunds);

export default router;
