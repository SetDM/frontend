import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Instagram, 
  User, 
  Bot, 
  Filter, 
  Bell,
  Link2,
  Clock,
  Globe,
  Shield
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/hooks/useAuth";
import { AUTH_ENDPOINTS, SETTINGS_ENDPOINTS } from "@/lib/config";
import type { WorkspaceSettings } from "@/types";

const DEFAULT_SETTINGS: WorkspaceSettings = {
  profile: {
    coachName: "Iris",
    brandName: "FitWithIris",
    calendarLink: "",
  },
  autopilot: {
    mode: "full",
    replyWindowStart: "07:00",
    replyWindowEnd: "22:00",
    handleStoryReplies: true,
    handleCTAReplies: true,
    handleColdDMs: false,
    handoffInjuries: true,
    handoffAngry: true,
    handoffQualified: true,
  },
  filters: {
    minAge: 18,
    minFollowers: null,
    hidePrivateAccounts: false,
    allowedCountries: ["USA", "UK", "Canada", "Australia"],
    allowedLanguages: ["English"],
  },
  notifications: {
    notifyQualified: true,
    notifyCallBooked: true,
    notifyNeedsReview: true,
    digestFrequency: "realtime",
  },
};

const formatListField = (items?: string[]) => {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }
  return items.join(", ");
};

const parseListField = (input: string) =>
  input
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter((entry) => Boolean(entry));

