import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import escrowRoutes from './routes/escrowRoutes';
import webhookRoutes from './routes/webhookRoutes';
import walletRoutes from './routes/walletRoutes';
import notificationRoutes from './routes/notificationRoutes';
import supportRoutes from './routes/supportRoutes';
import adminRoutes from './routes/adminRoutes';

import { clerkMiddleware } from '@clerk/express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(clerkMiddleware());
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/escrows', escrowRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/wallet', walletRoutes);
app.use('/notifications', notificationRoutes);
app.use('/support', supportRoutes);
app.use('/admin', adminRoutes);

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'Myescrow Backend is running' });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
    console.error('[Global Error]', err);
    if (err.stack) console.error(err.stack);
    res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

import { startCronJobs } from './services/cronService';

// Start Cron Jobs
startCronJobs();

app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[server]: Myescrow Backend is running at http://0.0.0.0:${PORT}`);
});
