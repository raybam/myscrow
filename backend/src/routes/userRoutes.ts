import { Router } from 'express';
import { getProfile, updateProfile, searchUser, submitKYC, getKYCStatus } from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/profile', authenticate, getProfile);
router.patch('/profile', authenticate, updateProfile);
router.get('/search', authenticate, searchUser);
router.post('/kyc', authenticate, submitKYC);
router.get('/kyc/status', authenticate, getKYCStatus);

export default router;
