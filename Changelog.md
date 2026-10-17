# Changelog — Morent Frontend Revival Session

All notable work from the development session reviving the Morent car-rental
project (old hackathon codebase → redesigned, asset-wired, feature-complete
frontend). This file is intentionally local-only (ignored by git).

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
- `Changelog.md` is tracked by git despite its header claiming local-only —
  unresolved: revert to untracked or fix the header (user decision pending).
