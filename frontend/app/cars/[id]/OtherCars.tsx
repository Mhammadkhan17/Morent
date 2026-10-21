"use client";

import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { formatMoney } from "@/lib/cars-api";
import type { Car } from "@/lib/types";

interface OtherCarsProps {
  cars: Car[];
  currentCarId: string;
}

const OtherCars = ({ cars, currentCarId }: OtherCarsProps) => {
  const list = cars.filter((car) => car.id !== currentCarId);

  if (list.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="other-cars-heading"
      className="mt-12 sm:mt-16"
    >
      <h2 id="other-cars-heading" className="mb-6 text-2xl font-bold">
        Browse other cars
      </h2>

      <Carousel opts={{ align: "start", loop: true }}>
        <CarouselContent>
          {list.map((car) => {
            const meta = car.imageMetadata ?? { width: 600, height: 600 };
            return (
              <CarouselItem
                key={car.id}
                className="basis-[85%] sm:basis-[45%] lg:basis-1/3 xl:basis-1/4"
              >
                <Link
                  href={`/cars/${car.id}`}
                  className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className="flex h-full flex-col overflow-hidden transition-colors group-hover:border-primary/40">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">{car.name}</CardTitle>
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

                    <CardContent className="pb-3">
                      <div className="flex h-32 items-center justify-center">
                        <Image
                          src={car.imageUrl}
                          alt={car.name}
                          width={meta.width}
                          height={meta.height}
                          sizes="(max-width: 640px) 85vw, (max-width: 1024px) 45vw, 25vw"
                          className="h-auto w-full object-contain"
                        />
                      </div>
                    </CardContent>

                    <CardFooter className="mt-auto items-end justify-between gap-2 pt-0">
                      <div>
                        <p className="text-base font-semibold text-primary">
                          {formatMoney(car.pricePerDay)}
                        </p>
                        <p className="text-xs text-muted-foreground">per day</p>
                      </div>
                      <span
                        aria-hidden="true"
                        className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors group-hover:bg-primary/90"
                      >
                        Rent now
                      </span>
                    </CardFooter>
                  </Card>
                </Link>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="-left-3 shadow-none sm:-left-5" />
        <CarouselNext className="-right-3 shadow-none sm:-right-5" />
      </Carousel>
    </section>
  );
};

export default OtherCars;
