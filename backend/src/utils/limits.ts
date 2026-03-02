import { KycStatus } from '@prisma/client';
import prisma from '../lib/prisma';

interface Limits {
    single: number;
    daily: number;
}

const LIMIT_MAP: Record<KycStatus, Limits> = {
    NONE: { single: 50000, daily: 100000 },
    PENDING: { single: 50000, daily: 100000 },
    VERIFIED: { single: 5000000, daily: 10000000 },
    REJECTED: { single: 50000, daily: 100000 },
};

export const checkLimits = async (userId: string, amount: number, type: 'ESCROW' | 'WITHDRAWAL') => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { kycStatus: true }
    });

    if (!user) throw new Error('User not found');

    const status = user.kycStatus as KycStatus;
    const limits = LIMIT_MAP[status] || LIMIT_MAP.NONE;

    // 1. Check single transaction limit
    if (amount > limits.single) {
        return {
            allowed: false,
            message: `Transaction exceeds your single limit of ₦${limits.single.toLocaleString()}. Please upgrade your KYC to increase limits.`,
            limit: limits.single
        };
    }

    // 2. Check daily cumulative limit
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    let todayTotal = 0;

    if (type === 'ESCROW') {
        const todayEscrows = await prisma.escrow.aggregate({
            where: {
                buyerId: userId,
                createdAt: { gte: startOfDay }
            },
            _sum: { amount: true }
        });
        todayTotal = Number(todayEscrows._sum.amount || 0);
    } else {
        const todayWithdrawals = await prisma.transaction.aggregate({
            where: {
                userId,
                type: 'WITHDRAWAL',
                createdAt: { gte: startOfDay }
            },
            _sum: { amount: true }
        });
        todayTotal = Number(todayWithdrawals._sum.amount || 0);
    }

    if (todayTotal + amount > limits.daily) {
        return {
            allowed: false,
            message: `Transaction exceeds your daily limit of ₦${limits.daily.toLocaleString()}. You have already used ₦${todayTotal.toLocaleString()} today.`,
            limit: limits.daily
        };
    }

    return { allowed: true };
};
