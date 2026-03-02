import express from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
    getAllUsers,
    getUserDetails,
    updateUserRole,
    updateUserStatus,
    verifyKYC,
    getDashboardStats,
    getCommissionSettings,
    updateCommissionSettings
} from '../controllers/adminController';
import {
    getAllDisputes,
    getDisputeDetails,
    settleDispute
} from '../controllers/disputeController';

import {
    getSummaryStats,
    getTransactionTrends,
    getEscrowHealth
} from '../controllers/analyticsController';

const router = express.Router();

router.use(authenticate);

// User Management (strictly ADMIN)
router.get('/users', requireRole(['ADMIN']), getAllUsers);
router.get('/users/:id', requireRole(['ADMIN']), getUserDetails);
router.patch('/users/:id/role', requireRole(['ADMIN']), updateUserRole);
router.patch('/users/:id/status', requireRole(['ADMIN']), updateUserStatus);
router.patch('/users/:id/kyc', requireRole(['ADMIN']), verifyKYC);

// Dashboard & Stats (ADMIN and SUPPORT)
router.get('/dashboard', requireRole(['ADMIN', 'SUPPORT']), getDashboardStats);

// Dispute Management (ADMIN and SUPPORT)
router.get('/disputes', requireRole(['ADMIN', 'SUPPORT']), getAllDisputes);
router.get('/disputes/:id', requireRole(['ADMIN', 'SUPPORT']), getDisputeDetails);
router.post('/disputes/:id/resolve', requireRole(['ADMIN']), settleDispute);

// Platform Analytics (strictly ADMIN)
router.get('/analytics/summary', requireRole(['ADMIN']), getSummaryStats);
router.get('/analytics/trends', requireRole(['ADMIN']), getTransactionTrends);
router.get('/analytics/health', requireRole(['ADMIN']), getEscrowHealth);

// Commission Settings (strictly ADMIN)
router.get('/settings/commission', requireRole(['ADMIN']), getCommissionSettings);
router.patch('/settings/commission', requireRole(['ADMIN']), updateCommissionSettings);

export default router;
