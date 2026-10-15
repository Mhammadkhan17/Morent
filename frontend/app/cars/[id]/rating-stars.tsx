import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const RatingStars = ({
  rating,
  className,
}: {
  rating: number;
  className?: string;
}) => (
  <span
    className={cn("flex items-center gap-0.5", className)}
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
);

export { RatingStars };
