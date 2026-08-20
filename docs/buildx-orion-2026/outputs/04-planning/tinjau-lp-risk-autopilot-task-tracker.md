# Tinjau LP Risk Autopilot — Hackathon MVP Task Tracker

Stage 4 planning artifact for workspace `buildx-orion-2026`.

- Status: **approved — Checkpoint 2 re-approved 2026-08-20 (DEC-010)**
- Created: 2026-08-20
- Governing design: `../../../superpowers/specs/2026-08-20-tinjau-lp-risk-autopilot-design.md`
- Historical prototype tracker: `task-tracker.md`
- Event A deadline: 2026-08-21 23:59 UTC
- Scope: one complete, reproducible LP-protection vertical slice on X Layer Testnet

This tracker governs prospective work after DEC-009. The historical tracker remains evidence of the existing Tinjau prototype; completed work there is not automatically counted as complete here. Existing components are reused only after their compatibility is verified against the final design.

## 1. Execution rules

### Status and priority

- `[ ]` not started
- `[~]` in progress
- `[x]` independently verified complete
- `[!]` blocked; the blocker and fallback must be recorded
- **P0** submission-blocking or required to prove the final idea
- **P1** score-raising work performed only after the P0 happy path works
- **P2** post-hackathon; not part of this implementation plan

### Work-in-progress rule

Keep one primary implementation task in progress at a time. A second task may proceed only when it touches separate files and does not depend on unfinished behavior. Additional executor agents require separate user authorization; this tracker does not itself authorize delegation.

### Completion rule

A checkbox closes only when its acceptance criteria and evidence field are satisfied. Code existence is not evidence that behavior works. `Designed`, `Roadmap`, mocked, replayed, and live behavior must remain visibly distinct.

### Human-only actions

The agent may prepare these actions but Dien must perform or separately authorize them:

- creating or upgrading paid third-party accounts;
- adding credentials not already available in the environment;
- spending real funds or deploying to mainnet;
- contacting an LP, market maker, pool operator, or partner;
- publishing the final submission, post, or video.

### Claim gate

- Do not claim “Tinjau reduces LP loss” until T5.5 passes and the stated event set supports it.
- Do not claim “production-ready” from a builder-controlled test pool.
- Do not claim external adoption from a reference consumer built by Tinjau.
- Do not claim a live Exchange OS integration until its production interface and access are verified.
- Always label observed results separately from replayed counterfactuals.

## 2. MVP boundary

### Required vertical slice

```text
source-linked OFFICIAL event ─┐
                              ├─ Evidence Graph ─ market confirmation
source-linked RUMOR ──────────┘                      │
                                                    ▼
                                      NORMAL / WATCH / PROTECT
                                                    │
                                      bounded X Layer fee action
                                                    │
                                       deterministic expiry/decay
                                                    │
                              static vs volatility-only vs Tinjau replay
                                                    │
                                          Proof of Protection record
```

The demo is complete only if it proves both branches:

1. a rumor alone reaches `WATCH` and cannot authorize the aggressive fee path;
2. a qualifying event plus valid market confirmation reaches `PROTECT`, changes the fee within contract limits, returns automatically to `NORMAL`, and produces a reproducible outcome comparison.

### Existing components available for reuse

| Existing component | Reuse decision | Required compatibility check |
|---|---|---|
| SEC EDGAR polling and filing parsing | reuse | preserve source URL/hash, three parses, agreement, bond/challenge behavior |
| `EventStateRegistry` | migrate or replace | must expose the final compact risk record and safe transition semantics |
| `AfterhoursFeePolicy` and v4 hook | migrate | must support `NORMAL/WATCH/PROTECT`, ceiling, duration, cooldown, and decay |
| OKX index poller | reuse | add freshness and pair it with direct X Layer pool telemetry |
| X Layer test pool/router | reuse | label builder-controlled and prove fee readback with a swap |
| Vercel web app and VPS backend | reuse | remove remaining public AFTERHOURS branding and expose the final flow |
| Existing filing and markout studies | reuse as input | do not substitute them for the mandatory three-policy benchmark |

