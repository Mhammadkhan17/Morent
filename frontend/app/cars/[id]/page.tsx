"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Car, ChevronLeft, ChevronRight, Fuel, Gauge, Heart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { cars } from "@/lib/cars";
import { cn } from "@/lib/utils";
import LeftBackgroundImage from "@/app/components/TopSection/LeftBackgroundImage";
import { RatingStars } from "./rating-stars";
import Reviews from "./Reviews";
import OtherCars from "./OtherCars";

const features = [
  { label: "Type Car", key: "type" as const, Icon: Car },
  { label: "Capacity", key: "seatingCapacity" as const, Icon: Users },
  { label: "Steering", key: "transmission" as const, Icon: Gauge },
  { label: "Gasoline", key: "fuelCapacity" as const, Icon: Fuel },
];

const CarDetailsPage = () => {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const car = cars.find((c) => c._id === id) ?? null;
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeImage, setActiveImage] = useState<{
    carId: string;
    index: number;
  }>({ carId: "", index: 0 });

  if (!car) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-xl">Car not found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The car you are looking for does not exist or was removed.
            </p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button asChild>
              <Link href="/">Back to home</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const activeIndex =
    activeImage.carId === car._id && activeImage.index < car.images.length
      ? activeImage.index
      : 0;

  const selectImage = (index: number) => {
    setActiveImage({ carId: car._id, index });
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        {/* Gallery — left on desktop, first on mobile */}
        <Card className="flex h-full flex-col overflow-hidden">
          <Carousel
            opts={{ align: "start", loop: true }}
            className="flex flex-1 flex-col"
          >
            <div className="relative flex aspect-[41/30] w-full items-center justify-center overflow-hidden bg-primary">
              <LeftBackgroundImage
                className="pointer-events-none absolute inset-0 h-full w-full"
                preserveAspectRatio="xMidYMid slice"
              />
              <Image
                src={car.images[activeIndex]}
                alt={`${car.name} ${car.type} car`}
                width={car.imageMetadata.width}
                height={car.imageMetadata.height}
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="relative z-10 h-full w-full object-contain p-4 sm:p-6"
              />
              <Button
                variant="secondary"
                size="icon"
                aria-label="Previous image"
                onClick={() =>
                  selectImage(
                    (activeIndex - 1 + car.images.length) % car.images.length
                  )
                }
                className="absolute left-2 top-1/2 z-20 size-8 -translate-y-1/2 rounded-full"
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Next image"
                onClick={() =>
                  selectImage((activeIndex + 1) % car.images.length)
                }
                className="absolute right-2 top-1/2 z-20 size-8 -translate-y-1/2 rounded-full"
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>

            {/* Ecommerce-style pose strip */}
            <div className="w-full px-4 pb-4 pt-2">
              <CarouselContent className="-ml-2">
                {car.images.map((src, index) => (
                  <CarouselItem key={src} className="basis-1/3 pl-2">
                    <button
                      type="button"
                      onClick={() => selectImage(index)}
                      aria-label={`View image ${index + 1} of ${car.name}`}
                      aria-current={index === activeIndex}
                      className={cn(
                        "aspect-[37/31] w-full overflow-hidden rounded-lg bg-muted/50 p-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                        index === activeIndex
                          ? "ring-2 ring-inset ring-primary"
                          : "hover:ring-2 hover:ring-inset hover:ring-primary/60"
                      )}
                    >
                      <Image
                        src={src}
                        alt=""
                        width={132}
                        height={108}
                        className="h-full w-full object-contain"
                      />
                    </button>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </div>
          </Carousel>
        </Card>

        {/* Details — right on desktop, same size as gallery card */}
        <Card className="flex h-full flex-col">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-2xl">{car.name}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                aria-label={
                  isFavorite ? "Remove from favorites" : "Add to favorites"
                }
                aria-pressed={isFavorite}
                onClick={() => setIsFavorite((prev) => !prev)}
                className={cn(
                  isFavorite ? "text-destructive" : "text-muted-foreground"
                )}
              >
                <Heart className={cn(isFavorite && "fill-current")} />
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <RatingStars rating={car.rating ?? 4} />
              <span className="text-sm text-muted-foreground">
                440+ Reviewers
              </span>
            </div>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col gap-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {car.description}
            </p>

            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {features.map(({ label, key, Icon }) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3"
                >
                  <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                    {label}
                  </dt>
                  <dd className="text-sm font-semibold">{car[key]}</dd>
                </div>
              ))}
            </dl>
          </CardContent>

          <CardFooter className="mt-auto items-end justify-between gap-4 pt-2">
            <div>
              <p className="text-2xl font-bold text-primary">
                {car.pricePerDay}
              </p>
              <p className="text-sm text-muted-foreground line-through">
                {car.originalPrice}
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => router.push(`/Payment?carId=${car._id}`)}
            >
              Rent now
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Reviews />
      <OtherCars cars={cars} currentCarId={car._id} />
    </div>
  );
};

export default CarDetailsPage;
