import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import {
    TrendingUp, Users, DollarSign, Activity,
    Calendar, ChevronRight, Briefcase, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface SummaryStats {
    totalVolume: number;
    totalRevenue: number;
    activeEscrows: number;
    userGrowth: number;
}

interface TrendData {
    date: string;
    volume: number;
    count: number;
}

interface HealthData {
    [key: string]: number;
}

const COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6'];

const Analytics = () => {
    const [summary, setSummary] = useState<SummaryStats | null>(null);
    const [trends, setTrends] = useState<TrendData[]>([]);
    const [health, setHealth] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);

    useEffect(() => {
        fetchData();
    }, [days]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [summaryRes, trendsRes, healthRes] = await Promise.all([
                axios.get(`${API_URL}/admin/analytics/summary?days=${days}`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/admin/analytics/trends?days=${days}`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/admin/analytics/health`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            setSummary(summaryRes.data);
            setTrends(trendsRes.data);

            // Format health data for PieChart
            const formattedHealth = Object.entries(healthRes.data).map(([name, value]) => ({
                name,
                value
            }));
            setHealth(formattedHealth);

        } catch (error) {
            console.error('Fetch analytics error:', error);
            toast.error('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amt: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amt);
    };

    if (loading && !summary) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
                    <p className="text-gray-500">Monitor your platform's financial health and user growth.</p>
                </div>
                <div className="flex items-center bg-white border rounded-lg p-1 shadow-sm">
                    {[7, 30, 90].map((d) => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${days === d
                                ? 'bg-primary-600 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {d} Days
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center group hover:border-primary-200 transition-colors">
                    <div className="p-3 bg-green-50 rounded-lg text-green-600 group-hover:scale-110 transition-transform">
                        <DollarSign className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Volume</p>
                        <h3 className="text-xl font-bold text-gray-900">{formatCurrency(summary?.totalVolume || 0)}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center group hover:border-primary-200 transition-colors">
                    <div className="p-3 bg-primary-50 rounded-lg text-primary-600 group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Revenue (Fees)</p>
                        <h3 className="text-xl font-bold text-gray-900">{formatCurrency(summary?.totalRevenue || 0)}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center group hover:border-primary-200 transition-colors">
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600 group-hover:scale-110 transition-transform">
                        <Briefcase className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Active Escrows</p>
                        <h3 className="text-xl font-bold text-gray-900">{summary?.activeEscrows}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center group hover:border-primary-200 transition-colors">
                    <div className="p-3 bg-orange-50 rounded-lg text-orange-600 group-hover:scale-110 transition-transform">
                        <Users className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">New Users ({days}d)</p>
                        <h3 className="text-xl font-bold text-gray-900">{summary?.userGrowth}</h3>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Volume Trend Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary-600" />
                            Transaction Volume Trend
                        </h3>
                    </div>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trends}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    tickFormatter={(val) => `₦${val / 1000}k`}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Volume']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="volume"
                                    stroke="#3B82F6"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Health Pie Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                        Escrow Status Distribution
                    </h3>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={health}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {health.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Bottom Section - Transaction Count Bar Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary-600" />
                    Daily Transaction Velocity
                </h3>
                <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trends}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                            />
                            <Tooltip
                                cursor={{ fill: '#F9FAFB' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                            />
                            <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
