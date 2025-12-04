import { FunnelData } from "@/types";
import { MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

export function FunnelPipeline({ data }: FunnelPipelineProps) {
  const navigate = useNavigate();
  const maxValue = Math.max(data.responded, 1);

  const handleStageClick = (filter: string) => {
    navigate(`/messages?stage=${filter}`);
  };

  // Calculate stage-to-stage conversion percentages (for bottleneck analysis)
  const getConversionPercent = (current: number, previous: number) => {
    if (previous === 0) return '0%';
    return ((current / previous) * 100).toFixed(2) + '%';
  };

  const conversions = {
    responded: '100%',
    lead: getConversionPercent(data.lead, data.responded),
    qualified: getConversionPercent(data.qualified, data.lead),
    callBooked: getConversionPercent(data.callBooked, data.qualified),
    sale: getConversionPercent(data.sale, data.callBooked),
  };

  // Calculate heights for each stage (percentage of max)
  const heights = {
    responded: 100,
    lead: Math.max(25, (data.lead / maxValue) * 100),
    qualified: Math.max(18, (data.qualified / maxValue) * 100),
    callBooked: Math.max(12, (data.callBooked / maxValue) * 100),
    sale: Math.max(8, (data.sale / maxValue) * 100),
  };

  const svgWidth = 1000;
  const svgHeight = 120;
  const maxFunnelHeight = 80;
  const centerY = 70;
  const sectionWidth = svgWidth / 5;

  // Build smooth funnel path with bezier curves
  const buildFunnelPath = () => {
    const h1 = (heights.responded / 100) * maxFunnelHeight;
    const h2 = (heights.lead / 100) * maxFunnelHeight;
    const h3 = (heights.qualified / 100) * maxFunnelHeight;
    const h4 = (heights.callBooked / 100) * maxFunnelHeight;
    const h5 = (heights.sale / 100) * maxFunnelHeight;

    const points = [
      { x: 0, h: h1 },
      { x: sectionWidth, h: h1 },
      { x: sectionWidth, h: h2 },
      { x: sectionWidth * 2, h: h2 },
      { x: sectionWidth * 2, h: h3 },
      { x: sectionWidth * 3, h: h3 },
      { x: sectionWidth * 3, h: h4 },
      { x: sectionWidth * 4, h: h4 },
      { x: sectionWidth * 4, h: h5 },
      { x: svgWidth, h: h5 },
    ];

    // Top edge with smooth curves
    let path = `M 0 ${centerY - h1 / 2}`;
    path += ` L ${sectionWidth - 30} ${centerY - h1 / 2}`;
    path += ` Q ${sectionWidth} ${centerY - h1 / 2}, ${sectionWidth} ${centerY - h2 / 2}`;
    path += ` L ${sectionWidth * 2 - 30} ${centerY - h2 / 2}`;
    path += ` Q ${sectionWidth * 2} ${centerY - h2 / 2}, ${sectionWidth * 2} ${centerY - h3 / 2}`;
    path += ` L ${sectionWidth * 3 - 30} ${centerY - h3 / 2}`;
    path += ` Q ${sectionWidth * 3} ${centerY - h3 / 2}, ${sectionWidth * 3} ${centerY - h4 / 2}`;
    path += ` L ${sectionWidth * 4 - 30} ${centerY - h4 / 2}`;
    path += ` Q ${sectionWidth * 4} ${centerY - h4 / 2}, ${sectionWidth * 4} ${centerY - h5 / 2}`;
    path += ` L ${svgWidth} ${centerY - h5 / 2}`;

    // Bottom edge (right to left)
    path += ` L ${svgWidth} ${centerY + h5 / 2}`;
    path += ` L ${sectionWidth * 4} ${centerY + h5 / 2}`;
    path += ` Q ${sectionWidth * 4} ${centerY + h4 / 2}, ${sectionWidth * 4 - 30} ${centerY + h4 / 2}`;
    path += ` L ${sectionWidth * 3} ${centerY + h4 / 2}`;
    path += ` Q ${sectionWidth * 3} ${centerY + h3 / 2}, ${sectionWidth * 3 - 30} ${centerY + h3 / 2}`;
    path += ` L ${sectionWidth * 2} ${centerY + h3 / 2}`;
    path += ` Q ${sectionWidth * 2} ${centerY + h2 / 2}, ${sectionWidth * 2 - 30} ${centerY + h2 / 2}`;
    path += ` L ${sectionWidth} ${centerY + h2 / 2}`;
    path += ` Q ${sectionWidth} ${centerY + h1 / 2}, ${sectionWidth - 30} ${centerY + h1 / 2}`;
    path += ` L 0 ${centerY + h1 / 2}`;
    path += ` Z`;

    return path;
  };

  // Build highlight path (upper portion only)
  const buildHighlightPath = () => {
    const h1 = (heights.responded / 100) * maxFunnelHeight;
    const h2 = (heights.lead / 100) * maxFunnelHeight;
    const h3 = (heights.qualified / 100) * maxFunnelHeight;
    const h4 = (heights.callBooked / 100) * maxFunnelHeight;
    const h5 = (heights.sale / 100) * maxFunnelHeight;

    const highlightRatio = 0.35;

    let path = `M 0 ${centerY - h1 / 2}`;
    path += ` L ${sectionWidth - 30} ${centerY - h1 / 2}`;
    path += ` Q ${sectionWidth} ${centerY - h1 / 2}, ${sectionWidth} ${centerY - h2 / 2}`;
    path += ` L ${sectionWidth * 2 - 30} ${centerY - h2 / 2}`;
    path += ` Q ${sectionWidth * 2} ${centerY - h2 / 2}, ${sectionWidth * 2} ${centerY - h3 / 2}`;
    path += ` L ${sectionWidth * 3 - 30} ${centerY - h3 / 2}`;
    path += ` Q ${sectionWidth * 3} ${centerY - h3 / 2}, ${sectionWidth * 3} ${centerY - h4 / 2}`;
    path += ` L ${sectionWidth * 4 - 30} ${centerY - h4 / 2}`;
    path += ` Q ${sectionWidth * 4} ${centerY - h4 / 2}, ${sectionWidth * 4} ${centerY - h5 / 2}`;
    path += ` L ${svgWidth} ${centerY - h5 / 2}`;

    // Bottom of highlight (not full bottom, just partial)
    path += ` L ${svgWidth} ${centerY - h5 / 2 + h5 * highlightRatio}`;
    path += ` L ${sectionWidth * 4} ${centerY - h5 / 2 + h5 * highlightRatio}`;
    path += ` Q ${sectionWidth * 4} ${centerY - h4 / 2 + h4 * highlightRatio}, ${sectionWidth * 4 - 30} ${centerY - h4 / 2 + h4 * highlightRatio}`;
    path += ` L ${sectionWidth * 3} ${centerY - h4 / 2 + h4 * highlightRatio}`;
    path += ` Q ${sectionWidth * 3} ${centerY - h3 / 2 + h3 * highlightRatio}, ${sectionWidth * 3 - 30} ${centerY - h3 / 2 + h3 * highlightRatio}`;
    path += ` L ${sectionWidth * 2} ${centerY - h3 / 2 + h3 * highlightRatio}`;
    path += ` Q ${sectionWidth * 2} ${centerY - h2 / 2 + h2 * highlightRatio}, ${sectionWidth * 2 - 30} ${centerY - h2 / 2 + h2 * highlightRatio}`;
    path += ` L ${sectionWidth} ${centerY - h2 / 2 + h2 * highlightRatio}`;
    path += ` Q ${sectionWidth} ${centerY - h1 / 2 + h1 * highlightRatio}, ${sectionWidth - 30} ${centerY - h1 / 2 + h1 * highlightRatio}`;
    path += ` L 0 ${centerY - h1 / 2 + h1 * highlightRatio}`;
    path += ` Z`;

    return path;
  };

  return (
    <div className="rounded-xl bg-card p-6 shadow-card">
      {/* Stage labels, counts, and action buttons */}
      <div className="grid grid-cols-5 gap-2 mb-6">
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

      {/* Funnel visualization */}
      <div className="relative">
        <svg 
          viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
          className="w-full h-auto" 
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Main gradient - golden orange */}
            <linearGradient id="funnelGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(38, 92%, 60%)" />
              <stop offset="50%" stopColor="hsl(35, 90%, 55%)" />
              <stop offset="100%" stopColor="hsl(32, 88%, 50%)" />
            </linearGradient>
            
            {/* Highlight gradient for 3D effect */}
            <linearGradient id="highlightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(45, 100%, 80%)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="hsl(38, 92%, 60%)" stopOpacity="0" />
            </linearGradient>

            {/* Subtle shadow */}
            <filter id="funnelShadow" x="-2%" y="-10%" width="104%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
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
            const percent = conversions[stage.key];
            return (
              <g key={stage.key}>
                <rect
                  x={xPos - 32}
                  y={centerY - 12}
                  width={64}
                  height={24}
                  rx={12}
                  fill="hsla(220, 20%, 20%, 0.7)"
                />
                <text
                  x={xPos}
                  y={centerY + 4}
                  textAnchor="middle"
                  fill="white"
                  fontSize="12"
                  fontWeight="600"
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
