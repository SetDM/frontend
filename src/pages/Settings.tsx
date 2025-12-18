// TODO Vaibhav: GET /api/settings on load, POST /api/settings on save
// Instagram OAuth: Connect button triggers OAuth flow, store token on backend

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Instagram, User, Bot, Bell, Link2, Clock, AlertTriangle, MessageSquare, Ban, Target, Timer, Save, Users, Copy, Check, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/hooks/useAuth";
import { AUTH_ENDPOINTS, SETTINGS_ENDPOINTS } from "@/lib/config";
import type { WorkspaceSettings } from "@/types";

type TeamRole = "admin" | "editor" | "viewer";

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: TeamRole;
    isOwner?: boolean;
}

const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
    admin: "Admins can manage all settings, team members, and have full access to all features except ownership transfer.",
    editor: "Editors can manage conversations, approve messages, and configure AI scripts but cannot manage team members.",
    viewer: "Viewers can only view conversations and stats but cannot make changes.",
};

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
    const navigate = useNavigate();
    const { user, authorizedFetch, logout, redirectToLogin, activeWorkspaceId } = useAuth();

    const [isLoadingSettings, setIsLoadingSettings] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUnlinking, setIsUnlinking] = useState(false);

    // Account settings
    const [coachName, setCoachName] = useState(DEFAULT_SETTINGS.profile.coachName);
    const [brandName, setBrandName] = useState(DEFAULT_SETTINGS.profile.brandName);
    const [calendarLink, setCalendarLink] = useState(DEFAULT_SETTINGS.profile.calendarLink);

    // Autopilot settings
    const [autopilotEnabled, setAutopilotEnabled] = useState(false);
    const [showAutopilotConfirm, setShowAutopilotConfirm] = useState(false);
    const [replyWindowStart, setReplyWindowStart] = useState(DEFAULT_SETTINGS.autopilot.replyWindowStart);
    const [replyWindowEnd, setReplyWindowEnd] = useState(DEFAULT_SETTINGS.autopilot.replyWindowEnd);
    const [responseDelayValue, setResponseDelayValue] = useState("");
    const [responseDelayUnit, setResponseDelayUnit] = useState("seconds");

    const handleAutopilotToggle = (checked: boolean) => {
        if (checked) {
            setShowAutopilotConfirm(true);
        } else {
            setAutopilotEnabled(false);
        }
    };

    const confirmAutopilot = () => {
        setAutopilotEnabled(true);
        setShowAutopilotConfirm(false);
    };

    // Entry points - determines when AI starts engaging
    const [triggerExamples, setTriggerExamples] = useState("");

    // Ignore rules - spam patterns to ignore
    const [ignorePatterns, setIgnorePatterns] = useState("");

    // Qualification criteria
    const [blockedCountries, setBlockedCountries] = useState("");
    const [allowedLanguages, setAllowedLanguages] = useState(formatListField(DEFAULT_SETTINGS.filters.allowedLanguages));
    const [minAge, setMinAge] = useState(String(DEFAULT_SETTINGS.filters.minAge));

    // Notifications
    const [notifyQualified, setNotifyQualified] = useState(DEFAULT_SETTINGS.notifications.notifyQualified);
    const [notifyCallBooked, setNotifyCallBooked] = useState(DEFAULT_SETTINGS.notifications.notifyCallBooked);
    const [notifyNeedsReview, setNotifyNeedsReview] = useState(DEFAULT_SETTINGS.notifications.notifyNeedsReview);
    const [notifyWhenFlag, setNotifyWhenFlag] = useState(true);
    const [digestFrequency, setDigestFrequency] = useState<WorkspaceSettings["notifications"]["digestFrequency"]>(DEFAULT_SETTINGS.notifications.digestFrequency);

    // Team members
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([{ id: "1", name: "Your Name", email: "you@example.com", role: "admin", isOwner: true }]);
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<TeamRole>("admin");
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);

    const generateInviteLink = () => {
        // TODO Vaibhav: POST /api/team/invite { role: selectedRole }
        const mockLink = `https://app.yourapp.com/invite/${selectedRole}_${Math.random().toString(36).substring(7)}`;
        setInviteLink(mockLink);
    };

    const copyInviteLink = () => {
        if (inviteLink) {
            navigator.clipboard.writeText(inviteLink);
            setLinkCopied(true);
            toast.success("Link copied to clipboard!");
            setTimeout(() => setLinkCopied(false), 2000);
        }
    };

    const closeInviteDialog = () => {
        setInviteDialogOpen(false);
        setInviteLink(null);
        setSelectedRole("admin");
        setLinkCopied(false);
    };

    // API Integration
    const applySettingsToState = useCallback((settings: WorkspaceSettings) => {
        if (!settings) {
            return;
        }

        setCoachName(settings.profile?.coachName ?? "");
        setBrandName(settings.profile?.brandName ?? "");
        setCalendarLink(settings.profile?.calendarLink ?? "");

        setAutopilotEnabled(settings.autopilot?.mode === "full");
        setReplyWindowStart(settings.autopilot?.replyWindowStart ?? "07:00");
        setReplyWindowEnd(settings.autopilot?.replyWindowEnd ?? "22:00");

        setAllowedLanguages(formatListField(settings.filters?.allowedLanguages));
        setMinAge(String(settings.filters?.minAge ?? 18));

        setNotifyQualified(settings.notifications?.notifyQualified ?? true);
        setNotifyCallBooked(settings.notifications?.notifyCallBooked ?? true);
        setNotifyNeedsReview(settings.notifications?.notifyNeedsReview ?? true);
        setDigestFrequency(settings.notifications?.digestFrequency ?? "realtime");
    }, []);

    const resetSettingsState = useCallback(() => {
        applySettingsToState(DEFAULT_SETTINGS);
    }, [applySettingsToState]);

    const loadSettings = useCallback(
        async (signal?: AbortSignal) => {
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
                        payload && typeof payload === "object" && payload !== null && "message" in payload && typeof (payload as { message?: unknown }).message === "string"
                            ? ((payload as { message?: string }).message as string)
                            : "Failed to load settings.";
                    throw new Error(message);
                }

                const data =
                    payload && typeof payload === "object" && payload !== null && "data" in payload ? ((payload as { data?: WorkspaceSettings }).data as WorkspaceSettings | undefined) : undefined;

                if (data) {
                    applySettingsToState(data);
                }
            } catch (error) {
                console.error(error);
                toast.error(error instanceof Error ? error.message : "Failed to load settings.");
            } finally {
                setIsLoadingSettings(false);
            }
        },
        [activeWorkspaceId, applySettingsToState, authorizedFetch]
    );

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
        const parsedMinAge = Math.max(0, Number.parseInt(minAge, 10) || 18);

        return {
            profile: {
                coachName: coachName.trim(),
                brandName: brandName.trim(),
                calendarLink: calendarLink.trim(),
            },
            autopilot: {
                mode: autopilotEnabled ? "full" : "off",
                replyWindowStart,
                replyWindowEnd,
                handleStoryReplies: true,
                handleCTAReplies: true,
                handleColdDMs: false,
                handoffInjuries: true,
                handoffAngry: true,
                handoffQualified: true,
            },
            filters: {
                minAge: parsedMinAge,
                minFollowers: null,
                hidePrivateAccounts: false,
                allowedCountries: parseListField(blockedCountries.length ? "" : "USA, UK, Canada, Australia"),
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
                    responseBody && typeof responseBody === "object" && responseBody !== null && "message" in responseBody && typeof (responseBody as { message?: unknown }).message === "string"
                        ? ((responseBody as { message?: string }).message as string)
                        : "Failed to save settings.";
                throw new Error(message);
            }

            const updatedSettings =
                responseBody && typeof responseBody === "object" && responseBody !== null && "data" in responseBody
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
        const confirmation = window.confirm("Disconnecting will remove access for this Instagram account. Continue?");

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
                const message = (payload && typeof payload === "object" && "message" in payload ? (payload as { message?: string }).message : null) || "Failed to disconnect Instagram account.";
                throw new Error(message);
            }

            toast.success("Instagram account disconnected. Please log in again to reconnect.");
            await logout();
            redirectToLogin();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to disconnect Instagram account.");
        } finally {
            setIsUnlinking(false);
        }
    };

    return (
        <AppLayout>
            <div className="p-4 sm:p-8 max-w-4xl">
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">Settings</h1>
                    <p className="text-sm text-muted-foreground">Configure your account and automation rules</p>
                </div>

                {isLoadingSettings && <div className="mb-6 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">Loading workspace settings...</div>}

                <div className="space-y-4 sm:space-y-6">
                    {/* Account & Instagram Connection */}
                    <div className="rounded-lg bg-card p-4 sm:p-6 shadow-card">
                        <div className="flex items-start gap-3 mb-4 sm:mb-6">
                            <div className="rounded-lg bg-primary/10 p-2">
                                <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">Account</h3>
                                <p className="text-sm text-muted-foreground">Your profile and Instagram</p>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <Label htmlFor="coach-name">Your Name</Label>
                                <Input id="coach-name" value={coachName} onChange={(e) => setCoachName(e.target.value)} placeholder="Your name" className="mt-1.5" disabled={isLoadingSettings} />
                            </div>
                            <div>
                                <Label htmlFor="brand-name">Brand Name</Label>
                                <Input id="brand-name" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Your brand" className="mt-1.5" disabled={isLoadingSettings} />
                            </div>
                        </div>

                        <div className="mt-4 rounded-lg border border-border p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="rounded-lg bg-pink/10 p-2">
                                    <Instagram className="h-5 w-5 text-pink" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-foreground">Instagram Account</h4>
                                    <p className="text-sm text-muted-foreground truncate">Connect to enable AI DM automation</p>
                                </div>
                            </div>
                            {user ? (
                                <>
                                    <div className="mb-3 rounded-md border border-dashed border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
                                        <div className="flex items-center justify-between">
                                            <span>Connected as</span>
                                            <span className="font-medium text-foreground">@{user.username}</span>
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">Instagram ID: {user.instagramId}</p>
                                    </div>
                                    <div className="flex flex-col gap-3 sm:flex-row">
                                        <Button className="flex-1 bg-gradient-to-r from-pink to-purple-500 hover:opacity-90" onClick={handleConnectInstagram}>
                                            Refresh Connection
                                        </Button>
                                        <Button variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive/5" onClick={handleUnlinkInstagram} disabled={isUnlinking}>
                                            {isUnlinking ? "Disconnecting…" : "Disconnect Instagram"}
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <Button className="w-full bg-gradient-to-r from-pink to-purple-500 hover:opacity-90" onClick={handleConnectInstagram}>
                                    Connect Instagram
                                </Button>
                            )}
                        </div>

                        <div className="mt-4">
                            <Label htmlFor="calendar-link">
                                <Link2 className="inline h-4 w-4 mr-1" />
                                Calendar Link
                            </Label>
                            <Input
                                id="calendar-link"
                                value={calendarLink}
                                onChange={(e) => setCalendarLink(e.target.value)}
                                placeholder="https://calendly.com/you"
                                className="mt-1.5"
                                disabled={isLoadingSettings}
                            />
                        </div>
                    </div>

                    {/* Autopilot */}
                    <div className="rounded-lg bg-card p-4 sm:p-6 shadow-card">
                        <div className="flex items-start gap-3 mb-4 sm:mb-6">
                            <div className="rounded-lg bg-primary/10 p-2">
                                <Bot className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-foreground">Autopilot</h3>
                                <p className="text-sm text-muted-foreground">Let AI handle conversations automatically</p>
                            </div>
                        </div>

                        {/* Response Time - IMPORTANT */}
                        <div className="mb-6 p-4 rounded-lg border-2 border-primary/50 bg-primary/5">
                            <div className="flex items-center gap-2 mb-2">
                                <Timer className="h-5 w-5 text-primary" />
                                <span className="font-semibold text-foreground">Response Time</span>
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/20 text-primary">Important</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">How long the AI waits before replying (feels more human)</p>
                            <div className="flex items-center gap-2">
                                <Input type="number" min="0" value={responseDelayValue} onChange={(e) => setResponseDelayValue(e.target.value)} className="w-20" disabled={isLoadingSettings} />
                                <Select value={responseDelayUnit} onValueChange={setResponseDelayUnit} disabled={isLoadingSettings}>
                                    <SelectTrigger className="w-[120px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="seconds">seconds</SelectItem>
                                        <SelectItem value="minutes">minutes</SelectItem>
                                        <SelectItem value="hours">hours</SelectItem>
                                        <SelectItem value="days">days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Main Toggle with Warning */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-lg border-2 border-border bg-background">
                                <div className="flex-1 min-w-0 mr-4">
                                    <span className="font-medium text-foreground">Enable Autopilot for All Conversations</span>
                                    <p className="text-sm text-muted-foreground">AI will automatically respond to every message</p>
                                </div>
                                <Switch checked={autopilotEnabled} onCheckedChange={handleAutopilotToggle} className="shrink-0" disabled={isLoadingSettings} />
                            </div>

                            {autopilotEnabled && (
                                <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                                    <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-medium text-yellow-600 dark:text-yellow-400">Warning: AI will message everyone</p>
                                        <p className="text-muted-foreground mt-1">
                                            The AI cannot see conversation history from before it was connected. It will reply to ALL new messages, including friends and family. Make sure your entry
                                            points below are specific enough to filter out personal conversations.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Reply Window */}
                            <div>
                                <Label className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Reply Window
                                </Label>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1.5">
                                    <div className="flex items-center gap-2">
                                        <Input type="time" value={replyWindowStart} onChange={(e) => setReplyWindowStart(e.target.value)} className="w-full sm:w-32" disabled={isLoadingSettings} />
                                        <span className="text-muted-foreground shrink-0">to</span>
                                        <Input type="time" value={replyWindowEnd} onChange={(e) => setReplyWindowEnd(e.target.value)} className="w-full sm:w-32" disabled={isLoadingSettings} />
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">AI only sends messages during these hours</p>
                            </div>
                        </div>
                    </div>

                    {/* Entry Points */}
                    <div className="rounded-lg bg-card p-4 sm:p-6 shadow-card">
                        <div className="flex items-start gap-3 mb-4 sm:mb-6">
                            <div className="rounded-lg bg-green-500/10 p-2">
                                <MessageSquare className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">Entry Points</h3>
                                <p className="text-sm text-muted-foreground">
                                    This is the <span className="font-semibold text-foreground">ONLY</span> way the AI will be triggered, or you must manually turn it on for a conversation.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label className="mb-2 block">Trigger Keywords</Label>
                                <Button variant="outline" onClick={() => navigate("/prompt")} className="w-full justify-center border-amber-500/50 text-amber-600 hover:bg-amber-500/10">
                                    Set Keyword
                                </Button>
                                <p className="text-xs text-muted-foreground mt-1.5">Configure your keyword triggers in the Prompt section.</p>
                            </div>

                            <div>
                                <Label htmlFor="trigger-examples">Other Trigger Messages</Label>
                                <Textarea
                                    id="trigger-examples"
                                    value={triggerExamples}
                                    onChange={(e) => setTriggerExamples(e.target.value)}
                                    placeholder="im fat&#10;how can i get like you&#10;i need help losing weight"
                                    className="mt-1.5 min-h-[100px]"
                                    disabled={isLoadingSettings}
                                />
                                <p className="text-xs text-muted-foreground mt-1">One per line. AI engages when messages match these patterns (age + country, specific questions, etc.)</p>
                            </div>
                        </div>
                    </div>

                    {/* Ignore Rules */}
                    <div className="rounded-lg bg-card p-4 sm:p-6 shadow-card">
                        <div className="flex items-start gap-3 mb-4 sm:mb-6">
                            <div className="rounded-lg bg-red-500/10 p-2">
                                <Ban className="h-5 w-5 text-red-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">Ignore These People</h3>
                                <p className="text-sm text-muted-foreground">AI will not respond to these messages unless they also send a trigger message. This is just for extra clarity.</p>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="ignore-patterns">Ignore Patterns</Label>
                            <Textarea
                                id="ignore-patterns"
                                value={ignorePatterns}
                                onChange={(e) => setIgnorePatterns(e.target.value)}
                                placeholder="do you have info products&#10;coaching program info&#10;I can help you grow"
                                className="mt-1.5 min-h-[100px]"
                                disabled={isLoadingSettings}
                            />
                            <p className="text-xs text-muted-foreground mt-1">One per line. Blocks copywriters, solicitors, and people selling stuff.</p>
                        </div>
                    </div>

                    {/* Qualification Criteria */}
                    <div className="rounded-lg bg-card p-4 sm:p-6 shadow-card">
                        <div className="flex items-start gap-3 mb-4 sm:mb-6">
                            <div className="rounded-lg bg-primary/10 p-2">
                                <Target className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">Qualification Criteria</h3>
                                <p className="text-sm text-muted-foreground">Filter who the AI engages with</p>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <Label htmlFor="blocked-countries">Blocked Countries</Label>
                                <Input
                                    id="blocked-countries"
                                    value={blockedCountries}
                                    onChange={(e) => setBlockedCountries(e.target.value)}
                                    placeholder="India, Nigeria, Philippines"
                                    className="mt-1.5"
                                    disabled={isLoadingSettings}
                                />
                                <p className="text-xs text-muted-foreground mt-1">Comma-separated. AI won't engage with people from these countries.</p>
                            </div>
                            <div>
                                <Label htmlFor="allowed-languages">Languages</Label>
                                <Input
                                    id="allowed-languages"
                                    value={allowedLanguages}
                                    onChange={(e) => setAllowedLanguages(e.target.value)}
                                    placeholder="English, Spanish"
                                    className="mt-1.5"
                                    disabled={isLoadingSettings}
                                />
                            </div>
                            <div>
                                <Label htmlFor="min-age">Minimum Age</Label>
                                <Input id="min-age" type="number" value={minAge} onChange={(e) => setMinAge(e.target.value)} placeholder="18" className="mt-1.5" disabled={isLoadingSettings} />
                            </div>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="rounded-lg bg-card p-4 sm:p-6 shadow-card">
                        <div className="flex items-start gap-3 mb-4 sm:mb-6">
                            <div className="rounded-lg bg-primary/10 p-2">
                                <Bell className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">Notifications</h3>
                                <p className="text-sm text-muted-foreground">What alerts you receive</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label>Notify me when...</Label>
                                <div className="mt-2 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <Switch checked={notifyQualified} onCheckedChange={setNotifyQualified} disabled={isLoadingSettings} />
                                        <span className="text-sm">New qualified lead</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Switch checked={notifyCallBooked} onCheckedChange={setNotifyCallBooked} disabled={isLoadingSettings} />
                                        <span className="text-sm">New call booked</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Switch checked={notifyNeedsReview} onCheckedChange={setNotifyNeedsReview} disabled={isLoadingSettings} />
                                        <span className="text-sm">AI needs review</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Switch checked={notifyWhenFlag} onCheckedChange={setNotifyWhenFlag} disabled={isLoadingSettings} />
                                        <span className="text-sm">Conversation flagged</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Label>Digest Frequency</Label>
                                <Select value={digestFrequency} onValueChange={(v) => setDigestFrequency(v as WorkspaceSettings["notifications"]["digestFrequency"])} disabled={isLoadingSettings}>
                                    <SelectTrigger className="mt-1.5 w-full sm:w-64">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="realtime">Real-time</SelectItem>
                                        <SelectItem value="hourly">Hourly</SelectItem>
                                        <SelectItem value="daily">Daily</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Team Members */}
                    <div className="rounded-lg bg-card p-4 sm:p-6 shadow-card">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4 sm:mb-6">
                            <div className="flex items-start gap-3">
                                <div className="rounded-lg bg-primary/10 p-2">
                                    <Users className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">Team Members</h3>
                                    <p className="text-sm text-muted-foreground">Manage who has access to your account</p>
                                </div>
                            </div>
                            <Dialog
                                open={inviteDialogOpen}
                                onOpenChange={(open) => {
                                    if (!open) closeInviteDialog();
                                    else setInviteDialogOpen(true);
                                }}
                            >
                                <DialogTrigger asChild>
                                    <Button className="w-full sm:w-auto gap-2">
                                        <UserPlus className="h-4 w-4" />
                                        Invite New Member
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Invite New Member</DialogTitle>
                                        <DialogDescription className="sr-only">Select a role and generate an invite link</DialogDescription>
                                    </DialogHeader>

                                    {!inviteLink ? (
                                        <div className="space-y-4 py-4">
                                            <div>
                                                <Label className="text-base font-semibold">Select Role</Label>
                                                <RadioGroup value={selectedRole} onValueChange={(value) => setSelectedRole(value as TeamRole)} className="mt-3 space-y-3">
                                                    {(["admin", "editor", "viewer"] as TeamRole[]).map((role) => (
                                                        <div key={role} className="flex items-start space-x-3">
                                                            <RadioGroupItem value={role} id={role} className="mt-1" />
                                                            <Label htmlFor={role} className="cursor-pointer font-normal">
                                                                <span className="font-medium capitalize">{role}</span>
                                                            </Label>
                                                        </div>
                                                    ))}
                                                </RadioGroup>
                                            </div>

                                            <p className="text-sm text-muted-foreground">{ROLE_DESCRIPTIONS[selectedRole]}</p>

                                            <Button onClick={generateInviteLink} className="w-full">
                                                Generate A Link
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 py-4">
                                            <div>
                                                <Label className="text-base font-semibold capitalize">{selectedRole}</Label>
                                                <p className="text-sm text-muted-foreground mt-1">{ROLE_DESCRIPTIONS[selectedRole]}</p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Input value={inviteLink} readOnly className="flex-1 text-sm bg-muted" />
                                                <Button variant="outline" size="sm" onClick={copyInviteLink} className="gap-1 shrink-0">
                                                    {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                                    {linkCopied ? "Copied" : "Copy"}
                                                </Button>
                                            </div>

                                            <p className="text-sm text-muted-foreground text-center italic">Note that this link is valid for 24 hours and can be used only once.</p>

                                            <Button onClick={closeInviteDialog} className="w-full">
                                                Got It
                                            </Button>
                                        </div>
                                    )}
                                </DialogContent>
                            </Dialog>
                        </div>

                        {/* Owner Section */}
                        <div className="mb-4">
                            <h4 className="font-medium text-foreground mb-1">Owner</h4>
                            <p className="text-xs text-muted-foreground mb-3">Owner controls all settings and team management. There is only one owner per account.</p>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="text-left text-sm font-medium text-muted-foreground py-2">Name</th>
                                            <th className="text-left text-sm font-medium text-muted-foreground py-2 hidden sm:table-cell">Role</th>
                                            <th className="text-right text-sm font-medium text-muted-foreground py-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teamMembers
                                            .filter((m) => m.isOwner)
                                            .map((member) => (
                                                <tr key={member.id} className="border-b border-border last:border-0">
                                                    <td className="py-3">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                                                    {member.name
                                                                        .split(" ")
                                                                        .map((n) => n[0])
                                                                        .join("")}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0">
                                                                <p className="font-medium text-sm truncate">{member.name}</p>
                                                                <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 hidden sm:table-cell">
                                                        <span className="text-sm text-muted-foreground">It's me</span>
                                                    </td>
                                                    <td className="py-3 text-right">
                                                        <Button variant="ghost" size="sm" className="text-primary">
                                                            Edit
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Team Members Section */}
                        {teamMembers.filter((m) => !m.isOwner).length > 0 && (
                            <div>
                                <h4 className="font-medium text-foreground mb-1">Team Members</h4>
                                <p className="text-xs text-muted-foreground mb-3">People you've invited to help manage your account.</p>

                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <th className="text-left text-sm font-medium text-muted-foreground py-2">Name</th>
                                                <th className="text-left text-sm font-medium text-muted-foreground py-2 hidden sm:table-cell">Role</th>
                                                <th className="text-right text-sm font-medium text-muted-foreground py-2"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {teamMembers
                                                .filter((m) => !m.isOwner)
                                                .map((member) => (
                                                    <tr key={member.id} className="border-b border-border last:border-0">
                                                        <td className="py-3">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-8 w-8">
                                                                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                                                        {member.name
                                                                            .split(" ")
                                                                            .map((n) => n[0])
                                                                            .join("")}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="min-w-0">
                                                                    <p className="font-medium text-sm truncate">{member.name}</p>
                                                                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 hidden sm:table-cell">
                                                            <span className="text-sm capitalize text-muted-foreground">{member.role}</span>
                                                        </td>
                                                        <td className="py-3 text-right">
                                                            <Button variant="ghost" size="sm" className="text-primary">
                                                                Edit
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* FAB Save Button */}
                <Button onClick={handleSave} size="lg" className="fixed bottom-6 right-6 px-6 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50" disabled={isSaving || isLoadingSettings}>
                    <Save className="h-5 w-5 mr-2" />
                    {isSaving ? "Saving…" : "Save Settings"}
                </Button>

                {/* Autopilot Confirmation Dialog */}
                <AlertDialog open={showAutopilotConfirm} onOpenChange={setShowAutopilotConfirm}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                Enable Autopilot?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-left space-y-2">
                                <p>
                                    <strong>Warning:</strong> The AI will automatically respond to ALL incoming messages, including:
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                    <li>Friends and family</li>
                                    <li>Spam and promotional messages</li>
                                    <li>Anyone who DMs you</li>
                                </ul>
                                <p className="pt-2">Make sure your entry points are specific enough to filter personal conversations.</p>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmAutopilot}>Enable Autopilot</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AppLayout>
    );
}
