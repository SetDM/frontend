import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AuthUser } from "@/types";
import { AUTH_ENDPOINTS } from "@/lib/config";
import { AuthContext } from "@/context/AuthContext";
import { apiFetch, type ApiFetchOptions } from "@/lib/apiClient";
import {
  extractAuthTokenFromUrl,
  getStoredWorkspaceState,
  persistWorkspaceState,
  type StoredWorkspaceAccount,
  type WorkspaceStorageState,
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
  const [workspaceState, setWorkspaceState] = useState<WorkspaceStorageState>(() =>
    getStoredWorkspaceState(),
  );
  const workspaceStateRef = useRef(workspaceState);
  const [pendingToken, setPendingToken] = useState<string | null>(() => extractAuthTokenFromUrl());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    workspaceStateRef.current = workspaceState;
  }, [workspaceState]);

  useEffect(() => {
    persistWorkspaceState(workspaceState);
  }, [workspaceState]);

  const hydrateWorkspace = useCallback(
    async (options?: {
      instagramId?: string | null;
      token?: string | null;
      makeActive?: boolean;
      silent?: boolean;
    }) => {
      const snapshot = workspaceStateRef.current;
      const targetId = options?.instagramId ?? snapshot.activeWorkspaceId;
      const tokenFromState = targetId ? snapshot.workspaces[targetId]?.token : null;
      const tokenToUse = options?.token ?? tokenFromState;

      if (!tokenToUse) {
        if (!options?.silent) {
          setIsLoading(false);
        }
        return false;
      }

      if (!options?.silent) {
        setIsLoading(true);
      }

      try {
        const response = await apiFetch(AUTH_ENDPOINTS.me, {
          authToken: tokenToUse,
        });

        if (!response.ok) {
          if (response.status === 401 && targetId) {
            setWorkspaceState((prev) => {
              const nextWorkspaces = { ...prev.workspaces };
              delete nextWorkspaces[targetId];
              const nextActiveId =
                prev.activeWorkspaceId === targetId
                  ? Object.keys(nextWorkspaces)[0] ?? null
                  : prev.activeWorkspaceId;
              return {
                activeWorkspaceId: nextActiveId,
                workspaces: nextWorkspaces,
              };
            });
          }
          throw new Error("Unable to fetch the current user.");
        }

        const data = (await response.json()) as AuthApiResponse & { token?: string };
        const normalizedUser = extractUser(data);

        if (!normalizedUser) {
          throw new Error("Unable to resolve authenticated Instagram account.");
        }

        const workspaceEntry: StoredWorkspaceAccount = {
          ...normalizedUser,
          token: normalizedUser.token ?? tokenToUse,
        };

        setWorkspaceState((prev) => {
          const nextWorkspaces = { ...prev.workspaces };

          if (
            options?.instagramId &&
            options.instagramId !== workspaceEntry.instagramId &&
            nextWorkspaces[options.instagramId]
          ) {
            delete nextWorkspaces[options.instagramId];
          }

          nextWorkspaces[workspaceEntry.instagramId] = workspaceEntry;

          const shouldActivate =
            options?.makeActive === true ||
            !prev.activeWorkspaceId ||
            prev.activeWorkspaceId === targetId ||
            prev.activeWorkspaceId === workspaceEntry.instagramId;

          return {
            activeWorkspaceId: shouldActivate ? workspaceEntry.instagramId : prev.activeWorkspaceId,
            workspaces: nextWorkspaces,
          };
        });

        setError(null);
        return true;
      } catch (err) {
        console.error("Failed to hydrate workspace", err);
        if (!options?.silent) {
          setError(err instanceof Error ? err.message : "Unknown authentication error.");
        }
        return false;
      } finally {
        if (!options?.silent) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  const refreshUser = useCallback(
    async (instagramId?: string, options?: { silent?: boolean }) => {
      const snapshot = workspaceStateRef.current;
      const targetId = instagramId ?? snapshot.activeWorkspaceId;

      if (!targetId) {
        if (!options?.silent) {
          setIsLoading(false);
        }
        return false;
      }

      return hydrateWorkspace({ instagramId: targetId, makeActive: true, silent: options?.silent });
    },
    [hydrateWorkspace],
  );

  useEffect(() => {
    if (!pendingToken) {
      return;
    }

    let cancelled = false;

    const attachWorkspace = async () => {
      await hydrateWorkspace({ token: pendingToken, makeActive: true });
      if (!cancelled) {
        setPendingToken(null);
      }
    };

    attachWorkspace();

    return () => {
      cancelled = true;
    };
  }, [pendingToken, hydrateWorkspace]);

  useEffect(() => {
    if (pendingToken) {
      return;
    }

    refreshUser();
  }, [pendingToken, refreshUser]);

  const logout = useCallback(
    async (instagramId?: string) => {
      const snapshot = workspaceStateRef.current;
      const targetId = instagramId ?? snapshot.activeWorkspaceId;
      if (!targetId) {
        return;
      }

      const token = snapshot.workspaces[targetId]?.token;

      try {
        await apiFetch(AUTH_ENDPOINTS.logout, {
          method: "POST",
          authToken: token,
        });
      } catch (err) {
        console.error("Failed to logout", err);
      } finally {
        setWorkspaceState((prev) => {
          const nextWorkspaces = { ...prev.workspaces };
          delete nextWorkspaces[targetId];
          const nextActiveId =
            prev.activeWorkspaceId === targetId ? Object.keys(nextWorkspaces)[0] ?? null : prev.activeWorkspaceId;
          return {
            activeWorkspaceId: nextActiveId,
            workspaces: nextWorkspaces,
          };
        });
      }
    },
    []);

  const redirectToLogin = useCallback(() => {
    window.location.href = AUTH_ENDPOINTS.login;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const switchWorkspace = useCallback(
    async (instagramId: string) => {
      if (!instagramId || instagramId === workspaceStateRef.current.activeWorkspaceId) {
        return true;
      }

      if (!workspaceStateRef.current.workspaces[instagramId]) {
        return false;
      }

      setWorkspaceState((prev) => ({
        ...prev,
        activeWorkspaceId: instagramId,
      }));

      return refreshUser(instagramId, { silent: true });
    },
    [refreshUser],
  );

  const authorizedFetch = useCallback(
    (input: RequestInfo | URL, options?: Omit<ApiFetchOptions, "authToken">) => {
      const snapshot = workspaceStateRef.current;
      const activeToken = snapshot.activeWorkspaceId
        ? snapshot.workspaces[snapshot.activeWorkspaceId]?.token
        : null;
      return apiFetch(input, { ...options, authToken: activeToken ?? undefined });
    },
    [],
  );

  const activeWorkspace = useMemo(() => {
    const snapshot = workspaceState;
    if (!snapshot.activeWorkspaceId) {
      return null;
    }
    return snapshot.workspaces[snapshot.activeWorkspaceId] ?? null;
  }, [workspaceState]);

  const user = useMemo(() => {
    if (!activeWorkspace) {
      return null;
    }
    const { token: _token, ...rest } = activeWorkspace;
    return rest;
  }, [activeWorkspace]);

  const authToken = activeWorkspace?.token ?? null;

  const workspaces = useMemo(() => {
    const resolveTimestamp = (value?: string) => {
      if (!value) {
        return 0;
      }
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    return Object.values(workspaceState.workspaces)
      .map((workspace) => {
        const { token: _token, ...rest } = workspace;
        return rest;
      })
      .sort((a, b) => resolveTimestamp(b.lastLoginAt) - resolveTimestamp(a.lastLoginAt));
  }, [workspaceState.workspaces]);

  const value = useMemo(
    () => ({
      user,
      workspaces,
      activeWorkspaceId: workspaceState.activeWorkspaceId,
      isLoading,
      error,
      authToken,
      refreshUser,
      switchWorkspace,
      redirectToLogin,
      logout,
      clearError,
      authorizedFetch,
    }),
    [
      user,
      workspaces,
      workspaceState.activeWorkspaceId,
      isLoading,
      error,
      authToken,
      refreshUser,
      switchWorkspace,
      redirectToLogin,
      logout,
      clearError,
      authorizedFetch,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
