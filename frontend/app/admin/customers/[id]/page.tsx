"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchCustomer, type CustomerDetail } from "@/lib/admin-api";
import { formatCents } from "@/lib/cars-api";
import { StatusBadge } from "../../status-badge";

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const ProfileRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-4 py-2 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-medium">{value}</span>
  </div>
);

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomer(params.id)
      .then((data) => {
        setCustomer(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (error || customer === null) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load customer</AlertTitle>
        <AlertDescription>
          {error ?? "Customer not found."}{" "}
          <Link href="/admin/customers" className="underline">
            Back to customers
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-semibold">{customer.name}</h1>
        <Link
          href="/admin/customers"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← All customers
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <ProfileRow label="Email" value={customer.email} />
            <ProfileRow label="Phone" value={customer.phone ?? "—"} />
            <ProfileRow
              label="License number"
              value={customer.licenseNumber ?? "—"}
            />
            <ProfileRow
              label="License expires"
              value={
                customer.licenseExpires
                  ? shortDate(customer.licenseExpires)
                  : "—"
              }
            />
            <ProfileRow
              label="Member bookings"
              value={String(customer.bookingCount)}
            />
            <ProfileRow
              label="Total spent"
              value={formatCents(customer.totalSpentCents)}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {customer.bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableHead>Car</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {shortDate(booking.createdAt.slice(0, 10))}
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
