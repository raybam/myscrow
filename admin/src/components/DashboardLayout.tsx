import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import {
    LayoutDashboard,
    Users,
    MessageSquare,
    AlertCircle,
    LogOut,
    Menu,
    X,
    Shield,
    BarChart3,
    Percent
} from 'lucide-react';

const DashboardLayout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Analytics', href: '/analytics', icon: BarChart3, role: ['ADMIN'] },
        { name: 'Users', href: '/users', icon: Users, role: ['ADMIN'] },
        { name: 'Support Tickets', href: '/tickets', icon: MessageSquare }, // Admin & Support
        { name: 'Disputes', href: '/disputes', icon: AlertCircle }, // Admin & Support
        { name: 'Commission', href: '/settings/commission', icon: Percent, role: ['ADMIN'] },
    ];

    const filteredNavigation = navigation.filter(item =>
        !item.role || (user && item.role.includes(user.role))
    );

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Sidebar for Desktop */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-indigo-900 text-white transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between h-16 px-4 bg-indigo-800">
                    <div className="flex items-center space-x-2">
                        <Shield className="h-8 w-8 text-indigo-400" />
                        <span className="text-xl font-bold">MyScrow Admin</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-4 border-b border-indigo-800">
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center text-lg font-bold">
                            {user?.firstName?.[0] || 'A'}
                        </div>
                        <div>
                            <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                            <p className="text-xs text-indigo-300 capitalize">{user?.role?.toLowerCase()}</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-2 py-4 space-y-1">
                    {filteredNavigation.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${isActive
                                    ? 'bg-indigo-700 text-white'
                                    : 'text-indigo-100 hover:bg-indigo-800'
                                    }`}
                                onClick={() => setIsSidebarOpen(false)}
                            >
                                <Icon className="mr-3 h-5 w-5" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-indigo-800">
                    <button
                        onClick={logout}
                        className="flex w-full items-center px-4 py-2 text-sm font-medium text-red-300 hover:text-red-100 hover:bg-red-900/30 rounded-md transition-colors"
                    >
                        <LogOut className="mr-3 h-5 w-5" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <header className="md:hidden bg-white shadow-sm flex items-center justify-between px-4 h-16">
                    <button onClick={() => setIsSidebarOpen(true)} className="text-gray-500 focus:outline-none">
                        <Menu className="h-6 w-6" />
                    </button>
                    <span className="text-lg font-bold text-gray-900">Admin Dashboard</span>
                    <div className="w-6" /> {/* Spacer */}
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <Outlet />
                </main>
            </div>

            {/* Overlay for mobile sidebar */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
        </div>
    );
};

export default DashboardLayout;
