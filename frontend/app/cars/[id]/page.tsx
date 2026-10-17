"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Car, Fuel, Gauge, Heart, Users } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCar, fetchCars, formatMoney } from "@/lib/cars-api";
import type { Car as CarType } from "@/lib/types";
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
  const [data, setData] = useState<{
    id: string | null;
    car: CarType | null;
    allCars: CarType[];
    loadError: string | null;
  }>({ id: null, car: null, allCars: [], loadError: null });
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeImage, setActiveImage] = useState<{
    carId: string;
    index: number;
  }>({ carId: "", index: 0 });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    Promise.all([fetchCar(id), fetchCars()])
      .then(([carData, carsData]) => {
        if (cancelled) return;
        setData({ id, car: carData, allCars: carsData, loadError: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const notFound =
          err &&
          typeof err === "object" &&
          "status" in err &&
          err.status === 404;
        setData({
          id,
          car: null,
          allCars: [],
          loadError: notFound
            ? null
            : err instanceof Error
              ? err.message
              : "Failed to load car",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const car = data.id === id ? data.car : null;
  const allCars = data.id === id ? data.allCars : [];
  const isLoading = !id || data.id !== id;
  const loadError = data.id === id ? data.loadError : null;

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <Card className="flex h-full flex-col overflow-hidden">
            <CardContent className="flex-1 p-6">
              <Skeleton className="h-80 w-full" />
            </CardContent>
          </Card>
          <Card className="flex h-full flex-col overflow-hidden">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-xl">Failed to load</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{loadError}</p>
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
    activeImage.carId === car.id && activeImage.index < car.images.length
      ? activeImage.index
      : 0;

  const selectImage = (index: number) => {
    setActiveImage({ carId: car.id, index });
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        {/* Gallery — left on desktop, first on mobile */}
        <Card className="flex h-full flex-col overflow-hidden">
          <CardContent className="flex flex-1 flex-col p-4 sm:p-6">
            <div className="relative mb-4 flex items-center justify-center overflow-hidden rounded-xl bg-muted/40">
              <LeftBackgroundImage />
              <Image
                src={car.images[activeIndex] ?? car.imageUrl}
                alt={`${car.name} — photo ${activeIndex + 1}`}
                width={car.imageMetadata?.width ?? 800}
                height={car.imageMetadata?.height ?? 600}
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="relative h-auto max-h-[360px] w-full object-contain"
              />
            </div>

            <Carousel opts={{ align: "start", loop: true }}>
              <CarouselContent className="-ml-2">
                {car.images.map((src, index) => (
                  <CarouselItem
                    key={`${car.id}-${index}`}
                    className="basis-1/3 pl-2 sm:basis-1/4"
                  >
                    <button
                      type="button"
                      onClick={() => selectImage(index)}
                      aria-label={`Show photo ${index + 1}`}
                      aria-current={index === activeIndex}
                      className={cn(
                        "w-full overflow-hidden rounded-lg border-2 bg-muted/40 transition-colors",
                        index === activeIndex
                          ? "border-primary"
                          : "border-transparent hover:border-primary/40"
                      )}
                    >
                      <Image
                        src={src}
                        alt=""
                        width={160}
                        height={100}
                        sizes="120px"
                        className="h-auto w-full object-contain"
                      />
                    </button>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </CardContent>
        </Card>

        {/* Details — right on desktop, second on mobile */}
        <Card className="flex h-full flex-col overflow-hidden">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">{car.name}</CardTitle>
                <button
                  type="button"
                  onClick={() => setIsFavorite((prev) => !prev)}
                  aria-pressed={isFavorite}
                  aria-label={
                    isFavorite ? "Remove from favorites" : "Add to favorites"
                  }
                  className="rounded-full p-1 transition-colors hover:bg-accent"
                >
                  <Heart
                    aria-hidden="true"
                    className={cn(
                      "size-5",
                      isFavorite
                        ? "fill-destructive text-destructive"
                        : "text-muted-foreground"
                    )}
                  />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <RatingStars rating={car.rating ?? 0} />
                <span className="text-sm text-muted-foreground">
                  440+ Reviewers
                </span>
              </div>
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
                {formatMoney(car.pricePerDay)}
              </p>
              {car.originalPrice != null && (
                <p className="text-sm text-muted-foreground line-through">
                  {formatMoney(car.originalPrice)}
                </p>
              )}
            </div>
            <Button
              size="lg"
              onClick={() => router.push(`/Payment?carId=${car.id}`)}
            >
              Rent now
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Reviews />
      <OtherCars cars={allCars} currentCarId={car.id} />
    </div>
  );
};

export default CarDetailsPage;
