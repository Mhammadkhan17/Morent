"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAnalytics, type Analytics } from "@/lib/admin-api";
import { formatCents } from "@/lib/cars-api";

const toIso = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const DEFAULT_TO = toIso(new Date());
const DEFAULT_FROM = toIso(
  new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
);

const shortLabel = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

const compactMoney = (cents: number): string => {
  if (cents >= 100_000) return `$${Math.round(cents / 1000)}k`;
  return formatCents(cents);
};

function RevenueChart({
  data,
}: {
  data: { date: string; revenueCents: number }[];
}) {
  const w = 640;
  const h = 220;
  const pad = { l: 52, r: 12, t: 16, b: 28 };
  const max = Math.max(...data.map((d) => d.revenueCents), 1);
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const xAt = (index: number) =>
    pad.l + (data.length === 1 ? innerW / 2 : (index * innerW) / (data.length - 1));
  const yAt = (cents: number) => pad.t + innerH - (cents / max) * innerH;

  const points = data.map(
    (d, index) => `${xAt(index).toFixed(1)},${yAt(d.revenueCents).toFixed(1)}`
  );
  const line = points.length > 0 ? `M ${points.join(" L ")}` : "";
  const area =
    points.length > 1
      ? `${line} L ${xAt(data.length - 1).toFixed(1)},${h - pad.b} L ${xAt(0).toFixed(1)},${h - pad.b} Z`
      : "";

  const ticks = [0, max / 2, max];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-auto w-full"
      role="img"
      aria-label="Revenue by day chart"
    >
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={pad.l}
            x2={w - pad.r}
            y1={yAt(tick)}
            y2={yAt(tick)}
            className="stroke-border"
          />
          <text
            x={pad.l - 8}
            y={yAt(tick) + 4}
            textAnchor="end"
            className="fill-muted-foreground"
            fontSize="11"
          >
            {compactMoney(tick)}
          </text>
        </g>
      ))}
      {area !== "" && <path d={area} className="fill-chart-1/10" />}
      {line !== "" && (
        <path
          d={line}
          fill="none"
          className="stroke-chart-1"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
      <text
        x={pad.l}
        y={h - 8}
        className="fill-muted-foreground"
        fontSize="11"
      >
        {shortLabel(data[0]?.date ?? DEFAULT_FROM)}
      </text>
      <text
        x={w - pad.r}
        y={h - 8}
        textAnchor="end"
        className="fill-muted-foreground"
        fontSize="11"
      >
        {shortLabel(data[data.length - 1]?.date ?? DEFAULT_TO)}
      </text>
    </svg>
  );
}

function BarList({
  items,
  colorClass = "bg-primary",
}: {
  items: { key: string; label: string; display: string; ratio: number }[];
  colorClass?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-3 text-sm">
          <span className="w-36 truncate" title={item.label}>
            {item.label}
          </span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${colorClass}`}
              style={{ width: `${Math.max(item.ratio * 100, 2)}%` }}
            />
          </div>
          <span className="w-20 text-right text-muted-foreground">
            {item.display}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const [range, setRange] = useState<{ from: string; to: string }>({
    from: DEFAULT_FROM,
    to: DEFAULT_TO,
  });
  const [data, setData] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAnalytics(range.from, range.to)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const apply = () => {
    if (isLoading) return;
    setIsLoading(true);
    setRange({ from, to });
  };

  const maxBookings = Math.max(
    ...(data?.bookingsByCar ?? []).map((item) => item.bookings),
    1
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="analytics-from"
              className="text-xs text-muted-foreground"
            >
              From
            </label>
            <Input
              id="analytics-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="analytics-to"
              className="text-xs text-muted-foreground"
            >
              To
            </label>
            <Input
              id="analytics-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="w-40"
            />
          </div>
          <Button onClick={apply} disabled={isLoading}>
            {isLoading ? "Applying…" : "Apply"}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading || data === null ? (
        <Skeleton className="h-96 rounded-lg" />
      ) : (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue by day</CardTitle>
            </CardHeader>
            <CardContent>
              {data.revenueByDay.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No revenue in this period.
                </p>
              ) : (
                <RevenueChart data={data.revenueByDay} />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue by week</CardTitle>
              </CardHeader>
              <CardContent>
                {data.revenueByWeek.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data.</p>
                ) : (
                  <BarList
                    colorClass="bg-chart-2"
                    items={data.revenueByWeek.map((week) => {
                      const peak = Math.max(
                        ...data.revenueByWeek.map((w) => w.revenueCents),
                        1
                      );
                      return {
                        key: week.weekStart,
                        label: `Week of ${shortLabel(week.weekStart)}`,
                        display: formatCents(week.revenueCents),
                        ratio: week.revenueCents / peak,
                      };
                    })}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bookings by car</CardTitle>
              </CardHeader>
              <CardContent>
                {data.bookingsByCar.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data.</p>
                ) : (
                  <BarList
                    colorClass="bg-chart-4"
                    items={data.bookingsByCar.map((item) => ({
                      key: item.carId,
                      label: item.carName,
                      display: String(item.bookings),
                      ratio: item.bookings / maxBookings,
                    }))}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Utilization by car
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.utilizationByCar.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data.</p>
                ) : (
                  <BarList
                    colorClass="bg-chart-5"
                    items={data.utilizationByCar.map((item) => ({
                      key: item.carId,
                      label: item.carName,
                      display: `${item.utilizationPercent}%`,
                      ratio: item.utilizationPercent / 100,
                    }))}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top promo codes</CardTitle>
              </CardHeader>
              <CardContent>
                {data.topPromoCodes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead className="text-right">Uses</TableHead>
                        <TableHead className="text-right">
                          Discount given
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topPromoCodes.map((item) => (
                        <TableRow key={item.code}>
                          <TableCell className="font-mono text-sm">
                            {item.code}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {item.uses}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {formatCents(item.discountCents)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
