import { createContext } from "react";
import type { AuthUser } from "@/types";
import type { ApiFetchOptions } from "@/lib/apiClient";

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  authToken: string | null;
  refreshUser: () => Promise<boolean>;
  redirectToLogin: () => void;
  logout: () => Promise<void>;
  clearError: () => void;
  authorizedFetch: (input: RequestInfo | URL, options?: Omit<ApiFetchOptions, "authToken">) => Promise<Response>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
