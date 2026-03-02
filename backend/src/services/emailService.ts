import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
    try {
        if (!process.env.SMTP_USER) {
            console.log('[Email] SMTP_USER not set, skipping email.');
            return;
        }

        await transporter.sendMail({
            from: `"Myescrow" <${process.env.SMTP_USER}>`,
            to,
            subject,
            text,
            html: html || text,
        });
        console.log(`[Email] Sent to ${to}: ${subject}`);
    } catch (error) {
        console.error('[Email] Error sending email:', error);
    }
};
