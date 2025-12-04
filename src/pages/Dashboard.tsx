import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { FunnelPipeline } from "@/components/FunnelPipeline";
import { mockDashboardStats, mockFunnelData } from "@/data/mockData";
import { MessageCircle, Bot, AlertCircle, MessagesSquare } from "lucide-react";

export default function Dashboard() {
  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, Iris
          </h1>
          <p className="text-muted-foreground">
            Let's start the day off strong!
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Ongoing Chats"
            value={mockDashboardStats.ongoingChats}
            subtitle="20% of all chats"
            icon={MessageCircle}
          />
          <StatCard
            title="Autopilot Enabled"
            value={mockDashboardStats.autopilotEnabled}
            subtitle="30% of all chats"
            icon={Bot}
          />
          <StatCard
            title="Needs Review"
            value={mockDashboardStats.needsReview}
            subtitle="Flagged"
            icon={AlertCircle}
            showAlert
          />
          <StatCard
            title="In Followup Sequence"
            value={mockDashboardStats.inFollowupSequence}
            subtitle="Active sequences"
            icon={MessagesSquare}
          />
        </div>

        {/* Funnel Pipeline */}
        <FunnelPipeline data={mockFunnelData} />
      </div>
    </AppLayout>
  );
}
