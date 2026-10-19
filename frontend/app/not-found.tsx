import Link from "next/link";
import { MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <Card className="mx-auto max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-accent">
            <MapPinOff
              aria-hidden="true"
              className="size-6 text-muted-foreground"
            />
          </div>
          <p className="text-sm font-medium tracking-widest text-muted-foreground">
            404
          </p>
          <CardTitle className="text-xl">
            This page went out for a test drive — and never came back.
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We checked the whole lot twice; it&rsquo;s not parked anywhere.
            The GPS says &ldquo;recalculating,&rdquo; but even it gave up.
          </p>
        </CardContent>
        <CardFooter className="justify-center gap-3">
          <Button asChild>
            <Link href="/">Back to home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/explore">Browse cars</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
