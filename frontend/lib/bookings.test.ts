import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    token: vi.fn(),
  },
}));

import { authClient } from "@/lib/auth-client";
import { createBooking, fetchQuote, fetchSessionStatus } from "@/lib/bookings";

const tokenMock = vi.mocked(authClient.token);

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

beforeEach(() => {
  tokenMock.mockResolvedValue({
    data: { token: "tok_book" },
    error: null,
  } as never);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const quoteBody = {
  carId: "koenigsegg",
  pickup: { location: "NYC", date: "2026-11-01", time: "10:00" },
  dropoff: { location: "NYC", date: "2026-11-04", time: "10:00" },
  promoCode: null,
};

describe("fetchQuote", () => {
  it("POSTs /api/v1/quotes without Authorization (public)", async () => {
    const fetchMock = stubFetch({
      days: 3,
      subtotalCents: 29700,
      discountCents: 0,
      totalCents: 29700,
      currency: "usd",
    });

    const quote = await fetchQuote(quoteBody);

    expect(quote.totalCents).toBe(29700);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/api/v1/quotes");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(init.body).toBe(JSON.stringify(quoteBody));
  });
});

describe("createBooking", () => {
  it("POSTs /api/v1/bookings with Bearer JWT", async () => {
    const fetchMock = stubFetch({ sessionId: "cs_test_1", clientSecret: "cs_test_secret_1" });

    const body = {
      ...quoteBody,
      billingName: "A",
      billingPhone: "555",
      billingAddress: "st",
      billingCity: "NYC",
      agreedToTerms: true,
      agreedToMarketing: false,
    };
    const session = await createBooking(body);

    expect(session.sessionId).toBe("cs_test_1");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/api/v1/bookings");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok_book");
  });
});

describe("fetchSessionStatus", () => {
  it("GETs session-status with encoded session_id and no auth", async () => {
    const fetchMock = stubFetch({ status: "complete", paymentStatus: "paid" });

    const status = await fetchSessionStatus("cs_test/a b");

    expect(status).toEqual({ status: "complete", paymentStatus: "paid" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "http://localhost:8000/api/v1/checkout/session-status?session_id=cs_test%2Fa%20b"
    );
    expect(init.method).toBe("GET");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });
});
