import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LoadErrorCard } from "@/app/components/load-error";

describe("LoadErrorCard", () => {
  it("shows the title, the message, and retries on click", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <LoadErrorCard
        title="Couldn't load cars"
        message="Backend is down"
        onRetry={onRetry}
      />
    );

    expect(screen.getByText(/couldn't load cars/i)).toBeInTheDocument();
    expect(screen.getByText("Backend is down")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
