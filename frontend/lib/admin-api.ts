import { api } from "@/lib/api";
import type { Car } from "@/lib/types";

export interface AdminBooking {
  id: string;
  status: string;
  userId: string;
  carId: string;
  carName: string;
  carImage: string;
  customerName: string;
  customerEmail: string;
  pickupDate: string;
  dropoffDate: string;
  totalCents: number;
  createdAt: string;
}

export interface RecentActivityItem {
  bookingId: string;
  status: string;
  carName: string;
  customerName: string;
  createdAt: string;
}

export interface AdminOverview {
  revenueMtdCents: number;
  activeRentals: number;
  upcoming7d: number;
  fleetSize: number;
  utilizationPercent: number;
  pendingConfirmations: number;
  recentActivity: RecentActivityItem[];
}

export interface AdminCar extends Car {
  status: string;
}

export interface AdminCarPayload {
  name: string;
  type: string;
  description: string;
  fuelCapacity: string;
  transmission: string;
  seatingCapacity: string;
  pricePerDay: number;
  originalPrice?: number | null;
  imageUrl: string;
  images?: string[];
  tags?: string[];
  rating?: number | null;
  status?: string;
}

export interface AdminPromo {
  code: string;
  percent: number;
  isActive: boolean;
}

export interface CustomerListItem {
  id: string;
  name: string;
  email: string;
  bookingCount: number;
  totalSpentCents: number;
}

export interface CustomerDetail extends CustomerListItem {
  phone: string | null;
  licenseNumber: string | null;
  licenseExpires: string | null;
  bookings: AdminBooking[];
}

export interface Analytics {
  revenueByDay: { date: string; revenueCents: number }[];
  revenueByWeek: { weekStart: string; revenueCents: number }[];
  bookingsByCar: { carId: string; carName: string; bookings: number }[];
  utilizationByCar: {
    carId: string;
    carName: string;
    utilizationPercent: number;
  }[];
  topPromoCodes: { code: string; uses: number; discountCents: number }[];
}

/** Owner-facing actions per status — mirrors backend ALLOWED_TRANSITIONS,
 * minus webhook-only targets (failed/active-from-pending). */
export const BOOKING_ACTIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["active", "completed", "cancelled"],
  active: ["completed", "cancelled"],
  completed: [],
  failed: [],
  cancelled: [],
};

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "active",
  "completed",
  "failed",
  "cancelled",
] as const;

const query = (params: Record<string, string | undefined>): string => {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  const encoded = qs.toString();
  return encoded ? `?${encoded}` : "";
};

export const fetchOverview = (): Promise<AdminOverview> =>
  api.get("/admin/overview");

export const fetchAdminBookings = (params: {
  status?: string;
  carId?: string;
  q?: string;
} = {}): Promise<AdminBooking[]> =>
  api.get(
    `/admin/bookings${query({ status: params.status, car_id: params.carId, q: params.q })}`
  );

export const updateBookingStatus = (
  id: string,
  status: string
): Promise<AdminBooking> =>
  api.patch(`/admin/bookings/${encodeURIComponent(id)}`, { status });

export const fetchAdminCars = (): Promise<AdminCar[]> =>
  api.get("/admin/cars");

export const createAdminCar = (
  payload: AdminCarPayload
): Promise<AdminCar> => api.post("/admin/cars", payload);

export const updateAdminCar = (
  id: string,
  payload: Partial<AdminCarPayload>
): Promise<AdminCar> =>
  api.patch(`/admin/cars/${encodeURIComponent(id)}`, payload);

export const deleteAdminCar = (id: string): Promise<void> =>
  api.delete(`/admin/cars/${encodeURIComponent(id)}`);

export const fetchPromos = (): Promise<AdminPromo[]> =>
  api.get("/admin/promo-codes");

export const createPromo = (payload: {
  code: string;
  percent: number;
  isActive: boolean;
}): Promise<AdminPromo> => api.post("/admin/promo-codes", payload);

export const updatePromo = (
  code: string,
  payload: { percent?: number; isActive?: boolean }
): Promise<AdminPromo> =>
  api.patch(`/admin/promo-codes/${encodeURIComponent(code)}`, payload);

export const deletePromo = (code: string): Promise<void> =>
  api.delete(`/admin/promo-codes/${encodeURIComponent(code)}`);

export const fetchCustomers = (): Promise<CustomerListItem[]> =>
  api.get("/admin/customers");

export const fetchCustomer = (id: string): Promise<CustomerDetail> =>
  api.get(`/admin/customers/${encodeURIComponent(id)}`);

export const fetchAnalytics = (
  fromDate?: string,
  toDate?: string
): Promise<Analytics> =>
  api.get(`/admin/analytics${query({ from: fromDate, to: toDate })}`);
