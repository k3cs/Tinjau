# Tinjau Frontend Redesign — Implementation Plan

Status: ready for execution  
Date: 2026-08-20  
Approved design: `docs/superpowers/specs/2026-08-20-tinjau-frontend-redesign-design.md`  
Primary tasks: T0.5, T6.1, T6.2  
Mode: Operate  
Direction: X Layer Circuit Breaker, Impeccable seed `397a5fab`

## 1. Objective

Replace the current customs-house/holder-digest frontend with a judge-facing LP risk interface that:

- uses Tinjau branding and OKX/X Layer-derived visual tokens;
- explains `NORMAL`, `WATCH`, and `PROTECT` from one screen;
- exposes evidence provenance and relationships;
- makes OKX/X Layer confirmation and policy bounds inspectable;
- compares static, volatility-only, and Tinjau policies over identical inputs;
- never fabricates backend state, transactions, benchmark results, or winner language;
- ships with responsive, accessible, degraded, and fixture-backed behavior.

## 2. Current State and Dependency Gates

### Frontend baseline

- Next.js 15.5 App Router, React 19, TypeScript, Tailwind CSS 3.4, and `viem`.
- No component library, animation dependency, chart library, test runner, or browser-test setup.
- Public routes currently expose `/`, `/holdings`, `/calendar`, and `/scoreboard`.
- The visual system is the obsolete “Bonded Warehouse” world.
- The root direction contract still carries seed `c093dccb` and an `AFTERHOURS`-derived customs metaphor.
- The wordmark icon still displays `AH`.
- The package description and metadata still describe a customs house for corporate filings.

### Backend handoff state at plan time

- `docs/buildx-orion-2026/outputs/05-build/frontend-handoff/risk-record.schema.json` exists as an uncommitted draft.
- T1.1 is not yet marked verified complete in the tracker.
- The remaining mandatory handoff files are absent, including evidence-graph, proof-of-protection, final scenario payloads, comparison payload, deployed addresses, and known limitations.
- Backend/server files are concurrently modified by another lane and are outside this plan's write scope.

### Execution gates

| Work | May start | Completion gate |
|---|---|---|
| T0.5 branding and app shell | immediately | public web has no stale product narrative or `AH` mark; build/typecheck pass |
| T6.1 component architecture | after T0.5 | draft risk schema is copied into typed frontend boundaries with fail-closed validation |
| T6.1 task completion | not yet | final rumor and confirmed-protect payloads, transactions, limitations, and verified handoff exist |
| T6.2 component architecture | after T6.1 shell | comparison view remains fixture/empty-state only |
| T6.2 task completion | not yet | validated `three-policy-comparison.json` and proof schema exist |
| T6.5 demo choreography | after T6.1/T6.2 integration | final manifest and fixture fallback exist |
| `DESIGN.md` replacement | finish only | built UI passes Impeccable review and final corrections |

## 3. Worktree and Ownership Rules

1. Inspect `git status` before every phase.
2. Never stage or modify `apps/server/**`, `contracts/**`, the active task tracker, or non-frontend agent artifacts.
3. Stage explicit paths only; never use `git add .`.
4. Treat uncommitted handoff files as drafts. Record their checksum when integration starts and re-read them after the backend owner declares the handoff stable.
5. Do not rename historical contract identifiers such as `AfterhoursFeeHook`.
6. Do not mark T6.1 or T6.2 complete from frontend structure alone.
7. Keep at most one primary frontend task in progress: T0.5, then T6.1, then T6.2.

## 4. Planned Frontend Architecture

