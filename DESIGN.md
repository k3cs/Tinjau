---
name: Tinjau
description: A proof-first LP risk autopilot for tokenized-stock liquidity on X Layer.
colors:
  black: "#000000"
  surface: "#1D1D1D"
  surface-raised: "#272727"
  paper: "#FAFAFA"
  paper-soft: "#F3F3F3"
  signal: "#BCFF2F"
  signal-soft: "#E6FFB0"
  normal: "#31BD65"
  watch: "#F76816"
  protect: "#F04872"
  confirm: "#4283FF"
typography:
  display: "Inter Tight"
  body: "Inter"
  data: "JetBrains Mono"
radius:
  control: "4px"
  panel: "8px"
  pill: "60px"
---

# Tinjau design system

## Creative direction

**North star: evidence control room.**

Tinjau should read as serious market infrastructure whose public site explains the system and whose
demo can be audited. Visual confidence must never imply technical completeness: what exists, what is
replayed, what is constructed, and what is only planned are visible in the same viewport as the claim
they qualify.

Route density changes with purpose:

- `/`: editorial product narrative on paper. The problem, the measured result, the architecture.
- `/risk`: carbon-black operational console. **One screen** carrying a whole decision: state,
  reason codes, evidence, market leg, bounded action, and the AI's forbidden list. This is the
  screen T6.1 is judged on.
- `/compare`: the three-policy benchmark on paper, including the part that did not go our way.
- `/roadmap`: a hard line between what runs and what is only intended.
- `/proof`: the deployment ledger, read from the handoff rather than retyped.
- `/demo`: the guided nine-stage field exercise.
- `/developers`: role-based integration guide.

## Palette, extracted from OKX rather than approximated

On 2026-08-21 the stylesheets behind `https://web3.okx.com/xlayer` were downloaded and their CSS
custom properties parsed. That page sets `class="theme-dark"` on `<html>` and its tokens are named
`--okd-*` (OKX Design). Every colour below is a value read from those files, with the token it came
from. Nothing here is eyeballed from a screenshot.

Source files (OKX CDN, `https://web3.okx.com/cdn/assets/…`):
`okfe/okx-nav/okxGlobal/index.7f595b10.css`, `okfe/okx-nav/web3Global/index.91731441.css`,
`okexchain/oec-homepage/okbc/index.e519ebee.css`, plus nine sibling bundles from the same page.
The full token set (973 variables, 390 of them `--okd-color|font|radius|shadow`) was extracted; the
subset Tinjau uses is below.

### Neutrals (dark)

| Token | Value | Tinjau name |
|---|---|---|
| `--okd-color-background-base-primary` | `#000000` | `canvas` |
| `--okd-color-background-base-secondary` | `#121212` | `canvas-soft` |
| `--okd-color-card-primary` | `#0E0E0E` | `canvas-sunken` |
| `--okd-color-background-surface-primary` | `#1D1D1D` | `surface` |
| `--okd-color-background-surface-contrast` | `#272727` | `surface-raised` |
| `--okd-color-background-surface-pressed` | `#383838` | `surface-pressed` |
| `--okd-color-border-primary` | `#383838` | `edge` |
| `--okd-color-border-secondary` | `#4D4D4D` | `edge-strong` |
| `--okd-color-content-primary` | `#FFFFFF` | `ink` |
| `--okd-color-content-secondary` | `#E6E6E6` | `ink-secondary` |
| `--okd-color-content-tertiary` | `#B3B3B3` | `ink-muted` |
| `--okd-color-content-static-subtle` | `#969696` | `ink-faint` |
| `--okd-color-content-disabled` | `#5B5B5B` | `ink-disabled` |

### Neutrals (light)

| Token | Value | Tinjau name |
|---|---|---|
| `--okd-color-background-base-primary` | `#FFFFFF` | `paper-bright` |
| `--okd-color-background-base-secondary` | `#FAFAFA` | `paper` |
| `--okd-color-background-surface-primary` | `#F3F3F3` | `paper-soft` |
| `--okd-color-card-secondary` | `#F6F6F6` | `paper-sunken` |
| `--okd-color-border-primary` | `#E6E6E6` | `edge-light` |
| `--okd-color-content-primary` | `#000000` | `coal` |
| `--okd-color-content-secondary` | `#383838` | `coal-soft` |
| `--okd-color-content-tertiary` | `#5B5B5B` | `coal-muted` |
| `--okd-color-content-static-subtler` | `#858585` | `coal-faint` |

### Brand and semantics

| Token | Value | Tinjau name and meaning |
|---|---|---|
| `--okd-color-background-surface-brand` (dark) | `#BCFF2F` | `signal` (interaction and active path). **Never a risk state.** |
| `--okd-color-brand-content` | `#E6FFB0` | `signal-soft` (hover on brand fill) |
| `--okd-color-brand-primary` (light) | `#2B6D17` | `signal-deep` (brand on light, where lime fails contrast) |
| `--okd-color-fq-positive` (light) | `#31BD65` | `normal` (the `NORMAL` state only) |
| `--okd-color-fq-warning` (dark) | `#F76816` | `watch` (`WATCH`, constructed inputs, blocked actions) |
| `--okd-color-fq-critical` (dark) | `#F04872` | `protect` (`PROTECT` and failed conditions) |
| `--okd-color-blue-900` (dark) | `#4283FF` | `confirm` (source confirmation and verifiable evidence) |

