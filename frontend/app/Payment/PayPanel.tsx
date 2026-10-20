"use client";

import { useState } from "react";
import {
  CheckoutElementsProvider,
  PaymentElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import { loadStripe } from "@stripe/stripe-js";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CircleX } from "lucide-react";
import { getThemeSetting, resolveDark } from "@/lib/theme";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const APPEARANCE = {
  variables: {
    colorPrimary: "#3563E9",
    borderRadius: "8px",
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  },
};

/** Night theme follows the app's dark mode (computed at panel mount). */
const stripeAppearance = () => {
  const dark =
    typeof document !== "undefined" && resolveDark(getThemeSetting());
  return dark ? { ...APPEARANCE, theme: "night" as const } : APPEARANCE;
};

const CheckoutForm = ({
  totalLabel,
  onClosed,
}: {
  totalLabel: string;
  onClosed: () => void;
}) => {
  const result = useCheckoutElements();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  if (result.type === "loading") {
    return (
      <Card data-pay-panel>
        <CardHeader>
          <CardTitle className="text-lg">Payment</CardTitle>
          <CardDescription>Preparing card form…</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (result.type === "error") {
    return (
      <Card data-pay-panel>
        <CardHeader>
          <CardTitle className="text-lg">Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <CircleX aria-hidden="true" />
            <AlertDescription>
              {result.error.message || "Failed to load payment form."}
            </AlertDescription>
          </Alert>
          <Button type="button" variant="outline" className="mt-4" onClick={onClosed}>
            Edit booking
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { checkout } = result;

  return (
    <Card data-pay-panel>
      <CardHeader>
        <CardTitle className="text-lg">Payment</CardTitle>
        <CardDescription>
          Enter your card details to finish booking. You&apos;ll be redirected
          after payment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setErrorMessage(null);
            setIsPaying(true);
            try {
              // return_url is set server-side on the Checkout Session
              const confirmResult = await checkout.confirm();
              if (confirmResult.type === "error") {
                setErrorMessage(
                  confirmResult.error.message || "Payment failed."
                );
                setIsPaying(false);
              }
              // success → redirect to returnUrl; no local state needed
            } catch (err) {
              setErrorMessage(
                err instanceof Error ? err.message : "Payment failed."
              );
              setIsPaying(false);
            }
          }}
        >
          <PaymentElement />
          {errorMessage && (
            <Alert variant="destructive">
              <CircleX aria-hidden="true" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={!checkout.canConfirm || isPaying}
              className="sm:w-auto"
            >
              {isPaying ? "Processing…" : `Pay ${totalLabel}`}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClosed}
              disabled={isPaying}
            >
              Edit booking
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

/**
 * Phase B — mounted only after POST /bookings returns a clientSecret.
 * Requires `@stripe/stripe-js` + `@stripe/react-stripe-js` (installed M4).
 */
const PayPanel = ({
  clientSecret,
  totalLabel,
  onClosed,
}: {
  clientSecret: string;
  totalLabel: string;
  onClosed: () => void;
}) => (
  <CheckoutElementsProvider
    stripe={stripePromise}
    options={{
      clientSecret,
      elementsOptions: {
        appearance: stripeAppearance(),
      },
    }}
  >
    <CheckoutForm totalLabel={totalLabel} onClosed={onClosed} />
  </CheckoutElementsProvider>
);

export default PayPanel;
