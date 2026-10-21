"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveRentalDraft } from "@/lib/rental-draft";
import { cn } from "@/lib/utils";
import { LOCATION_OPTIONS } from "@/lib/locations";

type BookingSide = "pickup" | "dropoff";

interface Fields {
  location: string;
  date: string;
  time: string;
}

interface BookingBlockProps {
  id: string;
  title: string;
  side: BookingSide;
  activeSide: BookingSide;
  fields: Fields;
  errors: Partial<Record<keyof Fields, string>>;
  onActivate: (side: BookingSide) => void;
  onFieldsChange: (fields: Fields) => void;
}

const BookingBlock = ({
  id,
  title,
  side,
  activeSide,
  fields,
  errors,
  onActivate,
  onFieldsChange,
}: BookingBlockProps) => {
  const isActive = activeSide === side;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border p-4 transition-colors sm:p-5",
        isActive ? "border-primary/50 bg-primary/5" : "border-border bg-card"
      )}
    >
      <RadioGroup
        value={activeSide}
        onValueChange={(value) => onActivate(value as BookingSide)}
        className="flex items-center gap-2"
      >
        <RadioGroupItem
          value={side}
          id={`${id}-side`}
          aria-label={`Edit ${title} details`}
        />
        <FieldLabel
          htmlFor={`${id}-side`}
          className="text-sm font-semibold text-foreground"
        >
          {title}
        </FieldLabel>
      </RadioGroup>

      <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field>
          <FieldLabel htmlFor={`${id}-location`}>Locations</FieldLabel>
          <Select
            value={fields.location}
            onValueChange={(value) =>
              onFieldsChange({ ...fields, location: value })
            }
          >
            <SelectTrigger
              id={`${id}-location`}
              className="w-full"
              aria-invalid={errors.location ? true : undefined}
            >
              <SelectValue placeholder="Select location" />
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
          {errors.location && (
            <p className="text-xs text-destructive" role="alert">
              {errors.location}
            </p>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor={`${id}-date`}>Date</FieldLabel>
          <Input
            id={`${id}-date`}
            type="date"
            value={fields.date}
            aria-invalid={errors.date ? true : undefined}
            onChange={(event) =>
              onFieldsChange({ ...fields, date: event.target.value })
            }
          />
          {errors.date && (
            <p className="text-xs text-destructive" role="alert">
              {errors.date}
            </p>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor={`${id}-time`}>Time</FieldLabel>
          <Input
            id={`${id}-time`}
            type="time"
            value={fields.time}
            aria-invalid={errors.time ? true : undefined}
            onChange={(event) =>
              onFieldsChange({ ...fields, time: event.target.value })
            }
          />
          {errors.time && (
            <p className="text-xs text-destructive" role="alert">
              {errors.time}
            </p>
          )}
        </Field>
      </FieldGroup>
    </div>
  );
};

const emptyFields: Fields = { location: "", date: "", time: "" };

type SideKey = "pickup" | "dropoff";
type FieldKey = keyof Fields;
type ErrorMap = Partial<Record<`${SideKey}.${FieldKey}`, string>>;

const validate = (
  pickup: Fields,
  dropoff: Fields,
): ErrorMap => {
  const errors: ErrorMap = {};
  for (const [sideKey, fields] of [
    ["pickup", pickup],
    ["dropoff", dropoff],
  ] as const) {
    const label = sideKey === "pickup" ? "Pick-up" : "Drop-off";
    if (!fields.location) errors[`${sideKey}.location`] = `${label} location required`;
    if (!fields.date) errors[`${sideKey}.date`] = `${label} date required`;
    if (!fields.time) errors[`${sideKey}.time`] = `${label} time required`;
  }
  return errors;
};

const PickUpSection = () => {
  const router = useRouter();
  const [activeSide, setActiveSide] = useState<BookingSide>("pickup");
  const [pickup, setPickup] = useState<Fields>(emptyFields);
  const [dropoff, setDropoff] = useState<Fields>(emptyFields);
  const [errors, setErrors] = useState<ErrorMap>({});

  const swap = () => {
    setPickup(dropoff);
    setDropoff(pickup);
  };

  const sideErrors = (side: SideKey): Partial<Record<FieldKey, string>> => ({
    location: errors[`${side}.location`],
    date: errors[`${side}.date`],
    time: errors[`${side}.time`],
  });

  const handleSubmit = () => {
    const nextErrors = validate(pickup, dropoff);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    saveRentalDraft({ pickup, dropoff });
    router.push("/explore");
  };

  return (
    <section
      aria-label="Booking details"
      className="mt-10 rounded-xl border bg-card p-4 sm:p-6"
    >
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-6">
        <BookingBlock
          id="pickup"
          title="Pick-Up"
          side="pickup"
          activeSide={activeSide}
          fields={pickup}
          errors={sideErrors("pickup")}
          onActivate={setActiveSide}
          onFieldsChange={setPickup}
        />

        <div className="flex justify-center">
          <Button
            size="icon"
            aria-label="Swap pick-up and drop-off details"
            onClick={swap}
            className="size-12"
          >
            <ArrowUpDown />
          </Button>
        </div>

        <BookingBlock
          id="dropoff"
          title="Drop-Off"
          side="dropoff"
          activeSide={activeSide}
          fields={dropoff}
          errors={sideErrors("dropoff")}
          onActivate={setActiveSide}
          onFieldsChange={setDropoff}
        />
      </div>

      <div className="mt-5 flex justify-end">
        <Button onClick={handleSubmit}>Search cars</Button>
      </div>
    </section>
  );
};

export default PickUpSection;
