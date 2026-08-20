# Tinjau Frontend Redesign — Approved Design Specification

Status: approved direction, pending implementation plan  
Date: 2026-08-20  
Scope: T0.5, T6.1, T6.2; foundations for T6.5 and T7.1  
Primary tracker: `docs/buildx-orion-2026/outputs/04-planning/tinjau-lp-risk-autopilot-task-tracker.md`

## 1. Outcome

Replace the current filing-oracle/holder-digest experience with an operational risk interface that lets a first-time judge understand, within 30 seconds:

- what risk state Tinjau is in;
- which evidence changed it;
- whether OKX/X Layer market conditions confirm it;
- which actions are authorized or forbidden;
- how fee bounds, expiry, and decay constrain protection;
- whether the presented material is live, observed, replayed, or simulated;
- how static, volatility-only, and Tinjau policies compare over identical inputs.

The approved visual direction is **X Layer Circuit Breaker**. It replaces the incumbent “Bonded Warehouse” world rather than polishing it.

## 2. Scope Boundaries

### Included

- T0.5 public Tinjau branding throughout `apps/web/**`.
- T6.1 risk-state and evidence UI.
- T6.2 honest three-policy comparison UI.
- Browser choreography foundations for the three demo scenes.
- Responsive, accessible, loading, empty, error, stale, and degraded states required by T7.1.
- Motion architecture for meaningful state transitions, with reduced-motion behavior.

### Excluded from this implementation lane

- Backend schemas, APIs, scenario outcomes, benchmark computation, and contract writes.
- Fabricated transactions, market confirmations, benchmark winners, or live-service claims.
- Live news/social provider integration.
- Mainnet deployment or real-money activity.
- Tailark Quartz installation or any paid/API-key setup.
- A broad component-library migration unrelated to T0.5/T6.1/T6.2.

## 3. Why the Current Interface Must Be Replaced

The current frontend presents Tinjau as a customs house for SEC filings. Its metadata, hero, navigation, routes, visual metaphors, and components optimize for holder lookup and a forward calendar. The final product is instead an LP risk autopilot with three states, an Evidence Graph, independent market confirmation, bounded action, deterministic recovery, and an economic comparison.

Reusing the current “dock/kraft/stamp” world would preserve the wrong model of the product. Existing code is useful only as technical evidence for the Next.js/Tailwind stack, route conventions, formatting utilities, and chain integration patterns.

## 4. Evaluated Approaches

### A. X Layer Circuit Breaker — selected

A high-contrast operational console organized around state, causal evidence, market confirmation, and enforceable bounds. It gives the judge a single dominant answer first, then an audit trail.

Strengths: fastest state comprehension; natural fit for `NORMAL/WATCH/PROTECT`; makes the AI/deterministic boundary visible; scales from demo to reusable risk console.  
Risk: a dense console can become generic or overwhelming. Mitigation: one dominant state, strict color semantics, progressive detail, and no ornamental card grid.

### B. Evidence Flight Recorder — declined

A forensic timeline where every evidence mutation, source, market sample, and action is read chronologically.

Strengths: excellent provenance and post-event auditability.  
Weakness: the current state and permission boundary are slower to understand in the first viewport.  
Kept discipline: every change in the selected direction has a timestamped audit trail and reproducible source link.

### C. Quartz-led SaaS shell — declined

A polished marketing/product shell derived from Tailark Libre/Quartz composition patterns.

Strengths: calm typography and ready-made marketing rhythm.  
Weakness: too marketing-shaped for dense risk operations, gated behind a paid registry/API key, and requires shadcn setup absent from the current app.  
Kept discipline: clean spacing, restrained typography, and purposeful quiet between dense passages.

## 5. Direction Contract

This contract must become the opening production comment in the redesigned root layout before UI implementation begins.

```text
THESIS: Tinjau makes the boundary between evidence, authorization, and action inspectable; it refuses the generic DeFi dashboard that reduces risk to disconnected metric cards.
OWN-WORLD: OKX black and white, electric-lime interaction energy, strict semantic state colors, hairline circuit paths, square control surfaces, and dense but calm financial typography.
STORY: A judge sees the current risk state, follows the evidence and market confirmation that caused it, verifies the bounded action, then compares the same event under three policies.
FIRST VIEWPORT: A compact command bar tops a 12-column field: dominant state and reason at left, market confirmation at center, protection envelope at right, with one evidence-to-policy circuit continuing below the fold.
FORM: Circuit-breaker control room, candidate 5 of the grounded operational directions, seed 397a5fab.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
```

