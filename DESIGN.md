---
name: Morent
description: Car-rental app design system — a precision service manual with one cobalt signal color.
colors:
  background: "hsl(0 0% 100%)"
  foreground: "hsl(240 10% 3.9%)"
  card: "hsl(0 0% 100%)"
  card-foreground: "hsl(240 10% 3.9%)"
  popover: "hsl(0 0% 100%)"
  popover-foreground: "hsl(240 10% 3.9%)"
  primary: "hsl(225 80% 56%)"
  primary-foreground: "hsl(0 0% 98%)"
  secondary: "hsl(240 4.8% 95.9%)"
  secondary-foreground: "hsl(240 5.9% 10%)"
  muted: "hsl(240 4.8% 95.9%)"
  muted-foreground: "hsl(240 3.8% 46.1%)"
  accent: "hsl(240 4.8% 95.9%)"
  accent-foreground: "hsl(240 5.9% 10%)"
  destructive: "hsl(0 84.2% 60.2%)"
  destructive-foreground: "hsl(0 0% 98%)"
  border: "hsl(240 5.9% 90%)"
  input: "hsl(240 5.9% 90%)"
  ring: "hsl(225 80% 56%)"
  chart-1: "hsl(12 76% 61%)"
  chart-2: "hsl(173 58% 39%)"
  chart-3: "hsl(197 37% 24%)"
  chart-4: "hsl(43 74% 66%)"
  chart-5: "hsl(27 87% 67%)"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: "normal"
  title:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: "normal"
  label:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "hsl(225 80% 56% / 0.9)"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.xl}"
    padding: "24px"
  nav-link:
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  chip-rating:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  cta-rent:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
---

# Design System: Morent

## Overview

**Creative North Star: "The Precision Service Manual"**

Morent's interface reads like well-made equipment documentation: everything legible, labeled, and inspectable. The system is confident, utilitarian, and clean — it states facts (price, spec, availability) plainly and reserves emphasis for the moments that decide a rental. This mirrors the product's own thesis from PRODUCT.md: the whole stack is hand-built and open to inspection, so the UI likewise hides nothing.

The visual economy is deliberate. White paper, near-black ink, hairline borders, and exactly one saturated signal color — Cobalt Signal — carry the entire system. Density is high but orderly: 14px body text, 8px-grid spacing, and consistent 12px-cornered surfaces produce a catalogue rhythm that scans fast on both consumer browse pages and the admin dashboard. The confirmed anti-reference is decorative marketing fluff: no glassmorphism, no gradient-soup, no ornament that doesn't carry information.

Dark mode is a full peer theme (light/dark/system toggle in the header), not an afterthought: neutrals shift to a blue-slate family, and Cobalt Signal keeps the same hue and chroma while lifting lightness (and flipping its label ink) so prices, links, and buttons clear WCAG AA on dark surfaces.

**Key Characteristics:**
- One signal color (Cobalt Signal, light `hsl(225 80% 56%)` / dark `hsl(225 80% 67%)`) against paper-white and near-black neutrals
- Hairline-border layering instead of shadows; surfaces are flat at rest
- Compact, scannable type scale — 14px body, bold reserved for section anchors
- 6px controls / 8px base radius / 12px surfaces / full pills for chips
- Consistent 1152px content frame (`max-w-7xl`), 24px gutters between grid items
- Light and dark themes share one accent identity (hue 225); dark swaps neutrals to blue-slate (hue 217)

## Colors

The palette is a single-accident discipline: near-neutral zinc in light mode, blue-slate in dark mode, and one cobalt blue doing all the pointing.

### Primary
- **Cobalt Signal** (`hsl(225 80% 56%)` light / `hsl(225 80% 67%)` dark): the only saturated color in the system. Used for CTAs, price figures, focus rings, active borders (`border-primary/40` hover on car cards), the logo accent, and the left hero card's field. In dark mode the signal lifts so price/link text hits 4.5:1 on cards; `--primary-foreground` flips to blue-slate ink (`hsl(222 47% 11%)`) so button and badge labels stay legible. The Stripe payment appearance mirrors the light signal as `#3563E9` in `PayPanel.tsx` — same hue lock, one layer down.

