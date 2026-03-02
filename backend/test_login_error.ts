import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Checking database users...");
        const users = await prisma.user.findMany({ take: 1 });
        if (users.length === 0) {
            console.log("No users in db.");
            return;
        }

        const user = users[0];
        console.log("Found user:", user.email);

        const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        console.log("Token generated successfully.");

        console.log("Returned User Data:");
        console.log({
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            isProfileComplete: user.isProfileComplete,
            role: user.role,
        });

    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