## 6. Information Architecture

The final MVP has two primary product routes.

### `/` — Risk State

The operational home and T6.1 surface. It displays one selected assessment or demo scenario. A judge does not have to visit a marketing page before seeing the product work.

### `/compare` — Policy Comparison

The T6.2 surface. It receives or selects the same scenario identity and shows static, volatility-only, and Tinjau results without an editorial winner.

The global header contains only:

- Tinjau wordmark;
- `Risk State` and `Policy Compare` navigation;
- selected asset/pool;
- X Layer network label;
- scenario data-mode summary that lists every mode present without inventing a new enum;
- freshness/last-updated indicator.

Legacy `holdings`, `calendar`, and `scoreboard` navigation is removed from the primary experience. During implementation, each legacy route must either be intentionally redirected or retained as a clearly separated historical surface; it may not remain discoverable as if it described the current product.

## 7. Visual System

### 7.1 Palette

Use OKX-derived tokens as the foundation:

| Role | Dark token | Light counterpart | Use |
|---|---:|---:|---|
| Base | `#000000` | `#FFFFFF` | application ground |
| Base secondary | `#121212` | `#FAFAFA` | grouped region |
| Surface | `#1D1D1D` | `#F3F3F3` | controls and dense tables |
| Raised surface | `#272727` | `#FFFFFF` | selected/expanded detail |
| Primary text | `#FFFFFF` | `#000000` | headings and primary values |
| Secondary text | `#E6E6E6` | `#383838` | body and labels |
| Muted text | `#B3B3B3` | `#5B5B5B` | timestamps and supporting metadata |
| Border | `#383838` | `#E6E6E6` | hairlines and section boundaries |
| Strong border | `#4D4D4D` | `#B3B3B3` | selected/focus-adjacent boundaries |
| Brand/interaction | `#BCFF2F` | `#BCFF2F` | primary action, active nav, focus |
| NORMAL | `#31BD65` | adjusted token after contrast validation | positive baseline state |
| WATCH | `#F76816` | adjusted token after contrast validation | unresolved/monitoring state |
| PROTECT | `#F04872` | adjusted token after contrast validation | bounded protective state |
| Confirmation/link | `#4283FF` | adjusted token after contrast validation | market confirmation and external evidence |

Electric lime is interaction energy, not a fourth risk state. `NORMAL`, `WATCH`, and `PROTECT` keep separate semantic tokens. Text, icon, shape, and wording accompany every color.

Dark mode is the default demo presentation. Light-mode tokens may be implemented if they do not jeopardize the submission-critical route; the component API must not hard-code dark raw hex values.

### 7.2 Typography

- Display/state: Space Grotesk, 600–700.
- Interface/body: Inter, 400–600.
- Numeric/audit: JetBrains Mono, 400–600, tabular numerals enabled.
- Minimum body size: 16px. Dense metadata may use 12–14px only when it is supplementary and passes contrast requirements.
- State words are large and direct, never split into gradient text or decorative outlines.

### 7.3 Geometry and Material

- Near-square controls with a restrained 4–8px radius scale.
- 1px structural hairlines; 2px only for selected or actively constrained regions.
- No glassmorphism, neon bloom, gradient text, pill cloud, floating crypto orb, or indiscriminate bento-card layout.
- Surfaces form one circuit field rather than independent floating cards.
- Icons are SVG from one consistent library or custom circuit glyphs; no emoji.

### 7.4 Density

Desktop density is high but hierarchical. One element dominates each region:

- state in the assessment region;
- confirmation status in market data;
- applied versus maximum fee in protection;
- exact metric value in comparisons.

Secondary evidence is disclosed progressively. Empty surface area separates major passages so the interface does not become a wall of telemetry.

## 8. T6.1 Risk-State Surface

### 8.1 Command Bar

Always visible near the top:

- asset symbol and shortened address;
- pool identity;
- network and chain ID;
- assessment/schema version;
- every data mode present in the selected scenario, with claim-level modes still visible;
- last observation and freshness status;
- scenario selector when demo fixtures are available.

