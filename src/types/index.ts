export type FunnelStage = 
  | 'responded'
  | 'lead'
  | 'qualified'
  | 'call-booked'
  | 'sale'
  | 'ignored'
  | 'unread';

export interface AuthUser {
  instagramId: string;
  username: string;
  accountType: string;
  lastLoginAt: string;
  token?: string;
}

export interface Prospect {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  stage: FunnelStage;
  followers: number;
  following: number;
  leadScore: number;
  autopilotEnabled: boolean;
  lastMessage: string;
  lastMessageTime: string;
  isUnread: boolean;
}

export interface Message {
  id: string;
  content: string;
  timestamp: string;
  isFromProspect: boolean;
  status?: 'sent' | 'delivered' | 'seen';
}

export interface Conversation {
  prospect: Prospect;
  messages: Message[];
  aiNotes: string[];
  queuedMessage?: {
    content: string;
    sendsIn: number; // seconds
  };
}

export interface DashboardStats {
  ongoingChats: number;
  autopilotEnabled: number;
  needsReview: number;
  inFollowupSequence: number;
}

export interface FunnelData {
  responded: number;
  lead: number;
  qualified: number;
  callBooked: number;
  sale: number;
}
