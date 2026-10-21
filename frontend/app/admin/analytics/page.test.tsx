import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Analytics } from "@/lib/admin-api";

vi.mock("@/lib/admin-api", () => ({
  fetchAnalytics: vi.fn(),
}));

import { fetchAnalytics } from "@/lib/admin-api";
import AdminAnalyticsPage from "./page";

const emptyAnalytics: Analytics = {
  revenueByDay: [],
  revenueByWeek: [],
  bookingsByCar: [],
  utilizationByCar: [],
  topPromoCodes: [],
};

describe("AdminAnalyticsPage", () => {
  beforeEach(() => {
    vi.mocked(fetchAnalytics).mockResolvedValue(emptyAnalytics);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows a skeleton and disabled Apply while the first load is in flight", () => {
    vi.mocked(fetchAnalytics).mockReturnValue(new Promise(() => {}));
    render(<AdminAnalyticsPage />);
    expect(screen.getByRole("button", { name: /applying/i })).toBeDisabled();
    expect(screen.getByLabelText(/from/i)).toBeInTheDocument();
  });

  it("shows content after the first load resolves", async () => {
    render(<AdminAnalyticsPage />);
    expect(
      await screen.findByText(/revenue by day/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("re-enters a refreshing state on Apply and clears it when done", async () => {
    const user = userEvent.setup();
    let resolveSecond!: (value: Analytics) => void;
    vi.mocked(fetchAnalytics)
      .mockResolvedValueOnce(emptyAnalytics)
      .mockImplementationOnce(
        () =>
          new Promise<Analytics>((resolve) => {
            resolveSecond = resolve;
          })
      );

    render(<AdminAnalyticsPage />);
    await screen.findByText(/revenue by day/i);

    await user.click(screen.getByRole("button", { name: /apply/i }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /applying/i })).toBeDisabled();
    expect(screen.getByText(/revenue by day/i)).toBeInTheDocument();

    resolveSecond(emptyAnalytics);
    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /apply/i })).toBeEnabled();
  });

  it("re-fetches on every Apply even when the range is unchanged", async () => {
    const user = userEvent.setup();
    render(<AdminAnalyticsPage />);
    await screen.findByText(/revenue by day/i);
    expect(fetchAnalytics).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /apply/i }));
    await waitFor(() => {
      expect(fetchAnalytics).toHaveBeenCalledTimes(2);
    });

    await user.click(screen.getByRole("button", { name: /apply/i }));
    await waitFor(() => {
      expect(fetchAnalytics).toHaveBeenCalledTimes(3);
    });
  });

  it("keeps the error alert and last good data visible when a refresh fails", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchAnalytics)
      .mockResolvedValueOnce(emptyAnalytics)
      .mockRejectedValueOnce(new Error("Backend is down"));

    render(<AdminAnalyticsPage />);
    await screen.findByText(/revenue by day/i);

    await user.click(screen.getByRole("button", { name: /apply/i }));

    expect(await screen.findByText(/backend is down/i)).toBeInTheDocument();
    expect(screen.getByText(/revenue by day/i)).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
