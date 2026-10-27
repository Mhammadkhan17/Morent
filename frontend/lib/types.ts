export interface Car {
  id: string;
  name: string;
  type: string;
  description: string;
  fuelCapacity: string;
  transmission: string;
  seatingCapacity: string;
  /** dollars per day, e.g. 99 */
  pricePerDay: number;
  /** original dollars per day if discounted, else null */
  originalPrice: number | null;
  imageUrl: string;
  images: string[];
  tags: string[];
  rating: number | null;
  imageMetadata: { width: number; height: number } | null;
  /** fleet units of this listing (>=1); default 1 */
  quantity: number;
}

export interface Quote {
  days: number;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
}

export interface CheckoutSession {
  sessionId: string;
  clientSecret: string;
}
