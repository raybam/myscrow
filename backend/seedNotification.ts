
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const seed = async () => {
    const escrowId = '2b8ca0e6-ee6c-4457-8409-759c41e5de83';

    try {
        const escrow = await prisma.escrow.findUnique({
            where: { id: escrowId },
            include: { buyer: true }
        });

        if (!escrow) {
            console.log('Escrow not found');
            return;
        }

        console.log(`Found escrow. Buyer: ${escrow.buyer.email} (${escrow.buyerId})`);

        await prisma.notification.create({
            data: {
                userId: escrow.buyerId,
                title: 'System Test Notification',
                message: 'This is a real notification from the new system. The generic hardcoded ones are gone.',
                isRead: false
            }
        });

        console.log('Created test notification for Buyer.');

        // Verify count
        const count = await prisma.notification.count({ where: { userId: escrow.buyerId } });
        console.log(`Buyer now has ${count} notifications.`);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
};

seed();
