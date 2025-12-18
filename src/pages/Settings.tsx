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
import { Instagram, User, Bot, Link2, Clock, AlertTriangle, MessageSquare, Ban, Target, Timer, Save, Users, Copy, Check, UserPlus, Trash2, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/hooks/useAuth";
import { AUTH_ENDPOINTS, SETTINGS_ENDPOINTS, TEAM_ENDPOINTS } from "@/lib/config";
import type { WorkspaceSettings, TeamMember } from "@/types";

type TeamRole = "admin" | "editor" | "viewer";

interface PendingInvite {
    id: string;
    email: string;
    role: TeamRole;
    expiresAt: string;
    createdAt: string;
}

const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
    admin: "Admins can manage all settings, team members, and have full access to all features except ownership transfer.",
    editor: "Editors can manage conversations, approve messages, and configure AI scripts but cannot manage team members.",
    viewer: "Viewers can only view conversations and stats but cannot make changes.",
};

const DEFAULT_SETTINGS: WorkspaceSettings = {
    profile: {
        coachName: "",
        brandName: "",
        calendarLink: "",
    },
    autopilot: {
        enabled: false,
        mode: "full",
        replyWindowStart: "07:00",
        replyWindowEnd: "22:00",
        responseDelayValue: 30,
        responseDelayUnit: "seconds",
        handleStoryReplies: true,
        handleCTAReplies: true,
        handleColdDMs: false,
        handoffInjuries: true,
        handoffAngry: true,
        handoffQualified: true,
    },
    entryPoints: {
        triggerExamples: [],
    },
    ignoreRules: {
        ignorePatterns: [],
    },
    filters: {
        minAge: 18,
        minFollowers: null,
        hidePrivateAccounts: false,
        blockedCountries: [],
        allowedCountries: ["USA", "UK", "Canada", "Australia"],
        allowedLanguages: ["English"],
    },
    notifications: {
        notifyQualified: true,
        notifyCallBooked: true,
        notifyNeedsReview: true,
        notifyWhenFlag: true,
        digestFrequency: "realtime",
    },
    team: {
        members: [],
    },
};

