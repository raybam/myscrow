import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { initializePayment, verifyTransaction, verifyTransactionByRef } from '../services/flutterwave';
import { createNotification } from '../utils/notification';
import bcrypt from 'bcryptjs';
import { checkLimits } from '../utils/limits';

export const createEscrow = async (req: AuthRequest, res: Response) => {
    try {
        const { title, description, amount, counterpartyId, creatorRole, buyerId, sellerId, deadline } = req.body;

        if (!title || !amount) {
            return res.status(400).json({ message: 'Title and amount are required' });
        }

        let finalBuyerId, finalSellerId;

        // Support both formats: new (counterpartyId + creatorRole) and old (buyerId + sellerId)
        if (buyerId && sellerId) {
            finalBuyerId = buyerId;
            finalSellerId = sellerId;
        } else if (counterpartyId && creatorRole) {
            if (creatorRole === 'seller') {
                finalBuyerId = counterpartyId;
                finalSellerId = req.userId!;
            } else {
                finalBuyerId = req.userId!;
                finalSellerId = counterpartyId;
            }
        } else {
            return res.status(400).json({
                message: 'Either (counterpartyId and creatorRole) or (buyerId and sellerId) are required'
            });
        }

        // Check KYC limits for the buyer
        const limitCheck = await checkLimits(finalBuyerId, Number(amount), 'ESCROW');
        if (!limitCheck.allowed) {
            return res.status(403).json({ message: limitCheck.message });
        }

        const escrow = await prisma.escrow.create({
            data: {
                title,
                description,
                amount,
                buyerId: finalBuyerId,
                sellerId: finalSellerId,
                deadline: deadline ? new Date(deadline) : null,
                status: 'PENDING',
            },
        });

        // Notify the other party.
        const otherPartyId = req.userId === finalBuyerId ? finalSellerId : finalBuyerId;
        await createNotification(
            otherPartyId,
            'New Escrow Created',
            `You have a new escrow request: "${title}". Check your dashboard.`
        );

        res.status(201).json({
            message: 'Escrow created successfully',
            escrow,
        });
    } catch (error) {
        console.error('[createEscrow] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getEscrows = async (req: AuthRequest, res: Response) => {
    try {
        console.log('[getEscrows] Fetching escrows for user:', req.userId);
        const start = Date.now();

        const escrows = await prisma.escrow.findMany({
            where: {
                OR: [
                    { buyerId: req.userId },
                    { sellerId: req.userId },
                ],
            },
            orderBy: { createdAt: 'desc' },
            include: {
                buyer: { select: { username: true, firstName: true, lastName: true } },
                seller: { select: { username: true, firstName: true, lastName: true } },
            },
        });

        const duration = Date.now() - start;
        console.log(`[getEscrows] Found ${escrows.length} escrows in ${duration}ms`);
        res.json(escrows);
    } catch (error) {
        console.error('[getEscrows] Error fetching escrows:', error);
        console.error('[getEscrows] Error stack:', (error as Error).stack);
        console.error('[getEscrows] User ID:', req.userId);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getEscrowDetails = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params['id'] as string;

        console.log('[getEscrowDetails] Fetching escrow:', id);
        console.log('[getEscrowDetails] User ID:', req.userId);

        const escrow = await prisma.escrow.findUnique({
            where: { id },
            include: {
                buyer: { select: { username: true, firstName: true, lastName: true, email: true } },
                seller: { select: { username: true, firstName: true, lastName: true } },
                transactions: true,
            },
        });

        if (!escrow) {
            console.log('[getEscrowDetails] Escrow not found:', id);
            return res.status(404).json({ message: 'Escrow not found' });
        }

        if (escrow.buyerId !== req.userId && escrow.sellerId !== req.userId) {
            console.log('[getEscrowDetails] Forbidden access attempt by:', req.userId);
            return res.status(403).json({ message: 'Forbidden' });
        }

        console.log('[getEscrowDetails] Successfully fetched escrow:', id);
        res.json(escrow);
    } catch (error) {
        console.error('[getEscrowDetails] Error:', error);
        console.error('[getEscrowDetails] Error message:', (error as Error).message);
        console.error('[getEscrowDetails] Error stack:', (error as Error).stack);
        res.status(500).json({
            message: 'Internal server error',
            error: (error as Error).message,
            stack: (error as Error).stack
        });
    }
};

export const fundEscrow = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params['id'] as string;

        const escrow = await prisma.escrow.findUnique({
            where: { id },
            include: { buyer: true },
        });

        if (!escrow) {
            return res.status(404).json({ message: 'Escrow not found' });
        }

        if (escrow.buyerId !== req.userId) {
            return res.status(403).json({ message: 'Only the buyer can fund this escrow' });
        }

        // Get commission from SystemConfig (fallback to 5%)
        const commissionConfigs = await prisma.systemConfig.findMany({
            where: { key: { in: ['COMMISSION_TYPE', 'COMMISSION_VALUE'] } }
        });
        const commissionType = commissionConfigs.find(c => c.key === 'COMMISSION_TYPE')?.value ?? 'percentage';
        const commissionValue = Number(commissionConfigs.find(c => c.key === 'COMMISSION_VALUE')?.value ?? 5);

        const amount = Number(escrow.amount);
        const fee = commissionType === 'flat' ? commissionValue : (amount * commissionValue) / 100;
        const totalAmount = amount + fee;

        const tx_ref = `escrow_${escrow.id}_${Date.now()}`;
        // Initialize Flutterwave payment
        const payment = await initializePayment({
            amount: totalAmount,
            email: escrow.buyer.email,
            tx_ref,
            callback_url: `${process.env['FRONTEND_URL'] || 'http://localhost:8081'}/escrow/callback`,
            customer_name: `${escrow.buyer.firstName || ''} ${escrow.buyer.lastName || ''}`.trim(),
        });

        res.json({
            message: 'Payment initialized',
            payment_link: payment.data.link,
            tx_ref,
            breakdown: {
                baseAmount: amount,
                fee: fee,
                total: totalAmount,
                commissionType,
                commissionValue
            }
        });
    } catch (error) {
        console.error('Fund escrow error:', error);
        console.error('Fund escrow error message:', (error as Error).message);
        console.error('Fund escrow error stack:', (error as Error).stack);
        res.status(500).json({
            message: 'Internal server error',
            error: (error as Error).message,
            stack: (error as Error).stack
        });
    }
};

