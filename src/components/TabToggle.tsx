import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface TabItem {
    label: string;
    href: string;
}

interface TabToggleProps {
    tabs: TabItem[];
    className?: string;
}

export function TabToggle({ tabs, className }: TabToggleProps) {
    const location = useLocation();

    return (
        <div className={cn("flex items-center gap-1 rounded-xl bg-muted/50 p-1", className)}>
            {tabs.map((tab) => {
                const isActive = location.pathname === tab.href;
                return (
                    <Link
                        key={tab.href}
                        to={tab.href}
                        className={cn(
                            "relative rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                            isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        {tab.label}
                    </Link>
                );
            })}
        </div>
    );
}
