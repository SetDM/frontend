import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle, Mail, Users, ChevronRight } from "lucide-react";
import { TEAM_ENDPOINTS, EMAIL_FUNCTION_URL } from "@/lib/config";

interface WorkspaceOption {
    memberId: string;
    workspaceId: string;
    workspaceUsername: string | null;
    role: string;
}

export default function TeamLogin() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    // States for magic link login
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [loginSuccess, setLoginSuccess] = useState(false);

    // States for requesting magic link
    const [email, setEmail] = useState("");
    const [isRequesting, setIsRequesting] = useState(false);
    const [requestSent, setRequestSent] = useState(false);
    const [requestError, setRequestError] = useState<string | null>(null);

    // States for workspace picker
    const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
    const [showWorkspacePicker, setShowWorkspacePicker] = useState(false);
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

    // If we have a token in the URL, validate and log in
    useEffect(() => {
        if (!token) return;

        const loginWithToken = async () => {
            setIsLoggingIn(true);
            try {
                const response = await fetch(TEAM_ENDPOINTS.loginWithToken(token), {
                    method: "POST",
                    credentials: "include",
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Login link is invalid or expired.");
                }

                setLoginSuccess(true);

                // Get the auth token and redirect
                const authToken = data.token;
                setTimeout(() => {
                    if (authToken) {
                        navigate(`/?token=${encodeURIComponent(authToken)}`);
                    } else {
                        navigate("/");
                    }
                }, 1500);
            } catch (err) {
                setLoginError(err instanceof Error ? err.message : "Failed to log in.");
            } finally {
                setIsLoggingIn(false);
            }
        };

        loginWithToken();
    }, [token, navigate]);

    const handleRequestLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim()) return;

        setIsRequesting(true);
        setRequestError(null);

        try {
            // Request magic link from backend
            const response = await fetch(TEAM_ENDPOINTS.requestLogin, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.trim(),
                    workspaceId: selectedWorkspaceId, // Will be null if not selected
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to request login link.");
            }

            // Check if we need to show workspace picker
            if (data.data?.requiresSelection && data.data?.workspaces?.length > 1) {
                setWorkspaces(data.data.workspaces);
                setShowWorkspacePicker(true);
                setIsRequesting(false);
                return;
            }

            // If we got a login URL back, send the email via Netlify function with signed payload
            if (data.data?.emailPayload) {
                try {
                    const emailResponse = await fetch(EMAIL_FUNCTION_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            ...data.data.emailPayload,
                            signature: data.data.emailSignature,
                            timestamp: data.data.emailTimestamp,
                        }),
                    });
                    const emailResult = await emailResponse.json();
                    console.log("Email function response:", emailResult);
                    if (!emailResponse.ok || emailResult.error) {
                        console.error("Email function error:", emailResult.error || emailResponse.statusText);
                    }
                } catch (emailErr) {
                    console.error("Failed to send email:", emailErr);
                }
            }

            setRequestSent(true);
        } catch (err) {
            setRequestError(err instanceof Error ? err.message : "Failed to request login link.");
        } finally {
            setIsRequesting(false);
        }
    };

    const handleWorkspaceSelect = async (workspaceId: string) => {
        setSelectedWorkspaceId(workspaceId);
        setShowWorkspacePicker(false);
        setIsRequesting(true);

        try {
            // Request magic link for selected workspace
            const response = await fetch(TEAM_ENDPOINTS.requestLogin, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.trim(),
                    workspaceId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to request login link.");
            }

            // Send the email via Netlify function with signed payload
            if (data.data?.emailPayload) {
                try {
                    const emailResponse = await fetch(EMAIL_FUNCTION_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            ...data.data.emailPayload,
                            signature: data.data.emailSignature,
                            timestamp: data.data.emailTimestamp,
                        }),
                    });
                    const emailResult = await emailResponse.json();
                    console.log("Email function response:", emailResult);
                    if (!emailResponse.ok || emailResult.error) {
                        console.error("Email function error:", emailResult.error || emailResponse.statusText);
                    }
                } catch (emailErr) {
                    console.error("Failed to send email:", emailErr);
                }
            }

            setRequestSent(true);
        } catch (err) {
            setRequestError(err instanceof Error ? err.message : "Failed to request login link.");
        } finally {
            setIsRequesting(false);
        }
    };

    // If we're processing a token login
    if (token) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
                <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-card">
                    <div className="mb-6 text-center">
                        <h1 className="text-2xl font-bold text-foreground">Sign in to SetDM</h1>
                    </div>

                    {isLoggingIn && (
                        <div className="py-8 text-center">
                            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="text-muted-foreground">Logging you in...</p>
                        </div>
                    )}

                    {loginError && (
                        <div className="py-8 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                                <XCircle className="h-8 w-8 text-destructive" />
                            </div>
                            <h2 className="mb-2 text-xl font-semibold text-foreground">Login Failed</h2>
                            <p className="mb-6 text-muted-foreground">{loginError}</p>
                            <Button variant="outline" onClick={() => navigate("/team-login")}>
                                Try Again
                            </Button>
                        </div>
                    )}

                    {loginSuccess && (
                        <div className="py-8 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                                <CheckCircle className="h-8 w-8 text-green-500" />
                            </div>
                            <h2 className="mb-2 text-xl font-semibold text-foreground">Welcome back!</h2>
                            <p className="text-muted-foreground">Redirecting to dashboard...</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Request magic link form
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-card">
                <div className="mb-6 text-center">
                    <h1 className="text-2xl font-bold text-foreground">Team Member Login</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Enter your email to receive a login link.</p>
                </div>

                {requestSent ? (
                    <div className="py-8 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                            <Mail className="h-8 w-8 text-green-500" />
                        </div>
                        <h2 className="mb-2 text-xl font-semibold text-foreground">Check your email!</h2>
                        <p className="mb-6 text-muted-foreground">If an account exists with that email, we've sent you a login link. It expires in 15 minutes.</p>
                        <Button variant="outline" onClick={() => setRequestSent(false)}>
                            Send Another
                        </Button>
                    </div>
                ) : showWorkspacePicker ? (
                    <div>
                        <div className="mb-6 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                                <Users className="h-8 w-8 text-primary" />
                            </div>
                            <h2 className="mb-2 text-xl font-semibold text-foreground">Select Workspace</h2>
                            <p className="text-sm text-muted-foreground">You're a member of multiple workspaces. Select one to log in.</p>
                        </div>

                        <div className="space-y-2">
                            {workspaces.map((workspace) => (
                                <button
                                    key={workspace.workspaceId}
                                    onClick={() => handleWorkspaceSelect(workspace.workspaceId)}
                                    disabled={isRequesting}
                                    className="flex w-full items-center justify-between rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
                                >
                                    <div>
                                        <p className="font-medium text-foreground">@{workspace.workspaceUsername || workspace.workspaceId}</p>
                                        <p className="text-xs capitalize text-muted-foreground">{workspace.role}</p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </button>
                            ))}
                        </div>

                        <Button variant="ghost" className="mt-4 w-full" onClick={() => setShowWorkspacePicker(false)}>
                            Back
                        </Button>
                    </div>
                ) : (
                    <div>
                        <form onSubmit={handleRequestLogin} className="space-y-4">
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="mt-1.5" required autoFocus />
                            </div>

                            {requestError && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">{requestError}</div>}

                            <Button type="submit" className="w-full" size="lg" disabled={isRequesting || !email.trim()}>
                                {isRequesting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    "Send Login Link"
                                )}
                            </Button>
                        </form>

                        <p className="mt-6 text-center text-sm text-muted-foreground">
                            Are you the account owner?{" "}
                            <button type="button" onClick={() => navigate("/login")} className="text-primary hover:underline">
                                Log in with Instagram
                            </button>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
