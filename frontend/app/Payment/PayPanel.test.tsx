import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PayPanel from "@/app/Payment/PayPanel";

// NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is unset in the test env, so the
// module-level stripePromise is null and the config-error guard must render.

describe("PayPanel without a publishable key (M17)", () => {
  it("renders an explicit config error instead of a blank checkout", () => {
    render(
      <PayPanel
        clientSecret="cs_test_123"
        totalLabel="$100.00"
        onClosed={() => {}}
      />
    );

    expect(
      screen.getByText(/payments are not configured on this deployment/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY/)
    ).toBeInTheDocument();
  });

  it("offers the edit-booking escape hatch", async () => {
    const user = userEvent.setup();
    const onClosed = vi.fn();

    render(
      <PayPanel clientSecret="cs_test_123" totalLabel="$100.00" onClosed={onClosed} />
    );

    await user.click(screen.getByRole("button", { name: /edit booking/i }));
    expect(onClosed).toHaveBeenCalledTimes(1);
  });
});
