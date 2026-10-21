"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { CircleX } from "lucide-react";
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
import PaymentMethods from "./PaymentMethod";
import Confirmation from "./Confirmation";
import RentalSummary from "./RentalSummary";
import BillingInfo from "./BillingInfo";
import RentalInfo from "./RentalInfo";
import PayPanel from "./PayPanel";
import { fetchCar, formatCents } from "@/lib/cars-api";
import { createBooking, fetchQuote } from "@/lib/bookings";
import { clearRentalDraft, readRentalDraft } from "@/lib/rental-draft";
import type { Car, Quote } from "@/lib/types";
import { useAuth } from "@/lib/AuthProvider";
import { ApiError, apiErrorMessage, isAbortError } from "@/lib/api";
import {
  FIELD_ORDER,
  fieldElementId,
  validateField,
  validateForm,
  type FieldErrors,
  type FieldPath,
} from "./validation";

/** How long we wait for a price before telling the user, rather than showing "…" forever. */
const QUOTE_TIMEOUT_MS = 10_000;
/** A booking POST that never returns must not lock the form for good. */
const BOOKING_TIMEOUT_MS = 20_000;
const CAR_TIMEOUT_MS = 10_000;

interface FormData {
  billingInfo: {
    name: string;
    phone: string;
    address: string;
    city: string;
  };
  rentalInfo: {
    pickup: {
      date: string;
      location: string;
      time: string;
    };
    dropoff: {
      date: string;
      location: string;
      time: string;
    };
  };
  agreedToMarketing: boolean;
  agreedToTerms: boolean;
}

interface NestedObject {
  [key: string]: string | NestedObject;
}

