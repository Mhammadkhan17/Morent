# Changelog — Morent Frontend Revival Session

All notable work from the development session reviving the Morent car-rental
project (old hackathon codebase → redesigned, asset-wired, feature-complete
frontend). This file is tracked by git (its header previously — and wrongly —
claimed local-only; resolved 2026-10-19).

Session dates: 2026-10-15 → 2026-10-17
Working dir: `/home/user/projects/Morent` · Stack: Next.js 16.4.1, React 19,
Tailwind v3, shadcn (new-york/zinc), lucide-react, Plus Jakarta Sans
Plan/status log maintained at: `plans/frontend/redesign-plan.md` (also git-ignored)

---

## Backend revival — M0–M3 (2026-10-16)

Skills loaded: `fastapi`, `fastapi-templates`, `neon`, `neon-auth`, `neon-postgres`,
`codebase-design`, `grill-me`, `grill-with-docs`, `improve-codebase-architecture`,
`tdd`. Plans written + grilled + architecture-reviewed (`plans/backend-plan.md`,
`plans/backend/FastAPI-plan.md`, `plans/backend/Stripe-plan.md`,
`plans/backend/Dashboard-plan.md`, `plans/frontend/better-auth.md`,
`plans/todo.md`).

### M0 Provisioning

- Neon project **Morent** (`plain-pine-91770545`, aws-us-east-2, free plan).
  Development branch `br-curly-dust-b58sx7ru` used for local work; production
  branch left clean.
- Env split per plan: `backend/.env` (pooled + unpooled DATABASE_URL,
  Stripe secret, FRONTEND_ORIGIN, AUTH_BASE_URL) and `frontend/.env.local`
  (DB server-only, BETTER_AUTH_URL/SECRET generated, NEXT_PUBLIC_API_BASE_URL,
  Stripe publishable). `.env.example` files written for both; `.gitignore`
  already covers real env files.
- Root `.env` had a stale `DATABASE_URL` pointing at an old endpoint
  (`ep-billowing-heart-…` vs live `ep-weathered-scene-…`); resolved via Neon
  MCP — Development branch is authoritative (`ep-billowing-heart-b5c2guzd`
  on that branch). Stripe test keys verified (`sk_test_`/`pk_test_`).
- `stripe listen` / `whsec_…` capture deferred to M4 (CLI not installed yet).

### M1 FastAPI skeleton

- uv project in `backend/` (Python 3.12.14); deps: fastapi[standard],
  sqlmodel, alembic, psycopg[binary], pydantic-settings, stripe,
  fastapi-betterauth, httpx; dev: pytest, pytest-asyncio, ruff, aiosqlite.
  Ruff + pytest + `[tool.fastapi]` entrypoint configured.
- App factory (`app/main.py`): CORS (FRONTEND_ORIGIN only), lifespan pool
  dispose, root `GET /` banner, api_router under `/api/v1`.
- `core/config.py` (pydantic-settings, fail-fast), `core/db.py` (async
  SQLModel session DI). Stub routers: health, cars, quotes, bookings,
  checkout, webhooks.
- Gates: ruff clean, tests green.

### M3 Better Auth (verified working)

- Self-hosted better-auth 1.7.10 in Next.js: `lib/auth.ts` (email/password,
  conditional Google, `jwt()` plugin), `app/api/auth/[...all]/route.ts`,
  `lib/auth-client.ts` (react + `jwtClient()`), `lib/AuthProvider.tsx`
  wired into root layout.
- `/login` page (sign-in/sign-up toggle, `?next=` restore, Google button
  only when env set). Header: signed out → "Sign in"; signed in → avatar +
  email + Sign out. `/Payment` login gate redirects to `/login?next=…`.
- `lib/api.ts` SDK-style fetch wrapper attaching Bearer JWT.
- Backend: `core/security.py` (`fastapi-betterauth` JWKS verifier) +
  `GET /api/v1/me` gate endpoint.
- DB: better-auth CLI broken for v1.7 (deprecated `@better-auth/cli`) —
  created `user`/`session`/`account`/`verification` + plugin `jwks` table
  directly via Neon MCP with Better Auth's standard Postgres schema.
- pg Pool hardened for Neon cold starts (`connectionTimeoutMillis: 10s`,
  keepalive). `sslmode=require` → `verify-full` (silences pg v9 deprecation).
- Renamed `hackathon-03` → `morent-frontend` in package.json/lock.
- User verified: sign-up → sign-in → session persists across reload →
  sign-out → login-gate round-trip. Gates: lint 0/0, build passes,
  backend ruff clean + 5/5 tests.

### M2 Schema + seed

- SQLModel `Car` (display + Decimal money fields, JSON images/tags,
  status enum) + `PromoCode`. Alembic init; initial migration
  `6b5cd5924f90_cars_and_promo_codes` applied to Development branch via
  **unpooled** URL (pooled breaks session state — per neon-postgres skill).
- One-time fixture: `scripts/fixtures/cars.json` exported from
  `frontend/lib/cars.ts` (`_id`→`id`, `"$99.00"`→`99.00`).
- `scripts/seed.py`: idempotent upsert of 7 cars + `DISCOUNT10` (10%);
  re-run safe. Verified live against Neon + in tests.
- Tests: health, seed idempotency, cars list/detail/404, fixture shape
  (5 passed). Money serialized as JSON numbers (Decimal field_serializer).
- `backend/requirements.txt` written (full venv freeze, 76 packages).
- Root `GET /` returns `{"message": "Morent FastAPI backend is running"}`.

### M4 Payments + API catalogue (2026-10-16 → 2026-10-17)

Skills: `fastapi`, `stripe`, `tdd`. Plans: `plans/backend/Stripe-plan.md`,
`plans/backend/FastAPI-plan.md` §M4.

**Backend (ruff clean · 44/44 pytest):**

- Models + migration `2fbeb566ad69_bookings_and_payments`: `Booking`
  (cents columns, status machine), `Payment` (FK → booking); user FK →
  `"user".id`.
- `services/pricing.py` — day math, promo (`DISCOUNT10` server-side only),
  cent rounding. `POST /api/v1/quotes` (public).
- `services/booking.py` — validate → price → **overlap 409** → Checkout
  Session `ui_mode="elements"` → `{sessionId, clientSecret}`.
  `return_url` set **server-side** (`/Payment/complete?session_id=…`).
  `POST /api/v1/bookings` [auth] · `GET /api/v1/bookings`.
- `POST /api/v1/webhooks/stripe` — signature verify, idempotent
  `booking_status.apply()`; `checkout.session.completed` /
  `async_payment_succeeded` → `confirmed` + `payments` row (stored totals,
  never re-quote); `expired` → `cancelled`; `async_payment_failed` →
  `failed`. Unknown session → ack no-op. Illegal/duplicate → 200 no-op.
- `GET /api/v1/checkout/session-status`.
- SDK-style Stripe client (stripe-python 16, `StripeClient` —
  `.get()` forbidden on StripeObject).
- `schemas/cars.py` `CarRead` + `car_to_read`: camelCase aliases for the
  frontend (`pricePerDay`, `imageUrl`, `imageMetadata` from w/h); ruff
  FAST001 — response model from return annotation only.

