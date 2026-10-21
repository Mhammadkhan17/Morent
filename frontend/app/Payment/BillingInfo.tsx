"use client";
import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LIMITS, type FieldErrors } from "./validation";

interface BillingInfoProps {
  formData: {
    name: string;
    phone: string;
    address: string;
    city: string;
  };
  errors: FieldErrors;
  /** Locked while a Stripe checkout session is open (see PayPanel). */
  disabled?: boolean;
  onInputChange: (field: string, value: string) => void;
  onBlurField: (field: string) => void;
}

const BillingInfo = ({
  formData,
  errors,
  disabled = false,
  onInputChange,
  onBlurField,
}: BillingInfoProps) => {
  const fields = [
    {
      key: "name",
      label: "Name",
      type: "text",
      placeholder: "Your name",
      autoComplete: "name",
      maxLength: LIMITS.name,
    },
    {
      key: "phone",
      label: "Phone Number",
      type: "tel",
      placeholder: "Phone number",
      autoComplete: "tel",
      maxLength: LIMITS.phone,
    },
    {
      key: "address",
      label: "Address",
      type: "text",
      placeholder: "Address",
      autoComplete: "street-address",
      maxLength: LIMITS.address,
    },
    {
      key: "city",
      label: "Town / City",
      type: "text",
      placeholder: "Town or city",
      autoComplete: "address-level2",
      maxLength: LIMITS.city,
    },
  ] as const;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">Billing Info</CardTitle>
            <CardDescription>Please enter your billing info</CardDescription>
          </div>
          <Badge variant="secondary">Step 1 of 4</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <form>
          <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            {fields.map(({ key, label, type, placeholder, autoComplete, maxLength }) => {
              const error = errors[`billingInfo.${key}`];
              const errorId = `billing-${key}-error`;
              return (
                <Field key={key}>
                  <FieldLabel htmlFor={`billing-${key}`}>{label}</FieldLabel>
                  <Input
                    type={type}
                    id={`billing-${key}`}
                    name={key}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    maxLength={maxLength}
                    value={formData[key] || ""}
                    onChange={(event) => onInputChange(key, event.target.value)}
                    onBlur={() => onBlurField(key)}
                    disabled={disabled}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    className={cn(error && "border-destructive")}
                    required
                  />
                  {error && (
                    <p
                      id={errorId}
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {error}
                    </p>
                  )}
                </Field>
              );
            })}
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};

export default BillingInfo;
