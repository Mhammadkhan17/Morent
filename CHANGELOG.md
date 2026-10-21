# Changelog

All notable changes to Morent are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); dates are UTC.

## [Unreleased] — 2026-10-21

### Explore — filters survive everything
- Filters are now URL-derived (type, transmission, capacity, price, q): refresh,
  back/forward, and shared links all restore state; no local-mirror effects.
- Price slider commits on release (`onValueCommit`); dragging never churns the URL.
- "Clear all filters" (sidebar + empty state) and "Try again" on catalogue load failure.
- Search query shows a "Clear search" link; empty state shares one honest card.

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
- Mobile: rental summary ordered above the confirm/pay stack.

### Copy — factual service-manual voice
- Hero, footer, root metadata, and Confirmation step rewritten; marketing claims
  removed; duplicate trust blocks deduped to one honest Stripe statement.

### Admin analytics
- Apply range shows "Applying…", disables while fetching, ignores stale responses,
  recovers from errors; charts use the data palette (chart-1/2/4/5).

### Design system
- `DESIGN.md` + `PRODUCT.md` + `.impeccable/` (design.json, critique) committed as
  the normative reference; `.gitignore` covers impeccable ephemeral state.
- Rating stars → Cobalt (`text-primary`); `rounded-2xl` → `rounded-xl` (Pickup
  section, loading skeleton).

### Tests & gates
- 62 frontend tests (10 files) covering explore filtering, rental draft, api error
  normalization, validation, and rental summary; `npm run lint` and `npm run build`
  green.
