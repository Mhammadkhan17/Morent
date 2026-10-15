import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CarFront,
  KeyRound,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "How it works — Morent",
  description:
    "Renting a car with Morent in four simple steps — browse, book, pay and drive.",
};

const steps = [
  {
    icon: Search,
    title: "Browse the catalogue",
    description:
      "Compare cars by type, price, seats and transmission. Open any car for full specs, photos and reviews.",
  },
  {
    icon: CalendarCheck,
    title: "Pick dates and location",
    description:
      "Tell us where and when you need the car. Pick-up and drop-off each get their own city, date and time.",
  },
  {
    icon: CarFront,
    title: "Book and pay",
    description:
      "Enter your billing details, choose a payment method and confirm. Promo codes bring the total down before you pay.",
  },
  {
    icon: KeyRound,
    title: "Pick up and drive",
    description:
      "Collect the keys at your chosen location, enjoy the drive, then return the car when your rental ends.",
  },
];

const HowItWorksPage = () => (
  <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
    <header className="max-w-2xl">
      <Badge variant="secondary">Guide</Badge>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
        How it works
      </h1>
      <p className="mt-3 text-muted-foreground">
        Renting a car with Morent takes four steps — from browsing the fleet to
        picking up the keys.
      </p>
    </header>

    <ol className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, index) => (
        <li key={step.title}>
          <Card className="h-full">
            <CardHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <step.icon aria-hidden="true" className="size-5" />
              </div>
              <Badge variant="outline" className="w-fit">
                Step {index + 1}
              </Badge>
              <CardTitle className="text-base">{step.title}</CardTitle>
              <CardDescription>{step.description}</CardDescription>
            </CardHeader>
          </Card>
        </li>
      ))}
    </ol>

    <Card className="mt-10">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Ready when you are</p>
          <p className="text-sm text-muted-foreground">
            Pick a car from the catalogue and finish checkout in minutes.
          </p>
        </div>
        <Button asChild>
          <Link href="/">
            Browse cars
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  </div>
);

export default HowItWorksPage;
