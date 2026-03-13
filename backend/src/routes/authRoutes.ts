import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { setPin, changePin, syncUser } from '../controllers/authController';

const router = Router();

// Used to sync Clerk user with local database profile
router.get('/sync', authenticate, syncUser);

// PIN Management (requires authentication via Clerk token)
router.post('/pin/set', authenticate, setPin);
router.post('/pin/change', authenticate, changePin);

export default router;
