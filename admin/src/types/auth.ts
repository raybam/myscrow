export type Role = 'USER' | 'ADMIN' | 'SUPPORT' | 'BANNED';

export interface User {
    id: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    role: Role;
    isActive: boolean;
    isProfileComplete: boolean;
    kycStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_SUBMITTED';
}

export interface LoginResponse {
    message: string;
    user: User;
    token: string;
}
