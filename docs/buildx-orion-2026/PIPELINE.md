# Pipeline — Build X Series AI Season + Orion Builder

- Workspace slug: buildx-orion-2026
- Created: 2026-08-16
- Current stage: 2
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

- [x] Target user and problem are explicit. — spec §1–§2 (target: tokenised-equity holders and LPs on X Layer; problem: information-class corporate events are undisclosed on-chain and disclosure lands almost entirely during closed-market hours)
- [x] One primary happy path is defined end-to-end. — spec §5.3 demo script (live record → holder digest → forward calendar → reaction-latency study → synthetic injection, in that order)
- [x] MVP scope fits team capacity and deadline. — spec §5.1 explicit cuts list, execution order, day-1 eligibility gate
- [x] Excluded features are recorded. — spec §5.1 "Explicitly cut from Event A", §5.2 deferred-to-Event-B list
- [x] Success criteria and demo narrative are testable. — spec §4.8 evidence pack (pre-registered method, published regardless of outcome)
- [x] Relevant service categories are derived from product needs. — `SERVICES.md`, populated as part of Stage 4 (task-tracker.md P0.7)

### Owner

- Owner: Claude, reviewed by Dien

### Dependencies and Blockers

- Dependencies: Checkpoint 1 approval (DEC-005)
- Blockers: none

### References and Evidence

- Reference IDs: REF-018, REF-019, REF-020, REF-021, REF-022
- Service IDs: derived, see `SERVICES.md`

### Things to Avoid

- Learning IDs: LEARN-006, LEARN-007, LEARN-010
- Stage-specific warning: do not treat "usable at zero adoption" (holder digest, forward calendar) as evidence of adoption — spec §3, §9 keep these claims separated

### Decisions

- Decision IDs: DEC-005

### Skip Record

- Reason: not skipped — backfilled from spec content written during ideation rounds 6–7 rather than produced as a separate artifact
- Impact: no separate `outputs/03-product/` file for AFTERHOURS; the spec file in `outputs/02-ideation/` serves as the product definition of record

### Next Step

- Proceed to Stage 4 with the approved MVP boundary.

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

