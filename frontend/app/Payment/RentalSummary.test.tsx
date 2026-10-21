import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import RentalSummary from "@/app/Payment/RentalSummary";
import { makeCar } from "@/test/fixtures";

const setup = (overrides: Partial<Parameters<typeof RentalSummary>[0]> = {}) => {
  const props = {
    car: makeCar(),
    quote: null,
    promoCode: "",
    onPromoCodeChange: vi.fn(),
    onApplyPromo: vi.fn(),
    ...overrides,
  };
  render(<RentalSummary {...props} />);
  return props;
};

describe("RentalSummary hardening", () => {
  it("applies a promo code when the promo form is submitted", async () => {
    const user = userEvent.setup();
    const onApplyPromo = vi.fn();
    setup({ promoCode: "SAVE10", onApplyPromo });

    await user.click(screen.getByRole("button", { name: /apply now/i }));

    expect(onApplyPromo).toHaveBeenCalledTimes(1);
  });

  it("submits the promo form on Enter (jsdom has no implicit submission)", () => {
    const onApplyPromo = vi.fn();
    setup({ promoCode: "SAVE10", onApplyPromo });

    const form = screen.getByLabelText("Apply promo code").closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    expect(onApplyPromo).toHaveBeenCalledTimes(1);
  });

  it("does not offer an apply action for an empty code", () => {
    setup({ promoCode: "   " });
    expect(screen.getByRole("button", { name: /apply now/i })).toBeDisabled();
  });

  it("locks promo entry while a checkout session is open", () => {
    setup({ promoCode: "SAVE10", disabled: true });

    expect(screen.getByLabelText("Apply promo code")).toBeDisabled();
    expect(screen.getByRole("button", { name: /apply now/i })).toBeDisabled();
  });

  it("shows the pricing failure and a way back when one is provided", async () => {
    const user = userEvent.setup();
    const onRetryQuote = vi.fn();
    setup({ quoteError: "We couldn't price this rental.", onRetryQuote });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn't price this rental."
    );
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetryQuote).toHaveBeenCalledTimes(1);
  });
});
