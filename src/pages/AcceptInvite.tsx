import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle, UserPlus } from "lucide-react";
import { TEAM_ENDPOINTS } from "@/lib/config";

interface InviteData {
    email: string;
    role: string;
    expiresAt: string;
}

export default function AcceptInvite() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [isValidating, setIsValidating] = useState(true);
    const [isAccepting, setIsAccepting] = useState(false);
    const [inviteData, setInviteData] = useState<InviteData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [success, setSuccess] = useState(false);

    // Validate invite token on mount
    useEffect(() => {
        const validateInvite = async () => {
            if (!token) {
                setError("Invalid invite link.");
                setIsValidating(false);
                return;
            }

            try {
                const response = await fetch(TEAM_ENDPOINTS.validateInvite(token));
                const data = await response.json();

                if (!response.ok) {
                    setError(data.message || "This invite is invalid or has expired.");
                    setIsValidating(false);
                    return;
                }

                setInviteData(data.data);
            } catch (err) {
                setError("Failed to validate invite. Please try again.");
            } finally {
                setIsValidating(false);
            }
        };

        validateInvite();
    }, [token]);

    const handleAccept = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token || !name.trim()) return;

        setIsAccepting(true);
        try {
            const response = await fetch(TEAM_ENDPOINTS.acceptInvite(token), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim() }),
                credentials: "include",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to accept invite.");
            }

            setSuccess(true);

            // Get the auth token from the response
            const authToken = data.token;

            // Redirect to dashboard with token so AuthProvider picks it up
            setTimeout(() => {
                if (authToken) {
                    navigate(`/?token=${encodeURIComponent(authToken)}`);
                } else {
                    navigate("/");
                }
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to accept invite.");
        } finally {
            setIsAccepting(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-card">
                {/* Header */}
                <div className="mb-6 text-center">
                    <h1 className="text-2xl font-bold text-foreground">Join SetDM</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Accept your team invitation</p>
                </div>

                {/* Loading State */}
                {isValidating && (
                    <div className="py-8 text-center">
                        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-muted-foreground">Validating invite...</p>
                    </div>
                )}

                {/* Error State */}
                {!isValidating && error && !success && (
                    <div className="py-8 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                            <XCircle className="h-8 w-8 text-destructive" />
                        </div>
                        <h2 className="mb-2 text-xl font-semibold text-foreground">Invalid Invite</h2>
                        <p className="mb-6 text-muted-foreground">{error}</p>
                        <Button variant="outline" onClick={() => navigate("/login")}>
                            Go to Login
                        </Button>
                    </div>
                )}

                {/* Success State */}
                {success && (
                    <div className="py-8 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                            <CheckCircle className="h-8 w-8 text-green-500" />
                        </div>
                        <h2 className="mb-2 text-xl font-semibold text-foreground">Welcome to the team!</h2>
                        <p className="text-muted-foreground">Redirecting you to the dashboard...</p>
                    </div>
                )}

                {/* Accept Form */}
                {!isValidating && !error && inviteData && !success && (
                    <div>
                        <div className="mb-6 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                                <UserPlus className="h-8 w-8 text-primary" />
                            </div>
                            <h2 className="mb-2 text-xl font-semibold text-foreground">You're Invited!</h2>
                            <p className="text-sm text-muted-foreground">
                                You've been invited to join as {inviteData.role === "admin" ? "an" : "a"} <span className="font-medium capitalize">{inviteData.role}</span>
                            </p>
                        </div>

                        <form onSubmit={handleAccept} className="space-y-4">
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" value={inviteData.email} disabled className="mt-1.5 bg-muted" />
                            </div>

                            <div>
                                <Label htmlFor="name">Your Name</Label>
                                <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" className="mt-1.5" required autoFocus />
                            </div>

                            <Button type="submit" className="w-full" size="lg" disabled={isAccepting || !name.trim()}>
                                {isAccepting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Joining...
                                    </>
                                ) : (
                                    "Accept Invite"
                                )}
                            </Button>
                        </form>

                        <p className="mt-6 text-center text-xs text-muted-foreground">By accepting, you agree to our terms of service.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