export default function Settings() {
    usePageTitle("Settings");
    const navigate = useNavigate();
    const { user, authorizedFetch, logout, redirectToLogin, activeWorkspaceId } = useAuth();

    const [isLoadingSettings, setIsLoadingSettings] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUnlinking, setIsUnlinking] = useState(false);

    // Store all settings in a single state object
    const [settings, setSettings] = useState<WorkspaceSettings>(DEFAULT_SETTINGS);

    // Autopilot confirmation dialog
    const [showAutopilotConfirm, setShowAutopilotConfirm] = useState(false);

    // Team state
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
    const [isLoadingTeam, setIsLoadingTeam] = useState(false);

    // Team invite dialog
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [selectedRole, setSelectedRole] = useState<TeamRole>("editor");
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [inviteEmailSent, setInviteEmailSent] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [isCreatingInvite, setIsCreatingInvite] = useState(false);

    // Delete confirmation
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Helper to update nested settings
    const updateProfile = (updates: Partial<WorkspaceSettings["profile"]>) => {
        setSettings((prev) => ({ ...prev, profile: { ...prev.profile, ...updates } }));
    };

    const updateAutopilot = (updates: Partial<WorkspaceSettings["autopilot"]>) => {
        setSettings((prev) => ({ ...prev, autopilot: { ...prev.autopilot, ...updates } }));
    };

    const updateEntryPoints = (updates: Partial<WorkspaceSettings["entryPoints"]>) => {
        setSettings((prev) => ({ ...prev, entryPoints: { ...prev.entryPoints, ...updates } }));
    };

    const updateIgnoreRules = (updates: Partial<WorkspaceSettings["ignoreRules"]>) => {
        setSettings((prev) => ({ ...prev, ignoreRules: { ...prev.ignoreRules, ...updates } }));
    };

    const updateFilters = (updates: Partial<WorkspaceSettings["filters"]>) => {
        setSettings((prev) => ({ ...prev, filters: { ...prev.filters, ...updates } }));
    };

    const handleAutopilotToggle = (checked: boolean) => {
        if (checked) {
            setShowAutopilotConfirm(true);
        } else {
            updateAutopilot({ enabled: false });
        }
    };

    const confirmAutopilot = () => {
        updateAutopilot({ enabled: true });
        setShowAutopilotConfirm(false);
    };

    // =========================================================================
    // TEAM MANAGEMENT
    // =========================================================================

    const loadTeamData = useCallback(async () => {
        if (!activeWorkspaceId) return;

        setIsLoadingTeam(true);
        try {
            const [membersRes, invitesRes] = await Promise.all([authorizedFetch(TEAM_ENDPOINTS.listMembers), authorizedFetch(TEAM_ENDPOINTS.listInvites)]);

            if (membersRes.ok) {
                const membersData = await membersRes.json();
                setTeamMembers(membersData.data || []);
            }

            if (invitesRes.ok) {
                const invitesData = await invitesRes.json();
                setPendingInvites(invitesData.data || []);
            }
        } catch (error) {
            console.error("Failed to load team data:", error);
        } finally {
            setIsLoadingTeam(false);
        }
    }, [activeWorkspaceId, authorizedFetch]);

    const createInvite = async () => {
        if (!inviteEmail.trim()) {
            toast.error("Please enter an email address.");
            return;
        }

        setIsCreatingInvite(true);
        try {
            const response = await authorizedFetch(TEAM_ENDPOINTS.createInvite, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: inviteEmail.trim(), role: selectedRole }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to create invite.");
            }

            setInviteLink(data.data.inviteUrl);
            setInviteEmailSent(data.data.emailSent || false);

            if (data.data.emailSent) {
                toast.success(`Invite email sent to ${inviteEmail}`);
            } else {
                toast.success(`Invite created for ${inviteEmail}. Share the link below.`);
            }

            // Refresh pending invites
            loadTeamData();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to create invite.");
        } finally {
            setIsCreatingInvite(false);
        }
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
        setInviteEmailSent(false);
        setInviteEmail("");
        setSelectedRole("editor");
        setLinkCopied(false);
    };

    const cancelInvite = async (inviteId: string) => {
        try {
            const response = await authorizedFetch(TEAM_ENDPOINTS.deleteInvite(inviteId), {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Failed to cancel invite.");
            }

            setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
            toast.success("Invite cancelled.");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to cancel invite.");
        }
    };

    const confirmDeleteMember = (member: TeamMember) => {
        setMemberToDelete(member);
        setDeleteConfirmOpen(true);
    };

    const removeMember = async () => {
        if (!memberToDelete) return;

        setIsDeleting(true);
        try {
            const response = await authorizedFetch(TEAM_ENDPOINTS.removeMember(memberToDelete.id), {
                method: "DELETE",
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to remove member.");
            }

            setTeamMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id));
            toast.success(`${memberToDelete.name || memberToDelete.email} has been removed.`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to remove member.");
        } finally {
            setIsDeleting(false);
            setDeleteConfirmOpen(false);
            setMemberToDelete(null);
        }
    };

    // Load team data when workspace changes
    useEffect(() => {
        if (activeWorkspaceId) {
            loadTeamData();
        }
    }, [activeWorkspaceId, loadTeamData]);

    // =========================================================================
    // SETTINGS API
    // =========================================================================

    const loadSettings = useCallback(
        async (signal?: AbortSignal) => {
            if (!activeWorkspaceId) {
                setIsLoadingSettings(false);
                return;
            }

            setIsLoadingSettings(true);
            try {
                const response = await authorizedFetch(SETTINGS_ENDPOINTS.workspace, { signal });
                const payload = await response.json().catch(() => null);

                if (!response.ok) {
                    const message = payload?.message || "Failed to load settings.";
                    throw new Error(message);
                }

                if (payload?.data) {
                    setSettings((prev) => ({
                        profile: { ...prev.profile, ...payload.data.profile },
                        autopilot: { ...prev.autopilot, ...payload.data.autopilot },
                        entryPoints: { ...prev.entryPoints, ...payload.data.entryPoints },
                        ignoreRules: { ...prev.ignoreRules, ...payload.data.ignoreRules },
                        filters: { ...prev.filters, ...payload.data.filters },
                        notifications: { ...prev.notifications, ...payload.data.notifications },
                        team: { ...prev.team, ...payload.data.team },
                    }));
                }
            } catch (error) {
                if (signal?.aborted) return;
                console.error(error);
                toast.error(error instanceof Error ? error.message : "Failed to load settings.");
            } finally {
                if (!signal?.aborted) {
                    setIsLoadingSettings(false);
                }
            }
        },
        [activeWorkspaceId, authorizedFetch]
    );

    useEffect(() => {
        const abortController = new AbortController();
        setSettings(DEFAULT_SETTINGS);

        if (!activeWorkspaceId) {
            setIsLoadingSettings(false);
            return () => abortController.abort();
        }

        loadSettings(abortController.signal);

        return () => abortController.abort();
    }, [activeWorkspaceId, loadSettings]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await authorizedFetch(SETTINGS_ENDPOINTS.workspace, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });

            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                const message = payload?.message || "Failed to save settings.";
                throw new Error(message);
            }

            if (payload?.data) {
                setSettings((prev) => ({
                    profile: { ...prev.profile, ...payload.data.profile },
                    autopilot: { ...prev.autopilot, ...payload.data.autopilot },
                    entryPoints: { ...prev.entryPoints, ...payload.data.entryPoints },
                    ignoreRules: { ...prev.ignoreRules, ...payload.data.ignoreRules },
                    filters: { ...prev.filters, ...payload.data.filters },
                    notifications: { ...prev.notifications, ...payload.data.notifications },
                    team: { ...prev.team, ...payload.data.team },
                }));
            }

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

        if (!confirmation) return;

        setIsUnlinking(true);

        try {
            const response = await authorizedFetch(AUTH_ENDPOINTS.unlink, { method: "POST" });

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                const message = payload?.message || "Failed to disconnect Instagram account.";
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

    // Helper to convert array to newline-separated string for textarea
    const arrayToText = (arr: string[]) => arr.join("\n");
    const textToArray = (text: string) =>
        text
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);

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
                                <Input
                                    id="coach-name"
                                    value={settings.profile.coachName}
                                    onChange={(e) => updateProfile({ coachName: e.target.value })}
                                    placeholder="Your name"
                                    className="mt-1.5"
                                    disabled={isLoadingSettings}
                                />
                            </div>
                            <div>
                                <Label htmlFor="brand-name">Brand Name</Label>
                                <Input
                                    id="brand-name"
                                    value={settings.profile.brandName}
                                    onChange={(e) => updateProfile({ brandName: e.target.value })}
                                    placeholder="Your brand"
                                    className="mt-1.5"
                                    disabled={isLoadingSettings}
                                />
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
                                value={settings.profile.calendarLink}
                                onChange={(e) => updateProfile({ calendarLink: e.target.value })}
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
                                <Input
                                    type="number"
                                    min="0"
                                    value={settings.autopilot.responseDelayValue}
                                    onChange={(e) => updateAutopilot({ responseDelayValue: parseInt(e.target.value) || 0 })}
                                    className="w-20"
                                    disabled={isLoadingSettings}
                                />
                                <Select
                                    value={settings.autopilot.responseDelayUnit}
                                    onValueChange={(v) => updateAutopilot({ responseDelayUnit: v as WorkspaceSettings["autopilot"]["responseDelayUnit"] })}
                                    disabled={isLoadingSettings}
                                >
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
                                <Switch checked={settings.autopilot.enabled} onCheckedChange={handleAutopilotToggle} className="shrink-0" disabled={isLoadingSettings} />
                            </div>

                            {settings.autopilot.enabled && (
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
                                        <Input
                                            type="time"
                                            value={settings.autopilot.replyWindowStart}
                                            onChange={(e) => updateAutopilot({ replyWindowStart: e.target.value })}
                                            className="w-full sm:w-32"
                                            disabled={isLoadingSettings}
                                        />
                                        <span className="text-muted-foreground shrink-0">to</span>
                                        <Input
                                            type="time"
                                            value={settings.autopilot.replyWindowEnd}
                                            onChange={(e) => updateAutopilot({ replyWindowEnd: e.target.value })}
                                            className="w-full sm:w-32"
                                            disabled={isLoadingSettings}
                                        />
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
                                    value={arrayToText(settings.entryPoints.triggerExamples)}
                                    onChange={(e) => updateEntryPoints({ triggerExamples: textToArray(e.target.value) })}
                                    placeholder="im fat&#10;how can i get like you&#10;i need help losing weight"
                                    className="mt-1.5 min-h-[100px]"
                                    disabled={isLoadingSettings}
                                />
                                <p className="text-xs text-muted-foreground mt-1">One per line. AI engages when messages match these patterns.</p>
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
                                <p className="text-sm text-muted-foreground">AI will not respond to these messages unless they also send a trigger message.</p>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="ignore-patterns">Ignore Patterns</Label>
                            <Textarea
                                id="ignore-patterns"
                                value={arrayToText(settings.ignoreRules.ignorePatterns)}
                                onChange={(e) => updateIgnoreRules({ ignorePatterns: textToArray(e.target.value) })}
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
                                    value={settings.filters.blockedCountries.join(", ")}
                                    onChange={(e) =>
                                        updateFilters({
                                            blockedCountries: e.target.value
                                                .split(",")
                                                .map((s) => s.trim())
                                                .filter(Boolean),
                                        })
                                    }
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
                                    value={settings.filters.allowedLanguages.join(", ")}
                                    onChange={(e) =>
                                        updateFilters({
                                            allowedLanguages: e.target.value
                                                .split(",")
                                                .map((s) => s.trim())
                                                .filter(Boolean),
                                        })
                                    }
                                    placeholder="English, Spanish"
                                    className="mt-1.5"
                                    disabled={isLoadingSettings}
                                />
                            </div>
                            <div>
                                <Label htmlFor="min-age">Minimum Age</Label>
                                <Input
                                    id="min-age"
                                    type="number"
                                    value={settings.filters.minAge}
                                    onChange={(e) => updateFilters({ minAge: parseInt(e.target.value) || 18 })}
                                    placeholder="18"
                                    className="mt-1.5"
                                    disabled={isLoadingSettings}
                                />
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
                                        Invite Member
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Invite Team Member</DialogTitle>
                                        <DialogDescription>Send an invite link to add someone to your team.</DialogDescription>
                                    </DialogHeader>

                                    {!inviteLink ? (
                                        <div className="space-y-4 py-4">
                                            <div>
                                                <Label htmlFor="invite-email">Email Address</Label>
                                                <Input
                                                    id="invite-email"
                                                    type="email"
                                                    value={inviteEmail}
                                                    onChange={(e) => setInviteEmail(e.target.value)}
                                                    placeholder="teammate@example.com"
                                                    className="mt-1.5"
                                                />
                                            </div>

                                            <div>
                                                <Label className="text-sm font-medium">Role</Label>
                                                <RadioGroup value={selectedRole} onValueChange={(value) => setSelectedRole(value as TeamRole)} className="mt-2 space-y-2">
                                                    {(["admin", "editor", "viewer"] as TeamRole[]).map((role) => (
                                                        <div key={role} className="flex items-start space-x-3">
                                                            <RadioGroupItem value={role} id={role} className="mt-0.5" />
                                                            <Label htmlFor={role} className="cursor-pointer font-normal text-sm">
                                                                <span className="font-medium capitalize">{role}</span>
                                                                <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
                                                            </Label>
                                                        </div>
                                                    ))}
                                                </RadioGroup>
                                            </div>

                                            <Button onClick={createInvite} className="w-full" disabled={isCreatingInvite || !inviteEmail.trim()}>
                                                {isCreatingInvite ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        Creating...
                                                    </>
                                                ) : (
                                                    "Create Invite Link"
                                                )}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 py-4">
                                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                                                <p className="text-sm font-medium text-green-600 dark:text-green-400">{inviteEmailSent ? "✉️ Invite email sent!" : "Invite created!"}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {inviteEmailSent
                                                        ? `We've sent an invite to ${inviteEmail}. The link expires in 24 hours.`
                                                        : `Share this link with ${inviteEmail}. It expires in 24 hours.`}
                                                </p>
                                            </div>

                                            <div>
                                                {inviteEmailSent && <p className="text-xs text-muted-foreground mb-2">You can also copy the link to share directly:</p>}
                                                <div className="flex items-center gap-2">
                                                    <Input value={inviteLink || ""} readOnly className="flex-1 text-sm bg-muted font-mono text-xs" />
                                                    <Button variant="outline" size="sm" onClick={copyInviteLink} className="gap-1 shrink-0">
                                                        {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                                        {linkCopied ? "Copied" : "Copy"}
                                                    </Button>
                                                </div>
                                            </div>

                                            <p className="text-xs text-muted-foreground text-center">When they click the link, they'll set up their account and access the platform.</p>

                                            <Button onClick={closeInviteDialog} className="w-full">
                                                Done
                                            </Button>
                                        </div>
                                    )}
                                </DialogContent>
                            </Dialog>
                        </div>

                        {isLoadingTeam ? (
                            <div className="flex items-center justify-center py-8 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                Loading team...
                            </div>
                        ) : (
                            <>
                                {/* Team Members List */}
                                <div className="space-y-2">
                                    {teamMembers.map((member) => (
                                        <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarFallback className={member.isOwner ? "bg-primary/10 text-primary" : "bg-muted"}>
                                                        {(member.name || member.email || "?")
                                                            .split(" ")
                                                            .map((n) => n[0])
                                                            .join("")
                                                            .toUpperCase()
                                                            .slice(0, 2)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium text-sm">{member.name || member.email}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {member.isOwner ? "Owner" : member.role} {member.email && !member.isOwner && `• ${member.email}`}
                                                    </p>
                                                </div>
                                            </div>
                                            {!member.isOwner && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => confirmDeleteMember(member)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Pending Invites */}
                                {pendingInvites.length > 0 && (
                                    <div className="mt-6">
                                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Pending Invites</h4>
                                        <div className="space-y-2">
                                            {pendingInvites.map((invite) => (
                                                <div key={invite.id} className="flex items-center justify-between p-3 rounded-lg border border-dashed border-border bg-muted/30">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                                                            <UserPlus className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm">{invite.email}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {invite.role} • Expires {new Date(invite.expiresAt).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => cancelInvite(invite.id)}>
                                                        Cancel
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
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

                {/* Delete Member Confirmation Dialog */}
                <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to remove <strong>{memberToDelete?.name || memberToDelete?.email}</strong> from your team? They will lose access to this workspace immediately.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={removeMember} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                {isDeleting ? "Removing..." : "Remove"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AppLayout>
    );
}