### Neutral
- **Paper White** (`hsl(0 0% 100%)`): page and card background in light mode.
- **Near-Black Ink** (`hsl(240 10% 3.9%)`): primary text; also the right hero card's dark field in light mode.
- **Graphite Label** (`hsl(240 3.8% 46.1%)`): secondary text — specs, descriptions, meta, nav links at rest. The most-used text color in the codebase (106 occurrences).
- **Zinc Surface** (`hsl(240 4.8% 95.9%)`): muted/secondary/accent fills — badges, skeleton loaders, hover backgrounds.
- **Hairline** (`hsl(240 5.9% 90%)`): 1px borders on cards, inputs, dividers — the primary depth mechanism.

### Destructive
- **Alert Red** (`hsl(0 84.2% 60.2%)` light / `hsl(0 75% 66%)` dark): destructive actions and error states only. Never decorative. Dark mode brightens Alert Red so error copy clears 4.5:1 on cards and badges remain visible; `--destructive-foreground` uses the same blue-slate ink as primary labels.

### Data (charts)
- **Coral** (`hsl(12 76% 61%)`), **Teal** (`hsl(173 58% 39%)`), **Deep Slate** (`hsl(197 37% 24%)`), **Sand** (`hsl(43 74% 66%)`), **Amber** (`hsl(27 87% 67%)`) — the five dashboard chart hues, in fixed order `chart-1`…`chart-5`. Dark `chart-1` lifts to `hsl(220 70% 58%)` for contrast on card.

### Dark Theme Counterpart
Dark mode keeps the blue-slate neutrals and re-tunes the signal tokens for contrast: background `hsl(222 47% 11%)`, card `hsl(217 33% 17%)`, surfaces `hsl(217 33% 22%)`, secondary text `hsl(215 20% 65%)`, hairline `hsl(217 33% 30%)`, primary/ring `hsl(225 80% 67%)` with ink labels, destructive `hsl(0 75% 66%)` with ink labels.

### Named Rules
**The Cobalt Signal Rule.** Cobalt Signal marks what is actionable or costs money: buttons, prices, focus rings, links in emphasis, active states. It must not appear as decoration, and no screen should read as "a blue theme."
**The One-Field Rule.** Exactly one hero card per paired composition is Cobalt Signal; its twin is near-black. Never two blue fields side by side.

## Typography

**Display Font:** Plus Jakarta Sans (loaded via `next/font` into `--font-sans`, with metric-compatible fallback → `sans-serif`)
**Body Font:** Plus Jakarta Sans (same stack — the system is single-family)

**Character:** One geometric-humanist family doing all the work; hierarchy comes from weight and size, not from mixing faces. Friendly enough for a consumer rental flow, exact enough for admin tables.

### Hierarchy
- **Display** (700, `1.875rem` / 30px, line-height 1.2, tracking `-0.02em`): hero headlines only; steps down to `1.5rem` (24px) below the `sm` breakpoint.
- **Headline** (700, `1.5rem` / 24px, line-height 1.33): section anchors ("Popular cars", page titles); typically capitalized sentence case.
- **Title** (600, `1.125rem` / 18px, line-height 1.3, tracking `-0.01em`): card titles, dialog headings.
- **Body** (400–500, `0.875rem` / 14px, line-height 1.43): the workhorse — nav, specs, descriptions, table cells, form help. 130 usages of `text-sm` make this the default UI size. `1rem` (16px, `text-base`) is reserved for payment entry fields, hero subcopy, and long-form reading.
- **Label** (500, `0.75rem` / 12px, line-height 1.33): badges, meta rows, table headers, "per day" captions.

