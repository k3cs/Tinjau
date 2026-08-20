# Tinjau Product Site and Guided Demo — Approved Design Specification

Status: approved design, pending user review and implementation plan  
Date: 2026-08-21  
Scope: T0.5, T6.1, T6.2; browser choreography foundations for T6.5 and frontend quality requirements for T7.1  
Primary tracker: `docs/buildx-orion-2026/outputs/04-planning/tinjau-lp-risk-autopilot-task-tracker.md`

## 1. Decision and outcome

The current risk-console-first frontend will be repositioned as a complete judge-facing product site.
It must introduce the product before asking a visitor to interpret a simulation, while still making the
entire system inspectable through a guided three-scene walkthrough.

The approved experience has two primary routes:

- `/` introduces Tinjau, the LP problem, the safety model, the system, and the role of X Layer;
- `/demo` traces evidence from intake through AI processing, deterministic policy, market confirmation,
  registry, fee-hook action, public communication, and recovery.

The result must let a first-time hackathon judge understand within 30 seconds that:

1. Tinjau is a safety system for tokenized-stock LPs, not an AI trading bot;
2. it observes official sources, news, and rumor-shaped inputs without treating them equally;
3. AI may organize evidence and propose an assessment but may not directly choose an arbitrary fee;
4. deterministic policy and contracts authorize, bound, expire, and decay protective action;
5. a rumor can produce `WATCH` while aggressive fee action remains forbidden;
6. a confirmed event can produce temporary, bounded protection only when the required confirmation exists;
7. static, volatility-only, and event-aware policies are compared on matched inputs without a hard-coded winner;
8. implemented, historical, replayed, simulated, pending, and roadmap elements are never visually conflated.

This specification supersedes the route and first-viewport decisions in
`2026-08-20-tinjau-frontend-redesign-design.md`. The earlier document remains useful as historical design
context and for component-level requirements that do not conflict with this specification.

## 2. Audience, conversion, and language

### Primary audience

Hackathon judges evaluating product differentiation, technical credibility, evidence quality, X Layer
relevance, and implementation honesty.

### Primary conversion

The primary call to action is **Start the 3-scene demo**. The site does not optimize for wallet connection,
newsletter signup, or speculative user acquisition.

### Language

All public website copy is English. Technical identifiers retain their source spelling. Historical deployed
contract names such as `AfterhoursFeeHook` remain unchanged where they identify real artifacts, and their
historical status is explained rather than silently rebranded.

## 3. Scope boundaries

### Included

- T0.5 public Tinjau branding in `apps/web/**`, including metadata, favicon, navigation, headings, and links.
- A product landing page that explains the problem, solution, safety boundary, system reach, X Layer value,
  proof status, and demo entry.
- T6.1 risk-state and evidence UX within the guided demo.
- T6.2 matched-input three-policy comparison UX.
- T6.5 browser choreography for the three demo scenes.
- Visible coverage of source intake, X-shaped listening, retrieval, normalization, asset resolution,
  clustering, deduplication, contradiction, deterministic promotion, OKX reference data, X Layer pool
  telemetry, registry, fee hook, X publishing, expiry, decay, and proof records.
- Loading, empty, error, stale, degraded, replay-fallback, responsive, keyboard, and reduced-motion behavior.

### Excluded or blocked until supplied by another lane

- Implementing live news or X provider integration.
- Inventing the market-confirmation engine, decision orchestrator, signed assessment flow, final contract
  integration, benchmark outputs, transactions, deployed addresses, or public posts.
- Mainnet writes, real-money activity, or irreversible external publication.
- Claiming production liquidity, adoption, protected TVL, customers, revenue, or measured loss avoided.
- Installing or copying Tailark Quartz content without a valid license and API key.
- Presenting historical AFTERHOURS deployments as final Tinjau deployments.

## 4. Current evidence boundary

The UI must derive capability status from the latest tracker and validated handoff rather than from visual
aspiration. At the time of this specification:

### Implemented and test-backed

