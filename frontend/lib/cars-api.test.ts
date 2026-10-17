import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchCar, fetchCars, formatCents, formatMoney } from "@/lib/cars-api";

function stubFetch(payload: unknown) {
  const res = {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => payload,
  };
  const fn = vi.fn().mockResolvedValue(res);
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("catalogue reads", () => {
  it("fetchCars GETs /cars without auth and returns camelCase payload as-is", async () => {
    const car = { id: "koenigsegg", pricePerDay: 99, imageUrl: "/asset/Car/x.png" };
    const fetchMock = stubFetch([car]);

    const cars = await fetchCars();

    expect(cars).toEqual([car]);
    expect(cars[0].pricePerDay).toBe(99);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/api/v1/cars");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("fetchCar encodes the id path segment", async () => {
    const fetchMock = stubFetch({ id: "mercedes benz" });

    await fetchCar("mercedes benz");

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("http://localhost:8000/api/v1/cars/mercedes%20benz");
  });
});

describe("money formatting", () => {
  it("formatMoney renders known USD literals", () => {
    expect(formatMoney(99)).toBe("$99.00");
    expect(formatMoney(1287)).toBe("$1,287.00");
  });

  it("formatCents converts cents to dollars with fixed literals", () => {
    expect(formatCents(128700)).toBe("$1,287.00");
    expect(formatCents(7200)).toBe("$72.00");
    expect(formatCents(1)).toBe("$0.01");
  });
});
