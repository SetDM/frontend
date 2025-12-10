import { cn } from "@/lib/utils";
import { FunnelStage } from "@/types";

interface StageBadgeProps {
  stage: FunnelStage;
  className?: string;
}

const stageConfig: Record<FunnelStage, { label: string; className: string }> = {
  responded: {
    label: "Responded",
    className: "bg-stage-responded text-white",
  },
  lead: {
    label: "Lead",
    className: "bg-stage-lead text-white",
  },
  qualified: {
    label: "Qualified",
    className: "bg-stage-qualified text-white",
  },
  "booking-sent": {
    label: "Booking Sent",
    className: "bg-stage-booking-sent text-white",
  },
  "call-booked": {
    label: "Call Booked",
    className: "bg-stage-call-booked text-white",
  },
  sale: {
    label: "Sale",
    className: "bg-stage-sale text-white",
  },
  flagged: {
    label: "Flagged",
    className: "bg-red-600 text-white dark:bg-red-500",
  },
};

export function StageBadge({ stage, className }: StageBadgeProps) {
  const fallbackConfig = {
    label: stage.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
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
