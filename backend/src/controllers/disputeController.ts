import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { createNotification } from '../utils/notification';

// Get all disputed escrows
export const getAllDisputes = async (req: AuthRequest, res: Response) => {
    try {
        const { page = 1, limit = 10, search } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {
            status: 'DISPUTED'
        };

        if (search) {
            where.OR = [
                { title: { contains: String(search), mode: 'insensitive' } },
                { description: { contains: String(search), mode: 'insensitive' } },
                { ticketId: { contains: String(search), mode: 'insensitive' } } // Assuming user might search by ticketId if related?
            ];
        }

        const [disputes, total] = await Promise.all([
            prisma.escrow.findMany({
                where,
                include: {
                    buyer: { select: { id: true, username: true, email: true } },
                    seller: { select: { id: true, username: true, email: true } },
                },
                skip,
                take: Number(limit),
                orderBy: { updatedAt: 'desc' }
            }),
            prisma.escrow.count({ where })
        ]);

        res.json({
            disputes,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error('Get all disputes error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get dispute details
export const getDisputeDetails = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const dispute = await prisma.escrow.findUnique({
            where: { id: id as string },
            include: {
                buyer: { select: { id: true, username: true, email: true, phone: true } },
                seller: { select: { id: true, username: true, email: true, phone: true } },
                transactions: { orderBy: { createdAt: 'desc' } }
            }
        });

        if (!dispute || dispute.status !== 'DISPUTED') {
            return res.status(404).json({ message: 'Dispute not found' });
        }

        res.json(dispute);
    } catch (error) {
        console.error('Get dispute details error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Settle a dispute
export const settleDispute = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { action, buyerAmount, sellerAmount } = req.body;

        const escrow = await prisma.escrow.findUnique({
            where: { id: id as string },
            include: { buyer: true, seller: true }
        });

        if (!escrow || escrow.status !== 'DISPUTED') {
            return res.status(404).json({ message: 'Dispute not found or already settled' });
        }

        const totalEscrowAmount = Number(escrow.amount);

        if (action === 'RELEASE') {
            // Full Release to Seller
            await prisma.$transaction([
                prisma.escrow.update({
                    where: { id: id as string },
                    data: { status: 'RELEASED' }
                }),
                prisma.user.update({
                    where: { id: escrow.sellerId },
                    data: { balance: { increment: totalEscrowAmount } }
                }),
                prisma.transaction.create({
                    data: {
                        amount: totalEscrowAmount,
                        type: 'ESCROW_RELEASE', // This type exists in enum
                        status: 'SUCCESS',
                        userId: escrow.sellerId,
                        escrowId: id as string
                    }
                })
            ]);

            await createNotification(escrow.sellerId, 'Dispute Resolved', `Dispute for "${escrow.title}" resolved: Funds released to you.`, 'SUCCESS');
            await createNotification(escrow.buyerId, 'Dispute Resolved', `Dispute for "${escrow.title}" resolved: Funds released to seller.`, 'INFO');

        } else if (action === 'REFUND') {
            // Full Refund to Buyer
            await prisma.$transaction([
                prisma.escrow.update({
                    where: { id: id as string },
                    data: { status: 'CANCELLED' } // We use CANCELLED as REFUNDED isn't in current enum
                }),
                prisma.user.update({
                    where: { id: escrow.buyerId },
                    data: { balance: { increment: totalEscrowAmount } }
                }),
                prisma.transaction.create({
                    data: {
                        amount: totalEscrowAmount,
                        type: 'ESCROW_REFUND', // This type exists in enum
                        status: 'SUCCESS',
                        userId: escrow.buyerId,
                        escrowId: id as string
                    }
                })
            ]);

            await createNotification(escrow.buyerId, 'Dispute Resolved', `Dispute for "${escrow.title}" resolved: Funds refunded to you.`, 'SUCCESS');
            await createNotification(escrow.sellerId, 'Dispute Resolved', `Dispute for "${escrow.title}" resolved: Funds refunded to buyer.`, 'INFO');

        } else if (action === 'SPLIT') {
            if (buyerAmount === undefined || sellerAmount === undefined) {
                return res.status(400).json({ message: 'Buyer and seller amounts are required for a split' });
            }

            if (Number(buyerAmount) + Number(sellerAmount) > totalEscrowAmount + 0.01) { // Small buffer for decimals
                return res.status(400).json({ message: 'Split amounts exceed total escrow amount' });
            }

            await prisma.$transaction([
                prisma.escrow.update({
                    where: { id: id as string },
                    data: { status: 'COMPLETED' } // Marking as completed after split settlement
                }),
                // Update Buyer Balance (Refund partial)
                prisma.user.update({
                    where: { id: escrow.buyerId },
                    data: { balance: { increment: Number(buyerAmount) } }
                }),
                // Update Seller Balance (Release partial)
                prisma.user.update({
                    where: { id: escrow.sellerId },
                    data: { balance: { increment: Number(sellerAmount) } }
                }),
                // Transaction for Buyer
                prisma.transaction.create({
                    data: {
                        amount: Number(buyerAmount),
                        type: 'ESCROW_REFUND',
                        status: 'SUCCESS',
                        userId: escrow.buyerId,
                        escrowId: id as string
                    }
                }),
                // Transaction for Seller
                prisma.transaction.create({
                    data: {
                        amount: Number(sellerAmount),
                        type: 'ESCROW_RELEASE',
                        status: 'SUCCESS',
                        userId: escrow.sellerId,
                        escrowId: id as string
                    }
                })
            ]);

            await createNotification(escrow.buyerId, 'Dispute Resolved (Split)', `Dispute for "${escrow.title}" resolved with a split. You received partial refund.`, 'SUCCESS');
            await createNotification(escrow.sellerId, 'Dispute Resolved (Split)', `Dispute for "${escrow.title}" resolved with a split. You received partial payment.`, 'SUCCESS');

        } else {
            return res.status(400).json({ message: 'Invalid resolution action. Use RELEASE, REFUND, or SPLIT.' });
        }

        res.json({ message: `Dispute resolved successfully with action: ${action}` });
    } catch (error) {
        console.error('Settle dispute error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
