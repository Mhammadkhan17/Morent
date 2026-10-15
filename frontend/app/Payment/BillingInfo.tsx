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

interface BillingInfoProps {
  formData: {
    name: string;
    phone: string;
    address: string;
    city: string;
  };
  onInputChange: (field: string, value: string) => void;
}

const BillingInfo = ({ formData, onInputChange }: BillingInfoProps) => {
  const fields = [
    { key: "name", label: "Name", type: "text", placeholder: "Your name" },
    {
      key: "phone",
      label: "Phone Number",
      type: "tel",
      placeholder: "Phone number",
    },
    {
      key: "address",
      label: "Address",
      type: "text",
      placeholder: "Address",
    },
    {
      key: "city",
      label: "Town / City",
      type: "text",
      placeholder: "Town or city",
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
            {fields.map(({ key, label, type, placeholder }) => (
              <Field key={key}>
                <FieldLabel htmlFor={`billing-${key}`}>{label}</FieldLabel>
                <Input
                  type={type}
                  id={`billing-${key}`}
                  name={key}
                  placeholder={placeholder}
                  value={formData[key] || ""}
                  onChange={(event) => onInputChange(key, event.target.value)}
                  required
                />
              </Field>
            ))}
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};

export default BillingInfo;
