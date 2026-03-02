import express from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
    createTicket,
    getMyTickets,
    getTicketDetails,
    getAllTickets,
    replyToTicket
} from '../controllers/supportController';

const router = express.Router();

// User Routes
router.post('/', authenticate, createTicket);
router.get('/my', authenticate, getMyTickets);
router.get('/:id', authenticate, getTicketDetails);

// Admin/Support Routes
router.get('/admin/all', authenticate, requireRole(['ADMIN', 'SUPPORT']), getAllTickets);
router.patch('/admin/:id/reply', authenticate, requireRole(['ADMIN', 'SUPPORT']), replyToTicket);

export default router;
