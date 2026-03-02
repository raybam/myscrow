const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

export interface PaymentData {
    amount: number;
    email: string;
    tx_ref: string;
    callback_url: string;
    customer_name: string;
}

export const initializePayment = async (data: PaymentData) => {
    if (!FLUTTERWAVE_SECRET_KEY || FLUTTERWAVE_SECRET_KEY.includes('your_flutterwave')) {
        console.error('Flutterwave secret key is missing or invalid');
        throw new Error('Flutterwave configuration error: You need to set your valid FLUTTERWAVE_SECRET_KEY in the backend/.env file');
    }

    try {
        console.log('[Flutterwave] Initializing payment for:', data.email, 'Amount:', data.amount);
        const response = await fetch('https://api.flutterwave.com/v3/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
            },
            body: JSON.stringify({
                tx_ref: data.tx_ref,
                amount: data.amount,
                currency: 'NGN',
                redirect_url: data.callback_url,
                customer: {
                    email: data.email,
                    name: data.customer_name,
                },
                customizations: {
                    title: 'Myescrow Payment',
                    description: 'Payment for escrow services',
                    logo: 'https://i.ibb.co/vzPRY8f/logo.png',
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        return responseData;
    } catch (error: any) {
        console.error('Flutterwave initialization error:', error.message);
        throw new Error(error.message || 'Failed to initialize payment');
    }
};

export const verifyTransaction = async (transactionId: string) => {
    try {
        const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        return responseData;
    } catch (error: any) {
        console.error('Flutterwave verification error:', error.message);
        throw new Error('Failed to verify transaction');
    }
};

export const verifyTransactionByRef = async (txRef: string) => {
    try {
        const response = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${txRef}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        return responseData;
    } catch (error: any) {
        console.error('Flutterwave verification error by ref:', error.message);
        throw new Error('Failed to verify transaction by reference');
    }
};

export const getBanks = async () => {
    try {
        const response = await fetch('https://api.flutterwave.com/v3/banks/NG', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        return responseData;
    } catch (error: any) {
        console.error('Flutterwave get banks error:', error.message);
        throw new Error('Failed to retrieve bank list');
    }
};

export interface TransferData {
    account_bank: string;
    account_number: string;
    amount: number;
    narration: string;
    currency: string;
    reference: string;
    callback_url?: string;
}

export const initiateTransfer = async (data: TransferData) => {
    try {
        const response = await fetch('https://api.flutterwave.com/v3/transfers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
            },
            body: JSON.stringify({
                ...data,
                debit_currency: 'NGN'
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        return responseData;
    } catch (error: any) {
        console.error('Flutterwave transfer error:', error.message);
        throw new Error(error.message || 'Failed to initiate transfer');
    }
};
