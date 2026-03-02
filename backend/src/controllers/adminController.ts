import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

// Get all users with pagination and filtering
export const getAllUsers = async (req: AuthRequest, res: Response) => {
    try {
        const { page = 1, limit = 10, search, role, kycStatus } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {};

        if (search) {
            where.OR = [
                { email: { contains: String(search), mode: 'insensitive' } },
                { username: { contains: String(search), mode: 'insensitive' } },
                { firstName: { contains: String(search), mode: 'insensitive' } },
                { lastName: { contains: String(search), mode: 'insensitive' } },
            ];
        }

        if (role) where.role = role;
        if (kycStatus) where.kycStatus = kycStatus;

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    kycStatus: true,
                    isActive: true,
                    isProfileComplete: true,
                    createdAt: true,
                },
                skip,
                take: Number(limit),
                orderBy: { createdAt: 'desc' },
            }),
            prisma.user.count({ where }),
        ]);

        res.json({
            users,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get user details
export const getUserDetails = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        escrowsAsBuyer: true,
                        escrowsAsSeller: true,
                        transactions: true,
                        supportTickets: true,
                    }
                },
                transactions: { take: 10, orderBy: { createdAt: 'desc' } },
                escrowsAsBuyer: { take: 5, orderBy: { createdAt: 'desc' }, include: { seller: { select: { username: true } } } },
                escrowsAsSeller: { take: 5, orderBy: { createdAt: 'desc' }, include: { buyer: { select: { username: true } } } },
            },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Calculate some aggregate stats
        const totalVolume = await prisma.transaction.aggregate({
            where: { userId: id, status: 'SUCCESS' },
            _sum: { amount: true }
        });

        res.json({
            ...user,
            stats: {
                totalVolume: totalVolume._sum.amount || 0,
            }
        });
    } catch (error) {
        console.error('Get user details error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update User Status (Suspend/Activate)
export const updateUserStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({ message: 'isActive must be a boolean' });
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { isActive },
            select: { id: true, email: true, username: true, isActive: true }
        });

        res.json({
            message: `User ${isActive ? 'activated' : 'suspended'} successfully`,
            user: updatedUser
        });
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Verify/Reject KYC
export const verifyKYC = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !['VERIFIED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ message: 'Invalid KYC status. Use VERIFIED or REJECTED.' });
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { kycStatus: status },
            select: { id: true, email: true, username: true, kycStatus: true }
        });

        res.json({
            message: `KYC status updated to ${status}`,
            user: updatedUser
        });
    } catch (error) {
        console.error('Verify KYC error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update User Role (e.g., Ban, Promote)
export const updateUserRole = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!role || !['USER', 'ADMIN', 'SUPPORT', 'BANNED'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        // Prevent self-demotion/banning if it's the only admin? 
        // For simplicity, just update.

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { role },
            select: { id: true, email: true, role: true }
        });

        res.json({ message: 'User role updated successfully', user: updatedUser });
    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Dashboard Stats
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
    try {
        const [
            totalUsers,
            pendingKyc,
            activeEscrows,
            disputedEscrows,
            openTickets
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { kycStatus: 'PENDING' } }),
            prisma.escrow.count({ where: { status: { in: ['FUNDED', 'ACCEPTED'] } } }),
            prisma.escrow.count({ where: { status: 'DISPUTED' } }),
            prisma.supportTicket.count({ where: { status: 'OPEN' } }),
        ]);

        res.json({
            totalUsers,
            pendingKyc,
            activeEscrows,
            disputedEscrows,
            openTickets
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// --- Commission Settings ---

// Get current commission settings
export const getCommissionSettings = async (req: AuthRequest, res: Response) => {
    try {
        const configs = await prisma.systemConfig.findMany({
            where: { key: { in: ['COMMISSION_TYPE', 'COMMISSION_VALUE'] } }
        });

        const settings = {
            type: configs.find(c => c.key === 'COMMISSION_TYPE')?.value ?? 'percentage',
            value: Number(configs.find(c => c.key === 'COMMISSION_VALUE')?.value ?? 5),
        };

        res.json(settings);
    } catch (error) {
        console.error('Get commission settings error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update commission settings
export const updateCommissionSettings = async (req: AuthRequest, res: Response) => {
    try {
        const { type, value } = req.body;

        if (!type || !['percentage', 'flat'].includes(type)) {
            return res.status(400).json({ message: "type must be 'percentage' or 'flat'" });
        }

        const numValue = Number(value);
        if (isNaN(numValue) || numValue < 0) {
            return res.status(400).json({ message: 'value must be a non-negative number' });
        }

        if (type === 'percentage' && numValue > 100) {
            return res.status(400).json({ message: 'Percentage cannot exceed 100' });
        }

        await Promise.all([
            prisma.systemConfig.upsert({
                where: { key: 'COMMISSION_TYPE' },
                update: { value: type },
                create: { key: 'COMMISSION_TYPE', value: type },
            }),
            prisma.systemConfig.upsert({
                where: { key: 'COMMISSION_VALUE' },
                update: { value: String(numValue) },
                create: { key: 'COMMISSION_VALUE', value: String(numValue) },
            }),
        ]);

        res.json({ message: 'Commission settings updated successfully', type, value: numValue });
    } catch (error) {
        console.error('Update commission settings error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
