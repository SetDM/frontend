import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AuthUser } from "@/types";
import { AUTH_ENDPOINTS } from "@/lib/config";
import { AuthContext } from "@/context/AuthContext";
import { apiFetch, type ApiFetchOptions } from "@/lib/apiClient";
import { extractAuthTokenFromUrl, getStoredWorkspaceState, persistWorkspaceState, type StoredWorkspaceAccount, type WorkspaceStorageState } from "@/lib/authToken";

type AuthApiResponse = AuthUser | { user: AuthUser | null } | null;

const extractUser = (payload: AuthApiResponse): AuthUser | null => {
    if (!payload) return null;

    const container = (payload as { user?: AuthUser | null }).user ?? payload;
    if (!container) return null;

    const tokenCandidate =
        typeof (payload as { token?: unknown }).token === "string"
            ? (payload as { token?: string }).token
            : typeof (container as { token?: string }).token === "string"
            ? (container as { token?: string }).token
            : undefined;

    // Check if this is a team member response
    const teamCandidate = container as { isTeamMember?: boolean; id?: string; email?: string; name?: string; role?: string; workspaceId?: string; workspaceUsername?: string | null };
    if (teamCandidate.isTeamMember === true && teamCandidate.id && teamCandidate.email) {
        return {
            id: teamCandidate.id,
            email: teamCandidate.email,
            name: teamCandidate.name || "",
            role: (teamCandidate.role as "admin" | "editor" | "viewer") || "viewer",
            workspaceId: teamCandidate.workspaceId || "",
            workspaceUsername: teamCandidate.workspaceUsername || null,
            lastLoginAt: (container as { lastLoginAt?: string }).lastLoginAt || null,
            token: tokenCandidate,
            isTeamMember: true,
        };
    }

    // Check if this is an Instagram user response
    const candidate = container as { instagramId?: string; username?: string; accountType?: string; lastLoginAt?: string };
    if (typeof candidate.instagramId !== "string" || typeof candidate.username !== "string" || typeof candidate.accountType !== "string" || typeof candidate.lastLoginAt !== "string") {
        return null;
    }

    return {
        instagramId: candidate.instagramId,
        username: candidate.username,
        accountType: candidate.accountType,
        lastLoginAt: candidate.lastLoginAt,
        token: tokenCandidate,
    };
};

interface AuthProviderProps {
    children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [workspaceState, setWorkspaceState] = useState<WorkspaceStorageState>(() => getStoredWorkspaceState());
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

