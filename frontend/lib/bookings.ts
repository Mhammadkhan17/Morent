import { api, type RequestOptions } from "@/lib/api";
import type { CheckoutSession, Quote } from "@/lib/types";

export type { RequestOptions };

export interface QuoteRequest {
  carId: string;
  pickup: { location: string; date: string; time: string };
  dropoff: { location: string; date: string; time: string };
  promoCode?: string | null;
}

/** Public — no JWT. */
export async function fetchQuote(
  body: QuoteRequest,
  options?: RequestOptions
): Promise<Quote> {
  return api.post<Quote>("/quotes", body, { auth: false, ...options });
}

export interface BookingRequest extends QuoteRequest {
  billingName: string;
  billingPhone: string;
  billingAddress: string;
  billingCity: string;
  agreedToTerms: boolean;
  agreedToMarketing: boolean;
}

/** Authenticated — Bearer JWT required. */
export async function createBooking(
  body: BookingRequest,
  options?: RequestOptions
): Promise<CheckoutSession> {
  return api.post<CheckoutSession>("/bookings", body, options);
}

export async function fetchSessionStatus(
  sessionId: string,
  options?: RequestOptions
): Promise<{ status: string; paymentStatus: string }> {
  return api.get<{ status: string; paymentStatus: string }>(
    `/checkout/session-status?session_id=${encodeURIComponent(sessionId)}`,
    { auth: false, ...options }
  );
}
