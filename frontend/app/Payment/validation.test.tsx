import { describe, expect, it } from "vitest";
import {
  FIELD_ORDER,
  LIMITS,
  fieldElementId,
  todayISO,
  validateField,
  validateForm,
  type PaymentFormData,
} from "@/app/Payment/validation";

const base: PaymentFormData = {
  billingInfo: {
    name: "Ada Lovelace",
    phone: "+44 20 7946 0958",
    address: "12 Analytical Row",
    city: "London",
  },
  rentalInfo: {
    pickup: { location: "London, UK", date: "2030-01-10", time: "10:00" },
    dropoff: { location: "London, UK", date: "2030-01-12", time: "10:00" },
  },
  agreedToMarketing: false,
  agreedToTerms: true,
};

const billing = (overrides: Partial<PaymentFormData["billingInfo"]>) => ({
  ...base,
  billingInfo: { ...base.billingInfo, ...overrides },
});

describe("billing validation", () => {
  it("accepts a normal name and rejects a single character", () => {
    expect(validateField("billingInfo.name", base)).toBeNull();
    expect(validateField("billingInfo.name", billing({ name: "A" }))).toMatch(
      /at least 2 characters/
    );
  });

  it("enforces the name length cap", () => {
    expect(
      validateField(
        "billingInfo.name",
        billing({ name: "n".repeat(LIMITS.name) })
      )
    ).toBeNull();
    expect(
      validateField(
        "billingInfo.name",
        billing({ name: "n".repeat(LIMITS.name + 1) })
      )
    ).toMatch(/80 characters or fewer/);
  });

  it("requires actual digits, not just phone punctuation", () => {
    // The old regex accepted seven open parens.
    expect(
      validateField("billingInfo.phone", billing({ phone: "(((((((" }))
    ).toMatch(/at least 7 digits/);
    expect(
      validateField("billingInfo.phone", billing({ phone: "555 123 4567" }))
    ).toBeNull();
    expect(
      validateField("billingInfo.phone", billing({ phone: "+49 (0) 170 123-4567" }))
    ).toBeNull();
    expect(
      validateField("billingInfo.phone", billing({ phone: "call me" }))
    ).toMatch(/digits only/);
  });

  it("caps the digit count at a real E.164 length", () => {
    expect(
      validateField(
        "billingInfo.phone",
        billing({ phone: "1".repeat(16) })
      )
    ).toMatch(/at most 15 digits/);
  });

  it("treats whitespace-only address and city as empty", () => {
    expect(
      validateField("billingInfo.address", billing({ address: "   " }))
    ).toBe("Enter your address.");
    expect(validateField("billingInfo.city", billing({ city: "   " }))).toBe(
      "Enter your town or city."
    );
    expect(
      validateField(
        "billingInfo.address",
        billing({ address: "a".repeat(LIMITS.address + 1) })
      )
    ).toMatch(/200 characters or fewer/);
  });
});

describe("rental date validation", () => {
  const toISO = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  it("rejects past dates using the same clock as the inputs' min attribute", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    expect(
      validateField("rentalInfo.pickup.date", {
        ...base,
        rentalInfo: {
          ...base.rentalInfo,
          pickup: { ...base.rentalInfo.pickup, date: toISO(yesterday) },
        },
      })
    ).toMatch(/can't be in the past/);
    expect(todayISO()).toBe(toISO(new Date()));
  });

  it("requires drop-off on or after pickup", () => {
    const errors = validateForm({
      ...base,
      rentalInfo: {
        pickup: { ...base.rentalInfo.pickup, date: "2030-01-12" },
        dropoff: { ...base.rentalInfo.dropoff, date: "2030-01-10" },
      },
    });
    expect(errors["rentalInfo.dropoff.date"]).toMatch(/on or after pickup/);
  });

  it("requires a strictly later time when the dates match", () => {
    const errors = validateForm({
      ...base,
      rentalInfo: {
        pickup: { ...base.rentalInfo.pickup, date: "2030-01-10", time: "10:00" },
        dropoff: { ...base.rentalInfo.dropoff, date: "2030-01-10", time: "10:00" },
      },
    });
    expect(errors["rentalInfo.dropoff.time"]).toMatch(/after pickup/);
    expect(
      validateField("rentalInfo.dropoff.time", {
        ...base,
        rentalInfo: {
          pickup: { ...base.rentalInfo.pickup, date: "2030-01-10", time: "10:00" },
          dropoff: { ...base.rentalInfo.dropoff, date: "2030-01-10", time: "11:00" },
        },
      })
    ).toBeNull();
  });
});

describe("form-level behaviour", () => {
  it("returns no errors for a complete valid form", () => {
    expect(validateForm(base)).toEqual({});
  });

  it("reports every missing field in visual order", () => {
    const errors = validateForm({
      billingInfo: { name: "", phone: "", address: "", city: "" },
      rentalInfo: {
        pickup: { location: "", date: "", time: "" },
        dropoff: { location: "", date: "", time: "" },
      },
      agreedToMarketing: false,
      agreedToTerms: false,
    });
    expect(Object.keys(errors)).toEqual(FIELD_ORDER);
  });

  it("maps every field path to a focusable element id", () => {
    expect(fieldElementId("billingInfo.name")).toBe("billing-name");
    expect(fieldElementId("rentalInfo.pickup.date")).toBe("pickup-date");
    expect(fieldElementId("rentalInfo.dropoff.time")).toBe("dropoff-time");
  });
});
