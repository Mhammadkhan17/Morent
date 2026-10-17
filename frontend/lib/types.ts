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
}

export interface Quote {
  days: number;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  currency: string;
}

export interface CheckoutSession {
  sessionId: string;
  clientSecret: string;
}

export interface Booking {
  id: string;
  userId: string;
  carId: string;
  pickupDate: string;
  dropoffDate: string;
  pickupTime: string;
  dropoffTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  days: number;
  promoCode: string | null;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  currency: string;
  status: string;
  createdAt: string;
}