export const updateEscrowStatus = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { status } = req.body;

        const escrow = await prisma.escrow.findUnique({
            where: { id },
        });

        if (!escrow) {
            return res.status(404).json({ message: 'Escrow not found' });
        }

        // Only buyer/seller involved can update
        if (escrow.buyerId !== req.userId && escrow.sellerId !== req.userId) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const idStr = id as string;
        // Basic validation: Pending can be REJECTED or CANCELLED
        // Funded can be COMPLETED (by buyer)
        // Specific logic for marking as COMPLETED
        if (status === 'COMPLETED') {
            if (escrow.sellerId !== req.userId) {
                return res.status(403).json({ message: 'Only the seller can mark as completed' });
            }
            if (escrow.status !== 'FUNDED') {
                return res.status(400).json({ message: 'Only funded escrows can be marked as completed' });
            }

            const updatedEscrow = await prisma.escrow.update({
                where: { id: idStr },
                data: { status: 'COMPLETED' },
            });

            // Notify Buyer
            await createNotification(
                escrow.buyerId,
                'Service Completed',
                `The seller has marked "${escrow.title}" as completed. Please review and release funds.`,
                'SUCCESS'
            );

            return res.json({
                message: 'Escrow marked as completed',
                escrow: updatedEscrow
            });
        }

        // Basic validation for other statuses
        const updatedEscrow = await prisma.escrow.update({
            where: { id: idStr },
            data: { status },
        });

        res.json({
            message: 'Escrow status updated',
            escrow: updatedEscrow
        });
    } catch (error) {
        console.error('Update escrow status error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const releaseFunds = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params['id'] as string;

        const escrow = await prisma.escrow.findUnique({
            where: { id },
            include: { seller: true }
        });

        if (!escrow) {
            return res.status(404).json({ message: 'Escrow not found' });
        }

        if (escrow.buyerId !== req.userId) {
            return res.status(403).json({ message: 'Only the buyer can release funds' });
        }

        if (escrow.status !== 'FUNDED' && escrow.status !== 'COMPLETED') {
            return res.status(400).json({ message: 'Only funded or completed escrows can be released' });
        }

        // Verify PIN
        const { pin } = req.body;
        if (!pin) {
            return res.status(400).json({ message: 'PIN is required to release funds' });
        }

        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!user || !user.paymentPin) {
            return res.status(400).json({ message: 'Transaction PIN not set. Please set it in your profile settings.' });
        }

        const isPinValid = await bcrypt.compare(pin, user.paymentPin);
        if (!isPinValid) {
            return res.status(400).json({ message: 'Invalid PIN' });
        }

        // Get commission from SystemConfig (fallback to 5%)
        const releaseConfigs = await prisma.systemConfig.findMany({
            where: { key: { in: ['COMMISSION_TYPE', 'COMMISSION_VALUE'] } }
        });
        const releaseCommissionType = releaseConfigs.find(c => c.key === 'COMMISSION_TYPE')?.value ?? 'percentage';
        const releaseCommissionValue = Number(releaseConfigs.find(c => c.key === 'COMMISSION_VALUE')?.value ?? 5);
        const totalAmount = Number(escrow.amount);
        const commission = releaseCommissionType === 'flat' ? releaseCommissionValue : (totalAmount * releaseCommissionValue) / 100;
        const sellerEarnings = totalAmount; // Actually, the buyer paid Total + Fee. Seller gets Total.
        // Wait, if Buyer pays 105, Seller gets 100. Platform takes 5.
        // If the user meant Seller pays commission, then Seller gets 95.
        // Usually, in Escrow, the "Amount" is what the Seller expects.
        // Let's assume Seller gets the full 'amount' specified in the contract, and Buyer paid the fee on top.

        await prisma.$transaction([
            // Update Escrow status
            prisma.escrow.update({
                where: { id },
                data: { status: 'RELEASED' }
            }),
            // Update Seller balance
            prisma.user.update({
                where: { id: escrow.sellerId },
                data: { balance: { increment: totalAmount } }
            }),
            // Create Transaction record
            prisma.transaction.create({
                data: {
                    amount: totalAmount,
                    type: 'ESCROW_RELEASE',
                    status: 'SUCCESS',
                    userId: escrow.sellerId,
                    escrowId: id
                }
            })
        ]);

        // Notify Seller
        await createNotification(
            escrow.sellerId,
            'Funds Released',
            `Funds for "${escrow.title}" have been released to your wallet.`,
            'SUCCESS'
        );

        res.json({ message: 'Funds released to seller successfully' });
    } catch (error) {
        console.error('Release funds error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const verifyPayment = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { transaction_id, tx_ref } = req.body;

        if (!transaction_id && !tx_ref) {
            return res.status(400).json({ message: 'Transaction ID or Reference is required' });
        }

        console.log(`[verifyPayment] Verifying payment for escrow ${id}`);

        // Verify with Flutterwave
        let verification;
        if (tx_ref) {
            verification = await verifyTransactionByRef(tx_ref);
        } else {
            verification = await verifyTransaction(transaction_id);
        }

        if (verification.status === 'success' && verification.data.status === 'successful') {
            const amount = verification.data.amount;

            // Update Escrow status
            const updatedEscrow = await prisma.escrow.update({
                where: { id },
                data: { status: 'FUNDED' },
            });

            // Check if transaction record exists, if not create it
            const actualTransactionId = verification.data.id;
            const existingTx = await prisma.transaction.findUnique({
                where: { externalRef: String(actualTransactionId) }
            });

            if (!existingTx) {
                await prisma.transaction.create({
                    data: {
                        amount: String(amount),
                        type: 'DEPOSIT',
                        status: 'SUCCESS',
                        externalRef: String(actualTransactionId),
                        escrowId: id,
                        userId: req.userId!, // Assumes buyer is the one verifying
                    },
                });
            }

            // Notify Seller
            const escrow = await prisma.escrow.findUnique({ where: { id } });
            if (escrow) {
                await createNotification(
                    escrow.sellerId,
                    'Escrow Funded',
                    `The buyer has funded the escrow "${escrow.title}".`,
                    'SUCCESS'
                );
            }

            console.log(`[verifyPayment] Payment verified and escrow funded: ${id}`);
            return res.json({
                message: 'Payment verified and escrow funded',
                escrow: updatedEscrow
            });
        } else {
            console.warn(`[verifyPayment] Verification failed:`, verification);
            return res.status(400).json({ message: 'Payment verification failed or payment was not successful' });
        }

    } catch (error) {
        console.error('[verifyPayment] Error:', error);
        res.status(500).json({
            message: 'Internal server error',
            error: (error as Error).message
        });
    }
};

export const raiseDispute = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ message: 'Dispute reason is required' });
        }

        const escrow = await prisma.escrow.findUnique({
            where: { id },
        });

        if (!escrow) {
            return res.status(404).json({ message: 'Escrow not found' });
        }

        if (escrow.buyerId !== req.userId && escrow.sellerId !== req.userId) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        if (escrow.status !== 'FUNDED' && escrow.status !== 'COMPLETED') {
            return res.status(400).json({ message: 'Only funded or completed escrows can be disputed' });
        }

        const updatedEscrow = await prisma.escrow.update({
            where: { id },
            data: {
                status: 'DISPUTED',
                disputeReason: reason,
            },
        });

        // Notify counterparty
        const counterpartyId = req.userId === escrow.buyerId ? escrow.sellerId : escrow.buyerId;
        await createNotification(
            counterpartyId,
            'Dispute Raised',
            `A dispute has been raised for the transaction "${escrow.title}". Reason: ${reason}`,
            'ERROR'
        );

        res.json({
            message: 'Dispute raised successfully',
            escrow: updatedEscrow
        });
    } catch (error) {
        console.error('Raise dispute error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
