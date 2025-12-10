import { useCallback, useEffect, useMemo, useState } from "react";
import type { AuthUser } from "@/types";
import { AUTH_ENDPOINTS } from "@/lib/config";
import { AuthContext } from "@/context/AuthContext";
import { apiFetch, type ApiFetchOptions } from "@/lib/apiClient";
import {
  extractAuthTokenFromUrl,
  getStoredAuthToken,
  persistAuthToken,
} from "@/lib/authToken";

type AuthApiResponse = AuthUser | { user: AuthUser | null } | null;

const extractUser = (payload: AuthApiResponse): AuthUser | null => {
  if (!payload) return null;

  const container = (payload as { user?: AuthUser | null }).user ?? payload;
  if (!container) return null;

  const candidate = container as Partial<AuthUser>;
  if (
    typeof candidate.instagramId !== "string" ||
    typeof candidate.username !== "string" ||
    typeof candidate.accountType !== "string" ||
    typeof candidate.lastLoginAt !== "string"
  ) {
    return null;
  }

  const tokenCandidate =
    typeof (payload as { token?: unknown }).token === "string"
      ? ((payload as { token?: string }).token)
      : typeof candidate.token === "string"
        ? candidate.token
        : undefined;

  return {
    ...candidate,
    token: tokenCandidate,
  } as AuthUser;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthTokenState] = useState<string | null>(() => {
    const tokenFromUrl = extractAuthTokenFromUrl();
    if (tokenFromUrl) {
      persistAuthToken(tokenFromUrl);
      return tokenFromUrl;
    }

    return getStoredAuthToken();
  });

  const setAuthToken = useCallback((token: string | null) => {
    setAuthTokenState(token);
    persistAuthToken(token);
  }, []);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const tokenToUse = authToken ?? getStoredAuthToken();
      const response = await apiFetch(AUTH_ENDPOINTS.me, {
        authToken: tokenToUse ?? undefined,
      });

      if (!response.ok) {
        if (response.status === 401) {
          setUser(null);
          setError(null);
          setAuthToken(null);
          return false;
        }
        throw new Error("Unable to fetch the current user.");
      }

      const data = (await response.json()) as AuthApiResponse & { token?: string };
      const normalizedUser = extractUser(data);

      if (!normalizedUser) {
        setUser(null);
        setError(null);
        return false;
      }

      setUser(normalizedUser);
      if (normalizedUser.token) {
        setAuthToken(normalizedUser.token);
      }
      setError(null);
      return true;
    } catch (err) {
      console.error("Failed to refresh auth session", err);
      setUser(null);
      setError(err instanceof Error ? err.message : "Unknown authentication error.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [authToken, setAuthToken]);

  const logout = useCallback(async () => {
    try {
      await apiFetch(AUTH_ENDPOINTS.logout, {
        method: "POST",
      });
    } catch (err) {
      console.error("Failed to logout", err);
    } finally {
      setUser(null);
      setAuthToken(null);
    }
  }, [setAuthToken]);

  const redirectToLogin = useCallback(() => {
    window.location.href = AUTH_ENDPOINTS.login;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const resolvedToken = useMemo(() => {
    return authToken ?? user?.token ?? getStoredAuthToken();
  }, [authToken, user?.token]);

  const authorizedFetch = useCallback(
    (input: RequestInfo | URL, options?: Omit<ApiFetchOptions, "authToken">) => {
      return apiFetch(input, { ...options, authToken: resolvedToken ?? undefined });
    },
    [resolvedToken],
  );

  const value = useMemo(
    () => ({
      user,
      isLoading,
      error,
      authToken: resolvedToken ?? null,
      refreshUser,
      redirectToLogin,
      logout,
      clearError,
      authorizedFetch,
    }),
    [
      user,
      isLoading,
      error,
      resolvedToken,
      refreshUser,
      redirectToLogin,
      logout,
      clearError,
      authorizedFetch,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
