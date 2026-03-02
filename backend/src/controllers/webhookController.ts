import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { verifyTransaction } from '../services/flutterwave';

export const flutterwaveWebhook = async (req: Request, res: Response) => {
    try {
        // In a real app, you should verify the signature from headers: req.headers['verif-hash']
        const payload = req.body;

        console.log('Webhook received:', payload);

        if (payload.status === 'successful') {
            const { tx_ref, id: transactionId, amount } = payload;

            // tx_ref format: escrow_ID_TIMESTAMP
            if (tx_ref.startsWith('escrow_')) {
                const escrowId = tx_ref.split('_')[1];

                // Double check with Flutterwave API to be safe
                const verification = await verifyTransaction(transactionId);

                if (verification.status === 'success' && verification.data.status === 'successful') {
                    // Update Escrow status
                    await prisma.escrow.update({
                        where: { id: escrowId },
                        data: { status: 'FUNDED' },
                    });

                    // Create Transaction record
                    await prisma.transaction.create({
                        data: {
                            amount: String(amount),
                            type: 'DEPOSIT',
                            status: 'SUCCESS',
                            externalRef: String(transactionId),
                            escrowId,
                            userId: verification.data.customer.id || '', // Note: this might need mapping or looking up buyer
                        },
                    });

                    console.log(`Escrow ${escrowId} marked as FUNDED`);
                }
            }
        }

        res.status(200).send('Webhook received');
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).send('Internal server error');
    }
};
