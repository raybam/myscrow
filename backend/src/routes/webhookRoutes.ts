import { Router } from 'express';
import { flutterwaveWebhook } from '../controllers/webhookController';

const router = Router();

router.post('/flutterwave', flutterwaveWebhook);

export default router;
