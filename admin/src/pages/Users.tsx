import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { User, Role } from '../types/auth';
import { toast } from 'sonner';
import {
    Search,
    MoreVertical,
    User as UserIcon,
    Shield,
    ShieldAlert,
    Ban,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Eye,
    CheckCircle2,
    XCircle
} from 'lucide-react';

const Users = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/users', {
                params: {
                    page,
                    search,
                    limit: 10
                }
            });
            setUsers(response.data.users);
            setTotalPages(response.data.pagination.pages);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [page]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchUsers();
    };

    const handleUpdateRole = async (userId: string, newRole: Role) => {
        setUpdatingUserId(userId);
        try {
            await api.patch(`/admin/users/${userId}/role`, { role: newRole });
            toast.success('User role updated successfully');
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update user role');
        } finally {
            setUpdatingUserId(null);
        }
    };

    const getRoleBadgeColor = (role: Role) => {
        switch (role) {
            case 'ADMIN': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'SUPPORT': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'BANNED': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getRoleIcon = (role: Role) => {
        switch (role) {
            case 'ADMIN': return <Shield className="h-4 w-4 mr-1" />;
            case 'SUPPORT': return <ShieldAlert className="h-4 w-4 mr-1" />;
            case 'BANNED': return <Ban className="h-4 w-4 mr-1" />;
            default: return <UserIcon className="h-4 w-4 mr-1" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                <form onSubmit={handleSearch} className="flex w-full md:w-96">
                    <div className="relative w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-l-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Email, Username, Name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Search
                    </button>
                </form>
            </div>

            <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KYC Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-3/4"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-1/2"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-1/2"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-1/2"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-1/4 ml-auto"></div></td>
                                </tr>
                            ))
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-gray-500">No users found.</td>
                            </tr>
                        ) : (
                            users.map((u) => (
                                <tr
                                    key={u.id}
                                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/users/${u.id}`)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0 relative">
                                                {u.firstName?.[0] || u.email[0].toUpperCase()}
                                                <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</div>
                                                <div className="text-sm text-gray-500">{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(u.role)}`}>
                                            {getRoleIcon(u.role)}
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {u.kycStatus === 'APPROVED' || u.kycStatus === 'VERIFIED' ? (
                                                <span className="inline-flex items-center text-green-600 text-xs font-bold">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                    VERIFIED
                                                </span>
                                            ) : u.kycStatus === 'REJECTED' ? (
                                                <span className="inline-flex items-center text-red-600 text-xs font-bold">
                                                    <XCircle className="h-3 w-3 mr-1" />
                                                    REJECTED
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">
                                                    {u.kycStatus || 'NONE'}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex flex-col">
                                            <span className={u.isActive ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>
                                                {u.isActive ? 'ACTIVE' : 'SUSPENDED'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/users/${u.id}`);
                                            }}
                                            className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-2 rounded-lg"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {totalPages > 1 && (
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(page + 1)}
                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <button
                                        onClick={() => setPage(Math.max(1, page - 1))}
                                        disabled={page === 1}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                                        disabled={page === totalPages}
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Users;