Changing a scenario updates the URL or query parameters so the state is shareable and reproducible.

### 8.2 Risk State Core

The largest region answers:

- current state;
- previous state when available;
- human explanation;
- reason codes;
- confidence band;
- assessed and expiry timestamps;
- what is allowed now;
- what is explicitly forbidden now.

`WATCH` must state “Aggressive fee not authorized” in the primary reading path. `PROTECT` must state that protection is temporary and bounded. `NORMAL` must not imply that future risk is impossible.

### 8.3 Evidence Circuit

Evidence is rendered as an accessible relationship model, not as decorative graph art.

Desktop:

- source nodes flow left to right into grouped event identity;
- relationship rails distinguish `SUPPORTS`, `CONTRADICTS`, and `DUPLICATE` through line style, icon, and text;
- independence groups make syndicated duplicates visibly collapse into one origin;
- an official-confirmation marker is explicit;
- selecting a claim opens provenance detail without hiding the original list.

Mobile and non-visual fallback:

- claims become an ordered relation list or table;
- every edge is expressed as text, such as “Claim B contradicts Claim A”;
- provenance, source class, data mode, publisher, timestamp, source URL/ID, and expiry remain available without hover.

### 8.4 Market Confirmation

Show:

- `CONFIRMED`, `NOT_CONFIRMED`, `UNAVAILABLE`, or `STALE`;
- observed timestamp and block number;
- freshness;
- anti-wick result;
- OKX reference price;
- X Layer pool price;
- basis, drawdown, trade velocity, and executable exit depth where supplied;
- reason codes for passing or failing.

Missing values display `Unavailable` with a reason, never zero. A stale or unavailable status visually interrupts the path to a new `PROTECT`.

### 8.5 Protection Envelope

Show the deterministic limits beside the proposed/actioned value:

- baseline fee;
- requested fee;
- applied fee;
- maximum fee;
- maximum duration;
- expiry;
- cooldown;
- decay progress and target baseline.

A horizontal bounded-range visualization may be used, but exact numbers and units remain visible. The range must never resemble an editable slider unless the user can actually edit it.

### 8.6 Action Lifecycle

Render `NONE`, `PENDING`, `APPLIED`, `FAILED`, `EXPIRED`, and `DECAYED` as an audit sequence. Where present, expose transaction hash and explorer link. A failure displays its reason adjacent to the failed step. An expired or decayed action remains readable as history.

### 8.7 Trust Boundary

A persistent compact statement distinguishes:

```text
AI: parses, resolves, groups, explains, proposes
Policy/contract: validates, authorizes, bounds, expires, recovers
```

The statement changes with the selected state to name the exact rejected or authorized behavior; it is not a generic footer disclaimer.

## 9. T6.2 Three-Policy Comparison

### 9.1 Input Identity Ribbon

Before any result, show the shared:

- scenario/event ID;
- token and pool;
- replay window;
- trades and initial-liquidity identity;
- method/policy versions;
- fee ceiling and duration envelope;
- observed/counterfactual basis;
- data limitations.

This proves the inputs are comparable.

### 9.2 Policy Columns

Static, Volatility-only, and Tinjau receive equal visual weight and identical metric order. The Tinjau column may carry its brand accent as a label, but it may not be larger, preselected as winner, or decorated with a crown/trophy.

Each column shows:

- input classes available to the policy;
- trigger/action summary;
- fee path;
- action latency;
- maximum fee;
- protection duration;
- decay behavior;
- benchmark outcome values.

### 9.3 Metric Presentation

Use direct-value grouped bars or bullet charts for magnitude comparison and a visible table for exact values. Do not use radar charts because precise comparison matters. Required metrics are shown only where present in the handoff:

- fee revenue;
- LP markout;
- adverse selection;
- action latency;
- maximum fee;
- protection duration;
- decay time;
- false-positive cost;
- false-negative/indeterminate labels.

Every metric includes units, basis, and unavailable/indeterminate handling. Bars use direct labels and outlines/patterns in addition to color.

### 9.4 Neutral and False-Rumor Cases

Scenario controls must make the neutral and false-rumor cases first-class, not footnotes. If a scenario has no economic row, the comparison explains why and limits itself to behavioral/safety results.