### Named Rules
**The Small-Body Rule.** UI copy is 14px by default; 16px must earn its place (payment entry, prose). Do not "fix" density by inflating body text.
**The 700 Ceiling Rule.** Nothing goes heavier than 700 (bold). Emphasis beyond that is color (Cobalt Signal) or size, never weight.

## Layout

- **Content frame:** `max-w-7xl` (1152px) centered, with responsive page gutters `16px → 24px → 32px` (`px-4 / sm:px-6 / lg:px-8`). The home hero pair deliberately breaks wider: `max-w-[1376px]` (two 640×360 cards + 32px gap + 64px padding).
- **Grids:** catalogue grids run 1 → 2 → 3 → 4 columns at `sm`/`lg`/`xl` with a constant 24px gutter (`gap-6`). Utility/modals center at `max-w-md / lg / xl`.
- **Rhythm:** sections separate with 48px (`mb-12`), section headings sit 20px (`mb-5`) above their content; card internals use 16–24px (`p-4`…`p-6`). Header padding grows `16px → 24px` vertically at `lg`.
- **Density:** compact by intent — lists and cards stay tight; whitespace is spent at section boundaries, not inside components.
- **Responsive behavior:** navigation collapses into a right-side Sheet below `lg`; the header search field hides below `md`; hero cards stack to one column below `lg`.

## Elevation & Depth

The system is **flat, borders do the work**. Surfaces sit on `bg-background` and separate via 1px `border` hairlines plus the card/background tonal step. Shadows exist but stay ambient and shallow — feedback, not structure.

