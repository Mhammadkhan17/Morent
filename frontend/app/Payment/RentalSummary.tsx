"use client";
import React from "react";
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
import { formatCents } from "@/lib/cars-api";
import type { Car, Quote } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LIMITS } from "./validation";

interface RentalSummaryProps {
  car: Car | null;
  quote: Quote | null;
  quoteError?: string;
  isQuoting?: boolean;
  /** Locked while a Stripe checkout session is open (see PayPanel). */
  disabled?: boolean;
  promoCode: string;
  isPromoApplied?: boolean;
  onPromoCodeChange: (code: string) => void;
  onApplyPromo: () => void;
  onRetryQuote?: () => void;
}

const RentalSummary = ({
  car,
  quote,
  quoteError,
  isQuoting,
  disabled = false,
  promoCode,
  isPromoApplied,
  onPromoCodeChange,
  onApplyPromo,
  onRetryQuote,
}: RentalSummaryProps) => {
  if (!car) return null;

  const rating = car.rating ?? 4;
  const meta = car.imageMetadata ?? { width: 304, height: 180 };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Rental Summary</CardTitle>
        <CardDescription>
          The server prices this booking — the total updates as you change
          dates, location, or promo code.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {/* Car block */}
        <div className="flex items-center gap-4">
          <div className="flex h-24 w-32 shrink-0 items-center justify-center rounded-lg bg-muted/50 p-2">
            <Image
              src={car.imageUrl}
              alt={car.name}
              width={meta.width}
              height={meta.height}
              sizes="128px"
              className="h-auto w-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold break-words">{car.name}</p>
            <div className="flex flex-wrap items-center gap-2">
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
                        ? "fill-current text-primary"
                        : "text-muted-foreground/30"
                    )}
                  />
                ))}
              </span>
              <span className="text-xs text-muted-foreground">
                Demo rating
              </span>
            </div>
          </div>
        </div>

        {/* Price rows — server quote only */}
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-medium">
              {isQuoting && !quote
                ? "…"
                : quote
                  ? formatCents(quote.subtotalCents)
                  : "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Discount</dt>
            <dd className="font-medium">
              {quote && quote.discountCents > 0
                ? `−${formatCents(quote.discountCents)}`
                : formatCents(0)}
            </dd>
          </div>
        </dl>

        {/* Promo code */}
        <form
          className="flex flex-col gap-3 rounded-lg bg-muted p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!disabled && promoCode.trim()) onApplyPromo();
          }}
        >
          <label htmlFor="promo-code" className="text-sm text-muted-foreground">
            Apply promo code
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="promo-code"
              type="text"
              value={promoCode}
              onChange={(event) => onPromoCodeChange(event.target.value)}
              placeholder="Enter code"
              maxLength={LIMITS.promo}
              disabled={disabled}
              autoCapitalize="characters"
              spellCheck={false}
              className="h-9 w-full min-w-0 sm:w-40"
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={disabled || !promoCode.trim()}
            >
              Apply now
            </Button>
            {isPromoApplied && quote && quote.discountCents > 0 && (
              <Badge variant="secondary">Discount applied</Badge>
            )}
          </div>
          {quoteError && (
            <p role="alert" className="text-sm text-destructive">
              {quoteError}
            </p>
          )}
          {quoteError && onRetryQuote && (
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRetryQuote}
              >
                Try again
              </Button>
            </div>
          )}
        </form>

        {/* Total */}
        <div
          aria-busy={isQuoting || undefined}
          aria-live="polite"
          aria-atomic="true"
          className="flex items-end justify-between gap-4 rounded-lg bg-primary/5 p-4"
        >
          <div>
            <p className="text-sm font-bold">Total Rental Price</p>
            <p className="text-xs text-muted-foreground">
              {quote
                ? `${quote.days} day${quote.days === 1 ? "" : "s"} · includes discount`
                : "Select dates to see the total"}
            </p>
          </div>
          <p className="text-2xl font-bold text-primary">
            {quote ? formatCents(quote.totalCents) : "—"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RentalSummary;
