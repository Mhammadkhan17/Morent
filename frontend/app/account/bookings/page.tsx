"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/app/admin/status-badge";
import { bucketize, dateRange, type Bucket } from "@/app/account/buckets";
import { fetchMeBookings, type MeBooking } from "@/lib/account";
import { formatCents } from "@/lib/cars-api";
import { cn } from "@/lib/utils";

function BookingRow({ booking, href }: { booking: MeBooking; href: string }) {
  return (
    <Link href={href} className="block">
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="flex items-center gap-4 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={booking.car.imageUrl}
            alt={booking.car.name}
            className="h-16 w-24 shrink-0 rounded-md object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium">{booking.car.name}</p>
              <StatusBadge status={booking.status} />
              {booking.unreadMessages > 0 && (
                <Badge variant="secondary">{booking.unreadMessages} new</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {dateRange(booking)} · {booking.days}{" "}
              {booking.days === 1 ? "day" : "days"} ·{" "}
              {booking.pickupLocation}
            </p>
          </div>
          <p className="shrink-0 text-sm font-semibold">
            {formatCents(booking.totalCents)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function AccountBookingsPage() {
  const [bookings, setBookings] = useState<MeBooking[] | null>(null);
  const [tab, setTab] = useState<Bucket>("current");

  useEffect(() => {
    fetchMeBookings()
      .then((data) => setBookings(data.bookings))
      .catch(() => setBookings([]));
  }, []);

  const buckets = useMemo(
    () => (bookings ? bucketize(bookings) : null),
    [bookings]
  );

  if (buckets === null) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const rows = buckets[tab];

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Booking filters"
        className="flex gap-1 rounded-md bg-muted p-1 w-fit"
      >
        {(
          [
            ["current", `Current (${buckets.current.length})`],
            ["upcoming", `Upcoming (${buckets.upcoming.length})`],
            ["past", `History (${buckets.past.length})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
              tab === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((booking) => (
            <BookingRow
              key={booking.id}
              booking={booking}
              href={`/account/inbox?booking=${booking.id}`}
            />
          ))}
        </div>
      )}
      {tab === "past" && rows.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Totals include any discounts applied at checkout. Invoices ship in
          P3.
        </p>
      )}
    </div>
  );
}