```text
apps/web/src/
├── app/
│   ├── _components/                 # Risk State route components
│   │   ├── action-lifecycle.tsx
│   │   ├── evidence-circuit.tsx
│   │   ├── market-confirmation.tsx
│   │   ├── protection-envelope.tsx
│   │   ├── risk-command-bar.tsx
│   │   ├── risk-state-core.tsx
│   │   ├── scenario-switcher.tsx
│   │   └── trust-boundary.tsx
│   ├── compare/
│   │   ├── _components/
│   │   │   ├── comparison-chart.tsx
│   │   │   ├── comparison-table.tsx
│   │   │   ├── input-identity-ribbon.tsx
│   │   │   ├── policy-column.tsx
│   │   │   └── result-claim-gate.tsx
│   │   ├── error.tsx
│   │   ├── loading.tsx
│   │   └── page.tsx
│   ├── error.tsx
│   ├── icon.svg
│   ├── layout.tsx
│   ├── loading.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── app-footer.tsx
│   ├── app-header.tsx
│   ├── data-mode-label.tsx
│   ├── direction-contract.tsx
│   ├── external-evidence-link.tsx
│   ├── status-mark.tsx
│   └── unavailable-value.tsx
└── lib/
    ├── comparison/
    │   ├── adapter.ts
    │   ├── model.ts
    │   └── validate.ts
    ├── risk/
    │   ├── adapter.ts
    │   ├── demo-fixtures.ts
    │   ├── format.ts
    │   ├── model.ts
    │   └── validate.ts
    └── ui/
        ├── motion.ts
        └── tokens.ts
```

Route-specific components stay colocated with their route. Shared semantic primitives remain in `components/`; validation and adapters remain independent of React.

## 5. Phase A — T0.5 Branding and Replacement Shell

### Task A1 — Record the replacement direction in production markup

Files:

- Modify `apps/web/src/components/direction-contract.tsx`.
- Modify `apps/web/src/app/layout.tsx`.

Actions:

1. Replace seed `c093dccb` with the approved `397a5fab` contract from the design spec.
2. Keep the literal HTML comment as the first child of `<body>`.
3. Replace Allerta Stencil/Archivo/Roboto Mono with Space Grotesk/Inter/JetBrains Mono using `next/font/google`.
4. Set metadata title and description to the approved LP risk language.
5. Add canonical metadata for `https://tinjau.xyz` only if the existing deployment configuration supports it without inventing an environment.
6. Preserve English as the current document language unless product copy is explicitly localized later.

Verification:

- Production HTML contains seed `397a5fab`.
- No old seed or customs-house contract remains in emitted markup.
- Fonts load through Next.js rather than runtime CSS imports.

### Task A2 — Replace visual tokens

Files:

- Modify `apps/web/src/app/globals.css`.
- Modify `apps/web/tailwind.config.ts`.
- Add `apps/web/src/lib/ui/tokens.ts` only when React/TypeScript needs semantic token names.

Actions:

1. Replace dock/kraft/bone/stamp tokens with semantic OKX/X Layer tokens.
2. Define base, surface, raised surface, content, muted content, borders, interaction lime, and semantic state colors.
3. Keep all component code on semantic class names; no raw hex values in JSX.
4. Add tabular-number, readable selection, focus-visible, reduced-motion, scrollbar, and visually-hidden behavior.
5. Use near-square 4–8px radii, structural hairlines, and no glass/gradient-text/neon utilities.
6. Validate dark-mode contrast before building components. Light counterparts remain tokenized but are not a submission blocker unless a toggle is added.

Verification:

- Primary text and controls meet WCAG AA contrast.
- State colors are not the only status signal.
- Body text defaults to at least 16px and 1.5 line height.

### Task A3 — Replace public shell and identity

Files:

- Replace `apps/web/src/components/site-header.tsx` with `app-header.tsx` or update it in place, then normalize the exported name.
- Replace `apps/web/src/components/site-footer.tsx` with `app-footer.tsx` or update it in place.
- Add `apps/web/src/app/icon.svg`.
- Modify `apps/web/package.json`.

Actions:

1. Replace the `AH` symbol with a Tinjau-owned circuit mark; do not copy the OKX or X Layer logo.
2. Limit global navigation to `Risk State` and `Policy Compare`.
3. Show selected network, asset/pool context, and scenario data-mode summary without inventing a `MIXED` enum.
4. Replace the footer's old EventStateRegistry claim with a factual trust-boundary statement and evidence links only when values exist.
5. Update the package description from customs-house language to LP risk autopilot language.
6. Use Lucide icons only if the component needs a universally recognizable SVG; otherwise use text or the custom circuit mark.

Verification:

