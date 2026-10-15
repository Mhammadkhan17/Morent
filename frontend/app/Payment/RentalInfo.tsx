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
  onInputChange: (
    field: `pickup.${keyof PickupDropoffData}` | `dropoff.${keyof PickupDropoffData}`,
    value: string
  ) => void;
}

const RentalInfo = ({ formData, onInputChange }: RentalInfoProps) => {
  const handleChange = (
    type: "pickup" | "dropoff",
    field: keyof PickupDropoffData,
    value: string
  ) => {
    onInputChange(`${type}.${field}`, value);
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
                  <SelectTrigger id={`${type}-location`} className="w-full">
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
              </Field>

              <Field>
                <FieldLabel htmlFor={`${type}-date`}>Date</FieldLabel>
                <Input
                  type="date"
                  id={`${type}-date`}
                  value={formData[type].date}
                  onChange={(event) =>
                    handleChange(type, "date", event.target.value)
                  }
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor={`${type}-time`}>Time</FieldLabel>
                <Input
                  type="time"
                  id={`${type}-time`}
                  value={formData[type].time}
                  onChange={(event) =>
                    handleChange(type, "time", event.target.value)
                  }
                  required
                />
              </Field>
            </FieldGroup>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default RentalInfo;
