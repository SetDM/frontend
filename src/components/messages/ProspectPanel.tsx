import { Prospect } from "@/types";
import { StageBadge } from "@/components/StageBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";

interface ProspectPanelProps {
  prospect: Prospect | null;
  aiNotes: string[];
  queuedMessage?: {
    content: string;
    sendsIn: number;
  };
}

export function ProspectPanel({ prospect, aiNotes, queuedMessage }: ProspectPanelProps) {
  const [countdown, setCountdown] = useState(queuedMessage?.sendsIn || 0);

  useEffect(() => {
    if (queuedMessage) {
      setCountdown(queuedMessage.sendsIn);
      const interval = setInterval(() => {
        setCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [queuedMessage]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (!prospect) {
    return (
      <div className="w-80 border-l border-border bg-card p-4">
        <p className="text-center text-muted-foreground">No prospect selected</p>
      </div>
    );
  }

  return (
    <div className="w-80 border-l border-border bg-card overflow-auto">
      {/* Profile Card */}
      <div className="border-b border-border p-4">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-pink/20 text-foreground text-lg font-medium">
                {prospect.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink text-[10px] font-bold text-pink-foreground">
              !
            </div>
          </div>
          <h3 className="mt-3 font-semibold text-foreground">{prospect.name}</h3>
          <p className="text-sm text-muted-foreground">{prospect.handle}</p>
          
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">{prospect.followers.toLocaleString()}</span> followers
            </div>
            <div>
              <span className="font-medium text-foreground">{prospect.following.toLocaleString()}</span> following
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <StageBadge stage={prospect.stage} />
          </div>

          <div className="mt-4 flex w-full items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
            <span className="text-sm text-muted-foreground">Autopilot</span>
            <Switch checked={prospect.autopilotEnabled} />
          </div>
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
        <div className="space-y-2 rounded-lg bg-secondary/30 p-3">
          {aiNotes.map((note, index) => (
            <p key={index} className="text-xs text-muted-foreground">
              • {note}
            </p>
          ))}
        </div>
      </div>

      {/* Queued Message */}
      {queuedMessage && (
        <div className="p-4">
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-primary uppercase tracking-wide">Queued</span>
              <span className="text-xs text-muted-foreground">
                Sends in {formatTime(countdown)}
              </span>
            </div>
            <div className="rounded-lg bg-primary text-primary-foreground p-3 mb-3">
              <p className="text-sm">{queuedMessage.content}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1">
                Send now
              </Button>
              <Button size="sm" variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
