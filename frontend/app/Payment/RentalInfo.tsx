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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LOCATION_OPTIONS } from "@/lib/locations";
import { cn } from "@/lib/utils";
import { todayISO, type FieldErrors } from "./validation";

interface PickupDropoffData {
  date: string;
  location: string;
  time: string;
}

interface RentalInfoProps {
  formData: {
    pickup: PickupDropoffData;
    dropoff: PickupDropoffData;
  };
  errors: FieldErrors;
  /** Locked while a Stripe checkout session is open (see PayPanel). */
  disabled?: boolean;
  onInputChange: (
    field: `pickup.${keyof PickupDropoffData}` | `dropoff.${keyof PickupDropoffData}`,
    value: string
  ) => void;
  onBlurField: (
    field: `pickup.${keyof PickupDropoffData}` | `dropoff.${keyof PickupDropoffData}`
  ) => void;
}

const RentalInfo = ({
  formData,
  errors,
  disabled = false,
  onInputChange,
  onBlurField,
}: RentalInfoProps) => {
  const handleChange = (
    type: "pickup" | "dropoff",
    field: keyof PickupDropoffData,
    value: string
  ) => {
    onInputChange(`${type}.${field}`, value);
  };

  const renderError = (type: "pickup" | "dropoff", field: keyof PickupDropoffData) => {
    const error = errors[`rentalInfo.${type}.${field}`];
    if (!error) return null;
    return (
      <p
        id={`${type}-${field}-error`}
        role="alert"
        className="text-sm text-destructive"
      >
        {error}
      </p>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">Rental Info</CardTitle>
            <CardDescription>
              Please select your rental details
            </CardDescription>
          </div>
          <Badge variant="secondary">Step 2 of 4</Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-8">
        {(["pickup", "dropoff"] as const).map((type) => (
          <div key={type}>
            <h3 className="mb-4 text-base font-semibold capitalize">
              {type} Details
            </h3>
            <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field>
                <FieldLabel htmlFor={`${type}-location`}>Location</FieldLabel>
                <Select
                  value={formData[type].location}
                  onValueChange={(value) => handleChange(type, "location", value)}
                >
                  <SelectTrigger
                    id={`${type}-location`}
                    disabled={disabled}
                    className={cn(
                      "w-full",
                      errors[`rentalInfo.${type}.location`] && "border-destructive"
                    )}
                    onBlur={() => onBlurField(`${type}.location`)}
                    aria-invalid={
                      errors[`rentalInfo.${type}.location`] ? true : undefined
                    }
                    aria-describedby={
                      errors[`rentalInfo.${type}.location`]
                        ? `${type}-location-error`
                        : undefined
                    }
                  >
                    <SelectValue placeholder="Select your city" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {LOCATION_OPTIONS.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {renderError(type, "location")}
              </Field>

              <Field>
                <FieldLabel htmlFor={`${type}-date`}>Date</FieldLabel>
                <Input
                  type="date"
                  id={`${type}-date`}
                  value={formData[type].date}
                  min={
                    type === "pickup" || formData.pickup.date < todayISO()
                      ? todayISO()
                      : formData.pickup.date
                  }
                  disabled={disabled}
                  onChange={(event) =>
                    handleChange(type, "date", event.target.value)
                  }
                  onBlur={() => onBlurField(`${type}.date`)}
                  aria-invalid={
                    errors[`rentalInfo.${type}.date`] ? true : undefined
                  }
                  aria-describedby={
                    errors[`rentalInfo.${type}.date`]
                      ? `${type}-date-error`
                      : undefined
                  }
                  className={cn(
                    errors[`rentalInfo.${type}.date`] && "border-destructive"
                  )}
                  required
                />
                {renderError(type, "date")}
              </Field>

              <Field>
                <FieldLabel htmlFor={`${type}-time`}>Time</FieldLabel>
                <Input
                  type="time"
                  id={`${type}-time`}
                  value={formData[type].time}
                  disabled={disabled}
                  onChange={(event) =>
                    handleChange(type, "time", event.target.value)
                  }
                  onBlur={() => onBlurField(`${type}.time`)}
                  aria-invalid={
                    errors[`rentalInfo.${type}.time`] ? true : undefined
                  }
                  aria-describedby={
                    errors[`rentalInfo.${type}.time`]
                      ? `${type}-time-error`
                      : undefined
                  }
                  className={cn(
                    errors[`rentalInfo.${type}.time`] && "border-destructive"
                  )}
                  required
                />
                {renderError(type, "time")}
              </Field>
            </FieldGroup>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default RentalInfo;
