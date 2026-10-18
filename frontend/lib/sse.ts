import { useEffect, useRef } from "react";
import { apiBase } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

export interface SseNotificationPayload {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
}

export interface EventStreamHandlers {
  onNotification?: (payload: SseNotificationPayload) => void;
  onMessage?: (payload: Record<string, unknown>) => void;
}

const MAX_BACKOFF_MS = 30_000;

/**
 * Fetch-based SSE client (plan: `lib/sse.ts`). Native EventSource cannot send
 * the Bearer header, so we read the stream manually, parse frames, and
 * reconnect with exponential backoff, resuming via Last-Event-ID.
 * Mounted once in AuthProvider; `enabled` toggles with the session.
 */
export function useEventStream(
  handlers: EventStreamHandlers,
  enabled: boolean
): void {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!enabled) return;

    let stopped = false;
    let controller: AbortController | null = null;
    let attempt = 0;
    let lastEventId = "";
    let retryTimer: number | null = null;

    const dispatch = (raw: string) => {
      let event = "message";
      let id = "";
      const dataLines: string[] = [];
      for (const line of raw.split("\n")) {
        if (line.startsWith(":")) continue; // heartbeat / comments
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("id:")) id = line.slice(3).trim();
        else if (line.startsWith("data:"))
          dataLines.push(line.slice(5).trimStart());
      }
      if (id) lastEventId = id;
      if (dataLines.length === 0) return;
      let payload: unknown;
      try {
        payload = JSON.parse(dataLines.join("\n"));
      } catch {
        return;
      }
      if (event === "notification") {
        handlersRef.current.onNotification?.(
          payload as SseNotificationPayload
        );
      } else if (event === "message") {
        handlersRef.current.onMessage?.(payload as Record<string, unknown>);
      }
    };

    const scheduleRetry = () => {
      if (stopped) return;
      attempt += 1;
      const delay = Math.min(1000 * 2 ** (attempt - 1), MAX_BACKOFF_MS);
      retryTimer = window.setTimeout(() => void connect(), delay);
    };

    const connect = async () => {
      if (stopped) return;
      let token: string | undefined;
      try {
        const result = await authClient.token();
        token = result.data?.token;
      } catch {
        token = undefined;
      }
      if (stopped) return;
      if (!token) {
        // no token yet (refresh in flight) — retry with backoff
        scheduleRetry();
        return;
      }

      controller = new AbortController();
      try {
        const res = await fetch(`${apiBase()}/api/v1/events`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
            ...(lastEventId !== ""
              ? { "Last-Event-ID": lastEventId }
              : {}),
          },
          signal: controller.signal,
        });
        if (!res.ok || res.body === null) {
          throw new Error(`SSE stream failed: ${res.status}`);
        }
        attempt = 0; // connected — reset backoff
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let sep = buffer.indexOf("\n\n");
          while (sep !== -1) {
            dispatch(buffer.slice(0, sep));
            buffer = buffer.slice(sep + 2);
            sep = buffer.indexOf("\n\n");
          }
        }
      } catch {
        // network error or abort — fall through to reconnect
      }
      scheduleRetry();
    };

    void connect();
    return () => {
      stopped = true;
      controller?.abort();
      if (retryTimer !== null) window.clearTimeout(retryTimer);
    };
  }, [enabled]);
}
