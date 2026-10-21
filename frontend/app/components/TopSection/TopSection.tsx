import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import LeftBackgroundImage from "./LeftBackgroundImage";
import RightBackgroundImage from "./RightBackgroundImage";

/**
 * Hero: two cards at an exact 640×360 (container 1376 = 640+640+32 gap+
 * 64 padding). Text sits ON the card face (absolute overlay), car image
 * anchored bottom-right beneath it.
 */
const TopSection = () => {
  return (
    <section className="mt-8 sm:mt-10 lg:mt-12">
      <div className="mx-auto grid w-full max-w-[1376px] grid-cols-1 justify-items-center gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8">
        <div className="relative h-[360px] w-full max-w-[640px] overflow-hidden rounded-xl bg-primary">
          <LeftBackgroundImage />
          <Image
            className="absolute bottom-0 right-0 h-[180px] w-auto object-contain object-bottom sm:h-[210px]"
            src="/asset/Car/Koenigsegg/2026-koenigsegg-jesko-front-3-4.png"
            alt="Koenigsegg Jesko sports car"
            height={600}
            width={600}
            priority
          />
          <div className="absolute inset-x-0 top-0 flex flex-col items-start gap-3 p-6 sm:p-8">
            <h1 className="max-w-[60%] text-2xl font-bold leading-tight text-white sm:text-3xl">
              The Best Platform for Car Rental
            </h1>
            <p className="max-w-[58%] text-sm font-medium leading-relaxed text-white/90 sm:text-base">
              Ease of doing car rental safely and reliably, and at a low price.
            </p>
            <div className="mt-1">
              <Button
                asChild
                variant="outline"
                className="w-fit bg-background text-foreground hover:bg-background/90"
              >
                <Link href="#popular">
                  Rent a car
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="relative h-[360px] w-full max-w-[640px] overflow-hidden rounded-xl bg-foreground dark:bg-card">
          <RightBackgroundImage />
          <Image
            className="absolute bottom-0 right-0 h-[180px] w-auto object-contain object-bottom sm:h-[210px]"
            src="/asset/Car/Nissan-GTR/2026-nissan-gt-r-front-3-4.png"
            alt="Nissan GT-R sports car"
            height={600}
            width={600}
            priority
          />
          <div className="absolute inset-x-0 top-0 flex flex-col items-start gap-3 p-6 sm:p-8">
            <h2 className="max-w-[60%] text-2xl font-bold leading-tight text-white sm:text-3xl">
              Easy way to rent a car at a low price
            </h2>
            <p className="max-w-[58%] text-sm font-medium leading-relaxed text-white/90 sm:text-base">
              Providing cheap car rental services and safe and comfortable
              facilities.
            </p>
            <div className="mt-1">
              <Button
                asChild
                variant="outline"
                className="w-fit bg-background text-foreground hover:bg-background/90"
              >
                <Link href="#recommended">
                  Rent a car
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TopSection;