### Explicitly out of scope

Full provider coverage, a generalized SDK, x402 monetization, Agentic Wallet execution, mainnet launch, production liquidity, and a live Exchange OS adapter are P2 work. They may appear only as clearly labeled roadmap items.

## 3. Dependency spine

```text
T0 foundation
  ├── T1 risk model + bounded contracts
  ├── T2 minimum Evidence Graph
  └── T3 OKX/X Layer confirmation
           └──────────────┬──────────────┘
                          ▼
                    T4 integrated loop
                          ▼
                    T5 three-policy proof
                          ▼
                    T6 judge-facing demo
                          ▼
                    T7 verification/deploy

T8 external validation is P1 and never blocks a working P0 demo.
```

## 4. P0 task list — submission vertical slice

### Phase T0 — Freeze the baseline and remove ambiguity

- [x] **T0.1 — Reproduce the current baseline**
  Depends on: none  
  Stage boundary: read-only Stage 4 readiness check; this task may run before Checkpoint 2 approval but must not modify product behavior.  
  Work: run server, web, and contract checks; inventory existing addresses, routes, APIs, fixtures, and public URLs.  
  Acceptance: one evidence note records exact commands, pass/fail counts, deployed addresses, and known failures without modifying results.  
  Evidence: `t0-1-baseline-audit.md` — server 153/153 tests and typecheck pass; web production build and sequenced typecheck pass; contracts 56/56 tests pass; public app/API and seven testnet deployments reverified. Seven final-design compatibility gaps remain explicit.

- [ ] **T0.2 — Freeze the demo asset and two scenarios**  
  Depends on: T0.1  
  Work: select one supported tokenized equity, one source-linked official event, and one source-linked historical or clearly simulated rumor. Preserve source, timestamp, company/token mapping, and replay window.  
  Acceptance: both scenarios are reproducible from immutable fixtures; the rumor is visibly labeled `RUMOR` and `REPLAY` or `SIMULATED`; no scenario is selected based on its benchmark result.  
  Evidence: pending.

- [x] **T0.3 — Close the news/social service gate**
  Depends on: none
  Stage boundary: Stage 4 service-planning task; provider selection or fallback approval occurs before Checkpoint 2 closes.  
  Work: choose the narrowest permitted intake for the two scenarios. Prefer source-linked public data; if live API access is unavailable, use immutable replay fixtures and record the provider limitation in `SERVICES.md`.  
  Acceptance: SVC-007 and SVC-008 have a decision, provenance rules, readiness test, fallback, cost/access status, and no unapproved credential dependency.  
  Evidence: Dien explicitly approved immutable source-linked replay fixtures on 2026-08-20. SVC-007/SVC-008 select the repository-local replay approach for P0; live provider discovery is deferred and cannot support a live-monitoring claim.

- [ ] **T0.4 — Pre-register the benchmark method**  
  Depends on: T0.2  
  Work: freeze replay inputs, timestamps, pool parameters, fee policies, metrics, window, and result-reporting format before running the comparison.  
  Acceptance: method covers static fee, volatility-only, and Tinjau using identical market inputs; includes neutral/rumor behavior and reports full distribution plus tail cases, not only averages.  
  Evidence: pending.

- [ ] **T0.5 — Complete user-facing Tinjau branding**  
  Depends on: T0.1  
  Work: remove remaining public AFTERHOURS names from page metadata, headings, links, API output, screenshots, and judge-facing docs while keeping historical records unchanged.  
  Acceptance: repository search finds no unintended public-facing AFTERHOURS label; `tinjau.xyz` renders Tinjau metadata and no broken route.  
  Evidence: pending.

### Phase T1 — Final risk model and bounded on-chain policy