- versioned risk/evidence types and parity checks;
- deterministic promotion rules;
- bounded fee policy;
- local X Layer Risk Registry contracts and contract tests;
- evidence normalization, asset resolution, clustering, independence, contradiction, recency, and the labeled
  evidence evaluation set;
- hardened OKX reference-price adapter;
- X Layer pool telemetry and bounded within-tick exit-depth calculation.

### Historical or reusable evidence

- deployed contracts whose immutable names include `AfterhoursFeeHook`;
- bounded fee band and deterministic decay behavior demonstrated by the historical hook;
- an X bot capable of composing/publishing guarded registry-event messages;
- EDGAR and OKX poller work that provides historical integration evidence.

### Pending at specification time

- T3.3 market-confirmation engine and T3.4 degraded/manipulation verification;
- T4 orchestration, registry-to-hook integration, action readback, and end-to-end recovery;
- T5 benchmark execution and Proof of Protection output;
- live news/X discovery and listening provider;
- final X alert integration for the new risk pipeline;
- final testnet deployments and public redeployment.

The frontend-handoff README predates the latest completion notes for T2.4, T3.1, and T3.2. The tracker is the
status authority, while the stable handoff schemas remain the data-shape authority. T3.1/T3.2 data adapters
must not be described as the completed T3.3 confirmation engine.

## 5. Information architecture

### `/` — product landing page

The landing page is a proof-first product story. It introduces Tinjau before exposing the dense operational
surface.

Navigation contains:

- Tinjau wordmark;
- `Product`;
- `System`;
- `Why X Layer`;
- primary `Start Demo` action.

The first viewport uses an asymmetric two-column composition.

Left:

> Tokenized-stock liquidity should not react blind.

Supporting copy defines Tinjau as a bounded LP risk autopilot that converts source-grounded evidence and
market confirmation into constrained onchain protection.

Actions:

- `Start the 3-scene demo`;
- `Inspect the system`.

Visible disclosure:

> Hackathon MVP · Replay-backed · X Layer testnet path

Right: a compact, status-labeled system schematic:

```text
SEC / News / X
       ↓
AI Evidence Graph
       ↓
Deterministic Risk Policy
       ↓
OKX + X Layer Confirmation
       ↓
Risk Registry
   ↙        ↓        ↘
Fee Hook  X alerts  Proof record
```

Each node shows capability maturity such as `IMPLEMENTED`, `HISTORICAL`, or `PENDING`. Where the node is
demonstrated with data, a separate adjacent mode such as `OBSERVED`, `REPLAY`, or `SIMULATED` identifies that
data. A running animation never changes either label.

### `/demo` — guided system walkthrough

The demo opens on a system overview with the three available scenes and the complete nine-stage trace. The
default mode is guided; an inspect mode lets the user revisit any stage, source, relationship, constraint,
or proof artifact.

Supported deep links:

- `/demo?scene=rumor`;
- `/demo?scene=confirmed`;
- `/demo?scene=comparison`.

`/compare` redirects to `/demo?scene=comparison` so existing links remain useful while the comparison becomes
part of one coherent product narrative.

Legacy routes such as `/holdings`, `/calendar`, and `/scoreboard` must not remain in primary navigation. They
must be intentionally redirected, retired, or isolated as historical surfaces during implementation.

## 6. Landing-page narrative

### 6.1 The blind window

Explain the causal problem rather than showing invented impact statistics:

```text
Information appears → reference market moves → LP pool lacks context → toxic flow extracts value
```

The visual is one time-based mechanism with explicit actors and timestamps. No unsupported dollar amount,
market share, or loss estimate is displayed.

### 6.2 What existing defenses miss

Use a restrained comparison table:

| Defense | Understands evidence context | Requires confirmation | Constrains action |
|---|---|---|---|
| Static fee | No | No | Fixed only |
| Volatility-only | No | Market signal only | Implementation-dependent |
| Black-box AI | Unclear | Unclear | Unclear |
| Tinjau design | Evidence graph | Evidence + market gate | Policy and contract bounds |

This is an architectural comparison, not an economic victory claim.

