const AUTH_TOKEN_STORAGE_KEY = "setdm_auth_token";
const AUTH_TOKEN_QUERY_PARAM = "token";

const getWindow = () => (typeof window === "undefined" ? null : window);

export const getStoredAuthToken = (): string | null => {
  const win = getWindow();
  if (!win) return null;

  try {
    return win.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const persistAuthToken = (token: string | null) => {
  const win = getWindow();
  if (!win) return;

  try {
    if (token) {
      win.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    } else {
      win.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage failures (private mode, etc.)
  }
};

export const extractAuthTokenFromUrl = (): string | null => {
  const win = getWindow();
  if (!win) return null;

  try {
    const url = new URL(win.location.href);
    const token = url.searchParams.get(AUTH_TOKEN_QUERY_PARAM);

    if (token) {
      url.searchParams.delete(AUTH_TOKEN_QUERY_PARAM);
      win.history.replaceState({}, "", url.toString());
    }

    return token;
  } catch {
    return null;
  }
};

export { AUTH_TOKEN_STORAGE_KEY, AUTH_TOKEN_QUERY_PARAM };