- [ ] **T1.1 — Define versioned risk and evidence types**  
  Depends on: T0.1  
  Work: add shared types for `NORMAL`, `WATCH`, `PROTECT`; `OFFICIAL`, `NEWS`, `RUMOR`; reason codes; confidence band; evidence commitment; market-confirmation status; timestamp; expiry; and policy version.  
  Acceptance: server, contract ABI, benchmark, and web app share an explicitly versioned schema or generated equivalents; invalid/unknown values fail safely.  
  Evidence: pending.

- [ ] **T1.2 — Implement deterministic promotion rules**  
  Depends on: T1.1  
  Work: translate the design rules into non-LLM state transitions. Freeze replay-derived thresholds in versioned configuration.  
  Acceptance: rumor-only and single-news inputs cannot reach `PROTECT`; non-official promotion requires at least two independent sources plus fresh market confirmation; stale/conflicting input cannot create a new `PROTECT`.  
  Evidence: pending.

- [ ] **T1.3 — Upgrade the bounded fee policy**  
  Depends on: T1.1, T1.2  
  Work: enforce baseline/max fee, maximum duration, cooldown, nonce/replay protection, supported pool, pause, expiry, and deterministic decay. `WATCH` must not invoke the aggressive fee.  
  Acceptance: the LLM cannot choose arbitrary fee or duration; expired, replayed, incorrectly signed, unsupported, over-ceiling, and invalid-transition requests revert; an active state is not cancelled merely because later market data is missing.  
  Evidence: pending.

- [ ] **T1.4 — Implement the minimal X Layer Risk Registry record**  
  Depends on: T1.1, T1.2  
  Work: migrate or replace the existing registry so another contract/app can read asset, pool, state, reason, evidence commitment, confidence band, timestamps, expiry, and policy version.  
  Acceptance: writes are authorized and idempotent; reads require no dashboard trust; history/evidence is not deleted by pause or recovery; ABI and example read are documented.  
  Evidence: pending.

- [ ] **T1.5 — Add contract unit, property, and fuzz coverage**  
  Depends on: T1.3, T1.4  
  Work: test state transitions and every enforcement boundary.  
  Acceptance: a property test proves any input set whose only information evidence is `RUMOR` cannot reach the aggressive action path; fee/duration/cooldown/expiry/nonce/signature/pause boundaries pass; `forge test` is green.  
  Evidence: pending.

### Phase T2 — Minimum AI Evidence Graph

- [ ] **T2.1 — Normalize official, news, and rumor claims**  
  Depends on: T0.3, T1.1  
  Work: preserve original URL/source ID, author/publisher, timestamp, company, token, event type, verbatim claim span or source pointer, source class, and replay/live label.  
  Acceptance: speculation is not rewritten as fact; missing provenance produces an invalid or non-promotable claim; official ingestion preserves existing hash/agreement/bond behavior.  
  Evidence: pending.

- [ ] **T2.2 — Build claim clustering and entity/token resolution**  
  Depends on: T2.1  
  Work: use AI to group differently worded claims about one event and map company → token → pool, with deterministic validation of supported mappings.  
  Acceptance: both frozen scenarios resolve to the intended asset/pool; unsupported or ambiguous mappings stop at `WATCH`/manual review and never authorize an action.  
  Evidence: pending.

- [ ] **T2.3 — Add source independence, contradiction, and recency**  
  Depends on: T2.2  
  Work: distinguish duplicated reporting from independent evidence, expose supporting/contradicting claims, and expire old evidence.  
  Acceptance: two copies of the same origin do not count as two sources; contradiction is visible and caps promotion unless deterministic rules are independently satisfied; every confidence change has a machine-readable explanation.  
  Evidence: pending.

- [ ] **T2.4 — Create a small labeled AI evaluation set**  
  Depends on: T2.3  
  Work: label the official event, rumor, duplicates, contradiction, entity/token mapping, and at least one neutral claim.  
  Acceptance: evaluation reports extraction, clustering, entity resolution, independence, contradiction, rumor-to-`WATCH`, and unsupported-`PROTECT`; target unsupported-`PROTECT` rate is zero.  
  Evidence: pending.