- Header controls are at least 44px high on touch layouts.
- Active navigation is semantic and keyboard visible.
- No `AH` public mark remains.
- Favicon reads at 16px and 32px without relying on text smaller than the pixel grid.

### Task A4 — Remove the obsolete public product

Files:

- Replace `apps/web/src/app/page.tsx` with an honest degraded Risk State shell before T6.1 data integration.
- Redirect `apps/web/src/app/holdings/page.tsx` to `/`.
- Redirect `apps/web/src/app/calendar/page.tsx` to `/`.
- Redirect `apps/web/src/app/scoreboard/page.tsx` to `/compare`.
- Remove `apps/web/src/app/api/scoreboard/route.ts` after confirming no consumer remains.
- Remove obsolete components after `rg` verifies they are unreferenced:
  - `address-form.tsx`
  - `coverage-panel.tsx`
  - `evidence-strip.tsx`
  - `forward-calendar.tsx`
  - `hero-manifest.tsx`
  - `holder-digest.tsx`
  - `manifest-tag.tsx`
  - `process-steps.tsx`
  - `scoreboard-table.tsx`
- Remove obsolete scoreboard environment documentation from `apps/web/.env.example` only after the proxy route is removed.

The temporary root shell must state that validated scenario data is unavailable when it is unavailable. It must not guess `NORMAL`.

Verification:

- Direct requests to legacy pages intentionally redirect.
- No legacy component remains imported.
- No customs, cargo, manifest, holder-digest, forward-calendar, or old scoreboard narrative remains publicly reachable.

### Task A5 — T0.5 verification and commit

Commands from `apps/web`:

```text
rtk npm run typecheck
rtk npm run build
rtk rg -n -i "afterhours|customs|bonded cargo|holder digest|forward calendar|AH" src package.json
```

Manual/browser checks:

- `/` presents Tinjau as LP Risk Autopilot.
- `/compare` exists as an honest unavailable/pending-integration surface if T6.2 data is absent.
- legacy routes redirect.
- metadata and favicon are correct.
- 375px and 1440px shell layouts do not overflow.

Commit boundary:

```text
feat(web): rebrand Tinjau risk interface
```

Only close T0.5 after these checks pass.

## 6. Phase B — Shared Risk Model and Fail-Closed Data Layer

### Task B1 — Create frontend risk types from the stable handoff

Files:

- Add `apps/web/src/lib/risk/model.ts`.
- Add `apps/web/src/lib/risk/validate.ts`.
- Add `apps/web/src/lib/risk/adapter.ts`.
- Add `apps/web/src/lib/risk/format.ts`.

Actions:

1. Re-read the stable `risk-record.schema.json`; record its schema version and checksum in code comments or frontend evidence.
2. Define discriminated unions for risk state, source class, data mode, confirmation status, evidence relations, and action status.
3. Validate every required field, enum, Ethereum address/hash, timestamp, and numeric string before rendering.
4. Reject unknown schema versions and enum values.
5. Preserve `UNAVAILABLE` versus `NOT_CONFIRMED`.
6. Never coerce missing/null numeric values to zero.
7. Return an explicit `invalid`, `unavailable`, `stale`, or `ready` adapter result so React does not infer data health.
8. Keep formatters unit-aware and tabular; visual shortening of addresses/hashes must retain full accessible text.

Tests:

- valid risk record accepted;
- unknown state rejected;
- `WATCH` with `authorized: true` rejected as a safety invariant;
- invalid address/hash/timestamp rejected;
- null market values remain unavailable;
- simulated claim with no source URL remains valid and visibly simulated;
- duplicate independence groups are preserved.

### Task B2 — Add truthful development fixtures

Files:

- Add `apps/web/src/lib/risk/demo-fixtures.ts`.

Rules:

1. Derive fixture facts only from frozen scenario documents or final handoff files.
2. Label scenario A's social rumor `SIMULATED` and its replay evidence separately.
3. Do not add an economic row to scenario A.
4. Do not invent a successful Scene B transaction before T4.5 evidence exists.
5. Use `PENDING`, `UNAVAILABLE`, or a clearly labeled structural fixture where the backend outcome is absent.
6. Keep fixture loading behind one adapter so final JSON can replace it without changing components.

