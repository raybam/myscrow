import { Router } from 'express';
import { createEscrow, getEscrows, getEscrowDetails, fundEscrow, updateEscrowStatus, releaseFunds, verifyPayment, raiseDispute } from '../controllers/escrowController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, createEscrow);
router.get('/', authenticate, getEscrows);
router.get('/:id', authenticate, getEscrowDetails);
router.post('/:id/fund', authenticate, fundEscrow);
router.post('/:id/verify-payment', authenticate, verifyPayment);
router.post('/:id/dispute', authenticate, raiseDispute);
router.patch('/:id/status', authenticate, updateEscrowStatus);
router.post('/:id/release', authenticate, releaseFunds);

export default router;
