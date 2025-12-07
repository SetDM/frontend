import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function Login() {
  const { redirectToLogin, user, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  usePageTitle("Login");

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/", { replace: true });
    }
  }, [isLoading, user, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-card">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">Sign in to SetDM</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect your Instagram account to continue.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            <div className="flex items-center justify-between gap-2">
              <span>{error}</span>
              <button
                type="button"
                className="text-xs font-medium underline"
                onClick={clearError}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <Button onClick={redirectToLogin} className="w-full gap-2" size="lg">
          <Instagram className="h-4 w-4" />
          Continue with Instagram
        </Button>
      </div>
    </div>
  );
}