### Shadow Vocabulary
- **Resting controls** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)` — Tailwind `shadow-sm`): outline buttons and inputs at rest; barely-there grounding.
- **Cards** (`box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)` — Tailwind `shadow`): the standard card lift, paired with its 1px border.
- **Overlays** (`shadow-md` / `shadow-lg`): dialogs, dropdown menus, sheets — elevation is allowed only where something floats above the page.
- **`shadow-none`:** used explicitly where a surface must read as pure field (hero cards).

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. A shadow at rest must come from the vocabulary above; new shadow styles require a reason tied to state or layering.

## Shapes

Corner language is a four-step ladder: **4px** (`rounded-sm`) for tiny internals, **6px** (`rounded-md`) for every control — buttons, inputs, nav links, CTA chips — **8px** (`rounded-lg`, the `--radius` token) for inner media and secondary containers, and **12px** (`rounded-xl`) for all primary surfaces: cards, hero panels, sheet edges. **Full pills** (`rounded-full`) are reserved for chips, badges, avatars, and rating tags.

Borders are 1px hairlines everywhere (`border-border` applied globally). Clipping is aggressive: cards and hero panels use `overflow-hidden` so imagery bleeds cleanly to the rounded edge. There are no double borders, no thick outlines, and no decorative shapes.

## Components

### Buttons
- **Shape:** gently rounded controls (`rounded-md`, 6px); heights 32px (`sm`) / 36px (`default`) / 40px (`lg`) / 36px square (`icon`).
- **Primary:** Cobalt Signal field with near-white text (`bg-primary text-primary-foreground`), 16px horizontal padding, medium weight 14px label; hover drops to 90% opacity (`hover:bg-primary/90`).
- **Outline:** paper field, 1px `border-input` hairline, `shadow-sm`; hover fills with the muted surface (`hover:bg-accent`).
- **Secondary / Ghost / Link:** secondary fills the zinc surface; ghost is borderless with accent hover; link variant is Cobalt Signal text with underline on hover.
- **Focus:** `ring-1 ring-ring` (Cobalt Signal) + removed outline — consistent across buttons and inputs.

### Chips / Badges
- **Style:** full-pill, zinc-surface fill with ink label (`Badge variant="secondary"`), 12px medium text.
- **State:** the rating badge injects a Cobalt Signal star (`fill-current text-primary`); destructive badges flip to Alert Red with near-white text.

### Cards / Containers
- **Corner Style:** `rounded-xl` (12px), `overflow-hidden`.
- **Background:** `bg-card` on `bg-background` — paper on paper, separated by the hairline.
- **Shadow Strategy:** Flat-By-Default (resting `shadow` + border).
- **Border:** 1px `border-border`; interactive cards shift the border to `border-primary/40` on hover (car cards).
- **Internal Padding:** 24px (`p-6`) header/content rhythm, tightened to 16–20px in dense catalogue cards.

### Inputs / Fields
- **Style:** 36px tall, `rounded-md` (6px), transparent-over-page fill, 1px `border-input`, 12px horizontal padding; the header search wraps this in an `InputGroup` with a leading search icon.
- **Focus:** `ring-1 ring-ring` (Cobalt Signal) with the outline removed — a crisp edge shift, not a glow.
- **Error / Disabled:** errors use Alert Red text/border; disabled drops to 50% opacity with `cursor-not-allowed`.

### Navigation
- **Header:** paper background, logo left, inline links, center search (`max-w-md`), actions + auth right; one row, hairline-free (it sits flush on the page).
- **Links:** 14px medium, Graphite Label at rest → ink text on Zinc Surface hover (`rounded-md px-3 py-2`), `transition-colors`.
- **Mobile:** hamburger opens a right-side Sheet (12px left corners) repeating logo, search, links, and actions; overlays use `shadow-lg`.

### Signature Components
- **Twin Hero Cards (TopSection):** two exact 640×360 panels, `rounded-xl`, `overflow-hidden` — left is a Cobalt Signal field, right is near-black (`bg-foreground`, blue-slate `bg-card` in dark). Each carries faint white line-art (concentric rings / chevrons at 6% opacity) as background, overlay copy on the left card in `text-primary-foreground` (ink on dark-mode cobalt; white on light cobalt) and white on the right card (bold 24→30px headline, 14→16px subcopy at 90%), a paper-colored outline CTA, and a car cutout PNG anchored bottom-right.
- **Car Card:** interactive card whose entire surface is a link (`rounded-xl` + `ring-2 ring-ring` focus); hover lifts only the border to `border-primary/40`. Interior: title + zinc rating pill, muted spec row (fuel / transmission / seats with 16px lucide icons), contained car render with skeleton-until-loaded fade (300ms opacity), then the footer split — price in Cobalt Signal (`text-lg font-semibold text-primary`) with a 12px "per day" caption, and a `Rent now` CTA chip (36×32px, `rounded-md`, Cobalt Signal, 90% on group-hover).

## Do's and Don'ts

### Do:
- **Do** use Cobalt Signal only for actions, prices, focus rings, and active states (The Cobalt Signal Rule).
- **Do** separate surfaces with the 1px `border-border` hairline first; reach for shadows only from the Shadow Vocabulary.
- **Do** keep body copy at 14px (`text-sm`) and cap font weight at 700.
- **Do** use the radius ladder as specified: 6px controls, 12px surfaces, full pills for chips.
- **Do** keep grids at 24px gutters inside the 1152px (`max-w-7xl`) frame, with `16/24/32px` responsive page padding.
- **Do** verify both themes: light (paper/zinc) and dark (blue-slate) share the Cobalt Signal hue; dark may lift lightness and flip label ink for contrast, never change hue 225.

### Don't:
- **Don't** flood screens with blue — no blue page backgrounds outside the single hero card, no blue gradients (The One-Field Rule).
- **Don't** add decorative shadows, glassmorphism, gradient-soup, or ornament that carries no information — the confirmed anti-reference is marketing fluff.
- **Don't** introduce a second accent hue for UI actions; charts' five data colors are for data only.
- **Don't** use Alert Red for anything but destructive/error semantics.
- **Don't** invent type styles outside the five roles (display / headline / title / body / label) or add a second font family.
- **Don't** soften corners beyond 12px on surfaces or harden controls past 6px — pills are for chips only.