### 6.3 One event across the whole system

A single event moves through the complete product path:

```text
SEC / News / X
→ retrieval and provenance
→ normalization and asset resolution
→ clustering, duplicates, contradictions
→ deterministic state
→ OKX and X Layer market inputs
→ confirmation gate
→ Risk Registry
→ bounded fee action
→ guarded X publication
→ expiry and decay
```

The section is the visual signature of the landing page. It uses one continuous technical schematic, not a
grid of disconnected feature cards.

### 6.4 AI proposes. Policy decides. Contracts constrain.

The safety boundary is a primary product feature. It states:

- AI cannot directly change the fee;
- rumor-only evidence cannot authorize `PROTECT`;
- `WATCH` cannot invoke the aggressive fee;
- protection cannot exceed the configured fee and duration envelope;
- missing or stale market data cannot create a new `PROTECT`;
- protection expires and decays without an LLM deciding when to stop;
- evidence and action history remain inspectable.

### 6.5 Why X Layer

Present need-to-capability relationships rather than a generic ecosystem logo wall:

- tokenized-stock liquidity benefits from inexpensive onchain settlement and reusable state;
- OKX provides the reference-market context used by the adapter;
- X Layer provides pool price, flow, liquidity, depth, and the action surface;
- the Risk Registry lets other contracts or applications inspect the state without trusting the dashboard;
- Exchange OS or broader ecosystem adapters remain roadmap unless actually integrated.

### 6.6 Proof ledger

A flat, filterable ledger lists every meaningful capability with:

- capability name;
- maturity status;
- data mode when applicable;
- evidence artifact;
- limitation;
- source, test, contract, transaction, or explorer link when valid.

Examples include evidence graph `IMPLEMENTED`, OKX adapter `IMPLEMENTED`, pool telemetry `IMPLEMENTED`,
market-confirmation engine `PENDING`, live X listening `PENDING`, rumor input `SIMULATED`, historical fee-hook
band/decay `HISTORICAL`, and comparison output `PENDING` until T5 completes.

### 6.7 Final conversion

The page ends with:

> See the system make three different decisions.

The only dominant action is `Start the 3-scene demo`.

## 7. Demo shell and stage model

The walkthrough is a guided system trace, not a slideshow and not a simulator isolated from the real product
surfaces.

### Persistent shell

- top bar: selected scene, progress, elapsed demo time, and data-mode summary;
- stage rail: the complete nine-stage pipeline;
- main canvas: the source, graph, confirmation, registry, action, or comparison currently in focus;
- decision panel: why the state changed and what AI is forbidden to do;
- event tape: chronological trace from intake through recovery;
- `Open proof`: source, normalized payload, policy output, transaction evidence, hook readback, or alert evidence.

### Nine stages

1. **Listen** — SEC/issuer, news, X, and rumor-shaped intake.
2. **Retrieve** — canonical URL or source identifier, author/publisher, timestamp, and content commitment.
3. **Understand** — normalization, speculation level, asset resolution, clustering, and deduplication.
4. **Relate evidence** — supporting, contradicting, duplicate, stale, and self-revising relationships.
5. **Decide** — deterministic `NORMAL`, `WATCH`, or `PROTECT`, including reason codes and confidence.
6. **Confirm market** — OKX reference input and X Layer pool telemetry feeding the separate confirmation gate.
7. **Record** — Risk Registry state, evidence commitment, version, timestamps, and expiry.
8. **Act** — bounded fee status, X publication status, failure, retry, and readback.
9. **Recover** — expiry, cooldown, fee decay, and return to `NORMAL`.

X appears as two distinct product surfaces:

- **X Listener** supplies potential evidence and never implies that a post is official;
- **X Publisher** communicates a guarded decision and may be suppressed by policy or unavailable integration.

Neither surface may be labeled live unless a validated live producer exists.

## 8. Three demo scenes

### 8.1 Scene A — rumor containment

Primary trace:

```text
Simulated X-shaped rumor
→ provenance and evidence graph
→ no official support
→ WATCH
→ aggressive fee blocked
```