### Task B3 — Add automated test foundation

Files:

- Modify `apps/web/package.json` and lockfile.
- Add `apps/web/playwright.config.ts`.
- Add `apps/web/e2e/` tests.

Dependencies:

- `@playwright/test`
- `@axe-core/playwright`

Scripts:

- `test:e2e`
- `test:a11y`

Playwright provides route verification, scenario deep-link checks, responsive screenshots, and accessibility scans. It is not used to compute product state.

Commit boundary:

```text
feat(web): add validated risk record data layer
```

## 7. Phase C — T6.1 Risk State and Evidence UI

### Task C1 — Build the command and state regions

Files:

- Add `risk-command-bar.tsx`.
- Add `scenario-switcher.tsx`.
- Add `risk-state-core.tsx`.
- Add shared `data-mode-label.tsx` and `status-mark.tsx`.

Behavior:

1. Scenario selection is encoded in the URL query, such as `/?scenario=rumor-watch`.
2. The command bar lists every data mode present; individual claims keep their own mode.
3. The state region displays current state, previous state when available, human explanation, reason codes, confidence, timestamps, allowed actions, and forbidden actions.
4. `WATCH` places “Aggressive fee not authorized” in the primary reading path.
5. An empty or invalid record never defaults to `NORMAL`.
6. User-triggered scenario changes announce a concise result through a polite live region without moving focus.

### Task C2 — Build the evidence circuit

Files:

- Add `evidence-circuit.tsx`.
- Add `external-evidence-link.tsx`.

Behavior:

1. Desktop uses source nodes and semantic rails in one circuit field.
2. Relations use label, line style, icon/shape, and color.
3. Duplicate outlets visibly collapse under a shared independence group.
4. Provenance disclosure preserves the source list and is operable by keyboard.
5. Mobile renders the same information as an ordered relation list/table, not a miniature graph.
6. Simulated claims never receive fabricated external links.

### Task C3 — Build confirmation, protection, and lifecycle

Files:

- Add `market-confirmation.tsx`.
- Add `protection-envelope.tsx`.
- Add `action-lifecycle.tsx`.
- Add `trust-boundary.tsx`.
- Add shared `unavailable-value.tsx`.

Behavior:

1. Confirmation displays status, timestamp, block, freshness, anti-wick, prices, basis, drawdown, velocity, exit depth, and reason codes where supplied.
2. `STALE` and `UNAVAILABLE` visibly break the path to a new `PROTECT`.
3. Protection shows baseline, requested, applied, and maximum fee with exact units and non-editable range semantics.
4. Expiry, duration, cooldown, and decay remain readable as numbers and dates.
5. Lifecycle distinguishes authorization from execution; a failed action does not read as protection delivered.
6. Historical expired/decayed steps remain inspectable.
7. The trust boundary names what AI proposed and what deterministic code accepted or rejected for the selected record.

### Task C4 — Compose route states

Files:

- Replace `apps/web/src/app/page.tsx`.
- Add `apps/web/src/app/loading.tsx`.
- Add `apps/web/src/app/error.tsx`.

Route states:

- loading with stable geometry;
- ready risk record;
- empty assessment;
- invalid schema;
- stale confirmation;
- unavailable market data;
- action failure;
- fixture/replay/simulated fallback.

### Task C5 — Add purposeful motion

Dependencies:

- `motion`

Files:

- Add `apps/web/src/lib/ui/motion.ts`.
- Add small client wrappers only around regions that need state/layout continuity.

Motion:

- 220–320ms state transitions;
- one 350–500ms evidence-to-policy propagation sequence;
- interruptible comparison/selection transitions;
- CSS for simple hover/focus color changes;
- final semantic state rendered immediately under reduced motion;
- no perpetual pulse, bouncing numbers, or animation-driven correctness.

### Task C6 — T6.1 tests and integration gate

Playwright coverage:

- rumor fixture remains `WATCH`;
- aggressive fee is visibly unauthorized;
- duplicate relation is not counted/presented as independent;
- source provenance opens by keyboard;
- stale/unavailable market confirmation blocks new protection copy;
- invalid fixture fails closed;
- mobile relation list contains the same evidence semantics;
- reduced motion renders complete content;
- axe scan has no critical/serious violations on `/` fixture variants.

