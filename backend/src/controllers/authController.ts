import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, firstName, lastName } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                isProfileComplete: true, // User is considered to have completed initial setup during signup
            },
        });

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                isProfileComplete: user.isProfileComplete,
                role: user.role,
            },
            token,
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                isProfileComplete: user.isProfileComplete,
                role: user.role,
            },
            token,
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

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