### 9.5 Claim Gate

The result summary reads backend-provided eligibility:

- if `canClaimLossAvoided` is true, display the supported claim and method qualification;
- if false, display why the claim is unavailable;
- if one policy matches or beats Tinjau, state that result plainly;
- if a result is indeterminate, do not infer a winner.

No winner sentence is hard-coded in frontend source.

## 10. Demo Choreography Foundation

The routes must support three reproducible browser scenes:

1. **Rumor containment:** open Scene A directly; see the separate `RUMOR`, `SIMULATED`, and `REPLAY` labels where they apply; trace duplicate origins; end at `WATCH`; verify aggressive fee is unauthorized.
2. **Confirmed protection:** open Scene B directly; see official evidence and market confirmation; follow `PROTECT`, applied bounded fee, expiry/decay, and return to `NORMAL`.
3. **Policy comparison:** continue with the same scenario identity at `/compare`; inspect static, volatility-only, and Tinjau without an editorial winner.

Scenario switching must be deterministic, deep-linkable, and compatible with fixture-only fallback. Animations never determine semantic state correctness.

## 11. Motion

Motion is optional as a dependency until the implementation plan confirms the exact interactions. If used, install `motion` and import from `motion/react`.

Purposeful motion only:

- state transition: approximately 220–320ms;
- evidence-path propagation: one orchestrated sequence, approximately 350–500ms;
- expand/collapse provenance: spatially continuous layout transition;
- protection decay: time-position update without flashing or perpetual pulsing;
- comparison changes: interruptible cross-fade/layout change.

Simple hover and color transitions remain CSS. `prefers-reduced-motion` renders the final semantic state immediately and disables path propagation, shimmer, and nonessential counting.

## 12. Responsive Behavior

Target validation widths: 375px, 768px, 1024px, and 1440px.

- Desktop uses a 12-column circuit field.
- Tablet reduces secondary metadata and stacks evidence below state/confirmation.
- Mobile begins with a sticky compact state summary, then follows the causal order: evidence → market confirmation → authorization → action.
- Evidence graphs become semantic relation lists.
- Policy comparison becomes a metric-first matrix or stacked policy sections; it does not require horizontal page scrolling.
- Touch targets are at least 44×44px with at least 8px separation where adjacent.
- No critical content or action exists only on hover.

## 13. Loading, Empty, Error, Stale, and Degraded States

- **Loading:** stable-size skeleton regions; data-mode and route context remain visible; no fake values.
- **Empty assessment:** explain that no assessment exists for the selected asset/window and offer valid scenarios; do not show `NORMAL` as a default guess.
- **Schema/API error:** fail closed, preserve the last verified timestamp if available, and state that promotion/action data cannot be trusted.
- **Stale market data:** retain evidence, mark confirmation `STALE`, and show that a new `PROTECT` is blocked.
- **Unavailable market data:** distinguish provider/RPC unavailability from a measured `NOT_CONFIRMED` result.
- **Partial provenance:** mark the claim invalid or non-promotable rather than inventing a URL/author.
- **Action failure:** preserve the authorized decision and show the failed execution reason separately.
- **Fixture fallback:** label the entire scenario `REPLAY` or `SIMULATED` at the command-bar level and again beside affected claims.
- **Indeterminate comparison:** keep the metric row with an explanation; never coerce it to zero.

## 14. Accessibility

- WCAG 2.2 AA contrast minimum.
- Visible focus ring using the electric-lime interaction token with sufficient offset.
- Native buttons, links, tables, headings, lists, and disclosure semantics.
- Status is communicated by text, icon/shape, and color.
- Evidence relationships have a linear text representation.
- Charts have direct labels and an equivalent visible data table.
- Live updates do not steal focus; user-triggered scenario changes announce a concise state summary through a polite live region.
- External source and explorer links disclose that they open external evidence.
- Dates use machine-readable `datetime`; hashes/addresses expose full values to assistive technology even when visually shortened.
- Reduced motion is first-class.

## 15. Resource Decisions

