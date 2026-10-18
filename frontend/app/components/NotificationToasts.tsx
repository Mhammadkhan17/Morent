"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/AuthProvider";
import type { LiveToast } from "@/lib/notifications";

const TOAST_MS = 6000;

function ToastCard({ toast }: { toast: LiveToast }) {
  const router = useRouter();
  const { dismissToast } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => dismissToast(toast.id), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast.id, dismissToast]);

  return (
    <Card
      role="status"
      className="cursor-pointer p-4 shadow-lg transition-opacity hover:opacity-90"
      onClick={() => {
        router.push(toast.link);
        dismissToast(toast.id);
      }}
    >
      <p className="text-sm font-medium">{toast.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{toast.body}</p>
    </Card>
  );
}

export default function NotificationToasts() {
  const { toasts } = useAuth();

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastCard toast={toast} />
        </div>
      ))}
    </div>
  );
}
