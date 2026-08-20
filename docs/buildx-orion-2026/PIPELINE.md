# Pipeline — Build X Series AI Season + Orion Builder

- Workspace slug: buildx-orion-2026
- Created: 2026-08-16
- Current stage: 5
- Submission readiness: not-ready

Keep exactly one primary stage `in-progress`. A skipped stage requires a reason and impact. A completed stage requires every mandatory exit criterion to be checked.

## Stage 0 — Hackathon Intake

- Status: completed

### Objective

Create the workspace, collect available source inputs, and identify critical unknowns.

### Input

- Hackathon URL, documents, screenshots, notes, or manual answers.

### Primary Skill

- Skill: web3-hackathon-pipeline

### Recommended Skills

- Skill and reason:

### Activities

- Register every available input in `HACKATHON.md`.
- Label factual values by confidence and source status.
- Identify eligibility, deadline, deliverable, judging, and track unknowns.
- Set solo/team mode provisionally in `TEAM.md`.
- Confirm `SERVICES.md` and the global skill-profile snapshot exist.
- Record provisional budget, service restrictions, and external permission constraints.

### Output

- `HACKATHON.md`
- `TEAM.md`
- `SERVICES.md`
- Profile snapshot in `SKILLS.md`
- `outputs/01-research/` intake notes

### Exit Criteria

- [x] All provided inputs are inventoried.
- [x] Critical unknowns are listed.
- [x] The provisional solo/team mode is recorded.
- [x] Service and profile control files are present with visible migration issues resolved.
- [x] Stage 1 has enough input to begin research.

### Owner

- Owner: Claude, reviewed by Dien

### Dependencies and Blockers

- Dependencies: user-supplied opportunity records and spreadsheet access
- Blockers: none

### References and Evidence

- Reference IDs: REF-001, REF-002, REF-003, REF-004, REF-009, REF-010
- Service IDs: none yet

### Things to Avoid

- Learning IDs: LEARN-001
- Stage-specific warning: do not ideate from unverified deadlines — both official pages were re-read rather than trusting the spreadsheet extraction alone

### Decisions

- Decision IDs: DEC-001

### Skip Record

- Reason:
- Impact:

### Next Step

- Completed 2026-08-16. Two events registered in one workspace per DEC-001.

## Stage 1 — Research and Rule Extraction

- Status: completed

### Objective

Build a verified profile of the hackathon and its constraints.

### Input

- Stage 0 inventory and unresolved critical facts.

### Primary Skill

- Skill: web3-hackathon-pipeline

### Recommended Skills

- Skill and reason:

### Activities

- Verify eligibility, rules, dates, tracks, judging, prizes, and deliverables.
- Prefer current official sources and resolve source conflicts.
- Research relevant winners, finalists, successful products, and benchmarks.
- Verify required services, sponsor benefits, service restrictions, and evidence requirements.

### Output

- Completed hackathon profile.
- Reference catalog entries.
- Research summary in `outputs/01-research/`.

### Exit Criteria

- [x] Eligibility and disqualifying rules are confirmed.
- [x] Deadline and timezone are confirmed from an official source.
- [x] Required deliverables and submission method are confirmed.
- [x] Judging criteria and viable tracks are documented.
- [x] Important conflicts are resolved or explicitly blocked.
- [x] Relevant success references and failure patterns are recorded.
- [x] Material service rules, credits, and restrictions are confirmed or blocked.

### Owner

- Owner: Claude, reviewed by Dien

### Dependencies and Blockers

- Dependencies: live access to both official event pages and the X Layer developer docs
- Blockers: none. Four non-blocking unknowns remain open in `HACKATHON.md` — Orion's tolerance for a non-Base agent chain, Event A's pre-existing-code policy, faucet reachability, and the qualifying-DEX-volume definition

### References and Evidence

- Reference IDs: REF-001, REF-002, REF-004, REF-005, REF-006, REF-007, REF-008, REF-009, REF-010
- Service IDs: none yet — categories derived, providers deliberately not chosen

### Things to Avoid

