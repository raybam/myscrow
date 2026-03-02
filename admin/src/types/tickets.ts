import { User } from './auth';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketCategory = 'TECHNICAL' | 'BILLING' | 'GENERAL' | 'DISPUTE' | 'KYC';

export interface SupportTicket {
    id: string;
    ticketId: string;
    category: TicketCategory;
    subject: string;
    message: string;
    status: TicketStatus;
    priority: TicketPriority;
    adminReply?: string;
    isEscalated: boolean;
    createdAt: string;
    updatedAt: string;
    userId: string;
    user?: Partial<User>;
}
