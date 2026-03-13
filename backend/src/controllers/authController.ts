import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';

// PIN management and basic profile actions remain here.
// Clerk handles login, registration, and password recovery.

export const setPin = async (req: AuthRequest, res: Response) => {
    try {
        const { pin } = req.body;
        const userId = req.userId;

        if (!pin || pin.length !== 4 || isNaN(Number(pin))) {
            return res.status(400).json({ message: 'PIN must be a 4-digit number' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.paymentPin) {
            return res.status(400).json({ message: 'PIN is already set. Use change PIN endpoint.' });
        }

        const hashedPin = await bcrypt.hash(pin, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { paymentPin: hashedPin }
        });

        res.json({ message: 'PIN set successfully' });
    } catch (error) {
        console.error('Set PIN error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const changePin = async (req: AuthRequest, res: Response) => {
    try {
        const { oldPin, newPin } = req.body;
        const userId = req.userId;

        if (!newPin || newPin.length !== 4 || isNaN(Number(newPin))) {
            return res.status(400).json({ message: 'New PIN must be a 4-digit number' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!user.paymentPin) {
            return res.status(400).json({ message: 'PIN not set. Use set PIN endpoint.' });
        }

        const isPinValid = await bcrypt.compare(oldPin, user.paymentPin);
        if (!isPinValid) {
            return res.status(400).json({ message: 'Invalid current PIN' });
        }

        const hashedPin = await bcrypt.hash(newPin, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { paymentPin: hashedPin }
        });

        res.json({ message: 'PIN changed successfully' });
    } catch (error) {
        console.error('Change PIN error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const syncUser = async (req: AuthRequest, res: Response) => {
    try {
        // The authenticate middleware already handles the sync logic.
        // This endpoint can be used as a manual trigger or just a "ping" to ensure the user record is up-to-date.
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                isProfileComplete: true,
                role: true,
                balance: true
            }
        });

        res.json({ user });
    } catch (error) {
        console.error('Sync User error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
