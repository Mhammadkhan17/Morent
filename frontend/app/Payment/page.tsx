"use client";
import React, { useState, useCallback, Suspense } from "react";
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
import { getCarById } from "@/lib/cars";

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
  paymentMethod: {
    method: string;
    cardDetails: {
      cardNumber: string;
      expirationDate: string;
      cardHolder: string;
      cvc: string;
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
  const selectedCar = carId ? getCarById(carId) ?? null : null;
  const [confirmationMessage, setConfirmationMessage] = useState("");

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
    paymentMethod: {
      method: "",
      cardDetails: {
        cardNumber: "",
        expirationDate: "",
        cardHolder: "",
        cvc: "",
      },
    },
    agreedToMarketing: false,
    agreedToTerms: false,
  });

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
  };

  const handleCheckboxChange = (field: keyof FormData, value: boolean) => {
    setFormData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
  };

  const handlePaymentChange = useCallback(
    (data: {
      method: string;
      cardDetails?: {
        cardNumber: string;
        expirationDate: string;
        cardHolder: string;
        cvc: string;
      };
    }) => {
      setFormData((prevData) => ({
        ...prevData,
        paymentMethod: {
          method: data.method,
          cardDetails:
            data.method === "credit-card" && data.cardDetails
              ? data.cardDetails
              : prevData.paymentMethod.cardDetails,
        },
      }));
    },
    []
  );

  const handleSubmit = async () => {
    if (!selectedCar) {
      setConfirmationMessage(
        "Please go back and select a car before confirming."
      );
      return;
    }

    try {
      const response = await fetch("/api/saveRentalData", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          carDetails: selectedCar,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      setConfirmationMessage(
        response.ok
          ? "Your rental has been confirmed!"
          : "Something went wrong, please try again."
      );
    } catch (error) {
      console.error("Error:", error);
      setConfirmationMessage("Something went wrong, please try again.");
    }
  };

  const messageIsSuccess = confirmationMessage === "Your rental has been confirmed!";

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
          <PaymentMethods onPaymentChange={handlePaymentChange} />
          <Confirmation
            formData={formData}
            onCheckboxChange={handleCheckboxChange}
            onSubmit={handleSubmit}
          />
        </div>

        <div className="w-full lg:sticky lg:top-6 lg:w-[400px] xl:w-[440px]">
          {selectedCar ? (
            <RentalSummary key={selectedCar._id} car={selectedCar} />
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

      {confirmationMessage && (
        <Alert className="mt-6" variant={messageIsSuccess ? "default" : "destructive"}>
          {messageIsSuccess ? (
            <CircleCheck aria-hidden="true" />
          ) : (
            <CircleX aria-hidden="true" />
          )}
          <AlertDescription>{confirmationMessage}</AlertDescription>
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
