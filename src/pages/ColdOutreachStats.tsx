import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TabToggle } from "@/components/TabToggle";
import { Calendar, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// =============================================================================
// TYPES - Vaibhav, use these types for API integration
// =============================================================================

/**
 * Data point for the chart
 * @property date - ISO date string or display date (e.g., "2024-12-10" or "Dec 10")
 * @property messagesSent - Number of messages sent on this date
 * @property responseRate - Response rate as a percentage (0-100)
 * @property responses - Optional: actual number of responses (for tooltip display)
 */
interface ChartDataPoint {
  date: string;
  messagesSent: number;
  responseRate: number;
  responses?: number; // Optional: include if you want to show actual response count in tooltip
}

/**
 * Summary stats for the selected date range
 */
interface StatsData {
  totalMessagesSent: number;
  totalResponses: number;
  overallResponseRate: number; // Percentage
}

// =============================================================================
// MOCK DATA - Replace with API call
// =============================================================================

/**
 * TODO (Vaibhav): Replace this with an API call
 * 
 * Example API endpoint: GET /api/outreach/stats?range=7d
 * 
 * The API should return:
 * {
 *   chartData: ChartDataPoint[],
 *   stats: StatsData
 * }
 */
const generateMockChartData = (dateRange: string): ChartDataPoint[] => {
  // This simulates different data for different date ranges
  // In production, fetch from API based on dateRange
  
  const baseData: ChartDataPoint[] = [
    { date: "Dec 01", messagesSent: 20, responseRate: 10, responses: 2 },
    { date: "Dec 02", messagesSent: 35, responseRate: 14, responses: 5 },
    { date: "Dec 03", messagesSent: 28, responseRate: 18, responses: 5 },
    { date: "Dec 04", messagesSent: 42, responseRate: 12, responses: 5 },
    { date: "Dec 05", messagesSent: 55, responseRate: 16, responses: 9 },
    { date: "Dec 06", messagesSent: 38, responseRate: 21, responses: 8 },
    { date: "Dec 07", messagesSent: 45, responseRate: 18, responses: 8 },
    { date: "Dec 08", messagesSent: 52, responseRate: 15, responses: 8 },
    { date: "Dec 09", messagesSent: 48, responseRate: 19, responses: 9 },
    { date: "Dec 10", messagesSent: 32, responseRate: 12, responses: 4 },
    { date: "Dec 11", messagesSent: 45, responseRate: 18, responses: 8 },
    { date: "Dec 12", messagesSent: 85, responseRate: 15, responses: 13 },
    { date: "Dec 13", messagesSent: 60, responseRate: 22, responses: 13 },
    { date: "Dec 14", messagesSent: 95, responseRate: 14, responses: 13 },
    { date: "Dec 15", messagesSent: 30, responseRate: 20, responses: 6 },
  ];

  // Simulate filtering based on date range
  switch (dateRange) {
    case "7d":
      return baseData.slice(-7);
    case "30d":
      return baseData; // All 15 days for demo
    case "90d":
      return baseData; // All 15 days for demo
    case "this_month":
      return baseData.slice(-10);
    case "last_month":
      return baseData.slice(0, 10);
    case "all":
    default:
      return baseData;
  }
};

/**
 * TODO (Vaibhav): Calculate these from API response or let the API return them
 */
const calculateStats = (chartData: ChartDataPoint[]): StatsData => {
  const totalMessagesSent = chartData.reduce((sum, d) => sum + d.messagesSent, 0);
  const totalResponses = chartData.reduce((sum, d) => sum + (d.responses || 0), 0);
  const overallResponseRate = totalMessagesSent > 0 
    ? Math.round((totalResponses / totalMessagesSent) * 100) 
    : 0;

  return {
    totalMessagesSent,
    totalResponses,
    overallResponseRate,
  };
};

// =============================================================================
// DATE RANGE OPTIONS
// =============================================================================

const dateRangeOptions = [
  { label: "All", value: "all" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "This month", value: "this_month" },
  { label: "Last month", value: "last_month" },
];

// =============================================================================
// COMPONENT
// =============================================================================

export default function ColdOutreachStats() {
  const [dateRange, setDateRange] = useState("all");

  // Memoize data fetching - replace with useQuery or API call
  // TODO (Vaibhav): Use React Query or similar for data fetching:
  // const { data: chartData, isLoading } = useQuery({
  //   queryKey: ['outreach-stats', dateRange],
  //   queryFn: () => fetchOutreachStats(dateRange)
  // });
  const chartData = useMemo(() => generateMockChartData(dateRange), [dateRange]);
  const stats = useMemo(() => calculateStats(chartData), [chartData]);

  const selectedRangeLabel = dateRangeOptions.find((opt) => opt.value === dateRange)?.label || "All";

  // Stats cards config - uses calculated stats
  const statsCards = [
    { label: "Opening Messages Sent", value: stats.totalMessagesSent.toString(), color: "text-primary" },
    { label: "Total Responses", value: stats.totalResponses.toString(), color: "text-primary" },
    { label: "Response Rate", value: `${stats.overallResponseRate}%`, color: "text-pink-accent" },
  ];

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h1 className="text-lg font-semibold text-foreground sm:text-xl">Stats for Outbound Messages</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              See your opening and response rate for your outbound messages.
            </p>
          </div>
          <TabToggle
            tabs={[
              { label: "Outbound", href: "/cold-outreach" },
              { label: "Stats", href: "/cold-outreach/stats" },
            ]}
            className="self-start sm:self-auto"
          />
        </div>

        <div className="p-4 sm:p-6">
          {/* Section Header with Date Range Filter */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-foreground sm:text-lg">Message Opens and Responses</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 self-start sm:self-auto">
                  <Calendar className="h-4 w-4" />
                  {selectedRangeLabel}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {dateRangeOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setDateRange(option.value)}
                    className="gap-2"
                  >
                    {dateRange === option.value && <Check className="h-4 w-4" />}
                    {dateRange !== option.value && <span className="w-4" />}
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Stats Cards - Updates based on selected date range */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {statsCards.map((stat) => (
              <Card key={stat.label} className="shadow-card">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground sm:text-sm">{stat.label}</p>
                  <p className={`mt-1 text-2xl font-semibold sm:text-3xl ${stat.color}`}>{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Chart - Data updates based on selected date range */}
          <Card className="shadow-card">
            <CardContent className="p-4 sm:p-6">
              <h3 className="mb-4 text-center text-xs font-medium text-foreground sm:mb-6 sm:text-sm">
                Messages Sent and Responded to Over Time
              </h3>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {/* 
                    Vaibhav: The chart expects data in this format:
                    [{ date: string, messagesSent: number, responseRate: number }, ...]
                    
                    - date: Display label for X-axis
                    - messagesSent: Count for left Y-axis (pink line)
                    - responseRate: Percentage for right Y-axis (blue line)
                  */}
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={{ stroke: "hsl(var(--border))" }}
                    />
                    {/* Left Y-Axis: Messages Sent (count) */}
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: "hsl(var(--pink-accent))", fontSize: 10 }}
                      axisLine={{ stroke: "hsl(var(--pink-accent))" }}
                      tickLine={{ stroke: "hsl(var(--pink-accent))" }}
                      width={35}
                    />
                    {/* Right Y-Axis: Response Rate (percentage) */}
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: "hsl(var(--primary))", fontSize: 10 }}
                      axisLine={{ stroke: "hsl(var(--primary))" }}
                      tickLine={{ stroke: "hsl(var(--primary))" }}
                      width={35}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        boxShadow: "var(--shadow-card)",
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number, name: string) => {
                        // Format tooltip values nicely
                        if (name === "Response Rate %") {
                          return [`${value}%`, name];
                        }
                        return [value, name];
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value) => (
                        <span style={{ color: "hsl(var(--foreground))", fontSize: 11 }}>
                          {value}
                        </span>
                      )}
                    />
                    {/* Pink Line: Messages Sent */}
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="messagesSent"
                      name="Messages Sent"
                      stroke="hsl(var(--pink-accent))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--pink-accent))", strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    {/* Blue Line: Response Rate */}
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="responseRate"
                      name="Response Rate %"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