- Learning IDs: LEARN-002, LEARN-003
- Stage-specific warning: third-party chain registries disagreed with first-party docs on the testnet chain ID; official docs won (DEC-002)

### Decisions

- Decision IDs: DEC-002

### Skip Record

- Reason:
- Impact:

### Next Step

- Completed 2026-08-16. Outputs: `outputs/01-research/winner-pattern-analysis.md`, `outputs/01-research/dual-event-fit.md`.

## Stage 2 — Ideation and Validation

- Status: completed

### Objective

Generate, compare, and validate ideas against user value, judging criteria, time, and team capability.

### Input

- Verified hackathon profile, team capacity, references, and active guardrails.

### Primary Skill

- Skill: web3-hackathon-pipeline

### Recommended Skills

- Skill and reason:

### Activities

- Generate multiple distinct ideas.
- Identify user, problem, why-now, Web3 necessity, and expected value.
- Compare competition, differentiation, feasibility, demo strength, and judging fit.
- Record rejected ideas and reasons.
- Derive service needs from each credible idea without choosing providers prematurely.

### Output

- Idea shortlist and validation evidence in `outputs/02-ideation/`.
- Recommended final idea and alternatives.

### Exit Criteria

- [x] At least two credible alternatives are compared.
- [x] Each shortlisted idea has a user, problem, and Web3 rationale.
- [x] Feasibility fits the available team and time.
- [x] Differentiation and hackathon fit have evidence.
- [x] A recommended idea and rejection reasons are documented.
- [x] Material service needs and uncertainty are visible for the recommended idea.

### Owner

- Owner: Claude, decision reserved to Dien

### Dependencies and Blockers

- Dependencies: Stage 1 rules profile and winner-pattern analysis
- Blockers: none. Awaiting Checkpoint 1 approval

### References and Evidence

- Reference IDs: REF-001, REF-002, REF-004, REF-007, REF-008, REF-010
- Service IDs: categories identified — smart-contract deployment, agent runtime hosting, repo hosting, X account, Discord/Telegram, OKX Onchain OS APIs. Providers deliberately not chosen until Stage 4

### Things to Avoid

- Learning IDs: LEARN-001, LEARN-004, LEARN-005
- Stage-specific warning: LEARN-001 suspends feasibility filtering during generation. Feasibility appears only in `idea-candidates.md` §4, after the candidates exist

### Decisions

- Decision IDs: DEC-003

### Skip Record

- Reason:
- Impact:

### Next Step

- Completed 2026-08-17. Outputs: `outputs/02-ideation/idea-candidates.md`, `outputs/02-ideation/afterhours-spec.md`, `outputs/02-ideation/afterhours-validation-prompt.md`.

## Checkpoint 1 — Final Idea

