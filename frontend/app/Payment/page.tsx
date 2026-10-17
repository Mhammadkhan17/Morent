"use client";
import React, { useEffect, useMemo, useState, Suspense } from "react";
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
  const { user, isLoading } = useAuth();

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
    // Priced field change invalidates any open checkout session
    setClientSecret(null);
  };

  const handleCheckboxChange = (field: keyof FormData, value: boolean) => {
    setFormData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
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

  const handleSubmit = async () => {
    if (!selectedCar || !carId) {
      setStatusMessage(
        "Please go back and select a car before confirming."
      );
      return;
    }
    if (!canQuote || !activeQuote) {
      setSubmitError(
        "Please fill in pickup and dropoff details before confirming."
      );
      return;
    }

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
      setClientSecret(session.clientSecret);
      // Scroll Stripe card form into view after booking is created
      window.setTimeout(() => {
        document
          .querySelector("[data-pay-panel]")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (err) {
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
      setIsSubmitting(false);
    }
  };

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
            onInputChange={(field: string, value: string) =>
              handleInputChange("billingInfo", field, value)
            }
          />
          <RentalInfo
            formData={formData.rentalInfo}
            onInputChange={(field: string, value: string) =>
              handleInputChange("rentalInfo", field, value)
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
              onSubmit={handleSubmit}
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
