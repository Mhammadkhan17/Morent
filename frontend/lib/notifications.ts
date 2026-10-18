import { api } from "@/lib/api";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  notifications: NotificationItem[];
  unreadCount: number;
}

export interface LiveToast {
  id: string;
  title: string;
  body: string;
  link: string;
}

export const fetchNotifications = (): Promise<NotificationList> =>
  api.get("/me/notifications");

export const markNotificationRead = (id: string): Promise<NotificationItem> =>
  api.post(`/me/notifications/${encodeURIComponent(id)}/read`);

export const markAllNotificationsRead = (): Promise<{ updated: number }> =>
  api.post("/me/notifications/read-all");
