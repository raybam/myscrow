import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

export const getSummaryStats = async (req: AuthRequest, res: Response) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(days));

        const [
            volume,
            revenue,
            activeEscrows,
            userGrowth
        ] = await Promise.all([
            // Total Platform Volume (Only SUCCESSful transactions)
            prisma.transaction.aggregate({
                where: { status: 'SUCCESS' },
                _sum: { amount: true }
            }),
            // Total Revenue (Fees from escrows - assuming 1% fee based on previous context)
            // Note: If we had a specific fee field in transactions, we'd sum that. 
            // For now, we'll sum the fee field in Escrow if it exists, or calculate 1% if not.
            prisma.escrow.aggregate({
                where: { status: 'COMPLETED' },
                _sum: { fee: true }
            }),
            // Total Active Escrows
            prisma.escrow.count({
                where: { status: { in: ['FUNDED', 'ACCEPTED', 'DISPUTED'] } }
            }),
            // Users joined in last N days
            prisma.user.count({
                where: {
                    createdAt: {
                        gte: startDate
                    }
                }
            })
        ]);

        res.json({
            totalVolume: Number(volume._sum.amount || 0),
            totalRevenue: Number(revenue._sum.fee || 0),
            activeEscrows,
            userGrowth
        });
    } catch (error) {
        console.error('Get summary stats error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getTransactionTrends = async (req: AuthRequest, res: Response) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(days));

        const trends = await prisma.transaction.groupBy({
            by: ['createdAt'],
            where: {
                status: 'SUCCESS',
                createdAt: { gte: startDate }
            },
            _sum: { amount: true },
            _count: { id: true },
            orderBy: { createdAt: 'asc' }
        });

        // Group by day manually since Prisma groupBy doesn't support date truncation easily in all dialects
        const dailyData: Record<string, { volume: number; count: number }> = {};

        trends.forEach(item => {
            const date = item.createdAt.toISOString().split('T')[0];
            if (!dailyData[date]) {
                dailyData[date] = { volume: 0, count: 0 };
            }
            dailyData[date].volume += Number(item._sum.amount || 0);
            dailyData[date].count += item._count.id;
        });

        const formattedTrends = Object.entries(dailyData).map(([date, stats]) => ({
            date,
            volume: stats.volume,
            count: stats.count
        })).sort((a, b) => a.date.localeCompare(b.date));

        res.json(formattedTrends);
    } catch (error) {
        console.error('Get transaction trends error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getEscrowHealth = async (req: AuthRequest, res: Response) => {
    try {
        const stats = await prisma.escrow.groupBy({
            by: ['status'],
            _count: { id: true }
        });

        const health = stats.reduce((acc: any, curr) => {
            acc[curr.status] = curr._count.id;
            return acc;
        }, {});

        res.json(health);
    } catch (error) {
        console.error('Get escrow health error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
