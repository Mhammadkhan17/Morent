import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeCar } from "@/test/fixtures";

const sp = vi.hoisted(() => {
  let params = new URLSearchParams();
  const listeners = new Set<() => void>();
  return {
    replace(next: URLSearchParams) {
      params = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getParams: () => params,
  };
});

vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  return {
    useSearchParams: () =>
      useSyncExternalStore(
        (listener) => sp.subscribe(listener),
        () => sp.getParams()
      ),
    useRouter: () => ({
      replace: (url: string) => {
        const qs = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
        sp.replace(new URLSearchParams(qs));
      },
    }),
    usePathname: () => "/explore",
  };
});

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
    sp.replace(new URLSearchParams());
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
    sp.replace(new URLSearchParams("q=cruiser"));
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
    expect(sp.getParams().get("transmission")).toBe("Manual");
  });

  it("restores type, transmission, capacity, and price from the URL", async () => {
    sp.replace(
      new URLSearchParams("type=SUV&transmission=Manual&capacity=8+&price=500")
    );
    render(<ExploreClient />);

    expect(await screen.findByTestId("car-land-cruiser")).toBeInTheDocument();
    expect(screen.queryByTestId("car-gt-r")).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /suv/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /manual/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /8 or more/i })).toBeChecked();
  });

  it("restores the price cap from the URL", async () => {
    sp.replace(new URLSearchParams("price=150"));
    render(<ExploreClient />);

    expect(await screen.findByTestId("car-gt-r")).toBeInTheDocument();
    expect(screen.queryByTestId("car-land-cruiser")).not.toBeInTheDocument();
    expect(
      screen.getByRole("slider", { name: /maximum price per day/i })
    ).toHaveAttribute("aria-valuenow", "150");
  });

  it("ignores unknown filter values instead of crashing", async () => {
    sp.replace(
      new URLSearchParams("type=crossover&transmission=cvt&capacity=10&price=free")
    );
    render(<ExploreClient />);

    expect(await screen.findByTestId("car-gt-r")).toBeInTheDocument();
    expect(screen.getByTestId("car-land-cruiser")).toBeInTheDocument();
  });

  it("clears every filter from the sidebar", async () => {
    const user = userEvent.setup();
    sp.replace(new URLSearchParams("type=SUV&price=500&q=cruiser"));
    render(<ExploreClient />);

    expect(await screen.findByTestId("car-land-cruiser")).toBeInTheDocument();

    const [clearButton] = screen.getAllByRole("button", {
      name: /clear all filters/i,
    });
    await user.click(clearButton);

    expect(await screen.findByTestId("car-gt-r")).toBeInTheDocument();
    expect(screen.getByTestId("car-land-cruiser")).toBeInTheDocument();
    expect(sp.getParams().toString()).toBe("");
    expect(screen.queryByText(/clear search/i)).not.toBeInTheDocument();
  });

  it("shows a load-error card with retry that recovers", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchCars)
      .mockRejectedValueOnce(new Error("Backend is down"))
      .mockResolvedValueOnce(cars);

    render(<ExploreClient />);

    expect(await screen.findByText(/couldn't load cars/i)).toBeInTheDocument();
    expect(screen.getByText("Backend is down")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByTestId("car-gt-r")).toBeInTheDocument();
    expect(screen.getByTestId("car-land-cruiser")).toBeInTheDocument();
    expect(
      screen.queryByText(/couldn't load cars/i)
    ).not.toBeInTheDocument();
  });
});
