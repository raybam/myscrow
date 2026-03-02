import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { SupportTicket, TicketStatus, TicketPriority } from '../types/tickets';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
    MessageSquare,
    Search,
    Filter,
    Clock,
    CheckCircle,
    AlertTriangle,
    ChevronRight,
    Loader2
} from 'lucide-react';

const Tickets = () => {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const navigate = useNavigate();

    const fetchTickets = async (page = 1) => {
        setLoading(true);
        try {
            const response = await api.get('/support/admin/all', {
                params: {
                    status: statusFilter || undefined,
                    search: search || undefined,
                    page,
                    limit: 10
                }
            });
            const { tickets, pagination } = response.data;
            setTickets(tickets);
            setTotalPages(pagination.pages);
            setTotalItems(pagination.total);
            setCurrentPage(pagination.page);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to fetch tickets');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets(1);
    }, [statusFilter]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchTickets(1);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            fetchTickets(newPage);
        }
    };

    const getStatusColor = (status: TicketStatus) => {
        switch (status) {
            case 'OPEN': return 'text-blue-600 bg-blue-100';
            case 'IN_PROGRESS': return 'text-yellow-600 bg-yellow-100';
            case 'RESOLVED': return 'text-green-600 bg-green-100';
            case 'CLOSED': return 'text-gray-600 bg-gray-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getPriorityColor = (priority: TicketPriority) => {
        switch (priority) {
            case 'URGENT': return 'text-red-700 bg-red-100';
            case 'HIGH': return 'text-orange-700 bg-orange-100';
            case 'MEDIUM': return 'text-blue-700 bg-blue-100';
            case 'LOW': return 'text-gray-700 bg-gray-100';
            default: return 'text-gray-700 bg-gray-100';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
                    <p className="text-sm text-gray-500 mt-1">Total: {totalItems} tickets found</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <form onSubmit={handleSearch} className="flex flex-1 md:w-80">
                        <div className="relative w-full">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Search tickets..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </form>

                    <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-md px-3 py-2">
                        <Filter className="h-4 w-4 text-gray-400" />
                        <select
                            className="bg-transparent border-none focus:ring-0 text-sm"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="OPEN">Open</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="CLOSED">Closed</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket Info</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                <th className="relative px-6 py-3">
                                    <span className="sr-only">View</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-3/4"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-1/2"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-1/3"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-1/3"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-1/2"></div></td>
                                        <td className="px-6 py-4"></td>
                                    </tr>
                                ))
                            ) : tickets.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">No tickets found.</td>
                                </tr>
                            ) : (
                                tickets.map((ticket) => (
                                    <tr
                                        key={ticket.id}
                                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-indigo-600 mb-1">#{ticket.ticketId}</div>
                                            <div className="text-sm font-semibold text-gray-900 line-clamp-1">{ticket.subject}</div>
                                            <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{ticket.category}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{ticket.user?.username || 'Unknown'}</div>
                                            <div className="text-xs text-gray-500">{ticket.user?.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                                                {ticket.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(ticket.priority)}`}>
                                                {ticket.priority}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(ticket.createdAt).toLocaleDateString()}
                                            <span className="block text-xs mt-1 text-gray-400">
                                                {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-400">
                                            <ChevronRight className="h-5 w-5 ml-auto" />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {!loading && totalPages > 1 && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                            Showing page <span className="font-medium">{currentPage}</span> of{' '}
                            <span className="font-medium">{totalPages}</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default Tickets;
