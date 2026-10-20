import { api } from "@/lib/api";

export interface MeBookingCar {
  id: string;
  name: string;
  type: string;
  imageUrl: string;
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
