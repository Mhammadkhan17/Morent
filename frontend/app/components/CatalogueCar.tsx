"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Cog, Fuel, Star, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/cars-api";
import { cn } from "@/lib/utils";
import type { Car } from "@/lib/types";

interface CatalogueCarProps {
  cars: Car[];
  tag: string;
  maxVisible: number;
}

export const CarCard = ({ car }: { car: Car }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const meta = car.imageMetadata ?? { width: 600, height: 600 };

  return (
    <Link
      href={`/cars/${car.id}`}
      className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="flex h-full flex-col overflow-hidden transition-colors group-hover:border-primary/40">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg">{car.name}</CardTitle>
            {car.rating != null && (
              <Badge variant="secondary" className="gap-1">
                <Star
                  aria-hidden="true"
                  className="size-3 fill-current text-primary"
                />
                {car.rating.toFixed(1)}
              </Badge>
            )}
          </div>
          <CardDescription>{car.type}</CardDescription>
        </CardHeader>

        <CardContent className="pb-4">
          <div className="relative flex h-40 items-center justify-center">
            {!imageLoaded && (
              <Skeleton className="absolute inset-x-6 inset-y-2 rounded-lg" />
            )}
            <Image
              src={car.imageUrl}
              alt={car.name}
              width={meta.width}
              height={meta.height}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              loading="eager"
              onLoad={() => setImageLoaded(true)}
              className={cn(
                "relative h-auto w-full object-contain transition-opacity duration-300",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Fuel aria-hidden="true" className="size-4 shrink-0" />
              {car.fuelCapacity}
            </span>
            <span className="flex items-center gap-1.5">
              <Cog aria-hidden="true" className="size-4 shrink-0" />
              {car.transmission}
            </span>
            <span className="flex items-center gap-1.5">
              <Users aria-hidden="true" className="size-4 shrink-0" />
              {car.seatingCapacity}
            </span>
          </div>
        </CardContent>

        <CardFooter className="mt-auto items-end justify-between gap-2 pt-0">
          <div>
            <p className="text-lg font-semibold text-primary">
              {formatMoney(car.pricePerDay)}
            </p>
            <p className="text-xs text-muted-foreground">per day</p>
          </div>
          <span className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors group-hover:bg-primary/90">
            Rent now
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
};

const CatalogueCar = ({ cars, tag, maxVisible }: CatalogueCarProps) => {
  const [visibleCount, setVisibleCount] = useState(maxVisible);

  const filteredCars = cars.filter((car) =>
    car.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
  );

  const handleShowMore = () => {
    setVisibleCount((prev) => prev + maxVisible);
  };

  return (
    <section id={tag} className="mb-12 scroll-mt-6">
      <h2 className="mb-5 text-2xl font-bold capitalize">{tag} cars</h2>

      {filteredCars.length === 0 ? (
        <p className="text-muted-foreground">
          No cars available for this category.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCars.slice(0, visibleCount).map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>

          {visibleCount < filteredCars.length && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={handleShowMore}>
                Show more
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default CatalogueCar;
