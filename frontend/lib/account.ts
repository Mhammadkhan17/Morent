import { api } from "@/lib/api";

export interface MeBookingCar {
  id: string;
  name: string;
  type: string;
  imageUrl: string;
}

/** Payment row attached to a booking (null when never charged). */
export interface MePaymentInfo {
  amountCents: number;
  refundedCents: number;
  /** none | pending | succeeded | failed */
  refundStatus: string;
  /** stripe | credit */
  origin: string;
}

/** Admin-offered replacement for a cancelled booking. */
export interface MeSwapOffer {
  id: string;
  /** offered | accepted | declined | withdrawn */
  status: string;
  offeredTotalCents: number;
  originalTotalCents: number;
  createdAt: string;
  car: MeBookingCar;
}

export interface MeBooking {
  id: string;
  status: string;
  pickupDate: string;
  dropoffDate: string;
  pickupTime: string;
  dropoffTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  days: number;
  totalCents: number;
  currency: string;
  unreadMessages: number;
  cancelReason?: string | null;
  payment?: MePaymentInfo | null;
  swapOffer?: MeSwapOffer | null;
  car: MeBookingCar;
}

export interface MeProfile {
  userId: string;
  phone: string | null;
  licenseNumber: string | null;
  licenseExpires: string | null;
}

export interface ProfileUpdate {
  phone?: string | null;
  licenseNumber?: string | null;
  licenseExpires?: string | null;
}

export interface ThreadMessage {
  id: string;
  bookingId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export const fetchMeBookings = (): Promise<{ bookings: MeBooking[] }> =>
  api.get("/me/bookings");

export const fetchProfile = (): Promise<MeProfile> => api.get("/me/profile");

export const updateProfile = (body: ProfileUpdate): Promise<MeProfile> =>
  api.patch("/me/profile", body);

export const fetchMessages = (
  bookingId: string
): Promise<{ messages: ThreadMessage[] }> =>
  api.get(`/bookings/${encodeURIComponent(bookingId)}/messages`);

export const sendMessage = (
  bookingId: string,
  body: string
): Promise<ThreadMessage> =>
  api.post(`/bookings/${encodeURIComponent(bookingId)}/messages`, { body });

/** Accept the replacement: credit applied, diff refunded, new booking created. */
export const acceptSwap = (
  bookingId: string
): Promise<{ bookingId: string; status: string }> =>
  api.post(`/me/bookings/${encodeURIComponent(bookingId)}/swap/accept`);

/** Decline the replacement → full refund instead. */
export const requestSwapRefund = (
  bookingId: string
): Promise<{ status: string }> =>
  api.post(`/me/bookings/${encodeURIComponent(bookingId)}/swap/decline`);
