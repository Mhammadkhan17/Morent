"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { ThreadPanel } from "@/components/thread/ThreadPanel";
import {
  BOOKING_ACTIONS,
  BOOKING_STATUSES,
  fetchAdminBookings,
  fetchAdminCars,
  updateBookingStatus,
  type AdminBooking,
  type AdminCar,
} from "@/lib/admin-api";
import { formatCents } from "@/lib/cars-api";
import { StatusBadge } from "../status-badge";

const ALL = "all";

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
                                  variant={
                                    next === "cancelled"
                                      ? "outline"
                                      : "secondary"
                                  }
                                  disabled={busyId === booking.id}
                                  onClick={() => void act(booking, next)}
                                >
                                  {actionLabel(next)}
                                </Button>
                              ))}
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
    </div>
  );
}
