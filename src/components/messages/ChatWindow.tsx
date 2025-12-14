import { Conversation } from "@/types";
import { StageBadge } from "@/components/StageBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Loader2, MoreVertical, Plus, Send, UserRound } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface ChatWindowProps {
  conversation: Conversation | null;
  onSendMessage?: (conversationId: string, content: string) => Promise<void> | void;
  onLoadOlderMessages?: (conversationId: string) => Promise<void> | void;
  isLoadingOlderMessages?: boolean;
  className?: string;
  onBackToList?: () => void;
  onShowDetails?: () => void;
}

export function ChatWindow({
  conversation,
  onSendMessage,
  onLoadOlderMessages,
  isLoadingOlderMessages = false,
  className,
  onBackToList,
  onShowDetails,
}: ChatWindowProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingOlderScrollAdjustmentRef = useRef<{ distanceFromBottom: number } | null>(null);

  const messageCount = conversation?.messages?.length ?? 0;

  useEffect(() => {
    setMessage("");
    setIsSending(false);
  }, [conversation?.id]);

  useEffect(() => {
    if (!conversation) {
      return;
    }

    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    const pendingAdjustment = pendingOlderScrollAdjustmentRef.current;
    if (pendingAdjustment) {
      requestAnimationFrame(() => {
        const nextScrollTop = container.scrollHeight - pendingAdjustment.distanceFromBottom;
        container.scrollTo({ top: Math.max(nextScrollTop, 0) });
      });
      pendingOlderScrollAdjustmentRef.current = null;
      return;
    }

    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [conversation, messageCount]);

  const handleSend = async () => {
    if (!conversation || !onSendMessage) {
      return;
    }

    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    try {
      setIsSending(true);
      await onSendMessage(conversation.id, trimmed);
      setMessage("");
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await handleSend();
    }
  };

  const handleLoadMoreMessages = async () => {
    if (!conversation || !onLoadOlderMessages) {
      return;
    }

    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    const distanceFromBottom = container.scrollHeight - container.scrollTop;
    pendingOlderScrollAdjustmentRef.current = { distanceFromBottom };

    try {
      await onLoadOlderMessages(conversation.id);
    } catch (error) {
      console.error("Failed to load older messages", error);
      pendingOlderScrollAdjustmentRef.current = null;
    }
  };

  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <p className="text-muted-foreground">Select a conversation to start chatting</p>
      </div>
    );
  }

  const { prospect, messages } = conversation;

  return (
    <div className={cn("flex flex-1 min-h-0 flex-col bg-background", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          {onBackToList ? (
            <button
              type="button"
              onClick={onBackToList}
              className="inline-flex items-center justify-center rounded-full border border-border p-1 text-muted-foreground transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Back to conversations"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-pink/20 text-foreground text-sm font-medium">
              {prospect.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{prospect.name}</span>
              <StageBadge stage={prospect.stage} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onShowDetails ? (
            <button
              type="button"
              onClick={onShowDetails}
              className="inline-flex items-center justify-center rounded-full border border-border p-1 text-muted-foreground transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
              aria-label="View prospect details"
            >
              <UserRound className="h-4 w-4" />
            </button>
          ) : null}
          <button className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-auto p-4 space-y-4">
        {conversation.hasMoreMessages ? (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              disabled={isLoadingOlderMessages || !onLoadOlderMessages}
              onClick={handleLoadMoreMessages}
              className="text-xs"
            >
              {isLoadingOlderMessages ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Loading messages...
                </span>
              ) : (
                "Load previous messages"
              )}
            </Button>
          </div>
        ) : null}
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No messages yet.
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.isFromProspect ? "justify-start" : "justify-end"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 border sm:max-w-[70%]",
                  msg.isFromProspect
                    ? "bg-card text-card-foreground shadow-sm border-transparent"
                    : cn(
                        "bg-primary text-primary-foreground",
                        msg.isAiGenerated
                          ? "border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.55)] ring-2 ring-offset-2 ring-amber-300/80 ring-offset-background"
                          : "border-transparent",
                      )
                )}
              >
                <p className="text-sm">{msg.content}</p>
                {msg.timestamp && (
                  <span
                    className={cn(
                      "mt-1 block text-[11px]",
                      msg.isFromProspect
                        ? "text-muted-foreground"
                        : "text-primary-foreground/80 text-right"
                    )}
                  >
                    {msg.timestamp}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-card p-4">
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground">
            <Plus className="h-5 w-5" />
          </Button>
          <Textarea
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[44px] max-h-32 resize-none border-0 bg-secondary/50 focus-visible:ring-1"
            rows={1}
          />
          <Button
            size="icon"
            className="shrink-0"
            onClick={handleSend}
            disabled={isSending || !message.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