- Status: approved
- Decision requested: which idea to build as the single project submitted to both X Layer Build X Series (deadline 2026-08-21 23:59 UTC) and Orion Builder (deadline 2026-09-02 23:59 UTC)
- Recommendation: **AFTERHOURS — corporate-events oracle for tokenised equities on X Layer.** Three independent AI parses turn SEC EDGAR disclosures (8-K, Form 4) into on-chain event state whose factual fields are bonded against the source document hash and carry a published per-field agreement level. Consumers: a Uniswap v4 hook (deterministic bounded fee policy), a per-address holder digest, a forward calendar of scheduled events, and a public X feed. Two separated measurements: a retroactive on-chain reaction-latency study and a prospective lead-time scoreboard. Full spec: `outputs/02-ideation/afterhours-spec.md`
- Alternatives: **EXITPROOF** — abandoned per DEC-004 (see below), retired to the graveyard, do not re-propose. **NIGHTDESK** — sibling idea, parked not merged (protective-exit agent; spec exists but not built). Within AFTERHOURS itself, an earlier design (**D7**, round 7) claimed lead time directly from historical on-chain trades; killed by direct measurement (median 5.4 min to first trade, 2 of 7 sampled events with no trade in an hour) and replaced by the reaction-latency framing — see spec §7, §8
- Evidence and reference IDs: REF-018, REF-019, REF-020, REF-021, REF-022; `outputs/02-ideation/afterhours-spec.md` §7 (verified facts, seven-round validation history in §8), `outputs/02-ideation/afterhours-validation-prompt.md`
- Verified basis: 98.2%→~97.1% closed-hours 8-K disclosure share recount; wNVDAx/wMSTRx wrapper mechanics confirmed identical and mechanically insulated from splits/dividends (`convertToAssets` = issuer `multiplier`, verified on-chain); Uniswap v4 confirmed live on X Layer mainnet 196 and **absent from testnet 1952** (`codesize` 0 at the canonical address); on-chain reaction-latency measured directly on 7 real filings; backtest sample size measured at n=46 across all 10 underlyings once price-history depth (~4 weeks, starts 2026-07-20) was checked
- Risks: no external party consumes any component yet and none can be manufactured in the remaining window (holder digest and forward calendar are usable at zero adoption but that is not the same as adoption); the v4 pool holds only the builder's own seed; markout study result (dollar cost of the measured staleness) has not been run and may be small; testnet leg of the hook runs against a builder-deployed PoolManager, not canonical Uniswap, and this is disclosed rather than hidden
- Things to avoid / learning IDs: LEARN-001, LEARN-002, LEARN-004, LEARN-005, LEARN-006, LEARN-007, LEARN-010
- Decision impact: gates Stage 3 and every later stage. Sets the architecture, the X Layer contract surface, the demo narrative, and the task breakdown in `outputs/04-planning/task-tracker.md`
- Approved by: Dien (approved across the 2026-08-16 → 2026-08-17 working session; idea locked 2026-08-16 per spec header, scope and infrastructure decisions confirmed 2026-08-17)
- Approval date: 2026-08-17
- Decision ID: DEC-003 (reversed), DEC-004 (EXITPROOF abandonment), DEC-005 (AFTERHOURS selection)

## Stage 3 — Product and MVP Definition

- Status: completed

**Revision 2026-08-20:** DEC-009 evolves the approved product into the Tinjau LP Risk Autopilot. The prospective source of truth is `../superpowers/specs/2026-08-20-tinjau-lp-risk-autopilot-design.md` (REF-028). The original AFTERHOURS definition remains historical evidence.

### Objective

Turn the approved idea into a focused product definition and demonstrable MVP.

### Input

- Approved idea decision, user evidence, judging criteria, and team constraints.

### Primary Skill

- Skill: web3-hackathon-pipeline

### Recommended Skills

- Skill and reason:

### Activities

- Define target user, problem statement, value proposition, and success signal.
- Specify one primary happy path and supporting user stories.
- Separate must-have, should-have, and excluded scope.
- Define demo narrative and failure-safe fallback early.
- Define product-level needs for analytics, wallet onboarding, data, backend, and operations.

### Output

- Product brief and MVP scope in `outputs/03-product/`.
- Updated ownership and scope decisions.

### Exit Criteria

- [x] Target user and problem are explicit. — REF-028 §2: LPs/pool operators quoting tokenized equities through discontinuous company/reference-market information
- [x] One primary happy path is defined end-to-end. — REF-028 §11: rumor containment, confirmed bounded protection/recovery, and comparison against simpler policies
- [x] MVP scope is narrowed to one vertical slice. — REF-028 §14 implementation-plan boundary; schedule compatibility remains a Stage 4/T0.1 verification question
- [x] Excluded features are recorded. — REF-028 §4 and §14: provider breadth, SDK, x402, Agentic Wallet, mainnet, and live Exchange OS are outside the first plan
- [x] Success criteria and demo narrative are testable. — REF-028 §11 and §13
- [x] Relevant service categories are derived from product needs. — SVC-001–SVC-008; final provider/fallback decisions remain Stage 4 work

### Owner

- Owner: Claude, reviewed by Dien

### Dependencies and Blockers

- Dependencies: Checkpoint 1 approval (DEC-005), product-evolution approval (DEC-009)
- Blockers: none

### References and Evidence

- Reference IDs: REF-018–REF-022, REF-028, REF-029
- Service IDs: derived, see `SERVICES.md`

