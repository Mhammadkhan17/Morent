import { Badge, badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  // bookings
  pending: "outline",
  confirmed: "secondary",
  active: "default",
  completed: "outline",
  failed: "destructive",
  cancelled: "destructive",
  // cars
  available: "default",
  maintenance: "secondary",
  hidden: "outline",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const variant = STATUS_VARIANT[status] ?? "outline";
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
