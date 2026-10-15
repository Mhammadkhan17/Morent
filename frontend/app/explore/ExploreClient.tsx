"use client";

import { useMemo, useState } from "react";
import { cars } from "@/lib/cars";
import { CarCard } from "@/app/components/CatalogueCar";
import { Card, CardContent } from "@/components/ui/card";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";

const parsePrice = (value: string) =>
  Number.parseFloat(value.replace(/[^0-9.]/g, "")) || 0;

const parseSeats = (value: string) => Number.parseInt(value, 10) || 0;

const TYPE_OPTIONS = [
  "Sport",
  "SUV",
  "MPV",
  "Sedan",
  "Coupe",
  "Hatchback",
] as const;

const CAPACITY_OPTIONS = [
  { value: "2", label: "2 Person" },
  { value: "4", label: "4 Person" },
  { value: "6", label: "6 Person" },
  { value: "8+", label: "8 or more" },
] as const;

type CapacityFilter = "all" | "2" | "4" | "6" | "8+";

const ExploreClient = () => {
  const [type, setType] = useState("all");
  const [capacity, setCapacity] = useState<CapacityFilter>("all");

  const priceBounds = useMemo(() => {
    const prices = cars.map((car) => parsePrice(car.pricePerDay));
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, []);
  const [maxPrice, setMaxPrice] = useState(priceBounds.max);

  const capacityCounts = useMemo(() => {
    const counts: Record<string, number> = { "2": 0, "4": 0, "6": 0, "8+": 0 };
    for (const car of cars) {
      const seats = parseSeats(car.seatingCapacity);
      if (seats === 2) counts["2"] += 1;
      else if (seats === 4) counts["4"] += 1;
      else if (seats === 6) counts["6"] += 1;
      else if (seats >= 8) counts["8+"] += 1;
    }
    return counts;
  }, []);

  const filtered = useMemo(
    () =>
      cars.filter((car) => {
        const seats = parseSeats(car.seatingCapacity);
        const price = parsePrice(car.pricePerDay);
        const typeOk = type === "all" || car.type === type;
        const capacityOk =
          capacity === "all" ||
          (capacity === "8+" ? seats >= 8 : seats === Number(capacity));
        return typeOk && capacityOk && price <= maxPrice;
      }),
    [type, capacity, maxPrice]
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold">Explore cars</h1>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="lg:sticky lg:top-6">
          <CardContent className="flex flex-col gap-8 p-6">
            <FieldSet>
              <FieldLegend>Type</FieldLegend>
              <RadioGroup
                value={type}
                onValueChange={setType}
                className="gap-3"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="all" id="type-all" />
                  <Label htmlFor="type-all" className="font-normal">
                    All
                  </Label>
                </div>
                {TYPE_OPTIONS.map((option) => (
                  <div key={option} className="flex items-center gap-2">
                    <RadioGroupItem value={option} id={`type-${option}`} />
                    <Label htmlFor={`type-${option}`} className="font-normal">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Capacity</FieldLegend>
              <RadioGroup
                value={capacity}
                onValueChange={(value) => setCapacity(value as CapacityFilter)}
                className="gap-3"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="all" id="cap-all" />
                  <Label htmlFor="cap-all" className="font-normal">
                    All ({cars.length})
                  </Label>
                </div>
                {CAPACITY_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <RadioGroupItem
                      value={option.value}
                      id={`cap-${option.value}`}
                    />
                    <Label
                      htmlFor={`cap-${option.value}`}
                      className="font-normal"
                    >
                      {option.label} ({capacityCounts[option.value]})
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend className="flex w-full items-center justify-between">
                <span>Price</span>
                <span className="text-sm font-semibold text-primary">
                  ${maxPrice}
                </span>
              </FieldLegend>
              <Slider
                value={[maxPrice]}
                min={priceBounds.min}
                max={priceBounds.max}
                step={1}
                onValueChange={(value) => setMaxPrice(value[0])}
                aria-label="Maximum price per day"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>${priceBounds.min}</span>
                <span>${priceBounds.max}</span>
              </div>
            </FieldSet>
          </CardContent>
        </Card>

        <div>
          <p className="mb-4 text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "car" : "cars"} available
          </p>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                No cars match these filters.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((car) => (
                <CarCard key={car._id} car={car} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExploreClient;
