"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { CircleCheck, CircleX } from "lucide-react";
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
import type { Car, Quote } from "@/lib/types";
import { useAuth } from "@/lib/AuthProvider";
import { ApiError } from "@/lib/api";
import {
  FIELD_ORDER,
  fieldElementId,
  validateField,
  validateForm,
  type FieldErrors,
  type FieldPath,
} from "./validation";

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
  const [statusMessage, setStatusMessage] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");
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

  const [formData, setFormData] = useState<FormData>({
    billingInfo: {
      name: "",
      phone: "",
      address: "",
      city: "",
    },
    rentalInfo: {
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
  });

  useEffect(() => {
    if (!carId) return;
    let cancelled = false;
    fetchCar(carId)
      .then((car) => {
        if (!cancelled) setSelectedCar(car);
      })
      .catch(() => {
        if (!cancelled) setSelectedCar(null);
      })
      .finally(() => {
        if (!cancelled) setCarLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [carId]);

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
    const timer = window.setTimeout(async () => {
      setIsQuoting(true);
      setQuoteError("");
      try {
        const result = await fetchQuote({
          carId,
          pickup: formData.rentalInfo.pickup,
          dropoff: formData.rentalInfo.dropoff,
          promoCode: appliedPromo,
        });
        if (!cancelled) setQuote(result);
      } catch (err) {
        if (!cancelled) {
          setQuote(null);
          if (err instanceof ApiError && Array.isArray(err.message)) {
            setQuoteError("Invalid quote request");
          } else {
            setQuoteError(
              err instanceof ApiError ? String(err.message) : "Quote failed"
            );
          }
        }
      } finally {
        if (!cancelled) setIsQuoting(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [carId, formData.rentalInfo, appliedPromo, canQuote]);

  const activeQuote = canQuote ? quote : null;
  const activeQuoteError = canQuote ? quoteError : "";

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
        setStatusMessage(
          "Please go back and select a car before confirming."
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
      try {
        const session = await createBooking({
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
        });
        preparedSignatureRef.current = signature;
        failedSignatureRef.current = null;
        setClientSecret(session.clientSecret);
        // Scroll Stripe card form into view after booking is created
        window.setTimeout(() => {
          document
            .querySelector("[data-pay-panel]")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      } catch (err) {
        failedSignatureRef.current = signature;
        if (err instanceof ApiError && err.status === 409) {
          setSubmitError(
            "This car is already booked for the selected dates. Please pick different dates or another car."
          );
        } else if (err instanceof ApiError && err.status === 401) {
          setSubmitError(
            "You need to be signed in to book. Please log in and try again."
          );
        } else if (err instanceof ApiError && err.status === 422) {
          setSubmitError(
            typeof err.message === "string"
              ? err.message
              : "Please check the form fields and try again."
          );
        } else {
          setSubmitError("Something went wrong creating your booking. Please try again.");
        }
      } finally {
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

  const messageIsSuccess =
    statusMessage === "Your rental has been confirmed!";

  if (isLoading || !user) {
    return <PaymentFallback />;
  }

  if (carLoading) {
    return <PaymentFallback />;
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <BillingInfo
            formData={formData.billingInfo}
            errors={errors}
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

        <div className="w-full lg:sticky lg:top-6 lg:w-[400px] xl:w-[440px]">
          {selectedCar ? (
            <RentalSummary
              key={selectedCar.id}
              car={selectedCar}
              quote={activeQuote}
              quoteError={activeQuoteError}
              isQuoting={isQuoting}
              promoCode={promoInput}
              isPromoApplied={Boolean(appliedPromo)}
              onPromoCodeChange={handlePromoCodeChange}
              onApplyPromo={handleApplyPromo}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rental summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Car details not found. Pick a car from the catalogue to see
                  its rental summary.
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link href="/">Browse cars</Link>
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>

      {statusMessage && (
        <Alert
          className="mt-6"
          variant={messageIsSuccess ? "default" : "destructive"}
        >
          {messageIsSuccess ? (
            <CircleCheck aria-hidden="true" />
          ) : (
            <CircleX aria-hidden="true" />
          )}
          <AlertDescription>{statusMessage}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

const PaymentFallback = () => (
  <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
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
      <div className="w-full lg:w-[400px]">
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
