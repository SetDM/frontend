import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { LayoutDashboard, MessageCircle, FileText, Settings, LogOut, ChevronDown, Plus, Send, Moon, Sun } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import logo from "@/assets/logo.svg";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { isTeamMember } from "@/types";

const navItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Messages", url: "/messages", icon: MessageCircle },
    { title: "Cold Outreach", url: "/cold-outreach", icon: Send },
    { title: "Prompt", url: "/prompt", icon: FileText },
    { title: "Settings", url: "/settings", icon: Settings },
];

interface AppSidebarProps {
    className?: string;
}

export function AppSidebar({ className }: AppSidebarProps) {
    const { user, workspaces, activeWorkspaceId, switchWorkspace, redirectToLogin, logout } = useAuth();
    const { resolvedTheme, toggleTheme } = useTheme();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Get display info based on user type
    const isTeamMemberUser = isTeamMember(user);
    const displayName = isTeamMemberUser ? (user.workspaceUsername ? `@${user.workspaceUsername}` : user.name) : user?.username || "Select workspace";
    const displaySubtitle = isTeamMemberUser ? `${user.name} • ${user.role}` : user?.accountType || "Instagram";

    const initials = isTeamMemberUser
        ? (user.workspaceUsername || user.name || "TM")
              .split(/[\s@]+/)
              .filter(Boolean)
              .map((part) => part[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()
        : (user?.username || "--")
              .split(" ")
              .map((name) => name[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        await logout();
        setIsLoggingOut(false);
    };

    return (
        <aside className={cn("flex h-screen w-56 min-w-[14rem] flex-col border-r border-sidebar-border bg-sidebar", "overflow-y-auto", className)}>
            {/* Logo */}
            <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
                <img src={logo} alt="SetDM AI" className="h-8 w-8 rounded-lg" />
                <span className="font-semibold text-foreground">SetDM AI</span>
            </div>

            {/* Workspace Selector */}
            <div className="border-b border-sidebar-border p-3">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button type="button" className="flex w-full items-center gap-3 rounded-lg bg-sidebar-accent px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent/80 focus:outline-none">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 text-left">
                                <div className="font-medium text-foreground truncate">{displayName}</div>
                                <div className="text-xs text-muted-foreground truncate capitalize">{displaySubtitle}</div>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64" align="start">
                        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                        {workspaces.length > 0 ? (
                            <DropdownMenuRadioGroup
                                value={activeWorkspaceId ?? undefined}
                                onValueChange={(value) => {
                                    void switchWorkspace(value);
                                }}
                            >
                                {workspaces.map((workspace) => {
                                    const wsIsTeamMember = workspace.isTeamMember === true;
                                    const wsDisplayName = wsIsTeamMember
                                        ? workspace.workspaceUsername
                                            ? `@${workspace.workspaceUsername}`
                                            : workspace.name || "Workspace"
                                        : workspace.username || "Workspace";
                                    const wsSubtitle = wsIsTeamMember ? `${workspace.name || workspace.email} • ${workspace.role}` : `@${workspace.instagramId}`;
                                    return (
                                        <DropdownMenuRadioItem key={workspace.instagramId} value={workspace.instagramId} className="flex flex-col items-start gap-0.5 py-2">
                                            <span className="text-sm font-medium text-foreground">{wsDisplayName}</span>
                                            <span className="text-xs text-muted-foreground capitalize">{wsSubtitle}</span>
                                        </DropdownMenuRadioItem>
                                    );
                                })}
                            </DropdownMenuRadioGroup>
                        ) : (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">Connect an Instagram account to get started.</div>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="gap-2"
                            onSelect={() => {
                                redirectToLogin();
                            }}
                        >
                            <Plus className="h-4 w-4" />
                            Connect new workspace
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-3">
                {navItems.map((item) => (
                    <NavLink
                        key={item.title}
                        to={item.url}
                        end={item.url === "/"}
                        className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                        <item.icon className="h-4 w-4" />
                        {item.title}
                    </NavLink>
                ))}
            </nav>

            {/* Theme Toggle & Logout */}
            <div className="border-t border-sidebar-border p-3 space-y-1">
                <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    onClick={toggleTheme}
                    aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
                >
                    <div className="relative h-4 w-4">
                        <Sun className={cn("h-4 w-4 absolute inset-0 transition-all duration-300", resolvedTheme === "dark" ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0")} />
                        <Moon className={cn("h-4 w-4 absolute inset-0 transition-all duration-300", resolvedTheme === "dark" ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100")} />
                    </div>
                    {resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}
                </button>
                <button
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-70"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                >
                    <LogOut className="h-4 w-4" />
                    {isLoggingOut ? "Logging out..." : "Logout"}
                </button>
            </div>
        </aside>
    );
}
