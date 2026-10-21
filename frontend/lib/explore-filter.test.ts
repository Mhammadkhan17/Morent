import { describe, expect, it } from "vitest";
import { filterCars, parseSeats } from "@/lib/explore-filter";
import { makeCar } from "@/test/fixtures";

const baseFilters = {
  query: "",
  type: "all",
  transmission: "all",
  capacity: "all" as const,
  maxPrice: 1000,
};

describe("parseSeats", () => {
  it("parses numeric capacity and falls back to 0", () => {
    expect(parseSeats("4")).toBe(4);
    expect(parseSeats("8+")).toBe(8);
    expect(parseSeats("")).toBe(0);
    expect(parseSeats("n/a")).toBe(0);
  });
});

describe("filterCars", () => {
  const cars = [
    makeCar({
      id: "sport-1",
      name: "Nissan GT-R",
      type: "Sport",
      transmission: "Automatic",
      seatingCapacity: "2",
      pricePerDay: 100,
      tags: ["fast", "coupe"],
    }),
    makeCar({
      id: "suv-1",
      name: "Toyota Land Cruiser",
      type: "SUV",
      transmission: "Manual",
      seatingCapacity: "8",
      pricePerDay: 400,
      tags: ["offroad"],
    }),
    makeCar({
      id: "sedan-1",
      name: "Nissan Sunny",
      type: "Sedan",
      transmission: "Automatic",
      seatingCapacity: "4",
      pricePerDay: 50,
      tags: ["economy"],
    }),
  ];

  it("returns every car when filters are wide open", () => {
    expect(filterCars(cars, baseFilters)).toHaveLength(3);
  });

  it("matches q against car name, case-insensitive", () => {
    const result = filterCars(cars, { ...baseFilters, query: "GT-R" });
    expect(result.map((c) => c.id)).toEqual(["sport-1"]);
  });

  it("matches q against tags", () => {
    const result = filterCars(cars, { ...baseFilters, query: "OFFROAD" });
    expect(result.map((c) => c.id)).toEqual(["suv-1"]);
  });

  it("returns no cars for a q that matches nothing", () => {
    const result = filterCars(cars, { ...baseFilters, query: "ferrari" });
    expect(result).toEqual([]);
  });

  it("filters by transmission (M3)", () => {
    const result = filterCars(cars, { ...baseFilters, transmission: "Manual" });
    expect(result.map((c) => c.id)).toEqual(["suv-1"]);
  });

  it("filters by type", () => {
    const result = filterCars(cars, { ...baseFilters, type: "Sport" });
    expect(result.map((c) => c.id)).toEqual(["sport-1"]);
  });

  it("filters by exact capacity and by 8+", () => {
    expect(
      filterCars(cars, { ...baseFilters, capacity: "4" }).map((c) => c.id)
    ).toEqual(["sedan-1"]);
    expect(
      filterCars(cars, { ...baseFilters, capacity: "8+" }).map((c) => c.id)
    ).toEqual(["suv-1"]);
  });

  it("filters by max price", () => {
    const result = filterCars(cars, { ...baseFilters, maxPrice: 100 });
    expect(result.map((c) => c.id)).toEqual(["sport-1", "sedan-1"]);
  });

  it("combines q with other filters", () => {
    const result = filterCars(cars, {
      ...baseFilters,
      query: "nissan",
      transmission: "Manual",
    });
    expect(result).toEqual([]);
  });
});
