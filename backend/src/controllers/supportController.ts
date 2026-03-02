import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

// Create a new support ticket
export const createTicket = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { subject, message, category, priority } = req.body;

        if (!subject || !message || !category) {
            return res.status(400).json({ message: 'Subject, message, and category are required' });
        }

        const ticket = await prisma.supportTicket.create({
            data: {
                userId,
                subject,
                message,
                category,
                priority: priority || 'MEDIUM',
                status: 'OPEN'
            }
        });

        // TODO: Send email confirmation to user
        // TODO: Notify support team

        res.status(201).json({
            message: 'Support ticket created successfully',
            ticket
        });
    } catch (error) {
        console.error('Create ticket error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get user's tickets
export const getMyTickets = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;

        const tickets = await prisma.supportTicket.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        res.json(tickets);
    } catch (error) {
        console.error('Get my tickets error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get single ticket details
export const getTicketDetails = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { id } = req.params;

        const ticket = await prisma.supportTicket.findUnique({
            where: { id: id as string }
        });

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // Ensure user owns the ticket or is support/admin
        if (ticket.userId !== userId && req.userRole !== 'ADMIN' && req.userRole !== 'SUPPORT') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        res.json(ticket);
    } catch (error) {
        console.error('Get ticket details error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// --- Admin/Support Actions ---

// Get all tickets (for support/admin)
export const getAllTickets = async (req: AuthRequest, res: Response) => {
    try {
        const { status, category, priority, page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {};

        // Validate and apply filters
        if (status && ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status as string)) {
            where.status = status;
        }
        if (category && ['ACCOUNT', 'TRANSACTION', 'DISPUTE', 'TECHNICAL', 'OTHER'].includes(category as string)) {
            where.category = category;
        }
        if (priority && ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority as string)) {
            where.priority = priority;
        }

        const [tickets, total] = await Promise.all([
            prisma.supportTicket.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            photo: true
                        }
                    }
                },
                skip,
                take: Number(limit),
                orderBy: { createdAt: 'desc' }
            }),
            prisma.supportTicket.count({ where })
        ]);

        res.json({
            tickets,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error('Get all tickets error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Reply to ticket (for support/admin)
export const replyToTicket = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { reply, status } = req.body;

        // Ensure ticket exists
        const existingTicket = await prisma.supportTicket.findUnique({ where: { id: id as string } });
        if (!existingTicket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // Must provide either a reply or a status update
        if (!reply && !status) {
            return res.status(400).json({ message: 'Reply message or status update is required' });
        }

        const updatedData: any = {
            updatedAt: new Date()
        };

        if (reply) updatedData.adminReply = reply;
        if (status) updatedData.status = status;
        else updatedData.status = 'RESOLVED'; // Default to RESOLVED if reply provided but no status

        const ticket = await prisma.supportTicket.update({
            where: { id: id as string },
            data: updatedData
        });

        // TODO: Notify user of reply/status change

        res.json({ message: 'Ticket updated successfully', ticket });
    } catch (error) {
        console.error('Reply to ticket error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