Integration completion requires final validated scenario payloads. Replace structural fixtures through the adapter, rerun tests, and attach transaction/source evidence. Do not close T6.1 before this gate.

Commit boundaries:

```text
feat(web): build Tinjau risk state command center
test(web): cover risk state safety and accessibility
```

## 8. Phase D — T6.2 Three-Policy Comparison

### Task D1 — Add comparison model only after schema arrival

Files:

- Add `apps/web/src/lib/comparison/model.ts`.
- Add `apps/web/src/lib/comparison/validate.ts`.
- Add `apps/web/src/lib/comparison/adapter.ts`.

Validation must preserve:

- scenario/input identity;
- method and policy versions;
- identical replay-window parameters;
- observed versus counterfactual basis;
- metric values and units;
- null/unavailable/indeterminate outcomes;
- `canClaimLossAvoided` and its reasons;
- limitations and event-selection disclosure.

No frontend function determines a winner. A factual summary may be generated only from validated relations supplied or directly computed from displayed numeric values with explicit equality/indeterminate handling; it must never use a preferred-policy constant.

### Task D2 — Build shared-input proof and equal policy columns

Files:

- Add `input-identity-ribbon.tsx`.
- Add `policy-column.tsx`.
- Add `result-claim-gate.tsx`.

Behavior:

1. Shared input identity appears before results.
2. Static, volatility-only, and Tinjau use equal width, hierarchy, and metric order.
3. Tinjau may use the brand accent in its label but receives no larger card, trophy, crown, or default winner message.
4. Neutral and false-rumor scenarios are first-class selector options.
5. Scenario A explains that no economic row exists rather than rendering zeros.

### Task D3 — Build accessible comparison visualization

Files:

- Add `comparison-chart.tsx`.
- Add `comparison-table.tsx`.

Implementation:

1. Prefer custom semantic SVG/CSS grouped bars or bullet charts; do not add a chart library unless the final data volume exceeds the custom implementation's safe scope.
2. Directly label every value and unit.
3. Use outlines/patterns and policy names in addition to color.
4. Provide a visible exact-value table with meaningful headers.
5. On mobile, switch to a metric-first matrix or stacked policy sections without horizontal page scrolling.

### Task D4 — Compose comparison route states

Files:

- Add `apps/web/src/app/compare/page.tsx`.
- Add `apps/web/src/app/compare/loading.tsx`.
- Add `apps/web/src/app/compare/error.tsx`.

States:

- loading;
- ready comparison;
- unavailable handoff;
- invalid schema;
- scenario without economic row;
- indeterminate result;
- claim gate closed;
- fixture fallback.

### Task D5 — T6.2 tests and completion gate

Tests:

- three policies display identical input identity;
- metric order and units match;
- missing values are not zero;
- neutral and false-rumor scenarios remain visible;
- Tinjau is not presented as winner when equal, worse, or indeterminate;
- `canClaimLossAvoided: false` displays the reason;
- exact data table matches visual labels;
- keyboard and mobile layouts work;
- axe scan has no critical/serious violations.

Only close T6.2 after the final comparison payload validates and all result branches are exercised.

Commit boundaries:

```text
feat(web): add three-policy comparison
test(web): verify honest policy comparison states
```

## 9. Phase E — Cleanup, Quality Gate, and Impeccable Finish

### Task E1 — Remove obsolete implementation after replacement routes pass

1. Run import/reference searches.
2. Delete orphaned customs-house components and old chain/display utilities only when no new component depends on them.
3. Preserve historical identifiers outside the public UI.
4. Confirm no old public copy remains under `apps/web/**`.
5. Run a clean install/build after deletion.

### Task E2 — Production verification

Commands from `apps/web`:

```text
rtk npm ci
rtk npm run typecheck
rtk npm run build
rtk npm run test:e2e
rtk npm run test:a11y
```

Browser matrix:

- 375px
- 768px
- 1024px
- 1440px

Required manual checks:

