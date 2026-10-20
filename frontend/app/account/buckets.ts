import type { MeBooking } from "@/lib/account";

export type Bucket = "current" | "upcoming" | "past";

export function localToday(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function bucketOf(booking: MeBooking, today = localToday()): Bucket {
  if (["completed", "cancelled", "failed"].includes(booking.status)) {
    return "past";
  }
  if (booking.status === "active" || booking.pickupDate <= today) {
    return "current";
  }
  return "upcoming";
}

export function bucketize(bookings: MeBooking[], today = localToday()) {
  const buckets: Record<Bucket, MeBooking[]> = {
    current: [],
    upcoming: [],
    past: [],
  };
  for (const booking of bookings) {
    buckets[bucketOf(booking, today)].push(booking);
  }
  return buckets;
}

export function dateRange(booking: MeBooking): string {
  return `${booking.pickupDate} → ${booking.dropoffDate}`;
}
