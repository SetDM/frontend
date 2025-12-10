import { cn } from "@/lib/utils";
import { FunnelStage } from "@/types";

interface StageBadgeProps {
  stage: FunnelStage;
  className?: string;
  variant?: "soft" | "solid";
}

type StageConfig = {
  label: string;
  softClass: string;
  solidClass: string;
};

const stageConfig: Record<FunnelStage, StageConfig> = {
  responded: {
    label: "Responded",
    softClass: "bg-stage-responded/20 text-stage-responded",
    solidClass: "bg-stage-responded text-white",
  },
  lead: {
    label: "Lead",
    softClass: "bg-stage-lead/15 text-stage-lead",
    solidClass: "bg-stage-lead text-white",
  },
  qualified: {
    label: "Qualified",
    softClass: "bg-stage-qualified/15 text-stage-qualified",
    solidClass: "bg-stage-qualified text-white",
  },
  "booking-sent": {
    label: "Booking Sent",
    softClass: "bg-stage-booking-sent/15 text-stage-booking-sent",
    solidClass: "bg-stage-booking-sent text-white",
  },
  "call-booked": {
    label: "Call Booked",
    softClass: "bg-stage-call-booked/15 text-stage-call-booked",
    solidClass: "bg-stage-call-booked text-white",
  },
  sale: {
    label: "Sale",
    softClass: "bg-stage-sale/15 text-stage-sale",
    solidClass: "bg-stage-sale text-white",
  },
  flagged: {
    label: "Flagged",
    softClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200",
    solidClass: "bg-red-600 text-white dark:bg-red-500",
  },
};

export function StageBadge({ stage, className, variant = "soft" }: StageBadgeProps) {
  const baseLabel = stage.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  const fallbackConfig: StageConfig = {
    label: baseLabel,
    softClass: "bg-secondary text-secondary-foreground",
    solidClass: "bg-secondary text-secondary-foreground",
  };
  const config = stageConfig[stage] ?? fallbackConfig;
  const variantClass = variant === "solid" ? config.solidClass : config.softClass;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variantClass,
        className
      )}
    >
      {config.label}
    </span>
  );
}
