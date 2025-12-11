import { createContext } from "react";
import type { AuthUser } from "@/types";
import type { ApiFetchOptions } from "@/lib/apiClient";

export interface AuthContextValue {
  user: AuthUser | null;
  workspaces: AuthUser[];
  activeWorkspaceId: string | null;
  isLoading: boolean;
  error: string | null;
  authToken: string | null;
  refreshUser: (instagramId?: string, options?: { silent?: boolean }) => Promise<boolean>;
  switchWorkspace: (instagramId: string) => Promise<boolean>;
  redirectToLogin: () => void;
  logout: (instagramId?: string) => Promise<void>;
  clearError: () => void;
  authorizedFetch: (input: RequestInfo | URL, options?: Omit<ApiFetchOptions, "authToken">) => Promise<Response>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