### Phase T3 — OKX/X Layer market confirmation

- [ ] **T3.1 — Harden the OKX reference-price adapter**  
  Depends on: T0.2  
  Work: reuse the existing OKX index poller and add timestamp, freshness, asset mapping, retry, and explicit unavailable state.  
  Acceptance: the frozen asset produces deterministic timestamped samples; stale/missing data is not treated as confirmation; failures are observable.  
  Evidence: pending.

- [ ] **T3.2 — Add direct X Layer pool telemetry and executable exit depth**  
  Depends on: T0.2  
  Work: read pool price, liquidity, trades/velocity, short-window drawdown, and executable quote/depth for the builder-controlled test pool or a labeled historical source.  
  Acceptance: every metric has block/time provenance and units; builder-controlled liquidity is labeled; RPC retry/range limits are handled.  
  Evidence: pending.

- [ ] **T3.3 — Implement the market-confirmation engine**  
  Depends on: T3.1, T3.2, T1.2  
  Work: derive basis, velocity, drawdown, exit-depth change, market-hours context, freshness, and anti-wick confirmation.  
  Acceptance: no single short-lived price spike is sufficient; confirmation reason and contributing values are reproducible; missing/stale data blocks new `PROTECT`.  
  Evidence: pending.

- [ ] **T3.4 — Test manipulation and degraded-data cases**  
  Depends on: T3.3  
  Work: cover wick, stale OKX sample, delayed RPC, thin test liquidity, missing route, and conflicting signals.  
  Acceptance: every degraded case produces `unavailable`, `WATCH`, or continued bounded expiry as specified—never unsupported promotion.  
  Evidence: pending.

### Phase T4 — Integrate evidence, state, contract, and recovery

- [ ] **T4.1 — Build the decision orchestrator**  
  Depends on: T1.2, T2.3, T3.3  
  Work: combine the structured Evidence Graph and market confirmation into a signed, explainable assessment.  
  Acceptance: output contains inputs, rule version, state, reason, confidence band, expiry, proposed bounded action, and explanation; retrying the same event is idempotent.  
  Evidence: pending.

- [ ] **T4.2 — Connect poster, registry, policy, and hook**  
  Depends on: T1.3, T1.4, T4.1  
  Work: post the assessment, verify readback, let the hook consume the policy, and execute a swap showing the effective fee.  
  Acceptance: registry state and pool fee agree; failed action remains visible and cannot claim protection benefit; transaction hashes and decoded events are recorded.  
  Evidence: pending.

- [ ] **T4.3 — Implement automatic expiry and deterministic recovery**  
  Depends on: T4.2  
  Work: demonstrate `PROTECT` fee decay and state recovery without an LLM deciding when to stop.  
  Acceptance: time advancement or scheduled execution returns the policy to baseline within the configured maximum; history remains readable; cooldown prevents immediate unsafe re-entry.  
  Evidence: pending.

- [ ] **T4.4 — Prove the rumor negative-control path end to end**  
  Depends on: T2.4, T4.2  
  Work: run the frozen rumor through intake, Evidence Graph, decision engine, registry, and hook.  
  Acceptance: UI/API/registry show `WATCH`; aggressive fee remains unauthorized; test and transaction/read evidence are stored; the result is not presented as official fact.  
  Evidence: pending.

- [ ] **T4.5 — Prove the confirmed-event path end to end**  
  Depends on: T2.4, T3.4, T4.3  
  Work: run the frozen official event or clearly labeled replay through the full flow.  
  Acceptance: evidence → confirmation → `PROTECT` → bounded fee → swap/readback → decay → `NORMAL` completes from one reproducible command or demo control, with failure-safe output.  
  Evidence: pending.

### Phase T5 — Three-policy benchmark and Proof of Protection