    const hydrateWorkspace = useCallback(async (options?: { instagramId?: string | null; token?: string | null; makeActive?: boolean; silent?: boolean }) => {
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
                        const nextActiveId = prev.activeWorkspaceId === targetId ? Object.keys(nextWorkspaces)[0] ?? null : prev.activeWorkspaceId;
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
                throw new Error("Unable to resolve authenticated account.");
            }

            // Create workspace entry - handle both team members and Instagram users
            const isTeamMemberUser = "isTeamMember" in normalizedUser && normalizedUser.isTeamMember === true;
            const workspaceKey = isTeamMemberUser ? (normalizedUser as { id: string }).id : (normalizedUser as { instagramId: string }).instagramId;

            const workspaceEntry: StoredWorkspaceAccount = isTeamMemberUser
                ? {
                      instagramId: workspaceKey, // Use id as key for storage
                      token: normalizedUser.token ?? tokenToUse,
                      isTeamMember: true,
                      id: (normalizedUser as { id: string }).id,
                      email: (normalizedUser as { email: string }).email,
                      name: (normalizedUser as { name: string }).name,
                      role: (normalizedUser as { role: string }).role,
                      workspaceId: (normalizedUser as { workspaceId: string }).workspaceId,
                      workspaceUsername: (normalizedUser as { workspaceUsername: string | null }).workspaceUsername,
                      lastLoginAt: (normalizedUser as { lastLoginAt: string | null }).lastLoginAt || undefined,
                  }
                : {
                      instagramId: (normalizedUser as { instagramId: string }).instagramId,
                      token: normalizedUser.token ?? tokenToUse,
                      username: (normalizedUser as { username: string }).username,
                      accountType: (normalizedUser as { accountType: string }).accountType,
                      lastLoginAt: (normalizedUser as { lastLoginAt: string }).lastLoginAt,
                  };

            setWorkspaceState((prev) => {
                const nextWorkspaces = { ...prev.workspaces };

                if (options?.instagramId && options.instagramId !== workspaceKey && nextWorkspaces[options.instagramId]) {
                    delete nextWorkspaces[options.instagramId];
                }

                nextWorkspaces[workspaceKey] = workspaceEntry;

                const shouldActivate = options?.makeActive === true || !prev.activeWorkspaceId || prev.activeWorkspaceId === targetId || prev.activeWorkspaceId === workspaceKey;

                return {
                    activeWorkspaceId: shouldActivate ? workspaceKey : prev.activeWorkspaceId,
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
    }, []);

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
        [hydrateWorkspace]
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

    const logout = useCallback(async (instagramId?: string) => {
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
                const nextActiveId = prev.activeWorkspaceId === targetId ? Object.keys(nextWorkspaces)[0] ?? null : prev.activeWorkspaceId;
                return {
                    activeWorkspaceId: nextActiveId,
                    workspaces: nextWorkspaces,
                };
            });
        }
    }, []);

    const redirectToLogin = useCallback(() => {
        if (typeof window === "undefined") {
            return;
        }

        const loginUrl = AUTH_ENDPOINTS.login;
        const userAgent = window.navigator?.userAgent || window.navigator?.vendor || "";
        const isInstagramBrowser = /Instagram/i.test(userAgent);
        const isFacebookBrowser = /(FBAN|FBAV|FB_IAB|Messenger)/i.test(userAgent);
        const isOtherInAppBrowser = /(Line|Twitter|WhatsApp|Snapchat)/i.test(userAgent);
        const isStandalonePwa = (() => {
            const standaloneMedia = window.matchMedia?.("(display-mode: standalone)");
            const isIosStandalone = (window.navigator as typeof window.navigator & { standalone?: boolean })?.standalone;
            return Boolean(standaloneMedia?.matches || isIosStandalone);
        })();

        const shouldForceExternal = isInstagramBrowser || isFacebookBrowser || isOtherInAppBrowser || isStandalonePwa;

        if (shouldForceExternal) {
            const newWindow = window.open(loginUrl, "_blank", "noopener,noreferrer");
            if (newWindow) {
                newWindow.opener = null;
                return;
            }
        }

        window.location.href = loginUrl;
    }, []);

    const clearError = useCallback(() => setError(null), []);

    const switchWorkspace = useCallback(
        async (instagramId: string) => {
            const snapshot = workspaceStateRef.current;
            if (!instagramId || instagramId === snapshot.activeWorkspaceId) {
                return true;
            }

            if (!snapshot.workspaces[instagramId]) {
                return false;
            }

            setWorkspaceState((prev) => ({
                ...prev,
                activeWorkspaceId: instagramId,
            }));

            return refreshUser(instagramId, { silent: true });
        },
        [refreshUser]
    );

    const authorizedFetch = useCallback((input: RequestInfo | URL, options?: Omit<ApiFetchOptions, "authToken">) => {
        const snapshot = workspaceStateRef.current;
        const activeToken = snapshot.activeWorkspaceId ? snapshot.workspaces[snapshot.activeWorkspaceId]?.token : null;
        return apiFetch(input, { ...options, authToken: activeToken ?? undefined });
    }, []);

    const activeWorkspace = useMemo(() => {
        const snapshot = workspaceState;
        if (!snapshot.activeWorkspaceId) {
            return null;
        }
        return snapshot.workspaces[snapshot.activeWorkspaceId] ?? null;
    }, [workspaceState]);

    const user = useMemo((): AuthUser | null => {
        if (!activeWorkspace) {
            return null;
        }
        const { token: _token, ...rest } = activeWorkspace;

        // Return team member user
        if (rest.isTeamMember && rest.id) {
            return {
                id: rest.id,
                email: rest.email || "",
                name: rest.name || "",
                role: (rest.role as "admin" | "editor" | "viewer") || "viewer",
                workspaceId: rest.workspaceId || "",
                workspaceUsername: rest.workspaceUsername || null,
                lastLoginAt: rest.lastLoginAt || null,
                isTeamMember: true,
            };
        }

        // Return Instagram user
        return {
            instagramId: rest.instagramId,
            username: rest.username || "",
            accountType: rest.accountType || "",
            lastLoginAt: rest.lastLoginAt || "",
        };
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
        [user, workspaces, workspaceState.activeWorkspaceId, isLoading, error, authToken, refreshUser, switchWorkspace, redirectToLogin, logout, clearError, authorizedFetch]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