### Things to Avoid

- Learning IDs: LEARN-004, LEARN-005, LEARN-006, LEARN-007, LEARN-009, LEARN-010
- Stage-specific warning: do not treat a first-party reference consumer as adoption or an event-aware design as proof of better LP outcomes; both require separate evidence

### Decisions

- Decision IDs: DEC-005, DEC-009

### Skip Record

- Reason: not skipped — the original definition was backfilled from the AFTERHOURS spec; the 2026-08-20 revision has a dedicated approved design (REF-028)
- Impact: the final design in `docs/superpowers/specs/` is the prospective source of truth; older artifacts remain historical evidence

### Next Step

- Revised product definition approved 2026-08-20 (DEC-009). Proceed to the reopened Stage 4 with one official event, one rumor, one market-confirmation path, one bounded action/recovery path, one minimal reusable risk record, and one three-policy benchmark.

## Stage 4 — Architecture and Execution Planning

- Status: completed

### Objective

Design the minimum reliable architecture and an executable plan with clear ownership.

### Input

- Product brief, MVP scope, team profile, technology rules, and deadline.

### Primary Skill

- Skill: web3-hackathon-pipeline

### Recommended Skills

- Skill and reason:

### Activities

- Select the smallest architecture that supports the happy path.
- Define component interfaces, data flow, integrations, and fallback behavior.
- Break work into ordered tasks and team workstreams.
- Plan testing, security checks, integration points, demo data, and deployment.
- Compare service candidates, verify volatile facts, define readiness evidence, and record fallback.

### Output

- Architecture and implementation plan in `outputs/04-planning/`.
- Updated skill map, ownership, risks, and decisions.
- Completed service plan in `SERVICES.md`.

### Exit Criteria

- [x] Architecture supports every revised must-have requirement. — REF-028 §6–§8 and revised tracker §2
- [x] Dependencies, interfaces, and integration points are explicit. — `outputs/04-planning/tinjau-lp-risk-autopilot-task-tracker.md` §3–§4
- [x] Work items have order, dependencies, acceptance criteria, evidence slots, priority, and HUMAN-ONLY boundaries. — revised tracker §1 and §4–§5
- [x] Testing, deployment, demo, benchmark, claim, and fallback plans exist. — revised tracker T1.5, T3.4, T4.4–T4.5, T5, T6.5, T7
- [x] The plan fits the remaining time with contingency. — REF-030 verifies reusable EDGAR/AI, OKX, registry/hook, pool/router, frontend/API, and testing foundations; P1/P2 remain below the cut line and the seven compatibility gaps are explicit
- [x] Every relevant service category has a decision and every selected service has a complete approval record. — SVC-001–SVC-008; Dien approved repository-local source-linked replay fixtures for SVC-007/SVC-008

### Owner

- Owner: Claude, decision reserved to Dien

### Dependencies and Blockers

- Dependencies: revised Stage 3 approval (DEC-009), verified historical prototype evidence
- Blockers: none; replay fallback approved and T0.1 recorded in REF-030

### References and Evidence

- Reference IDs: REF-018–REF-022, REF-028–REF-030
- Service IDs: SVC-001–SVC-008

### Things to Avoid

- Learning IDs: LEARN-002, LEARN-004, LEARN-005, LEARN-009, LEARN-010, LEARN-011
- Stage-specific warning: do not count historical prototype features as final `NORMAL/WATCH/PROTECT`, Proof of Protection, or external adoption without the revised task's acceptance evidence

### Decisions

- Decision IDs: DEC-005, DEC-006 (historical), DEC-009, DEC-010

### Skip Record

- Reason:
- Impact:

### Next Step

- Completed 2026-08-20. Revised Checkpoint 2 approved (DEC-010); proceed to Stage 5 from T0.2 in the revised tracker.

## Checkpoint 2 — Implementation Plan

