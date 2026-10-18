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

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  /** better-auth additionalFields (lib/auth.ts) — "owner" | "customer". */
  role?: string | null;
};

type AuthContextValue = {
  user: SessionUser | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  notifications: NotificationItem[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  toasts: LiveToast[];
  dismissToast: (id: string) => void;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  refresh: async () => {},
  signOut: async () => {},
  notifications: [],
  unreadCount: 0,
  refreshNotifications: async () => {},
  markNotificationRead: async () => {},
  markAllNotificationsRead: async () => {},
  toasts: [],
  dismissToast: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<LiveToast[]>([]);
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
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
        seenIdsRef.current = new Set(data.notifications.map((n) => n.id));
      })
      .catch(() => {
        // signed out or offline — keep last known state
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
        refreshNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        toasts,
        dismissToast,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
