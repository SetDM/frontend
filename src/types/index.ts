export type FunnelStage = "responded" | "lead" | "qualified" | "booking-sent" | "call-booked" | "sale" | "flagged";

// Instagram user (workspace owner)
export interface InstagramAuthUser {
    instagramId: string;
    username: string;
    accountType: string;
    lastLoginAt: string;
    token?: string;
    isTeamMember?: false;
}

// Team member user
export interface TeamMemberAuthUser {
    id: string;
    email: string;
    name: string;
    role: "admin" | "editor" | "viewer";
    workspaceId: string;
    workspaceUsername: string | null;
    lastLoginAt: string | null;
    token?: string;
    isTeamMember: true;
}

// Union type for auth users
export type AuthUser = InstagramAuthUser | TeamMemberAuthUser;

// Helper to check if user is team member
export const isTeamMember = (user: AuthUser | null): user is TeamMemberAuthUser => {
    return user !== null && "isTeamMember" in user && user.isTeamMember === true;
};

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
    status?: "sent" | "delivered" | "seen";
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
    role?: "assistant" | "user";
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
    enabled: boolean;
    mode: "off" | "lead-capture" | "full";
    replyWindowStart: string;
    replyWindowEnd: string;
    responseDelayValue: number;
    responseDelayUnit: "seconds" | "minutes" | "hours" | "days";
    handleStoryReplies: boolean;
    handleCTAReplies: boolean;
    handleColdDMs: boolean;
    handoffInjuries: boolean;
    handoffAngry: boolean;
    handoffQualified: boolean;
}

export interface WorkspaceEntryPointsSettings {
    triggerExamples: string[];
}

export interface WorkspaceIgnoreRulesSettings {
    ignorePatterns: string[];
}

export interface WorkspaceFiltersSettings {
    minAge: number;
    minFollowers: number | null;
    hidePrivateAccounts: boolean;
    blockedCountries: string[];
    allowedCountries: string[];
    allowedLanguages: string[];
}

export interface WorkspaceNotificationSettings {
    notifyQualified: boolean;
    notifyCallBooked: boolean;
    notifyNeedsReview: boolean;
    notifyWhenFlag: boolean;
    digestFrequency: "realtime" | "hourly" | "daily";
}

export interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: "admin" | "editor" | "viewer";
    isOwner?: boolean;
}

export interface WorkspaceTeamSettings {
    members: TeamMember[];
}

export interface WorkspaceSettings {
    profile: WorkspaceProfileSettings;
    autopilot: WorkspaceAutopilotSettings;
    entryPoints: WorkspaceEntryPointsSettings;
    ignoreRules: WorkspaceIgnoreRulesSettings;
    filters: WorkspaceFiltersSettings;
    notifications: WorkspaceNotificationSettings;
    team: WorkspaceTeamSettings;
}