Pure black is an intentional OKX/X Layer token, not a stylistic tic. Semantic colours are reserved
for semantic meaning; a colour never appears decoratively in a role it also carries meaning in.

## The mark

The mark draws one bounded protection event, which is the only thing the product claims: a flat
baseline, a sharp rise when evidence qualifies, a plateau held flat because it has reached the
ceiling the contract enforces, then a deterministic return to the baseline it left.

**The break at the top right is deliberate and load-bearing.** The stroke stops at the end of the
plateau and the return begins as a separate subpath. The curve reads as cut off by its limit rather
than as a smooth arc easing itself down. That gap is §0.6 in one glyph: something proposes a rise,
and a hard line decides how far it gets. Closing the gap, or letting the plateau overshoot, would
make the logo assert something the contract forbids, so neither is a stylistic option.

Source of truth is `Tinjau-logo.png` at the repository root. The vector in
`src/components/tinjau-mark.tsx` is traced from it by measurement rather than by eye: both were
rasterised at 1024px and compared as pixel masks, and the `regular` weight scores **IoU 0.96**
against the reference, the residual being antialiasing and sub-unit corner rounding. Do not redraw
the mark by hand; re-measure if it ever needs to change.

Two weights, because one stroke cannot serve 20px and 200px:

| Weight | Stroke (64 box) | Use |
|---|---|---|
| `regular` | 2.19 | the faithful trace; correct from roughly 64px up, and what the OG image uses |
| `compact` | 3.5 at 1.25x scale | everything below about 48px, including the favicon and every in-product use |

`compact` exists because at 28px a 2.19-unit stroke renders under one pixel and antialiases from
lime to olive. It scales the same shape up inside the box, thickens the stroke, and widens the break
to compensate so the gap survives the downscale. At a true 16px the break no longer resolves and the
mark reads as a silhouette; that is a physical limit of 16 pixels, not a defect to design around,
and 32px (what a retina tab actually renders) is clean.

**Colour is `currentColor`, and the light-surface variant is not an inversion.** On carbon the mark
is `signal` `#BCFF2F`. On paper it is `signal-deep` `#2B6D17`, the OKX light-mode brand token,
because the lime fails contrast on a light surface. Dimming or desaturating the lime is wrong; use
the token.

## Typography

OKX ships proprietary faces: `OKXSans` (weights 200–600) and `OKXSansMono` (200–600), with the
fallback chain `HarmonyOS Sans, SF Pro Text, SF Pro Icons, Arial, Helvetica Neue, Helvetica,
sans-serif`. **Neither is redistributable, so neither is used here.** Inter Tight, Inter and
JetBrains Mono stand in at the same weights, and OKX's fallback chain follows them so the rendered
result degrades the same way theirs does.

The scale is OKX's `--okd-text-*` set, verbatim:

| Role | Size / line-height / weight |
|---|---|
| `display-lg` | 56px / 1.32 / 500 |
| `heading-xxl` | 40px / 1.32 / 600 |
| `heading-xl` | 36px / 1.32 / 600 |
| `heading-lg` | 30px / 40px / 500 |
| `heading-md` | 24px / 30px / 500 |
| `heading-sm` | 18px / 24px / 500 |
| `body-md` | 16px / 24px |
| `body-sm` | 14px / 21px |
| `body-xs` | 12px / 18px |
| `heading-overline` | 12px / 15px / 500 |

Two page-level sizes come from the X Layer homepage's own rules rather than the token file, because
they are what makes that page recognisable:

- **Hero:** 36px → 62px → 64px → 72px across the breakpoints, **weight 500**, line-height **0.95**
  (`.index_headline__Cok+C`).
- **Section heading:** 42px → 48px, line-height **0.90** (`.index_title__lDS6L` and siblings).

The signature is large display type at *medium* weight with sub-1.0 leading, not bold and not airy.
Headlines are sentence case. Uppercase is reserved for short operational labels (`WATCH`, `REPLAY`,
`PENDING`) and is set in mono with tracking.

## Radius

OKX's `--okd-border-radius-*` scale, adopted directly: `none 0`, `sm 2px`, `md 4px`, `lg 6px`,
`xl 8px`, `2xl 10px`, `3xl 12px`. Buttons use `--okd-button-*-border-radius` = **60px** (pill) for
primary actions and **4px** for rectangular controls.

**This is a deliberate change** from the previous Tinjau direction, which specified 0px square
panels everywhere. Matching OKX was an explicit instruction and the radius scale is part of what
makes their surfaces read as theirs. Controls are 4px, panels 8px, primary CTAs are pills.

## Layout and hierarchy

Landing sections use an asymmetric editorial grid, long horizontal rules and generous vertical
rhythm. Panels are flat fields bounded by a hairline, separated by 1px rules rather than shadows.
The system story is a connected path, not a feature-card collection.

