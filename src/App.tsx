import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/context/AuthProvider";
import { UnsavedChangesProvider } from "@/context/UnsavedChangesContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Messages from "./pages/Messages";
// import ColdOutreach from "./pages/ColdOutreach";
// import ColdOutreachStats from "./pages/ColdOutreachStats";
import Prompt from "./pages/Prompt";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import AuthSuccess from "./pages/AuthSuccess";
import AuthError from "./pages/AuthError";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AcceptInvite from "./pages/AcceptInvite";
import TeamLogin from "./pages/TeamLogin";

const queryClient = new QueryClient();

const App = () => (
    <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system">
            <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                    <AuthProvider>
                        <UnsavedChangesProvider>
                            <Routes>
                                <Route path="/login" element={<Login />} />
                                <Route path="/auth/success" element={<AuthSuccess />} />
                                <Route path="/auth/error" element={<AuthError />} />
                                <Route path="/privacy" element={<PrivacyPolicy />} />
                                <Route path="/invite/:token" element={<AcceptInvite />} />
                                <Route path="/team-login" element={<TeamLogin />} />
                                <Route path="/team-login/:token" element={<TeamLogin />} />
                                <Route element={<ProtectedRoute />}>
                                    <Route path="/" element={<Dashboard />} />
                                    <Route path="/messages" element={<Messages />} />
                                    {/* Cold Outreach hidden for now */}
                                    {/* <Route path="/cold-outreach" element={<ColdOutreach />} /> */}
                                    {/* <Route path="/cold-outreach/stats" element={<ColdOutreachStats />} /> */}
                                    <Route path="/prompt" element={<Prompt />} />
                                    <Route path="/settings" element={<Settings />} />
                                    <Route path="*" element={<NotFound />} />
                                </Route>
                            </Routes>
                        </UnsavedChangesProvider>
                    </AuthProvider>
                </BrowserRouter>
            </TooltipProvider>
        </ThemeProvider>
    </QueryClientProvider>
);

export default App;
