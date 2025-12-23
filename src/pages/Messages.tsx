import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import { AppLayout } from "@/components/AppLayout";
import { ConversationList } from "@/components/messages/ConversationList";
import { ChatWindow } from "@/components/messages/ChatWindow";
import { ProspectPanel } from "@/components/messages/ProspectPanel";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePageTitle } from "@/hooks/usePageTitle";
import { BACKEND_URL, CONVERSATION_ENDPOINTS, USER_ENDPOINTS } from "@/lib/config";
import { cn } from "@/lib/utils";
import type {
  Conversation,
  ConversationRecord,
  FunnelStage,
  Message,
  Prospect,
  InstagramUserProfile,
  QueuedMessage,
} from "@/types";

const FUNNEL_STAGES: FunnelStage[] = [
  "responded",
  "lead",
  "qualified",
  "booking-sent",
  "call-booked",
  "sale",
  "flagged",
];

const PROFILE_REQUEST_CACHE_MODE: RequestCache = "no-store";

const stageFilters: (FunnelStage | "all")[] = ["all", ...FUNNEL_STAGES];

const CONVERSATIONS_PAGE_SIZE = 7;
const CONVERSATION_MESSAGE_PAGE_SIZE = 50;
const INITIAL_CONVERSATION_MESSAGE_LIMIT = CONVERSATION_MESSAGE_PAGE_SIZE;
const MAX_CONVERSATION_MESSAGE_LIMIT = 500;

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

const extractNotesFromPayload = (payload: unknown): string[] => {
  const container = (payload as { data?: unknown })?.data ?? payload;

  if (!container || typeof container !== "object") {
    return [];
  }

  const maybeNotes = (container as { notes?: unknown }).notes;
  if (!Array.isArray(maybeNotes)) {
    return [];
  }

  return maybeNotes
    .map((note) => (typeof note === "string" ? note.trim() : ""))
    .filter((note): note is string => Boolean(note));
};

/**
 * Calculate lead score based on available prospect data
 * Score ranges from 0-100
 */
