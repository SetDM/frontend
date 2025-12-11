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
import { useState } from "react";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/hooks/useAuth";
import { AUTH_ENDPOINTS } from "@/lib/config";

export default function Settings() {
  usePageTitle("Settings");
  const { user, authorizedFetch, logout, redirectToLogin } = useAuth();
  const [coachName, setCoachName] = useState("Iris");
  const [brandName, setBrandName] = useState("FitWithIris");
  const [calendarLink, setCalendarLink] = useState("");
  const [isUnlinking, setIsUnlinking] = useState(false);

  // Autopilot settings
  const [autopilotMode, setAutopilotMode] = useState("full");
  const [replyWindowStart, setReplyWindowStart] = useState("07:00");
  const [replyWindowEnd, setReplyWindowEnd] = useState("22:00");
  const [handleStoryReplies, setHandleStoryReplies] = useState(true);
  const [handleCTAReplies, setHandleCTAReplies] = useState(true);
  const [handleColdDMs, setHandleColdDMs] = useState(false);
  const [handoffInjuries, setHandoffInjuries] = useState(true);
  const [handoffAngry, setHandoffAngry] = useState(true);
  const [handoffQualified, setHandoffQualified] = useState(true);

  // Lead filters
  const [minAge, setMinAge] = useState("18");
  const [minFollowers, setMinFollowers] = useState("");
  const [hidePrivateAccounts, setHidePrivateAccounts] = useState(false);
  const [allowedCountries, setAllowedCountries] = useState("USA, UK, Canada, Australia");
  const [allowedLanguages, setAllowedLanguages] = useState("English");

  // Notifications
  const [notifyQualified, setNotifyQualified] = useState(true);
  const [notifyCallBooked, setNotifyCallBooked] = useState(true);
  const [notifyNeedsReview, setNotifyNeedsReview] = useState(true);
  const [digestFrequency, setDigestFrequency] = useState("realtime");

  const handleSave = () => {
    toast.success("Settings saved successfully!");
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
                <Select value={autopilotMode} onValueChange={setAutopilotMode}>
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
                <Select value={digestFrequency} onValueChange={setDigestFrequency}>
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
            <Button onClick={handleSave} size="lg">
              Save All Settings
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
