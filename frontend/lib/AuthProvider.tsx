"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  fetchNotifications,
  markAllNotificationsRead as apiMarkAllRead,
  markNotificationRead as apiMarkRead,
  type LiveToast,
  type NotificationItem,
} from "@/lib/notifications";
import { useEventStream, type SseNotificationPayload } from "@/lib/sse";
import { ApiError } from "@/lib/api";

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  /** better-auth additionalFields (lib/auth.ts) — "owner" | "customer". */
  role?: string | null;
};

export type LiveMessage = {
  id: string;
  bookingId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

type AuthContextValue = {
  user: SessionUser | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  notifications: NotificationItem[];
  unreadCount: number;
  /** True when the last notifications refresh failed for a non-auth reason. */
  notificationsError: boolean;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  toasts: LiveToast[];
  dismissToast: (id: string) => void;
  /** Latest SSE `message` event — inbox page reacts to changes on this. */
  lastMessage: LiveMessage | null;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  refresh: async () => {},
  signOut: async () => {},
  notifications: [],
  unreadCount: 0,
  notificationsError: false,
  refreshNotifications: async () => {},
  markNotificationRead: async () => {},
  markAllNotificationsRead: async () => {},
  toasts: [],
  dismissToast: () => {},
  lastMessage: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsError, setNotificationsError] = useState(false);
  const [toasts, setToasts] = useState<LiveToast[]>([]);
  const [lastMessage, setLastMessage] = useState<LiveMessage | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    const { data } = await authClient.getSession();
    setUser((data?.user as SessionUser | undefined) ?? null);
    setIsLoading(false);
  }, []);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    setUser(null);
    setNotifications([]);
    setUnreadCount(0);
    setToasts([]);
    seenIdsRef.current = new Set();
  }, []);

  const refreshNotifications = useCallback((): Promise<void> =>
    fetchNotifications()
      .then((data) => {
        setNotificationsError(false);
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
        seenIdsRef.current = new Set(data.notifications.map((n) => n.id));
      })
      .catch((err: unknown) => {
        // signed out — the session gate owns that state; other failures surface in the bell
        if (err instanceof ApiError && err.status === 401) return;
        console.error("Failed to refresh notifications", err);
        setNotificationsError(true);
      }), []);

  const markNotificationRead = useCallback(
    (id: string): Promise<void> =>
      apiMarkRead(id)
        .then(() => refreshNotifications())
        .catch(() => {}),
    [refreshNotifications]
  );

  const markAllNotificationsRead = useCallback(
    (): Promise<void> =>
      apiMarkAllRead()
        .then(() => refreshNotifications())
        .catch(() => {}),
    [refreshNotifications]
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    let cancelled = false;
    authClient.getSession().then(({ data }) => {
      if (cancelled) return;
      setUser((data?.user as SessionUser | undefined) ?? null);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // SSE down ≠ notifications dead: refetch on focus and route change
  useEffect(() => {
    if (!user) return;
    const onFocus = () => {
      void refreshNotifications();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user, refreshNotifications]);

  useEffect(() => {
    if (!user) return;
    void refreshNotifications();
  }, [user, pathname, refreshNotifications]);

  useEventStream(
    {
      onNotification: (payload: SseNotificationPayload) => {
        if (seenIdsRef.current.has(payload.id)) return;
        seenIdsRef.current.add(payload.id);
        setUnreadCount((count) => count + 1);
        setNotifications((prev) =>
          [
            {
              id: payload.id,
              type: payload.type,
              title: payload.title,
              body: payload.body,
              link: payload.link,
              readAt: null,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ].slice(0, 50)
        );
        setToasts((prev) =>
          [
            ...prev.filter((toast) => toast.id !== payload.id),
            {
              id: payload.id,
              title: payload.title,
              body: payload.body,
              link: payload.link,
            },
          ].slice(-3)
        );
      },
      onMessage: (payload) => {
        const id = typeof payload.id === "string" ? payload.id : "";
        if (!id || seenIdsRef.current.has(`msg:${id}`)) return;
        seenIdsRef.current.add(`msg:${id}`);
        setLastMessage({
          id,
          bookingId: typeof payload.bookingId === "string" ? payload.bookingId : "",
          senderId: typeof payload.senderId === "string" ? payload.senderId : "",
          body: typeof payload.body === "string" ? payload.body : "",
          createdAt:
            typeof payload.createdAt === "string"
              ? payload.createdAt
              : new Date().toISOString(),
        });
      },
    },
    user !== null
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        refresh,
        signOut,
        notifications,
        unreadCount,
        notificationsError,
        refreshNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        toasts,
        dismissToast,
        lastMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
