---
name: Tinjau
description: A proof-first LP risk autopilot for tokenized-stock liquidity on X Layer.
colors:
  paper: "#F5F5F0"
  carbon: "#000000"
  carbon-raised: "#1D1D1D"
  signal: "#BCFF2F"
  normal: "#31BD65"
  watch: "#F76816"
  protect: "#F04872"
  proof: "#4283FF"
typography:
  display: "Inter Tight"
  body: "Inter"
  data: "JetBrains Mono"
radius:
  control: "2px"
  panel: "0px"
---

# Tinjau design system

## Creative direction

**North star: Evidence control room.**

Tinjau should feel like a serious market-infrastructure product whose public site can explain the system and
whose demo can be audited. It uses the visual discipline of OKX and X Layer—black, white, precise typography,
and one electric signal color—without imitating their page layouts.

The public routes deliberately change density by purpose:

- `/` is an editorial product narrative on warm paper. It explains the blind window, the system path, the
  safety boundary, and why X Layer is part of the architecture.
- `/demo` is a carbon-black guided field exercise. It starts at Mission Select, reveals evidence only after a
  constrained decision, and keeps the coach console visible beside system output.
- `/developers` is a role-based integration guide. Every step is labeled as implemented, historical, or pending,
  and pending paths do not publish executable setup commands.
- `/proof` is the evidence ledger. It separates historical X Layer deployments, builder-controlled test assets,
  final deployment readiness, capability maturity, data mode, and build provenance.

The interface must never use visual confidence to imply technical completeness. What exists, what is replayed,
and what remains pending are visible in the same viewport as the claim.

## Palette

- **Paper `#F5F5F0`:** landing background and explanatory surfaces.
- **Carbon `#000000`:** demo background, primary text on paper, and high-emphasis controls.
- **Raised carbon `#1D1D1D`:** operational sub-surfaces where a border alone is insufficient.
- **Signal lime `#BCFF2F`:** primary actions, active system paths, and focus. It never represents risk.
- **NORMAL `#31BD65`:** normal policy state only.
- **WATCH `#F76816`:** caution and blocked aggressive actions only.
- **PROTECT `#F04872`:** bounded protective state only.
- **Proof `#4283FF`:** source confirmation or verifiable evidence only.

Muted text is `#5B5B57` on paper and `#B3B3B3` on carbon. White, black, and lime combinations are the dominant
contrast pairs. Semantic badges use dark text on light fills so small labels remain readable.

## Typography

- **Inter Tight:** display headlines and large section statements.
- **Inter:** paragraphs, navigation, controls, and explanatory UI.
- **JetBrains Mono:** timestamps, hashes, addresses, status codes, checksums, and comparable metrics.

Headlines use sentence case. Uppercase is reserved for short operational labels such as `WATCH`, `REPLAY`, or
`PENDING`. Limit a route to three font weights and avoid dense walls of all-caps copy.

## Layout and hierarchy

Landing sections use an asymmetric editorial grid, long horizontal rules, and generous vertical rhythm. The
system story is a connected path, not a feature-card collection. Explanatory prose remains narrow enough to
scan while diagrams can use the full content width.

The demo keeps four stable layers:

1. mission identity and explicit progress;
2. the nine-stage walkthrough rail, with completed stages reviewable and future stages locked;
3. the permanent coach console: what happened, objective, known, unknown, why it matters, and constrained choices;
4. system output that begins empty and accumulates only the records earned by accepted decisions.

On narrow screens, the stage rail scrolls horizontally with keyboard focus. Data tables may scroll, but core
state, reason, and capability labels must remain readable without horizontal page overflow.

Mission state is preserved in `sessionStorage`, scoped to the browser tab. A refresh restores valid progress;
invalid or fabricated state fails closed to Mission Select. Query parameters mirror progress for orientation but
cannot unlock a stage or start a mission on their own.

## Truth model

Two independent labels are mandatory:

- **Data mode:** `LIVE`, `OBSERVED`, `REPLAY`, or `SIMULATED` describes where the displayed data came from.
- **Capability maturity:** `IMPLEMENTED`, `HISTORICAL`, `PENDING`, or `ROADMAP` describes whether the product
  path exists now.

Never merge these axes. A simulated input can exercise implemented code; historical contract evidence is not a
live action; a pending integration cannot be shown as live because its fixture looks realistic.

The central capability manifest in `apps/web/src/lib/product/capabilities.ts` is the UI source of truth. Copy and
badges should be derived from it instead of being improvised per component.

## Component rules

- Panels are flat and square, separated by 1px rules rather than shadows.
- Primary buttons use signal lime on carbon; secondary controls use transparent or paper fields with explicit
  borders.
- Status chips are compact, readable, and semantic. Do not use a colored dot without a text label.
- Source links expose the original source and provenance. Disabled or unavailable links explain why.
- Comparison rows preserve `null` and `pending`; missing economics are never displayed as zero.
- The historical contract name `AfterhoursFeeHook` may appear only with an explicit historical explanation.
- Unsafe mission choices remain selectable for teaching, but rejection cannot advance progress or reveal output.
- Important state changes and guardrail rejections may open a focused modal. Routine steps remain in the permanent
  console so the flow is not interrupted by repeated overlays.

## Motion

Motion exists to explain sequence and state change. Use short entrance choreography for the landing narrative,
progressive output reveals, and important modal transitions. Honor `prefers-reduced-motion`; correctness never
depends on animation completion.

Do not use perpetual movement, parallax, floating shapes, springy decorative icons, animated gradients, or
stagger every element on a page. Buttons may change color or translate by one pixel; panels do not hover-float.

## Anti-patterns

Do not add gradients, glass blur, glow, decorative orbs, generic bento grids, three identical feature cards,
oversized rounded rectangles, nested cards, `transition-all`, or placeholder metrics. Avoid generic AI phrases
and claims such as “best,” “revolutionary,” or “winner” unless the benchmark proves them.

The demo must not manufacture a PROTECT transaction, a successful X post, final market confirmation, or a
comparison winner. Empty, stale, unavailable, loading, error, and degraded states should read as operational
truth—not as unfinished styling.

## Reference discipline

`ui-ux-pro-max`, Impeccable, Tailark Quartz, Motion, and 21st.dev inform layout, interaction, and quality review.
They are references rather than templates: components are built for Tinjau's evidence model and no third-party
component source is copied without a compatible license.

---

_Updated 2026-08-21 after the product-site and guided-demo redesign._
