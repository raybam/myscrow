import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'raymondbamidele94@gmail.com';
    const password = 'Admin@123';
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = await prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword,
                role: 'ADMIN' // Ensure role is still ADMIN
            },
        });

        console.log(`Successfully reset password for ${user.email} to: ${password}`);
    } catch (error) {
        console.error(`Error resetting password: ${error}`);
    } finally {
        await prisma.$disconnect();
    }
}

main();
