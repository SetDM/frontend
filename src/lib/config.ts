export const BACKEND_URL = "https://backend-0mvi.onrender.com";
export const API_BASE_URL = `${BACKEND_URL}/api`;

export const AUTH_ENDPOINTS = {
  login: `${API_BASE_URL}/auth/instagram`,
  me: `${API_BASE_URL}/auth/me`,
  logout: `${API_BASE_URL}/auth/logout`,
};
