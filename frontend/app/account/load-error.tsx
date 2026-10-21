"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CircleX, RefreshCw } from "lucide-react";

export function LoadErrorCard({
  title = "Couldn't load your bookings",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CircleX aria-hidden="true" className="size-5 text-destructive" />
          {title}
        </CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCw aria-hidden="true" className="mr-2 size-4" />
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
