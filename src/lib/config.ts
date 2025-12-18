export const BACKEND_URL = "https://backend-0mvi.onrender.com";
export const API_BASE_URL = `${BACKEND_URL}/api`;

export const AUTH_ENDPOINTS = {
    login: `${API_BASE_URL}/auth/instagram`,
    me: `${API_BASE_URL}/auth/me`,
    logout: `${API_BASE_URL}/auth/logout`,
    unlink: `${API_BASE_URL}/auth/unlink`,
};

export const CONVERSATION_ENDPOINTS = {
    list: `${API_BASE_URL}/conversations`,
    metrics: `${API_BASE_URL}/conversations/metrics`,
    detail: (conversationId: string) => `${API_BASE_URL}/conversations/${conversationId}`,
    autopilot: (conversationId: string) => `${API_BASE_URL}/conversations/${conversationId}/autopilot`,
    sendMessage: (conversationId: string) => `${API_BASE_URL}/conversations/${conversationId}/messages`,
    notes: (conversationId: string) => `${API_BASE_URL}/conversations/${conversationId}/notes`,
    sendQueuedMessageNow: (conversationId: string, queuedMessageId: string) => `${API_BASE_URL}/conversations/${conversationId}/queue/${queuedMessageId}/send-now`,
    cancelQueuedMessage: (conversationId: string, queuedMessageId: string) => `${API_BASE_URL}/conversations/${conversationId}/queue/${queuedMessageId}`,
    clearFlag: (conversationId: string) => `${API_BASE_URL}/conversations/${conversationId}/flag`,
};

export const USER_ENDPOINTS = {
    profile: (instagramId: string) => `${API_BASE_URL}/users/${instagramId}`,
};

export const PROMPT_ENDPOINTS = {
    system: `${API_BASE_URL}/prompts/system`,
    user: `${API_BASE_URL}/prompts/user`,
    userTest: `${API_BASE_URL}/prompts/user/test`,
};

export const SETTINGS_ENDPOINTS = {
    workspace: `${API_BASE_URL}/settings`,
};

export const FOLLOWER_ADMIN_ENDPOINTS = {
    importCsv: `${API_BASE_URL}/admin/followers/import`,
    enrich: (instagramId: string) => `${API_BASE_URL}/admin/followers/${instagramId}/enrich`,
};

// Netlify function for sending emails (Gmail via nodemailer)
export const EMAIL_FUNCTION_URL = "/.netlify/functions/send-email";

export const TEAM_ENDPOINTS = {
    // Invites
    createInvite: `${API_BASE_URL}/team/invites`,
    listInvites: `${API_BASE_URL}/team/invites`,
    deleteInvite: (inviteId: string) => `${API_BASE_URL}/team/invites/${inviteId}`,
    validateInvite: (token: string) => `${API_BASE_URL}/team/invites/validate/${token}`,
    acceptInvite: (token: string) => `${API_BASE_URL}/team/invites/accept/${token}`,

    // Members
    listMembers: `${API_BASE_URL}/team/members`,
    updateMember: (memberId: string) => `${API_BASE_URL}/team/members/${memberId}`,
    removeMember: (memberId: string) => `${API_BASE_URL}/team/members/${memberId}`,

    // Auth
    getWorkspaces: `${API_BASE_URL}/team/auth/workspaces`,
    requestLogin: `${API_BASE_URL}/team/auth/request-login`,
    loginWithToken: (token: string) => `${API_BASE_URL}/team/auth/login/${token}`,
};