- Status: approved
- Service plan approval: approved
- Service IDs: SVC-001 through SVC-008
- Decision requested: approve `outputs/04-planning/tinjau-lp-risk-autopilot-task-tracker.md` as the prospective Stage 5 plan of record
- Recommendation: approved as recommended after the replay fallback and T0.1 compatibility audit closed both gates. Keep the entire P0 proof loop; treat T8/P1 and every P2 item as non-blocking
- Alternatives: continue the historical plan — rejected because it does not implement the final five differentiators; expand to all roadmap integrations — rejected because it would trade away the mandatory vertical proof
- Evidence and reference IDs: REF-028–REF-030; revised tracker §2–§9
- Risks: the remaining Event A window is short; live news/social provider access is unknown; the three-policy result may be neutral or negative and must still be published honestly
- Things to avoid / learning IDs: LEARN-002, LEARN-009, LEARN-010, LEARN-011
- Decision impact: completes revised Stage 4 and unlocks new-scope Stage 5
- Approved by: Dien
- Approval date: 2026-08-20
- Decision ID: DEC-010

## Stage 5 — Build

- Status: in-progress

Historical note: the original prototype evidence remains in `outputs/04-planning/task-tracker.md`. Revised work now follows `outputs/04-planning/tinjau-lp-risk-autopilot-task-tracker.md` under DEC-010.

### Objective

Implement the approved MVP and maintain an integration-ready happy path.

### Input

- Approved plan, architecture, task ownership, acceptance criteria, skill map, and service plan.

### Primary Skill

- Skill: web3-hackathon-pipeline

### Recommended Skills

- Skill and reason:

### Activities

- Implement in small testable units.
- Integrate early and preserve a working demo path.
- Track blockers, scope changes, and technical decisions.
- Prepare deployment and deterministic demo data.
- Track service setup, integration, readiness evidence, degraded behavior, and fallback.
- Escalate external blockers with exact user actions while continuing safe independent work.

### Output

- Working MVP, code, deployment artifacts, and build notes in `outputs/05-build/`.

### Exit Criteria

- [ ] The primary happy path works end-to-end.
- [ ] Must-have integrations work in the target environment.
- [ ] Critical failures have user-visible handling or a demo fallback.
- [ ] Build and deployment steps are reproducible.
- [ ] Remaining defects and excluded scope are explicit.
- [ ] Selected services have observable readiness or an approved active fallback.

### Owner

- Owner: Dien, with Codex implementation support after Checkpoint 2 approval

### Dependencies and Blockers

- Dependencies: revised Checkpoint 2 approval (DEC-010) — satisfied
- Blockers: none at stage entry; live news/social discovery remains intentionally deferred and does not block fixture-backed P0

### References and Evidence

- Reference IDs: REF-018–REF-022, REF-028–REF-030
- Service IDs: SVC-001 through SVC-008
- Historical evidence: original prototype progress and commands remain recorded in `outputs/04-planning/task-tracker.md`; each reused component is revalidated by revised task T0.1

### Things to Avoid

- Learning IDs: LEARN-002, LEARN-010, LEARN-011
- Stage-specific warning: do not let an executor check its own task's box — orchestrator verifies evidence and closes the box, per task-tracker.md §1 step 7

### Decisions

- Decision IDs: DEC-006 (historical), DEC-009, DEC-010 (pending)

### Skip Record

- Reason:
- Impact:

### Next Step

- T0.1 and T0.3 are complete. Begin T0.2: freeze one official event, one source-linked rumor, one asset/pool, and their immutable replay windows.

## Stage 6 — Testing and Quality Review

- Status: not-started

### Objective

Verify product value, correctness, reliability, security, usability, and demo readiness.

### Input

- Working MVP, acceptance criteria, rules, risks, and active guardrails.

### Primary Skill

- Skill: web3-hackathon-pipeline

### Recommended Skills

- Skill and reason:

### Activities

- Test the happy path, failure paths, integrations, and deployment.
- Review product clarity, onboarding, usability, and judging alignment.
- Perform a proportional security review without recording credential values.
- Test service quotas, degraded behavior, clean-user permissions, and fallbacks.
- Rehearse the demo under realistic constraints.

### Output

- Test evidence, issue list, review results, and release recommendation in `outputs/06-quality/`.

### Exit Criteria

