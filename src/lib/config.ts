export const BACKEND_URL = "https://backend-0mvi.onrender.com";
export const API_BASE_URL = `${BACKEND_URL}/api`;

export const AUTH_ENDPOINTS = {
  login: `${API_BASE_URL}/auth/instagram`,
  me: `${API_BASE_URL}/auth/me`,
  logout: `${API_BASE_URL}/auth/logout`,
};

export const CONVERSATION_ENDPOINTS = {
  list: `${API_BASE_URL}/conversations`,
  metrics: `${API_BASE_URL}/conversations/metrics`,
  detail: (conversationId: string) => `${API_BASE_URL}/conversations/${conversationId}`,
  autopilot: (conversationId: string) => `${API_BASE_URL}/conversations/${conversationId}/autopilot`,
  sendMessage: (conversationId: string) => `${API_BASE_URL}/conversations/${conversationId}/messages`,
  notes: (conversationId: string) => `${API_BASE_URL}/conversations/${conversationId}/notes`,
  sendQueuedMessageNow: (conversationId: string, queuedMessageId: string) =>
    `${API_BASE_URL}/conversations/${conversationId}/queue/${queuedMessageId}/send-now`,
  cancelQueuedMessage: (conversationId: string, queuedMessageId: string) =>
    `${API_BASE_URL}/conversations/${conversationId}/queue/${queuedMessageId}`,
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
