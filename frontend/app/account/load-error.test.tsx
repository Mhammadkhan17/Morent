import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LoadErrorCard } from "@/app/account/load-error";

describe("LoadErrorCard", () => {
  it("shows the default title, the message, and retries on click", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<LoadErrorCard message="Backend is down" onRetry={onRetry} />);

    expect(screen.getByText(/couldn't load your bookings/i)).toBeInTheDocument();
    expect(screen.getByText("Backend is down")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("accepts a custom title", () => {
    render(
      <LoadErrorCard
        title="Couldn't load notifications"
        message="x"
        onRetry={() => {}}
      />
    );
    expect(
      screen.getByText(/couldn't load notifications/i)
    ).toBeInTheDocument();
  });
});
