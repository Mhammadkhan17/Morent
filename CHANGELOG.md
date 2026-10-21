# Changelog

All notable changes to Morent are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); dates are UTC.

## [Unreleased] — 2026-10-21

### Explore — filters survive everything
- Filters are now URL-derived (type, transmission, capacity, price, q): refresh,
  back/forward, and shared links all restore state; no local-mirror effects.
- Price slider commits on release (`onValueCommit`); dragging never churns the URL.
- Hand-typed `?capacity=8+` (plus decoded as a space) and junk filter values fall
  back safely instead of silently dropping the filter.
- "Clear all filters" (sidebar + empty state) and "Try again" on catalogue load
  failure via the shared `LoadErrorCard` (moved to `app/components/`; title is
  now required and accurate per surface — inbox no longer claims bookings).
- Search query shows a "Clear search" link; empty state shares one honest card.
- Car cards show a quiet "photo unavailable" placeholder when an image 404s
  instead of an endless skeleton; the slider thumb carries its accessible name.
- Explore regression tests cover URL restore, clear-all, invalid params, and
  load-error retry recovery.

### Payment — resilient checkout
- Rental draft is read without being consumed (`readRentalDraft`); cleared only after
  the booking is created, so a bounce mid-flow no longer wipes pickup details.
- Car/quote/booking fetches get 10–20s timeouts + AbortControllers; FastAPI `detail`
  arrays normalized into readable messages; retry ("Try again", auto-retry on online).
- Double-submit guard; form locked while a Stripe session is open; stale submit
  errors cleared on edit/promo apply; missing-car error shown at the submit action.
- Validation: length limits, real phone check, date `min`/today bounds.
- Completion page never claims success unless `paymentStatus === "paid"` (new
  `processing` state, honest copy, retry); success CTA goes to /account/bookings.
- A11y: `maxLength`, `disabled` plumbing, `autoComplete`, promo Enter-submit,
  `aria-live` total, focus targets on error/success, `aria-busy` during submits.
- Mobile: rental summary is DOM-first so price precedes the confirm/pay stack
  for eyes, keyboard, and screen readers (previous `order-first` fix only moved
  visuals — tab order still started with the form); `lg:order-1/2` restores
  form-left, sticky summary-right on desktop, and the loading skeleton mirrors
  the same order.

### Copy — factual service-manual voice
- Hero, footer, root metadata, and Confirmation step rewritten; marketing claims
  removed; duplicate trust blocks deduped to one honest Stripe statement.
- Follow-up clarify: dropped residual "pay securely" / "instant quote" claims;
  hero right card states the one-page flow without sales framing; footer line
  uses plain sentences; rating rows say "Demo rating" (not "Sample reviews");
  reviews section badge/count say "Demo data" / "n demo reviews".

### Admin analytics
- Apply range shows "Applying…", disables while fetching, ignores stale responses,
  recovers from errors; charts use the data palette (chart-1/2/4/5).
- Refresh re-enters loading reliably (`reloadKey` forces refetch even when the
  range is unchanged); existing charts stay visible under a dimmed "Updating…"
  overlay instead of collapsing to a skeleton; a failed refresh keeps the
  last-good data alongside the error alert.

### Design system
- `DESIGN.md` + `PRODUCT.md` + `.impeccable/` (design.json, critique) committed as
  the normative reference; `.gitignore` covers impeccable ephemeral state.
- Rating stars → Cobalt (`text-primary`); `rounded-2xl` → `rounded-xl` (Pickup
  section, loading skeleton).
- Drift follow-up: RentalSummary reuses the shared `RatingStars` component,
  Pick-Up swap button inherits control radius, PaymentMethod blocks carry one
  claim each (when/where · what · Stripe never stores details), BarList default
  bar color → `bg-chart-1` (data palette, not the action color).

### Tests & gates
- 71 frontend tests (11 files) covering explore filtering/URL state/retry,
  rental draft, api error normalization, validation, load-error card, rental
  summary, and analytics loading/refresh; `npm run lint` and `npm run build`
  green.
