import prisma from '../lib/prisma';
import { Expo } from 'expo-server-sdk';
import { sendEmail } from '../services/emailService';

const expo = new Expo();

export const createNotification = async (
    userId: string,
    title: string,
    message: string,
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' = 'INFO'
) => {
    try {
        await prisma.notification.create({
            data: {
                userId,
                title,
                message,
            }
        });
        console.log(`[Notification] Created for user ${userId}: ${title}`);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, pushToken: true }
        });

        if (!user) return;

        // Send Email
        await sendEmail(user.email, title, message);

        // Send Push Notification
        if (user.pushToken && Expo.isExpoPushToken(user.pushToken)) {
            await expo.sendPushNotificationsAsync([{
                to: user.pushToken,
                sound: 'default',
                title,
                body: message,
                data: { type },
            }]);
            console.log(`[Notification] Push sent to user ${userId}`);
        }

    } catch (error) {
        console.error('[Notification] Error creating/sending notification:', error);
    }
};
