import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { FunnelPipeline } from "@/components/FunnelPipeline";
import { MessageCircle, Bot, MessagesSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { CONVERSATION_ENDPOINTS } from "@/lib/config";
import type { DashboardStats, FunnelData } from "@/types";

const createEmptyStats = (): DashboardStats => ({
  ongoingChats: 0,
  autopilotEnabled: 0,
  needsReview: 0,
  inFollowupSequence: 0,
});

const createEmptyFunnel = (): FunnelData => ({
  responded: 0,
  lead: 0,
  qualified: 0,
  callBooked: 0,
  sale: 0,
  bookingSent: 0,
});

const normalizeStats = (value?: Partial<DashboardStats> | null): DashboardStats => ({
  ongoingChats: Math.max(0, Number(value?.ongoingChats) || 0),
  autopilotEnabled: Math.max(0, Number(value?.autopilotEnabled) || 0),
  needsReview: Math.max(0, Number(value?.needsReview) || 0),
  inFollowupSequence: Math.max(0, Number(value?.inFollowupSequence) || 0),
});

const normalizeFunnel = (value?: Partial<FunnelData> | null): FunnelData => ({
  responded: Math.max(0, Number(value?.responded) || 0),
  lead: Math.max(0, Number(value?.lead) || 0),
  qualified: Math.max(0, Number(value?.qualified) || 0),
  callBooked: Math.max(0, Number(value?.callBooked) || 0),
  sale: Math.max(0, Number(value?.sale) || 0),
  bookingSent: Math.max(0, Number(value?.bookingSent) || 0),
});

const formatShareLabel = (value: number, total: number, suffix = "of chats") => {
  if (!total) {
    return "—";
  }

  const ratio = Math.round((value / total) * 100);
  return `${ratio}% ${suffix}`;
};

export default function Dashboard() {
  const { authorizedFetch, user } = useAuth();
  const navigate = useNavigate();
  usePageTitle("Dashboard");
  const [stats, setStats] = useState<DashboardStats>(() => createEmptyStats());
  const [funnelData, setFunnelData] = useState<FunnelData>(() => createEmptyFunnel());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchMetrics = async () => {
      setIsLoading(true);
      try {
        const response = await authorizedFetch(CONVERSATION_ENDPOINTS.metrics);
        if (!response.ok) {
          throw new Error("Unable to load dashboard metrics.");
        }

        const payload = (await response.json()) as {
          data?: {
            stats?: Partial<DashboardStats>;
            funnel?: Partial<FunnelData>;
          };
        };

        if (!isMounted) {
          return;
        }

        setStats(normalizeStats(payload?.data?.stats));
        setFunnelData(normalizeFunnel(payload?.data?.funnel));
        setError(null);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        console.error("Failed to fetch conversation metrics", err);
        setError(err instanceof Error ? err.message : "Unable to load dashboard metrics.");
        setStats(createEmptyStats());
        setFunnelData(createEmptyFunnel());
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMetrics();

    return () => {
      isMounted = false;
    };
  }, [authorizedFetch]);

  const autopilotShare = formatShareLabel(stats.autopilotEnabled, stats.ongoingChats);
  const accountName = user?.username?.trim() || user?.instagramId || "there";

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            {`Welcome back, ${accountName}`}
          </h1>
          <p className="text-muted-foreground">
            Let's start the day off strong!
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Ongoing Chats"
            value={isLoading ? "—" : stats.ongoingChats}
            subtitle="Active conversations"
            icon={MessageCircle}
          />
          <StatCard
            title="Autopilot Enabled"
            value={isLoading ? "—" : stats.autopilotEnabled}
            subtitle={isLoading ? "—" : autopilotShare}
            icon={Bot}
          />
          <StatCard
            title="Needs Review"
            value={isLoading ? "—" : stats.needsReview}
            subtitle="Flagged conversations"
            icon={Bot}
            onClick={() => navigate("/messages?stage=flagged")}
          />
          <StatCard
            title="In Followup Sequence"
            value={isLoading ? "—" : stats.inFollowupSequence}
            subtitle="Queued followups"
            icon={MessagesSquare}
          />
        </div>

        {/* Funnel Pipeline */}
        <FunnelPipeline data={funnelData} />
      </div>
    </AppLayout>
  );
}