The scene shows:

- a `RUMOR / SIMULATED` source with no fake public URL;
- original source identifier, timestamp precision, and replay timestamp;
- asset resolution and duplicate-origin collapse;
- supporting, contradicting, or duplicate relationships where present;
- usable origin count rather than a misleading raw publisher count;
- market telemetry as available, stale, insufficient, or unavailable without substituting zero;
- deterministic `WATCH` reasons;
- `Aggressive fee not authorized` in the primary reading path;
- registry/action/publisher steps marked according to their real integration status;
- the public-alert path suppressed when publication would misrepresent an unconfirmed rumor.

Primary explanation:

> Tinjau can observe a rumor without allowing AI to turn it into an aggressive onchain action.

### 8.2 Scene B — confirmed event and bounded protection

Target trace:

```text
Official filing
→ corroborating evidence
→ market confirmation
→ PROTECT
→ bounded fee
→ expiry
→ deterministic decay
→ NORMAL
```

The scene shows every target stage, but each stage carries its current status. Until T3.3/T3.4 and T4 are
complete, the market decision and integrated action path remain replay/pending rather than presented as a
live end-to-end execution.

When validated data is available, the scene includes:

- official source and content commitment;
- evidence relationships and provenance;
- OKX reference sample with source and ingestion timestamps;
- X Layer pool price, basis, drawdown, velocity, liquidity, and exit-depth units;
- reproducible confirmation reason and anti-wick result;
- deterministic policy state and reason codes;
- registry record, expiry, policy version, and transaction evidence;
- baseline, requested, applied, and maximum fee;
- action state independent from decision state;
- guarded X alert with source link and protection expiry;
- fee decay and final effective `NORMAL` state.

Primary explanation:

> AI organizes evidence. Deterministic policy authorizes the state. Contracts constrain the action.

### 8.3 Scene C — three-policy comparison

Static fee, volatility-only, and Tinjau receive identical:

- scenario identity;
- asset and pool;
- timestamp/window;
- trade and liquidity inputs;
- initial state;
- fee envelope where comparable;
- counterfactual assumptions.

A matched-input checksum remains visible above the comparison.

Metrics include:

- fee revenue;
- LP markout;
- adverse selection;
- action latency;
- maximum fee;
- protection duration;
- decay or recovery time;
- neutral case;
- false-rumor cost;
- false-negative label where supplied.

Observed and counterfactual values use different structural treatments and explicit labels. Missing metrics
display `Not measured`; they never display zero. Scenario A's zero-swap window carries no fabricated economic
row.

There is no permanent winner treatment. Result language is derived from validated output and may say:

- `Lowest adverse selection in this replay`;
- `Reacted fastest, but raised the fee during a false-rumor case`;
- `No statistically supported advantage`;
- `Benchmark evidence unavailable`.

If Tinjau does not beat volatility-only, the UI says so. The loss-avoided claim remains closed unless the
backend claim gate explicitly opens it.

## 9. The first 30 seconds

The default guided path is choreographed for immediate differentiation:

1. the full pipeline appears with truthful status labels;
2. a simulated rumor enters through the X-shaped intake surface;
3. retrieval and the Evidence Graph reveal no official support;
4. deterministic policy produces `WATCH`;
5. the primary decision panel states `AGGRESSIVE FEE BLOCKED`;
6. the walkthrough advances to the official-event path and explains the additional evidence and confirmation
   required before bounded protection becomes possible.

The guided path never auto-advances so quickly that evidence labels cannot be read. The user may pause, step
back, open proof, or switch to inspect mode without losing the scene state.

## 10. Truth-label system

Two axes are always separate.

### Data mode

- `LIVE`: fetched during the current session from a validated live producer;
- `OBSERVED`: captured from real historical source or chain evidence;
- `REPLAY`: deterministic playback of captured input;
- `SIMULATED`: synthetic input created for a test or negative control.

### Capability maturity

