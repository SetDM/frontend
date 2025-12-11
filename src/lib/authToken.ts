const AUTH_TOKEN_STORAGE_KEY = "setdm_auth_token";
const WORKSPACE_STORAGE_KEY = "setdm_workspace_state";
const AUTH_TOKEN_QUERY_PARAM = "token";
const LEGACY_WORKSPACE_ID = "__legacy__";

const getWindow = () => (typeof window === "undefined" ? null : window);

export interface StoredWorkspaceAccount {
  instagramId: string;
  token: string;
  username?: string;
  accountType?: string;
  lastLoginAt?: string;
}

export interface WorkspaceStorageState {
  activeWorkspaceId: string | null;
  workspaces: Record<string, StoredWorkspaceAccount>;
}

const getDefaultWorkspaceState = (): WorkspaceStorageState => ({
  activeWorkspaceId: null,
  workspaces: {},
});

const sanitizeWorkspaceEntry = (entry: unknown): StoredWorkspaceAccount | null => {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const record = entry as Partial<StoredWorkspaceAccount> & { instagramId?: unknown; token?: unknown };
  if (typeof record.instagramId !== "string" || typeof record.token !== "string") {
    return null;
  }

  return {
    instagramId: record.instagramId,
    token: record.token,
    username: typeof record.username === "string" ? record.username : undefined,
    accountType: typeof record.accountType === "string" ? record.accountType : undefined,
    lastLoginAt: typeof record.lastLoginAt === "string" ? record.lastLoginAt : undefined,
  };
};

export const getStoredWorkspaceState = (): WorkspaceStorageState => {
  const win = getWindow();
  if (!win) {
    return getDefaultWorkspaceState();
  }

  try {
    const raw = win.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) {
      const legacyToken = win.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      if (legacyToken) {
        return {
          activeWorkspaceId: LEGACY_WORKSPACE_ID,
          workspaces: {
            [LEGACY_WORKSPACE_ID]: {
              instagramId: LEGACY_WORKSPACE_ID,
              token: legacyToken,
            },
          },
        };
      }
      return getDefaultWorkspaceState();
    }

    const parsed = JSON.parse(raw) as Partial<WorkspaceStorageState> & {
      workspaces?: Record<string, unknown>;
    } | null;

    if (!parsed || typeof parsed !== "object") {
      return getDefaultWorkspaceState();
    }

    const workspaces = Object.values(parsed.workspaces ?? {}).reduce<Record<string, StoredWorkspaceAccount>>(
      (acc, candidate) => {
        const sanitized = sanitizeWorkspaceEntry(candidate);
        if (sanitized) {
          acc[sanitized.instagramId] = sanitized;
        }
        return acc;
      },
      {},
    );

    const fallbackActiveId = Object.keys(workspaces)[0] ?? null;
    const requestedActiveId =
      typeof parsed.activeWorkspaceId === "string" && parsed.activeWorkspaceId.length
        ? parsed.activeWorkspaceId
        : null;
    const activeWorkspaceId =
      requestedActiveId && workspaces[requestedActiveId] ? requestedActiveId : fallbackActiveId;

    return {
      activeWorkspaceId,
      workspaces,
    };
  } catch {
    return getDefaultWorkspaceState();
  }
};

export const persistWorkspaceState = (state: WorkspaceStorageState) => {
  const win = getWindow();
  if (!win) {
    return;
  }

  try {
    win.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(state));
    win.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
};

export const clearWorkspaceState = () => {
  persistWorkspaceState(getDefaultWorkspaceState());
};

export const getStoredAuthToken = (): string | null => {
  const state = getStoredWorkspaceState();
  if (state.activeWorkspaceId) {
    const entry = state.workspaces[state.activeWorkspaceId];
    if (entry?.token) {
      return entry.token;
    }
  }

  const win = getWindow();
  if (!win) {
    return null;
  }

  try {
    return win.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const persistAuthToken = (token: string | null) => {
  if (!token) {
    clearWorkspaceState();
    return;
  }

  const snapshot = getStoredWorkspaceState();
  const activeWorkspaceId = snapshot.activeWorkspaceId ?? LEGACY_WORKSPACE_ID;
  const nextState: WorkspaceStorageState = {
    activeWorkspaceId,
    workspaces: {
      ...snapshot.workspaces,
      [activeWorkspaceId]: {
        instagramId: activeWorkspaceId,
        token,
        username: snapshot.workspaces[activeWorkspaceId]?.username,
        accountType: snapshot.workspaces[activeWorkspaceId]?.accountType,
        lastLoginAt: snapshot.workspaces[activeWorkspaceId]?.lastLoginAt,
      },
    },
  };

  persistWorkspaceState(nextState);
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
