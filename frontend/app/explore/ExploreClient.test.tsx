import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeCar } from "@/test/fixtures";

const sp = vi.hoisted(() => ({ current: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => sp.current,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/cars-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cars-api")>();
  return { ...actual, fetchCars: vi.fn() };
});

vi.mock("@/app/components/CatalogueCar", () => ({
  CarCard: ({ car }: { car: { id: string; name: string } }) => (
    <div data-testid={`car-${car.id}`}>{car.name}</div>
  ),
}));

import { fetchCars } from "@/lib/cars-api";
import ExploreClient from "@/app/explore/ExploreClient";

const cars = [
  makeCar({
    id: "gt-r",
    name: "Nissan GT-R",
    type: "Sport",
    transmission: "Automatic",
    seatingCapacity: "2",
    pricePerDay: 100,
    tags: ["fast"],
  }),
  makeCar({
    id: "land-cruiser",
    name: "Toyota Land Cruiser",
    type: "SUV",
    transmission: "Manual",
    seatingCapacity: "8",
    pricePerDay: 400,
    tags: ["offroad"],
  }),
];

describe("ExploreClient (M1 search + M3 transmission)", () => {
  beforeEach(() => {
    sp.current = new URLSearchParams();
    vi.mocked(fetchCars).mockResolvedValue(cars);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists every car when there is no q", async () => {
    render(<ExploreClient />);

    expect(await screen.findByTestId("car-gt-r")).toBeInTheDocument();
    expect(screen.getByTestId("car-land-cruiser")).toBeInTheDocument();
    expect(screen.queryByText(/clear search/i)).not.toBeInTheDocument();
  });

  it("filters by the q search param and offers Clear search", async () => {
    sp.current = new URLSearchParams("q=cruiser");
    render(<ExploreClient />);

    expect(await screen.findByTestId("car-land-cruiser")).toBeInTheDocument();
    expect(screen.queryByTestId("car-gt-r")).not.toBeInTheDocument();
    expect(screen.getByText(/clear search/i)).toBeInTheDocument();
    expect(screen.getByText(/for “cruiser”/i)).toBeInTheDocument();
  });

  it("filters by transmission via the sidebar", async () => {
    const user = userEvent.setup();
    render(<ExploreClient />);

    await screen.findByTestId("car-gt-r");
    await user.click(screen.getByRole("radio", { name: /manual/i }));

    expect(screen.getByTestId("car-land-cruiser")).toBeInTheDocument();
    expect(screen.queryByTestId("car-gt-r")).not.toBeInTheDocument();
  });
});