**Frontend (ESLint 0 · build green):**

- Catalogue switch: home, explore, `cars/[id]`, Payment → `GET /api/v1/cars`
  via `lib/api.ts`; `Car` type → `frontend/lib/types.ts`;
  **`frontend/lib/cars.ts` deleted**.
- Two-phase payment: quote (debounced 400ms) → `createBooking` → `PayPanel`
  (`CheckoutElementsProvider` + `PaymentElement`, appearance `#3563E9` /
  Plus Jakarta Sans) → `checkout.confirm()` (**no client `returnUrl`** —
  session already carries server `return_url`; passing both raises).
- `app/Payment/complete/page.tsx` polls session status; early-return UI when
  `session_id` missing. `RentalSummary.tsx` (renamed from `.jsx` — TS syntax)
  calls `/quotes` (fixes no-days-math + client-side promo).
  `PaymentMethod.jsx` → informational shell (copy: card entered after Rent
  now; never stored server-side). Required-field validation;
  `app/api/saveRentalData/` deleted.
- ESLint `react-hooks/set-state-in-effect` fixes: lazy `useState` init,
  single `data` state keyed by fetched `id`, derived `activeQuote`, render
  branches instead of effect setState.

**E2E debugging (user drove UI; agent fixed):**

- `AUTH_BASE_URL` trailing `# comment` glued to value → all JWKS validation
  failed → removed (must equal `BETTER_AUTH_URL` exactly).
- `lib/api.ts` sent `Bearer [object Object]` — `authClient.token()` returns
  `{ token }` → use `data.token`.
- Cars DB rows had empty `imageUrl`/`images` (no `image_metadata` column) —
  restored from `scripts/fixtures/cars.json`.
- Webhook gap: `stripe listen` was up but events never applied (stale
  listener state). Restarted with log capture
  (`/tmp/opencode/stripe-listen.log`); secret matches `backend/.env`
  (`whsec_09a44c09…` — re-capture on every listen restart). Verified live:
  `stripe trigger checkout.session.expired` → `POST …/webhooks/stripe [200]`.
  Replayed both paid `checkout.session.completed` events →
  **2 bookings `confirmed`, 2 `payments` `succeeded`** (third session still
  `open`/unpaid → stays `pending`). Replay ×2 → no duplicate rows.
- Third booking `pending` is an abandoned open session — correct.
- M4 gates: frontend lint+build green; backend ruff clean + 44/44.

### M5 Housekeeping (2026-10-17)

- `plans/todo.md` §3–4 checked (decline-card UI still a manual spot-check:
  `4000000000000002`).
- Changelog stale path fixed (`plans/frontend/redesign-plan.md`); AGENTS.md
  updated (backend scaffolded, commands, structure).

### Webhook E2E — account mismatch fix (2026-10-17)

- Symptom: payments `complete`/`paid` on Stripe but bookings stuck `pending`;
  `stripe listen` printed its secret and never showed `-->` forward lines.
- Root cause: **two sandboxes under one login** — `backend/.env` `sk_test_`
  lives on `acct_1UR84J0…`, CLI was logged into `acct_1UR8401…` (Developer
  sandbox). Listener watched the wrong account.
- Fix: run listen with the app’s key:
  `STRIPE_API_KEY=$(grep ^STRIPE_SECRET_KEY= backend/.env | …) stripe listen …`
  (alias `morent-listen` documented for the user). Re-capture printed
  `whsec_…` → `backend/.env` → restart backend on every listen restart.
- User re-ran a real payment → `checkout.session.completed` forwarded →
  `[200]` → booking `confirmed` + `payments` row. Live E2E green.
- One older paid session also replayed; double-replay stays idempotent.

### Tests + CI hardening (2026-10-17)

Skills: `tdd` (seams proposed and **user-confirmed** before any test).

- **Frontend vitest** (new devDep, `npm test`): 13 tests at confirmed seams —
  - `lib/api.ts`: Bearer uses `data.token` (guards the `[object Object]`
    bug), missing token → 401 + `/login?next=` redirect, public requests
    omit Authorization, backend `detail` → `ApiError`, URL/JSON shape.
  - `lib/bookings.ts`: quote = public POST, booking = authenticated POST,
    session-status = encoded query + no auth.
  - `lib/cars-api.ts`: catalogue reads, id encoding, money literals
    (`formatCents(128700) === "$1,287.00"`).
  - Config: `vitest.config.mts`, `@/` alias, node environment.
- **Backend** (44 → **48**): `tests/test_session_status.py` covers
  `GET /api/v1/checkout/session-status` (open / complete+paid / 404 / 422).
  `FakeSessions.retrieve_async` honors ids containing `complete`/`paid`.
- **CI** `.github/workflows/ci.yml`: frontend job adds `npm test`; new
  **backend** job — `astral-sh/setup-uv@v6` + `uv sync --frozen` →
  `ruff check` → `pytest` with dummy `DATABASE_URL`/Stripe env (tests run
  on in-memory SQLite; no secrets in CI).
- **.gitignore** hardened: `.venv/`, `__pycache__/`, `.pytest_cache/`,
  `.ruff_cache/`, `*.pem`/`*.key`/`credentials.json`/`.stripe/`,
  `stripe-listen.log`. `.env*` + `plans/` already covered; `.env.example`
  and alembic migrations remain tracked.
- Gates after batch: frontend lint clean · build green · vitest 13/13 ·
  backend ruff clean · pytest **48/48**.

## Vercel deployment — full story → green (2026-10-17)

Skills: `deploy-to-vercel`. Research: `research/vercel-fastapi-webhooks-research.md`
(FastAPI on Vercel GA 2026-10-15, zero-config, webhook rules). Plan (with
phase-by-phase records + incidents): `plans/deploy/vercel-plan.md` (P0–P6;
final state in §P2.5). Decisions locked with user: **Stripe path A** (paste test
keys, no Marketplace), **Neon stays on the Development branch** until going live,
**test-branch-first** deploys, one Vercel project in **services** layout.

### Attempt 1 — CLI-created project (superseded)

- Project `morent` created via `vercel link` in `frontend/`, env added; first
  deploy failed on build. Two fixes carried forward from this attempt:
  - `rootDirectory` is a **git-import** concept — irrelevant in services mode.
  - Default `npm install` hits ERESOLVE (vitest@5 wants `@types/node ^22||>=24`,
    repo pins `^20`) → Vercel must use **`installCommand: npm ci`**.
- Preview came up Ready, but the user deleted this project and re-imported the
  repo in the dashboard — Vercel auto-detected the **services** layout (one
  project, `vercel.json` at repo root). Stale `frontend/.vercel/` link removed.

### Strategy A implementation (repo changes, TDD)

- **`vercel.json` (root):**
  - `services.frontend` — nextjs, `frontend/` root, `npm ci`
  - `services.backend` — fastapi, `backend/` root, `entrypoint: app.main:app`
  - Rewrites in order: `/api/auth/(.*)` → frontend (**auth carve-out — without
    it better-auth/JWKS die**), `/api/(.*)` → backend, `/(.*)` → frontend
  - `services.frontend.bindings` → backend as **`BACKEND_URL`**; binding vars
    are Vercel-injected at runtime — never set manually
