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
  ignored: {
    label: "Ignored",
    className: "bg-stage-ignored/15 text-stage-ignored",
  },
  unread: {
    label: "Unread",
    className: "bg-stage-unread/15 text-stage-unread",
  },
};

export function StageBadge({ stage, className }: StageBadgeProps) {
  const config = stageConfig[stage];
  
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
