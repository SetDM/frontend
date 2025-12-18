import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function Login() {
  const { redirectToLogin, user, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  usePageTitle("Login");
  const [inAppBrowser, setInAppBrowser] = useState<{ isInApp: boolean; label: string }>({
    isInApp: false,
    label: "",
  });

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/", { replace: true });
    }
  }, [isLoading, user, navigate]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const detectInAppBrowser = () => {
      const ua = window.navigator.userAgent || window.navigator.vendor || "";
      const isInstagram = /Instagram/i.test(ua);
      const isFacebookFamily = /(FBAN|FBAV|FB_IAB|Messenger)/i.test(ua);
      const isTikTok = /TikTok/i.test(ua);
      const isTwitter = /Twitter/i.test(ua);
      const isInApp = isInstagram || isFacebookFamily || isTikTok || isTwitter;
      const label = isInstagram
        ? "Instagram"
        : isFacebookFamily
          ? "Facebook/Messenger"
          : isTikTok
            ? "TikTok"
            : isTwitter
              ? "Twitter"
              : "embedded";
      return { isInApp, label };
    };

    setInAppBrowser(detectInAppBrowser());
  }, []);

  const handleOpenInBrowser = () => {
    if (typeof window === "undefined") {
      return;
    }

    const newWindow = window.open(window.location.href, "_blank", "noopener,noreferrer");
    if (newWindow) {
      newWindow.opener = null;
    }
  };

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

        {inAppBrowser.isInApp && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p>
              Instagram login cannot complete inside the {inAppBrowser.label} in-app browser. Tap the menu and choose
              “Open in Safari/Chrome”, then try again.
            </p>
            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={handleOpenInBrowser}>
              Open this page in your browser
            </Button>
          </div>
        )}

        <Button onClick={redirectToLogin} className="w-full gap-2" size="lg" disabled={inAppBrowser.isInApp}>
          <Instagram className="h-4 w-4" />
          Continue with Instagram
        </Button>

        {inAppBrowser.isInApp && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Open this page in your mobile browser to enable Instagram authentication.
          </p>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <Link to="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
