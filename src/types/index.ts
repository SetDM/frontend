export type FunnelStage = 
  | 'responded'
  | 'lead'
  | 'qualified'
  | 'booking-sent'
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
  isFlagged?: boolean;
}

export interface Message {
  id: string;
  content: string;
  timestamp: string;
  isFromProspect: boolean;
  status?: 'sent' | 'delivered' | 'seen';
  isAiGenerated?: boolean;
}

export interface Conversation {
  id: string;
  prospect: Prospect;
  messages: Message[];
  aiNotes: string[];
  queuedMessages: QueuedMessage[];
  hasMoreMessages?: boolean;
  loadedMessageLimit?: number | null;
}

export interface ConversationMessageRecord {
  content?: string;
  role?: 'assistant' | 'user';
  timestamp?: string | number | Date;
  metadata?: {
    mid?: string;
    [key: string]: unknown;
  };
  isAiGenerated?: boolean;
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
  queuedMessages?: QueuedMessageRecord[];
  isAutopilotOn?: boolean;
  isFlagged?: boolean;
}

export interface QueuedMessageRecord {
  id?: string;
  content?: string;
  scheduledFor?: string;
  createdAt?: string;
  delayMs?: number;
}

export interface QueuedMessage {
  id: string;
  content: string;
  scheduledFor: string | null;
  sendsIn: number; // seconds
  delayMs?: number;
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
  bookingSent?: number;
  callBooked: number;
  sale: number;
}

export interface WorkspaceProfileSettings {
  coachName: string;
  brandName: string;
  calendarLink: string;
}

export interface WorkspaceAutopilotSettings {
  mode: 'off' | 'lead-capture' | 'full';
  replyWindowStart: string;
  replyWindowEnd: string;
  handleStoryReplies: boolean;
  handleCTAReplies: boolean;
  handleColdDMs: boolean;
  handoffInjuries: boolean;
  handoffAngry: boolean;
  handoffQualified: boolean;
}

export interface WorkspaceFiltersSettings {
  minAge: number;
  minFollowers: number | null;
  hidePrivateAccounts: boolean;
  allowedCountries: string[];
  allowedLanguages: string[];
}

export interface WorkspaceNotificationSettings {
  notifyQualified: boolean;
  notifyCallBooked: boolean;
  notifyNeedsReview: boolean;
  digestFrequency: 'realtime' | 'hourly' | 'daily';
}

export interface WorkspaceSettings {
  profile: WorkspaceProfileSettings;
  autopilot: WorkspaceAutopilotSettings;
  filters: WorkspaceFiltersSettings;
  notifications: WorkspaceNotificationSettings;
}
