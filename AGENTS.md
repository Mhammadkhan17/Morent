# AGENTS.md — Morent

Car rental web app (under active development). Next.js frontend in `frontend/`; FastAPI backend in `backend/` (bookings, payments, webhooks, auth done; CI migration guard live).

> **Conflict rule:** If the user's request contradicts any rule or instruction in this file, remind them of the specific rule first. Proceed only if the user explicitly confirms they want to override it; otherwise leave the request unimplemented.

## Documentation — Context7

Use the **Context7 MCP** when you need current, version-specific library documentation or code examples (Next.js, React, FastAPI, Tailwind, Prisma, Stripe, Neon, etc.). Prefer it over guessing API syntax from training data.

- Resolve a library ID first, then query docs — keep each query to **one focused topic**
- Do not pass secrets or personal data in Context7 queries
- When a skill (e.g. `fastapi`, `neon-postgres`) already covers the topic, load the skill; use Context7 for API details the skill doesn't pin down

## Commands

```bash
# Frontend (run from frontend/)
npm install
npm run dev        # http://localhost:3000
npm run lint       # ESLint
npm run build      # production build
npm test           # vitest (node + jsdom component tests)

# Backend (from backend/)
uv sync                # install deps
uv run fastapi dev     # http://localhost:8000
uv run ruff check .    # lint
uv run pytest          # tests
```

Frontend gates: `npm run lint` + `npm test` + `npm run build`. Backend gates: `uv run ruff check .` + `uv run pytest`.

## Project structure

```
frontend/
  app/                  # App Router pages + co-located components
    page.tsx            # Home
    cars/[id]/          # Car detail
    Payment/            # Checkout flow (quote → booking → Stripe Element)
    components/         # App-level UI (header, footer, TopSection, Pickup)
  components/ui/        # shadcn primitives (button, checkbox, slider, …)
  test/                 # vitest setup (jsdom, jest-dom, ResizeObserver stub)
  lib/
    types.ts            # Car type (API-shaped)
    cars-api.ts         # GET /api/v1/cars helpers
    bookings.ts         # quote / booking / session-status
    explore-filter.ts   # pure catalogue filter (q/type/transmission/…)
    rental-draft.ts     # sessionStorage draft: home CTA → Payment
    api.ts              # fetch wrapper (Bearer JWT from authClient)
    utils.ts            # cn() helper
backend/                # FastAPI + SQLModel + Alembic + Stripe
  app/                  # routers, services, models, core (config/db/security)
  scripts/seed.py       # idempotent cars + promo seed
  tests/                # pytest (120)
```

## Skills — when to use what

Load the matching skill before doing the work. Do not load skills outside the current task.

### Frontend (current focus: visual polish, keep pages/features)

| Task | Skill |
|------|-------|
| Restyle / redesign UI, fix "generic" look | `design-taste-frontend` |
| UX review, responsive, accessibility, design system | `ui-ux-pro-max` |
| Interface critique / polish (hierarchy, motion, states) | `impeccable` |
| Add/fix shadcn components | `shadcn` |
| Visual design direction for new UI | `frontend-design` |
| Next/React performance, data fetching, bundle | `vercel-react-best-practices` |
| Generate per-section design reference images | `imagegen-frontend-web` |
| Auth config/sessions/plugins (Better Auth route is live) | `better-auth-best-practices` |
| Deploy to Vercel | `deploy-to-vercel` |

### Backend (backend/ is scaffolded — use these)

| Task | Skill |
|------|-------|
| Pick Neon primitives (DB, auth, storage, functions) | `neon` |
| Scaffold FastAPI service | `fastapi-templates` |
| FastAPI endpoints, DI, Pydantic | `fastapi` |
| Postgres schema, SQL, migrations | `neon-postgres` |
| Login / signup / identity | `neon-auth` |
| Serverless HTTP functions | `neon-functions` |
| File / image uploads | `neon-object-storage` |
| LLM / AI features | `neon-ai-gateway` |
| Safe migration testing on DB branches | `neon-postgres-branches` |
| Postgres egress / DB cost diagnosis | `neon-postgres-egress-optimizer` |

### Planning & quality (any phase)

| Task | Skill |
|------|-------|
| Pressure-test a plan before coding | `grill-me` |
| Same, but write ADRs/glossary as decisions land | `grill-with-docs` |
| Design module interfaces / seams | `codebase-design` |
| Scan for refactors, get HTML report | `improve-codebase-architecture` |
| Test-first for backend endpoints | `tdd` |
| Debug a bug/failure before proposing fixes | `systematic-debugging` |
| Security audit / login flow / deps / GDPR | `security-and-hardening` |
| Product-owner scope critique ("should we build this?") | `project-philosophy` |

### Meta

| Task | Skill |
|------|-------|
| Find/install additional skills | `find-skills` |
| Create or improve skills | `skill-creator` |

Installed but unused here: `vercel-react-native-skills` (no React Native in this repo).

## Conventions

- TypeScript strict; path alias `@/*` → repo-relative (see `frontend/tsconfig.json`)
- shadcn style: `new-york`, base color `zinc`, CSS variables on, lucide icons
- `cn()` from `frontend/lib/utils.ts` for class merging
- App Router: colocate page-specific components under `app/`; shared primitives in `components/ui/`
- Mock data removed — catalogue reads `GET /api/v1/cars`; keep API camelCase (`pricePerDay`, …)
- Stripe: money in integer cents; server re-prices; `return_url` only at session creation (never again in `checkout.confirm()`)

## Boundaries

- Do not invent new pages/features during the visual-polish pass — restyle what exists.
- Never commit secrets, API keys, or `.env` files.
- Do not rename existing routes without asking.
