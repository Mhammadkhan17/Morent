"use client";

import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/AuthProvider";
import { cn } from "@/lib/utils";

const shortTime = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function NotificationBell() {
  const router = useRouter();
  const {
    user,
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = useAuth();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
          className="relative"
        >
          <Bell aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => void markAllNotificationsRead()}
            >
              <CheckCheck aria-hidden="true" className="size-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            notifications.slice(0, 12).map((notification) => (
              <button
                key={notification.id}
                type="button"
                className={cn(
                  "block w-full border-l-2 px-3 py-2.5 text-left transition-colors hover:bg-accent focus:bg-accent focus:outline-none",
                  notification.readAt === null
                    ? "border-primary"
                    : "border-transparent"
                )}
                onClick={() => {
                  if (notification.readAt === null) {
                    void markNotificationRead(notification.id);
                  }
                  router.push(notification.link);
                }}
              >
                <span
                  className={cn(
                    "block text-sm",
                    notification.readAt === null && "font-medium"
                  )}
                >
                  {notification.title}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {notification.body}
                </span>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  {shortTime(notification.createdAt)}
                </span>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
