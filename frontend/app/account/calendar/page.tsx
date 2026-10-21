"use client";

import { useEffect, useMemo, useState } from "react";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/app/admin/status-badge";
import { dateRange, localToday } from "@/app/account/buckets";
import { LoadErrorCard } from "@/app/account/load-error";
import { fetchMeBookings, type MeBooking } from "@/lib/account";

export default function AccountCalendarPage() {
  const [bookings, setBookings] = useState<MeBooking[] | null>(null);
  const [selected, setSelected] = useState<string>(() => localToday());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchMeBookings()
      .then((data) => {
        if (!cancelled) setBookings(data.bookings);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error && err.message
              ? err.message
              : "Could not load your bookings."
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const dayBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter(
      (booking) =>
        booking.pickupDate <= selected && booking.dropoffDate >= selected
    );
  }, [bookings, selected]);

  if (loadError) {
    return (
      <LoadErrorCard
        message={loadError}
        onRetry={() => {
          setBookings(null);
          setLoadError(null);
          setReload((n) => n + 1);
        }}
      />
    );
  }

  if (bookings === null) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MonthGrid
        bookings={bookings}
        selectedDay={selected}
        onSelectDay={setSelected}
      />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{selected}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dayBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings.</p>
          ) : (
            dayBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div>
                  <p className="font-medium">{booking.car.name}</p>
                  <p className="text-muted-foreground">
                    {dateRange(booking)} · {booking.pickupLocation}
                  </p>
                </div>
                <StatusBadge status={booking.status} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
