import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function AuthError() {
  const location = useLocation();
  const { redirectToLogin } = useAuth();

  const message = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (
      params.get("message") ||
      "We couldn't complete your Instagram login. Please try again."
    );
  }, [location.search]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
        <AlertCircle className="mx-auto mb-4 h-10 w-10 text-destructive" />
        <h1 className="text-2xl font-bold">Authentication Failed</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <Button className="mt-6 w-full" onClick={redirectToLogin}>
          Try again
        </Button>
      </div>
    </div>
  );
}
