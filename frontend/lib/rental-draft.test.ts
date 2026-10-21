// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  consumeRentalDraft,
  emptyRentalDraft,
  saveRentalDraft,
  type RentalDraft,
} from "@/lib/rental-draft";

const sample: RentalDraft = {
  pickup: { location: "New York, USA", date: "2026-11-01", time: "10:00" },
  dropoff: { location: "London, UK", date: "2026-11-05", time: "18:00" },
};

function stubWindowSessionStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
    },
  });
  return store;
}

beforeEach(() => {
  stubWindowSessionStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("rental draft", () => {
  it("round-trips a saved draft", () => {
    saveRentalDraft(sample);
    expect(consumeRentalDraft()).toEqual(sample);
  });

  it("is one-shot: consuming clears storage", () => {
    saveRentalDraft(sample);
    expect(consumeRentalDraft()).toEqual(sample);
    expect(consumeRentalDraft()).toBeNull();
  });

  it("returns null when nothing was saved", () => {
    expect(consumeRentalDraft()).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    stubWindowSessionStorage({ "morent:rental-draft": "{not json" });
    expect(consumeRentalDraft()).toBeNull();
  });

  it("returns null when sides are missing or wrongly typed", () => {
    stubWindowSessionStorage({
      "morent:rental-draft": JSON.stringify({ pickup: sample.pickup }),
    });
    expect(consumeRentalDraft()).toBeNull();

    stubWindowSessionStorage({
      "morent:rental-draft": JSON.stringify({
        pickup: { location: 1, date: "", time: "" },
        dropoff: sample.dropoff,
      }),
    });
    expect(consumeRentalDraft()).toBeNull();
  });

  it("emptyRentalDraft matches the Payment initial shape", () => {
    expect(emptyRentalDraft()).toEqual({
      pickup: { location: "", date: "", time: "" },
      dropoff: { location: "", date: "", time: "" },
    });
  });

  it("save and consume are no-ops without window (SSR)", () => {
    vi.unstubAllGlobals();
    expect(() => saveRentalDraft(sample)).not.toThrow();
    expect(consumeRentalDraft()).toBeNull();
  });
});