const calculateLeadScore = ({
  stage,
  followerCount,
  isUserFollowBusiness,
  messageCount,
  lastActivityMs,
}: {
  stage: FunnelStage;
  followerCount: number | null;
  isUserFollowBusiness: boolean | null;
  messageCount: number;
  lastActivityMs: number;
}): number => {
  let score = 0;

  // Stage progression (0-40 points)
  const stageScores: Record<FunnelStage, number> = {
    responded: 5,
    lead: 15,
    qualified: 25,
    "booking-sent": 32,
    "call-booked": 40,
    sale: 40,
    flagged: 0,
  };
  score += stageScores[stage] ?? 0;

  // Follower count (0-25 points)
  if (followerCount !== null && followerCount > 0) {
    if (followerCount >= 100000) score += 25;
    else if (followerCount >= 50000) score += 22;
    else if (followerCount >= 10000) score += 18;
    else if (followerCount >= 5000) score += 15;
    else if (followerCount >= 1000) score += 10;
    else if (followerCount >= 500) score += 6;
    else score += 3;
  }

  // Follows the business (0-10 points)
  if (isUserFollowBusiness === true) {
    score += 10;
  }

  // Message engagement (0-15 points)
  if (messageCount >= 20) score += 15;
  else if (messageCount >= 10) score += 12;
  else if (messageCount >= 5) score += 8;
  else if (messageCount >= 2) score += 4;

  // Recent activity (0-10 points)
  const hoursSinceActivity = lastActivityMs / (1000 * 60 * 60);
  if (hoursSinceActivity <= 1) score += 10;
  else if (hoursSinceActivity <= 6) score += 8;
  else if (hoursSinceActivity <= 24) score += 5;
  else if (hoursSinceActivity <= 72) score += 2;

  return Math.min(100, Math.max(0, score));
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

const REALTIME_EVENTS = {
  MESSAGE_CREATED: "conversation:message.created",
  QUEUE_UPDATED: "conversation:queue.updated",
  UPSERTED: "conversation:upserted",
} as const;

type ConversationRealtimeEnvelope = {
  conversationId?: string;
  senderId?: string;
  recipientId?: string;
  lastUpdated?: string;
};

type ConversationRealtimeMessagePayload = ConversationRealtimeEnvelope & {
  message?: {
    id?: string;
    content?: string;
    role?: "assistant" | "user";
    timestamp?: string | number | Date;
    metadata?: {
      mid?: string;
    };
    isAiGenerated?: boolean;
  };
};

type ConversationRealtimeQueueEntry = {
  id?: string;
  content?: string;
  scheduledFor?: string | null;
  createdAt?: string | null;
  delayMs?: number;
  metadata?: Record<string, unknown> | null;
};

type ConversationRealtimeQueuePayload = ConversationRealtimeEnvelope & {
  queuedMessages?: ConversationRealtimeQueueEntry[];
};

type ConversationRealtimeUpsertPayload = ConversationRealtimeEnvelope & {
  stageTag?: string | null;
  isFlagged?: boolean;
  isAutopilotOn?: boolean;
  reason?: string;
};

const calculateSendsInSeconds = (scheduledIso?: string | null) => {
  if (!scheduledIso) {
    return 0;
  }

  const timestamp = new Date(scheduledIso).getTime();
  if (Number.isNaN(timestamp)) {
    return 0;
  }

  return Math.max(0, Math.floor((timestamp - Date.now()) / 1000));
};

const normalizeRealtimeQueueEntries = (entries: ConversationRealtimeQueueEntry[] = []) => {
  return entries
    .map((entry, index) => {
      const content = typeof entry?.content === "string" ? entry.content.trim() : "";
      if (!content) {
        return null;
      }

      const scheduledFor =
        typeof entry?.scheduledFor === "string" && entry.scheduledFor.length > 0
          ? entry.scheduledFor
          : null;

      return {
        id:
          typeof entry?.id === "string" && entry.id.length > 0
            ? entry.id
            : `queued-${index}`,
        content,
        scheduledFor,
        sendsIn: calculateSendsInSeconds(scheduledFor),
        delayMs: typeof entry?.delayMs === "number" ? entry.delayMs : undefined,
      } as QueuedMessage;
    })
    .filter((entry): entry is QueuedMessage => Boolean(entry))
    .sort((a, b) => {
      if (a.scheduledFor && b.scheduledFor) {
        return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
      }
      if (a.scheduledFor) {
        return -1;
      }
      if (b.scheduledFor) {
        return 1;
      }
      return 0;
    });
};

const normalizeRealtimeMessage = (
  conversationId: string,
  realtime?: ConversationRealtimeMessagePayload["message"],
): Message | null => {
  if (!realtime) {
    return null;
  }

  const content = typeof realtime.content === "string" ? realtime.content.trim() : "";
  if (!content) {
    return null;
  }

  const timestampInput =
    realtime.timestamp instanceof Date || typeof realtime.timestamp === "number"
      ? realtime.timestamp
      : typeof realtime.timestamp === "string"
        ? realtime.timestamp
        : new Date().toISOString();

  const normalizedTimestamp = formatMessageTimestamp(timestampInput);

  const messageId =
    typeof realtime.id === "string" && realtime.id.length > 0
      ? realtime.id
      : typeof realtime.metadata?.mid === "string" && realtime.metadata.mid.length > 0
        ? realtime.metadata.mid
        : `${conversationId}-${Date.now()}`;

  return {
    id: messageId,
    content,
    timestamp: normalizedTimestamp,
    isFromProspect: (realtime.role ?? "user") !== "assistant",
    isAiGenerated: Boolean(realtime.isAiGenerated),
  };
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

  const normalized = stageTag
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  const aliasMap: Record<string, FunnelStage> = {
    flag: "flagged",
    flagged: "flagged",
    sales: "sale",
  };

  const resolved = aliasMap[normalized] ?? normalized;

  return FUNNEL_STAGES.find((stage) => stage === resolved) ?? "responded";
};

const resolveProspectStage = (record?: ConversationRecord): {
  stage: FunnelStage;
  isFlagged: boolean;
} => {
  if (!record) {
    return { stage: "responded", isFlagged: false };
  }

  const normalizedStage = normalizeStageTag(record.stageTag);
  const isFlagged = Boolean(record.isFlagged) || normalizedStage === "flagged";

  return {
    stage: isFlagged ? "flagged" : normalizedStage,
    isFlagged,
  };
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

type LoadConversationPageArgs = {
  limit: number;
  skip: number;
  stageTag?: FunnelStage | "all";
  signal?: AbortSignal;
};

const buildProspectFromRecord = (
  record: ConversationRecord,
  conversationId: string,
  messages: Message[],
  fallbackTimestamp?: string | number | Date,
  profile?: InstagramUserProfile | null,
): Prospect => {
  const metadata = record.metadata as Record<string, unknown> | undefined;
  const derivedSenderId = getSenderIdFromRecord(record);
  const instagramId = derivedSenderId ?? "unknown";
  const fallbackIdentity =
    derivedSenderId ||
    (typeof record.conversationId === "string" ? record.conversationId : null) ||
    instagramId;
  const metadataName = getMetadataString(metadata, "prospectName");
  const metadataHandleRaw = getMetadataString(metadata, "prospectHandle");
  const normalizedProfileUsername =
    profile?.username && profile.username.trim().length > 0
      ? profile.username.replace(/^@+/, "").trim()
      : undefined;
  const normalizedMetadataHandle =
    metadataHandleRaw && metadataHandleRaw.length > 0
      ? metadataHandleRaw.replace(/^@+/, "").trim()
      : undefined;
  const resolvedUsername = normalizedProfileUsername || normalizedMetadataHandle || null;
  const handleSource = normalizedProfileUsername || normalizedMetadataHandle || fallbackIdentity;
  const sanitizedHandleSource =
    typeof handleSource === "string" ? handleSource.replace(/^@+/, "").trim() : "";
  const resolvedHandleBase =
    sanitizedHandleSource.length > 0 ? sanitizedHandleSource : fallbackIdentity;
  const normalizedHandle = resolvedHandleBase.startsWith("@")
    ? resolvedHandleBase
    : `@${resolvedHandleBase}`;
  const hasMeaningfulHandle = Boolean(normalizedProfileUsername || normalizedMetadataHandle);
  const handleDisplayFallback = hasMeaningfulHandle ? normalizedHandle : null;
  const resolvedDisplayName =
    (profile?.name && profile.name.trim()) ||
    resolvedUsername ||
    metadataName ||
    handleDisplayFallback ||
    fallbackIdentity;
  const lastMessage = messages[messages.length - 1];
  const followerCount =
    typeof profile?.followerCount === "number" && Number.isFinite(profile.followerCount)
      ? profile.followerCount
      : null;
  const autopilotEnabledFromRecord =
    typeof record.isAutopilotOn === "boolean" ? record.isAutopilotOn : false;
  const { stage: resolvedStage, isFlagged } = resolveProspectStage(record);

  // Calculate last activity time for lead score
  const lastActivityDate = coerceDate(record.lastUpdated ?? fallbackTimestamp);
  const lastActivityMs = lastActivityDate ? Date.now() - lastActivityDate.getTime() : 0;

  // Calculate lead score
  const leadScore = calculateLeadScore({
    stage: resolvedStage,
    followerCount,
    isUserFollowBusiness: profile?.isUserFollowBusiness ?? null,
    messageCount: messages.length,
    lastActivityMs,
  });

  return {
    id: conversationId,
    instagramId,
    name: resolvedDisplayName,
    username: resolvedUsername,
    handle: normalizedHandle,
    avatar: profile?.profilePic || "",
    profilePic: profile?.profilePic || null,
    stage: resolvedStage,
    followers: followerCount ?? 0,
    followerCount,
    following: 0,
    leadScore,
    autopilotEnabled: autopilotEnabledFromRecord,
    isFlagged,
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
  options?: { messageLimit?: number },
): Conversation => {
  const conversationId = deriveConversationId(record);
  const rawMessages = Array.isArray(record.messages) ? record.messages : [];
  const requestedLimit =
    typeof options?.messageLimit === "number" && Number.isFinite(options.messageLimit)
      ? options.messageLimit
      : null;
  const hasMoreMessages = Boolean(requestedLimit && rawMessages.length >= requestedLimit);
  const queuedMessagesRaw = Array.isArray(record.queuedMessages) ? record.queuedMessages : [];

  const normalizedMessages: MessageWithSort[] = rawMessages.map((message, index) => {
    const timestampDate = coerceDate(message?.timestamp);
    const content = typeof message?.content === "string" ? message.content.trim() : "";
    const isAiGenerated = Boolean(message?.isAiGenerated);

    return {
      id: message?.metadata?.mid ?? `${conversationId}-${index}`,
      content,
      timestamp: timestampDate ? formatMessageTimestamp(timestampDate) : "",
      isFromProspect: (message?.role ?? "user") !== "assistant",
      isAiGenerated,
      sortValue: timestampDate?.getTime() ?? index,
    };
  });

  const orderedMessages: Message[] = normalizedMessages
    .filter((message) => message.content.length > 0)
    .sort((a, b) => a.sortValue - b.sortValue)
    .map(({ sortValue, ...message }) => message);

  const fallbackTimestamp =
    rawMessages.length > 0 ? rawMessages[rawMessages.length - 1]?.timestamp : undefined;

  const now = Date.now();
  const queuedMessages = queuedMessagesRaw
    .map((queued, index) => {
      const content = typeof queued?.content === "string" ? queued.content.trim() : "";
      if (!content) {
        return null;
      }

      const scheduledDate = coerceDate(queued?.scheduledFor);
      const scheduledIso = scheduledDate ? scheduledDate.toISOString() : null;
      const sendsInSeconds = scheduledDate
        ? Math.max(0, Math.floor((scheduledDate.getTime() - now) / 1000))
        : 0;

      const normalized: QueuedMessage = {
        id:
          typeof queued?.id === "string" && queued.id.length > 0
            ? queued.id
            : `${conversationId}-queued-${index}`,
        content,
        scheduledFor: scheduledIso,
        sendsIn: sendsInSeconds,
        delayMs: typeof queued?.delayMs === "number" ? queued.delayMs : undefined,
      };
      return normalized;
    })
    .filter((entry): entry is QueuedMessage => Boolean(entry))
    .sort((a, b) => {
      if (a.scheduledFor && b.scheduledFor) {
        return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
      }
      if (a.scheduledFor) {
        return -1;
      }
      if (b.scheduledFor) {
        return 1;
      }
      return 0;
    });

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
    queuedMessages,
    hasMoreMessages,
    loadedMessageLimit: requestedLimit,
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

const extractConversationRecord = (payload: unknown): ConversationRecord | null => {
  const container = (payload as { data?: unknown })?.data ?? payload;

  if (!container || typeof container !== "object") {
    return null;
  }

  return container as ConversationRecord;
};

const getSenderIdFromRecord = (record: ConversationRecord): string | null => {
  if (typeof record?.senderId === "string" && record.senderId.trim().length > 0) {
    return record.senderId.trim();
  }

  if (typeof record?.conversationId === "string") {
    const separatorIndex = record.conversationId.indexOf("_");
    if (separatorIndex !== -1) {
      const extracted = record.conversationId.slice(separatorIndex + 1).trim();
      if (extracted.length > 0) {
        return extracted;
      }
    }
  }

  return null;
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
  const { authorizedFetch, authToken, activeWorkspaceId } = useAuth();
  usePageTitle("Messages");
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const stageParam = (searchParams.get("stage") as FunnelStage | "all") || "all";
  const initialStage = stageFilters.includes(stageParam) ? stageParam : "all";

  const [selectedFilter, setSelectedFilter] = useState<FunnelStage | "all">(initialStage);
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationMessageLimits, setConversationMessageLimits] = useState<Record<string, number>>({});
  const [hasMoreConversations, setHasMoreConversations] = useState(true);
  const [isFetchingMoreConversations, setIsFetchingMoreConversations] = useState(false);
  const [hydratedConversationIds, setHydratedConversationIds] = useState<Record<string, boolean>>({});
  const [profilesById, setProfilesById] = useState<Record<string, InstagramUserProfile>>({});
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autopilotBusyConversationId, setAutopilotBusyConversationId] = useState<string | null>(
    null,
  );
  const [aiNotesByConversationId, setAiNotesByConversationId] = useState<Record<string, string[]>>({});
  const [aiNotesRequestConversationId, setAiNotesRequestConversationId] = useState<string | null>(
    null,
  );
  const [queueCancelBusyIds, setQueueCancelBusyIds] = useState<string[]>([]);
  const [queueSendBusyIds, setQueueSendBusyIds] = useState<string[]>([]);
  const [clearFlagBusyConversationId, setClearFlagBusyConversationId] = useState<string | null>(
    null,
  );
  const [loadingOlderMessageIds, setLoadingOlderMessageIds] = useState<string[]>([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [activePane, setActivePane] = useState<"list" | "chat">("list");
  const [isProspectSheetOpen, setIsProspectSheetOpen] = useState(false);
  const profilesByIdRef = useRef<Record<string, InstagramUserProfile>>({});
  const hydratedConversationIdsRef = useRef<Record<string, boolean>>({});
  const conversationsRef = useRef<Conversation[]>([]);
  const detailRequestInFlightRef = useRef<Record<string, boolean>>({});
  const refreshInFlightRef = useRef(false);
  const realtimeSocketRef = useRef<Socket | null>(null);

  const getConversationMessageLimit = useCallback(
    (conversationId: string | null) => {
      if (!conversationId) {
        return INITIAL_CONVERSATION_MESSAGE_LIMIT;
      }
      return conversationMessageLimits[conversationId] ?? INITIAL_CONVERSATION_MESSAGE_LIMIT;
    },
    [conversationMessageLimits],
  );

  const ensureConversationMessageLimit = useCallback((conversationId: string) => {
    setConversationMessageLimits((prev) => {
      if (prev[conversationId]) {
        return prev;
      }
      return {
        ...prev,
        [conversationId]: INITIAL_CONVERSATION_MESSAGE_LIMIT,
      };
    });
  }, []);

  useEffect(() => {
    profilesByIdRef.current = profilesById;
  }, [profilesById]);

  useEffect(() => {
    hydratedConversationIdsRef.current = hydratedConversationIds;
  }, [hydratedConversationIds]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const fetchAiNotesForConversation = useCallback(
    async (conversationId: string, options?: { signal?: AbortSignal }) => {
      if (!conversationId) {
        return;
      }

      const abortSignal = options?.signal;
      setAiNotesRequestConversationId(conversationId);

      try {
        const response = await authorizedFetch(CONVERSATION_ENDPOINTS.notes(conversationId), {
          signal: abortSignal,
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
              : "Failed to load AI notes.";
          throw new Error(message);
        }

        const notes = extractNotesFromPayload(payload);
        setAiNotesByConversationId((prev) => ({ ...prev, [conversationId]: notes }));
      } catch (err) {
        if (!abortSignal?.aborted) {
          console.error("Failed to fetch AI notes", err);
        }
      } finally {
        if (!abortSignal?.aborted) {
          setAiNotesRequestConversationId((current) =>
            current === conversationId ? null : current,
          );
        }
      }
    },
    [authorizedFetch],
  );

  const fetchProfilesForRecords = useCallback(
    async (records: ConversationRecord[], signal?: AbortSignal) => {
      const senderIds = Array.from(
        new Set(
          records
            .map((record) => getSenderIdFromRecord(record))
            .filter((id): id is string => typeof id === "string" && id.length > 0),
        ),
      );

      if (!senderIds.length) {
        return {} as Record<string, InstagramUserProfile>;
      }

      const requests = senderIds.map(async (instagramId) => {
        try {
          const response = await authorizedFetch(USER_ENDPOINTS.profile(instagramId), {
            signal,
            cache: PROFILE_REQUEST_CACHE_MODE,
          });

          if (response.status === 304) {
            const cachedProfile = profilesByIdRef.current[instagramId];
            return cachedProfile ? ([instagramId, cachedProfile] as const) : null;
          }

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

  const loadConversationPage = useCallback(
    async ({ limit, skip, stageTag, signal }: LoadConversationPageArgs) => {
      const normalizedLimit = Math.min(Math.max(Math.floor(limit), 1), 500);
      const normalizedSkip = Math.max(Math.floor(skip), 0);

      const listUrl = new URL(CONVERSATION_ENDPOINTS.list);
      listUrl.searchParams.set("limit", String(normalizedLimit));
      listUrl.searchParams.set("skip", String(normalizedSkip));
      listUrl.searchParams.set("messageSlice", "last");
      if (stageTag && stageTag !== "all") {
        listUrl.searchParams.set("stage", stageTag);
      }

      const response = await authorizedFetch(listUrl.toString(), { signal });

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
      const aiNotesMap: Record<string, string[]> = {};

      const items = records.map((record) => {
        const conversationId = deriveConversationId(record);
        if (
          conversationId &&
          Array.isArray(record.aiNotes) &&
          record.aiNotes.length > 0
        ) {
          const normalizedNotes = record.aiNotes
            .map((note) => (typeof note === "string" ? note.trim() : ""))
            .filter((note): note is string => Boolean(note));

          if (normalizedNotes.length) {
            aiNotesMap[conversationId] = normalizedNotes;
          }
        }

        const instagramId = getSenderIdFromRecord(record);
        const profile = instagramId ? profiles[instagramId] : undefined;
        return buildConversationFromRecord(record, profile);
      });

      return { conversations: items, profiles, aiNotesMap, fetchedCount: records.length };
    },
    [authorizedFetch, fetchProfilesForRecords],
  );

  const mergeFetchedConversations = useCallback(
    (incoming: Conversation[], mode: "replace" | "append") => {
      setConversations((prev) => {
        const prevMap = new Map(prev.map((conversation) => [conversation.id, conversation]));

        const mergeWithHydratedData = (
          fresh: Conversation,
          existing: Conversation,
        ): Conversation => ({
          ...fresh,
          messages: existing.messages,
          queuedMessages: existing.queuedMessages,
          aiNotes: existing.aiNotes,
          hasMoreMessages: existing.hasMoreMessages,
          loadedMessageLimit: existing.loadedMessageLimit,
        });

        if (mode === "replace") {
          return incoming.map((conversation) => {
            const existing = prevMap.get(conversation.id);
            if (existing && hydratedConversationIdsRef.current[conversation.id]) {
              return mergeWithHydratedData(conversation, existing);
            }
            return conversation;
          });
        }

        const next = [...prev];
        incoming.forEach((conversation) => {
          const index = next.findIndex((item) => item.id === conversation.id);
          if (index === -1) {
            next.push(conversation);
            return;
          }

          const existing = next[index];
          next[index] = hydratedConversationIdsRef.current[conversation.id]
            ? mergeWithHydratedData(conversation, existing)
            : conversation;
        });
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    const abortController = new AbortController();
    let mounted = true;

    setHydratedConversationIds({});
    setConversationMessageLimits({});
    setAiNotesByConversationId({});
    setProfilesById({});
    setConversations([]);
    setSelectedConversationId(null);
    setHasMoreConversations(Boolean(activeWorkspaceId));
    setError(null);

    if (!activeWorkspaceId) {
      setIsLoading(false);
      return () => {
        mounted = false;
        abortController.abort();
      };
    }

    setIsLoading(true);

    const fetchData = async () => {
      try {
        const {
          conversations: items,
          profiles,
          aiNotesMap,
          fetchedCount,
        } = await loadConversationPage({
          limit: CONVERSATIONS_PAGE_SIZE,
          skip: 0,
          stageTag: selectedFilter,
          signal: abortController.signal,
        });

        if (!mounted) {
          return;
        }

        mergeFetchedConversations(items, "replace");
        setProfilesById((prev) => ({ ...prev, ...profiles }));
        if (aiNotesMap && Object.keys(aiNotesMap).length > 0) {
          setAiNotesByConversationId((prev) => ({ ...prev, ...aiNotesMap }));
        }
        setHasMoreConversations(fetchedCount === CONVERSATIONS_PAGE_SIZE);
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
  }, [activeWorkspaceId, loadConversationPage, mergeFetchedConversations, selectedFilter]);

  const refreshConversations = useCallback(
    async (options?: { silent?: boolean }) => {
      if (refreshInFlightRef.current) {
        return;
      }

      const silent = Boolean(options?.silent);
      refreshInFlightRef.current = true;
      try {
        setError(null);
        if (silent) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        const requestedLimit = Math.max(conversationsRef.current.length, CONVERSATIONS_PAGE_SIZE);
        const normalizedLimit = Math.min(Math.max(requestedLimit, CONVERSATIONS_PAGE_SIZE), 500);

        const {
          conversations: items,
          profiles,
          aiNotesMap,
          fetchedCount,
        } = await loadConversationPage({
          limit: normalizedLimit,
          skip: 0,
          stageTag: selectedFilter,
        });

        mergeFetchedConversations(items, "replace");
        setProfilesById((prev) => ({ ...prev, ...profiles }));
        if (aiNotesMap && Object.keys(aiNotesMap).length > 0) {
          setAiNotesByConversationId((prev) => ({ ...prev, ...aiNotesMap }));
        }
        setHasMoreConversations(fetchedCount === normalizedLimit);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load conversations.");
      } finally {
        if (silent) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
        refreshInFlightRef.current = false;
      }
    },
    [loadConversationPage, mergeFetchedConversations, selectedFilter],
  );

  const hydrateConversationDetail = useCallback(
    async (
      conversationId: string,
      options?: { signal?: AbortSignal; force?: boolean; messageLimit?: number },
    ) => {
      const force = Boolean(options?.force);
      if (!conversationId) {
        return;
      }

      if (!force && hydratedConversationIdsRef.current[conversationId]) {
        return;
      }

      if (detailRequestInFlightRef.current[conversationId]) {
        return;
      }

      const requestedLimitRaw = options?.messageLimit ?? getConversationMessageLimit(conversationId);
      const requestedLimit = Math.min(
        Math.max(Math.floor(requestedLimitRaw) || INITIAL_CONVERSATION_MESSAGE_LIMIT, 1),
        MAX_CONVERSATION_MESSAGE_LIMIT,
      );

      detailRequestInFlightRef.current[conversationId] = true;
      const abortSignal = options?.signal;

      try {
        const detailUrl = new URL(CONVERSATION_ENDPOINTS.detail(conversationId));
        detailUrl.searchParams.set("messageLimit", requestedLimit.toString());
        detailUrl.searchParams.set("includeQueuedMessages", "true");

        const response = await authorizedFetch(detailUrl.toString(), { signal: abortSignal });

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
              : "Failed to load conversation.";
          throw new Error(message);
        }

        const record = extractConversationRecord(payload);
        if (!record) {
          throw new Error("Conversation not found.");
        }

        const senderId = getSenderIdFromRecord(record);

        let profile = senderId ? profilesByIdRef.current[senderId] ?? null : null;
        if (senderId && !profile) {
          const fetchedProfiles = await fetchProfilesForRecords([record], abortSignal);
          if (fetchedProfiles && Object.keys(fetchedProfiles).length > 0) {
            profile = fetchedProfiles[senderId] ?? null;
            setProfilesById((prev) => ({ ...prev, ...fetchedProfiles }));
          }
        }

        const hydratedConversation = buildConversationFromRecord(record, profile || undefined, {
          messageLimit: requestedLimit,
        });
        setConversations((prev) => {
          const index = prev.findIndex((conversation) => conversation.id === hydratedConversation.id);
          if (index === -1) {
            return [hydratedConversation, ...prev];
          }
          const next = [...prev];
          next[index] = hydratedConversation;
          return next;
        });

        if (Array.isArray(record.aiNotes) && record.aiNotes.length > 0) {
          const normalizedNotes = record.aiNotes
            .map((note) => (typeof note === "string" ? note.trim() : ""))
            .filter((note): note is string => Boolean(note));
          if (normalizedNotes.length) {
            setAiNotesByConversationId((prev) => ({
              ...prev,
              [hydratedConversation.id]: normalizedNotes,
            }));
          }
        }

        setHydratedConversationIds((prev) => ({ ...prev, [hydratedConversation.id]: true }));
        setConversationMessageLimits((prev) => {
          if (prev[hydratedConversation.id] === requestedLimit) {
            return prev;
          }
          return {
            ...prev,
            [hydratedConversation.id]: requestedLimit,
          };
        });
      } catch (err) {
        if (!(err instanceof Error && err.name === "AbortError")) {
          console.error("Failed to load conversation detail", err);
        }
      } finally {
        delete detailRequestInFlightRef.current[conversationId];
      }
    },
    [
      authorizedFetch,
      fetchProfilesForRecords,
      getConversationMessageLimit,
    ],
  );

  const handleRealtimeMessage = useCallback(
    (payload: ConversationRealtimeMessagePayload = {}) => {
      const conversationId = payload?.conversationId;
      if (!conversationId) {
        return;
      }

      const normalizedMessage = normalizeRealtimeMessage(conversationId, payload.message);
      if (!normalizedMessage) {
        return;
      }

      const relativeTimestamp = formatRelativeTime(
        payload.lastUpdated ?? new Date().toISOString(),
      );
      let conversationUpdated = false;

      setConversations((prev) => {
        let changed = false;

        const next = prev.map((conversation) => {
          if (conversation.id !== conversationId) {
            return conversation;
          }

          const hasMessageAlready = conversation.messages.some(
            (message) => message.id === normalizedMessage.id,
          );

          if (
            hasMessageAlready &&
            conversation.prospect.lastMessage === normalizedMessage.content &&
            conversation.prospect.lastMessageTime === relativeTimestamp
          ) {
            return conversation;
          }

          changed = true;
          conversationUpdated = true;

          const updatedMessages = hasMessageAlready
            ? conversation.messages
            : [...conversation.messages, normalizedMessage];

          return {
            ...conversation,
            messages: updatedMessages,
            prospect: {
              ...conversation.prospect,
              lastMessage: normalizedMessage.content,
              lastMessageTime: relativeTimestamp,
              isUnread: conversation.id !== selectedConversationId,
            },
          };
        });

        return changed ? next : prev;
      });

      if (!conversationUpdated) {
        refreshConversations({ silent: true });
        return;
      }

      if (selectedConversationId === conversationId) {
        ensureConversationMessageLimit(conversationId);
        const requestedLimit = getConversationMessageLimit(conversationId);
        hydrateConversationDetail(conversationId, {
          force: true,
          messageLimit: requestedLimit,
        });
      }
    },
    [
      ensureConversationMessageLimit,
      getConversationMessageLimit,
      hydrateConversationDetail,
      refreshConversations,
      selectedConversationId,
    ],
  );

  const handleRealtimeQueueUpdate = useCallback(
    (payload: ConversationRealtimeQueuePayload = {}) => {
      const conversationId = payload?.conversationId;
      if (!conversationId) {
        return;
      }

      const normalizedQueue = normalizeRealtimeQueueEntries(payload.queuedMessages ?? []);
      let conversationUpdated = false;

      setConversations((prev) => {
        let changed = false;

        const next = prev.map((conversation) => {
          if (conversation.id !== conversationId) {
            return conversation;
          }

          changed = true;
          conversationUpdated = true;

          return {
            ...conversation,
            queuedMessages: normalizedQueue,
          };
        });

        return changed ? next : prev;
      });

      if (!conversationUpdated) {
        refreshConversations({ silent: true });
      }
    },
    [refreshConversations],
  );

  const handleRealtimeUpsert = useCallback(
    (payload: ConversationRealtimeUpsertPayload = {}) => {
      const conversationId = payload?.conversationId;
      if (!conversationId) {
        return;
      }

      let conversationUpdated = false;

      setConversations((prev) => {
        let changed = false;

        const next = prev.map((conversation) => {
          if (conversation.id !== conversationId) {
            return conversation;
          }

          const resolvedStage =
            typeof payload.stageTag === "string" && payload.stageTag.length > 0
              ? normalizeStageTag(payload.stageTag)
              : conversation.prospect.stage;

          const resolvedAutopilot =
            typeof payload.isAutopilotOn === "boolean"
              ? payload.isAutopilotOn
              : conversation.prospect.autopilotEnabled;

          const resolvedFlagged =
            typeof payload.isFlagged === "boolean"
              ? payload.isFlagged
              : resolvedStage === "flagged";

          if (
            resolvedStage === conversation.prospect.stage &&
            resolvedAutopilot === conversation.prospect.autopilotEnabled &&
            resolvedFlagged === Boolean(conversation.prospect.isFlagged)
          ) {
            return conversation;
          }

          changed = true;
          conversationUpdated = true;

          return {
            ...conversation,
            prospect: {
              ...conversation.prospect,
              stage: resolvedStage,
              autopilotEnabled: resolvedAutopilot,
              isFlagged: resolvedFlagged,
            },
          };
        });

        return changed ? next : prev;
      });

      if (!conversationUpdated) {
        refreshConversations({ silent: true });
      }
    },
    [refreshConversations],
  );

  useEffect(() => {
    if (!autoRefreshEnabled) {
      if (realtimeSocketRef.current) {
        realtimeSocketRef.current.disconnect();
        realtimeSocketRef.current = null;
      }
      setIsRealtimeConnected(false);
      return undefined;
    }

    if (typeof window === "undefined") {
      return undefined;
    }

    const socket = io(BACKEND_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      auth: authToken ? { token: authToken } : undefined,
      extraHeaders: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    });

    realtimeSocketRef.current = socket;

    const handleConnect = () => setIsRealtimeConnected(true);
    const handleDisconnect = () => setIsRealtimeConnected(false);
    const handleConnectError = (error: Error) => {
      console.error("Realtime connection error", error);
      setIsRealtimeConnected(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on(REALTIME_EVENTS.MESSAGE_CREATED, handleRealtimeMessage);
    socket.on(REALTIME_EVENTS.QUEUE_UPDATED, handleRealtimeQueueUpdate);
    socket.on(REALTIME_EVENTS.UPSERTED, handleRealtimeUpsert);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off(REALTIME_EVENTS.MESSAGE_CREATED, handleRealtimeMessage);
      socket.off(REALTIME_EVENTS.QUEUE_UPDATED, handleRealtimeQueueUpdate);
      socket.off(REALTIME_EVENTS.UPSERTED, handleRealtimeUpsert);
      socket.disconnect();
      realtimeSocketRef.current = null;
      setIsRealtimeConnected(false);
    };
  }, [
    authToken,
    autoRefreshEnabled,
    handleRealtimeMessage,
    handleRealtimeQueueUpdate,
    handleRealtimeUpsert,
  ]);

  const loadMoreConversations = useCallback(
    async () => {
      if (isLoading || isFetchingMoreConversations || !hasMoreConversations) {
        return;
      }

      setIsFetchingMoreConversations(true);

      try {
        const {
          conversations: items,
          profiles,
          aiNotesMap,
          fetchedCount,
        } = await loadConversationPage({
          limit: CONVERSATIONS_PAGE_SIZE,
          skip: conversationsRef.current.length,
          stageTag: selectedFilter,
        });

        mergeFetchedConversations(items, "append");
        setProfilesById((prev) => ({ ...prev, ...profiles }));
        if (aiNotesMap && Object.keys(aiNotesMap).length > 0) {
          setAiNotesByConversationId((prev) => ({ ...prev, ...aiNotesMap }));
        }
        setHasMoreConversations(fetchedCount === CONVERSATIONS_PAGE_SIZE);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load more conversations.");
      } finally {
        setIsFetchingMoreConversations(false);
      }
    },
    [
      hasMoreConversations,
      isFetchingMoreConversations,
      isLoading,
      loadConversationPage,
      mergeFetchedConversations,
      selectedFilter,
    ],
  );

  useEffect(() => {
    if (!selectedConversationId) {
      return undefined;
    }

    ensureConversationMessageLimit(selectedConversationId);

    if (hydratedConversationIds[selectedConversationId]) {
      return undefined;
    }

    const abortController = new AbortController();
    const requestedLimit = getConversationMessageLimit(selectedConversationId);
    hydrateConversationDetail(selectedConversationId, {
      signal: abortController.signal,
      messageLimit: requestedLimit,
    });

    return () => {
      abortController.abort();
    };
  }, [
    ensureConversationMessageLimit,
    getConversationMessageLimit,
    hydrateConversationDetail,
    hydratedConversationIds,
    selectedConversationId,
  ]);
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

    // Only clear selection if the currently selected conversation no longer exists
    // Don't auto-select the first conversation
    setSelectedConversationId((current) => {
      if (current && conversations.some((conversation) => conversation.id === current)) {
        return current;
      }
      return null;
    });
  }, [conversations]);

  useEffect(() => {
    if (!filteredProspects.length) {
      setSelectedConversationId(null);
      return;
    }

    // Only clear selection if the currently selected prospect is no longer in the filtered list
    // Don't auto-select the first prospect
    setSelectedConversationId((current) => {
      if (current && filteredProspects.some((prospect) => prospect.id === current)) {
        return current;
      }
      return null;
    });
  }, [filteredProspects]);

  useEffect(() => {
    if (!selectedConversationId) {
      setAiNotesRequestConversationId(null);
      return;
    }

    const abortController = new AbortController();
    fetchAiNotesForConversation(selectedConversationId, { signal: abortController.signal });

    return () => {
      abortController.abort();
    };
  }, [fetchAiNotesForConversation, selectedConversationId]);

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
  const currentAiNotes = selectedConversationId
    ? aiNotesByConversationId[selectedConversationId] ?? []
    : [];
  const aiNotesLoading = Boolean(
    selectedConversationId && aiNotesRequestConversationId === selectedConversationId,
  );
  const isSelectedConversationLoadingOlderMessages = Boolean(
    selectedConversation && loadingOlderMessageIds.includes(selectedConversation.id),
  );

  useEffect(() => {
    if (!isMobile) {
      setActivePane("chat");
      return;
    }

    if (!selectedConversation) {
      setActivePane("list");
    }
  }, [isMobile, selectedConversation]);

  useEffect(() => {
    if (!isMobile || activePane === "list" || !selectedProspect) {
      setIsProspectSheetOpen(false);
    }
  }, [activePane, isMobile, selectedProspect]);

  const handleLoadOlderMessages = useCallback(
    async (conversationId: string) => {
      if (!conversationId) {
        return;
      }

      const currentLimit = getConversationMessageLimit(conversationId);
      if (currentLimit >= MAX_CONVERSATION_MESSAGE_LIMIT) {
        return;
      }

      const nextLimit = Math.min(
        currentLimit + CONVERSATION_MESSAGE_PAGE_SIZE,
        MAX_CONVERSATION_MESSAGE_LIMIT,
      );

      setConversationMessageLimits((prev) => ({ ...prev, [conversationId]: nextLimit }));
      setLoadingOlderMessageIds((prev) =>
        prev.includes(conversationId) ? prev : [...prev, conversationId],
      );

      try {
        await hydrateConversationDetail(conversationId, {
          force: true,
          messageLimit: nextLimit,
        });
      } finally {
        setLoadingOlderMessageIds((prev) => prev.filter((id) => id !== conversationId));
      }
    },
    [
      getConversationMessageLimit,
      hydrateConversationDetail,
    ],
  );

  const handleSelectProspect = useCallback(
    (prospect: Prospect) => {
      ensureConversationMessageLimit(prospect.id);
      setSelectedConversationId(prospect.id);
      if (isMobile) {
        setActivePane("chat");
      }
    },
    [ensureConversationMessageLimit, isMobile],
  );

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

  const handleCancelQueuedMessage = useCallback(
    async (conversationId: string, queuedMessageId: string) => {
      if (!conversationId || !queuedMessageId) {
        return;
      }

      setQueueCancelBusyIds((prev) =>
        prev.includes(queuedMessageId) ? prev : [...prev, queuedMessageId],
      );

      try {
        const response = await authorizedFetch(
          CONVERSATION_ENDPOINTS.cancelQueuedMessage(conversationId, queuedMessageId),
          {
            method: "DELETE",
          },
        );

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
              : "Failed to cancel queued message.";
          throw new Error(message);
        }

        setConversations((prev) =>
          prev.map((conversation) => {
            if (conversation.id !== conversationId) {
              return conversation;
            }

            return {
              ...conversation,
              queuedMessages: conversation.queuedMessages.filter(
                (message) => message.id !== queuedMessageId,
              ),
            };
          }),
        );

        await refreshConversations({ silent: true });
      } catch (err) {
        console.error("Failed to cancel queued message", err);
        setError(err instanceof Error ? err.message : "Failed to cancel queued message.");
      } finally {
        setQueueCancelBusyIds((prev) => prev.filter((id) => id !== queuedMessageId));
      }
    },
    [authorizedFetch, refreshConversations, setConversations, setError],
  );

  const handleSendQueuedMessageNow = useCallback(
    async (conversationId: string, queuedMessageId: string) => {
      if (!conversationId || !queuedMessageId) {
        return;
      }

      setQueueSendBusyIds((prev) =>
        prev.includes(queuedMessageId) ? prev : [...prev, queuedMessageId],
      );

      try {
        const response = await authorizedFetch(
          CONVERSATION_ENDPOINTS.sendQueuedMessageNow(conversationId, queuedMessageId),
          {
            method: "POST",
          },
        );

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
              : "Failed to send queued message immediately.";
          throw new Error(message);
        }

        const payloadMessage =
          payload &&
          typeof payload === "object" &&
          "message" in payload
            ? (payload as { message?: unknown }).message
            : null;

        const messageContent =
          payloadMessage &&
          typeof payloadMessage === "object" &&
          typeof (payloadMessage as { content?: unknown }).content === "string"
            ? ((payloadMessage as { content: string }).content as string)
            : "";

        const timestampRaw =
          payloadMessage &&
          typeof payloadMessage === "object" &&
          typeof (payloadMessage as { timestamp?: unknown }).timestamp === "string"
            ? ((payloadMessage as { timestamp: string }).timestamp as string)
            : new Date().toISOString();

        const formattedTimestamp = formatMessageTimestamp(timestampRaw);
        const messageId =
          payloadMessage &&
          typeof payloadMessage === "object" &&
          typeof (payloadMessage as { id?: unknown }).id === "string" &&
          (payloadMessage as { id: string }).id.length > 0
            ? ((payloadMessage as { id: string }).id as string)
            : `${conversationId}-${Date.now()}`;

        setConversations((prev) =>
          prev.map((conversation) => {
            if (conversation.id !== conversationId) {
              return conversation;
            }

            const filteredQueue = conversation.queuedMessages.filter(
              (message) => message.id !== queuedMessageId,
            );

            const nextMessage: Message = {
              id: messageId,
              content: messageContent || "Message sent",
              timestamp: formattedTimestamp,
              isFromProspect: false,
              isAiGenerated: true,
            };

            const updatedMessages = [...conversation.messages, nextMessage];

            return {
              ...conversation,
              messages: updatedMessages,
              queuedMessages: filteredQueue,
              prospect: {
                ...conversation.prospect,
                lastMessage: nextMessage.content,
                lastMessageTime: formatRelativeTime(timestampRaw),
                isUnread: false,
              },
            };
          }),
        );

        await refreshConversations({ silent: true });
      } catch (err) {
        console.error("Failed to send queued message immediately", err);
        setError(err instanceof Error ? err.message : "Failed to send queued message.");
      } finally {
        setQueueSendBusyIds((prev) => prev.filter((id) => id !== queuedMessageId));
      }
    },
    [authorizedFetch, refreshConversations, setConversations, setError],
  );

  const handleRefreshAiNotes = useCallback(
    (conversationId: string) => {
      fetchAiNotesForConversation(conversationId);
    },
    [fetchAiNotesForConversation],
  );

  const handleClearFlag = useCallback(
    async (conversationId: string) => {
      if (!conversationId) {
        return;
      }

      setClearFlagBusyConversationId(conversationId);

      try {
        const response = await authorizedFetch(CONVERSATION_ENDPOINTS.clearFlag(conversationId), {
          method: "DELETE",
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
              : "Failed to clear flag.";
          throw new Error(message);
        }

        const responseData =
          payload && typeof payload === "object"
            ? (payload as { stageTag?: unknown })
            : null;
        const stageTag =
          typeof responseData?.stageTag === "string" ? responseData.stageTag : null;
        const normalizedStage = normalizeStageTag(stageTag);

        setConversations((prev) =>
          prev.map((conversation) => {
            if (conversation.id !== conversationId) {
              return conversation;
            }

            return {
              ...conversation,
              prospect: {
                ...conversation.prospect,
                isFlagged: false,
                stage:
                  conversation.prospect.stage === "flagged"
                    ? normalizedStage
                    : conversation.prospect.stage,
              },
            };
          }),
        );

        await refreshConversations({ silent: true });
      } catch (err) {
        console.error("Failed to clear conversation flag", err);
        setError(err instanceof Error ? err.message : "Failed to clear flag.");
      } finally {
        setClearFlagBusyConversationId((current) =>
          current === conversationId ? null : current,
        );
      }
    },
    [authorizedFetch, refreshConversations, setConversations, setError],
  );

  const handleSendMessage = useCallback(
    async (conversationId: string, content: string) => {
      const trimmed = content.trim();
      if (!conversationId || !trimmed) {
        return;
      }

      try {
        const response = await authorizedFetch(CONVERSATION_ENDPOINTS.sendMessage(conversationId), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: trimmed }),
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
              : "Failed to send message.";
          throw new Error(message);
        }

        const payloadMessageRaw =
          payload && typeof payload === "object" && "message" in payload
            ? (payload as { message?: unknown }).message
            : null;

        const payloadMessage =
          payloadMessageRaw && typeof payloadMessageRaw === "object"
            ? (payloadMessageRaw as {
                timestamp?: string;
                metadata?: { id?: string; mid?: string } & Record<string, unknown>;
                id?: string;
              })
            : null;

        const timestampInput =
          (payloadMessage && typeof payloadMessage.timestamp === "string"
            ? payloadMessage.timestamp
            : new Date().toISOString());

        const remoteMessageId =
          payloadMessage && typeof payloadMessage.id === "string" && payloadMessage.id.length > 0
            ? payloadMessage.id
            : null;
        const remoteMetadataMid =
          payloadMessage &&
          payloadMessage.metadata &&
          typeof payloadMessage.metadata.mid === "string" &&
          payloadMessage.metadata.mid.length > 0
            ? (payloadMessage.metadata.mid as string)
            : null;
        const resolvedMessageId = remoteMessageId || remoteMetadataMid || `${conversationId}-${Date.now()}`;

        const formattedTimestamp = formatMessageTimestamp(timestampInput);
        const newMessage: Message = {
          id: resolvedMessageId,
          content: trimmed,
          timestamp: formattedTimestamp,
          isFromProspect: false,
          isAiGenerated: false,
        };

        setConversations((prev) =>
          prev.map((conversation) => {
            if (conversation.id !== conversationId) {
              return conversation;
            }

            const updatedMessages = [...conversation.messages, newMessage];
            return {
              ...conversation,
              messages: updatedMessages,
              prospect: {
                ...conversation.prospect,
                lastMessage: trimmed,
                lastMessageTime: formatRelativeTime(timestampInput),
                isUnread: false,
              },
            };
          }),
        );
      } catch (err) {
        console.error("Failed to send message", err);
        setError(err instanceof Error ? err.message : "Failed to send message.");
        throw err;
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

  const hasFilterApplied = selectedFilter !== "all" || Boolean(searchQuery);
  const showConversationList = !isMobile || activePane === "list";
  const showChatWindow = !isMobile || activePane === "chat";

  if (!isLoading && conversations.length === 0) {
    const handleEmptyStateAction = () => {
      if (selectedFilter !== "all" || searchQuery) {
        setSelectedFilter("all");
        if (searchQuery) {
          setSearchQuery("");
        }
        return;
      }
      refreshConversations();
    };

    const emptyButtonLabel = selectedFilter !== "all" || searchQuery
      ? "View all conversations"
      : "Refresh";

    return (
      <AppLayout>
        <div className="flex h-full max-h-screen flex-col items-center justify-center gap-4 text-center">
          <div className="space-y-2">
            <p className="text-lg font-semibold text-foreground">No conversations yet</p>
            <p className="text-sm text-muted-foreground max-w-md">
              {error ?? "We'll start populating this inbox as soon as new Instagram DMs arrive."}
            </p>
          </div>
          <Button
            onClick={handleEmptyStateAction}
            disabled={isLoading || isRefreshing}
            variant={hasFilterApplied ? "outline" : "default"}
          >
            {emptyButtonLabel}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refreshConversations()}
                disabled={isLoading || isRefreshing}
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Live updates toggle temporarily hidden */}

        {(isLoading || isRefreshing) && conversations.length > 0 && (
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
            onLoadMore={loadMoreConversations}
            hasMore={hasMoreConversations}
            isLoadingMore={isFetchingMoreConversations}
            className={cn("md:shrink-0", !showConversationList && "hidden")}
          />

          <ChatWindow
            conversation={selectedConversation ?? null}
            onSendMessage={handleSendMessage}
            onLoadOlderMessages={handleLoadOlderMessages}
            isLoadingOlderMessages={isSelectedConversationLoadingOlderMessages}
            className={cn(!showChatWindow && "hidden")}
            onBackToList={isMobile ? () => setActivePane("list") : undefined}
            onShowDetails={isMobile && selectedProspect ? () => setIsProspectSheetOpen(true) : undefined}
          />

          {!isMobile ? (
            <ProspectPanel
              prospect={selectedProspect}
              profile={selectedProfile}
              aiNotes={currentAiNotes}
              queuedMessages={selectedConversation?.queuedMessages ?? []}
              onSendQueuedMessageNow={handleSendQueuedMessageNow}
              onCancelQueuedMessage={handleCancelQueuedMessage}
              onToggleAutopilot={handleToggleAutopilot}
              onRefreshAiNotes={handleRefreshAiNotes}
              queueCancelBusyIds={queueCancelBusyIds}
              queueSendBusyIds={queueSendBusyIds}
              onClearFlag={handleClearFlag}
              clearFlagBusyConversationId={clearFlagBusyConversationId}
              autopilotUpdating={
                Boolean(selectedProspect && autopilotBusyConversationId === selectedProspect.id)
              }
              aiNotesLoading={aiNotesLoading}
            />
          ) : null}
        </div>

        {isMobile ? (
          <Sheet open={isProspectSheetOpen} onOpenChange={setIsProspectSheetOpen}>
            <SheetContent side="right" className="w-full max-w-md border-0 p-0">
              <ProspectPanel
                prospect={selectedProspect}
                profile={selectedProfile}
                aiNotes={currentAiNotes}
                queuedMessages={selectedConversation?.queuedMessages ?? []}
                onSendQueuedMessageNow={handleSendQueuedMessageNow}
                onCancelQueuedMessage={handleCancelQueuedMessage}
                onToggleAutopilot={handleToggleAutopilot}
                onRefreshAiNotes={handleRefreshAiNotes}
                queueCancelBusyIds={queueCancelBusyIds}
                queueSendBusyIds={queueSendBusyIds}
                onClearFlag={handleClearFlag}
                clearFlagBusyConversationId={clearFlagBusyConversationId}
                autopilotUpdating={
                  Boolean(selectedProspect && autopilotBusyConversationId === selectedProspect.id)
                }
                aiNotesLoading={aiNotesLoading}
                className="border-0"
              />
            </SheetContent>
          </Sheet>
        ) : null}
      </div>
    </AppLayout>
  );
}
