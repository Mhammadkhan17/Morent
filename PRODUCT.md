# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Project evaluators** (recruiters, peers, hiring managers): the primary audience — they judge the work by exploring the running app and reading the code. Their job is to quickly see that the full stack is real, coherent, and production-grade.
- **Demo renter persona**: the in-app customer role exercised through browse → quote → book → pay flows, using seeded catalogue data and Stripe test mode.
- **Admin persona**: the in-app operator role for fleet, bookings, promos, customers, and analytics in the admin dashboard.

## Product Purpose

Morent is a complete car-rental web application built to demonstrate end-to-end full-stack craft: a Next.js 16 frontend, a FastAPI + SQLModel backend, Neon Postgres, self-hosted Better Auth, and Stripe payment elements with webhook fulfillment. Success means every flow works end to end in demo conditions — browse, quote, book, pay, manage — and the project's quality gates stay green (frontend `npm run lint` + `npm run build`; backend `uv run ruff check .` + `uv run pytest`).

## Positioning

The differentiator is ownership of the whole stack: every layer — auth (self-hosted Better Auth with JWKS verification in FastAPI), pricing and booking logic, payments (Stripe Checkout/Payment Element with webhook fulfillment), database (Neon Postgres, Alembic migrations) — is inspectable and hand-built rather than delegated to a black-box BaaS. A neighboring rental site could copy the UI or the idea, but not truthfully claim the same transparent, from-scratch architecture.

## Operating Context

- Repo layout: `frontend/` (Next.js App Router) and `backend/` (FastAPI, uv, ruff, pytest), with plans in `plans/` and a session log in `Changelog.md`.
- Development runs locally: Next.js on :3000, FastAPI on :8000, Stripe CLI (`stripe listen` → webhook secret in `backend/.env`), Neon Postgres free tier.
- Payments are in Stripe **test mode**; webhook secret must be re-captured when the CLI session restarts.
- Deployment targets Vercel (frontend) with FastAPI webhooks researched in `research/`.
- Catalogue data is seeded idempotently (`backend/scripts/seed.py`) from a fixture — there is no live inventory.

## Capabilities and Constraints

- **Routes and roles preserved:** explore, car detail, Payment checkout flow, account portal (bookings, calendar, inbox, settings), admin dashboard (analytics, bookings, cars, customers, promos), how-it-works, login — with distinct customer and admin roles.
- **API surface v1:** cars, quotes, bookings (auth), checkout sessions, Stripe webhooks, health.
- **Test-mode payment reality:** Stripe test keys and seeded data are the truth; demo flows must never depend on real charges.
- **Free-tier infrastructure:** Neon free tier, Vercel, Stripe test — keep costs at zero.
- **No fabricated realism:** no invented customers, testimonials, prices, or claims anywhere in the product.
- **Backend status (repo-derived):** milestones M0–M6 complete; M7 portal partially open (notifications done, portal open).
- **Open decisions:** none recorded at init; future undecided product facts get recorded here rather than invented.

## Brand Commitments

- The product name is **Morent**. No other voice, visual, or identity commitments were declared at init.

## Evidence on Hand

- Seeded car catalogue fixture and idempotent seed script (`backend/scripts/seed.py`).
- Test-mode Stripe payment confirmed end to end (session in `plans/todo.md`).
- Backend test suite (97 tests at last log) plus frontend vitest tests.
- `Changelog.md`, `plans/` (backend, payments, dashboard, auth plans), `research/` notes.
- **Absences future work must not fabricate:** real customers, press, testimonials, case studies, or production usage metrics.

## Product Principles

1. **Craft is the product.** Every change should read as deliberate, production-grade work — evaluators judge the code and the UI together.
2. **Own the whole stack.** Prefer solutions that keep every layer inspectable; avoid adding black-box services beyond the confirmed set (Neon, Stripe, Better Auth, Vercel).
3. **The demo must stay runnable end to end.** Browse → quote → book → pay → manage works locally on free-tier and test-mode infrastructure, behind the documented quality gates.
4. **Never fake product truth.** Demo data is visibly demo data; no invented customers, claims, or metrics.
5. **Preserve the route and role map.** Existing routes and customer/admin roles are structure, not scaffolding — restyle freely, restructure only on request.