- `IMPLEMENTED`: code and relevant tests exist for this capability;
- `HISTORICAL`: a prior deployed artifact demonstrates it but it is not the final integrated system;
- `PENDING`: required for the target demo but not yet delivered;
- `ROADMAP`: outside the P0 implementation.

Rules:

- animation never upgrades data to `LIVE`;
- replay displays both source time and playback time;
- `SIMULATED` remains adjacent to the source identity, not hidden in a footer;
- `UNAVAILABLE` and `NOT_CONFIRMED` are different states;
- `PROTECT` decision and `APPLIED` action are different states;
- non-promotable evidence remains visible because it explains the decision;
- date-only timestamps are not rendered with fabricated time precision;
- links are active only when an evidence artifact exists and is safe to expose;
- the stale public scoreboard API is not used as judge evidence until redeployed with provenance.

## 11. Visual direction

### Direction

**Industrial/utilitarian with editorial pacing.** The landing page feels like a deliberately art-directed
risk report. The demo feels like an operational workstation. Both use the same visual language.

### Density and composition

- landing: spacious, asymmetric, and text-led;
- demo: comfortable-to-compact, structured, and symmetric where comparison or financial trust requires it;
- hero and narrative highlights may break the grid;
- evidence tables, contract records, and financial comparisons never break the grid;
- whitespace separates major ideas instead of decorative backgrounds.

### Palette

OKX/X Layer-derived black and white are deliberate brand tokens, so pure black is permitted and documented.

| Role | Token | Purpose |
|---|---:|---|
| Ink | `#000000` | dominant brand field and high-contrast text |
| Paper | `#FFFFFF` | primary light field |
| Paper warm | `#F5F5F0` | editorial landing background |
| Carbon | `#111111` | dense demo surface |
| Graphite | `#242424` | secondary dark surface |
| Hairline dark | `#343434` | structural dark border |
| Hairline light | `#D9D9D3` | structural light border |
| Electric lime | `#BCFF2F` | primary action, active path, focus, authorized energy |
| NORMAL | `#31BD65` | semantic baseline state |
| WATCH | `#F76816` | semantic monitoring state |
| PROTECT | `#F04872` | semantic temporary protection state |
| Confirmation | `#4283FF` | market confirmation and external proof link |

Electric lime is not a fourth risk state. Every semantic color is accompanied by text, shape, or icon.

### Typography

- display/headline: `Inter Tight`, bold, tightly tracked;
- interface/body: `Inter`, regular and medium;
- audit/numeric: `JetBrains Mono`, tabular numerals;
- maximum three weights and five sizes per page;
- uppercase is limited to short operational labels with increased tracking;
- headline copy is sentence case and product-specific.

The official OKX interface uses a custom typeface for which no redistribution license was found. Tinjau uses
an intentionally selected open stack that approximates the compact, neutral financial character without
copying proprietary font files.

### Shape and material

- radius varies by role from square to 8px;
- 1px structural rules provide containment;
- shadows are absent or extremely low-opacity;
- lists and tables are preferred when cross-item comparison matters;
- cards are reserved for genuinely self-contained records;
- the system path resembles a technical schematic, not a neon workflow builder.

## 12. Anti-AI visual contract

The following patterns are prohibited:

- violet/blue hero gradients, gradient text, glassmorphism, glow, floating orbs, decorative noise, and animated
  background fields;
- centered generic hero composition followed by three identical icon cards;
- repeated colored icon circles, especially generic robot, sparkles, brain, or shield motifs;
- indiscriminate bento grids;
- cards nested inside cards;
- uniform padding and radius on every component;
- stock imagery or AI-generated placeholder art;
- vague copy such as `Build the future`, `Revolutionary AI`, or `Best-in-class protection`;
- decorative metrics, fabricated counters, or unsupported social proof.

Before completion, each route must pass the convergence test:

> If a reviewer were told that an AI generated this page from a generic crypto prompt, would they believe it
> immediately?

If yes, the route requires a composition-level redesign rather than additional polish.

## 13. Motion contract

Motion comes from state transitions, not decoration.

Permitted uses:

