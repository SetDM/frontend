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

            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                navigate("/");
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to accept invite.");
        } finally {
            setIsAccepting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-card rounded-xl shadow-lg p-8 border border-border">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                            SetDM
                        </h1>
                    </div>

                    {/* Loading State */}
                    {isValidating && (
                        <div className="text-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
                            <p className="text-muted-foreground">Validating invite...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {!isValidating && error && !success && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                                <XCircle className="h-8 w-8 text-destructive" />
                            </div>
                            <h2 className="text-xl font-semibold mb-2">Invalid Invite</h2>
                            <p className="text-muted-foreground mb-6">{error}</p>
                            <Button variant="outline" onClick={() => navigate("/login")}>
                                Go to Login
                            </Button>
                        </div>
                    )}

                    {/* Success State */}
                    {success && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="h-8 w-8 text-green-500" />
                            </div>
                            <h2 className="text-xl font-semibold mb-2">Welcome to the team!</h2>
                            <p className="text-muted-foreground">Redirecting you to the dashboard...</p>
                        </div>
                    )}

                    {/* Accept Form */}
                    {!isValidating && !error && inviteData && !success && (
                        <div>
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                    <UserPlus className="h-8 w-8 text-primary" />
                                </div>
                                <h2 className="text-xl font-semibold mb-2">You're Invited!</h2>
                                <p className="text-muted-foreground text-sm">
                                    You've been invited to join as{" "}
                                    {inviteData.role === "admin" ? "an" : "a"}{" "}
                                    <span className="font-medium capitalize">{inviteData.role}</span>
                                </p>
                            </div>

                            <form onSubmit={handleAccept} className="space-y-4">
                                <div>
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={inviteData.email}
                                        disabled
                                        className="mt-1.5 bg-muted"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="name">Your Name</Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your name"
                                        className="mt-1.5"
                                        required
                                        autoFocus
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90"
                                    disabled={isAccepting || !name.trim()}
                                >
                                    {isAccepting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Joining...
                                        </>
                                    ) : (
                                        "Accept Invite"
                                    )}
                                </Button>
                            </form>

                            <p className="text-xs text-muted-foreground text-center mt-6">
                                By accepting, you agree to our terms of service.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
