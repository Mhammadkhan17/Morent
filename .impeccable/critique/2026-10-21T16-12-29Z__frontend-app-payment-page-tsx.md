---
target: payment flow
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
p2_count: 2
p3_count: 0
target_identity: "file:/home/user/projects/Morent/frontend/app/Payment/page.tsx"
target_fingerprint: "sha256:1a1b6df1b34f954ac33174f41357b8171e0dfa917bf598b3ad90db84fa118d4f"
target_path: /home/user/projects/Morent/frontend/app/Payment/page.tsx
timestamp: 2026-10-21T16-12-29Z
slug: frontend-app-payment-page-tsx
---
⚠️ DEGRADED: single-context (no sub-agent tool; inline A+B)

## Payment (/Payment, /complete) — Operate — 29/40 (73%, Good)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Quote dots, Processing…, Stripe skeleton, complete status check |
| 2 | Match System / Real World | 3 | Clear fields; "Sample reviews" + hollow security claims misplaced |
| 3 | User Control and Freedom | 2 | Edit booking exits Stripe; consumeRentalDraft() drops state on refresh |
| 4 | Consistency and Standards | 2 | Yellow stars vs Cobalt; dup trust blocks; .jsx vs .ts |
| 5 | Error Prevention | 4 | Cross-field dates, terms gate, server quote, promo invalidation, 409 copy |
| 6 | Recognition Rather Than Recall | 3 | Step 1–4 badges + sticky summary (mobile: summary below Rent now) |
| 7 | Flexibility and Efficiency | 2 | Single path; promo apply-only |
| 8 | Aesthetic and Minimalist Design | 3 | Clean parts; heavy page stack |
| 9 | Error Recovery | 4 | 409/401/422 + Stripe error escape |
| 10 | Help and Documentation | 2 | Concrete card copy good; "best experience ever" violates no-fabricated-claims |

**Specificity:** Most product-specific surface. **Detector:** 0 findings. Browser: unavailable.
**Priority issues:**
- [P1] Draft lost on refresh; success CTA → home not bookings → /impeccable harden
- [P1] Fabricated trust copy in Confirmation.jsx → /impeccable clarify
- [P2] Yellow stars / radius / dup trust blocks → /impeccable polish
- [P2] Mobile order: price summary below commit CTA → /impeccable layout
**Personas:** Casey — long stack, summary after CTA on mobile; Riley — refresh wipes draft; Sam — strong aria on errors/terms.
