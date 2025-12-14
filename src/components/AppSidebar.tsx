import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  MessageCircle, 
  FileText, 
  Settings, 
  LogOut,
  ChevronDown,
  Plus
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
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

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Messages", url: "/messages", icon: MessageCircle },
  { title: "Prompt", url: "/prompt", icon: FileText },
  { title: "Settings", url: "/settings", icon: Settings },
];

interface AppSidebarProps {
  className?: string;
}

export function AppSidebar({ className }: AppSidebarProps) {
  const { user, workspaces, activeWorkspaceId, switchWorkspace, redirectToLogin, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const initials = user?.username
    ? user.username
        .split(" ")
        .map((name) => name[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "--";

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
  };

  return (
    <aside
      className={cn(
        "flex h-screen w-56 min-w-[14rem] flex-col border-r border-sidebar-border bg-sidebar",
        "overflow-y-auto",
        className,
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <img src={logo} alt="SetDM AI" className="h-8 w-8 rounded-lg" />
        <span className="font-semibold text-foreground">SetDM AI</span>
      </div>

      {/* Workspace Selector */}
      <div className="border-b border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg bg-sidebar-accent px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent/80 focus:outline-none"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <div className="font-medium text-foreground">
                  {user?.username || "Select workspace"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {user?.accountType || "Instagram"}
                </div>
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
                {workspaces.map((workspace) => (
                  <DropdownMenuRadioItem
                    key={workspace.instagramId}
                    value={workspace.instagramId}
                    className="flex flex-col items-start gap-0.5 py-2"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {workspace.username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      @{workspace.instagramId}
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            ) : (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                Connect an Instagram account to get started.
              </div>
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

      {/* Logout */}
      <div className="border-t border-sidebar-border p-3">
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
