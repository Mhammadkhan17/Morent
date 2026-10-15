# AGENTS.md — Morent

Car rental web app (old hackathon project being revived). Next.js frontend in `frontend/`; backend planned in `backend/` (not started).

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

# Backend (from backend/) — not scaffolded yet
```

Always run `npm run lint` and `npm run build` before considering a frontend change done.

## Project structure

```
frontend/
  app/                  # App Router pages + co-located components
    page.tsx            # Home
    cars/[id]/          # Car detail
    Payment/            # Checkout flow
    components/         # App-level UI (header, footer, TopSection, Pickup)
  components/ui/        # shadcn primitives (button, checkbox, slider, …)
  lib/
    cars.ts             # Mock car data
    utils.ts            # cn() helper
backend/                # Empty — future API
```

## Skills — when to use what

Load the matching skill before doing the work. Do not load skills outside the current task.

### Frontend (current focus: visual polish, keep pages/features)

| Task | Skill |
|------|-------|
| Restyle / redesign UI, fix "generic" look | `design-taste-frontend` |
| UX review, responsive, accessibility, design system | `ui-ux-pro-max` |
| Add/fix shadcn components | `shadcn` |
| Visual design direction for new UI | `frontend-design` |
| Next/React performance, data fetching, bundle | `vercel-react-best-practices` |
| Generate per-section design reference images | `imagegen-frontend-web` |

### Backend (use once `backend/` work starts)

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

### Planning & quality (any phase)

| Task | Skill |
|------|-------|
| Pressure-test a plan before coding | `grill-me` |
| Same, but write ADRs/glossary as decisions land | `grill-with-docs` |
| Design module interfaces / seams | `codebase-design` |
| Scan for refactors, get HTML report | `improve-codebase-architecture` |
| Test-first for backend endpoints | `tdd` |

## Conventions

- TypeScript strict; path alias `@/*` → repo-relative (see `frontend/tsconfig.json`)
- shadcn style: `new-york`, base color `zinc`, CSS variables on, lucide icons
- `cn()` from `frontend/lib/utils.ts` for class merging
- App Router: colocate page-specific components under `app/`; shared primitives in `components/ui/`
- Mock data lives in `lib/cars.ts` — replace with API calls only after backend exists

## Boundaries

- Do not scaffold `backend/` or choose a backend stack until the user asks.
- Do not invent new pages/features during the visual-polish pass — restyle what exists.
- Never commit secrets, API keys, or `.env` files.
- Do not rename existing routes without asking.
