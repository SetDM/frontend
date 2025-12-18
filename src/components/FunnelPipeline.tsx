import { FunnelData } from "@/types";
import { MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface FunnelPipelineProps {
  data: FunnelData;
}

const stages = [
  { key: 'responded' as const, label: 'Responded', filter: 'responded', showBadge: true },
  { key: 'lead' as const, label: 'Lead', filter: 'lead', showBadge: false },
  { key: 'qualified' as const, label: 'Qualified', filter: 'qualified', showBadge: false },
  { key: 'callBooked' as const, label: 'Call Booked', filter: 'call-booked', showBadge: true },
  { key: 'sale' as const, label: 'Sales', filter: 'sale', showBadge: false },
];

type StageKey = typeof stages[number]['key'];

const stageColors: Record<StageKey, string> = {
  responded: 'from-amber-300 to-amber-500',
  lead: 'from-rose-300 to-rose-500',
  qualified: 'from-indigo-300 to-indigo-500',
  callBooked: 'from-teal-300 to-teal-500',
  sale: 'from-emerald-300 to-emerald-500',
};

export function FunnelPipeline({ data }: FunnelPipelineProps) {
  const navigate = useNavigate();

  const handleStageClick = (filter: string) => {
    navigate(`/messages?stage=${filter}`);
  };

  // Calculate stage-to-stage conversion percentages
  const getConversionPercent = (current: number, previous: number) => {
    if (previous === 0) return '0%';
    return ((current / previous) * 100).toFixed(0) + '%';
  };

  const conversions: Record<StageKey, string> = {
    responded: '100%',
    lead: getConversionPercent(data.lead, data.responded),
    qualified: getConversionPercent(data.qualified, data.lead),
    callBooked: getConversionPercent(data.callBooked, data.qualified),
    sale: getConversionPercent(data.sale, data.callBooked),
  };

  // Calculate heights based on actual funnel progression (cumulative conversion)
  const maxValue = Math.max(data.responded, 1);
  const heights: Record<StageKey, number> = {
    responded: 100,
    lead: Math.max(60, (data.lead / maxValue) * 100),
    qualified: Math.max(40, (data.qualified / maxValue) * 100),
    callBooked: Math.max(25, (data.callBooked / maxValue) * 100),
    sale: Math.max(10, (data.sale / maxValue) * 100),
  };

  const svgWidth = 1000;
  const svgHeight = 120;
  const maxFunnelHeight = 90;
  const centerY = svgHeight / 2;
  const endTipHeight = 6; // Narrow tip at the end

  // Build smooth funnel path - proper taper from left to right
  const buildFunnelPath = () => {
    const startHeight = (heights.responded / 100) * maxFunnelHeight;
    
    // Create control points for a smooth bezier curve taper
    // The funnel smoothly narrows from full height to a thin tip
    const path = `
      M 0 ${centerY - startHeight / 2}
      C ${svgWidth * 0.3} ${centerY - startHeight / 2},
        ${svgWidth * 0.5} ${centerY - startHeight * 0.3},
        ${svgWidth * 0.75} ${centerY - endTipHeight}
      L ${svgWidth} ${centerY}
      L ${svgWidth * 0.75} ${centerY + endTipHeight}
      C ${svgWidth * 0.5} ${centerY + startHeight * 0.3},
        ${svgWidth * 0.3} ${centerY + startHeight / 2},
        0 ${centerY + startHeight / 2}
      Z
    `;
    return path;
  };

  // Build highlight path for 3D effect (top portion)
  const buildHighlightPath = () => {
    const startHeight = (heights.responded / 100) * maxFunnelHeight;
    const highlightOffset = startHeight * 0.25;
    
    const path = `
      M 0 ${centerY - startHeight / 2}
      C ${svgWidth * 0.3} ${centerY - startHeight / 2},
        ${svgWidth * 0.5} ${centerY - startHeight * 0.3},
        ${svgWidth * 0.75} ${centerY - endTipHeight}
      L ${svgWidth * 0.75} ${centerY - endTipHeight + 2}
      C ${svgWidth * 0.5} ${centerY - startHeight * 0.3 + highlightOffset * 0.3},
        ${svgWidth * 0.3} ${centerY - startHeight / 2 + highlightOffset},
        0 ${centerY - startHeight / 2 + highlightOffset}
      Z
    `;
    return path;
  };

  const sectionWidth = svgWidth / 5;

  // Calculate Y position for each pill based on funnel shape
  const getPillY = (index: number) => {
    return centerY; // Keep pills centered
  };

  return (
    <div className="rounded-xl bg-card p-6 shadow-card">
      {/* Stage labels, counts, and action buttons */}
      <div className="mb-6 hidden grid-cols-5 gap-2 md:grid">
        {stages.map((stage) => {
          const value = data[stage.key];
          return (
            <div key={stage.key} className="flex flex-col items-center text-center">
              <span className="text-xs font-medium text-muted-foreground mb-1">
                {stage.label}
              </span>
              <span className="text-2xl font-bold text-foreground mb-3">
                {value}
              </span>
              <div className="relative">
                <button
                  onClick={() => handleStageClick(stage.filter)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground transition-all hover:bg-primary hover:text-primary-foreground hover:scale-105"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
                {stage.showBadge && value > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white">
                    !
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile vertical funnel */}
      <div className="mb-6 md:hidden">
        <div className="flex gap-4">
          <div className="flex h-80 w-12 flex-col overflow-hidden rounded-full bg-muted/60 shadow-inner">
            {stages.map((stage) => (
              <button
                key={stage.key}
                type="button"
                onClick={() => handleStageClick(stage.filter)}
                style={{ flex: `${heights[stage.key]} 0 auto` }}
                className={cn(
                  "flex items-center justify-center bg-gradient-to-b text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  stageColors[stage.key],
                )}
              >
                <span className="sr-only">{`${stage.label}: ${data[stage.key]} conversations`}</span>
              </button>
            ))}
          </div>

          <div className="flex h-80 flex-1 flex-col">
            {stages.map((stage) => (
              <button
                key={stage.key}
                type="button"
                onClick={() => handleStageClick(stage.filter)}
                style={{ flex: `${heights[stage.key]} 0 auto` }}
                className="flex items-center justify-between rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">{stage.label}</span>
                  <span className="text-xs text-muted-foreground">{conversions[stage.key]} conversion</span>
                </div>
                <span className="text-xl font-bold text-foreground">{data[stage.key]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Funnel visualization */}
      <div className="relative hidden md:block">
        <svg 
          viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
          className="w-full h-auto" 
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Main gradient - golden orange */}
            <linearGradient id="funnelGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(38, 92%, 65%)" />
              <stop offset="100%" stopColor="hsl(28, 90%, 55%)" />
            </linearGradient>
            
            {/* Highlight gradient for 3D effect */}
            <linearGradient id="highlightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.35)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
            </linearGradient>

            {/* Subtle shadow */}
            <filter id="funnelShadow" x="-5%" y="-20%" width="110%" height="150%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="rgba(0,0,0,0.12)" />
            </filter>
          </defs>
          
          {/* Main funnel shape */}
          <path
            d={buildFunnelPath()}
            fill="url(#funnelGradient)"
            filter="url(#funnelShadow)"
          />
          
          {/* Highlight overlay for 3D effect */}
          <path
            d={buildHighlightPath()}
            fill="url(#highlightGradient)"
          />

          {/* Percentage pills */}
          {stages.map((stage, index) => {
            const xPos = sectionWidth * index + sectionWidth / 2;
            const yPos = getPillY(index);
            const percent = conversions[stage.key];
            const pillWidth = percent.length > 4 ? 58 : 50;
            return (
              <g key={stage.key}>
                <rect
                  x={xPos - pillWidth / 2}
                  y={yPos - 14}
                  width={pillWidth}
                  height={28}
                  rx={14}
                  fill="hsla(220, 15%, 25%, 0.85)"
                />
                <text
                  x={xPos}
                  y={yPos + 5}
                  textAnchor="middle"
                  fill="white"
                  fontSize="13"
                  fontWeight="600"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {percent}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