- [ ] Critical acceptance tests pass.
- [ ] No unresolved blocker threatens eligibility, security, or the demo.
- [ ] Known limitations and recovery steps are documented.
- [ ] The deployed happy path has been rehearsed.
- [ ] A release recommendation is recorded.
- [ ] Demo-critical services and fallbacks have rehearsed evidence.

### Owner

- Owner:

### Dependencies and Blockers

- Dependencies:
- Blockers:

### References and Evidence

- Reference IDs:
- Service IDs:

### Things to Avoid

- Learning IDs:
- Stage-specific warning:

### Decisions

- Decision IDs:

### Skip Record

- Reason:
- Impact:

### Next Step

- Return to Stage 5 for failed exit criteria or proceed to Stage 7.

## Stage 7 — Demo, Pitch, and Submission

- Status: not-started

### Objective

Create a coherent, compliant submission package that demonstrates user value and a working product.

### Input

- Release candidate, verified requirements, judging criteria, evidence, and product narrative.

### Primary Skill

- Skill: web3-hackathon-pipeline

### Recommended Skills

- Skill and reason:

### Activities

- Write the submission narrative and project description.
- Produce and rehearse demo, deck, video, and live presentation as required.
- Check links, permissions, repository, deployment, and every submission field.
- Confirm demo-critical services are ready and sponsor-usage evidence is accurate when relevant.
- Prepare a final package for user review; do not submit automatically.

### Output

- Submission package and verification evidence in `outputs/07-submission/`.

### Exit Criteria

- [ ] Every mandatory deliverable exists in the required format.
- [ ] Claims match the working product and cited evidence.
- [ ] Demo, repository, and deployment links work with correct permissions.
- [ ] Submission copy addresses judging criteria.
- [ ] Final compliance checklist is complete.
- [ ] Service-dependent demo links and sponsor evidence work with judge-level access.

### Owner

- Owner:

### Dependencies and Blockers

- Dependencies:
- Blockers:

### References and Evidence

- Reference IDs:
- Service IDs:

### Things to Avoid

- Learning IDs:
- Stage-specific warning:

### Decisions

- Decision IDs:

### Skip Record

- Reason:
- Impact:

### Next Step

- Stop at Checkpoint 3 and request final submission approval.

## Checkpoint 3 — Final Submission

- Status: pending
- Decision requested:
- Codex recommendation:
- Alternatives:
- Evidence and reference IDs:
- Risks:
- Things to avoid / learning IDs:
- Decision impact:
- Approved by:
- Approval date:
- Decision ID:

## Stage 8 — Evaluation and Learning

- Status: not-started

### Objective

Capture outcomes, reusable successes, failures, and context for future hackathons.

### Input

- Final submission, execution history, feedback, metrics, decisions, and incidents.

### Primary Skill

- Skill: web3-hackathon-pipeline

### Recommended Skills

- Skill and reason:

### Activities

- Compare outcomes against objectives and judging feedback.
- Record success patterns, mistakes, causes, early warnings, and recovery actions.
- Evaluate service fit, setup estimates, limits, permissions, incidents, fallback, and portability.
- Set confidence and relevance for every learning.
- Promote only relevant active guardrails for reuse.

### Output

- Retrospective in `outputs/08-retrospective/`.
- Updated `LEARNINGS.md`, `DECISIONS.md`, and reference catalog.

### Exit Criteria

- [ ] Outcomes and feedback are recorded.
- [ ] Key decisions and scope changes are traceable.
- [ ] Successes and failures include context and evidence.
- [ ] Reusable guardrails have confidence and relevance labels.
- [ ] Follow-up actions and owners are recorded.
- [ ] Material service outcomes and future things to avoid are recorded.

### Owner

- Owner:

### Dependencies and Blockers

- Dependencies:
- Blockers:

### References and Evidence

- Reference IDs:
- Service IDs:

### Things to Avoid

- Learning IDs:
- Stage-specific warning:

### Decisions

- Decision IDs:

### Skip Record

- Reason:
- Impact:

### Next Step

- Close the pipeline and carry only relevant active guardrails forward.
