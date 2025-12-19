import { FunnelData } from "@/types";
import { MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface FunnelPipelineProps {
    data: FunnelData;
}

const stages = [
    { key: "responded" as const, label: "Total Responded", filter: "responded" },
    { key: "lead" as const, label: "Lead", filter: "lead" },
    { key: "qualified" as const, label: "Qualified", filter: "qualified" },
    { key: "callBooked" as const, label: "Call Booked", filter: "call-booked" },
    { key: "sale" as const, label: "Sales", filter: "sale" },
];

type StageKey = (typeof stages)[number]["key"];

const stageColors: Record<StageKey, string> = {
    responded: "from-amber-300 to-amber-500",
    lead: "from-rose-300 to-rose-500",
    qualified: "from-indigo-300 to-indigo-500",
    callBooked: "from-teal-300 to-teal-500",
    sale: "from-emerald-300 to-emerald-500",
};

export function FunnelPipeline({ data }: FunnelPipelineProps) {
    const navigate = useNavigate();

    const handleStageClick = (filter: string) => {
        navigate(`/messages?stage=${filter}`);
    };

    // Total is the sum of all stages - this is what "Responded" represents
    const total = data.responded + data.lead + data.qualified + data.callBooked + data.sale;

    // Cumulative values from each stage onwards (for proper funnel tapering)
    const cumulativeValues = {
        responded: total,
        lead: data.lead + data.qualified + data.callBooked + data.sale,
        qualified: data.qualified + data.callBooked + data.sale,
        callBooked: data.callBooked + data.sale,
        sale: data.sale,
    };

    // Calculate stage-to-stage conversion percentages
    const getConversionPercent = (current: number, previous: number) => {
        if (previous === 0) return "0%";
        const percent = (current / previous) * 100;
        return percent.toFixed(percent >= 100 ? 0 : 2).replace(/\.?0+$/, "") + "%";
    };

    const conversions: Record<StageKey, string> = {
        responded: "100%",
        lead: getConversionPercent(cumulativeValues.lead, cumulativeValues.responded),
        qualified: getConversionPercent(cumulativeValues.qualified, cumulativeValues.lead),
        callBooked: getConversionPercent(cumulativeValues.callBooked, cumulativeValues.qualified),
        sale: getConversionPercent(cumulativeValues.sale, cumulativeValues.callBooked),
    };

    // Calculate heights as percentage of total - these will drive the funnel shape
    const maxValue = Math.max(total, 1);
    const stageHeightPercents = [
        100, // responded - always 100%
        Math.max(8, (cumulativeValues.lead / maxValue) * 100),
        Math.max(6, (cumulativeValues.qualified / maxValue) * 100),
        Math.max(4, (cumulativeValues.callBooked / maxValue) * 100),
        Math.max(2, (cumulativeValues.sale / maxValue) * 100),
    ];

    // Ensure monotonically decreasing (funnel only narrows)
    for (let i = 1; i < stageHeightPercents.length; i++) {
        stageHeightPercents[i] = Math.min(stageHeightPercents[i], stageHeightPercents[i - 1]);
    }

    const heights: Record<StageKey, number> = {
        responded: stageHeightPercents[0],
        lead: stageHeightPercents[1],
        qualified: stageHeightPercents[2],
        callBooked: stageHeightPercents[3],
        sale: stageHeightPercents[4],
    };

    // SVG dimensions - taller for better visibility
    const svgWidth = 1000;
    const svgHeight = 180;
    const maxFunnelHeight = 140;
    const centerY = svgHeight / 2;
    const sectionWidth = svgWidth / 5;

    // Get actual pixel heights for each stage
    const getStageHeight = (index: number) => {
        return (stageHeightPercents[index] / 100) * maxFunnelHeight;
    };

    // Build smooth funnel path that passes through each stage's height
    const buildFunnelPath = () => {
        const h = stageHeightPercents.map((p) => (p / 100) * maxFunnelHeight);

        // X positions for center of each stage
        const x = [
            sectionWidth * 0.5, // Stage 0 center
            sectionWidth * 1.5, // Stage 1 center
            sectionWidth * 2.5, // Stage 2 center
            sectionWidth * 3.5, // Stage 3 center
            sectionWidth * 4.5, // Stage 4 center
        ];

        // Build top edge with smooth curves through each point
        let path = `M 0 ${centerY - h[0] / 2}`;

        // Start: flat section at first stage
        path += ` L ${x[0]} ${centerY - h[0] / 2}`;

        // Curve from stage 0 to stage 1
        const cp1 = (x[0] + x[1]) / 2;
        path += ` C ${cp1} ${centerY - h[0] / 2}, ${cp1} ${centerY - h[1] / 2}, ${x[1]} ${centerY - h[1] / 2}`;

        // Curve from stage 1 to stage 2
        const cp2 = (x[1] + x[2]) / 2;
        path += ` C ${cp2} ${centerY - h[1] / 2}, ${cp2} ${centerY - h[2] / 2}, ${x[2]} ${centerY - h[2] / 2}`;

        // Curve from stage 2 to stage 3
        const cp3 = (x[2] + x[3]) / 2;
        path += ` C ${cp3} ${centerY - h[2] / 2}, ${cp3} ${centerY - h[3] / 2}, ${x[3]} ${centerY - h[3] / 2}`;

        // Curve from stage 3 to stage 4
        const cp4 = (x[3] + x[4]) / 2;
        path += ` C ${cp4} ${centerY - h[3] / 2}, ${cp4} ${centerY - h[4] / 2}, ${x[4]} ${centerY - h[4] / 2}`;

        // End: extend to right edge
        path += ` L ${svgWidth} ${centerY - h[4] / 2}`;

        // Bottom edge (right to left)
        path += ` L ${svgWidth} ${centerY + h[4] / 2}`;
        path += ` L ${x[4]} ${centerY + h[4] / 2}`;

        // Curve back from stage 4 to stage 3
        path += ` C ${cp4} ${centerY + h[4] / 2}, ${cp4} ${centerY + h[3] / 2}, ${x[3]} ${centerY + h[3] / 2}`;

        // Curve back from stage 3 to stage 2
        path += ` C ${cp3} ${centerY + h[3] / 2}, ${cp3} ${centerY + h[2] / 2}, ${x[2]} ${centerY + h[2] / 2}`;

        // Curve back from stage 2 to stage 1
        path += ` C ${cp2} ${centerY + h[2] / 2}, ${cp2} ${centerY + h[1] / 2}, ${x[1]} ${centerY + h[1] / 2}`;

        // Curve back from stage 1 to stage 0
        path += ` C ${cp1} ${centerY + h[1] / 2}, ${cp1} ${centerY + h[0] / 2}, ${x[0]} ${centerY + h[0] / 2}`;

        // Back to start
        path += ` L 0 ${centerY + h[0] / 2}`;
        path += ` Z`;

        return path;
    };

    // Build highlight path for 3D effect
    const buildHighlightPath = () => {
        const h = stageHeightPercents.map((p) => (p / 100) * maxFunnelHeight);
        const highlightRatio = 0.3;

        const x = [sectionWidth * 0.5, sectionWidth * 1.5, sectionWidth * 2.5, sectionWidth * 3.5, sectionWidth * 4.5];

        let path = `M 0 ${centerY - h[0] / 2}`;
        path += ` L ${x[0]} ${centerY - h[0] / 2}`;

        const cp1 = (x[0] + x[1]) / 2;
        path += ` C ${cp1} ${centerY - h[0] / 2}, ${cp1} ${centerY - h[1] / 2}, ${x[1]} ${centerY - h[1] / 2}`;

        const cp2 = (x[1] + x[2]) / 2;
        path += ` C ${cp2} ${centerY - h[1] / 2}, ${cp2} ${centerY - h[2] / 2}, ${x[2]} ${centerY - h[2] / 2}`;

        const cp3 = (x[2] + x[3]) / 2;
        path += ` C ${cp3} ${centerY - h[2] / 2}, ${cp3} ${centerY - h[3] / 2}, ${x[3]} ${centerY - h[3] / 2}`;

        const cp4 = (x[3] + x[4]) / 2;
        path += ` C ${cp4} ${centerY - h[3] / 2}, ${cp4} ${centerY - h[4] / 2}, ${x[4]} ${centerY - h[4] / 2}`;

        path += ` L ${svgWidth} ${centerY - h[4] / 2}`;

        // Bottom of highlight
        path += ` L ${svgWidth} ${centerY - h[4] / 2 + h[4] * highlightRatio}`;
        path += ` L ${x[4]} ${centerY - h[4] / 2 + h[4] * highlightRatio}`;

        path += ` C ${cp4} ${centerY - h[4] / 2 + h[4] * highlightRatio}, ${cp4} ${centerY - h[3] / 2 + h[3] * highlightRatio}, ${x[3]} ${centerY - h[3] / 2 + h[3] * highlightRatio}`;
        path += ` C ${cp3} ${centerY - h[3] / 2 + h[3] * highlightRatio}, ${cp3} ${centerY - h[2] / 2 + h[2] * highlightRatio}, ${x[2]} ${centerY - h[2] / 2 + h[2] * highlightRatio}`;
        path += ` C ${cp2} ${centerY - h[2] / 2 + h[2] * highlightRatio}, ${cp2} ${centerY - h[1] / 2 + h[1] * highlightRatio}, ${x[1]} ${centerY - h[1] / 2 + h[1] * highlightRatio}`;
        path += ` C ${cp1} ${centerY - h[1] / 2 + h[1] * highlightRatio}, ${cp1} ${centerY - h[0] / 2 + h[0] * highlightRatio}, ${x[0]} ${centerY - h[0] / 2 + h[0] * highlightRatio}`;

        path += ` L 0 ${centerY - h[0] / 2 + h[0] * highlightRatio}`;
        path += ` Z`;

        return path;
    };

    return (
        <div className="rounded-xl bg-card p-6 shadow-card">
            {/* Stage labels, counts, and action buttons */}
            <div className="mb-6 hidden grid-cols-5 gap-2 md:grid">
                {stages.map((stage) => {
                    // Show actual count for each stage (not cumulative)
                    const value = stage.key === "responded" ? total : data[stage.key];
                    return (
                        <div key={stage.key} className="flex flex-col items-center text-center">
                            <span className="text-xs font-medium text-muted-foreground mb-1">{stage.label}</span>
                            <span className="text-2xl font-bold text-foreground mb-3">{value}</span>
                            <button
                                onClick={() => handleStageClick(stage.filter)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground transition-all hover:bg-primary hover:text-primary-foreground hover:scale-105"
                            >
                                <MessageSquare className="h-4 w-4" />
                            </button>
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
                                    stageColors[stage.key]
                                )}
                            >
                                <span className="sr-only">{`${stage.label}: ${stage.key === "responded" ? total : data[stage.key]} conversations`}</span>
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
                                <span className="text-xl font-bold text-foreground">{stage.key === "responded" ? total : data[stage.key]}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Funnel visualization */}
            <div className="relative hidden md:block">
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        {/* Main gradient - golden orange */}
                        <linearGradient id="funnelGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="hsl(38, 92%, 65%)" />
                            <stop offset="100%" stopColor="hsl(28, 90%, 55%)" />
                        </linearGradient>

                        {/* Highlight gradient for 3D effect */}
                        <linearGradient id="highlightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.4)" />
                            <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
                        </linearGradient>

                        {/* Shadow filter */}
                        <filter id="funnelShadow" x="-5%" y="-15%" width="110%" height="140%">
                            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(0,0,0,0.15)" />
                        </filter>
                    </defs>

                    {/* Main funnel shape */}
                    <path d={buildFunnelPath()} fill="url(#funnelGradient)" filter="url(#funnelShadow)" />

                    {/* Highlight overlay for 3D effect */}
                    <path d={buildHighlightPath()} fill="url(#highlightGradient)" />

                    {/* Percentage pills with rounded borders like reference */}
                    {stages.map((stage, index) => {
                        const xPos = sectionWidth * index + sectionWidth / 2;
                        const stageHeight = getStageHeight(index);
                        const percent = conversions[stage.key];
                        const pillWidth = Math.max(60, percent.length * 9 + 24);
                        const pillHeight = 32;

                        return (
                            <g key={stage.key}>
                                {/* Pill background with border */}
                                <rect
                                    x={xPos - pillWidth / 2}
                                    y={centerY - pillHeight / 2}
                                    width={pillWidth}
                                    height={pillHeight}
                                    rx={pillHeight / 2}
                                    className="fill-card stroke-border"
                                    strokeWidth="2"
                                />
                                <text x={xPos} y={centerY + 5} textAnchor="middle" className="fill-foreground" fontSize="14" fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif">
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