- **Impeccable:** owns the replacement-world process, direction contract, finish review, and final post-build `DESIGN.md` documentation.
- **UI UX Pro Max:** mandatory quality source for density, accessibility, semantic badges, deep linking, comparison charts, responsive behavior, and Next.js route states. Its generated palette is overridden by the user-pinned OKX/X Layer palette.
- **Motion:** recommended for state/layout continuity after the implementation plan confirms value and bundle cost.
- **21st.dev:** reference/discovery source for timelines, tables, badges, charts, empty states, and dashboards. Components are reviewed and adapted; none are copied as a product identity.
- **Tailark Quartz Libre:** composition reference only. It is not installed because Quartz is gated and the app currently lacks shadcn registry setup.

## 16. Component and Data Boundaries

Suggested route-local component boundaries:

- `RiskCommandBar`: context, data mode, freshness, scenario navigation.
- `RiskStateCore`: state, explanation, reasons, confidence, allowed/forbidden behavior.
- `EvidenceCircuit`: claims, provenance, independence groups, relationships.
- `MarketConfirmation`: OKX/X Layer values, freshness, and decision reasons.
- `ProtectionEnvelope`: fee bounds, duration, expiry, cooldown, decay.
- `ActionLifecycle`: authorization/execution history and transaction evidence.
- `TrustBoundary`: AI proposal versus deterministic enforcement.
- `ComparisonInputRibbon`: shared input/method identity.
- `PolicyComparison`: equal policy columns, charts, exact table, claim gate.

Components consume only the validated frontend handoff view models. Presentation adapters may format values but may not infer missing state, convert unavailable to zero, or determine benchmark winners.

## 17. Branding Migration Requirements

T0.5 is complete only when:

- metadata title and description describe the market discontinuity guard;
- public headings, navigation, links, footer, screenshots, favicon/manifest, and API-facing UI labels say Tinjau;
- the old customs-house, filing cargo, holder digest, and forward-calendar narrative no longer defines the public experience;
- remaining `AFTERHOURS` strings under `apps/web/**` are either removed or deliberately labeled historical identifiers;
- `AfterhoursFeeHook` and similar compatibility identifiers are not silently renamed;
- `tinjau.xyz` presents no stale public branding after deployment.

Working metadata direction:

- Title: `Tinjau — LP Risk Autopilot on X Layer`
- Description: `Source-grounded market discontinuity protection for tokenized-stock liquidity: evidence, independent confirmation, bounded action, and deterministic recovery.`

## 18. Verification Strategy

Before T0.5/T6.1/T6.2 can close:

1. production build and TypeScript typecheck pass;
2. public routes and deep-linked scenarios render from a clean browser;
3. frontend handoff JSON validates before rendering;
4. rumor-only fixture visibly remains `WATCH` and shows unauthorized aggressive fee;
5. confirmed fixture displays bounded `PROTECT` and recovery only when supplied by validated data;
6. three policies use identical input identity and metric order;
7. no winner language exists outside data-driven, eligibility-gated copy;
8. loading, empty, error, stale, unavailable, fixture fallback, and indeterminate states are exercised;
9. keyboard navigation, focus, landmark hierarchy, reduced motion, and chart/table alternatives are checked;
10. layouts are inspected at 375, 768, 1024, and 1440px;
11. changed UI targets pass the Impeccable detector;
12. desktop and mobile screenshots receive the Impeccable finish review;
13. only after the reviewed implementation is final is `DESIGN.md` replaced and documented from shipped code.

## 19. Dependencies and Open Inputs

Implementation may begin with T0.5 immediately. A draft `risk-record.schema.json` is already present, but it is one partial, unverified handoff artifact rather than integration readiness. T6.1 and T6.2 integration requires the complete mandatory versioned frontend handoff, especially:

- `risk-record.schema.json`;
- `evidence-graph.schema.json`;
- `proof-of-protection.schema.json`;
- rumor and confirmed scenario fixtures;
- `three-policy-comparison.json`;
- deployed addresses, transaction evidence, and known limitations.

Until those artifacts exist, UI work is limited to typed local fixture adapters whose values are visibly marked structural/replay/simulated and can be replaced without changing component semantics.

## 20. Documentation Lifecycle

`PRODUCT.md` records durable product truth and is updated now. This specification records the approved direction and implementation contract. The incumbent `DESIGN.md` remains historical visual evidence until the replacement world is implemented, inspected, and reviewed. Impeccable then replaces `DESIGN.md` from the shipped interface so the design system describes reality rather than aspiration.
