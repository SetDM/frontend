import { cn } from "@/lib/utils";
import { FunnelStage } from "@/types";

interface StageBadgeProps {
  stage: FunnelStage;
  className?: string;
}

const stageConfig: Record<FunnelStage, { label: string; className: string }> = {
  responded: {
    label: "Responded",
    className: "bg-stage-responded/20 text-stage-responded",
  },
  lead: {
    label: "Lead",
    className: "bg-stage-lead/15 text-stage-lead",
  },
  qualified: {
    label: "Qualified",
    className: "bg-stage-qualified/15 text-stage-qualified",
  },
  "call-booked": {
    label: "Call Booked",
    className: "bg-stage-call-booked/15 text-stage-call-booked",
  },
  sale: {
    label: "Sale",
    className: "bg-stage-sale/15 text-stage-sale",
  },
  flagged: {
    label: "Flagged",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200",
  },
};

export function StageBadge({ stage, className }: StageBadgeProps) {
  const fallbackConfig = {
    label: stage.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
    className: "bg-secondary text-secondary-foreground",
  };
  const config = stageConfig[stage] ?? fallbackConfig;
  
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
