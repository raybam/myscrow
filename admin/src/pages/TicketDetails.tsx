import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { SupportTicket, TicketStatus } from '../types/tickets';
import { toast } from 'sonner';
import {
    ChevronLeft,
    User,
    Calendar,
    Tag,
    Flag,
    MessageSquare,
    Send,
    Loader2
} from 'lucide-react';

const TicketDetails = () => {
    const { id } = useParams<{ id: string }>();
    const [ticket, setTicket] = useState<SupportTicket | null>(null);
    const [loading, setLoading] = useState(true);
    const [adminReply, setAdminReply] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTicket = async () => {
            try {
                const response = await api.get(`/support/${id}`);
                setTicket(response.data);
            } catch (error: any) {
                toast.error('Failed to load ticket details');
                navigate('/tickets');
            } finally {
                setLoading(false);
            }
        };

        fetchTicket();
    }, [id]);

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminReply.trim()) return;

        setIsSubmitting(true);
        try {
            await api.patch(`/support/admin/${id}/reply`, {
                adminReply,
                status: 'RESOLVED' // Default to resolved on reply, can be made toggleable
            });
            toast.success('Reply sent and ticket resolved');
            // Refresh ticket data
            const response = await api.get(`/support/${id}`);
            setTicket(response.data);
            setAdminReply('');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to send reply');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                <p className="mt-4 text-gray-500 font-medium">Loading ticket details...</p>
            </div>
        );
    }

    if (!ticket) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            <button
                onClick={() => navigate('/tickets')}
                className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Tickets
            </button>

            <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-indigo-600 tracking-wider">#{ticket.ticketId}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase border ${ticket.status === 'OPEN' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                                    ticket.status === 'IN_PROGRESS' ? 'border-yellow-200 bg-yellow-50 text-yellow-700' :
                                        'border-green-200 bg-green-50 text-green-700'
                                }`}>
                                {ticket.status}
                            </span>
                        </div>
                        <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-6">
                        {/* User Message */}
                        <div className="flex gap-4">
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                                <User className="h-6 w-6" />
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl rounded-tl-none border border-gray-100 flex-1">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-bold text-gray-900">{ticket.user?.firstName} {ticket.user?.lastName}</span>
                                    <span className="text-xs text-gray-400">{new Date(ticket.createdAt).toLocaleString()}</span>
                                </div>
                                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.message}</p>
                            </div>
                        </div>

                        {/* Admin Reply History (if any) */}
                        {ticket.adminReply && (
                            <div className="flex gap-4 flex-row-reverse">
                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 font-bold border border-indigo-200">
                                    A
                                </div>
                                <div className="bg-indigo-50 p-4 rounded-2xl rounded-tr-none border border-indigo-100 flex-1">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-bold text-indigo-900">Admin Response</span>
                                        <span className="text-xs text-indigo-400">{new Date(ticket.updatedAt).toLocaleString()}</span>
                                    </div>
                                    <p className="text-indigo-800 whitespace-pre-wrap leading-relaxed">{ticket.adminReply}</p>
                                </div>
                            </div>
                        )}

                        {/* Reply Form */}
                        <div className="pt-6 border-t border-gray-100">
                            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Send Response
                            </h3>
                            <form onSubmit={handleReply} className="space-y-4">
                                <textarea
                                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm h-32"
                                    placeholder="Type your response to the user..."
                                    value={adminReply}
                                    onChange={(e) => setAdminReply(e.target.value)}
                                    disabled={isSubmitting}
                                />
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-gray-400 font-medium italic">
                                        Submitting will mark this ticket as RESOLVED.
                                    </p>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !adminReply.trim()}
                                        className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all shadow-sm"
                                    >
                                        {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                                        Send Message
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Ticket Metadata</h3>
                            <div className="space-y-4">
                                <div className="flex items-center text-sm">
                                    <Tag className="h-4 w-4 text-gray-400 mr-3" />
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">Category</p>
                                        <p className="font-semibold text-gray-900">{ticket.category}</p>
                                    </div>
                                </div>
                                <div className="flex items-center text-sm">
                                    <Flag className="h-4 w-4 text-gray-400 mr-3" />
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">Priority</p>
                                        <p className={`font-semibold ${ticket.priority === 'URGENT' ? 'text-red-600' :
                                                ticket.priority === 'HIGH' ? 'text-orange-600' :
                                                    'text-gray-900'
                                            }`}>{ticket.priority}</p>
                                    </div>
                                </div>
                                <div className="flex items-center text-sm">
                                    <Calendar className="h-4 w-4 text-gray-400 mr-3" />
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">Created On</p>
                                        <p className="font-semibold text-gray-900">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Requester</h3>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-indigo-600 font-bold border border-gray-200">
                                    {ticket.user?.firstName?.[0] || 'U'}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{ticket.user?.firstName} {ticket.user?.lastName}</p>
                                    <p className="text-xs text-gray-500">{ticket.user?.email}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TicketDetails;