- [ ] **T5.1 — Implement the static-fee baseline**  
  Depends on: T0.4  
  Acceptance: replay uses the frozen base fee and the same trades, liquidity, timestamps, costs, and initial state as the other policies.  
  Evidence: pending.

- [ ] **T5.2 — Implement the volatility-only baseline**  
  Depends on: T0.4  
  Work: define a generic price/volatility controller that receives no filing, news, rumor, or event-type input.  
  Acceptance: thresholds and fee bounds are documented and fixed before results; it uses the same maximum fee/duration constraints as Tinjau where comparable.  
  Evidence: pending.

- [ ] **T5.3 — Implement the event-aware replay runner**  
  Depends on: T4.5, T5.1, T5.2  
  Acceptance: one command runs all three policies over identical input and emits versioned machine-readable results; seeded/same-input reruns are deterministic.  
  Evidence: pending.

- [ ] **T5.4 — Calculate policy outcomes without hiding tails**  
  Depends on: T5.3  
  Work: calculate LP markout, fee revenue, adverse selection, action latency, maximum fee, protection duration, decay time, false-positive cost, and relevant false-negative labels.  
  Acceptance: output includes per-event rows, full distribution, median/quantiles, and tail cases; neutral and rumor scenarios are present; units and counterfactual assumptions are explicit.  
  Evidence: pending.

- [ ] **T5.5 — Publish the Proof of Protection record and claim result**  
  Depends on: T5.4  
  Work: connect trigger evidence, observed market state, applied policy/action, actual test-pool outcome, and both replay baselines.  
  Acceptance: observed and replayed fields are visually and structurally separate; “loss avoided” appears only when calculable; if Tinjau does not beat volatility-only, the result says so and the loss-reduction claim remains disabled.  
  Evidence: pending.

### Phase T6 — Judge-facing product, docs, and narrative

- [ ] **T6.1 — Build the risk-state and evidence UI**  
  Depends on: T4.4, T4.5  
  Work: show `OFFICIAL/NEWS/RUMOR`, `NORMAL/WATCH/PROTECT`, source provenance, contradictions, market confirmation, policy ceiling, expiry/decay, and action status.  
  Acceptance: a judge can explain why the state changed and what AI is forbidden to do from one screen; live, observed, replayed, and simulated data are unmistakably labeled.  
  Evidence: pending.

- [ ] **T6.2 — Add the three-policy comparison UI**  
  Depends on: T5.5  
  Acceptance: static, volatility-only, and Tinjau results appear side by side with the same inputs and metrics; no unsupported winner language is hard-coded.  
  Evidence: pending.

- [ ] **T6.3 — Add a reusable risk-record read example**  
  Depends on: T1.4  
  Work: create a small separate read-only consumer or documented script that reads the registry without using the dashboard backend.  
  Acceptance: clean-environment command returns and decodes the current record; artifact is labeled “reference consumer,” not external adoption.  
  Evidence: pending.

- [ ] **T6.4 — Align README, docs, pitch, and competitor matrix**  
  Depends on: T5.5, T6.1, T6.3  
  Work: use the narrative `problem → alternatives → Tinjau addition → proof → X Layer ecosystem value`; cite prior art and explain the five differentiators.  
  Acceptance: artifacts include what already exists, what Tinjau adds, provenance, safety rules, contract bounds, testnet evidence, benchmark reproduction, limitations, and safe claims; prohibited “first” claims are absent.  
  Evidence: pending.

- [ ] **T6.5 — Assemble the three-scene demo**  
  Depends on: T6.2, T6.4  
  Work: Scene A rumor containment; Scene B confirmed bounded protection and recovery; Scene C side-by-side policies.  
  Acceptance: differentiation is understandable within 30 seconds; full walkthrough is reproducible; architecture emphasizes AI proposal versus contract enforcement; fallback recording works without live third-party services.  
  Evidence: pending.

### Phase T7 — Final verification and X Layer deployment

