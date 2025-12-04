import { Conversation } from "@/types";
import { StageBadge } from "@/components/StageBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MoreVertical, Plus, Send } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ChatWindowProps {
  conversation: Conversation | null;
}

export function ChatWindow({ conversation }: ChatWindowProps) {
  const [message, setMessage] = useState("");

  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <p className="text-muted-foreground">Select a conversation to start chatting</p>
      </div>
    );
  }

  const { prospect, messages } = conversation;

  return (
    <div className="flex flex-1 flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
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
        <button className="text-muted-foreground hover:text-foreground">
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={msg.id}
            className={cn(
              "flex",
              msg.isFromProspect ? "justify-start" : "justify-end"
            )}
          >
            <div
              className={cn(
                "max-w-[70%] rounded-2xl px-4 py-2.5",
                msg.isFromProspect
                  ? "bg-card text-card-foreground shadow-sm"
                  : "bg-primary text-primary-foreground"
              )}
            >
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
        
        <div className="flex justify-center">
          <span className="text-xs text-muted-foreground">Today 5:12PM</span>
        </div>
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
            className="min-h-[44px] max-h-32 resize-none border-0 bg-secondary/50 focus-visible:ring-1"
            rows={1}
          />
          <Button size="icon" className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
