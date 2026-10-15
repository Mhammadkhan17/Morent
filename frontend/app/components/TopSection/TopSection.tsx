import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import LeftBackgroundImage from "./LeftBackgroundImage";
import RightBackgroundImage from "./RightBackgroundImage";

const TopSection = () => {
  return (
    <section className="mt-8 grid grid-cols-1 gap-6 sm:mt-10 lg:mt-12 lg:grid-cols-2 lg:gap-8">
      <div className="relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-xl bg-primary p-6 sm:min-h-[360px] sm:p-8">
        <LeftBackgroundImage />
        <div className="relative flex flex-col gap-4">
          <h1 className="max-w-md text-2xl font-bold leading-tight text-white sm:text-3xl">
            The Best Platform for Car Rental
          </h1>
          <p className="max-w-sm text-base font-medium leading-relaxed text-white/90">
            Ease of doing car rental safely and reliably, and at a low price.
          </p>
          <div className="mt-2">
            <Button
              asChild
              variant="outline"
              className="w-fit bg-background text-foreground hover:bg-background/90"
            >
              <Link href="#popular">
                Rent a car
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>
        <Image
          className="relative mx-auto mt-8 h-56 w-full max-w-md object-cover object-center sm:h-72"
          src="/asset/Car/Koenigsegg/2026-koenigsegg-jesko-front-3-4.png"
          alt="Koenigsegg Jesko sports car"
          height={600}
          width={600}
          priority
        />
      </div>

      <div className="relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-xl bg-foreground p-6 sm:min-h-[360px] sm:p-8">
        <RightBackgroundImage />
        <div className="relative flex flex-col gap-4">
          <h2 className="max-w-md text-2xl font-bold leading-tight text-white sm:text-3xl">
            Easy way to rent a car at a low price
          </h2>
          <p className="max-w-sm text-base font-medium leading-relaxed text-white/90">
            Providing cheap car rental services and safe and comfortable
            facilities.
          </p>
        </div>
        <div className="relative flex flex-col items-start gap-6">
          <Button
            asChild
            variant="outline"
            className="bg-background text-foreground hover:bg-background/90"
          >
            <Link href="#recommended">
              Rent a car
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
          <Image
            className="mx-auto h-56 w-full max-w-sm object-cover object-center sm:h-72"
            src="/asset/Car/Nissan-GTR/2026-nissan-gt-r-front-3-4.png"
            alt="Nissan GT-R sports car"
            height={600}
            width={600}
            priority
          />
        </div>
      </div>
    </section>
  );
};

export default TopSection;
