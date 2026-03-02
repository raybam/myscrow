import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertCircle,
    Search,
    Filter,
    ChevronRight,
    Clock,
    User,
    DollarSign,
    Scale
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';

interface Dispute {
    id: string;
    title: string;
    amount: string;
    status: string;
    disputeReason: string;
    createdAt: string;
    updatedAt: string;
    buyer: {
        username: string;
        email: string;
    };
    seller: {
        username: string;
        email: string;
    };
}

const Disputes = () => {
    const navigate = useNavigate();
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalDisputes, setTotalDisputes] = useState(0);

    const fetchDisputes = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/disputes', {
                params: {
                    page,
                    limit: 10,
                    search: search || undefined
                }
            });
            setDisputes(response.data.disputes);
            setTotalPages(response.data.pagination.pages);
            setTotalDisputes(response.data.pagination.total);
        } catch (error) {
            console.error('Error fetching disputes:', error);
            toast.error('Failed to load disputes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchDisputes();
        }, 300);
        return () => clearTimeout(timer);
    }, [page, search]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1);
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        window.scrollTo(0, 0);
    };

    return (
        <div className="space-y-6">
            <div className="md:flex md:items-center md:justify-between">
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                        Dispute Resolution
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        {totalDisputes} active disputes requiring intervention
                    </p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Search disputes by title or description..."
                        value={search}
                        onChange={handleSearch}
                    />
                </div>
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                </button>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dispute / Escrow</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parties</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-48 mb-2"></div><div className="h-3 bg-gray-100 rounded w-24"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32 mb-1"></div><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                                        <td className="px-6 py-4"></td>
                                    </tr>
                                ))
                            ) : disputes.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <AlertCircle className="h-10 w-10 text-gray-300 mb-2" />
                                            <p>No active disputes found.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                disputes.map((dispute) => (
                                    <tr
                                        key={dispute.id}
                                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/disputes/${dispute.id}`)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-semibold text-gray-900 line-clamp-1">{dispute.title}</div>
                                            <div className="text-xs text-red-500 mt-1 line-clamp-1 italic">Reason: {dispute.disputeReason}</div>
                                            <div className="flex items-center mt-2 text-xs text-gray-400">
                                                <Clock className="h-3 w-3 mr-1" />
                                                {new Date(dispute.updatedAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm font-bold text-gray-900">
                                                <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                                                {Number(dispute.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="space-y-1">
                                                <div className="flex items-center text-xs text-gray-600">
                                                    <span className="w-12 font-medium">Buyer:</span>
                                                    <span className="text-indigo-600">@{dispute.buyer.username}</span>
                                                </div>
                                                <div className="flex items-center text-xs text-gray-600">
                                                    <span className="w-12 font-medium">Seller:</span>
                                                    <span className="text-indigo-600">@{dispute.seller.username}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <button className="inline-flex items-center px-3 py-1.5 border border-indigo-600 text-xs font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50">
                                                <Scale className="h-3.5 w-3.5 mr-1" />
                                                Resolve
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                            Showing page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page === 1}
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => handlePageChange(page + 1)}
                                disabled={page === totalPages}
                                className="px-3 py-1 border border-indigo-600 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Disputes;
