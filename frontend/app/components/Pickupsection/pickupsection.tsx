"use client";

import { useState } from "react";
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
  onActivate: (side: BookingSide) => void;
  onFieldsChange: (fields: Fields) => void;
}

const BookingBlock = ({
  id,
  title,
  side,
  activeSide,
  fields,
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
            <SelectTrigger id={`${id}-location`} className="w-full">
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
        </Field>

        <Field>
          <FieldLabel htmlFor={`${id}-date`}>Date</FieldLabel>
          <Input
            id={`${id}-date`}
            type="date"
            value={fields.date}
            onChange={(event) =>
              onFieldsChange({ ...fields, date: event.target.value })
            }
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={`${id}-time`}>Time</FieldLabel>
          <Input
            id={`${id}-time`}
            type="time"
            value={fields.time}
            onChange={(event) =>
              onFieldsChange({ ...fields, time: event.target.value })
            }
          />
        </Field>
      </FieldGroup>
    </div>
  );
};

const emptyFields: Fields = { location: "", date: "", time: "" };

const PickUpSection = () => {
  const [activeSide, setActiveSide] = useState<BookingSide>("pickup");
  const [pickup, setPickup] = useState<Fields>(emptyFields);
  const [dropoff, setDropoff] = useState<Fields>(emptyFields);

  const swap = () => {
    setPickup(dropoff);
    setDropoff(pickup);
  };

  return (
    <section
      aria-label="Booking details"
      className="mt-10 rounded-2xl border bg-card p-4 sm:p-6"
    >
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-6">
        <BookingBlock
          id="pickup"
          title="Pick-Up"
          side="pickup"
          activeSide={activeSide}
          fields={pickup}
          onActivate={setActiveSide}
          onFieldsChange={setPickup}
        />

        <div className="flex justify-center">
          <Button
            size="icon"
            aria-label="Swap pick-up and drop-off details"
            onClick={swap}
            className="size-12 rounded-xl"
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
          onActivate={setActiveSide}
          onFieldsChange={setDropoff}
        />
      </div>
    </section>
  );
};

export default PickUpSection;
