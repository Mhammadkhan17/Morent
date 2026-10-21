"use client";

import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ThreadPanel } from "@/components/thread/ThreadPanel";
import { LoadErrorCard } from "@/app/account/load-error";
import { fetchMeBookings, type MeBooking } from "@/lib/account";
import { cn } from "@/lib/utils";

function InboxPage() {
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<MeBooking[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("booking")
  );

  const refreshBookings = useCallback(() => {
    fetchMeBookings()
      .then((data) => {
        setLoadError(null);
        setBookings(data.bookings);
      })
      .catch((err: unknown) => {
        setLoadError(
          err instanceof Error && err.message
            ? err.message
            : "Could not load your bookings."
        );
      });
  }, []);

  useEffect(() => {
    refreshBookings();
  }, [refreshBookings]);

  const sorted = useMemo(
    () =>
      [...(bookings ?? [])].sort((a, b) =>
        a.unreadMessages === 0
          ? b.unreadMessages === 0
            ? 0
            : 1
          : -1
      ),
    [bookings]
  );

  const selected = bookings?.find((b) => b.id === selectedId) ?? null;

  if (loadError) {
    return (
      <LoadErrorCard message={loadError} onRetry={refreshBookings} />
    );
  }

  if (bookings === null) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No bookings yet — book a car to start a conversation.
      </p>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <div className="space-y-2">
        <p className="text-sm font-medium">Bookings</p>
        <div className="space-y-1">
          {sorted.map((booking) => (
            <button
              key={booking.id}
              type="button"
              onClick={() => setSelectedId(booking.id)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                selectedId === booking.id
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <span className="truncate">{booking.car.name}</span>
              {booking.unreadMessages > 0 && (
                <Badge variant="secondary">{booking.unreadMessages}</Badge>
              )}
            </button>
          ))}
        </div>
      </div>
      <Card className="flex min-h-[28rem] flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {selected ? selected.car.name : "Select a booking"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col">
          {selectedId === null ? (
            <p className="text-sm text-muted-foreground">
              Pick a booking on the left to read its thread.
            </p>
          ) : (
            <ThreadPanel
              key={selectedId}
              bookingId={selectedId}
              onSent={refreshBookings}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AccountInboxPage() {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <InboxPage />
    </Suspense>
  );
}