- [x] Architecture supports every must-have requirement. — spec §4 (components), §4.9 (data flow); already produced during ideation, not duplicated here
- [x] Dependencies, interfaces, and integration points are explicit. — `outputs/04-planning/task-tracker.md` §2 (dependency spine) and per-task `Depends on` lines
- [x] Work items have owners, order, and acceptance criteria. — `outputs/04-planning/task-tracker.md` §3–§4, every task has an ID, order via dependencies, and an `Acceptance` line
- [x] Testing, deployment, demo, and fallback plans exist. — task-tracker.md P4.4 (negative-control test), P6.1–P6.2 (demo assembly), P0.5/P4.2 (testnet fallback for v4's absence there)
- [x] The plan fits the remaining time with contingency. — task-tracker.md phases mirror spec §5.1's execution order (eligibility → measurement → hook), which the spec explicitly justifies as protecting the harder-to-de-risk work first
- [x] Every relevant service category has a decision and every selected service has a complete approval record. — `SERVICES.md` SVC-001–SVC-006 all `selected`/`approved`: SEC EDGAR, X Layer RPC, `onchainos` CLI, Claude API verified live this session; frontend hosting (Vercel) and backend compute (Dien's own VPS) decided 2026-08-17

### Owner

- Owner: Claude, decision reserved to Dien

### Dependencies and Blockers

- Dependencies: Checkpoint 1 approval (DEC-005), Stage 3 backfill
- Blockers: none — the last open item (frontend/backend hosting decisions) closed 2026-08-17; Checkpoint 2 is ready for Dien's explicit approval

### References and Evidence

- Reference IDs: REF-018, REF-019, REF-020, REF-021, REF-022
- Service IDs: see `SERVICES.md`

### Things to Avoid

- Learning IDs: LEARN-002, LEARN-010
- Stage-specific warning: do not let executor agents touch `PIPELINE.md`, `DECISIONS.md`, or `SERVICES.md` — orchestrator-only per the protocol in `outputs/04-planning/task-tracker.md` §1

### Decisions

- Decision IDs: DEC-005, DEC-006

### Skip Record

- Reason:
- Impact:

### Next Step

- Completed 2026-08-17. Checkpoint 2 approved (DEC-006). Proceed to Stage 5 with `outputs/04-planning/task-tracker.md` as the execution plan.

## Checkpoint 2 — Implementation Plan

- Status: approved
- Service plan approval: approved
- Service IDs: SVC-001 through SVC-006 (see `SERVICES.md`)
- Decision requested: approve `outputs/04-planning/task-tracker.md` as the Stage 5 (Build) execution plan, including the multi-agent orchestrator/executor protocol in its §1
- Recommendation: approve as written. The task list mirrors spec §5.1's execution order exactly (eligibility → index poller → parsing pipeline → measurement studies → consumer surfaces → v4 hook → scoreboard/feed → submission), and every task's acceptance criterion is grounded in a fact already verified in spec §7 rather than an assumption
- Alternatives: a single-executor build (no orchestrator/executor split) was the default before this session — rejected per the user's explicit request for multi-agent parallelism; the tracker caps concurrency at 2 executors specifically so evidence review (Dien's bottleneck, not build speed) stays the limiting factor rather than agent count
- Evidence and reference IDs: REF-018–REF-022; `outputs/02-ideation/afterhours-spec.md` §4, §4.9, §5, §7, §9
- Risks: backend compute is Dien's own VPS with no managed-platform fallback — if it goes down overnight during the closed-market window (the exact scenario the product argues about), there is no pre-arranged backup host, see SERVICES.md SVC-006; the plan assumes 2 concurrent executors plus the orchestrator are actually available — if Dien is running this solo without separate Claude Code sessions, §1's "Mechanism A" (shared-file mailbox) is the fallback and execution will be slower than the phase ordering implies
- Things to avoid / learning IDs: LEARN-002, LEARN-010
- Decision impact: unlocks Stage 5 (Build)
- Approved by: Dien
- Approval date: 2026-08-17
- Decision ID: DEC-006

## Stage 5 — Build

- Status: in-progress

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

- Owner: Dien (orchestrator), executor agents assigned per task via `outputs/04-planning/task-tracker.md` §1

### Dependencies and Blockers

- Dependencies: Checkpoint 2 approval (DEC-006); day-1 eligibility tasks (task-tracker.md Phase 0) block most Phase 1+ work
- Blockers: most of Phase 0 is **[HUMAN-ONLY]** and not yet done (P0.1–P0.4, P0.11, P0.12, P0.13) — this is now the binding constraint on further executor-assignable work, not build capacity. Code-writable, test-verifiable work that does not need live infra or credentials has been completed and independently verified (see below); what remains in Phase 1+ mostly needs the VPS (P0.11) or a Gemini key (P0.13) to test live, or real funds (P0.2/P0.4) to deploy.

### References and Evidence

- Reference IDs: REF-018–REF-022
- Service IDs: SVC-001 through SVC-006
- 2026-08-17 progress (orchestrator-verified, not just executor-reported): P1.1–P1.7 and P4.1 code-complete, `tsc`/`forge build` clean, 23/23 + 56/56 tests independently re-run and passing; P2.2/P2.3 (on-chain reaction-latency study, n=46) complete and published at `outputs/05-build/reaction-latency-study.md`, including a real RPC-coverage gap found and closed before the numbers were accepted (LEARN-011). See task-tracker.md §3 evidence lines for detail per task.

### Things to Avoid

- Learning IDs: LEARN-002, LEARN-010, LEARN-011
- Stage-specific warning: do not let an executor check its own task's box — orchestrator verifies evidence and closes the box, per task-tracker.md §1 step 7

### Decisions

- Decision IDs: DEC-006

### Skip Record

- Reason:
- Impact:

### Next Step

- Most executor-assignable, credential-free work in Phase 1/2 is now done and verified. The binding next step is Dien completing the **[HUMAN-ONLY]** Phase 0 items (P0.1 X account, P0.2 fund mainnet wallet, P0.3 testnet faucet, P0.4 mainnet wNVDAx purchase, P0.11 VPS provisioning, P0.12 Vercel project — frontend, currently paused per Dien's scope instruction, P0.13 Gemini key) — these unblock live testing of P1.1/P1.3/P1.5, the testnet/mainnet contract deploys (P1.8/P1.9/P4.2/P4.3), and everything downstream in Phase 2–6.

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
