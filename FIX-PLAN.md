# Temporary Fix Plan — Navbar / Hero / Payment UX (2026-10-19)

> Temporary working plan for this fix batch — **not** a core plan (core plans live
> in `plans/`). Tick boxes as items land. Order: A → F. Gates after every phase.

## A. Backend — supersede own pending booking (seam user-confirmed, TDD) ✅ DONE

Problem: `assert_no_overlap` counts the caller's **own** `pending` bookings →
after the first "Rent now", any edit + re-click = `409 "Car is already booked"`
against yourself until the Stripe session expires (~24h).

- [x] Tests first (`backend/tests/test_bookings.py`):
  - [x] `POST /bookings` twice, same user + same car (new dates) → 2nd = **201**,
        1st booking `pending → cancelled`, fake Stripe records `expire` on old session.
  - [x] Failed rebook (someone else's pending) → **409** and my pending + session untouched.
  - [x] Status change goes through `transition()` only (actor `"superseded"` → no notifications).
- [x] `StripeService.expire_checkout_session()` → SDK `sessions.expire_async`,
      failures ignored (session may already be expired).
- [x] `services/booking.py::create_booking`: `assert_no_overlap(exclude_user_id=me)`
      runs **before** `supersede_own_pending(...)` (validation never mutates).
- [x] Gates: `uv run pytest` **91/91**, `uv run ruff check .` clean.

## B. Navbar — useful icons, compact account

| Junk today | Fix |
|---|---|
| Dead `BellDot` beside real `NotificationBell` (two bells) | Remove dead one; **real bell moves into the actions row** — one bell, always in same spot |
| Dead **Heart** (no-op) | `lib/favorites.ts` (localStorage + `useSyncExternalStore`, cached snapshot) → `FavoritesMenu`: count badge + dropdown of saved cars (thumb + name → `/cars/[id]`), empty-state hint. Car-detail heart (`cars/[id]/page.tsx`) persists to store instead of per-render state |
| Dead **Settings** (no-op) | `SettingsMenu`: dropdown with **Light / Dark / System** theme radio (tokens define `.dark`; `darkMode: ["class"]`), persisted in localStorage; inline pre-hydration script in root layout → no flash |
| Inline email + Sign out + Admin in header | **Avatar = dropdown trigger** (`AuthArea` slimmed): label = name + email, items = Admin (owner only) + Sign out |

- [x] `lib/favorites.ts` + `FavoritesMenu.tsx`
- [x] Car-detail heart wired to store
- [x] `lib/theme.ts` + `SettingsMenu.tsx` + layout pre-hydration script
- [x] `AuthArea.tsx` → avatar dropdown (bell removed from here)
- [x] `header.tsx` actions row = FavoritesMenu + NotificationBell + SettingsMenu (desktop **and** mobile sheet); dead `actionButtons` map deleted
- [x] Favorites/settings work signed-out; bell only when signed in (existing gate)

## C. Hero — exact 640×360, text overlaid on card

- [x] `app/page.tsx`: move `<TopSection/>` out of the `max-w-7xl` wrapper;
      TopSection owns container `mx-auto max-w-[1376px] px-4/6/8`
      (640 + 640 + 32 gap + 64 padding = 1376 → cards exactly 640 wide).
- [x] Both cards: `relative h-[360px] w-full max-w-[640px] overflow-hidden rounded-xl`;
      **text block absolutely positioned on the card face** (top-left over
      decorative background), car image absolute bottom-right, CTA inside text
      block for both cards. Height fixed 360 at every breakpoint; width shrinks
      with the column below 1376.

## D. Payment — field validation (inline, blur)

- [x] New `app/Payment/validation.ts`: name ≥2 chars · phone
      `^\+?[\d\s()-]{7,}$` · address/city required · location/date/time required ·
      dates not in past · drop-off date+time ≥ pickup.
- [x] `page.tsx`: `errors` state; change clears that field's error; blur
      validates that field; full validate on submit → focus first
      `aria-invalid` element.
- [x] `BillingInfo.tsx` / `RentalInfo.tsx`: accept `errors` + `onBlurField`;
      per-field `role="alert"` message + `aria-invalid` + destructive border
      (skill rules: error near field, validate on blur, not submit-only).
- [x] Terms check with invalid fields surfaces inline errors (no silent no-op).

## E. Payment — Stripe card loads when info is filled (not after first click)

- [x] Refactor `handleSubmit` → `prepareBooking()`:
      car + quote + terms + clean validation → `POST /bookings` →
      `clientSecret` → auto-scroll to panel; keep existing 409/401/422 error map.
- [x] Auto-prepare effect: `!clientSecret && terms && quote && valid` →
      debounce 700ms → `prepareBooking`. Payload-signature dedupe (no double
      POST); reset on terms uncheck. Any priced edit clears secret → re-prepare
      (phase A supersedes the old pending instead of 409).
- [x] Result: fill everything → check terms → card panel mounts on its own.
- [x] "Rent now" remains as instant manual trigger/fallback (shows
      "Processing…" while auto-prepare runs); unchecking terms reverts panel.

## F. Gates → verify → commit (on user go-ahead)

- [x] Backend: `uv run ruff check .` + `uv run pytest` (91/91)
- [x] Frontend: `npm run lint` + `npm run build` + `npx vitest run` (15/15)
- [x] Live checks on dev server (navbar, theme, hero) — `/` 200, new actions
      row + 640×360 hero markup confirmed in served HTML; user click-through
      of `/Payment` (auth-gated) still welcome
- [x] Changelog entry (new section at end of `Changelog.md`)
- [ ] Commit/push **only when user says so**
 