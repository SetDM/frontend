import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: LucideIcon;
  className?: string;
  showAlert?: boolean;
}

export function StatCard({ title, value, subtitle, icon: Icon, className, showAlert }: StatCardProps) {
  return (
    <div className={cn(
      "relative rounded-lg bg-card p-5 shadow-card transition-shadow hover:shadow-card-lg",
      className
    )}>
      {showAlert && (
        <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-pink text-[10px] font-bold text-pink-foreground shadow-lg">
          !
        </div>
      )}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