- **`frontend/lib/api.ts`:** `apiBase()` per-call split — server
  (`typeof window === "undefined"`) reads `BACKEND_URL` binding (slash-trimmed,
  localhost fallback); browser keeps `NEXT_PUBLIC_API_BASE_URL` ("" in prod →
  same-origin rewrite). New vitest server-branch case → **14/14**.
- **Backend (seams user-confirmed per TDD skill):** `config.frontend_url`
  (field name chosen to match binding env `FRONTEND_URL`; pydantic default would
  have looked for `FRONTEND_SERVICE_URL`) + `security._build_better_auth()`:
  JWKS fetch base = `frontend_url or auth_base_url`, **`audience`/`issuer` always
  `auth_base_url`** (public claims). `tests/test_security.py` 2 cases → **50/50**.
- **`.vercel.env`** at repo root: paste-ready env (secrets never printed —
  built by pipeline only). `.gitignore` gained `.vercel/` + `.vercel.env`
  (root `.env*` pattern does **not** cover `.vercel.env` — real file, easy leak).
- ⚠ Side incident: a failing pytest run `AttributeError` printed the full
  `Settings` repr into terminal output (Neon password + Stripe test key visible
  in error text) — flagged for rotation awareness if logs are shared.

### Push flow (user-approved)

- Branch `test` @ **`bb17932`** (7 files, +116/−8, secret-scan clean) →
  fast-forward merge to `main` → both commits CI-green.

### Failure #1 — circular service binding

- Build reached "Deploying outputs", then:
  `experimentalServicesV2 declares a circular service binding:
  frontend -> backend -> frontend` (validator is **undocumented** — absent from
  docs/changelog; research claim "cycles unrestricted" was wrong).
