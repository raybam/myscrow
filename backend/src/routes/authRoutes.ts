import { Router } from 'express';
import { register, login, forgotPassword, resetPassword, sendVerificationOtp, verifyEmail, googleLogin } from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/google-login', googleLogin);

import { authenticate } from '../middleware/auth';
import { setPin, changePin } from '../controllers/authController';

router.post('/pin/set', authenticate, setPin);
router.post('/pin/change', authenticate, changePin);
router.post('/otp/send', authenticate, sendVerificationOtp);
router.post('/otp/verify', authenticate, verifyEmail);

export default router;