- one event pulse moving through the system path after an explicit action;
- evidence edges appearing when a relationship is derived;
- node state changing from waiting to processing to verified or blocked;
- `NORMAL → WATCH → PROTECT` state transitions;
- decision-panel and proof-drawer transitions;
- bounded fee widening and deterministic decay tied to the timeline;
- scene changes that preserve spatial context.

Prohibited uses:

- parallax, perpetual pulse, bounce, floating elements, hover translation, and decorative auto-play loops;
- staggered entrance on every marketing section;
- symmetric enter/exit timing;
- default CSS `ease` everywhere;
- `transition-all`.

Default behavior uses a consistent custom ease such as `cubic-bezier(0.23, 1, 0.32, 1)`. Updates are quick
(roughly 100–150ms), deliberate entries are longer (roughly 250–350ms), and exits are shorter. Reduced-motion
mode replaces path travel and large transforms with immediate state changes or short cross-fades.

Motion for React is used only where layout, SVG path, presence, or state orchestration benefits from it. Simple
hover/focus color changes remain CSS transitions.

## 14. Reference-resource policy

### ui-ux-pro-max — mandatory

Use it to validate information architecture, landing conversion, hierarchy, responsive behavior, contrast,
focus behavior, touch targets, forms/controls, data presentation, and implementation ergonomics.

### Impeccable — mandatory for the approved workflow

Use it to preserve the design direction, interrogate generic output, review the finished build, and document
the final implemented system in `DESIGN.md` only after implementation is visually complete.

### Motion

Use `motion/react` for meaningful pipeline, relationship, scene, and layout transitions, with
`useReducedMotion` and a small animation vocabulary.

### 21st.dev community components

Use as a reference for component anatomy such as steppers, timelines, status badges, drawers, and data
visualization. Do not copy fashionable shader, orb, spotlight, rainbow button, or generic animated-hero
patterns. Any borrowed anatomy must be rewritten in Tinjau tokens and pass the convergence test.

### Tailark Quartz/Libre

Use Libre as a reference for editorial spacing, typography rhythm, restrained feature storytelling, and quiet
section transitions. Quartz is a gated registry and must not be installed or copied without valid access.
The project should remain compatible with its existing stack rather than undergoing an unrelated shadcn
migration.

## 15. Responsive behavior

Desktop is the primary judged demo surface, but no evidence or status disappears on smaller screens.

### Landing

- asymmetric hero collapses to copy followed by the system schematic;
- the horizontal blind-window timeline becomes a vertical causal sequence;
- long comparison rows become stacked labeled pairs rather than compressed cards;
- navigation preserves the primary demo action and moves secondary anchors into an accessible menu.

### Demo

- the stage rail becomes a sticky horizontal stepper;
- main canvas and decision panel become `Trace`, `Decision`, and `Proof` views;
- multi-panel content stacks in reading order;
- evidence relationships gain a textual ordered-list representation;
- proof drawers become bottom sheets;
- comparison tables retain identity columns and allow controlled horizontal scrolling;
- decorative path detail may be removed, but provenance, mode, maturity, policy limits, and action status remain.

Touch targets are at least 44px. Hover is never required to reveal essential information.

## 16. Loading, empty, stale, degraded, and failure states

### Loading

Skeletons follow the final information geometry and appear only when a wait is expected. Demo fixtures should
not fake loading solely to create drama.

### Empty

Name the missing input or evidence and explain the safe consequence. An empty source list is not equivalent to
`NORMAL`.

### Error

Preserve the last valid record, show the failing module and timestamp, and offer retry when applicable.

### Stale

Show source time, ingestion time when supplied, age, and the decision consequence. Stale data cannot silently
look current.

### Degraded

Explain which modules are unavailable and which decisions remain safe. Degraded data cannot create a new
`PROTECT`, but it also must not falsely imply that an already active bounded protection was cancelled.

### Action failure

Display decision and action independently. A `PROTECT` assessment with a failed registry or hook write must
show `PROTECT / ACTION FAILED`, never `APPLIED`.

### Replay fallback

