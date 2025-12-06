export const BACKEND_URL = "https://backend-0mvi.onrender.com";
export const API_BASE_URL = `${BACKEND_URL}/api`;

export const AUTH_ENDPOINTS = {
  login: `${API_BASE_URL}/auth/instagram`,
  me: `${API_BASE_URL}/auth/me`,
  logout: `${API_BASE_URL}/auth/logout`,
};

export const CONVERSATION_ENDPOINTS = {
  list: `${API_BASE_URL}/conversations`,
  autopilot: (conversationId: string) => `${API_BASE_URL}/conversations/${conversationId}/autopilot`,
};

export const USER_ENDPOINTS = {
  profile: (instagramId: string) => `${API_BASE_URL}/users/${instagramId}`,
};
