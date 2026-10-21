import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    token: vi.fn(),
  },
}));

import { authClient } from "@/lib/auth-client";
import { ApiError, api, apiErrorMessage } from "@/lib/api";

const tokenMock = vi.mocked(authClient.token);

function mockFetchOnce(payload: unknown, ok = true, status = 200) {
  const res = {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: async () => payload,
  };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res));
  return vi.mocked(fetch);
}

const windowAssign = vi.fn();

beforeEach(() => {
  tokenMock.mockResolvedValue({
    data: { token: "tok_abc123" },
    error: null,
  } as never);
  vi.stubGlobal("fetch", vi.fn());
  vi.stubGlobal("window", {
    location: {
      pathname: "/Payment",
      search: "",
      origin: "http://localhost:3000",
      assign: windowAssign,
    },
  });
  windowAssign.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("api auth header", () => {
  it("returns undefined for 204 responses without parsing a body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      statusText: "No Content",
      json: async () => {
        throw new Error("204 must not parse json");
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.delete("/admin/cars/x")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("sends Bearer token string from authClient.token().data.token", async () => {
    tokenMock.mockResolvedValue({
      data: { token: "tok_abc123" },
      error: null,
    } as never);
    const fetchMock = mockFetchOnce({ ok: true });

    await api.get("/me");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok_abc123");
    expect(headers.Authorization).not.toContain("[object Object]");
  });

  it("throws ApiError 401 and redirects when token is missing", async () => {
    tokenMock.mockResolvedValue({
      data: null,
      error: { message: "no session" },
    } as never);

    await expect(api.get("/me")).rejects.toMatchObject({
      status: 401,
      message: "Not signed in",
    });
    expect(windowAssign).toHaveBeenCalledWith(
      "http://localhost:3000/login?next=%2FPayment"
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("omits Authorization for public requests", async () => {
    const fetchMock = mockFetchOnce([]);

    await api.get("/cars", { auth: false });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(headers["Content-Type"]).toBe("application/json");
  });
});

describe("api request shape", () => {
  it("prefixes /api/v1 and uses NEXT_PUBLIC_API_BASE_URL default", async () => {
    const fetchMock = mockFetchOnce({ status: "ok" });

    await api.get("/health", { auth: false });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("http://localhost:8000/api/v1/health");
  });

  it("uses BACKEND_URL binding on the server and trims trailing slash", async () => {
    process.env.BACKEND_URL = "https://backend.internal/";
    vi.stubGlobal("window", undefined);
    const fetchMock = mockFetchOnce({ status: "ok" });

    try {
      await api.get("/health", { auth: false });
    } finally {
      delete process.env.BACKEND_URL;
    }

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("https://backend.internal/api/v1/health");
  });

  it("surfaces backend detail on non-OK as ApiError", async () => {
    mockFetchOnce({ detail: "Overlap with an existing booking" }, false, 409);

    const err = await api.post("/bookings", {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(409);
    expect((err as ApiError).message).toBe("Overlap with an existing booking");
  });

  it("JSON-encodes POST bodies", async () => {
    const fetchMock = mockFetchOnce({ days: 3 }, false, 422);

    await api.post("/quotes", { carId: "koenigsegg" }, { auth: false }).catch(() => undefined);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ carId: "koenigsegg" }));
  });
});

describe("apiErrorMessage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a plain string detail verbatim", () => {
    expect(
      apiErrorMessage(new ApiError(409, "Car is not available"), "fallback")
    ).toBe("Car is not available");
  });

  it("turns FastAPI's detail array into readable sentences", async () => {
    mockFetchOnce(
      {
        detail: [
          { loc: ["body", "promoCode"], msg: "Unknown or inactive promo code" },
        ],
      },
      false,
      422
    );

    const err = await api.post("/quotes", {}, { auth: false }).catch((e) => e);
    expect(apiErrorMessage(err, "fallback")).toBe(
      "Unknown or inactive promo code."
    );
  });

  it("says so when the browser is offline instead of blaming the form", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(apiErrorMessage(new TypeError("Failed to fetch"), "fallback")).toBe(
      "You're offline. Reconnect to the internet and try again."
    );
  });

  it("explains a network failure rather than surfacing the raw error", () => {
    expect(apiErrorMessage(new TypeError("Failed to fetch"), "fallback")).toBe(
      "Couldn't reach the server. Check your connection and try again."
    );
  });

  it("explains a request that was aborted or timed out", () => {
    const abort = new Error("The operation was aborted.");
    abort.name = "AbortError";
    expect(apiErrorMessage(abort, "fallback")).toMatch(/took too long/);
  });

  it("falls back to the caller's message for unknown failures", () => {
    expect(apiErrorMessage(new Error("boom"), "fallback")).toBe("fallback");
  });
});
