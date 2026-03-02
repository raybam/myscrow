
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

export const getNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const unreadOnly = req.query.unreadOnly as string | undefined;

        const whereFolder: any = { userId };
        if (unreadOnly === 'true') {
            whereFolder.isRead = false;
        }

        const notifications = await prisma.notification.findMany({
            where: whereFolder,
            orderBy: { createdAt: 'desc' },
            take: 50 // Limit to last 50
        });

        res.json(notifications);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { id } = req.params;

        // If id is 'all', mark all as read
        if (id === 'all') {
            await prisma.notification.updateMany({
                where: { userId, isRead: false },
                data: { isRead: true }
            });
            return res.json({ message: 'All notifications marked as read' });
        }

        const notification = await prisma.notification.findUnique({
            where: { id }
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        if (notification.userId !== userId) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const updated = await prisma.notification.update({
            where: { id },
            data: { isRead: true }
        });

        res.json(updated);
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
