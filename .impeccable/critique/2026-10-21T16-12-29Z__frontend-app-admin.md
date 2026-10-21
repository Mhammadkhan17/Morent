---
target: admin dashboard
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
p2_count: 2
p3_count: 1
target_identity: "file:/home/user/projects/Morent/frontend/app/admin"
timestamp: 2026-10-21T16-12-29Z
slug: frontend-app-admin
---
⚠️ DEGRADED: single-context (no sub-agent tool; inline A+B)

## Admin (/admin/*) — Operate — 30/40 (75%, Good)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Analytics Apply does not re-enter loading (stale until swap) |
| 2 | Match System / Real World | 4 | Accurate domain labels |
| 3 | User Control and Freedom | 3 | Delete confirm; reversible status actions |
| 4 | Consistency and Standards | 3 | Shell consistent; generic error alerts |
| 5 | Error Prevention | 3 | Delete confirm; promo min/max; owner 404 gate |
| 6 | Recognition Rather Than Recall | 3 | Active nav, status badges |
| 7 | Flexibility and Efficiency | 3 | Filters + table/calendar; no bulk/shortcuts |
| 8 | Aesthetic and Minimalist Design | 3 | Scannable; chart-1…5 palette unused |
| 9 | Error Recovery | 3 | Alerts; delete hints bookings constraint |
| 10 | Help and Documentation | 2 | No status/action glossary |

**Specificity:** Hand-built dashboard, server owner gate done right. **Detector:** 0 findings. Browser: unavailable.
**Priority issues:**
- [P2] Analytics apply loading state → /impeccable harden
- [P2] Use chart palette; generic "Something went wrong" copy → /impeccable clarify
- [P3] Raw img tags; .jsx islands elsewhere → /impeccable polish
**Personas:** Alex — no bulk ops; Sam — labels OK, horizontal mobile nav easy to miss; Riley — stale analytics on apply.
