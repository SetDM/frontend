import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/hooks/useAuth";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const REALTIME_EVENTS = {
    MESSAGE_CREATED: "message:created",
    QUEUE_UPDATED: "queue:updated",
    UPSERTED: "conversation:upserted",
};

interface RealtimeContextValue {
    isConnected: boolean;
    unreadCount: number;
    clearUnread: () => void;
    incrementUnread: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
    const { authToken, activeWorkspaceId } = useAuth();
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const clearUnread = useCallback(() => {
        setUnreadCount(0);
    }, []);

    const incrementUnread = useCallback(() => {
        setUnreadCount((prev) => prev + 1);
    }, []);

    // Handle incoming messages
    const handleNewMessage = useCallback(
        (data: { conversationId?: string; message?: { role?: string } }) => {
            // Only increment for user messages (not AI responses)
            if (data.message?.role === "user") {
                incrementUnread();
            }
        },
        [incrementUnread]
    );

    useEffect(() => {
        if (!authToken || !activeWorkspaceId) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            setIsConnected(false);
            return;
        }

        const socket = io(BACKEND_URL, {
            withCredentials: true,
            transports: ["websocket", "polling"],
            auth: { token: authToken },
            extraHeaders: { Authorization: `Bearer ${authToken}` },
        });

        socketRef.current = socket;

        socket.on("connect", () => setIsConnected(true));
        socket.on("disconnect", () => setIsConnected(false));
        socket.on("connect_error", () => setIsConnected(false));
        socket.on(REALTIME_EVENTS.MESSAGE_CREATED, handleNewMessage);

        return () => {
            socket.off("connect");
            socket.off("disconnect");
            socket.off("connect_error");
            socket.off(REALTIME_EVENTS.MESSAGE_CREATED, handleNewMessage);
            socket.disconnect();
            socketRef.current = null;
            setIsConnected(false);
        };
    }, [authToken, activeWorkspaceId, handleNewMessage]);

    return (
        <RealtimeContext.Provider value={{ isConnected, unreadCount, clearUnread, incrementUnread }}>
            {children}
        </RealtimeContext.Provider>
    );
}

export function useRealtime() {
    const context = useContext(RealtimeContext);
    if (!context) {
        throw new Error("useRealtime must be used within a RealtimeProvider");
    }
    return context;
}

