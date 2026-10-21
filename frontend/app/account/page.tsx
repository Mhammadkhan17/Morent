"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/app/admin/status-badge";
import { dateRange, bucketize } from "@/app/account/buckets";
import { LoadErrorCard } from "@/app/components/load-error";
import { fetchMeBookings, type MeBooking } from "@/lib/account";
import { formatCents } from "@/lib/cars-api";

export default function AccountOverviewPage() {
  const [bookings, setBookings] = useState<MeBooking[] | null>(null);
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

  if (loadError) {
    return (
      <LoadErrorCard
        title="Couldn't load your bookings"
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
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const { current, upcoming, past } = bucketize(bookings);
  const active = current[0];
  const next = upcoming[0];
  const unread = bookings.reduce((sum, b) => sum + b.unreadMessages, 0);

  if (bookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No trips yet</CardTitle>
          <CardDescription>
            Book a car and it will show up here with pickup details and your
            messages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/">
              Browse cars
              <ArrowRight aria-hidden="true" className="ml-2 size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {active ? (
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0 gap-4">
            <div>
              <CardDescription>
                {active.status === "active" ? "In progress" : "Current booking"}
              </CardDescription>
              <CardTitle className="mt-1">{active.car.name}</CardTitle>
            </div>
            <StatusBadge status={active.status} />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.car.imageUrl}
                alt={active.car.name}
                className="h-36 w-full rounded-lg object-cover sm:w-56"
              />
              <div className="min-w-0 flex-1 space-y-2 text-sm">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays aria-hidden="true" className="size-4" />
                  {dateRange(active)} · {active.days}{" "}
                  {active.days === 1 ? "day" : "days"}
                </p>
                <p>
                  Pickup: <strong>{active.pickupLocation}</strong> at{" "}
                  {active.pickupTime}
                </p>
                <p>
                  Drop-off: <strong>{active.dropoffLocation}</strong> at{" "}
                  {active.dropoffTime}
                </p>
                <p className="text-base font-semibold">
                  {formatCents(active.totalCents)}
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/account/inbox?booking=${active.id}`}>
                    <Inbox aria-hidden="true" className="mr-2 size-4" />
                    Open thread
                    {active.unreadMessages > 0 && (
                      <Badge className="ml-2" variant="secondary">
                        {active.unreadMessages}
                      </Badge>
                    )}
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Nothing in progress</CardTitle>
            <CardDescription>
              Your next trip is listed below.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Next up</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {next ? (
              <div className="space-y-1">
                <p className="font-medium">{next.car.name}</p>
                <p className="text-muted-foreground">{dateRange(next)}</p>
                <Button asChild size="sm" variant="ghost" className="px-0">
                  <Link href={`/account/bookings`}>
                    All bookings
                    <ArrowRight aria-hidden="true" className="ml-1 size-3.5" />
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">No upcoming trips.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Inbox</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-muted-foreground">
              {unread === 0
                ? "No unread messages."
                : `${unread} unread ${unread === 1 ? "message" : "messages"}.`}
            </p>
            <Button asChild size="sm" variant="ghost" className="px-0">
              <Link href="/account/inbox">
                Open inbox
                <ArrowRight aria-hidden="true" className="ml-1 size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        {past.length} past {past.length === 1 ? "trip" : "trips"}
      </p>
    </div>
  );
}
