import type { Car } from "@/lib/types";

export function makeCar(overrides: Partial<Car> = {}): Car {
  return {
    id: "car-1",
    name: "Test Car",
    type: "Sedan",
    description: "A test car",
    fuelCapacity: "50L",
    transmission: "Automatic",
    seatingCapacity: "4",
    pricePerDay: 100,
    originalPrice: null,
    imageUrl: "/car.png",
    images: [],
    tags: [],
    rating: null,
    imageMetadata: null,
    ...overrides,
  };
}
