"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchOverview, type AdminOverview } from "@/lib/admin-api";
import { formatCents } from "@/lib/cars-api";
import { StatusBadge } from "./status-badge";

const KPIS: {
  key: keyof Omit<AdminOverview, "recentActivity">;
  label: string;
  money?: boolean;
  percent?: boolean;
}[] = [
  { key: "revenueMtdCents", label: "Revenue (month to date)", money: true },
  { key: "activeRentals", label: "Active rentals" },
  { key: "upcoming7d", label: "Upcoming (next 7 days)" },
  { key: "fleetSize", label: "Fleet size" },
  { key: "utilizationPercent", label: "Fleet utilization", percent: true },
  { key: "pendingConfirmations", label: "Pending confirmations" },
];

function formatKpi(
  overview: AdminOverview,
  kpi: (typeof KPIS)[number]
): string {
  const value = overview[kpi.key];
  if (kpi.money) return formatCents(value);
  if (kpi.percent) return `${value}%`;
  return String(value);
}

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchOverview()
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load overview</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Overview</h1>

      {overview && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {KPIS.map((kpi) => (
              <Card key={kpi.key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {kpi.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="text-2xl font-semibold">
                    {formatKpi(overview, kpi)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              {overview.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No bookings yet — activity will appear here.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {overview.recentActivity.map((item) => (
                    <li
                      key={item.bookingId}
                      className="flex flex-wrap items-center gap-3"
                    >
                      <StatusBadge status={item.status} />
                      <span className="text-sm font-medium">
                        {item.carName || "Booking"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {item.customerName}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
