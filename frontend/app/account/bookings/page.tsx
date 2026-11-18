"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/app/admin/status-badge";
import { bucketize, dateRange, type Bucket } from "@/app/account/buckets";
import { LoadErrorCard } from "@/app/components/load-error";
import {
  acceptSwap,
  fetchMeBookings,
  requestSwapRefund,
  type MeBooking,
} from "@/lib/account";
import { formatCents } from "@/lib/cars-api";
import { apiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

function refundNote(booking: MeBooking): string | null {
  const payment = booking.payment;
  if (!payment) return null;
  if (payment.refundStatus === "succeeded" && payment.refundedCents > 0) {
    return `Refunded ${formatCents(payment.refundedCents)}`;
  }
  if (payment.refundStatus === "pending") return "Refund in progress";
  if (payment.refundStatus === "failed") {
    return "Refund failed — our team is retrying";
  }
  return null;
}

function BookingRow({ booking, href }: { booking: MeBooking; href: string }) {
  const note = refundNote(booking);
  const showReason =
    booking.status === "cancelled" && Boolean(booking.cancelReason);
  const replaced = booking.swapOffer?.status === "accepted";
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
              {replaced && (
                <Badge variant="secondary">
                  Replaced by {booking.swapOffer?.car.name}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {dateRange(booking)} · {booking.days}{" "}
              {booking.days === 1 ? "day" : "days"} ·{" "}
              {booking.pickupLocation}
            </p>
            {showReason && (
              <p
                className="mt-0.5 line-clamp-1 text-xs text-muted-foreground"
                title={booking.cancelReason ?? ""}
              >
                Reason: {booking.cancelReason}
              </p>
            )}
            {note && (
              <p
                className={cn(
                  "mt-0.5 text-xs",
                  booking.payment?.refundStatus === "failed"
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {note}
              </p>
            )}
          </div>
          <p className="shrink-0 text-sm font-semibold">
            {formatCents(booking.totalCents)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

/** Open replacement offer — needs a decision, so it is not a plain link. */
function OfferCard({
  booking,
  onChanged,
}: {
  booking: MeBooking;
  onChanged: () => void;
}) {
  const offer = booking.swapOffer;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!offer) return null;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err, "Something went wrong — try again."));
    } finally {
      setBusy(false);
    }
  };

  const savings = offer.originalTotalCents - offer.offeredTotalCents;

  return (
    <Card className="border-primary/40">
      <CardContent className="flex flex-col gap-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Replacement offered</Badge>
          <span className="text-sm text-muted-foreground">
            Your original booking was cancelled
          </span>
        </div>
        {booking.cancelReason && (
          <p
            className="line-clamp-2 text-sm text-muted-foreground"
            title={booking.cancelReason}
          >
            Reason: {booking.cancelReason}
          </p>
        )}
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={offer.car.imageUrl}
            alt={offer.car.name}
            className="h-16 w-24 shrink-0 rounded-md object-cover"
          />
          <div className="min-w-0">
            <p className="truncate font-medium">{offer.car.name}</p>
            <p className="text-sm text-muted-foreground">
              {booking.pickupDate} → {booking.dropoffDate} · {booking.days}{" "}
              {booking.days === 1 ? "day" : "days"}
            </p>
            <p className="mt-0.5 text-sm">
              <span className="text-muted-foreground line-through">
                {formatCents(offer.originalTotalCents)}
              </span>{" "}
              <span className="font-semibold">
                {formatCents(offer.offeredTotalCents)}
              </span>
              {savings > 0 && (
                <span className="text-muted-foreground">
                  {" "}
                  ({formatCents(savings)} less)
                </span>
              )}
              <span className="text-muted-foreground">
                {" "}
                — credited from your payment, nothing extra to pay
              </span>
            </p>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy}
            onClick={() => void run(() => acceptSwap(booking.id))}
          >
            {busy ? "Working…" : "Accept replacement"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void run(() => requestSwapRefund(booking.id))}
          >
            Request full refund
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AccountBookingsPage() {
  const [bookings, setBookings] = useState<MeBooking[] | null>(null);
  const [tab, setTab] = useState<Bucket>("current");
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

  const { openOffers, buckets } = useMemo(() => {
    if (!bookings) return { openOffers: [] as MeBooking[], buckets: null };
    const offers = bookings.filter((b) => b.swapOffer?.status === "offered");
    const offerIds = new Set(offers.map((b) => b.id));
    // Open offers live in the pinned banner — keep them out of the tabs.
    const rest = bookings.filter((b) => !offerIds.has(b.id));
    return { openOffers: offers, buckets: bucketize(rest) };
  }, [bookings]);

  const reloadNow = () => setReload((n) => n + 1);

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
      {openOffers.length > 0 && (
        <section aria-label="Offers awaiting your decision" className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Needs your decision
          </h2>
          {openOffers.map((booking) => (
            <OfferCard
              key={booking.id}
              booking={booking}
              onChanged={reloadNow}
            />
          ))}
        </section>
      )}

      <div
        role="group"
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
            aria-pressed={tab === value}
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
          Totals include any discounts applied at checkout.
        </p>
      )}
    </div>
  );
}
