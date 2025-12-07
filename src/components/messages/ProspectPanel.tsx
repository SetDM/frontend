import { Prospect, InstagramUserProfile, QueuedMessage } from "@/types";
import { StageBadge } from "@/components/StageBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";

interface ProspectPanelProps {
  prospect: Prospect | null;
  profile?: InstagramUserProfile | null;
  aiNotes: string[];
  queuedMessages: QueuedMessage[];
  onToggleAutopilot?: (conversationId: string, enabled: boolean) => void | Promise<void>;
  onCancelQueuedMessage?: (conversationId: string, queuedMessageId: string) => void | Promise<void>;
  onSendQueuedMessageNow?: (conversationId: string, queuedMessageId: string) => void | Promise<void>;
  onClearFlag?: (conversationId: string) => void | Promise<void>;
  onRefreshAiNotes?: (conversationId: string) => void | Promise<void>;
  autopilotUpdating?: boolean;
  aiNotesLoading?: boolean;
  queueCancelBusyIds?: string[];
  queueSendBusyIds?: string[];
  clearFlagBusyConversationId?: string | null;
}

const formatCount = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0";
  }
  return value.toLocaleString();
};

export function ProspectPanel({
  prospect,
  profile,
  aiNotes,
  queuedMessages = [],
  onToggleAutopilot,
  onCancelQueuedMessage,
  onSendQueuedMessageNow,
  onClearFlag,
  onRefreshAiNotes,
  autopilotUpdating = false,
  aiNotesLoading = false,
  queueCancelBusyIds = [],
  queueSendBusyIds = [],
  clearFlagBusyConversationId = null,
}: ProspectPanelProps) {
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!queuedMessages.length) {
      setCountdowns({});
      return;
    }

    setCountdowns(
      queuedMessages.reduce<Record<string, number>>((acc, message) => {
        acc[message.id] = message.sendsIn;
        return acc;
      }, {}),
    );

    const interval = setInterval(() => {
      setCountdowns((prev) => {
        const next: Record<string, number> = {};
        queuedMessages.forEach((message) => {
          const previous = prev[message.id];
          next[message.id] = typeof previous === "number"
            ? Math.max(0, previous - 1)
            : Math.max(0, message.sendsIn - 1);
        });
        return next;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [queuedMessages]);

  const formatScheduledLabel = (scheduledFor: string | null) => {
    if (!scheduledFor) {
      return "Awaiting send";
    }

    const parsed = new Date(scheduledFor);
    if (Number.isNaN(parsed.getTime())) {
      return "Awaiting send";
    }

    return parsed.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleCancelQueued = (queuedMessageId: string) => {
    if (!prospect || !onCancelQueuedMessage) {
      return;
    }

    onCancelQueuedMessage(prospect.id, queuedMessageId);
  };

  const handleSendQueuedNow = (queuedMessageId: string) => {
    if (!prospect || !onSendQueuedMessageNow) {
      return;
    }

    onSendQueuedMessageNow(prospect.id, queuedMessageId);
  };

  const handleClearFlag = () => {
    if (!prospect || !onClearFlag) {
      return;
    }

    onClearFlag(prospect.id);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (!prospect) {
    return (
      <div className="flex h-full w-80 flex-col overflow-auto border-l border-border bg-card p-4">
        <p className="text-center text-muted-foreground">No prospect selected</p>
      </div>
    );
  }

  const followerCount = profile?.followerCount ?? prospect.followerCount ?? prospect.followers;
  const followsBusiness = profile?.isUserFollowBusiness;
  const businessFollowsUser = profile?.isBusinessFollowUser;
  const sanitizedUsername = profile?.username?.replace(/^@+/, "");
  const displayHandle = sanitizedUsername ? `@${sanitizedUsername}` : prospect.handle;
  const displayName = profile?.name || sanitizedUsername || prospect.name;
  const initialsSource = (sanitizedUsername || displayName || prospect.handle || "IG").trim();
  const initials = initialsSource
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "IG";
  const avatarSrc = profile?.profilePic || prospect.profilePic || prospect.avatar;
  const isClearingFlag = clearFlagBusyConversationId === prospect.id;

  return (
    <div className="flex h-full w-80 flex-col overflow-auto border-l border-border bg-card">
      {/* Profile Card */}
      <div className="border-b border-border p-4">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <Avatar className="h-16 w-16">
              {avatarSrc ? <AvatarImage src={avatarSrc} alt={displayName} /> : null}
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-pink/20 text-foreground text-lg font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink text-[10px] font-bold text-pink-foreground">
              !
            </div>
          </div>
          <h3 className="mt-3 font-semibold text-foreground">{displayName}</h3>
          <p className="text-sm text-muted-foreground">{displayHandle}</p>
          
          <div className="mt-3 flex flex-col gap-2 text-xs text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">{formatCount(followerCount)}</span> followers
            </div>
            {typeof followsBusiness === "boolean" && (
              <div>
                <span className="font-medium text-foreground">
                  {followsBusiness ? "Yes" : "No"}
                </span>{" "}
                follows your business
              </div>
            )}
            {typeof businessFollowsUser === "boolean" && (
              <div>
                <span className="font-medium text-foreground">
                  {businessFollowsUser ? "Yes" : "No"}
                </span>{" "}
                business follows this user
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <StageBadge stage={prospect.stage} />
          </div>

          {prospect.isFlagged && (
            <div className="mt-4 w-full">
              <Button
                variant="destructive"
                className="w-full"
                disabled={!onClearFlag || isClearingFlag}
                onClick={handleClearFlag}
              >
                {isClearingFlag ? "Removing flag..." : "Remove flag"}
              </Button>
            </div>
          )}

          <div className="mt-4 flex w-full items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
            <span className="text-sm text-muted-foreground">Autopilot</span>
            <div className="flex items-center gap-2">
              <Switch
                checked={prospect.autopilotEnabled}
                disabled={autopilotUpdating || prospect.isFlagged}
                onCheckedChange={(checked) => onToggleAutopilot?.(prospect.id, checked)}
              />
              {autopilotUpdating && (
                <span className="text-xs text-muted-foreground">Updating...</span>
              )}
            </div>
          </div>
          {prospect.isFlagged && (
            <p className="mt-2 text-xs text-muted-foreground">
              Remove the flag to re-enable autopilot.
            </p>
          )}
        </div>
      </div>

      {/* Lead Score */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Lead Score</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">{prospect.leadScore}</span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
        </div>
      </div>

      {/* AI Notes */}
      <div className="border-b border-border p-4">
        <h4 className="mb-3 font-medium text-foreground">AI Notes</h4>
          {prospect && onRefreshAiNotes && (
            <Button
              size="sm"
              variant="outline"
              className="mb-2 w-full"
              disabled={aiNotesLoading}
              onClick={() => onRefreshAiNotes(prospect.id)}
            >
              {aiNotesLoading ? "Updating notes..." : "Refresh AI notes"}
            </Button>
          )}
        <div className="space-y-2 rounded-lg bg-secondary/30 p-3">
          {aiNotesLoading && (
            <p className="text-xs text-muted-foreground">
              {aiNotes.length ? "Refreshing AI notes..." : "Generating AI notes..."}
            </p>
          )}
          {aiNotes.length === 0 && !aiNotesLoading ? (
            <p className="text-xs text-muted-foreground">No AI notes yet.</p>
          ) : null}
          {aiNotes.length > 0 && (
            <ul className="space-y-1">
              {aiNotes.map((note, index) => (
                <li key={index} className="text-xs text-muted-foreground">
                  • {note}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Queued Messages */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-foreground">Queued Messages</h4>
          <span className="text-xs text-muted-foreground">{queuedMessages.length}</span>
        </div>
        {queuedMessages.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Autopilot has no pending replies for this conversation.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {queuedMessages.map((message) => {
              const countdown =
                typeof countdowns[message.id] === "number"
                  ? countdowns[message.id]
                  : message.sendsIn;
              const isCancelling = queueCancelBusyIds.includes(message.id);
              const isSendingNow = queueSendBusyIds.includes(message.id);

              return (
                <div
                  key={message.id}
                  className="rounded-lg border border-primary/20 bg-primary/5 p-3"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold uppercase tracking-wide text-primary">
                      Autopilot queued
                    </span>
                    <span>Sends in {formatTime(Math.max(0, countdown))}</span>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{message.content}</p>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    {formatScheduledLabel(message.scheduledFor)}
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={
                        !prospect ||
                        !onSendQueuedMessageNow ||
                        isSendingNow ||
                        isCancelling
                      }
                      onClick={() => handleSendQueuedNow(message.id)}
                    >
                      {isSendingNow ? "Sending..." : "Send now"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={
                        !prospect ||
                        !onCancelQueuedMessage ||
                        isCancelling ||
                        isSendingNow
                      }
                      onClick={() => handleCancelQueued(message.id)}
                    >
                      {isCancelling ? "Cancelling..." : "Cancel queued message"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {queuedMessages.length > 0 && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Canceling removes the response from the queue.
          </p>
        )}
      </div>
    </div>
  );
}
