"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CircleCheck, CircleX, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchSessionStatus } from "@/lib/bookings";

const CompleteContent = () => {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "complete" | "open" | "error">(
    "loading"
  );
  const [detail, setDetail] = useState("");

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    fetchSessionStatus(sessionId)
      .then((result) => {
        if (cancelled) return;
        if (result.status === "complete" || result.paymentStatus === "paid") {
          setStatus("complete");
        } else {
          setStatus("open");
          setDetail(
            "Your payment was not completed. You can return to the booking form and try again."
          );
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setDetail(
          err instanceof Error ? err.message : "Could not verify payment."
        );
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-lg text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <CircleX aria-hidden="true" className="size-6 text-destructive" />
              Missing checkout session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <CircleX aria-hidden="true" />
              <AlertDescription>
                No session_id was provided. Please complete payment from the
                booking page.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="justify-center gap-3">
            <Button asChild>
              <Link href="/">Back to home</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/explore">Browse cars</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <Card className="mx-auto max-w-lg text-center">
        <CardHeader>
          {status === "loading" && (
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <Loader2 aria-hidden="true" className="size-5 animate-spin" />
              Checking payment…
            </CardTitle>
          )}
          {status === "complete" && (
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <CircleCheck aria-hidden="true" className="size-6 text-primary" />
              Payment successful
            </CardTitle>
          )}
          {status === "open" && (
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <CircleX aria-hidden="true" className="size-6 text-destructive" />
              Payment not completed
            </CardTitle>
          )}
          {status === "error" && (
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <CircleX aria-hidden="true" className="size-6 text-destructive" />
              Something went wrong
            </CardTitle>
          )}
        </CardHeader>
        <CardContent>
          {status === "loading" && <Skeleton className="mx-auto h-4 w-48" />}
          {status === "complete" && (
            <Alert>
              <CircleCheck aria-hidden="true" />
              <AlertDescription>
                Your rental is confirmed. You can manage it from your account
                once dashboards ship.
              </AlertDescription>
            </Alert>
          )}
          {(status === "open" || status === "error") && (
            <Alert variant="destructive">
              <CircleX aria-hidden="true" />
              <AlertDescription>{detail}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="justify-center gap-3">
          <Button asChild>
            <Link href="/">Back to home</Link>
          </Button>
          {status !== "complete" && (
            <Button asChild variant="outline">
              <Link href="/explore">Browse cars</Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default function PaymentCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <Card className="mx-auto max-w-lg">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <CompleteContent />
    </Suspense>
  );
}
