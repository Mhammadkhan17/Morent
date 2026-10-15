"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

const PaymentMethods = ({ onPaymentChange }) => {
  const [paymentMethod, setPaymentMethod] = useState("credit-card");
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    expirationDate: "",
    cardHolder: "",
    cvc: "",
  });

  // Notify parent component when payment method or card details change
  useEffect(() => {
    if (onPaymentChange) {
      onPaymentChange({
        method: paymentMethod,
        cardDetails: paymentMethod === "credit-card" ? cardDetails : {},
      });
    }
  }, [paymentMethod, cardDetails, onPaymentChange]);

  const handlePaymentMethodChange = (value) => {
    setPaymentMethod(value);

    // Clear card details when switching away from credit card
    if (value !== "credit-card") {
      setCardDetails({
        cardNumber: "",
        expirationDate: "",
        cardHolder: "",
        cvc: "",
      });
    }
  };

  const handleCardDetailsChange = (e) => {
    const { id, value } = e.target;
    setCardDetails((prevState) => ({
      ...prevState,
      [id]: value,
    }));
  };

  const methods = [
    {
      id: "credit-card",
      label: "Credit Card",
      logos: [
        {
          src: "/asset/Payment-Logo/visa-com-logo.png",
          alt: "Visa",
          width: 36,
          height: 36,
        },
        {
          src: "/asset/Payment-Logo/mastercard-com-logo.png",
          alt: "Mastercard",
          width: 36,
          height: 36,
        },
      ],
    },
    {
      id: "paypal",
      label: "PayPal",
      logos: [
        {
          src: "/asset/Payment-Logo/paypal-com-logo.png",
          alt: "PayPal",
          width: 36,
          height: 36,
        },
      ],
    },
    {
      id: "bitcoin",
      label: "Bitcoin",
      logos: [
        {
          src: "/asset/Payment-Logo/bitcoin-org-logo.png",
          alt: "Bitcoin",
          width: 36,
          height: 36,
        },
      ],
    },
  ];

  const cardFields = [
    { id: "cardNumber", label: "Card Number", placeholder: "Card number" },
    { id: "expirationDate", label: "Expiration Date", placeholder: "MM / YY" },
    { id: "cardHolder", label: "Card Holder", placeholder: "Card holder" },
    { id: "cvc", label: "CVC", placeholder: "CVC" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">Payment Method</CardTitle>
            <CardDescription>
              Please select and enter your payment details
            </CardDescription>
          </div>
          <Badge variant="secondary">Step 3 of 4</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <form>
          <RadioGroup
            value={paymentMethod}
            onValueChange={handlePaymentMethodChange}
            aria-label="Payment method"
            className="flex flex-col gap-3"
          >
            {methods.map(({ id, label, logos }) => (
              <div key={id}>
                <label
                  htmlFor={`pay-${id}`}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-4 transition-colors",
                    paymentMethod === id
                      ? "border-primary/50 bg-primary/5"
                      : "border-border hover:bg-accent/50"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <RadioGroupItem value={id} id={`pay-${id}`} />
                    <span className="text-sm font-medium">{label}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    {logos.map((logo) => (
                      <Image
                        key={logo.alt}
                        src={logo.src}
                        alt={logo.alt}
                        width={logo.width}
                        height={logo.height}
                        className="h-9 w-9 rounded-md object-contain"
                      />
                    ))}
                  </span>
                </label>

                {id === "credit-card" && paymentMethod === "credit-card" && (
                  <div className="mt-3 grid grid-cols-1 gap-4 rounded-lg bg-muted p-4 sm:grid-cols-2">
                    {cardFields.map((field) => (
                      <Field key={field.id}>
                        <FieldLabel htmlFor={field.id}>
                          {field.label}
                        </FieldLabel>
                        <Input
                          type="text"
                          id={field.id}
                          value={cardDetails[field.id]}
                          onChange={handleCardDetailsChange}
                          placeholder={field.placeholder}
                          required
                        />
                      </Field>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </RadioGroup>
        </form>
      </CardContent>
    </Card>
  );
};

export default PaymentMethods;
