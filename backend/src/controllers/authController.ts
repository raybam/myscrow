import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { sendEmail } from '../services/emailService';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                isProfileComplete: false,
                isEmailVerified: false,
                otpCode: otp,
                otpExpiresAt: expires
            },
        });

        await sendEmail(
            email,
            'Welcome to Myescrow - Verify Your Email',
            `Your verification code is: ${otp}`,
            `<h1>Welcome to Myescrow</h1><p>Thank you for signing up! Your verification code is: <strong>${otp}</strong></p>`
        );

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            message: 'User registered successfully. Please verify your email.',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                isProfileComplete: user.isProfileComplete,
                role: user.role,
                isEmailVerified: (user as any).isEmailVerified,
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
                isEmailVerified: (user as any).isEmailVerified,
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

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.json({ message: 'If an account exists with this email, a reset code has been sent.' });
        }

        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: otp,
                resetPasswordExpires: expires
            }
        });

        await sendEmail(
            email,
            'Password Reset Code',
            `Your password reset code is: ${otp}. It expires in 15 minutes.`,
            `<h1>Password Reset</h1><p>Your password reset code is: <strong>${otp}</strong></p><p>It expires in 15 minutes.</p>`
        );

        res.json({ message: 'Reset code sent to your email' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { email, code, newPassword } = req.body;
        if (!email || !code || !newPassword) {
            return res.status(400).json({ message: 'Email, code, and new password are required' });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.resetPasswordToken !== code || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired reset code' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null
            }
        });

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const sendVerificationOtp = async (req: AuthRequest, res: Response) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await prisma.user.update({
            where: { id: user.id },
            data: {
                otpCode: otp,
                otpExpiresAt: expires
            }
        });

        await sendEmail(
            user.email,
            'Myescrow Verification Code',
            `Your verification code is: ${otp}`,
            `<h1>Verification</h1><p>Your verification code is: <strong>${otp}</strong></p>`
        );

        res.json({ message: 'Verification code sent' });
    } catch (error) {
        console.error('Send verification error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const verifyEmail = async (req: AuthRequest, res: Response) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ message: 'Verification code is required' });

        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!user || user.otpCode !== code || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired verification code' });
        }

        await prisma.user.update({
            where: { id: req.userId },
            data: {
                isEmailVerified: true,
                otpCode: null,
                otpExpiresAt: null
            }
        });

        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const googleLogin = async (req: Request, res: Response) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ message: 'Token is required' });

        let email, given_name, family_name, picture;

        if (token === 'mock-google-token' && process.env.NODE_ENV !== 'production') {
            email = 'google-test@example.com';
            given_name = 'Test';
            family_name = 'Google User';
            picture = 'https://ui-avatars.com/api/?name=Test+Google+User';
        } else {
            const ticket = await googleClient.verifyIdToken({
                idToken: token,
                audience: process.env.GOOGLE_CLIENT_ID,
            });

            const payload = ticket.getPayload();
            if (!payload || !payload.email) {
                return res.status(400).json({ message: 'Invalid google token' });
            }

            email = payload.email;
            given_name = payload.given_name;
            family_name = payload.family_name;
            picture = payload.picture;
        }

        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            const hashedPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
            user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    firstName: given_name,
                    lastName: family_name,
                    photo: picture,
                    isEmailVerified: true,
                    isProfileComplete: false,
                }
            });
        }

        const jwtToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

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
                isEmailVerified: user.isEmailVerified,
            },
            token: jwtToken,
        });
    } catch (error: any) {
        console.error('Google login error:', error);
        res.status(400).json({ message: 'Google login failed', error: error.message });
    }
};
