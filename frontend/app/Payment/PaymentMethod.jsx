"use client";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreditCard, Lock } from "lucide-react";

/**
 * Step 3 shell — card/wallet details are entered securely in the
 * Stripe Payment Element at the final step (never in this form).
 */
const PaymentMethod = () => {
  const logos = [
    {
      src: "/asset/Payment-Logo/visa-com-logo.png",
      alt: "Visa",
    },
    {
      src: "/asset/Payment-Logo/mastercard-com-logo.png",
      alt: "Mastercard",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">Payment Method</CardTitle>
            <CardDescription>
              The card form opens on this page after you press Rent now
            </CardDescription>
          </div>
          <Badge variant="secondary">Step 3 of 4</Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-4 rounded-lg border border-primary/40 bg-primary/5 p-4">
          <CreditCard aria-hidden="true" className="size-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Card & wallets</p>
            <p className="text-sm text-muted-foreground">
              Card, Apple Pay, Google Pay, and more.
            </p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            {logos.map((logo) => (
              <Image
                key={logo.alt}
                src={logo.src}
                alt={logo.alt}
                width={36}
                height={36}
                className="h-8 w-8 object-contain"
              />
            ))}
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg bg-muted p-4">
          <Lock aria-hidden="true" className="size-5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Details are entered in Stripe&apos;s form — they never touch our
            servers or get stored by us.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentMethod;
