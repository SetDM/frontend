import { useEffect, useRef, useState } from "react";
import { Prospect, FunnelStage } from "@/types";
import { StageBadge } from "@/components/StageBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Loader2, Bot, X, CheckSquare } from "lucide-react";
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
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  className?: string;
  onToggleAutopilot?: (conversationId: string, enabled: boolean) => void | Promise<void>;
  onBulkToggleAutopilot?: (conversationIds: string[], enabled: boolean) => void | Promise<void>;
  autopilotBusyIds?: string[];
  bulkAutopilotBusy?: boolean;
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
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  className,
  onToggleAutopilot,
  onBulkToggleAutopilot,
  autopilotBusyIds = [],
  bulkAutopilotBusy = false,
}: ConversationListProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Exit select mode when filter changes
  useEffect(() => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  }, [selectedFilter]);

  const toggleSelectMode = () => {
    if (isSelectMode) {
      setSelectedIds(new Set());
    }
    setIsSelectMode(!isSelectMode);
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    const allIds = new Set(prospects.map((p) => p.id));
    setSelectedIds(allIds);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkAutopilot = async (enabled: boolean) => {
    if (onBulkToggleAutopilot && selectedIds.size > 0) {
      await onBulkToggleAutopilot(Array.from(selectedIds), enabled);
      setSelectedIds(new Set());
      setIsSelectMode(false);
    }
  };

  useEffect(() => {
    if (!onLoadMore || !hasMore) {
      return undefined;
    }

    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting && hasMore && !isLoadingMore) {
          onLoadMore();
        }
      },
      {
        root: listRef.current,
        threshold: 0.1,
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoadingMore, onLoadMore]);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col border-b border-border bg-card",
        "md:w-80 md:max-w-sm md:border-b-0 md:border-r",
        className,
      )}
    >
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

      {/* Filter Chips + Select Mode Toggle */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border p-3">
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
        <div className="flex-1" />
        {prospects.length > 0 && (
          <button
            type="button"
            onClick={toggleSelectMode}
            className={cn(
              "rounded-full p-1.5 text-xs transition-colors",
              isSelectMode
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary"
            )}
            title={isSelectMode ? "Exit select mode" : "Select multiple"}
          >
            {isSelectMode ? <X className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Bulk Actions Toolbar */}
      {isSelectMode && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
          <span className="text-xs text-muted-foreground">
            {selectedIds.size} selected
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={selectedIds.size === prospects.length ? clearSelection : selectAll}
            className="text-xs text-primary hover:underline"
          >
            {selectedIds.size === prospects.length ? "Deselect all" : "Select all"}
          </button>
          {selectedIds.size > 0 && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => handleBulkAutopilot(true)}
                disabled={bulkAutopilotBusy}
              >
                <Bot className="h-3 w-3" />
                Enable AI
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => handleBulkAutopilot(false)}
                disabled={bulkAutopilotBusy}
              >
                <Bot className="h-3 w-3" />
                Disable AI
              </Button>
            </>
          )}
        </div>
      )}

      {/* Conversation List */}
      <div className="flex-1 overflow-auto" ref={listRef}>
        {prospects.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
            <div className="space-y-3">
              <p>
                {searchQuery
                  ? "No conversations match your search."
                  : "No conversations match the selected stage just yet."}
              </p>
              {selectedFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => onFilterChange('all')}
                  className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  View all conversations
                </button>
              )}
            </div>
          </div>
        ) : (
          prospects.map((prospect) => {
            const displayName = prospect.username?.trim() || prospect.handle || prospect.name;
            const avatarFallback = (displayName || '')
              .split(/[^a-zA-Z0-9]+/)
              .filter(Boolean)
              .map((segment) => segment[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();
            const isAutopilotBusy = autopilotBusyIds.includes(prospect.id);
            const isSelected = selectedIds.has(prospect.id);

            return (
              <div
                key={prospect.id}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-border p-3 text-left transition-colors hover:bg-secondary/50",
                  selectedProspect?.id === prospect.id && "bg-secondary",
                  isSelected && "bg-primary/5"
                )}
              >
                {/* Checkbox for multi-select */}
                {isSelectMode && (
                  <div className="flex items-center pt-1">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelection(prospect.id)}
                      className="h-4 w-4"
                    />
                  </div>
                )}

                {/* Clickable area for selecting conversation */}
                <button
                  type="button"
                  onClick={() => !isSelectMode && onSelectProspect(prospect)}
                  className="flex flex-1 items-start gap-3 text-left min-w-0"
                  disabled={isSelectMode}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-pink/20 text-foreground text-sm font-medium">
                        {avatarFallback || displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {prospect.isUnread && (
                      <div className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-card bg-pink" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground truncate">
                        {displayName}
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
                </button>

                {/* Autopilot Toggle */}
                {!isSelectMode && onToggleAutopilot && (
                  <div 
                    className="flex flex-col items-center gap-0.5 pt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Switch
                      checked={prospect.autopilotEnabled}
                      onCheckedChange={(checked) => onToggleAutopilot(prospect.id, checked)}
                      disabled={isAutopilotBusy || prospect.isFlagged}
                      className="scale-75"
                    />
                    <span className={cn(
                      "text-[9px] font-medium",
                      prospect.autopilotEnabled ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                    )}>
                      {isAutopilotBusy ? "..." : prospect.autopilotEnabled ? "AI" : "Off"}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}

        <div ref={sentinelRef} className="px-4 py-3 text-center text-xs text-muted-foreground">
          {isLoadingMore ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading more conversations…
            </span>
          ) : hasMore && onLoadMore ? (
            <span>Scroll to load more conversations</span>
          ) : prospects.length > 0 ? (
            <span>You're all caught up.</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
