export type FunnelStage = 
  | 'responded'
  | 'lead'
  | 'qualified'
  | 'call-booked'
  | 'sale'
  | 'flagged';

export interface AuthUser {
  instagramId: string;
  username: string;
  accountType: string;
  lastLoginAt: string;
  token?: string;
}

export interface Prospect {
  id: string;
  instagramId: string;
  name: string;
  username?: string | null;
  handle: string;
  avatar: string;
  profilePic?: string | null;
  stage: FunnelStage;
  followers: number;
  followerCount?: number | null;
  following: number;
  leadScore: number;
  autopilotEnabled: boolean;
  isUserFollowBusiness?: boolean | null;
  isBusinessFollowUser?: boolean | null;
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
  id: string;
  prospect: Prospect;
  messages: Message[];
  aiNotes: string[];
  queuedMessage?: {
    content: string;
    sendsIn: number; // seconds
  };
}

export interface ConversationMessageRecord {
  content?: string;
  role?: 'assistant' | 'user';
  timestamp?: string | number | Date;
  metadata?: {
    mid?: string;
    [key: string]: unknown;
  };
}

export interface ConversationRecord {
  id?: string;
  conversationId?: string;
  senderId?: string;
  recipientId?: string;
  stageTag?: string | null;
  lastUpdated?: string;
  messages?: ConversationMessageRecord[];
  metadata?: Record<string, unknown>;
  aiNotes?: string[];
  queuedMessage?: {
    content: string;
    sendsIn: number;
  };
  isAutopilotOn?: boolean;
}

export interface InstagramUserProfile {
  id?: string | null;
  instagramId: string;
  username?: string | null;
  name?: string | null;
  profilePic?: string | null;
  followerCount?: number | null;
  isUserFollowBusiness?: boolean | null;
  isBusinessFollowUser?: boolean | null;
  source?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
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
