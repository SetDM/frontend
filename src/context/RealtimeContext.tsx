import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/hooks/useAuth";
import { BACKEND_URL } from "@/lib/config";

const REALTIME_EVENTS = {
    MESSAGE_CREATED: "conversation:message.created",
    QUEUE_UPDATED: "conversation:queue.updated",
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

    useEffect(() => {
        // Don't connect if no auth
        if (!authToken || !activeWorkspaceId) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            setIsConnected(false);
            return;
        }

        // Don't reconnect if already connected with same token
        if (socketRef.current?.connected) {
            return;
        }

        // Disconnect existing socket before creating new one
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }

        const socket = io(BACKEND_URL, {
            withCredentials: true,
            transports: ["websocket", "polling"],
            auth: { token: authToken },
            extraHeaders: { Authorization: `Bearer ${authToken}` },
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketRef.current = socket;

        const handleConnect = () => setIsConnected(true);
        const handleDisconnect = () => setIsConnected(false);
        const handleConnectError = (error: Error) => {
            console.error("Realtime connection error:", error.message);
            setIsConnected(false);
        };
        const handleNewMessage = (data: { conversationId?: string; message?: { role?: string } }) => {
            // Only increment for user messages (not AI responses)
            if (data.message?.role === "user") {
                setUnreadCount((prev) => prev + 1);
            }
        };

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("connect_error", handleConnectError);
        socket.on(REALTIME_EVENTS.MESSAGE_CREATED, handleNewMessage);

        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("connect_error", handleConnectError);
            socket.off(REALTIME_EVENTS.MESSAGE_CREATED, handleNewMessage);
            socket.disconnect();
            socketRef.current = null;
            setIsConnected(false);
        };
    }, [authToken, activeWorkspaceId]);

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