- [ ] **T7.1 — Run the complete quality and security gate**  
  Depends on: T6.5  
  Work: server/web typecheck, unit/integration tests, contract tests/fuzz, secret scan, clean setup, failure-path checks, and claim audit.  
  Acceptance: all required checks pass or each remaining defect is explicitly disclosed; no credential is committed; rumor safety and bounded-policy properties pass.  
  Evidence: pending.

- [ ] **T7.2 — Deploy the final contracts to X Layer Testnet**  
  Depends on: T7.1  
  Work: deploy/upgrade the final registry/policy/hook/test pool as required and run both demo paths.  
  Acceptance: bytecode exists at every published address; explorer/RPC readback succeeds; decoded `WATCH`, `PROTECT`, fee action, and recovery evidence are recorded; builder-controlled pool is labeled.  
  Evidence: pending.

- [ ] **T7.3 — Deploy and verify the public app/API**  
  Depends on: T7.2  
  Acceptance: public URLs return successfully, display final Tinjau branding, use final addresses, expose graceful degraded behavior, and do not imply production liquidity or adoption.  
  Evidence: pending.

- [ ] **T7.4 — Rehearse from a clean judge path**  
  Depends on: T7.3  
  Work: follow README from a clean environment/browser and time the demo.  
  Acceptance: repository setup, benchmark, registry read, public UI, source links, and transaction evidence work without private context; all required hackathon fields have a prepared value.  
  Evidence: pending.

- [ ] **T7.5 — Prepare the submission evidence pack**  
  Depends on: T7.4  
  Work: final description, architecture image, demo video/link, repository, public app, testnet addresses/transactions, benchmark artifact, competitor matrix, limitations, and AI/X Layer explanation.  
  Acceptance: every claim maps to a verifiable artifact; roadmap is separated from implemented work; final submission action remains HUMAN-ONLY.  
  Evidence: pending.

## 5. P1 score-raising tasks — only after the P0 demo works

- [ ] **T8.1 — Obtain one external LP/pool-operator review** **[HUMAN-ONLY outreach]**  
  Depends on: T6.5  
  Work: prepare a neutral five-question test and ask one real LP, market maker, or pool operator to inspect the flow.  
  Acceptance: dated, attributable feedback records the participant role, what they saw, usefulness, safety concern, and integration condition; no demand/adoption claim exceeds the evidence.  
  Evidence: pending.

- [ ] **T8.2 — Add one genuinely separate registry consumer**  
  Depends on: T6.3  
  Work: let a separate app/package consume the record and apply its own read-only warning rule.  
  Acceptance: consumer does not import dashboard internals and proves the registry is reusable; it is labeled first-party unless built/operated externally.  
  Evidence: pending.

- [ ] **T8.3 — Expand the benchmark beyond the demo event**  
  Depends on: T5.5  
  Work: add more neutral, false-rumor, ordinary, and tail events without changing frozen rules after seeing results.  
  Acceptance: results remain reproducible and disclose event-selection criteria, concentration, and any regression against volatility-only.  
  Evidence: pending.

- [ ] **T8.4 — Verify an Exchange OS adapter boundary**  
  Depends on: T4.1  
  Work: document the mapping from the shared risk record to a future venue-specific policy without claiming live access.  
  Acceptance: interface and trust boundaries are concrete; unsupported APIs are labeled `[missing]`; no production-integration claim is made.  
  Evidence: pending.

## 6. Explicitly deferred P2 roadmap

- Additional news and social providers.
- Production source-reputation model and larger labeled dataset.
- Generalized SDK and multi-pool registry consumers.
- x402 paid low-latency risk feed.
- Agentic Wallet actions.
- Live Exchange OS venue integration.
- X Layer mainnet launch and meaningful external liquidity.
- Revenue, protected TVL, customers, or autonomous switching between risk agents.

None of these items may be counted in the hackathon completion score unless separately implemented and verified.