- Fix **`7e9e895`**: backend binding removed (frontend→backend kept — the home
  page's only server-side fetch needs it). JWKS falls back to public
  `auth_base_url` through the already-tested path; A-ready code stays so the
  binding is re-addable if Vercel ever lifts the restriction.

### Failure #2 — backend 500 on every request

- Site deployed, but `GET /api/v1/cars` → 500 `FUNCTION_INVOCATION_FAILED`.
  Dashboard shows no traceback; **full log via CLI**:
  `vercel logs -d <deployment> --request-id <id>` →
  `ValidationError: database_url_unpooled Field required` at module-level
  `Settings()` import → app never boots (no outgoing request — crash at import).
- Two causes (mine to own):
  1. `DATABASE_URL_UNPOOLED` was deliberately excluded from `.vercel.env`
     ("migrations local-only" — true, but the field is **required at import**).
  2. The three URL vars had been pasted with the `YOUR-VERCEL-ORIGIN`
     placeholder still intact (`BETTER_AUTH_URL`, `AUTH_BASE_URL`,
     `FRONTEND_ORIGIN`).

### Fix → verification (successful deployment)

- Env synced via **CLI** (values piped from `.vercel.env`, never displayed):
  `DATABASE_URL_UNPOOLED` added; placeholder trio `rm` + re-added with
  **`https://morent-mu-two.vercel.app`** (exact, no trailing slash). Production
  now holds all **10** vars; secrets also in Preview (user's paste);
  URL trio intentionally absent from Preview until a preview domain exists
  (backend preview deploys will 500 until then — accepted, plan §P3).
- **Vercel snapshots env per deployment → `vercel redeploy`** required after any
  env change (standing deployments never see new values).
- Green on **https://morent-mu-two.vercel.app**:
  - `GET /` → 200
  - `GET /api/v1/cars` → 200 + real Neon JSON (Koenigsegg Jesko …)
  - `GET /api/auth/get-session` → 200, body `null` (anon session; route reaches
    better-auth)
  - Binding proven: function log shows `Calling Service: frontend`
- CI green on `bb17932` + `7e9e895`. Current gates: vitest **14/14** ·
  pytest **50/50** · ruff clean · lint clean · build green.

## M6 Owner dashboard — built (2026-10-18) · E2E checklist pending

Skills: `design-taste-frontend` not needed (admin shell follows existing
shadcn/semantic-token language) · `shadcn` (table + dialog + dropdown-menu
added; `chart`/recharts **blocked** by pre-existing vitest↔vite↔types peer
ERESOLVE → hand-rolled SVG/div charts, no chart dep) · `tdd` (seams already
confirmed in M5 batch; new suites follow the same HTTP-level pattern).

### Backend (M6-1 … M6-5)

- **M6-1 roles**: `require_owner` + `OwnerUserDep`/`SessionDep` in
  `core/security.py` (DB row check, not JWT claim). Frontend:
  `additionalFields.role` + `databaseHooks` owner promotion
  (`lib/auth.ts`, `OWNER_EMAIL` allowlist, case-insensitive).
- **M6-3 schema**: `users` mirror, `customer_profiles`, `messages`,
  `notifications` (+ indexes); migration `873baecbda05_dashboard_foundation`
  applied to Neon Development.
- **M6-4 SSE**: `EventHub` (per-user queues, drop-on-overflow) +
  `GET /api/v1/events` (`fastapi.sse.EventSourceResponse`, `: connected`
  first frame, `: heartbeat` every 25 s, unsubscribe in `finally`). Tests
  drive the ASGI app directly — httpx `ASGITransport` buffers `client.stream()`.
- **M6-2 transitions**: single `booking_status.transition()` —
  `ALLOWED_TRANSITIONS` (pending→confirmed|cancelled …), guard →
  `IllegalTransition`, counterparty notifications via `_notifications_for`,
  commit-then-publish (no phantom SSE). Webhooks now call
  `transition(actor="webhook")`; regression test green.
- **M6-5 admin API** (`api/v1/admin.py`, `dependencies=[require_owner]`):
  overview KPIs (revenue MTD on confirmed/active/completed, utilization =
  distinct booked cars / fleet, recentActivity) · bookings list
  (status/car/q filters) · PATCH booking (409 illegal, 404 missing) ·
  cars CRUD (slug ids; DELETE 409s on any referencing booking → steer to
  `status=hidden`; public list filters `available` only) · promo CRUD
  (uppercase-normalized, 409 dup, percent 1–100) · customers list/detail
  (owner 404s) · analytics (revenueByDay/Week, bookings/utilization by car,
  topPromoCodes; Python-side grouping, default 30 d window).
  New booking also notifies the owner (`booking_new` + SSE).
- Tests **48 → 89**; ruff clean throughout.

### Frontend (M6-6 … M6-7)

- `lib/api.ts`: 204 → `undefined` (was `res.json()` crash); `apiBase()`
  exported for SSE.
- `/admin/*`: role-gated `layout.tsx` (redirect `/`, sidebar 6 items) ·
  overview KPI cards + recent activity · bookings filterable table +
  calendar view toggle, row action buttons from `BOOKING_ACTIONS`
  (mirrors backend map), debounced search · cars table + create/edit
  dialog (FieldGroup, dynamic image URL list with preview/remove) +
  delete-confirm dialog (409 → "hide instead" guidance) · customers
  list → `[id]` detail (profile + history) · promos CRUD dialog ·
  analytics with hand-rolled charts (SVG revenue line w/ area + gridline
  ticks, div-bar weekly/bookings/utilization, promos table, date range
  inputs + Apply). Shared `components/calendar/MonthGrid.tsx` built here
  for M7 reuse. Header: owner-only **Admin** link (`AuthArea`).
- **M6-7 realtime plumbing**: `lib/sse.ts` `useEventStream()` — fetch-stream
  (Bearer header EventSource can't send), frame parser
  (event/id/data/comments), exponential backoff 1 s → 30 s, `Last-Event-ID`
  resume, timer/abort cleanup, `enabled` tied to session; mounted once in
  `AuthProvider` (plan §shared plumbing). `lib/notifications.ts` +
  backend `GET /me/notifications` (newest 50 + unreadCount badge),
  `POST …/{id}/read` (own-only 404), `POST …/read-all` (6 new tests).
  Context gains notifications/unread/toasts; refetch on focus + route
  change (SSE down ≠ notifications dead). `NotificationBell`
  (dropdown-menu: unread badge, mark all read, deep-link rows) in header;
  `NotificationToasts` (6 s auto-dismiss, click → link) in root layout.
- **Deps**: `@radix-ui/react-dropdown-menu` added. Lesson: install with
  `--legacy-peer-deps` **pruned `vite`'s whole subtree** from the lock →
  vitest died (`ERR_MODULE_NOT_FOUND`); fixed by pinning `vite@^8.3.4`
  as an explicit devDependency — lock diff back to pure +22 entries,
  0 removals.

### Gates (2026-10-18)

Backend ruff clean · pytest **89/89** · frontend lint clean · tsc clean ·
vitest **15/15** · build green (all 7 `/admin` routes).

### Open — M6-8

`OWNER_EMAIL` value not yet chosen (empty placeholders in
`frontend/.env.local` + Vercel → nobody auto-promotes) · Vercel env add +
`vercel redeploy` after it · full M6 checklist run-through (Dashboard-plan
L149–155: owner signup → add/hide car → live booking → active/completed →
delete-block → analytics revenue → non-owner 403/redirect) · todo.md boxes ·
commit/push (user go-ahead only).

### M6 follow-ups (2026-10-19)

Three user-reported issues after the M6 deploy; outcomes:

- **Stripe listener (fixed, ops-only)**: same two-sandbox root cause as M5 —
  `stripe listen` must run with the app's key (`morent-listen` alias:
  `STRIPE_API_KEY=$(grep ^STRIPE_SECRET_KEY= backend/.env …) stripe listen
  --forward-to http://localhost:8000/api/v1/webhooks/stripe`), then paste
  that listener's whsec and restart the backend. Matching whsec alone is a
  red herring — if the CLI is logged into the other account, events never
  route to the listener. ("Payment works" meanwhile is real: `/Payment/complete`
  polls `session-status` straight from Stripe, independent of webhooks.)
- **Owner landing on `/admin` after signup: dropped** (user decision).
- **Admin gate → real 404** (replaces the client skeleton → `router.replace("/")`
  bounce): `app/admin/layout.tsx` is now a **server component** —
  `auth.api.getSession({ headers })` → `notFound()` for signed-out and
  non-owner sessions (server API returns `{ user } | null`, not the client
  `{ data }` shape). Nav extracted to client `app/admin/AdminShell.tsx`
  (active-state only). API routes unchanged (`require_owner` → 403).
  All `/admin/*` routes flipped static → dynamic (`ƒ`).
- **Custom 404**: `app/not-found.tsx` — Card in the Payment-complete language:
  *“This page went out for a test drive — and never came back.”* (lot/GPS
  punchline, Back to home + Browse cars). Catches every 404 sitewide inside
  root header/footer chrome, including the admin gate.
- Verified live on the running dev server (anon): `/` 200 · `/admin`,
  `/admin/bookings`, `/admin/customers/xyz` → 404 with the new card.
- Gates: lint clean · build green (admin routes server-rendered `ƒ`) ·
  vitest 15/15.

## Phase 0 — Groundwork (2026-10-15)

- Plan written (`plans/redesign-plan.md`): staged waves, gates, install policy.
- shadcn components installed via `npx shadcn@latest add`: input, card, sheet,
  select, badge, skeleton, radio-group, input-group, textarea, field (+label,
  separator), later carousel and slider.
- Design tokens: `--primary`/`--ring` = `225 80% 56%` (`#3563E9`) in
  `:root`/`.dark`; Plus Jakarta Sans via `next/font`.
- Shared container convention: `mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8`.
- Install policy agreed: shadcn components/small deps auto-approve, anything
  big asks the user first.

## Wave 1 — Home page redesign (Phases 0–7)

- Header (responsive Sheet menu, search InputGroup, avatar), hero/TopSection,
  booking bar, CatalogueCar cards, footer, containers, `pickupsection.tsx`,
  `lib/locations.ts` — all rewritten to shadcn + lucide + token colors.
- Fixed LCP (eager loading, `priority`, real image dimensions).
- Removed old duplicated header/pickup trees and `Pickup/` directory.
- Screenshot QA skipped by user decision (no browser in environment).
- Gates: ESLint 0 errors, build passes, taste-lint (design-taste-frontend) 0/0.

## Wave 2 — Car detail + Payment (2026-10-15)

- `app/cars/[id]/page.tsx`: fluid `lg:grid-cols-[400px_minmax(0,1fr)]`,
  shadcn Card/Button/Badge, lucide icons, favorite toggle, "Car not found" card.
- Payment flow fully rewritten (all 5 sub-components):
  - BillingInfo + RentalInfo use shared `LOCATION_OPTIONS` from `lib/locations.ts`.
  - PaymentMethod: RadioGroup + FieldSet, credit-card details nested.
  - Confirmation: inline terms error + disabled submit (replaced `alert()`).
  - RentalSummary: fixed the NaN discount bug (applies to base price, no
    compounding), inline promo feedback, `key={selectedCar._id}` remount to
    satisfy `react-hooks/set-state-in-effect`.
- Gates green; pre-existing ESLint warning eliminated.

## Wave 3 — Links & navigation (2026-10-15)

- New `app/how-it-works/page.tsx` (server component, metadata, 4 steps, CTA).
- Footer wired: Featured → `/#popular`, real social URLs with
  `target="_blank" rel="noopener noreferrer"`.
- Header anchors `#popular`/`#recommended` verified (co-located `id` tags).
- Placeholder links (Community/Partnership/Privacy/Terms) intentionally left
  as `/` — no invented pages per AGENTS.md.

## Wave 4 — Image asset wiring (2026-10-16)

User emptied `public/` (old images unrecoverable) and supplied a new set:

- `public/asset/Car/<Brand>/` — 7 cars × 8 poses each (600×600 transparent PNG):
  front, front-3-4, front-3-4-right, side, side-right, rear, rear-3-4, rear-3-4-right.
- `asset/Payment-Logo/` — visa/mastercard/paypal/bitcoin (256×256).
- `asset/Man-Avatar/avatar.png` (2672×3772).

Code rewired:

- `lib/cars.ts`: real model names (Koenigsegg Jesko, Nissan GT-R, Rolls-Royce
  Spectre, Mercedes-Benz EQS 400, Volkswagen Golf, Toyota Veloz, Jaguar XF),
  Rolls type Sedan→Coupe, `imageUrl` = `*-front-3-4.png`, new `images: string[]`
  (8 poses), metadata 600×600.
- `CatalogueCar`: whole card = single `<Link>` to `/cars/[id]`; "Rent now"
  became a styled `<span>` (no nested anchors).
- Detail page: pose gallery (main image + click-to-swap thumbnails).
- `PaymentMethod`: new logo paths, `h-9 w-9 rounded-md object-contain`.
- `header.tsx`: new avatar path.
- `Confirmation`: lucide `<ShieldCheck />` replaced the security PNG.
- `TopSection`: hero images → Car-folder front-3-4 renders.
- Cleanup: deleted 57 Windows `*:Zone.Identifier` junk files; rewrote
  `frontend/image-list/image.txt` as the final asset map.

## Per-car descriptions (2026-10-16)

- Added `description: string` to the `Car` interface + all 7 entries
  (distinct one-liners per model).
- Detail page renders `{car.description}` — replaced the hardcoded NISMO
  Nissan blurb that appeared on every car.

## Wave 5 — Detail-page layout overhaul (2026-10-16)

Loaded skills: `design-taste-frontend`, `ui-ux-pro-max`.

- Installed shadcn **carousel** (embla-carousel-react).
- Layout restructured ecommerce-style:
  - Gallery card LEFT, details card RIGHT; later both cards made equal size
    (`lg:grid-cols-2` + `h-full` stretch).
  - Main image full-bleed `aspect-[41/30]` (= 492×360 at a 492 column).
  - Pose strip: `basis-1/3` thumbs, `aspect-[37/31]` (= 148×124), card height
    508 exactly at spec (360 + 8 + 124 + 16).
  - Thumb internals per spec: `rounded-lg` (8px radius) + `p-2` → image area
    exactly 132×108.
- **Reviews section** (`lib/reviews.ts`): 4 mock reviews, nested replies
  (including a 2-reply thread with "Morent Support"), average score, avatar
  initials, tone-blocked reply indent.
- **Browse other cars**: horizontal embla carousel of the other 6 cars,
  compact full-link cards, loop + arrows.
- Gallery arrows: plain chevron Buttons on the main image — they swap the
  main picture only (wrap-around); thumb strip never moves programmatically
  (still drag/swipeable to reach all 8 poses).
- Active/hover/focus thumb ring switched to `ring-inset` after the outer
  ring was clipped by embla's `overflow-hidden` viewport (only gaps showed).
- Hero fix: square renders were shrink-wrapped by `max-h-*` + `object-contain`;
  both hero cards now use an `object-cover` band (`h-56 sm:h-72`) so the car
  fills the card like the original wide photos.
- Branded backdrop on main image: `bg-primary` + reused `LeftBackgroundImage`
  concentric-circle SVG (`preserveAspectRatio="xMidYMid slice"` +
  `absolute inset-0 h-full w-full` so it covers the box at every card size).
- Vendored `components/ui/carousel.tsx` got one `eslint-disable-next-line`
  for `react-hooks/set-state-in-effect` (embla sync subscribe pattern).
- `Badge` import removed from detail page after gallery footer row was
  dropped (specs live in the details card).

## Wave 6 — Explore page (2026-10-16)

User-requested new page (explicit override of the "no new pages" polish rule):

- Header: **Home → Explore** (`/explore`); Popular/Recommended hrefs made
  absolute (`/#popular`, `/#recommended`) so they work from any route;
  logo still → `/`.
- `app/explore/page.tsx` (server, metadata "Explore cars — Morent") +
  `ExploreClient.tsx`:
  - Left sticky filter card (280px rail):
    - **Type** radios: All + Sport, SUV, MPV, Sedan, Coupe, Hatchback.
    - **Capacity** radios with live counts from data: All (7), 2 Person (2),
      4 Person (4), 6 Person (1), 8 or more (0).
    - **Price** shadcn Slider ($45–$99, value beside legend, filters
      `price <= value`, starts at max so everything shows).
  - Right: result count + filtered grid reusing `CarCard` (now exported from
    `CatalogueCar.tsx`); empty-state card.
  - Filters combine with AND.
- Gates: lint 0/0, taste-lint 0/0, build passes (new static route `/explore`).

## Backend/payment Q&A (2026-10-16)

- Traced the Rent now flow: `Payment/page.tsx` POSTs form + car to
  `app/api/saveRentalData/route.js`, a hackathon stub that `console.log`s the
  payload and returns `{success:true}` — nothing persisted; the comment marks
  where the future `backend/` service plugs in.
- Noted empty form fields pass validation (only car + terms are enforced) and
  the route is `.js` in a TS project.
- **Decision (user): leave as-is until the backend/database is set up.**

## Git housekeeping (2026-10-16)

- Confirmed no commits had been made during the whole session.
- User requested a clean slate: deleted old `.git`, `git init -b main`,
  new remote `origin → https://github.com/Mhammadkhan17/Morent.git`.
- Created root `.gitignore`: `.agents/`, `plans/`, `research/`, `.env`,
  `opencode.jsonc`, `skills-lock.json`, plus dependencies (`node_modules/`),
  builds/caches (`.next/`, `out/`, `build/`, `dist/`, `.turbos/`, `.cache/`,
  `*.tsbuildinfo`, `.eslintcache`, `.taste-skill/`), env variants (`.env*`,
  `!.env.example`), logs, OS/editor noise (`.DS_Store`, `Thumbs.db`, `.idea/`,
  `.vscode/*` with extensions.json exception).
- Initial commit shown to user for approval first, then executed:
  `0be7df8 Create Morent frontend` — 126 files, 14,088 insertions
  (frontend app, CI workflow, AGENTS.md, backend/.gitkeep, .gitignore).
  Message intentionally avoids mentioning prior git history.
- Push failed over HTTPS (no credential helper / non-interactive shell);
  fixed by switching the remote to SSH (`git@github.com:…`) using the
  existing `~/.ssh/id_ed25519` key — authenticated as **Mhammadkhan17**,
  `main` pushed and tracking `origin/main`. CI (lint + build) triggered.

## Gates maintained throughout

| Gate | Command | Status |
|------|---------|--------|
| ESLint | `npm run lint` (in `frontend/`) | 0 errors, 0 warnings |
| Build | `npm run build` | passes every time |
| Frontend tests | `npm test` (vitest, in `frontend/`) | 14/14 |
| Backend lint | `uv run ruff check .` (in `backend/`) | clean |
| Backend tests | `uv run pytest` (in `backend/`) | 50/50 |
| Taste lint | `node .agents/skills/design-taste-frontend/scripts/lint.mjs <files>` | 0 FAIL, 0 WARN |
| Browser QA | screenshots / inspect.mjs | not run (no browser in env); user drove manual QA locally |

## Known follow-ups (not yet done)

- M6 owner dashboard + M7 customer portal (`plans/backend/Dashboard-plan.md`).
- Deploy P3: auth round-trip on prod URL (sign-in → `GET /api/v1/me` Bearer → 200).
- Deploy P4: point Stripe webhook at prod URL (`…/api/v1/webhooks/stripe`),
  webhook idempotency table, whsec swap + redeploy — test flow still runs
  through local `stripe listen`.
- Deploy P5: Neon `prod` branch decision (still on Development branch);
  `OWNER_EMAIL` env not yet added (needed for M6).
- Preview deploys: 3 URL env vars absent from Preview scope → backend 500 on
  preview until preview domain known.
- Screenshot-based visual QA (`inspect.mjs`) when a browser is available.
- Placeholder footer links (Community/Partnership/Privacy/Terms) need pages.
- Search field in header is decorative (no search behavior yet).
- Explore capacity counts are global, not faceted with other filters.
- Decline-card path (`4000000000000002`) still a manual spot-check.

### Navbar / hero / payment UX fix batch (2026-10-19)

Temporary fix plan (`FIX-PLAN.md`, phases A–F) — all done, gated:

- **Backend — supersede own pending** (kills the self-409 after the first
  "Rent now"): `create_booking` excludes the caller's pending rows from the
  overlap check, then cancels their own same-car pending bookings via
  `transition(actor="superseded")` (no notifications) and expires the old
  Stripe Checkout session (`sessions.expire_async`, best-effort). Validation
  runs before any mutation — someone else's hold still 409s and leaves yours
  untouched. TDD: 2 new tests → pytest **91/91** · ruff clean.
- **Navbar**: dead icon trio removed. Actions row (desktop **and** mobile
  sheet) = FavoritesMenu (localStorage + `useSyncExternalStore`, count badge,
  dropdown of saved cars → `/cars/[id]`, empty-state hint) · the one real
  NotificationBell (signed-in only) · SettingsMenu (Light/Dark/System theme,
  persisted, pre-hydration script in root layout → no flash). AuthArea
  slimmed to avatar-as-dropdown (name + email, Admin for owner, Sign out).
  Car-detail heart now persists to the favorites store.
- **Hero**: `TopSection` owns a `max-w-[1376px]` container (640+640+32+64) →
  both cards exactly **640×360** at `lg`; text block absolutely overlaid
  top-left on the card face, car image anchored bottom-right, CTA inside the
  text block on both cards.
- **Payment validation**: new `app/Payment/validation.ts` (name ≥2 · phone
  pattern · address/city · location/date/time · no past dates · drop-off ≥
  pickup, same-day time must be later). Inline `role="alert"` errors under
  each field with `aria-invalid` + `aria-describedby` + destructive border,
  shown on **blur**; editing a field clears its error; submit validates all
  and focuses the first invalid control.
- **Payment auto-prepare**: `handleSubmit` → `prepareBooking()` (wrapped in
  `useCallback`); valid form + terms + settled quote → 700ms-debounced
  auto-POST creates the booking → `clientSecret` → Stripe card panel mounts
  and scrolls into view (no first-"Rent now" dead air). Payload-signature
  dedupe blocks double POSTs; failed payloads don't auto-retry until edited;
  unchecking terms reverts the panel; "Rent now" remains the manual trigger
  ("Processing…" while a prepare runs). Backend phase A supersedes the old
  pending on re-prepare instead of 409-ing yourself.
- **Gates**: backend ruff clean · pytest **91/91** · frontend lint clean ·
  tsc clean · build green · vitest **15/15** · live: `/` 200 with new header
  actions + 640×360 hero markup. `/Payment` click-through pending (auth).
- **Follow-up fixes from dev-server feedback**: `useFavorites` server snapshot
  now cached (`getFavorites` ×3 + shared `EMPTY`) — killed the
  `getServerSnapshot should be cached` infinite-loop console error; `<html>`
  got `suppressHydrationWarning` (pre-hydration theme script legitimately
  adds `dark` before React hydrates); dark-mode conflicts resolved — hero
  right card pinned `dark:bg-zinc-900` (token `bg-foreground` flips to white
  under `text-white`), `color-scheme: light/dark` on `:root`/`.dark` (native
  date/time inputs + scrollbars follow the theme), Stripe PaymentElement now
  mounts with `theme: "night"` in dark mode.

---

## Vercel P4/P5 closed + M7 customer portal (2026-10-21)

Skills loaded: `tdd`. Plan/status log: `plans/deploy/vercel-plan.md`,
`plans/backend/Dashboard-plan.md`, `plans/todo.md`.

### Vercel P4 — prod Stripe webhook (closed)

- **Root cause**: no prod endpoint ever existed (`stripe webhook_endpoints
  list` empty) — `badabc57` confirmed only because local `stripe listen`
  forwarded into the shared Neon DB. Created endpoint `we_1USiSj1tU3M2nJvCms5WC6ou`
  → `https://morent-mu-two.vercel.app/api/v1/webhooks/stripe`, 4 events
  (`checkout.session.completed/expired/async_payment_{succeeded,failed}`),
  per-endpoint API version pinned `2026-09-30.endive`. Signing secret piped
  into Vercel prod env without display; local CLI listen loop untouched.
- **Durable idempotency (TDD)**: new `webhook_events` table (PK `event_id`,
  status `received|processed|failed`) — handler claims the id **before**
  business work; duplicate → 200 no-op; crash after claim → `failed` +
  HTTP 500 so Stripe retry re-enters; in-process `asyncio.Lock` (per-loop
  `WeakKeyDictionary`) serializes parallel deliveries — fixed a live race
  where interleaved sessions lost the booking `confirmed` commit while the
  payment row persisted. Migration `7614f96e736b` applied to Neon.
- **Verified on prod**: `stripe trigger checkout.session.completed` →
  `evt_1USikK…` recorded `processed` in prod `webhook_events` (endpoint +
  secret + handler + 2xx all proven); forged `stripe-signature` POST →
  400 `Invalid signature` (failure drill, no state change).

### Vercel P5 — database posture (closed)

- Decision recorded: stay on Neon **Development branch** while demo; swap
  procedure (create `prod` from Development → new `DATABASE_URL*` → redeploy)
  written into a new **Ops runbook** section of `vercel-plan.md` (env
  inventory by name, migration posture, webhook anatomy, free-tier backup
  note). P7 checklist all ✅ except two advisory boxes (Preview env trio,
  GitHub merge-rule — neither blocks demo).

### M7 — Customer portal (code complete; gate open)

- **Backend (test-first)**: `GET /me/bookings` (enriched w/ car + unread
  count), `GET/PATCH /me/profile` (upsert `customer_profiles`),
  `GET/POST /bookings/{id}/messages` (participant-only 403; POST notifies
  the other party — owners when customer posts, customer when owner posts —
  with SSE `message` + `notification` events; GET marks incoming read).
  13 new tests → backend **110/110**, ruff clean. Closes the M6
  message-recipient-writer leftover.
- **Frontend**: `app/account/*` — AccountShell (session gate →
  `/login?next=…`), Overview (current-booking hero + next-up + unread),
  Bookings (Current/Upcoming/History tabs, hand-rolled pill tabs), Calendar
  (shared `MonthGrid` extended with optional `onSelectDay`/`selectedDay` +
  selected-day booking card), Inbox (booking list → thread, composer,
  SSE-live via new `AuthProvider.lastMessage`, `?booking=` deep link from
  notifications), Settings (phone/license form + sign out). Avatar menu
  gains **My account**. `lib/account.ts` SDK-style client.
- **Gates**: backend ruff clean + pytest **110/110**; frontend lint clean ·
  tsc clean · build green (all 5 `/account/*` routes) · vitest **15/15**.
  Remaining: M7 verification gate (user run) + §7 final regression.

### Same-day user-reported fixes (2026-10-21)

- **Theme console error**: raw `<script dangerouslySetInnerHTML>` in
  `app/layout.tsx` triggered React 19's "scripts inside components never
  execute" warning on client re-renders. Swapped to `next/script`
  `strategy="beforeInteractive"` — Next injects it outside React
  reconciliation; pre-paint no-flash timing unchanged.
- **Owner message dead-end**: customer→owner messages notified the owner
  and linked to `/admin/bookings?thread=…`, but no owner thread UI existed.
  Extracted shared `components/thread/ThreadPanel.tsx` (fetch + composer +
  SSE-live via `AuthProvider.lastMessage`); `/account/inbox` now reuses it,
  and `/admin/bookings` gained a per-row **Messages** button + dialog that
  auto-opens on `?thread=` (car name resolved from the loaded list).
  Owner↔customer loop is now complete both directions.
- **Payment auto-prepare removed**: the 700ms debounced effect that created
  a booking and swapped in the Stripe panel as soon as the terms box made
  the form valid is gone — **Rent now** is the only trigger for prepare →
  panel mount. No charge ever happened on checkbox-check, but the UI jump
  was surprising; flow is now explicit.

### §7 final regression — run 2026-10-21 (user, prod)

- Full journey on prod (`morent-mu-two.vercel.app`): signup → browse →
  quote → promo → pay `4242…` → webhook confirm → owner
  confirms/hands over/returns → portal hero + messages both ways +
  notifications → analytics KPIs — **all green** (user-reported).
- Decline card + webhook replay still green; M6 owner-dashboard gate and
  M7 portal gate checklists (`plans/todo.md` §5–§7) ticked with the same
  run. Closes H8 from the post-MVP audit (`report/general-report.md`).
- Baseline locked before the audit fix plan (`plans/audit-fix-plan.md`,
  Phases B–E) starts.

## Audit fix plan — Phase B: frontend truthfulness (2026-10-21)

Plan: `plans/audit-fix-plan.md` (source `report/general-report.md`).
Gates green: lint · vitest 22/22 (was 15) · build.

- **H1 home CTA wired**: "Search cars" validates all six pickup/dropoff
  fields, persists a draft to `sessionStorage`
  (`lib/rental-draft.ts` +test), and routes to `/explore`;
  `/Payment` consumes the draft one-shot on mount (still requires
  `?carId=`) so the dead-end form now actually starts a rental.
- **M1 explore search**: header SearchField is a real GET form →
  `/explore?q=`; ExploreClient filters on name + tags with a
  "Clear search" affordance; `explore/page.tsx` wraps the client in
  Suspense (useSearchParams boundary).
- **M2 reviews honesty**: review carousels on home, car detail, and
  Payment summary now carry a visible "Sample reviews" badge — kept
  the section (locked decision), labeled the data.
- **M3 transmission filter**: Automatic/Manual added to ExploreClient.
- **M4 stale copy**: "payment successful" strings removed from booking
  confirmation/return and account bookings pages.
- **M11 footer**: rewritten to real routes only — dead link columns,
  fake socials, Privacy/Terms stubs removed.
- **M17 Stripe key guard**: `PayPanel` no-ops on missing publishable key
  and renders a config-error panel instead of crashing the checkout.
- **M21 dead success branch**: unreachable success `Alert` (+ unused
  `CircleCheck`) deleted from `Payment/page.tsx` — prepare failures
  always render destructive.
- **H5 load-error surfaces**: new shared `LoadErrorCard`
  (`app/account/load-error.tsx`) with retry wired into account
  overview/bookings/calendar/inbox, `ThreadPanel` (composer keeps draft
  on send failure), and notification bell (`notificationsError` in
  `AuthProvider`, 401 excluded, banner + Retry).
- **H6 error/loading boundaries**: root `app/error.tsx` +
  `app/loading.tsx`; home catalogue load failure renders a retry card
  instead of an empty grid.
- Early a11y/responsive: M18 focus ring restored on the notification
  bell; M19 dropdown width bounded on narrow viewports.
- **M9 SSE "live" claim** (locked decision: own the refetch story, zero
  code): audited every user-visible string — no copy claims
  notifications/messages are "live" (internal `LiveToast`/`LiveMessage`
  type names and the `aria-live` a11y attribute only). Reality stays:
  refetch-on-focus + in-tab SSE as a bonus. No product change needed;
  deferral recorded here.

## Audit fix plan — Phase C: backend integrity (2026-10-21)

TDD per `tdd` skill. Gates green: ruff · pytest **120 passed**
(baseline 110 + 10 new).

- **H2 same-user double-booking**: `assert_no_overlap` now excludes
  only the caller's *pending* rows (`or_(user != me OR status !=
  pending)`) — an own confirmed/active overlapping booking → 409
  (`test_own_confirmed_overlap_409`). Pending supersede path unchanged.
- **H3 webhook crash-window**: `_claim_event` re-claims `received`
  rows older than a 60s lease (`_RECEIVED_LEASE`) and re-stamps
  `received_at`; fresh `received` rows stay unclaimed (in-flight
  protection). Crash drill: stale row → Stripe retry processes it;
  fresh row → still `received` (2 new tests).
- **M7 webhook secret fail-fast**: lifespan refuses to boot with empty
  `STRIPE_WEBHOOK_SECRET` (ASGITransport tests unaffected; CI already
  injects a placeholder).
- **M5 unrentable cars**: `GET /cars/{id}` and `POST /quotes` return
  404 for any non-available car — contract chosen: hidden cars are
  treated as nonexistent (no inventory leak, consistent with list
  endpoint).
- **M6 session-status honesty**: only `stripe.InvalidRequestError`
  maps to 404; outages propagate as 5xx (return page shows retry, not
  "session not found"). No auth dep added — session IDs are
  unguessable Stripe IDs and the return page must work pre-login;
  recorded here as the implementation decision.
- **M8 supersede money-state**: expire failure handling narrowed from
  `except Exception: pass` to `stripe.InvalidRequestError` only —
  unexpected Stripe/network errors abort the re-book (old pending
  booking left payable-and-pending, not cancelled-and-payable). Late
  `checkout.session.completed` against a cancelled booking no longer
  writes a succeeded `Payment` row.

## Audit fix plan — Phase D: schema safety (2026-10-21)

Plan: `plans/audit-fix-plan.md` D1/D2. Tested on Neon branch
`migration-align-dev-2026-10-21` (`br-blue-cake-b5f7y08q`, forked from
Development — **migration `1eccb3865a1b` not yet applied to Development**).
Gates: ruff · pytest 120 passed · `alembic check` clean on the branch and
on a fresh empty database.

- **H7 model/migration alignment**:
  - FKs declared in models to match migrations: `booking.user_id`,
    `notification.user_id`, `customer.user_id` → `user.id`
    (`bookings_user_id_fkey`, `notifications_user_id_fkey`,
    `customer_profiles_user_id_fkey` already existed in the DB).
  - `messages.body` / `notifications.body` declared `sa.Text` to match
    the migrated TEXT columns (SQLModel default AutoString had drifted).
  - Migration `1eccb3865a1b`: five naive `TIMESTAMP` columns
    (`messages.created_at/read_at`, `notifications.created_at/read_at`,
    `webhook_events.received_at`) → `TIMESTAMPTZ` with explicit
    `USING col AT TIME ZONE 'UTC'` (session-timezone safe; downgrade is
    the exact inverse). Existing rows verified intact on the branch.
  - Alembic `env.py` gains `include_object`: Better Auth tables
    (`user/session/account/verification/jwks`) are excluded from
    autogenerate comparison — the hand-suppressed drop dance from
    `2fbeb566ad69` can never reappear.
- **H9 CI migration guard**: new `migrations` job in `ci.yml` —
  Postgres 17 service container → `scripts/ci_auth_stub.py` (creates the
  out-of-band `user` table exactly as Auth had it pre-M3) →
  `alembic upgrade head` → `alembic check` on every PR. Drift-detection
  proven: a deliberate `Car.drift_probe` column turns the job red;
  revert turns it green. Fresh-empty-DB path rehearsed on a scratch
  database (`ci_migrate_test` on the test branch).
- **Applied to Development** (`1eccb3865a1b`, live DB): before/after row
  counts identical (2 messages · 20 notifications · 1 webhook_event ·
  15 bookings · 8 payments · 3 users); `alembic check` clean on
  Development. Test branch kept for reference; empty mistaken
  production-fork branch and scratch database deleted.

## Audit fix plan — Phase E: hygiene (2026-10-21)

Plan: `plans/audit-fix-plan.md` E1–E5. Gates green: frontend lint ·
vitest 22/22 · build; backend ruff · pytest 120.

- **E1 dead surface removed** (M12/L1): app-wide `RentalDataProvider`
  (+ whole `app/context/` dir — zero consumers), unused
  `components/ui/navigation-menu.tsx`, no-op `data-icon` attrs in
  TopSection; backend `get_optional_user`/`OptionalUserDep`/bare
  `CurrentUser` alias, unused `owner_email` config field, 76-package
  `requirements.txt` freeze; frontend dead `Booking` interface and
  unread `Quote.currency`; `image-list/image.txt` stale `lib/cars.ts`
  reference. (`sessionId` kept on `CheckoutSession` — it is part of the
  API contract and asserted in `bookings.test.ts`.)
- **E2 a11y** (M18): focus rings unified onto the dominant
  `focus-visible:ring-1 ring-ring` system (dialog close button and
  badge were ring-2+offset outliers); account bookings "tablist"
  downgraded to a proper filter group (`role="group"` +
  `aria-pressed`) — it never had tabpanels/arrow keys, so the tab
  roles were a lie.
- **E3 dropdown widths** (M19): already responsive from the Phase B
  pass (`w-[min(24rem,calc(100vw-2rem))]`) — nothing left to do.
- **E4 L4–L7**: pay button disabled until a total label exists
  (no more "Pay " button); account shell width unified to
  `max-w-7xl` (matches header); card "Rent now" CTAs marked
  `aria-hidden` — a nested `<button>` inside the card `<Link>` would
  be invalid HTML and a duplicate tab stop, so the decorative-affordance
  fix was chosen over the plan's literal "→ Button"; header search was
  already `h-9`; shared stock avatar dropped in favor of the existing
  initials fallback (L7 done the cheap honest way).
- **E5 deferred, recorded in `plans/todo.md`** (M13–M16, M20, L2, L3,
  L8, backend `.env` line-15 parse warning — file not read).

## 2026-10-21 — follow-up: frontend component-test infrastructure

- Added jsdom + Testing Library (`@testing-library/react`/`jest-dom`/
  `user-event`, `@vitejs/plugin-react`, jsdom; bumped `@types/node` ^20 →
  ^24 to satisfy vitest's peer range). Vitest config: jsdom environment,
  React plugin, `test/setup.ts` (jest-dom matchers + ResizeObserver stub
  for Radix Slider).
- **Extracted the Explore filter predicate** into
  `lib/explore-filter.ts` (pure `filterCars` + `parseSeats`) —
  `ExploreClient` now consumes it; logic unchanged, testable without DOM.
- New tests (22 → 39, all green):
  - `lib/explore-filter.test.ts` — q name/tag matching (M1), transmission
    (M3), type, capacity, price, and combined filters (9 tests).
  - `app/explore/ExploreClient.test.tsx` — renders catalogue, `q`
    filters + Clear-search affordance, transmission radio narrows the
    grid (3 tests; `fetchCars`/`CarCard`/navigation mocked).
  - `app/Payment/PayPanel.test.tsx` — missing publishable key renders the
    explicit config-error panel + edit-booking escape hatch (M17, 2 tests).
  - `app/account/load-error.test.tsx` — title/message render, retry
    button fires `onRetry` (H5, 2 tests).
  - `lib/rental-draft.test.ts` pinned to node environment (SSR no-op
    paths need a real no-`window` global).
- Gates: lint clean · vitest 39/39 · `next build` green.
- Not covered (by design): full header/`AuthProvider` component tests —
  deep better-auth import graph; the search form is declarative GET HTML
  and its behaviour is covered via ExploreClient `q` tests. Playwright
  checkout E2E stays deferred (M16).

## 2026-10-21/22 — UX harden pass: URL-driven filters, resilient checkout, honest copy, admin analytics, design-system + dark-mode AA


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
- Dark mode lifts Cobalt Signal for AA: primary/ring `225 80% 67%` with ink
  labels `222 47% 11%` (was 2.87:1 on card), destructive `0 75% 66%` for
  readable error text (was 1.48:1), border/input `217 33% 30%` so hairlines
  separate from surfaces, chart-1 lifted to `220 70% 58%`; hero copy tracks
  `text-primary-foreground` (same near-white in light). Stripe `#3563E9`
  unchanged (payment brand lock); hue 225 identity kept, only lightness/ink
  flip. DESIGN.md + `.impeccable/design.json` updated to match.

### Tests & gates
- 71 frontend tests (11 files) covering explore filtering/URL state/retry,
  rental draft, api error normalization, validation, load-error card, rental
  summary, and analytics loading/refresh.
- Final cross-page sweep: no stale copy, color/radius drift, or primary-as-data
  left; every `LoadErrorCard` has an accurate title; pay button reads
  "Processing payment…". `npm run lint` and `npm run build` green.
