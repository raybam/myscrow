import cron from 'node-cron';
import prisma from '../lib/prisma';
import { createNotification } from '../utils/notification';

// Run every hour
export const startCronJobs = () => {
    console.log('[Cron] Initializing cron jobs...');

    cron.schedule('0 * * * *', async () => {
        console.log('[Cron] Running escrow reminder checks...');
        try {
            await Promise.all([
                checkPaymentReminders(),
                checkTaskReminders(),
                checkDeadlineReminders()
            ]);
        } catch (error) {
            console.error('[Cron] Error in reminder checks:', error);
        }
    });
};

/**
 * Remind buyers to fund escrows that are PENDING or ACCEPTED
 */
async function checkPaymentReminders() {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Find escrows created more than 24h ago, still PENDING or ACCEPTED,
    // and haven't been reminded in the last 48h (or ever)
    const pendingEscrows = await prisma.escrow.findMany({
        where: {
            status: { in: ['PENDING', 'ACCEPTED'] },
            createdAt: { lte: twentyFourHoursAgo },
            OR: [
                { lastPaymentReminderAt: null },
                { lastPaymentReminderAt: { lte: fortyEightHoursAgo } }
            ]
        },
        include: { buyer: true }
    });

    for (const escrow of pendingEscrows) {
        await createNotification(
            escrow.buyerId,
            'Payment Reminder',
            `Your escrow "${escrow.title}" is waiting to be funded. Please make payment to start the service.`,
            'INFO'
        );

        await prisma.escrow.update({
            where: { id: escrow.id },
            data: { lastPaymentReminderAt: now }
        });
    }

    if (pendingEscrows.length > 0) {
        console.log(`[Cron] Sent ${pendingEscrows.length} payment reminders.`);
    }
}

/**
 * Remind sellers to complete tasks for FUNDED escrows
 */
async function checkTaskReminders() {
    const now = new Date();
    const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    // For simplicity, we remind every 72 hours for funded escrows that are not completed
    const activeEscrows = await prisma.escrow.findMany({
        where: {
            status: 'FUNDED',
            OR: [
                { lastTaskReminderAt: null },
                { lastTaskReminderAt: { lte: seventyTwoHoursAgo } }
            ]
        },
        include: { seller: true }
    });

    for (const escrow of activeEscrows) {
        let message = `Friendly reminder to keep working on "${escrow.title}".`;
        if (escrow.deadline) {
            const daysLeft = Math.ceil((escrow.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (daysLeft > 0) {
                message += ` You have ${daysLeft} days remaining until the deadline.`;
            } else {
                message += ` The deadline has passed. Please complete the task as soon as possible.`;
            }
        }

        await createNotification(
            escrow.sellerId,
            'Task Progress Reminder',
            message,
            'INFO'
        );

        await prisma.escrow.update({
            where: { id: escrow.id },
            data: { lastTaskReminderAt: now }
        });
    }

    if (activeEscrows.length > 0) {
        console.log(`[Cron] Sent ${activeEscrows.length} general task reminders.`);
    }
}

/**
 * Granular deadline warnings when specified
 */
async function checkDeadlineReminders() {
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Specifically check for the 24h milestone if not already notified
    const imminentDeadlines = await prisma.escrow.findMany({
        where: {
            status: 'FUNDED',
            deadline: {
                lte: twentyFourHoursFromNow,
                gte: now
            },
            deadlineNotified24h: false
        }
    });

    for (const escrow of imminentDeadlines) {
        // Notify both parties
        await createNotification(
            escrow.buyerId,
            'Deadline Approaching',
            `Escrow "${escrow.title}" deadline is in less than 24 hours.`,
            'WARNING'
        );
        await createNotification(
            escrow.sellerId,
            'Deadline Approaching',
            `Escrow "${escrow.title}" deadline is in less than 24 hours. Please ensure the task is completed.`,
            'WARNING'
        );

        await prisma.escrow.update({
            where: { id: escrow.id },
            data: { deadlineNotified24h: true }
        });
    }

    if (imminentDeadlines.length > 0) {
        console.log(`[Cron] Sent ${imminentDeadlines.length} high-priority deadline alerts.`);
    }
}
