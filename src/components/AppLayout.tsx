import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";

import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="hidden md:flex md:shrink-0">
        <AppSidebar />
      </div>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex flex-1 flex-col">
            <span className="text-sm font-semibold text-foreground">SetDM AI</span>
            <span className="text-xs text-muted-foreground">Navigate your workspace</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      {isMobile ? (
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetContent side="left" className="w-[280px] max-w-none border-0 bg-sidebar p-0">
            <AppSidebar />
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}
