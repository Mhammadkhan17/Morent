export interface RentalSideDraft {
  location: string;
  date: string;
  time: string;
}

export interface RentalDraft {
  pickup: RentalSideDraft;
  dropoff: RentalSideDraft;
}

const STORAGE_KEY = "morent:rental-draft";

const emptySide = (): RentalSideDraft => ({ location: "", date: "", time: "" });

export const emptyRentalDraft = (): RentalDraft => ({
  pickup: emptySide(),
  dropoff: emptySide(),
});

function isSide(value: unknown): value is RentalSideDraft {
  if (typeof value !== "object" || value === null) return false;
  const side = value as Record<string, unknown>;
  return (
    typeof side.location === "string" &&
    typeof side.date === "string" &&
    typeof side.time === "string"
  );
}

function parseDraft(raw: string | null): RentalDraft | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const draft = parsed as Record<string, unknown>;
    if (!isSide(draft.pickup) || !isSide(draft.dropoff)) return null;
    return { pickup: draft.pickup, dropoff: draft.dropoff };
  } catch {
    return null;
  }
}

export function saveRentalDraft(draft: RentalDraft): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

/** Reads and clears the one-shot draft seeded by the home booking bar. */
export function consumeRentalDraft(): RentalDraft | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  window.sessionStorage.removeItem(STORAGE_KEY);
  return parseDraft(raw);
}
