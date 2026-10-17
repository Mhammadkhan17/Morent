import { api } from "@/lib/api";
import type { CheckoutSession, Quote } from "@/lib/types";

export interface QuoteRequest {
  carId: string;
  pickup: { location: string; date: string; time: string };
  dropoff: { location: string; date: string; time: string };
  promoCode?: string | null;
}

/** Public — no JWT. */
export async function fetchQuote(body: QuoteRequest): Promise<Quote> {
  return api.post<Quote>("/quotes", body, { auth: false });
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
  body: BookingRequest
): Promise<CheckoutSession> {
  return api.post<CheckoutSession>("/bookings", body);
}

export async function fetchSessionStatus(
  sessionId: string
): Promise<{ status: string; paymentStatus: string }> {
  return api.get<{ status: string; paymentStatus: string }>(
    `/checkout/session-status?session_id=${encodeURIComponent(sessionId)}`,
    { auth: false }
  );
}
