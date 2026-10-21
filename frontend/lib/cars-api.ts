import { api, type RequestOptions } from "@/lib/api";
import type { Car } from "@/lib/types";

export const formatMoney = (amount: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

export const formatCents = (cents: number): string => formatMoney(cents / 100);

/** Public catalogue reads — no auth token. */
export async function fetchCars(): Promise<Car[]> {
  return api.get<Car[]>("/cars", { auth: false });
}

export async function fetchCar(
  id: string,
  options?: RequestOptions
): Promise<Car> {
  return api.get<Car>(`/cars/${encodeURIComponent(id)}`, {
    auth: false,
    ...options,
  });
}
