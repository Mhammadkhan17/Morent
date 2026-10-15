"use client";
import React, { useState } from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const parsePrice = (value) =>
  Number(String(value ?? "").replace(/[^0-9.]/g, "")) || 0;

const RentalSummary = ({ car }) => {
  const [promoCode, setPromoCode] = useState("");
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState("");
  const basePrice = parsePrice(car?.pricePerDay);
  const [discountedPrice, setDiscountedPrice] = useState(basePrice);

  const handleApplyPromoCode = () => {
    if (promoCode.trim().toUpperCase() === "DISCOUNT10") {
      setDiscountedPrice(Math.round(basePrice * 0.9));
      setIsPromoApplied(true);
      setPromoError("");
    } else {
      setPromoError("Invalid promo code");
      setIsPromoApplied(false);
    }
  };

  if (!car) return null;

  const rating = car.rating ?? 4;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Rental Summary</CardTitle>
        <CardDescription>
          Prices may change depending on the length of the rental and the price
          of your rental car.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {/* Car block */}
        <div className="flex items-center gap-4">
          <div className="flex h-24 w-32 shrink-0 items-center justify-center rounded-lg bg-muted/50 p-2">
            <Image
              src={car.imageUrl}
              alt={car.name}
              width={car.imageMetadata?.width ?? 304}
              height={car.imageMetadata?.height ?? 180}
              sizes="128px"
              className="h-auto w-full object-contain"
            />
          </div>
          <div>
            <p className="text-lg font-bold">{car.name}</p>
            <div className="flex items-center gap-2">
              <span
                className="flex items-center gap-0.5"
                role="img"
                aria-label={`${rating} out of 5 stars`}
              >
                {[1, 2, 3, 4, 5].map((step) => (
                  <Star
                    key={step}
                    aria-hidden="true"
                    className={cn(
                      "size-4",
                      step <= rating
                        ? "fill-current text-yellow-500"
                        : "text-muted-foreground/30"
                    )}
                  />
                ))}
              </span>
              <span className="text-xs text-muted-foreground">
                440+ Reviews
              </span>
            </div>
          </div>
        </div>

        {/* Price rows */}
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-medium">{car.pricePerDay}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Tax</dt>
            <dd className="font-medium">$0</dd>
          </div>
        </dl>

        {/* Promo code */}
        <div className="flex flex-col gap-3 rounded-lg bg-muted p-4">
          <label htmlFor="promo-code" className="text-sm text-muted-foreground">
            Apply promo code
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="promo-code"
              type="text"
              value={promoCode}
              onChange={(event) => {
                setPromoCode(event.target.value);
                setPromoError("");
              }}
              placeholder="Enter code"
              className="h-9 w-full min-w-0 sm:w-40"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleApplyPromoCode}
            >
              Apply now
            </Button>
            {isPromoApplied && <Badge variant="secondary">10% off applied</Badge>}
          </div>
          {promoError && (
            <p role="alert" className="text-sm text-destructive">
              {promoError}
            </p>
          )}
        </div>

        {/* Total */}
        <div className="flex items-end justify-between gap-4 rounded-lg bg-primary/5 p-4">
          <div>
            <p className="text-sm font-bold">Total Rental Price</p>
            <p className="text-xs text-muted-foreground">
              Overall price and includes rental discount
            </p>
          </div>
          <p className="text-2xl font-bold text-primary">
            ${discountedPrice.toFixed(2)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RentalSummary;