const PaymentContent = () => {
  const searchParams = useSearchParams();
  const carId = searchParams.get("carId");
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [carLoading, setCarLoading] = useState(() => Boolean(carId));
  const [carError, setCarError] = useState<string | null>(null);
  const [carAttempt, setCarAttempt] = useState(0);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoteAttempt, setQuoteAttempt] = useState(0);
  const [isQuoting, setIsQuoting] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const { user, isLoading } = useAuth();
  const prepareLockRef = useRef(false);
  const preparedSignatureRef = useRef<string | null>(null);
  const failedSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading || user) return;
    const next = encodeURIComponent(
      `${window.location.pathname}${window.location.search}`
    );
    window.location.replace(`/login?next=${next}`);
  }, [isLoading, user]);

  const [formData, setFormData] = useState<FormData>(() => {
    // Non-destructive read: the draft must survive auth redirects and
    // remounts; it is cleared only after createBooking succeeds.
    const draft = readRentalDraft();
    return {
      billingInfo: {
        name: "",
        phone: "",
        address: "",
        city: "",
      },
      rentalInfo: draft ?? {
        pickup: {
          date: "",
          location: "",
          time: "",
        },
        dropoff: {
          date: "",
          location: "",
          time: "",
        },
      },
      agreedToMarketing: false,
      agreedToTerms: false,
    };
  });

  useEffect(() => {
    if (!carId) return;
    let cancelled = false;
    let timedOut = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, CAR_TIMEOUT_MS);

    fetchCar(carId, { signal: controller.signal })
      .then((car) => {
        if (cancelled) return;
        setSelectedCar(car);
        setCarError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSelectedCar(null);
        if (err instanceof ApiError && err.status === 404) {
          // Genuinely not in the catalogue — the empty state already says so.
          setCarError(null);
        } else if (timedOut || isAbortError(err)) {
          setCarError(
            "This car took too long to load. Check your connection and try again."
          );
        } else {
          setCarError(
            apiErrorMessage(err, "We couldn't load this car's details.")
          );
        }
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (!cancelled) setCarLoading(false);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [carId, carAttempt]);

  const retryCar = () => {
    setCarLoading(true);
    setCarAttempt((attempt) => attempt + 1);
  };

  const canQuote = useMemo(() => {
    const { pickup, dropoff } = formData.rentalInfo;
    return Boolean(
      carId &&
        pickup.date &&
        pickup.time &&
        pickup.location &&
        dropoff.date &&
        dropoff.time &&
        dropoff.location
    );
  }, [carId, formData.rentalInfo]);

  // Re-quote (debounced) whenever priced fields change — server is the only source of money
  useEffect(() => {
    if (!canQuote || !carId) return;
    let cancelled = false;
    let timedOut = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, QUOTE_TIMEOUT_MS);

    const timer = window.setTimeout(async () => {
      setIsQuoting(true);
      setQuoteError("");
      try {
        const result = await fetchQuote(
          {
            carId,
            pickup: formData.rentalInfo.pickup,
            dropoff: formData.rentalInfo.dropoff,
            promoCode: appliedPromo,
          },
          { signal: controller.signal }
        );
        if (!cancelled) setQuote(result);
      } catch (err) {
        if (cancelled) return;
        setQuote(null);
        setQuoteError(
          timedOut
            ? "Pricing is taking longer than usual. Check your connection and try again."
            : apiErrorMessage(
                err,
                "We couldn't price this rental. Try again in a moment."
              )
        );
      } finally {
        window.clearTimeout(timeout);
        if (!cancelled) setIsQuoting(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [carId, formData.rentalInfo, appliedPromo, canQuote, quoteAttempt]);

  // A failed quote recovers on its own once connectivity is back.
  useEffect(() => {
    if (!quoteError) return;
    const handleOnline = () => setQuoteAttempt((attempt) => attempt + 1);
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [quoteError]);

  const activeQuote = canQuote ? quote : null;
  const activeQuoteError = canQuote ? quoteError : "";

  const retryQuote = () => {
    setQuoteError("");
    setQuoteAttempt((attempt) => attempt + 1);
  };

  const handleInputChange = (
    section: keyof FormData,
    field: string,
    value: string
  ) => {
    setFormData((prevData) => {
      const sectionData = { ...(prevData[section] as NestedObject) };
      const fieldParts = field.split(".");
      let current: NestedObject = sectionData;

      for (let i = 0; i < fieldParts.length - 1; i++) {
        current[fieldParts[i]] = current[fieldParts[i]] || {};
        current = current[fieldParts[i]] as NestedObject;
      }

      current[fieldParts[fieldParts.length - 1]] = value;

      return {
        ...prevData,
        [section]: sectionData,
      };
    });
    // Editing a field clears its own error (re-shown on blur/submit if still invalid)
    const path = `${section}.${field}` as FieldPath;
    setErrors((prev) => {
      if (!prev[path]) return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });
    // A past failure may no longer describe what the user is about to submit
    setSubmitError(null);
    // Priced field change invalidates any open checkout session
    setClientSecret(null);
  };

  /**
   * Blur validates that field; changing pickup date/time also re-checks the
   * dependent drop-off comparison so stale cross-errors clear themselves.
   */
  const handleBlurField = (path: string) => {
    const targets: FieldPath[] = [path as FieldPath];
    if (
      path === "rentalInfo.pickup.date" ||
      path === "rentalInfo.pickup.time"
    ) {
      targets.push("rentalInfo.dropoff.date", "rentalInfo.dropoff.time");
    }
    setErrors((prev) => {
      const next = { ...prev };
      for (const target of targets) {
        const message = validateField(target, formData);
        if (message) next[target] = message;
        else delete next[target];
      }
      return next;
    });
  };

  const handleCheckboxChange = (field: keyof FormData, value: boolean) => {
    setFormData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
    // Unchecking terms reverts the prepared checkout; re-check re-prepares
    if (field === "agreedToTerms" && !value) {
      preparedSignatureRef.current = null;
      setClientSecret(null);
    }
  };

  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    setAppliedPromo(code || null);
    setSubmitError(null);
    setClientSecret(null);
  };

  const handlePromoCodeChange = (code: string) => {
    setPromoInput(code);
    if (!code.trim()) {
      setAppliedPromo(null);
    }
  };

  // Create booking → Stripe clientSecret → mount card panel (Rent now only)
  const prepareBooking = useCallback(
    async (opts: { manual?: boolean } = {}): Promise<void> => {
      if (prepareLockRef.current) return;

      // Exact payload that would be POSTed — dedupe key for prepare runs
      const signature = JSON.stringify({
        carId,
        pickup: formData.rentalInfo.pickup,
        dropoff: formData.rentalInfo.dropoff,
        promoCode: appliedPromo,
        billingName: formData.billingInfo.name,
        billingPhone: formData.billingInfo.phone,
        billingAddress: formData.billingInfo.address,
        billingCity: formData.billingInfo.city,
        agreedToMarketing: formData.agreedToMarketing,
      });

      if (
        !opts.manual &&
        (clientSecret ||
          preparedSignatureRef.current === signature ||
          failedSignatureRef.current === signature)
      ) {
        return;
      }

      if (!selectedCar || !carId) {
        setSubmitError(
          "No car is attached to this checkout. Pick one from the catalogue first."
        );
        return;
      }

      // Full validation → inline errors + focus first invalid field
      const allErrors = validateForm(formData);
      if (Object.keys(allErrors).length > 0) {
        setErrors(allErrors);
        const firstInvalid = FIELD_ORDER.find((path) => allErrors[path]);
        if (firstInvalid) {
          document.getElementById(fieldElementId(firstInvalid))?.focus();
        }
        return;
      }
      setErrors({});

      if (!canQuote || !activeQuote) {
        setSubmitError(
          activeQuoteError || "Please wait for the price to update before confirming."
        );
        return;
      }

      prepareLockRef.current = true;
      setIsSubmitting(true);
      setSubmitError(null);
      const controller = new AbortController();
      const timeout = window.setTimeout(
        () => controller.abort(),
        BOOKING_TIMEOUT_MS
      );
      try {
        const session = await createBooking(
          {
            carId,
            pickup: formData.rentalInfo.pickup,
            dropoff: formData.rentalInfo.dropoff,
            promoCode: appliedPromo,
            billingName: formData.billingInfo.name,
            billingPhone: formData.billingInfo.phone,
            billingAddress: formData.billingInfo.address,
            billingCity: formData.billingInfo.city,
            agreedToTerms: formData.agreedToTerms,
            agreedToMarketing: formData.agreedToMarketing,
          },
          { signal: controller.signal }
        );
        preparedSignatureRef.current = signature;
        failedSignatureRef.current = null;
        setClientSecret(session.clientSecret);
        // Booking now holds the dates server-side — release the local draft
        clearRentalDraft();
        // Scroll + move focus to the Stripe card form after booking is created
        window.setTimeout(() => {
          const panel = document.querySelector<HTMLElement>("[data-pay-panel]");
          panel?.scrollIntoView({ behavior: "smooth", block: "start" });
          panel?.focus({ preventScroll: true });
        }, 50);
      } catch (err) {
        failedSignatureRef.current = signature;
        const status = err instanceof ApiError ? err.status : undefined;
        if (isAbortError(err)) {
          setSubmitError(
            "Creating your booking took too long. Check your connection and try again — no payment was taken."
          );
        } else if (status === 409) {
          setSubmitError(
            "This car is already booked for the selected dates. Please pick different dates or another car."
          );
        } else if (status === 401) {
          setSubmitError(
            "You need to be signed in to book. Please log in and try again."
          );
        } else if (status === 429) {
          setSubmitError(
            "Too many booking attempts. Wait a moment, then try again."
          );
        } else if (status === 422) {
          setSubmitError(
            apiErrorMessage(err, "Please check the form fields and try again.")
          );
        } else {
          setSubmitError(
            apiErrorMessage(
              err,
              "Something went wrong creating your booking. Please try again."
            )
          );
        }
      } finally {
        window.clearTimeout(timeout);
        prepareLockRef.current = false;
        setIsSubmitting(false);
      }
    },
    [
      selectedCar,
      carId,
      formData,
      appliedPromo,
      canQuote,
      activeQuote,
      activeQuoteError,
      clientSecret,
    ]
  );

  if (isLoading || !user) {
    return <PaymentFallback />;
  }

  if (carLoading) {
    return <PaymentFallback />;
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* DOM-first on mobile: price precedes the confirm/pay stack; lg restores form-left */}
        <div className="w-full lg:order-2 lg:sticky lg:top-6 lg:w-[400px] xl:w-[440px]">
          {selectedCar ? (
            <RentalSummary
              key={selectedCar.id}
              car={selectedCar}
              quote={activeQuote}
              quoteError={activeQuoteError}
              isQuoting={isQuoting}
              disabled={Boolean(clientSecret)}
              promoCode={promoInput}
              isPromoApplied={Boolean(appliedPromo)}
              onPromoCodeChange={handlePromoCodeChange}
              onApplyPromo={handleApplyPromo}
              onRetryQuote={retryQuote}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rental summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {carError ??
                    "Car details not found. Pick a car from the catalogue to see its rental summary."}
                </p>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-3">
                {carError && (
                  <Button type="button" onClick={retryCar}>
                    Try again
                  </Button>
                )}
                <Button asChild variant="outline">
                  <Link href="/explore">Browse cars</Link>
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-6 lg:order-1">
          <BillingInfo
            formData={formData.billingInfo}
            errors={errors}
            disabled={Boolean(clientSecret)}
            onInputChange={(field: string, value: string) =>
              handleInputChange("billingInfo", field, value)
            }
            onBlurField={(field: string) =>
              handleBlurField(`billingInfo.${field}`)
            }
          />
          <RentalInfo
            formData={formData.rentalInfo}
            errors={errors}
            disabled={Boolean(clientSecret)}
            onInputChange={(field: string, value: string) =>
              handleInputChange("rentalInfo", field, value)
            }
            onBlurField={(field: string) =>
              handleBlurField(`rentalInfo.${field}`)
            }
          />
          <PaymentMethods />
          {clientSecret ? (
            <PayPanel
              clientSecret={clientSecret}
              totalLabel={activeQuote ? formatCents(activeQuote.totalCents) : ""}
              onClosed={() => setClientSecret(null)}
            />
          ) : (
            <Confirmation
              formData={formData}
              onCheckboxChange={handleCheckboxChange}
              onSubmit={() => prepareBooking({ manual: true })}
              isSubmitting={isSubmitting}
            />
          )}
          {submitError && (
            <Alert variant="destructive">
              <CircleX aria-hidden="true" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
};

const PaymentFallback = () => (
  <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="w-full lg:order-2 lg:w-[400px]">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-6 lg:order-1">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </div>
);

const MainPage = () => (
  <Suspense fallback={<PaymentFallback />}>
    <PaymentContent />
  </Suspense>
);

export default dynamic(() => Promise.resolve(MainPage), {
  ssr: false,
  loading: () => <PaymentFallback />,
});
