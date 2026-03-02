import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import * as flutterwave from '../services/flutterwave';

export const getBalance = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        console.log(`[Wallet] Fetching balance for user: ${userId}`);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { balance: true }
        });

        if (!user) {
            console.log(`[Wallet] User ${userId} not found`);
            return res.status(404).json({ message: 'User not found' });
        }

        console.log(`[Wallet] Available balance (Decimal):`, user.balance);

        // Calculate pending balance (funds currently in FUNDED escrows for this seller)
        // We separate them to be safe and clear
        const [escrowsAsSeller, escrowsAsBuyer] = await Promise.all([
            prisma.escrow.findMany({
                where: { sellerId: userId, status: { in: ['FUNDED', 'COMPLETED'] } },
                select: { amount: true }
            }),
            prisma.escrow.findMany({
                where: { buyerId: userId, status: { in: ['FUNDED', 'COMPLETED'] } },
                select: { amount: true }
            })
        ]);

        const pendingEscrows = [...escrowsAsSeller, ...escrowsAsBuyer];

        console.log(`[Wallet] Found ${pendingEscrows.length} pending escrows`);

        let pendingBalance = 0;
        try {
            pendingBalance = pendingEscrows.reduce((sum, e) => {
                const amountNum = Number(e.amount);
                if (isNaN(amountNum)) {
                    console.warn(`[Wallet] Found NaN amount for escrow:`, e.amount);
                    return sum;
                }
                return sum + amountNum;
            }, 0);
        } catch (reduceError) {
            console.error('[Wallet] Error calculating pending balance:', reduceError);
        }

        console.log(`[Wallet] Total pending balance calculated: ${pendingBalance}`);

        // Calculate earnings and spendings from successful transactions
        const [earnings, spendings] = await Promise.all([
            prisma.transaction.aggregate({
                where: { userId, type: 'DEPOSIT', status: 'SUCCESS' },
                _sum: { amount: true }
            }),
            prisma.transaction.aggregate({
                where: { userId, type: 'WITHDRAWAL', status: 'SUCCESS' },
                _sum: { amount: true }
            })
        ]);

        res.json({
            availableBalance: Number(user.balance),
            pendingBalance,
            totalEarnings: Number(earnings._sum.amount || 0),
            totalSpendings: Number(spendings._sum.amount || 0)
        });
    } catch (error) {
        console.error('[Wallet] Get balance error:', error);
        res.status(500).json({ message: 'Internal server error', error: (error as any).message });
    }
};

export const getBanks = async (req: AuthRequest, res: Response) => {
    try {
        const banks = await flutterwave.getBanks();
        res.json(banks);
    } catch (error: any) {
        console.error('[Wallet] Get banks error:', error);
        res.status(500).json({ message: 'Failed to retrieve bank list', error: error.message });
    }
};

export const withdrawFunds = async (req: AuthRequest, res: Response) => {
    try {
        const { amount, bankCode, accountNumber, narration } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.userId }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (Number(user.balance) < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Generate a unique reference for this transfer
        const transferRef = `wd_${Date.now()}_${req.userId}`;

        // Initiate transfer with Flutterwave
        console.log(`[Wallet] Initiating real transfer for user ${req.userId}: ${amount} to ${accountNumber} (${bankCode})`);

        try {
            const transferResponse = await flutterwave.initiateTransfer({
                account_bank: bankCode,
                account_number: accountNumber,
                amount,
                narration: narration || `Withdrawal from MyScrow`,
                currency: 'NGN',
                reference: transferRef
            });

            if (transferResponse.status !== 'success') {
                throw new Error(transferResponse.message || 'Flutterwave transfer initiation failed');
            }

            // Record the transaction and deduct balance locally
            // In production, you might wait for a webhook to confirm SUCCESS, 
            // but usually for transfers, we deduct immediately to prevent double spending.
            await prisma.$transaction([
                prisma.user.update({
                    where: { id: req.userId },
                    data: { balance: { decrement: amount } }
                }),
                prisma.transaction.create({
                    data: {
                        amount,
                        type: 'WITHDRAWAL',
                        status: 'SUCCESS', // We mark as success initially based on successful initiation
                        userId: req.userId!,
                        externalRef: transferRef,
                        flutterwaveId: transferResponse.data?.id?.toString()
                    }
                })
            ]);

            res.json({
                message: 'Withdrawal initiated successfully',
                data: transferResponse.data
            });

        } catch (fwError: any) {
            console.error('[Wallet] Flutterwave Transfer API Error:', fwError.message);
            return res.status(400).json({
                message: 'Failed to initiate transfer via payment provider',
                error: fwError.message
            });
        }

    } catch (error) {
        console.error('Withdraw funds error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
