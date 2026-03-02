import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Users, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardStats {
    totalUsers: number;
    pendingKyc: number;
    activeEscrows: number;
    disputedEscrows: number;
    openTickets: number;
}

const StatsCard = ({ title, value, icon: Icon, color, subtext }: any) => (
    <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
            <div className="flex items-center">
                <div className={`flex-shrink-0 p-3 rounded-md ${color}`}>
                    <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                    <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
                        <dd>
                            <div className="text-lg font-medium text-gray-900">{value}</div>
                        </dd>
                    </dl>
                </div>
            </div>
        </div>
        {subtext && (
            <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                    <span className="text-gray-500">{subtext}</span>
                </div>
            </div>
        )}
    </div>
);

const Dashboard = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/admin/dashboard');
                setStats(response.data);
            } catch (error) {
                console.error('Failed to fetch stats:', error);
                toast.error('Failed to load dashboard statistics');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading statistics...</div>;
    }

    if (!stats) return null;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Users"
                    value={stats.totalUsers}
                    icon={Users}
                    color="bg-indigo-500"
                />
                <StatsCard
                    title="Pending KYC"
                    value={stats.pendingKyc}
                    icon={CheckCircle}
                    color="bg-yellow-500"
                    subtext="Requires verification"
                />
                <StatsCard
                    title="Active Escrows"
                    value={stats.activeEscrows}
                    icon={Clock}
                    color="bg-green-500"
                />
                <StatsCard
                    title="Disputed Escrows"
                    value={stats.disputedEscrows}
                    icon={AlertCircle}
                    color="bg-red-500"
                    subtext="Requires attention"
                />
            </div>

            {/* We can add charts or recent activity lists here later */}
            <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
                <p className="mt-2 text-sm text-gray-500">
                    Display recent user signups, transactions, or system events here.
                </p>
                <div className="mt-4 border-t border-gray-200 pt-4">
                    <div className="text-center text-gray-500 py-8">
                        No recent activity to display (Placeholder)
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
