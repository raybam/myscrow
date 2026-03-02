import { Router } from 'express';
import { register, login } from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.post('/login', login);

import { authenticate } from '../middleware/auth';
import { setPin, changePin } from '../controllers/authController';

router.post('/pin/set', authenticate, setPin);
router.post('/pin/change', authenticate, changePin);

export default router;
