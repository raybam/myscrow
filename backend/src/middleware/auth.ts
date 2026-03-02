import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export interface AuthRequest extends Request {
    userId?: string;
    userRole?: string;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];

    let decoded: { userId: string };
    try {
        decoded = jwt.verify(token!, JWT_SECRET) as { userId: string };
        req.userId = decoded.userId;
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }

    try {
        // Fetch user role for RBAC
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { role: true, isActive: true }
        });

        if (!user) {
            return res.status(401).json({ message: 'User no longer exists' });
        }

        if (!user.isActive) {
            return res.status(401).json({ message: 'Account is deactivated' });
        }

        req.userRole = user.role;
        next();
    } catch (error) {
        console.error('Auth Database Error:', error);
        return res.status(500).json({ message: 'Database connection error during authentication' });
    }
};

export const requireRole = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.userRole || !roles.includes(req.userRole)) {
            return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};