`/risk` keeps everything on one screen because its acceptance test is a judge explaining a decision
from one screen. It does not stage or step; the only mode is which scenario is selected.

Wide content (tables, the comparison grid, the deployment ledger) scrolls inside its own container.
Core state, reason and capability labels stay readable without horizontal page overflow.

## Truth model

Two independent labels, never merged:

- **Data mode**: `LIVE`, `OBSERVED`, `REPLAY`, `SIMULATED`. Where the displayed material came from.
- **Capability maturity**: `IMPLEMENTED`, `HISTORICAL`, `PENDING`, `ROADMAP`. Whether the path
  exists now.

A simulated input can exercise implemented code; historical contract evidence is not a live action;
a pending integration cannot be shown as live because its fixture looks realistic.

A third axis exists on `/risk` and must not be folded into data mode: **market leg provenance**
(`REPLAYED` / `CONSTRUCTED`). The record-level `dataMode` is derived from the *evidence* only, so on
the confirmed scenario it reads `REPLAY` and cannot express that the price path was built. That fact
lives in `provenance.marketLeg` and in the critical caveat block, and both are rendered at the
weight of the state itself.

## Data provenance

`src/lib/handoff/` imports the published artifacts under
`docs/buildx-orion-2026/outputs/05-build/frontend-handoff/` directly. Every number on screen comes
from there. Risk records are run through `validateRiskRecord` at module load, so a handoff that
breaks its own contract fails the build rather than rendering something false.

`apps/web/test/handoff-parity.test.ts` pins the view model to the published schema (every enum, in
order) and pins the honesty invariants the copy depends on: no frozen scenario reaches `PROTECT`,
the one `PROTECT` carries its constructed caveat, `canClaimLossAvoided` is false, the OKX leg is
unavailable, and the addresses are marked not-final. If the data stops supporting a sentence on the
site, the test fails before the sentence becomes untrue.

## Component rules

- Status chips are compact, readable and semantic. Never a coloured dot without a text label.
- Source links expose the original source. Unavailable links explain **why**, and are shown rather
  than hidden, because a claim rejected for incomplete provenance is part of why the state is what it is.
- Comparison rows preserve `null` and `pending`. Missing economics are never displayed as zero.
- `observedAt: null` renders as "Nothing was observed", never as a dash and never as a substituted
  timestamp.
- Independence is reported as `usableOriginCount`, never `independentOriginCount` alone.
- The historical contract name `AfterhoursFeeHook` may appear **only** with an explicit historical
  label. It is the immutable name of a genuinely deployed contract (§0.18), not a branding defect.
- Unsafe demo choices stay selectable for teaching, but rejection cannot advance progress.

## Motion

Motion explains sequence and state change. It is built on `motion/react` with `LazyMotion` +
`domAnimation` so the runtime stays small, and every animated component reads `useReducedMotion`
and collapses to an instant cut. `globals.css` also carries a global
`@media (prefers-reduced-motion: reduce)` clamp as a second line of defence.

The vocabulary, in `src/lib/ui/motion.ts`, is four durations and one easing curve
(`cubic-bezier(0.22, 1, 0.36, 1)`): 260 ms for a state change, 360 ms for a list row, 420 ms for
new information, 500 ms for a section entrance. Shared-layout indicators (the nav underline, the
segmented control's marker) move as one element so the change reads as *the same marker moved*.

No perpetual movement, parallax, floating shapes, springy decorative icons, animated gradients, or
whole-page staggers. Buttons may change colour and translate one pixel; panels do not hover-float.
Correctness never depends on an animation completing.

## Anti-patterns

No gradients, glass blur, glow, decorative orbs, bento grids, three identical feature cards, nested
cards, `transition-all`, or placeholder metrics. Avoid generic AI phrasing and any superlative the
benchmark does not prove.

The product must never manufacture a `PROTECT` transaction, a market confirmation, or a comparison
winner. Empty, stale, unavailable, loading, error and degraded states read as operational truth, not
as unfinished styling.

## Copy

Plain, short, and qualified. When a sentence is shortened, the qualifier survives the edit.
Compressing a hedged claim into a punchy one is exactly how an overclaim reappears.

Forbidden on every surface (§0.19, `known-limitations.md` §18): first AI dynamic-fee hook; first
multi-agent corporate-action oracle; first on-chain risk registry; first CEX/DEX risk agent; first
self-protecting pool; production adoption, protected TVL, customers or revenue; "production-ready"
from a builder-controlled pool; a live Exchange OS integration; dual OKX/X Layer confirmation; and
any form of "Tinjau reduces LP loss".

The claim that *is* available is behavioural, and it is what the site leads with: Tinjau declined to
act on two large price moves because neither had a qualifying cause, and one of them a
volatility-only policy would have traded on. Restraint, not protection.

## Reference discipline

`ui-ux-pro-max`, Impeccable, Motion and 21st.dev inform layout, interaction and review. They are
references, not templates: components are built for Tinjau's evidence model, and no third-party
component source is copied without a compatible licence.

---

_Updated 2026-08-21. Palette and type scale extracted from `web3.okx.com/xlayer` on the same date;
token names and source files recorded above._
