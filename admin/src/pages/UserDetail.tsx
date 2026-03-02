import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    User,
    Mail,
    Phone,
    Calendar,
    Shield,
    CreditCard,
    Activity,
    AlertCircle,
    CheckCircle2,
    XCircle,
    FileText,
    History,
    ShoppingBag,
    DollarSign,
    Lock,
    Unlock,
    BadgeCheck,
    Clock
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';

interface UserStats {
    totalVolume: number;
}

interface UserData {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role: string;
    kycStatus: string;
    isActive: boolean;
    balance: string;
    createdAt: string;
    isProfileComplete: boolean;
    idNumber?: string;
    photo?: string;
    _count: {
        escrowsAsBuyer: number;
        escrowsAsSeller: number;
        transactions: number;
        supportTickets: number;
    };
    transactions: any[];
    escrowsAsBuyer: any[];
    escrowsAsSeller: any[];
    stats: UserStats;
}

const UserDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [updatingKyc, setUpdatingKyc] = useState(false);

    const fetchUserDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/admin/users/${id}`);
            setUser(response.data);
        } catch (error) {
            console.error('Error fetching user details:', error);
            toast.error('Failed to load user details');
            navigate('/users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserDetails();
    }, [id]);

    const handleStatusUpdate = async (newStatus: boolean) => {
        if (!user) return;
        const confirmMsg = newStatus
            ? `Are you sure you want to activate this account?`
            : `Are you sure you want to suspend this user? They will lose access to transaction features.`;

        if (!window.confirm(confirmMsg)) return;

        try {
            setUpdatingStatus(true);
            await api.patch(`/admin/users/${id}/status`, { isActive: newStatus });
            toast.success(`User ${newStatus ? 'activated' : 'suspended'} successfully`);
            setUser({ ...user, isActive: newStatus });
        } catch (error) {
            toast.error('Failed to update user status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleKycUpdate = async (status: 'VERIFIED' | 'REJECTED') => {
        if (!user) return;
        if (!window.confirm(`Are you sure you want to set KYC status to ${status}?`)) return;

        try {
            setUpdatingKyc(true);
            await api.patch(`/admin/users/${id}/kyc`, { status });
            toast.success(`KYC status updated to ${status}`);
            setUser({ ...user, kycStatus: status });
        } catch (error) {
            toast.error('Failed to update KYC status');
        } finally {
            setUpdatingKyc(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
            <button
                onClick={() => navigate('/users')}
                className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Users
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* User Info Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white shadow rounded-xl border border-gray-200 overflow-hidden">
                        <div className="p-6 text-center border-b border-gray-100">
                            <div className="h-24 w-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600 border-4 border-white shadow-sm">
                                {user.photo ? (
                                    <img src={user.photo} alt={user.username} className="h-full w-full rounded-full object-cover" />
                                ) : (
                                    <User className="h-10 w-10" />
                                )}
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">@{user.username}</h2>
                            <p className="text-sm text-gray-500">{user.firstName} {user.lastName}</p>
                            <div className="mt-4 flex items-center justify-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                    {user.isActive ? 'Active' : 'Suspended'}
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 uppercase tracking-wider">
                                    {user.role}
                                </span>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center text-sm">
                                <Mail className="h-4 w-4 text-gray-400 mr-3" />
                                <span className="text-gray-600">{user.email}</span>
                            </div>
                            <div className="flex items-center text-sm">
                                <Phone className="h-4 w-4 text-gray-400 mr-3" />
                                <span className="text-gray-600">{user.idNumber || 'No ID Provided'}</span>
                            </div>
                            <div className="flex items-center text-sm">
                                <Calendar className="h-4 w-4 text-gray-400 mr-3" />
                                <span className="text-gray-600 italic">Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 border-t border-gray-100 grid grid-cols-2 gap-4 text-center">
                            <div>
                                <div className="text-xs text-gray-500 uppercase font-bold mb-1">Total Escrows</div>
                                <div className="text-lg font-bold text-gray-900">{user._count.escrowsAsBuyer + user._count.escrowsAsSeller}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 uppercase font-bold mb-1">Tickets</div>
                                <div className="text-lg font-bold text-gray-900">{user._count.supportTickets}</div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Controls */}
                    <div className="bg-white shadow rounded-xl border border-gray-200 p-6 space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center mb-2">
                            <Shield className="h-4 w-4 mr-2 text-gray-400" />
                            Account Controls
                        </h3>
                        {user.isActive ? (
                            <button
                                onClick={() => handleStatusUpdate(false)}
                                disabled={updatingStatus}
                                className="w-full flex items-center justify-center px-4 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                            >
                                <Lock className="h-4 w-4 mr-2" />
                                Suspend Account
                            </button>
                        ) : (
                            <button
                                onClick={() => handleStatusUpdate(true)}
                                disabled={updatingStatus}
                                className="w-full flex items-center justify-center px-4 py-2 border border-green-200 rounded-lg text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 transition-colors"
                            >
                                <Unlock className="h-4 w-4 mr-2" />
                                Activate Account
                            </button>
                        )}

                        <div className="pt-4 border-t border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">KYC Verifcation</h3>
                            {user.kycStatus === 'VERIFIED' ? (
                                <div className="flex items-center text-green-600 bg-green-50 p-3 rounded-lg border border-green-100">
                                    <BadgeCheck className="h-5 w-5 mr-3" />
                                    <div className="text-sm font-bold">Identity Verified</div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className={`p-3 rounded-lg border text-sm flex items-center ${user.kycStatus === 'PENDING' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-red-50 border-red-200 text-red-800'
                                        }`}>
                                        <AlertCircle className="h-4 w-4 mr-3" />
                                        Status: {user.kycStatus}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleKycUpdate('VERIFIED')}
                                            disabled={updatingKyc}
                                            className="flex-1 bg-green-600 text-white rounded-lg py-2 text-xs font-bold hover:bg-green-700 disabled:opacity-50 transition-colors"
                                        >
                                            APPROVE
                                        </button>
                                        <button
                                            onClick={() => handleKycUpdate('REJECTED')}
                                            disabled={updatingKyc}
                                            className="flex-1 bg-white border border-red-200 text-red-600 rounded-lg py-2 text-xs font-bold hover:bg-red-50 disabled:opacity-50 transition-colors"
                                        >
                                            REJECT
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Stats Dashboard */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl p-6 text-white shadow-lg">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-indigo-100 text-sm font-medium">Available Balance</p>
                                <CreditCard className="h-5 w-5 text-indigo-300" />
                            </div>
                            <div className="text-3xl font-bold mb-1">${Number(user.balance).toLocaleString()}</div>
                            <p className="text-indigo-200 text-xs italic">Withdrawable by user</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-gray-500 text-sm font-medium">Total Transaction Flow</p>
                                <DollarSign className="h-5 w-5 text-green-500" />
                            </div>
                            <div className="text-3xl font-bold text-gray-900">${Number(user.stats.totalVolume).toLocaleString()}</div>
                            <p className="text-gray-400 text-xs">Lifetime volume processed</p>
                        </div>
                    </div>

                    {/* Section: Activity Tabs */}
                    <div className="bg-white shadow rounded-xl border border-gray-200 overflow-hidden">
                        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 flex items-center">
                                <History className="h-4 w-4 mr-2 text-indigo-600" />
                                Recent Wallet Activity
                            </h3>
                            <button className="text-xs font-bold text-indigo-600 hover:text-indigo-500 uppercase tracking-wider">
                                View All Transactions
                            </button>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {user.transactions.length > 0 ? (
                                user.transactions.map((tx) => (
                                    <div key={tx.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${tx.type === 'DEPOSIT' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                                }`}>
                                                <Activity className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-gray-900">{tx.type}</div>
                                                <div className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString()}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-sm font-bold ${tx.type === 'DEPOSIT' || tx.type === 'ESCROW_REFUND' ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {tx.type === 'DEPOSIT' || tx.type === 'ESCROW_REFUND' ? '+' : '-'}${Number(tx.amount).toLocaleString()}
                                            </div>
                                            <div className="text-[10px] uppercase font-bold text-gray-400">{tx.status}</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-12 text-center text-gray-500 text-sm italic">
                                    No transaction records found for this user.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section: Active Escrows */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white shadow rounded-xl border border-gray-200 overflow-hidden">
                            <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center">
                                    <ShoppingBag className="h-3.5 w-3.5 mr-2 text-indigo-600" />
                                    Buying History
                                </h3>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {user.escrowsAsBuyer.length > 0 ? (
                                    user.escrowsAsBuyer.map((esc) => (
                                        <div key={esc.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                                            <div className="text-sm font-bold text-gray-900 mb-1 line-clamp-1">{esc.title}</div>
                                            <div className="flex items-center justify-between text-xs text-gray-500">
                                                <span>To: {esc.seller.username}</span>
                                                <span className="font-bold text-indigo-600">${Number(esc.amount).toLocaleString()}</span>
                                            </div>
                                            <div className="mt-2">
                                                <span className="px-1.5 py-0.25 rounded bg-gray-100 text-[10px] font-bold text-gray-600 uppercase">
                                                    {esc.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-gray-400 text-xs italic">No buying activity</div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white shadow rounded-xl border border-gray-200 overflow-hidden">
                            <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center">
                                    <ShoppingBag className="h-3.5 w-3.5 mr-2 text-green-600" />
                                    Selling History
                                </h3>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {user.escrowsAsSeller.length > 0 ? (
                                    user.escrowsAsSeller.map((esc) => (
                                        <div key={esc.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                                            <div className="text-sm font-bold text-gray-900 mb-1 line-clamp-1">{esc.title}</div>
                                            <div className="flex items-center justify-between text-xs text-gray-500">
                                                <span>From: {esc.buyer.username}</span>
                                                <span className="font-bold text-indigo-600">${Number(esc.amount).toLocaleString()}</span>
                                            </div>
                                            <div className="mt-2">
                                                <span className="px-1.5 py-0.25 rounded bg-gray-100 text-[10px] font-bold text-gray-600 uppercase">
                                                    {esc.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-gray-400 text-xs italic">No selling activity</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDetail;
