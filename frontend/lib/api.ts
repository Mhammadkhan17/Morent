import { authClient } from "@/lib/auth-client";

// Server: BACKEND_URL service binding (Vercel) with localhost fallback for dev.
// Browser: same-origin path — NEXT_PUBLIC_API_BASE_URL is "" in prod so requests
// ride the /api/* rewrite; local dev points at localhost:8000 directly.
export function apiBase(): string {
  if (typeof window === "undefined") {
    return (process.env.BACKEND_URL ?? "http://localhost:8000").replace(/\/$/, "");
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data, error } = await authClient.token();
  const token = data?.token;
  if (error || !token) {
    const next = encodeURIComponent(
      `${window.location.pathname}${window.location.search}`
    );
    // Plain module — no router available; full reload restores auth cookie state
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`${window.location.origin}/login?next=${next}`);
    throw new ApiError(401, "Not signed in");
  }
  return { Authorization: `Bearer ${token}` };
}

/** True when a request was stopped early (client-side timeout or unmount). */
export function isAbortError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: unknown }).name === "AbortError"
  );
}

/**
 * Turns a FastAPI error `detail` into one readable sentence. `detail` arrives
 * as a string, an object, or a list of `{loc, msg}` items — passing it through
 * `Error`'s constructor would stringify the list as `[object Object]`.
 */
function detailMessage(detail: unknown): string | null {
  const text = (value: unknown): string | null =>
    typeof value === "string" && value.trim()
      ? /[.!?]$/.test(value.trim())
        ? value.trim()
        : `${value.trim()}.`
      : null;

  if (!detail) return null;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) =>
        text(item) ??
        (item && typeof item === "object" ? text((item as { msg?: unknown }).msg) : null)
      )
      .filter((part): part is string => part !== null);
    return parts.length > 0 ? parts.join(" ") : null;
  }
  if (typeof detail === "object") {
    return text((detail as { msg?: unknown }).msg);
  }
  return null;
}

/**
 * A message a person can act on: the server's own detail when there is one,
 * then connectivity problems, then the caller's fallback.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "You're offline. Reconnect to the internet and try again.";
  }
  if (err instanceof ApiError && err.message.trim()) {
    return err.message;
  }
  if (isAbortError(err)) {
    return "The request took too long and was stopped. Check your connection and try again.";
  }
  if (err instanceof TypeError) {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  return fallback;
}

async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    auth?: boolean;
    signal?: AbortSignal;
  } = {}
): Promise<T> {
  const { method = "GET", body, auth = true, signal } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    Object.assign(headers, await getAuthHeaders());
  }
  const res = await fetch(`${apiBase()}/api/v1${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });
  if (!res.ok) {
    let detail: unknown;
    try {
      const payload = (await res.json()) as { detail?: unknown };
      detail = payload.detail;
    } catch {
      // non-JSON error body
    }
    throw new ApiError(
      res.status,
      detailMessage(detail) || res.statusText || "Request failed"
    );
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export interface RequestOptions {
  auth?: boolean;
  signal?: AbortSignal;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { method: "POST", body, ...options }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