export default function Settings() {
  usePageTitle("Settings");
  const { user, authorizedFetch, logout, redirectToLogin, activeWorkspaceId } = useAuth();
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [coachName, setCoachName] = useState(DEFAULT_SETTINGS.profile.coachName);
  const [brandName, setBrandName] = useState(DEFAULT_SETTINGS.profile.brandName);
  const [calendarLink, setCalendarLink] = useState(DEFAULT_SETTINGS.profile.calendarLink);
  const [isUnlinking, setIsUnlinking] = useState(false);

  // Autopilot settings
  const [autopilotMode, setAutopilotMode] = useState<WorkspaceSettings["autopilot"]["mode"]>(
    DEFAULT_SETTINGS.autopilot.mode,
  );
  const [replyWindowStart, setReplyWindowStart] = useState(
    DEFAULT_SETTINGS.autopilot.replyWindowStart,
  );
  const [replyWindowEnd, setReplyWindowEnd] = useState(DEFAULT_SETTINGS.autopilot.replyWindowEnd);
  const [handleStoryReplies, setHandleStoryReplies] = useState(
    DEFAULT_SETTINGS.autopilot.handleStoryReplies,
  );
  const [handleCTAReplies, setHandleCTAReplies] = useState(
    DEFAULT_SETTINGS.autopilot.handleCTAReplies,
  );
  const [handleColdDMs, setHandleColdDMs] = useState(DEFAULT_SETTINGS.autopilot.handleColdDMs);
  const [handoffInjuries, setHandoffInjuries] = useState(
    DEFAULT_SETTINGS.autopilot.handoffInjuries,
  );
  const [handoffAngry, setHandoffAngry] = useState(DEFAULT_SETTINGS.autopilot.handoffAngry);
  const [handoffQualified, setHandoffQualified] = useState(
    DEFAULT_SETTINGS.autopilot.handoffQualified,
  );

  // Lead filters
  const [minAge, setMinAge] = useState(String(DEFAULT_SETTINGS.filters.minAge));
  const [minFollowers, setMinFollowers] = useState("");
  const [hidePrivateAccounts, setHidePrivateAccounts] = useState(
    DEFAULT_SETTINGS.filters.hidePrivateAccounts,
  );
  const [allowedCountries, setAllowedCountries] = useState(
    formatListField(DEFAULT_SETTINGS.filters.allowedCountries),
  );
  const [allowedLanguages, setAllowedLanguages] = useState(
    formatListField(DEFAULT_SETTINGS.filters.allowedLanguages),
  );

  // Notifications
  const [notifyQualified, setNotifyQualified] = useState(
    DEFAULT_SETTINGS.notifications.notifyQualified,
  );
  const [notifyCallBooked, setNotifyCallBooked] = useState(
    DEFAULT_SETTINGS.notifications.notifyCallBooked,
  );
  const [notifyNeedsReview, setNotifyNeedsReview] = useState(
    DEFAULT_SETTINGS.notifications.notifyNeedsReview,
  );
  const [digestFrequency, setDigestFrequency] =
    useState<WorkspaceSettings["notifications"]["digestFrequency"]>(
      DEFAULT_SETTINGS.notifications.digestFrequency,
    );

  const applySettingsToState = useCallback((settings: WorkspaceSettings) => {
    if (!settings) {
      return;
    }

    setCoachName(settings.profile?.coachName ?? "");
    setBrandName(settings.profile?.brandName ?? "");
    setCalendarLink(settings.profile?.calendarLink ?? "");

    setAutopilotMode(settings.autopilot?.mode ?? "full");
    setReplyWindowStart(settings.autopilot?.replyWindowStart ?? "07:00");
    setReplyWindowEnd(settings.autopilot?.replyWindowEnd ?? "22:00");
    setHandleStoryReplies(settings.autopilot?.handleStoryReplies ?? true);
    setHandleCTAReplies(settings.autopilot?.handleCTAReplies ?? true);
    setHandleColdDMs(settings.autopilot?.handleColdDMs ?? false);
    setHandoffInjuries(settings.autopilot?.handoffInjuries ?? true);
    setHandoffAngry(settings.autopilot?.handoffAngry ?? true);
    setHandoffQualified(settings.autopilot?.handoffQualified ?? true);

    setAllowedCountries(formatListField(settings.filters?.allowedCountries));
    setAllowedLanguages(formatListField(settings.filters?.allowedLanguages));
    setMinAge(String(settings.filters?.minAge ?? 18));
    setMinFollowers(
      settings.filters?.minFollowers === null || settings.filters?.minFollowers === undefined
        ? ""
        : String(settings.filters.minFollowers)
    );
    setHidePrivateAccounts(settings.filters?.hidePrivateAccounts ?? false);

    setNotifyQualified(settings.notifications?.notifyQualified ?? true);
    setNotifyCallBooked(settings.notifications?.notifyCallBooked ?? true);
    setNotifyNeedsReview(settings.notifications?.notifyNeedsReview ?? true);
    setDigestFrequency(settings.notifications?.digestFrequency ?? "realtime");
  }, []);

  const resetSettingsState = useCallback(() => {
    applySettingsToState(DEFAULT_SETTINGS);
  }, [applySettingsToState]);

  const loadSettings = useCallback(async (signal?: AbortSignal) => {
    if (!activeWorkspaceId) {
      setIsLoadingSettings(false);
      return;
    }

    setIsLoadingSettings(true);
    try {
      const response = await authorizedFetch(SETTINGS_ENDPOINTS.workspace, { signal });
      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          payload !== null &&
          "message" in payload &&
          typeof (payload as { message?: unknown }).message === "string"
            ? ((payload as { message?: string }).message as string)
            : "Failed to load settings.";
        throw new Error(message);
      }

      const data =
        payload &&
        typeof payload === "object" &&
        payload !== null &&
        "data" in payload
          ? ((payload as { data?: WorkspaceSettings }).data as WorkspaceSettings | undefined)
          : undefined;

      if (data) {
        applySettingsToState(data);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to load settings.");
    } finally {
      setIsLoadingSettings(false);
    }
  }, [activeWorkspaceId, applySettingsToState, authorizedFetch]);

  useEffect(() => {
    const abortController = new AbortController();
    resetSettingsState();

    if (!activeWorkspaceId) {
      setIsLoadingSettings(false);
      return () => {
        abortController.abort();
      };
    }

    loadSettings(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [activeWorkspaceId, loadSettings, resetSettingsState]);

  const buildSettingsPayload = (): WorkspaceSettings => {
    const normalizedMinFollowers = minFollowers.trim();
    const parsedMinFollowers = normalizedMinFollowers.length
      ? Math.max(0, Number.parseInt(normalizedMinFollowers, 10) || 0)
      : null;

    const parsedMinAge = Math.max(0, Number.parseInt(minAge, 10) || 18);

    return {
      profile: {
        coachName: coachName.trim(),
        brandName: brandName.trim(),
        calendarLink: calendarLink.trim(),
      },
      autopilot: {
        mode: autopilotMode as WorkspaceSettings["autopilot"]["mode"],
        replyWindowStart,
        replyWindowEnd,
        handleStoryReplies,
        handleCTAReplies,
        handleColdDMs,
        handoffInjuries,
        handoffAngry,
        handoffQualified,
      },
      filters: {
        minAge: parsedMinAge,
        minFollowers: parsedMinFollowers,
        hidePrivateAccounts,
        allowedCountries: parseListField(allowedCountries),
        allowedLanguages: parseListField(allowedLanguages),
      },
      notifications: {
        notifyQualified,
        notifyCallBooked,
        notifyNeedsReview,
        digestFrequency,
      },
    };
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = buildSettingsPayload();
      const response = await authorizedFetch(SETTINGS_ENDPOINTS.workspace, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let responseBody: unknown = null;
      try {
        responseBody = await response.json();
      } catch {
        responseBody = null;
      }

      if (!response.ok) {
        const message =
          responseBody &&
          typeof responseBody === "object" &&
          responseBody !== null &&
          "message" in responseBody &&
          typeof (responseBody as { message?: unknown }).message === "string"
            ? ((responseBody as { message?: string }).message as string)
            : "Failed to save settings.";
        throw new Error(message);
      }

      const updatedSettings =
        responseBody &&
        typeof responseBody === "object" &&
        responseBody !== null &&
        "data" in responseBody
          ? ((responseBody as { data?: WorkspaceSettings }).data as WorkspaceSettings | undefined)
          : undefined;

      applySettingsToState(updatedSettings ?? payload);
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectInstagram = () => {
    redirectToLogin();
  };

  const handleUnlinkInstagram = async () => {
    const confirmation = window.confirm(
      "Disconnecting will remove access for this Instagram account. Continue?"
    );

    if (!confirmation) {
      return;
    }

    setIsUnlinking(true);

    try {
      const response = await authorizedFetch(AUTH_ENDPOINTS.unlink, {
        method: "POST",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          (payload && typeof payload === "object" && "message" in payload
            ? (payload as { message?: string }).message
            : null) || "Failed to disconnect Instagram account.";
        throw new Error(message);
      }

      toast.success("Instagram account disconnected. Please log in again to reconnect.");
      await logout();
      redirectToLogin();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to disconnect Instagram account."
      );
    } finally {
      setIsUnlinking(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">
            Configure your account, automation rules, and notifications.
          </p>
        </div>

        {isLoadingSettings && (
          <div className="mb-6 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
            Loading workspace settings...
          </div>
        )}

        <div className="space-y-6">
          {/* A. Account & Instagram Connection */}
          <div className="rounded-lg bg-card p-6 shadow-card">
            <div className="flex items-start gap-3 mb-6">
              <div className="rounded-lg bg-primary/10 p-2">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Account & Instagram Connection</h3>
                <p className="text-sm text-muted-foreground">
                  Your profile and Instagram integration settings
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="coach-name">Coach Name</Label>
                <Input
                  id="coach-name"
                  value={coachName}
                  onChange={(e) => setCoachName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="brand-name">Brand Name</Label>
                <Input
                  id="brand-name"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Your brand"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-border p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-lg bg-pink/10 p-2">
                  <Instagram className="h-5 w-5 text-pink" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">Instagram Account</h4>
                  <p className="text-sm text-muted-foreground">
                    Connect your Instagram to enable AI DM automation
                  </p>
                </div>
              </div>
              {user ? (
                <>
                  <div className="mb-3 rounded-md border border-dashed border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Connected as</span>
                      <span className="font-medium text-foreground">@{user.username}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Instagram ID: {user.instagramId}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      className="flex-1 bg-gradient-to-r from-pink to-purple-500 hover:opacity-90"
                      onClick={handleConnectInstagram}
                    >
                      Refresh Connection
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-destructive text-destructive hover:bg-destructive/5"
                      onClick={handleUnlinkInstagram}
                      disabled={isUnlinking}
                    >
                      {isUnlinking ? "Disconnecting…" : "Disconnect Instagram"}
                    </Button>
                  </div>
                </>
              ) : (
                <Button
                  className="w-full bg-gradient-to-r from-pink to-purple-500 hover:opacity-90"
                  onClick={handleConnectInstagram}
                >
                  Connect Instagram
                </Button>
              )}
            </div>

            <div className="mt-4">
              <Label htmlFor="calendar-link">
                <Link2 className="inline h-4 w-4 mr-1" />
                Default Calendar Link
              </Label>
              <Input
                id="calendar-link"
                value={calendarLink}
                onChange={(e) => setCalendarLink(e.target.value)}
                placeholder="https://calendly.com/you"
                className="mt-1.5"
              />
            </div>
          </div>

          {/* B. Autopilot Settings */}
          <div className="rounded-lg bg-card p-6 shadow-card">
            <div className="flex items-start gap-3 mb-6">
              <div className="rounded-lg bg-primary/10 p-2">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Autopilot Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Control when and how the AI handles conversations
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Global Toggle */}
              <div>
                <Label>Autopilot Mode</Label>
                <Select
                  value={autopilotMode}
                  onValueChange={(value) =>
                    setAutopilotMode(value as WorkspaceSettings["autopilot"]["mode"])
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Off - All manual</SelectItem>
                    <SelectItem value="lead-capture">Lead Capture Only - Qualify then hand off</SelectItem>
                    <SelectItem value="full">Full Autopilot - AI handles until call booked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Time Windows */}
              <div>
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Reply Time Window
                </Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input
                    type="time"
                    value={replyWindowStart}
                    onChange={(e) => setReplyWindowStart(e.target.value)}
                    className="w-32"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={replyWindowEnd}
                    onChange={(e) => setReplyWindowEnd(e.target.value)}
                    className="w-32"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  AI will only send messages during these hours
                </p>
              </div>

              {/* Entry Points */}
              <div>
                <Label>Entry Points AI Can Handle</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-3">
                    <Switch checked={handleStoryReplies} onCheckedChange={setHandleStoryReplies} />
                    <span className="text-sm">Story replies</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={handleCTAReplies} onCheckedChange={setHandleCTAReplies} />
                    <span className="text-sm">Replies to CTAs</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={handleColdDMs} onCheckedChange={setHandleColdDMs} />
                    <span className="text-sm">Cold DMs with keywords</span>
                  </div>
                </div>
              </div>

              {/* Escalation Rules */}
              <div>
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Escalation Rules (Hand off to you when...)
                </Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-3">
                    <Switch checked={handoffInjuries} onCheckedChange={setHandoffInjuries} />
                    <span className="text-sm">They mention injuries or health concerns</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={handoffAngry} onCheckedChange={setHandoffAngry} />
                    <span className="text-sm">They seem angry or confused</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={handoffQualified} onCheckedChange={setHandoffQualified} />
                    <span className="text-sm">They become Qualified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* C. Lead Filters */}
          <div className="rounded-lg bg-card p-6 shadow-card">
            <div className="flex items-start gap-3 mb-6">
              <div className="rounded-lg bg-primary/10 p-2">
                <Filter className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Lead Filters</h3>
                <p className="text-sm text-muted-foreground">
                  Filter who the AI engages with
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="allowed-countries">
                    <Globe className="inline h-4 w-4 mr-1" />
                    Allowed Countries
                  </Label>
                  <Input
                    id="allowed-countries"
                    value={allowedCountries}
                    onChange={(e) => setAllowedCountries(e.target.value)}
                    placeholder="USA, UK, Canada"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="allowed-languages">Languages</Label>
                  <Input
                    id="allowed-languages"
                    value={allowedLanguages}
                    onChange={(e) => setAllowedLanguages(e.target.value)}
                    placeholder="English, Spanish"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="min-age">Minimum Age</Label>
                  <Input
                    id="min-age"
                    type="number"
                    value={minAge}
                    onChange={(e) => setMinAge(e.target.value)}
                    placeholder="18"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="min-followers">Min Followers (optional)</Label>
                  <Input
                    id="min-followers"
                    type="number"
                    value={minFollowers}
                    onChange={(e) => setMinFollowers(e.target.value)}
                    placeholder="Leave empty for no limit"
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <Switch checked={hidePrivateAccounts} onCheckedChange={setHidePrivateAccounts} />
                <span className="text-sm">Hide people with private accounts</span>
              </div>
            </div>
          </div>

          {/* D. Notifications */}
          <div className="rounded-lg bg-card p-6 shadow-card">
            <div className="flex items-start gap-3 mb-6">
              <div className="rounded-lg bg-primary/10 p-2">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Choose what alerts you receive and how often
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Notify me when...</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-3">
                    <Switch checked={notifyQualified} onCheckedChange={setNotifyQualified} />
                    <span className="text-sm">New Qualified lead</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={notifyCallBooked} onCheckedChange={setNotifyCallBooked} />
                    <span className="text-sm">New call booked</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={notifyNeedsReview} onCheckedChange={setNotifyNeedsReview} />
                    <span className="text-sm">AI needs review</span>
                  </div>
                </div>
              </div>

              <div>
                <Label>Digest Frequency</Label>
                <Select
                  value={digestFrequency}
                  onValueChange={(value) =>
                    setDigestFrequency(
                      value as WorkspaceSettings["notifications"]["digestFrequency"]
                    )
                  }
                >
                  <SelectTrigger className="mt-1.5 w-full sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time</SelectItem>
                    <SelectItem value="hourly">Hourly summaries</SelectItem>
                    <SelectItem value="daily">Daily summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              size="lg"
              disabled={isSaving || isLoadingSettings}
            >
              {isSaving ? "Saving..." : "Save All Settings"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
