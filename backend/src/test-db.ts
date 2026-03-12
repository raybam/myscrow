import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
    try {
        console.log('Testing database connection...');
        await prisma.$connect();
        console.log('Successfully connected to the database.');
        const userCount = await prisma.user.count();
        console.log('User count:', userCount);
    } catch (error: any) {
        console.error('Database connection failed!');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
