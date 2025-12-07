import { Prospect, FunnelStage } from "@/types";
import { StageBadge } from "@/components/StageBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  prospects: Prospect[];
  selectedProspect: Prospect | null;
  onSelectProspect: (prospect: Prospect) => void;
  selectedFilter: FunnelStage | 'all';
  onFilterChange: (filter: FunnelStage | 'all') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  stageFilters: (FunnelStage | 'all')[];
}

const filterLabels: Record<FunnelStage | 'all', string> = {
  all: 'All',
  responded: 'Responded',
  lead: 'Lead',
  qualified: 'Qualified',
  'booking-sent': 'Booking Sent',
  'call-booked': 'Call Booked',
  sale: 'Sale',
  flagged: 'Flagged',
};

export function ConversationList({
  prospects,
  selectedProspect,
  onSelectProspect,
  selectedFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  stageFilters,
}: ConversationListProps) {
  return (
    <div className="flex h-full min-h-0 w-80 flex-col border-r border-border bg-card">
      {/* Search */}
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-secondary/50 border-0"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-1.5 border-b border-border p-3">
        {stageFilters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => onFilterChange(filter)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              selectedFilter === filter
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {filterLabels[filter]}
          </button>
        ))}
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-auto">
        {prospects.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
            {searchQuery
              ? "No conversations match your search."
              : "No conversations match the selected stage just yet."}
          </div>
        ) : (
          prospects.map((prospect) => (
            <button
              key={prospect.id}
              type="button"
              onClick={() => onSelectProspect(prospect)}
              className={cn(
                "flex w-full items-start gap-3 border-b border-border p-3 text-left transition-colors hover:bg-secondary/50",
                selectedProspect?.id === prospect.id && "bg-secondary"
              )}
            >
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-pink/20 text-foreground text-sm font-medium">
                    {prospect.name.split(' ').map((n) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                {prospect.isUnread && (
                  <div className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-card bg-pink" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground truncate">
                    {prospect.name}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {prospect.lastMessageTime}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <StageBadge stage={prospect.stage} className="text-[10px] px-1.5 py-0" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                  {prospect.lastMessage}
                </p>
              </div>

              <span className="mt-1 text-muted-foreground">
                <MoreVertical className="h-4 w-4" aria-hidden />
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
