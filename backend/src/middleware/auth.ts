import { Request, Response, NextFunction } from 'express';
import { clerkClient, getAuth } from '@clerk/express';
import { Role } from '@prisma/client';
import prisma from '../lib/prisma';

interface AuthenticatedUser {
    id: string;
    role: Role;
    isActive: boolean;
}

export interface AuthRequest extends Request {
    userId?: string;
    userRole?: string;
    clerkId?: string;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    console.log('[Auth Middleware] Processing request:', req.method, req.path);
    try {
        const { userId: clerkId } = getAuth(req);

        if (!clerkId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        console.log('[Auth] Processing Clerk ID:', clerkId);

        // Check if user exists in our local DB, if not, sync from Clerk
        let user: AuthenticatedUser | null = await prisma.user.findUnique({
            where: { clerkId },
            select: { id: true, role: true, isActive: true }
        });

        console.log('[Auth] Local user lookup result:', user);

        if (!user) {
            console.log('[Auth] User not in local DB, fetching details from Clerk...');
            // User exists in Clerk but not in our DB yet
            const clerkUser = await clerkClient.users.getUser(clerkId);
            const email = clerkUser.emailAddresses[0]?.emailAddress;
            console.log('[Auth] Clerk Email:', email);

            if (!email) {
                console.error('[Auth] No email found for Clerk user:', clerkId);
                return res.status(400).json({ message: 'Clerk user has no email address' });
            }

            // Try to find by email (if they were already in our system before the migration)
            user = await prisma.user.findUnique({
                where: { email },
                select: { id: true, role: true, isActive: true }
            });

            if (user) {
                console.log('[Auth] Found matching user by email, linking to Clerk ID...');
                // Link existing user to Clerk
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { clerkId },
                    select: { id: true, role: true, isActive: true }
                });
            } else {
                console.log('[Auth] Creating new local user record...');
                // Create new user record
                const newUser = await prisma.user.create({
                    data: {
                        clerkId,
                        email,
                        firstName: clerkUser.firstName,
                        lastName: clerkUser.lastName,
                        photo: clerkUser.imageUrl,
                        isEmailVerified: true, // Clerk verified them
                        password: '', // Not used anymore
                    }
                });
                console.log('[Auth] User record created:', newUser.id);
                user = { id: newUser.id, role: newUser.role, isActive: newUser.isActive };
            }
        }

        if (!user.isActive) {
            return res.status(401).json({ message: 'Account is deactivated' });
        }

        req.userId = user.id;
        req.clerkId = clerkId;
        req.userRole = user.role;
        next();
    } catch (error) {
        console.error('Clerk Auth Error:', error);
        return res.status(401).json({ message: 'Unauthorized' });
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