- clean browser entry;
- deep-linked scenarios;
- external source and transaction evidence;
- keyboard-only navigation;
- reduced motion;
- loading, empty, error, stale, unavailable, failed, expired, decayed, and indeterminate states;
- fixture-only fallback without live backend;
- no horizontal page overflow;
- no claim beyond backend evidence.

### Task E3 — Impeccable bounded review

1. Load `craft-floor.md` immediately before the first UI edit, not during planning.
2. After implementation, run the Impeccable detector once on changed web targets.
3. Capture desktop and mobile screenshots in one batched round under `.impeccable/review/`.
4. Validate each screenshot before review.
5. Run the shipped Impeccable finish reviewer with the approved contract, screenshots, and quality-bar references.
6. Apply one batched correction round if directed, recapture, and request a verdict.
7. Stop after the bounded review budget; do not begin an unbounded polish loop.
8. Run the Impeccable documenter only after the reviewed implementation is final.
9. Replace `DESIGN.md` from shipped code and create/update its sidecar as directed by the documenter.

### Task E4 — Frontend evidence handoff

Provide the non-frontend documentation owner with:

- production build/typecheck/test output;
- route and fallback verification;
- desktop/mobile screenshots;
- exact visible claim text;
- final app URL after deployment;
- browser presentation order;
- labels proving implemented, observed, replayed, simulated, and roadmap distinctions.

Do not edit the active task tracker while the non-frontend lane has uncommitted changes. Supply evidence as a separate frontend artifact or message for the owner to merge.

## 10. External Resource Decisions

### UI UX Pro Max

Mandatory throughout implementation. Apply its accessibility, touch, performance, semantic-label, responsive, deep-linking, and chart rules. Re-run targeted searches only for a specific unresolved interaction; do not regenerate the approved visual direction.

### Motion

Install for state/layout continuity in Phase C. Keep simple effects in CSS. Measure the production bundle and use `LazyMotion` if the imported feature set materially affects it.

### 21st.dev

Use only as a discovery/reference source for evidence timelines, tables, badges, and chart anatomy. Any borrowed component must be inspected for accessibility, dependencies, and compatibility, then rewritten into the Tinjau world. Do not import a visual identity wholesale.

### Tailark Quartz Libre

Do not install. Quartz requires gated registry access and shadcn setup absent from the app. Keep only the approved composition disciplines: calm typography, clean spacing, and quiet breaks between dense operational passages.

## 11. Definition of Done

### T0.5

- Public Tinjau identity and LP risk positioning are complete.
- No `AH` mark or customs-house narrative remains public.
- Historical contract identifiers remain correctly labeled where exposed.
- Metadata, favicon, header, footer, routes, and package description are aligned.
- Build and typecheck pass.

### T6.1

- A judge can explain the state change, evidence, confirmation, allowed/forbidden action, ceiling, expiry, and decay from one screen.
- All source classes, relations, action statuses, and data modes are represented accurately.
- Rumor-only visibly cannot authorize aggressive action.
- Final rumor/protect handoff payloads validate and render.
- Responsive, accessibility, degraded, and error checks pass.

### T6.2

- Static, volatility-only, and Tinjau use the same input identity and metric order.
- Required economic and operational metrics render with units and basis.
- Neutral and false-rumor cases are included.
- No unsupported or hard-coded winner language exists.
- Final comparison payload validates and all claim-gate branches pass.

### Finish

- Production build, typecheck, browser tests, and accessibility tests pass.
- Desktop/mobile review completes under the Impeccable bounded process.
- `DESIGN.md` describes the shipped replacement world.
- Frontend evidence is ready for T6.4, T6.5, T7.1, T7.4, and T7.5.

## 12. Execution Order

```text
T0.5 audit
→ replacement direction contract and tokens
→ metadata, identity, shell, legacy redirects
→ T0.5 build/typecheck/commit
→ stable risk schema gate
→ validated risk adapter and truthful fixtures
→ T6.1 route and state coverage
→ final rumor/protect handoff integration
→ comparison schema gate
→ T6.2 route and claim-gate coverage
→ legacy code deletion
→ full quality matrix
→ Impeccable review and corrections
→ DESIGN.md from shipped code
→ frontend evidence handoff
```
