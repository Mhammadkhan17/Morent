"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { fetchMessages, sendMessage, type ThreadMessage } from "@/lib/account";
import { useAuth } from "@/lib/AuthProvider";
import { cn } from "@/lib/utils";

/**
 * Shared booking thread (customer `/account/inbox` + owner `/admin/bookings`).
 * Live incoming messages arrive through `AuthProvider.lastMessage`; GET on
 * the backend marks the other party's messages read.
 */
export function ThreadPanel({
  bookingId,
  onSent,
}: {
  bookingId: string;
  onSent?: () => void;
}) {
  const { user, lastMessage } = useAuth();
  const [thread, setThread] = useState<{
    bookingId: string;
    messages: ThreadMessage[];
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMessages(bookingId)
      .then((data) => {
        if (!cancelled) setThread({ bookingId, messages: data.messages });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error && err.message
              ? err.message
              : "Could not load this conversation."
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId, reload]);

  const messages =
    thread && thread.bookingId === bookingId ? thread.messages : null;

  // Adjust state during render when a live message arrives for this thread.
  if (
    lastMessage &&
    thread &&
    lastMessage.bookingId === thread.bookingId &&
    !thread.messages.some((m) => m.id === lastMessage.id)
  ) {
    setThread({
      ...thread,
      messages: [...thread.messages, { ...lastMessage, readAt: null }],
    });
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages?.length]);

  const submit = () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError(null);
    sendMessage(bookingId, body)
      .then((message) => {
        setThread((prev) =>
          prev && prev.bookingId === bookingId
            ? { ...prev, messages: [...prev.messages, message] }
            : prev
        );
        setDraft("");
        onSent?.();
      })
      .catch((err: unknown) => {
        setSendError(
          err instanceof Error && err.message
            ? err.message
            : "Message failed to send. Your draft is kept — try again."
        );
      })
      .finally(() => setSending(false));
  };

  if (loadError) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-start gap-3">
        <p className="text-sm text-destructive" role="alert">
          {loadError}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setLoadError(null);
            setReload((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (messages === null) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="h-64 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No messages yet. Say hello.
          </p>
        )}
        {messages.map((message) => {
          const mine = message.senderId === user?.id;
          return (
            <div
              key={message.id}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                  mine ? "bg-primary text-primary-foreground" : "bg-accent"
                )}
              >
                <p className="whitespace-pre-wrap break-words">{message.body}</p>
                <p
                  className={cn(
                    "mt-1 text-xs",
                    mine
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  )}
                >
                  {message.createdAt.slice(0, 16).replace("T", " ")}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {sendError && (
        <p className="text-xs text-destructive" role="alert">
          {sendError}
        </p>
      )}
      <div className="flex items-end gap-2 border-t pt-3">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type a message…"
          rows={2}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <Button
          size="icon"
          aria-label="Send message"
          disabled={!draft.trim() || sending}
          onClick={submit}
        >
          <Send aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </div>
  );
}
