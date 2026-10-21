"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CircleCheck, CircleX, Clock, Loader2 } from "lucide-react";
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
import { apiErrorMessage, isAbortError } from "@/lib/api";

/** Never spin forever on a request the network will not finish. */
const STATUS_TIMEOUT_MS = 15_000;

type Status = "loading" | "complete" | "processing" | "open" | "error";

const CompleteContent = () => {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<Status>("loading");
  const [detail, setDetail] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let timedOut = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, STATUS_TIMEOUT_MS);

    fetchSessionStatus(sessionId, { signal: controller.signal })
      .then((result) => {
        if (cancelled) return;
        setDetail("");
        if (result.paymentStatus === "paid") {
          setStatus("complete");
        } else if (result.status === "complete") {
          // Session closed but the money hasn't settled — never claim success.
          setStatus("processing");
          setDetail(
            "Your payment method hasn't settled yet. We'll confirm your rental as soon as it does — there is nothing else to do now."
          );
        } else {
          setStatus("open");
          setDetail(
            "Your payment didn't go through and nothing was charged. Pick a car from the catalogue to book again."
          );
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setDetail(
          timedOut || isAbortError(err)
            ? "Checking your payment took too long. Check your connection, then try again."
            : apiErrorMessage(err, "Could not verify payment.")
        );
      })
      .finally(() => {
        window.clearTimeout(timeout);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [sessionId, attempt]);

  const retry = () => {
    setStatus("loading");
    setDetail("");
    setAttempt((n) => n + 1);
  };

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
          {status === "processing" && (
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <Clock aria-hidden="true" className="size-6 text-muted-foreground" />
              Payment processing
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
                Your rental is confirmed. You can manage it from your account.
              </AlertDescription>
            </Alert>
          )}
          {status === "processing" && (
            <Alert>
              <Clock aria-hidden="true" />
              <AlertDescription>{detail}</AlertDescription>
            </Alert>
          )}
          {(status === "open" || status === "error") && (
            <Alert variant="destructive">
              <CircleX aria-hidden="true" />
              <AlertDescription>{detail}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap justify-center gap-3">
          {status === "complete" ? (
            <>
              <Button asChild>
                <Link href="/account/bookings">View my bookings</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">Back to home</Link>
              </Button>
            </>
          ) : status === "processing" || status === "error" ? (
            <>
              <Button type="button" onClick={retry}>
                Check again
              </Button>
              <Button asChild variant="outline">
                <Link href="/">Back to home</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild>
                <Link href="/">Back to home</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/explore">Browse cars</Link>
              </Button>
            </>
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
