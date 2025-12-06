import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ConversationList } from "@/components/messages/ConversationList";
import { ChatWindow } from "@/components/messages/ChatWindow";
import { ProspectPanel } from "@/components/messages/ProspectPanel";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { CONVERSATION_ENDPOINTS, USER_ENDPOINTS } from "@/lib/config";
import type {
  Conversation,
  ConversationRecord,
  FunnelStage,
  Message,
  Prospect,
  InstagramUserProfile,
} from "@/types";

const FUNNEL_STAGES: FunnelStage[] = [
  "responded",
  "lead",
  "qualified",
  "call-booked",
  "sale",
  "flagged",
];

const stageFilters: (FunnelStage | "all")[] = ["all", ...FUNNEL_STAGES];

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

const coerceDate = (input?: string | number | Date) => {
  if (!input) {
    return null;
  }

  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }

  if (typeof input === "number" && Number.isFinite(input)) {
    return new Date(input < 1e12 ? input * 1000 : input);
  }

  if (typeof input === "string") {
    const numericValue = Number(input);
    if (!Number.isNaN(numericValue)) {
      return new Date(numericValue < 1e12 ? numericValue * 1000 : numericValue);
    }

    const parsed = new Date(input);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

const formatRelativeTime = (input?: string | number | Date) => {
  const date = coerceDate(input);
  if (!date) {
    return "now";
  }

  const diffMs = Date.now() - date.getTime();
  if (diffMs <= 0) {
    return "now";
  }

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) {
    return "now";
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d`;
  }

  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
};

const formatMessageTimestamp = (input?: string | number | Date) => {
  const date = coerceDate(input);
  if (!date) {
    return "";
  }

  return timeFormatter.format(date);
};

const getMetadataString = (metadata: Record<string, unknown> | undefined, key: string) => {
  if (!metadata) {
    return undefined;
  }

  const value = metadata[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
};

const normalizeStageTag = (stageTag?: string | null): FunnelStage => {
  if (!stageTag) {
    return "responded";
  }

  const normalized = stageTag.trim().toLowerCase();
  const aliasMap: Record<string, FunnelStage> = {
    flag: "flagged",
    flagged: "flagged",
  };

  if (aliasMap[normalized]) {
    return aliasMap[normalized];
  }

  return FUNNEL_STAGES.find((stage) => stage === normalized) ?? "responded";
};

const deriveConversationId = (record: ConversationRecord) => {
  if (record.conversationId && record.conversationId.length > 0) {
    return record.conversationId;
  }

  if (record.id && record.id.length > 0) {
    return record.id;
  }

  const fallbackRecipient =
    typeof record.recipientId === "string" && record.recipientId.length > 0
      ? record.recipientId
      : "business";
  const fallbackSender =
    typeof record.senderId === "string" && record.senderId.length > 0
      ? record.senderId
      : "prospect";

  return `${fallbackRecipient}_${fallbackSender}`;
};

type MessageWithSort = Message & { sortValue: number };

const buildProspectFromRecord = (
  record: ConversationRecord,
  conversationId: string,
  messages: Message[],
  fallbackTimestamp?: string | number | Date,
  profile?: InstagramUserProfile | null,
): Prospect => {
  const metadata = record.metadata as Record<string, unknown> | undefined;
  const instagramId = typeof record.senderId === "string" && record.senderId.length > 0
    ? record.senderId
    : "unknown";
  const metadataName = getMetadataString(metadata, "prospectName") || instagramId;
  const metadataHandle = getMetadataString(metadata, "prospectHandle") || instagramId;
  const normalizedUsername = profile?.username
    ? profile.username.replace(/^@+/, "").trim()
    : undefined;
  const handleSource = normalizedUsername && normalizedUsername.length > 0
    ? normalizedUsername
    : metadataHandle;
  const normalizedHandle = handleSource.startsWith("@") ? handleSource : `@${handleSource}`;
  const lastMessage = messages[messages.length - 1];
  const followerCount =
    typeof profile?.followerCount === "number" && Number.isFinite(profile.followerCount)
      ? profile.followerCount
      : null;
  const autopilotEnabledFromRecord =
    typeof record.isAutopilotOn === "boolean" ? record.isAutopilotOn : false;

  return {
    id: conversationId,
    instagramId,
    name: normalizedUsername || metadataName,
    username: normalizedUsername || null,
    handle: normalizedHandle,
    avatar: profile?.profilePic || "",
    profilePic: profile?.profilePic || null,
    stage: normalizeStageTag(record.stageTag),
    followers: followerCount ?? 0,
    followerCount,
    following: 0,
    leadScore: 0,
    autopilotEnabled: autopilotEnabledFromRecord,
    isUserFollowBusiness: profile?.isUserFollowBusiness ?? null,
    isBusinessFollowUser: profile?.isBusinessFollowUser ?? null,
    lastMessage: lastMessage?.content ?? "No messages yet",
    lastMessageTime: formatRelativeTime(record.lastUpdated ?? fallbackTimestamp),
    isUnread: false,
  };
};

const buildConversationFromRecord = (
  record: ConversationRecord,
  profile?: InstagramUserProfile | null,
): Conversation => {
  const conversationId = deriveConversationId(record);
  const rawMessages = Array.isArray(record.messages) ? record.messages : [];

  const normalizedMessages: MessageWithSort[] = rawMessages.map((message, index) => {
    const timestampDate = coerceDate(message?.timestamp);
    const content = typeof message?.content === "string" ? message.content.trim() : "";

    return {
      id: message?.metadata?.mid ?? `${conversationId}-${index}`,
      content,
      timestamp: timestampDate ? formatMessageTimestamp(timestampDate) : "",
      isFromProspect: (message?.role ?? "user") !== "assistant",
      sortValue: timestampDate?.getTime() ?? index,
    };
  });

  const orderedMessages: Message[] = normalizedMessages
    .filter((message) => message.content.length > 0)
    .sort((a, b) => a.sortValue - b.sortValue)
    .map(({ sortValue, ...message }) => message);

  const fallbackTimestamp =
    rawMessages.length > 0 ? rawMessages[rawMessages.length - 1]?.timestamp : undefined;

  return {
    id: conversationId,
    prospect: buildProspectFromRecord(
      record,
      conversationId,
      orderedMessages,
      fallbackTimestamp,
      profile,
    ),
    messages: orderedMessages,
    aiNotes: Array.isArray(record.aiNotes) ? record.aiNotes : [],
    queuedMessage: record.queuedMessage,
  };
};

const extractConversationRecords = (payload: unknown): ConversationRecord[] => {
  if (Array.isArray(payload)) {
    return payload as ConversationRecord[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: ConversationRecord[] }).data;
  }

  return [];
};

const extractUserProfile = (payload: unknown): InstagramUserProfile | null => {
  const container = (payload as { data?: unknown })?.data ?? payload;

  if (!container || typeof container !== "object") {
    return null;
  }

  const data = container as Record<string, unknown>;
  const instagramId = typeof data.instagramId === "string" ? data.instagramId : undefined;

  if (!instagramId || !instagramId.length) {
    return null;
  }

  const followerCountValue = data.followerCount;
  const followerCount =
    typeof followerCountValue === "number" && Number.isFinite(followerCountValue)
      ? followerCountValue
      : null;

  return {
    instagramId,
    id: typeof data.id === "string" ? data.id : null,
    username: typeof data.username === "string" ? data.username : null,
    name: typeof data.name === "string" ? data.name : null,
    profilePic: typeof data.profilePic === "string" ? data.profilePic : null,
    followerCount,
    isUserFollowBusiness:
      typeof data.isUserFollowBusiness === "boolean" ? data.isUserFollowBusiness : null,
    isBusinessFollowUser:
      typeof data.isBusinessFollowUser === "boolean" ? data.isBusinessFollowUser : null,
    source: typeof data.source === "string" ? data.source : null,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : null,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
  };
};

export default function Messages() {
  const { authorizedFetch } = useAuth();
  const [searchParams] = useSearchParams();
  const stageParam = (searchParams.get("stage") as FunnelStage | "all") || "all";
  const initialStage = stageFilters.includes(stageParam) ? stageParam : "all";

  const [selectedFilter, setSelectedFilter] = useState<FunnelStage | "all">(initialStage);
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, InstagramUserProfile>>({});
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autopilotBusyConversationId, setAutopilotBusyConversationId] = useState<string | null>(
    null,
  );

  const fetchProfilesForRecords = useCallback(
    async (records: ConversationRecord[], signal?: AbortSignal) => {
      const senderIds = Array.from(
        new Set(
          records
            .map((record) => record.senderId)
            .filter((id): id is string => typeof id === "string" && id.length > 0),
        ),
      );

      if (!senderIds.length) {
        return {} as Record<string, InstagramUserProfile>;
      }

      const requests = senderIds.map(async (instagramId) => {
        try {
          const response = await authorizedFetch(USER_ENDPOINTS.profile(instagramId), { signal });

          if (!response.ok) {
            if (response.status === 404) {
              return null;
            }
            throw new Error(`Failed to fetch profile for ${instagramId}`);
          }

          let payload: unknown = null;
          try {
            payload = await response.json();
          } catch {
            payload = null;
          }

          const profile = extractUserProfile(payload);
          if (!profile) {
            return null;
          }

          return [instagramId, profile] as const;
        } catch (err) {
          if (!(err instanceof Error && err.name === "AbortError")) {
            console.error(`Failed to fetch Instagram user profile for ${instagramId}`, err);
          }
          return null;
        }
      });

      const entries = await Promise.all(requests);
      return entries.reduce<Record<string, InstagramUserProfile>>((acc, entry) => {
        if (entry) {
          acc[entry[0]] = entry[1];
        }
        return acc;
      }, {});
    },
    [authorizedFetch],
  );

  const loadConversations = useCallback(
    async (signal?: AbortSignal) => {
      const response = await authorizedFetch(CONVERSATION_ENDPOINTS.list, { signal });

      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          payload !== null &&
          "message" in payload &&
          typeof (payload as { message?: unknown }).message === "string"
            ? ((payload as { message?: string }).message as string)
            : "Failed to load conversations.";
        throw new Error(message);
      }

      const records = extractConversationRecords(payload);
      const profiles = await fetchProfilesForRecords(records, signal);

      const items = records.map((record) => {
        const instagramId = typeof record.senderId === "string" ? record.senderId : "";
        const profile = instagramId ? profiles[instagramId] : undefined;
        return buildConversationFromRecord(record, profile);
      });

      return { conversations: items, profiles };
    },
    [authorizedFetch, fetchProfilesForRecords],
  );

  useEffect(() => {
    const abortController = new AbortController();
    let mounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { conversations: items, profiles } = await loadConversations(abortController.signal);
        if (mounted) {
          setConversations(items);
          setProfilesById((prev) => ({ ...prev, ...profiles }));
        }
      } catch (err) {
        if (abortController.signal.aborted) {
          return;
        }
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load conversations.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
      abortController.abort();
    };
  }, [loadConversations]);

  const refreshConversations = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      const { conversations: items, profiles } = await loadConversations();
      setConversations(items);
      setProfilesById((prev) => ({ ...prev, ...profiles }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversations.");
    } finally {
      setIsLoading(false);
    }
  }, [loadConversations]);

  const prospects = useMemo(() => conversations.map((conversation) => conversation.prospect), [
    conversations,
  ]);

  const filteredProspects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return prospects.filter((prospect) => {
      const matchesFilter = selectedFilter === "all" || prospect.stage === selectedFilter;
      const matchesSearch =
        query.length === 0 ||
        prospect.name.toLowerCase().includes(query) ||
        prospect.handle.toLowerCase().includes(query) ||
        (prospect.username ? prospect.username.toLowerCase().includes(query) : false);

      return matchesFilter && matchesSearch;
    });
  }, [prospects, selectedFilter, searchQuery]);

  useEffect(() => {
    if (!conversations.length) {
      setSelectedConversationId(null);
      return;
    }

    setSelectedConversationId((current) => {
      if (current && conversations.some((conversation) => conversation.id === current)) {
        return current;
      }
      return conversations[0].id;
    });
  }, [conversations]);

  useEffect(() => {
    if (!filteredProspects.length) {
      setSelectedConversationId(null);
      return;
    }

    setSelectedConversationId((current) => {
      if (current && filteredProspects.some((prospect) => prospect.id === current)) {
        return current;
      }
      return filteredProspects[0].id;
    });
  }, [filteredProspects]);

  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) {
      return null;
    }

    return conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;
  }, [conversations, selectedConversationId]);

  const selectedProspect = selectedConversation?.prospect ?? null;
  const selectedProfile = selectedProspect?.instagramId
    ? profilesById[selectedProspect.instagramId] ?? null
    : null;

  const handleSelectProspect = useCallback((prospect: Prospect) => {
    setSelectedConversationId(prospect.id);
  }, []);

  const handleToggleAutopilot = useCallback(
    async (conversationId: string, enabled: boolean) => {
      if (!conversationId) {
        return;
      }

      setAutopilotBusyConversationId(conversationId);

      try {
        const response = await authorizedFetch(CONVERSATION_ENDPOINTS.autopilot(conversationId), {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ enabled }),
        });

        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        if (!response.ok) {
          const message =
            payload &&
            typeof payload === "object" &&
            payload !== null &&
            "message" in payload &&
            typeof (payload as { message?: unknown }).message === "string"
              ? ((payload as { message?: string }).message as string)
              : "Failed to update autopilot setting.";
          throw new Error(message);
        }

        const responseData =
          payload && typeof payload === "object"
            ? (payload as { isAutopilotOn?: unknown })
            : null;
        const nextValue =
          typeof responseData?.isAutopilotOn === "boolean"
            ? responseData.isAutopilotOn
            : enabled;

        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  prospect: {
                    ...conversation.prospect,
                    autopilotEnabled: nextValue,
                  },
                }
              : conversation,
          ),
        );
      } catch (err) {
        console.error("Failed to update autopilot status", err);
        setError(err instanceof Error ? err.message : "Failed to update autopilot setting.");
      } finally {
        setAutopilotBusyConversationId((current) => (current === conversationId ? null : current));
      }
    },
    [authorizedFetch, setConversations, setError],
  );

  if (isLoading && conversations.length === 0) {
    return (
      <AppLayout>
        <div className="flex h-full max-h-screen items-center justify-center">
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
      </AppLayout>
    );
  }

  if (!isLoading && conversations.length === 0) {
    return (
      <AppLayout>
        <div className="flex h-full max-h-screen flex-col items-center justify-center gap-4 text-center">
          <div className="space-y-2">
            <p className="text-lg font-semibold text-foreground">No conversations yet</p>
            <p className="text-sm text-muted-foreground max-w-md">
              {error ?? "We'll start populating this inbox as soon as new Instagram DMs arrive."}
            </p>
          </div>
          <Button onClick={refreshConversations} disabled={isLoading}>
            Refresh
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-full max-h-screen flex-col overflow-hidden">
        {error && conversations.length > 0 && (
          <div className="mx-4 mb-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            <div className="flex items-center justify-between gap-3">
              <span>{error}</span>
              <Button variant="ghost" size="sm" onClick={refreshConversations}>
                Retry
              </Button>
            </div>
          </div>
        )}

        {isLoading && conversations.length > 0 && (
          <div className="mx-4 mb-2 text-xs text-muted-foreground">Refreshing conversations…</div>
        )}

        <div className="flex flex-1 overflow-hidden">
          <ConversationList
            prospects={filteredProspects}
            selectedProspect={selectedProspect}
            onSelectProspect={handleSelectProspect}
            selectedFilter={selectedFilter}
            onFilterChange={setSelectedFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            stageFilters={stageFilters}
          />

          <ChatWindow conversation={selectedConversation ?? null} />

          <ProspectPanel
            prospect={selectedProspect}
            profile={selectedProfile}
            aiNotes={selectedConversation?.aiNotes ?? []}
            queuedMessage={selectedConversation?.queuedMessage}
            onToggleAutopilot={handleToggleAutopilot}
            autopilotUpdating={
              Boolean(selectedProspect && autopilotBusyConversationId === selectedProspect.id)
            }
          />
        </div>
      </div>
    </AppLayout>
  );
}
