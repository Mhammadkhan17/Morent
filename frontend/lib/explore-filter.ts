import type { Car } from "@/lib/types";

export type CapacityFilter = "all" | "2" | "4" | "6" | "8+";

export interface ExploreFilters {
  /** raw `q` search param — name/tag substring, case-insensitive */
  query: string;
  type: string;
  transmission: string;
  capacity: CapacityFilter;
  maxPrice: number;
}

export const parseSeats = (value: string) => Number.parseInt(value, 10) || 0;

/** Pure catalogue filter: type, transmission, capacity, price, and q (name/tags). */
export function filterCars(cars: Car[], filters: ExploreFilters): Car[] {
  const q = filters.query.trim().toLowerCase();
  return cars.filter((car) => {
    const seats = parseSeats(car.seatingCapacity);
    const typeOk = filters.type === "all" || car.type === filters.type;
    const transmissionOk =
      filters.transmission === "all" ||
      car.transmission === filters.transmission;
    const capacityOk =
      filters.capacity === "all" ||
      (filters.capacity === "8+"
        ? seats >= 8
        : seats === Number(filters.capacity));
    const queryOk =
      q === "" ||
      car.name.toLowerCase().includes(q) ||
      car.tags.some((tag) => tag.toLowerCase().includes(q));
    return (
      typeOk &&
      transmissionOk &&
      capacityOk &&
      queryOk &&
      car.pricePerDay <= filters.maxPrice
    );
  });
}
