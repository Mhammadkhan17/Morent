"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { ThreadPanel } from "@/components/thread/ThreadPanel";
import {
  BOOKING_ACTIONS,
  BOOKING_STATUSES,
  CANCELABLE_STATUSES,
  cancelBooking,
  fetchAdminBookings,
  fetchAdminCars,
  refundBooking,
  updateBookingStatus,
  withdrawBookingOffer,
  type AdminBooking,
  type AdminCar,
} from "@/lib/admin-api";
import { formatCents } from "@/lib/cars-api";
import { StatusBadge } from "../status-badge";

const ALL = "all";
/** Select sentinel: "no replacement offered" (Radix needs a real value). */
const NO_OFFER = "__none__";

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const actionLabel = (status: string) =>
  status.charAt(0).toUpperCase() + status.slice(1);

export default function AdminBookingsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-72 rounded-lg" />}>
      <AdminBookingsInner />
    </Suspense>
  );
}

function AdminBookingsInner() {
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [cars, setCars] = useState<AdminCar[]>([]);
  const [status, setStatus] = useState<string>(ALL);
  const [carId, setCarId] = useState<string>(ALL);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [view, setView] = useState<"table" | "calendar">("table");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(
    () => searchParams.get("thread")
  );
  const [cancelTarget, setCancelTarget] = useState<AdminBooking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelOfferCarId, setCancelOfferCarId] = useState(NO_OFFER);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setIsLoading(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(() => {
    fetchAdminBookings({
      status: status === ALL ? undefined : status,
      carId: carId === ALL ? undefined : carId,
      q: debouncedQuery || undefined,
    })
      .then((data) => {
        setBookings(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [status, carId, debouncedQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    fetchAdminCars()
      .then(setCars)
      .catch(() => {
        // filter select degrades to ids-less list; bookings still load
      });
  }, []);

  const threadCarName =
    bookings.find((booking) => booking.id === threadId)?.carName ?? "";

  const act = async (booking: AdminBooking, nextStatus: string) => {
    setBusyId(booking.id);
    setError(null);
    try {
      await updateBookingStatus(booking.id, nextStatus);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const runRowAction = async (
    booking: AdminBooking,
    fn: () => Promise<unknown>,
    fallback: string
  ) => {
    setBusyId(booking.id);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
    } finally {
      setBusyId(null);
    }
  };

  const openCancel = (booking: AdminBooking) => {
    setCancelTarget(booking);
    setCancelReason("");
    setCancelOfferCarId(NO_OFFER);
    setCancelError(null);
  };

  const closeCancel = () => {
    setCancelTarget(null);
    setCancelError(null);
  };

  const submitCancel = async () => {
    if (!cancelTarget) return;
    const reason = cancelReason.trim();
    if (!reason) {
      setCancelError("A cancellation reason is required.");
      return;
    }
    setBusyId(cancelTarget.id);
    setCancelError(null);
    try {
      await cancelBooking(cancelTarget.id, {
        reason,
        offeredCarId:
          cancelOfferCarId === NO_OFFER ? null : cancelOfferCarId,
      });
      closeCancel();
      await load();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setBusyId(null);
    }
  };

  // Replacement offers only exist on paid, non-mid-rental bookings.
  const offerAvailable =
    cancelTarget?.paymentStatus === "succeeded" &&
    cancelTarget.status !== "active";
  const offerCars = cars.filter((car) => car.status === "available");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Bookings</h1>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setIsLoading(true);
          }}
        >
          <SelectTrigger className="w-44" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {BOOKING_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {actionLabel(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={carId}
          onValueChange={(value) => {
            setCarId(value);
            setIsLoading(true);
          }}
        >
          <SelectTrigger className="w-48" aria-label="Filter by car">
            <SelectValue placeholder="Car" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All cars</SelectItem>
            {cars.map((car) => (
              <SelectItem key={car.id} value={car.id}>
                {car.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search customer…"
          aria-label="Search bookings by customer"
          className="w-56"
        />

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={view === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("table")}
          >
            Table
          </Button>
          <Button
            variant={view === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("calendar")}
          >
            Calendar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-72 rounded-lg" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {view === "table"
                ? `${bookings.length} booking${bookings.length === 1 ? "" : "s"}`
                : "Month view"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No bookings match these filters.
              </p>
            ) : view === "calendar" ? (
              <MonthGrid bookings={bookings} />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Created</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Car</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => {
                      const actions = BOOKING_ACTIONS[booking.status] ?? [];
                      return (
                        <TableRow key={booking.id}>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {shortDate(booking.createdAt.slice(0, 10))}
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/admin/customers/${booking.userId}`}
                              className="block text-sm font-medium hover:underline"
                            >
                              {booking.customerName}
                            </Link>
                            <span className="block text-xs text-muted-foreground">
                              {booking.customerEmail}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/cars/${booking.carId}`}
                              className="text-sm font-medium hover:underline"
                            >
                              {booking.carName}
                            </Link>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {shortDate(booking.pickupDate)} →{" "}
                            {shortDate(booking.dropoffDate)}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {formatCents(booking.totalCents)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={booking.status} />
                            {booking.swapOfferStatus === "offered" && (
                              <Badge
                                variant="secondary"
                                className="ml-1.5 align-middle"
                              >
                                Offer open
                              </Badge>
                            )}
                            {booking.paymentStatus === "succeeded" &&
                              booking.refundStatus === "succeeded" && (
                                <span className="mt-1 block text-xs text-muted-foreground">
                                  Refunded{" "}
                                  {formatCents(booking.refundedCents ?? 0)}
                                </span>
                              )}
                            {booking.refundStatus === "failed" && (
                              <span className="mt-1 block text-xs text-destructive">
                                Refund failed
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setThreadId(booking.id)}
                              >
                                <MessageSquare
                                  aria-hidden="true"
                                  className="mr-1.5 size-3.5"
                                />
                                Messages
                              </Button>
                              {actions.map((next) => (
                                <Button
                                  key={next}
                                  size="sm"
                                  variant="secondary"
                                  disabled={busyId === booking.id}
                                  onClick={() => void act(booking, next)}
                                >
                                  {actionLabel(next)}
                                </Button>
                              ))}
                              {CANCELABLE_STATUSES.has(booking.status) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busyId === booking.id}
                                  onClick={() => openCancel(booking)}
                                >
                                  Cancel…
                                </Button>
                              )}
                              {booking.swapOfferStatus === "offered" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busyId === booking.id}
                                  onClick={() =>
                                    void runRowAction(
                                      booking,
                                      () => withdrawBookingOffer(booking.id),
                                      "Withdraw failed"
                                    )
                                  }
                                >
                                  Withdraw offer
                                </Button>
                              )}
                              {booking.paymentStatus === "succeeded" &&
                                (booking.refundStatus === "none" ||
                                  booking.refundStatus === "failed") && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={busyId === booking.id}
                                    onClick={() =>
                                      void runRowAction(
                                        booking,
                                        () => refundBooking(booking.id),
                                        "Refund failed"
                                      )
                                    }
                                  >
                                    Refund
                                  </Button>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={threadId !== null}
        onOpenChange={(open) => {
          if (!open) setThreadId(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Messages{threadCarName ? ` — ${threadCarName}` : ""}
            </DialogTitle>
          </DialogHeader>
          {threadId && <ThreadPanel key={threadId} bookingId={threadId} />}
        </DialogContent>
      </Dialog>

      <Dialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) closeCancel();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cancel booking?</DialogTitle>
            <DialogDescription>
              {cancelTarget
                ? `${cancelTarget.carName} for ${cancelTarget.customerName}, ${shortDate(cancelTarget.pickupDate)} → ${shortDate(cancelTarget.dropoffDate)}.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {cancelError && (
            <Alert variant="destructive">
              <AlertTitle>Cancel failed</AlertTitle>
              <AlertDescription>{cancelError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cancel-reason">Reason (required)</Label>
              <Textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="e.g. Vehicle unavailable for these dates"
                disabled={busyId === cancelTarget?.id}
              />
              <p className="text-xs text-muted-foreground">
                Sent to the customer in their booking thread.
              </p>
            </div>

            {offerAvailable && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cancel-offer">Replacement offer (optional)</Label>
                <Select
                  value={cancelOfferCarId}
                  onValueChange={setCancelOfferCarId}
                  disabled={busyId === cancelTarget?.id}
                >
                  <SelectTrigger id="cancel-offer" aria-label="Replacement car">
                    <SelectValue placeholder="No replacement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_OFFER}>
                      None — refund instead
                    </SelectItem>
                    {offerCars.map((car) => (
                      <SelectItem key={car.id} value={car.id}>
                        {car.name} · {formatCents(car.pricePerDay)}/day
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The customer can accept the replacement (credited — they never
                  pay more) or request a full refund. Without an offer, a full
                  refund is issued immediately.
                </p>
              </div>
            )}

            {cancelTarget?.paymentStatus !== "succeeded" &&
              cancelTarget?.status === "pending" && (
                <p className="text-xs text-muted-foreground">
                  No charge was made — cancelling closes the payment session.
                </p>
              )}
            {cancelTarget?.status === "active" && (
              <p className="text-xs text-muted-foreground">
                Mid-rental: record the reason now; use Refund once the car is
                back.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeCancel}
              disabled={busyId === cancelTarget?.id}
            >
              Keep booking
            </Button>
            <Button
              variant="destructive"
              onClick={() => void submitCancel()}
              disabled={busyId === cancelTarget?.id || !cancelReason.trim()}
            >
              {busyId === cancelTarget?.id ? "Cancelling…" : "Cancel booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
