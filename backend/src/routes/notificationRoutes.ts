
import { Router } from 'express';
import { getNotifications, markAsRead } from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getNotifications);
router.patch('/:id/read', authenticate, markAsRead);

export default router;