Every demo scene remains navigable from immutable repository fixtures without live third-party services. The
shell visibly changes to replay mode, and external proof controls unavailable in fallback mode explain why.

## 17. Accessibility

- Every walkthrough action is keyboard accessible.
- Stage changes and material state changes use a restrained live region.
- Focus rings use the electric-lime interaction token with sufficient offset and contrast.
- Color is never the only carrier for state, relation, freshness, or result.
- The system schematic has an ordered-list equivalent.
- Evidence relationships are readable as sentences, for example `Claim B contradicts Claim A`.
- Data tables use correct headers; text aligns left and numeric values align right.
- External source and explorer links communicate that they open a new destination.
- Date, time, units, fee, and address formatting remain screen-reader coherent.
- Reduced-motion behavior is tested, not merely declared.

## 18. Content and claim rules

Approved positioning:

> Tinjau is a bounded LP risk autopilot for tokenized-stock liquidity. It organizes source-grounded evidence,
> requires deterministic policy and market confirmation for stronger action, records inspectable risk state,
> and constrains temporary protection through contract-enforced limits.

Approved safety statements must map to tested rules, including rumor-only containment, `WATCH` fee behavior,
fee/duration bounds, expiry, and deterministic recovery design.

Prohibited claims include:

- `first AI dynamic-fee hook`;
- `first onchain risk registry`;
- `first self-protecting pool`;
- production-ready or production liquidity;
- external adoption, customers, protected TVL, revenue, or loss avoided without an open backend claim gate;
- live X/news monitoring before a validated provider exists;
- live Exchange OS integration;
- Tinjau as an economic winner before T5 results support that conclusion.

The site may say that a module is planned, pending, replayed, historical, or simulated when the matching label
is adjacent and unambiguous.

## 19. Quality gate and acceptance criteria

### Build and browser

- production build passes;
- TypeScript typecheck passes;
- `/`, `/demo`, every scene deep link, `/compare` compatibility, and selected legacy-route behavior work;
- clean-browser entry requires no prior context;
- replay fallback works without live services;
- desktop, tablet, and mobile layouts are manually and automatically checked.

### Accessibility

- automated accessibility scan reports no serious or critical issue;
- keyboard walkthrough reaches every stage and proof control;
- focus order follows the visual narrative;
- reduced-motion mode is verified;
- system and evidence relationships remain understandable without color or motion.

### Claim integrity

- every capability and data-mode badge matches the tracker and manifest;
- simulated rumor is unmistakable;
- `UNAVAILABLE`, `NOT_CONFIRMED`, and `CONFIRMED` remain distinct;
- `WATCH` never appears to authorize aggressive action;
- decision status never implies successful onchain action;
- missing benchmark values show `Not measured`;
- no static winner treatment or closed-gate loss claim exists;
- stale public API evidence is neither linked nor captured before redeployment;
- builder-controlled testnet and third-party mainnet liquidity are labeled separately.

### Anti-AI craft review

- no prohibited gradient, glass, glow, orb, card-grid, icon-circle, card-nesting, or generic-copy pattern;
- no `transition-all`;
- radius, padding, and component containment vary intentionally by role;
- screenshot review covers at least the landing hero, full system path, Scene A blocked action, Scene B protection
  envelope, Scene C comparison, mobile demo, empty, error, stale, and degraded states;
- the convergence test passes for every primary route.

## 20. Implementation handoff

Implementation begins only after the user reviews this written specification. The next deliverable is a
file-by-file implementation plan that:

1. inventories reusable current components and data adapters;
2. defines the landing and demo route migration;
3. defines a manifest-driven truth-label adapter rather than hard-coded capability claims;
4. sequences T0.5 branding, landing, demo shell, Scene A, Scene B, Scene C, responsive states, and quality gates;
5. preserves unrelated working-tree changes;
6. identifies every dependency on unfinished backend artifacts and provides a truthful fixture fallback;
7. schedules final Impeccable, ui-ux-pro-max, design-taste, accessibility, and browser reviews.

No public deployment or irreversible external publication is authorized by this design approval.
