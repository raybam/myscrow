import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    AlertCircle,
    User,
    Clock,
    DollarSign,
    Shield,
    Scale,
    CheckCircle2,
    XCircle,
    Info,
    Mail,
    Phone
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';

interface UserInfo {
    id: string;
    username: string;
    email: string;
    phone?: string;
}

interface Transaction {
    id: string;
    amount: string;
    type: string;
    status: string;
    createdAt: string;
}

interface Dispute {
    id: string;
    title: string;
    description: string;
    amount: string;
    status: string;
    disputeReason: string;
    createdAt: string;
    updatedAt: string;
    buyer: UserInfo;
    seller: UserInfo;
    transactions: Transaction[];
}

const DisputeDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [dispute, setDispute] = useState<Dispute | null>(null);
    const [loading, setLoading] = useState(true);
    const [resolving, setResolving] = useState(false);

    // Split resolution state
    const [isSplitMode, setIsSplitMode] = useState(false);
    const [buyerSplit, setBuyerSplit] = useState(0);
    const [sellerSplit, setSellerSplit] = useState(0);

    const fetchDispute = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/admin/disputes/${id}`);
            setDispute(response.data);

            // Default split to 50/50
            const total = Number(response.data.amount);
            setBuyerSplit(total / 2);
            setSellerSplit(total / 2);
        } catch (error) {
            console.error('Error fetching dispute details:', error);
            toast.error('Failed to load dispute details');
            navigate('/disputes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDispute();
    }, [id]);

    const handleResolve = async (action: 'RELEASE' | 'REFUND' | 'SPLIT') => {
        if (!dispute) return;

        const confirmMsg = action === 'SPLIT'
            ? `Are you sure you want to split this escrow: Buyer gets $${buyerSplit.toFixed(2)}, Seller gets $${sellerSplit.toFixed(2)}?`
            : `Are you sure you want to execute a ${action} resolution for this dispute?`;

        if (!window.confirm(confirmMsg)) return;

        try {
            setResolving(true);
            await api.post(`/admin/disputes/${id}/resolve`, {
                action,
                buyerAmount: action === 'SPLIT' ? buyerSplit : undefined,
                sellerAmount: action === 'SPLIT' ? sellerSplit : undefined
            });
            toast.success(`Dispute resolved successfully: ${action}`);
            navigate('/disputes');
        } catch (error: any) {
            console.error('Resolution error:', error);
            toast.error(error.response?.data?.message || 'Failed to resolve dispute');
        } finally {
            setResolving(false);
        }
    };

    const handleBuyerSplitChange = (val: string) => {
        const num = parseFloat(val) || 0;
        const total = Number(dispute?.amount || 0);
        if (num > total) return;
        setBuyerSplit(num);
        setSellerSplit(total - num);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!dispute) return null;

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
            <button
                onClick={() => navigate('/disputes')}
                className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 mb-4"
            >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Disputes
            </button>

            <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
                {/* Header Section */}
                <div className="px-6 py-6 bg-gray-50 border-b border-gray-200">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 uppercase tracking-wider">
                                    Disputed
                                </span>
                                <span className="text-sm text-gray-500">
                                    Raised on {new Date(dispute.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900">{dispute.title}</h1>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-500 mb-1 font-medium">Escrow Value</div>
                            <div className="text-3xl font-bold text-gray-900">
                                ${Number(dispute.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Dispute Context & History */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Dispute Reason Card */}
                        <div className="bg-red-50 border border-red-200 rounded-lg p-5">
                            <h3 className="flex items-center text-sm font-bold text-red-800 mb-3 uppercase tracking-wider">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Dispute Reason
                            </h3>
                            <p className="text-gray-900 font-medium italic">"{dispute.disputeReason}"</p>
                            {dispute.description && (
                                <div className="mt-4 pt-4 border-t border-red-100 italic text-sm text-gray-700">
                                    <h4 className="font-bold text-red-900 mb-1">Contract Description:</h4>
                                    {dispute.description}
                                </div>
                            )}
                        </div>

                        {/* Parties Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white border border-gray-200 rounded-lg p-5">
                                <h3 className="flex items-center text-xs font-bold text-gray-500 mb-4 uppercase tracking-wider">
                                    <User className="h-3.5 w-3.5 mr-2" />
                                    Buyer Details
                                </h3>
                                <div className="space-y-3">
                                    <div className="font-bold text-indigo-700 text-lg">@{dispute.buyer.username}</div>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                                        {dispute.buyer.email}
                                    </div>
                                    {dispute.buyer.phone && (
                                        <div className="flex items-center text-sm text-gray-600">
                                            <Phone className="h-4 w-4 mr-2 text-gray-400" />
                                            {dispute.buyer.phone}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-lg p-5">
                                <h3 className="flex items-center text-xs font-bold text-gray-500 mb-4 uppercase tracking-wider">
                                    <User className="h-3.5 w-3.5 mr-2 text-gray-400" />
                                    Seller Details
                                </h3>
                                <div className="space-y-3">
                                    <div className="font-bold text-indigo-700 text-lg">@{dispute.seller.username}</div>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                                        {dispute.seller.email}
                                    </div>
                                    {dispute.seller.phone && (
                                        <div className="flex items-center text-sm text-gray-600">
                                            <Phone className="h-4 w-4 mr-2 text-gray-400" />
                                            {dispute.seller.phone}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Recent Timeline */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider flex items-center">
                                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                                Escrow Timeline
                            </h3>
                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                <div className="divide-y divide-gray-100">
                                    {dispute.transactions.map((tx, idx) => (
                                        <div key={tx.id} className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${tx.type === 'DEPOSIT' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    <DollarSign className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-900">{tx.type.replace(/_/g, ' ')}</div>
                                                    <div className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString()}</div>
                                                </div>
                                            </div>
                                            <div className="text-sm font-bold text-gray-900">
                                                ${Number(tx.amount).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="p-4 flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                            <Info className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-gray-900">Escrow Initiated</div>
                                            <div className="text-xs text-gray-500">{new Date(dispute.createdAt).toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Resolution Panel */}
                    <div className="space-y-6">
                        <div className="bg-indigo-900 rounded-xl p-6 shadow-xl text-white">
                            <h2 className="text-lg font-bold flex items-center mb-6">
                                <Shield className="h-5 w-5 mr-2 text-indigo-300" />
                                Administrative Action
                            </h2>

                            {!isSplitMode ? (
                                <div className="space-y-4">
                                    <button
                                        disabled={resolving}
                                        onClick={() => handleResolve('RELEASE')}
                                        className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-bold flex items-center justify-center transition-colors shadow-lg disabled:opacity-50"
                                    >
                                        <CheckCircle2 className="h-5 w-5 mr-2" />
                                        RELEASE TO SELLER
                                    </button>
                                    <button
                                        disabled={resolving}
                                        onClick={() => handleResolve('REFUND')}
                                        className="w-full bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg font-bold flex items-center justify-center transition-colors shadow-lg disabled:opacity-50"
                                    >
                                        <XCircle className="h-5 w-5 mr-2" />
                                        REFUND TO BUYER
                                    </button>
                                    <div className="relative py-4">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t border-indigo-700"></span>
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-indigo-900 px-2 text-indigo-400">OR</span>
                                        </div>
                                    </div>
                                    <button
                                        disabled={resolving}
                                        onClick={() => setIsSplitMode(true)}
                                        className="w-full bg-indigo-700 hover:bg-indigo-600 text-white py-3 px-4 rounded-lg font-bold border border-indigo-500 flex items-center justify-center transition-colors disabled:opacity-50"
                                    >
                                        <Scale className="h-5 w-5 mr-2 text-indigo-300" />
                                        CUSTOM SETTLEMENT SPLIT
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="space-y-4">
                                        <div className="bg-indigo-800/50 p-4 rounded-lg border border-indigo-700">
                                            <label className="block text-xs font-bold text-indigo-300 uppercase mb-2">Refund to Buyer (@{dispute.buyer.username})</label>
                                            <div className="flex items-center">
                                                <span className="mr-2 text-xl font-bold text-white">$</span>
                                                <input
                                                    type="number"
                                                    value={buyerSplit}
                                                    onChange={(e) => handleBuyerSplitChange(e.target.value)}
                                                    className="bg-transparent text-2xl font-bold focus:outline-none w-full border-b border-indigo-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-indigo-800/50 p-4 rounded-lg border border-indigo-700">
                                            <label className="block text-xs font-bold text-indigo-300 uppercase mb-2">Release to Seller (@{dispute.seller.username})</label>
                                            <div className="flex items-center">
                                                <span className="mr-2 text-xl font-bold text-white">$</span>
                                                <div className="text-2xl font-bold text-white w-full border-b border-indigo-800/20 pb-0.5">
                                                    {sellerSplit.toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <button
                                            disabled={resolving || (buyerSplit + sellerSplit > Number(dispute.amount) + 0.01)}
                                            onClick={() => handleResolve('SPLIT')}
                                            className="w-full bg-white text-indigo-900 py-3 rounded-lg font-bold hover:bg-indigo-100 transition-colors shadow-lg disabled:opacity-50"
                                        >
                                            RESOLVE WITH SPLIT
                                        </button>
                                        <button
                                            disabled={resolving}
                                            onClick={() => setIsSplitMode(false)}
                                            className="w-full text-indigo-300 hover:text-white text-sm font-medium py-2 transition-colors"
                                        >
                                            Cancel Split Mode
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="mt-8 p-4 rounded-lg bg-indigo-800/30 border border-indigo-700/50 flex gap-3">
                                <Info className="h-5 w-5 text-indigo-400 shrink-0" />
                                <p className="text-xs text-indigo-300 leading-relaxed">
                                    Resolving a dispute is final. Both users' balances will be updated immediately and transaction notifications will be sent automatically.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DisputeDetails;
