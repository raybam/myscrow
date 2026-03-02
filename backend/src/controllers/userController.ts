import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

export const getProfile = async (req: AuthRequest, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                phone: true,
                photo: true,
                bio: true,
                isProfileComplete: true,
                kycStatus: true,
                idNumber: true,
                balance: true,
                createdAt: true,
            },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
    try {
        const { firstName, lastName, username, phone } = req.body;
        const userId = req.userId;

        console.log('[updateProfile] Request from user:', userId);
        console.log('[updateProfile] Update data:', { firstName, lastName, username, phone });

        if (!userId) {
            return res.status(401).json({ message: 'User ID not found in request' });
        }

        // Check if username is taken if it's being updated
        if (username) {
            console.log('[updateProfile] Checking username availability:', username);
            const existingUser = await prisma.user.findFirst({
                where: {
                    username,
                    NOT: { id: userId },
                },
            });

            if (existingUser) {
                console.log('[updateProfile] Username already taken:', username);
                return res.status(400).json({ message: 'Username is already taken' });
            }
        }

        // Logic for isProfileComplete
        const isProfileComplete = !!(firstName && lastName && username && phone);
        console.log('[updateProfile] Profile complete status:', isProfileComplete);

        const { bio, photo } = req.body;

        const start = Date.now();
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                firstName,
                lastName,
                username,
                phone,
                bio,
                photo,
                pushToken: req.body.pushToken,
                isProfileComplete: isProfileComplete,
            },
        });
        const duration = Date.now() - start;
        console.log(`[updateProfile] Database update took ${duration}ms`);

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
                photo: user.photo,
                bio: (user as any).bio, // Cast to any to avoid TS error if client not generated
                isProfileComplete: user.isProfileComplete,
            },
        });
    } catch (error) {
        console.error('[updateProfile] Error:', error);
        console.error('[updateProfile] Error message:', (error as Error).message);
        console.error('[updateProfile] Error stack:', (error as Error).stack);
        res.status(500).json({ message: 'Internal server error', error: (error as Error).message });
    }
};

export const searchUser = async (req: AuthRequest, res: Response) => {
    try {
        const { query } = req.query;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({ message: 'Query parameter is required' });
        }

        const start = Date.now();
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { username: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                ],
            },
            select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                photo: true,
            },
            take: 5,
        });
        const duration = Date.now() - start;
        console.log(`[DB Profile] searchUser took ${duration}ms`);

        res.json(users);
    } catch (error) {
        console.error('Search user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const submitKYC = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        const { idNumber } = req.body;

        if (!idNumber) {
            return res.status(400).json({ message: 'ID number is required' });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                kycStatus: 'PENDING',
                idNumber: idNumber,
            },
        });

        res.json({
            message: 'KYC documents submitted for verification',
            kycStatus: user.kycStatus
        });
    } catch (error) {
        console.error('Submit KYC error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getKYCStatus = async (req: AuthRequest, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { kycStatus: true, idNumber: true }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Get KYC status error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
