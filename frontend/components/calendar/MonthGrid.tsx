"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface MonthGridBooking {
  id: string;
  pickupDate: string;
  dropoffDate: string;
  status: string;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const STATUS_DOT: Record<string, string> = {
  pending: "bg-muted-foreground",
  confirmed: "bg-primary",
  active: "bg-foreground",
  completed: "bg-muted",
  failed: "bg-destructive",
  cancelled: "bg-destructive",
};

const toIso = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

/**
 * Shared month calendar (M6 admin bookings; reused by M7 customer portal).
 * Days covered by a booking [pickupDate, dropoffDate] get a status dot.
 */
export function MonthGrid({ bookings }: { bookings: MonthGridBooking[] }) {
  const now = new Date();
  const [cursor, setCursor] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  const cells = useMemo(() => {
    const firstDay = new Date(cursor.year, cursor.month, 1);
    const daysInMonth = new Date(
      cursor.year,
      cursor.month + 1,
      0
    ).getDate();
    const lead = firstDay.getDay(); // 0 = Sunday
    const isoDates: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      isoDates.push(toIso(new Date(cursor.year, cursor.month, day)));
    }
    while (isoDates.length % 7 !== 0) isoDates.push(null);
    return isoDates;
  }, [cursor]);

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, MonthGridBooking[]>();
    for (const booking of bookings) {
      const start = new Date(`${booking.pickupDate}T00:00:00`);
      const end = new Date(`${booking.dropoffDate}T00:00:00`);
      for (
        let day = new Date(start);
        day <= end;
        day.setDate(day.getDate() + 1)
      ) {
        const iso = toIso(day);
        const list = map.get(iso) ?? [];
        list.push(booking);
        map.set(iso, list);
      }
    }
    return map;
  }, [bookings]);

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleString(
    undefined,
    { month: "long", year: "numeric" }
  );

  const shiftMonth = (delta: number) => {
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const todayIso = toIso(now);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next month"
            onClick={() => shiftMonth(1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1" aria-hidden="true">
        {WEEKDAY_LABELS.map((label, index) => (
          <div
            key={`${label}-${index}`}
            className="py-1 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((iso, index) => {
          if (iso === null) {
            return <div key={`empty-${index}`} className="size-10" />;
          }
          const dayBookings = bookingsByDay.get(iso) ?? [];
          const isToday = iso === todayIso;
          return (
            <div
              key={iso}
              title={
                dayBookings.length > 0
                  ? dayBookings.map((b) => `${b.status}: ${b.id}`).join("\n")
                  : undefined
              }
              className={cn(
                "flex size-10 flex-col items-center justify-center gap-1 rounded-md border text-xs",
                isToday && "border-primary font-semibold",
                dayBookings.length > 0
                  ? "bg-accent text-foreground"
                  : "border-transparent text-muted-foreground"
              )}
            >
              <span>{Number.parseInt(iso.slice(-2), 10)}</span>
              {dayBookings.length > 0 && (
                <span className="flex gap-0.5">
                  {dayBookings.slice(0, 3).map((booking) => (
                    <span
                      key={booking.id}
                      className={cn(
                        "size-1.5 rounded-full",
                        STATUS_DOT[booking.status] ?? "bg-muted-foreground"
                      )}
                    />
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