## 7. Final acceptance matrix

| Required proof | Closing task | Status |
|---|---|---|
| Source-linked official event | T4.5 | pending |
| Explainable risk transition | T4.4, T4.5 | pending |
| Rumor safely contained at `WATCH` | T1.5, T4.4 | pending |
| OKX/X Layer market confirmation | T3.3, T3.4 | pending |
| Bounded on-chain pool action | T4.2 | pending |
| Automatic deterministic recovery | T4.3 | pending |
| Static-fee baseline | T5.1 | pending |
| Volatility-only baseline | T5.2 | pending |
| Reproducible three-policy outcome | T5.5 | pending |
| Reusable X Layer risk record/read | T1.4, T6.3 | pending |
| Competitor/differentiation matrix | T6.4 | pending |
| Public app + testnet proof | T7.2, T7.3 | pending |
| Clean submission evidence | T7.4, T7.5 | pending |

### 7.1 Coverage of the independent evaluation gaps

| Evaluation gap | Tasks that close it | Scope status |
|---|---|---|
| Three-policy benchmark | T0.4, T5.1–T5.5, T6.2 | P0 — required |
| Full `NORMAL/WATCH/PROTECT` demo, bounded action, expiry, and outcome | T1.1–T1.5, T4.1–T4.5, T6.5 | P0 — required |
| Proof that rumor-only input never reaches `PROTECT` | T1.2, T1.5, T2.4, T4.4 | P0 — required |
| Final reusable risk registry/read interface | T1.4, T6.3 | P0 — required |
| Public branding and submission-evidence cleanup | T0.5, T6.4, T7.3–T7.5 | P0 — required |
| Stronger AI application beyond filing extraction | T2.1–T2.4, T4.1 | P0 — minimum Evidence Graph plus measured AI evaluation |
| Working OKX/X Layer-specific market path | T3.1–T3.4, T4.2, T7.2 | P0 — required |
| Economic user-value evidence | T5.1–T5.5 | P0 — benchmark evidence; outcome may be positive, neutral, or negative |
| External LP/pool-operator validation | T8.1 | P1 — score-raising, HUMAN-ONLY outreach |
| Genuinely separate consumer/adoption evidence | T8.2 | P1 — reference consumer is P0; external adoption must not be inferred |

The plan therefore covers every issue from the assessment, but it does not pretend all evidence has equal priority. Product behavior and reproducible proof are P0; external validation and a second consumer are P1 because they depend on another party and must not block a working submission.

## 8. Deviations and blockers log

Record any changed assumption before continuing:

| Date | Task | Status label | Change/blocker | Impact | Decision/fallback | Evidence |
|---|---|---|---|---|---|---|
| 2026-08-20 | T0.3 | `[confirmed]` | Dien approved source-linked immutable replay fixtures for P0; no live news/social provider is selected. | P0 can prove normalization and rumor containment, but cannot claim live discovery or real-time monitoring. | SVC-007/SVC-008 selected for MVP; live providers deferred to P2. | User approval; DEC-010 |

## 9. Checkpoint 2 approval payload

- Status: approved
- Approved by: Dien
- Approval date: 2026-08-20
- Service decision: immutable source-linked replay fixtures approved for SVC-007/SVC-008
- Readiness evidence: T0.1 / REF-030

Approve this tracker only after confirming:

- the implementation boundary is the P0 vertical slice, not P1/P2;
- T0.3 closes the news/social service choices or explicitly approves the replay-fixture fallback;
- existing code is treated as reusable evidence, not automatically final behavior;
- benchmark rules are frozen before results;
- the claim gate and HUMAN-ONLY boundaries are accepted.

Recommended approval wording after those conditions are met:

> “Saya menyetujui `tinjau-lp-risk-autopilot-task-tracker.md` sebagai implementation plan Hackathon MVP, termasuk prioritas P0, service fallback, benchmark preregistration, claim gate, dan batas HUMAN-ONLY.”
