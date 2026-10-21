"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CarCard } from "@/app/components/CatalogueCar";
import { Card, CardContent } from "@/components/ui/card";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { fetchCars, formatMoney } from "@/lib/cars-api";
import {
  filterCars,
  parseSeats,
  type CapacityFilter,
} from "@/lib/explore-filter";
import type { Car } from "@/lib/types";

const TYPE_OPTIONS = [
  "Sport",
  "SUV",
  "MPV",
  "Sedan",
  "Coupe",
  "Hatchback",
] as const;

const TRANSMISSION_OPTIONS = ["Automatic", "Manual"] as const;

const CAPACITY_OPTIONS = [
  { value: "2", label: "2 Person" },
  { value: "4", label: "4 Person" },
  { value: "6", label: "6 Person" },
  { value: "8+", label: "8 or more" },
] as const;

const ExploreClient = () => {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();
  const [cars, setCars] = useState<Car[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [type, setType] = useState("all");
  const [transmission, setTransmission] = useState("all");
  const [capacity, setCapacity] = useState<CapacityFilter>("all");
  const [maxPrice, setMaxPrice] = useState(1000);

  useEffect(() => {
    let cancelled = false;
    fetchCars()
      .then((data) => {
        if (cancelled) return;
        setCars(data);
        const prices = data.map((car) => car.pricePerDay);
        setMaxPrice(Math.max(...prices, 1));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Failed to load cars"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const priceBounds = useMemo(() => {
    if (cars.length === 0) return { min: 0, max: 1000 };
    const prices = cars.map((car) => car.pricePerDay);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [cars]);

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
  }, [cars]);

  const filtered = useMemo(
    () =>
      filterCars(cars, {
        query,
        type,
        transmission,
        capacity,
        maxPrice,
      }),
    [cars, type, transmission, capacity, maxPrice, query]
  );

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold">Explore cars</h1>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="mb-4 h-40 w-full" />
                <Skeleton className="mb-2 h-5 w-32" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold">Explore cars</h1>
        <Card>
          <CardContent className="p-10 text-center text-destructive">
            {loadError}
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <FieldLegend>Transmission</FieldLegend>
              <RadioGroup
                value={transmission}
                onValueChange={setTransmission}
                className="gap-3"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="all" id="transmission-all" />
                  <Label htmlFor="transmission-all" className="font-normal">
                    All
                  </Label>
                </div>
                {TRANSMISSION_OPTIONS.map((option) => (
                  <div key={option} className="flex items-center gap-2">
                    <RadioGroupItem
                      value={option}
                      id={`transmission-${option}`}
                    />
                    <Label
                      htmlFor={`transmission-${option}`}
                      className="font-normal"
                    >
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
                  {formatMoney(maxPrice)}
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
                <span>{formatMoney(priceBounds.min)}</span>
                <span>{formatMoney(priceBounds.max)}</span>
              </div>
            </FieldSet>
          </CardContent>
        </Card>

        <div>
          <p className="mb-4 text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "car" : "cars"} available
            {query ? (
              <>
                {" "}
                for &ldquo;{query}&rdquo;{" "}
                <Link
                  href="/explore"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Clear search
                </Link>
              </>
            ) : null}
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
                <CarCard key={car.id} car={car} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExploreClient;
