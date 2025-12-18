import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";

import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUnsavedChanges } from "@/context/UnsavedChangesContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface AppLayoutProps {
    children: React.ReactNode;
    hideMobileHeader?: boolean;
}

export function AppLayout({ children, hideMobileHeader = false }: AppLayoutProps) {
    const isMobile = useIsMobile();
    const location = useLocation();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { pendingNavigation, setPendingNavigation, onSave, setHasUnsavedChanges } = useUnsavedChanges();
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location.pathname]);

    const handleDiscard = () => {
        if (pendingNavigation) {
            setHasUnsavedChanges(false);
            navigate(pendingNavigation);
            setPendingNavigation(null);
        }
    };

    const handleSaveAndLeave = async () => {
        if (onSave) {
            setIsSaving(true);
            try {
                await onSave();
                setHasUnsavedChanges(false);
                if (pendingNavigation) {
                    navigate(pendingNavigation);
                    setPendingNavigation(null);
                }
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleCancel = () => {
        setPendingNavigation(null);
    };

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden">
            <div className="hidden md:flex md:shrink-0">
                <AppSidebar />
            </div>

            <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
                {!hideMobileHeader && (
                    <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
                        <Button type="button" size="icon" variant="outline" onClick={() => setIsSidebarOpen(true)} aria-label="Open navigation">
                            <Menu className="h-5 w-5" />
                        </Button>
                        <div className="flex flex-1 flex-col">
                            <span className="text-sm font-semibold text-foreground">SetDM AI</span>
                            <span className="text-xs text-muted-foreground">Navigate your workspace</span>
                        </div>
                    </header>
                )}
                <main className="flex-1 min-h-0 overflow-auto">{children}</main>
            </div>

            {isMobile ? (
                <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                    <SheetContent side="left" className="w-[280px] max-w-none border-0 bg-sidebar p-0">
                        <AppSidebar />
                    </SheetContent>
                </Sheet>
            ) : null}

            {/* Unsaved Changes Dialog */}
            <AlertDialog open={pendingNavigation !== null}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
                        <AlertDialogDescription>You have unsaved changes. Do you want to save before leaving?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
                        <Button variant="outline" onClick={handleDiscard}>
                            Discard Changes
                        </Button>
                        <AlertDialogAction onClick={handleSaveAndLeave} disabled={isSaving || !onSave}>
                            {isSaving ? "Saving..." : "Save & Leave"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
