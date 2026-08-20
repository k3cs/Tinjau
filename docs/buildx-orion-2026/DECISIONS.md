# Decision Log — Build X Series AI Season + Orion Builder

Record decisions that affect eligibility, idea selection, scope, architecture, implementation, demo, or submission.

## Decision Index

| ID | Decision | Stage | Status | Approved By | Date |
|---|---|---|---|---|---|
| DEC-001 | One workspace, two events, X Layer governs | 0 | proposed | pending | 2026-08-16 |
| DEC-002 | Use X Layer Testnet chain ID 1952, not 195 | 1 | approved | Claude (evidence-resolved) | 2026-08-16 |
| DEC-003 | Final idea selection | 2 | reversed | Dien | 2026-08-16 |
| DEC-004 | Reopen Checkpoint 1, abandon EXITPROOF | 2 | approved | Dien | 2026-08-16 |
| DEC-005 | Select AFTERHOURS, close Checkpoint 1 | 2 | approved | Dien | 2026-08-17 |
| DEC-006 | Approve original implementation plan (prospectively superseded by DEC-009/DEC-010) | 4 → 5 | approved | Dien | 2026-08-17 |
| DEC-007 | Use Gemini temporarily and confirm hosting access | 5 | approved | Dien | 2026-08-17 |
| DEC-008 | Rename AFTERHOURS to Tinjau | 6 | approved | Dien | 2026-08-20 |
| DEC-009 | Evolve Tinjau into an LP Risk Autopilot | 3 | approved | Dien | 2026-08-20 |
| DEC-010 | Adopt the revised Hackathon MVP tracker | 4 → 5 | approved | Dien | 2026-08-20 |
| DEC-011 | Split Stage 5 execution at the frontend boundary | 5 | approved | Dien | 2026-08-20 |

## Decision Entry Template

### DEC-001 — One workspace, two events, X Layer governs

- Stage: 0
- Status: proposed
- Decision requested: whether to run one pipeline covering both hackathons or two separate workspaces
- Selected option: one workspace. Event A (X Layer) governs rules, architecture, and schedule; Event B (Orion) is an additive deliverable checklist and a second submission of the same artifact
- Rationale: Event A's deadline is 11 days earlier and its rules are strictly harder. Its requirement set is close to a superset of Event B's, so satisfying A satisfies most of B. Running two pipelines would duplicate every stage for one codebase
- Alternatives: (a) two workspaces, one per event — rejected as duplicated overhead for a single artifact; (b) Orion-only, safer deadline — rejected, Event A holds ~98% of the available prize value; (c) X Layer only — rejected, Orion costs ~11 extra days of polish and one submission for a shot at 7 prizes against a currently 2-entry field
- Evidence and reference IDs: REF-001, REF-002, REF-003, REF-008; `outputs/01-research/dual-event-fit.md`
- Service IDs: pending Stage 4
- Trade-offs: a single workspace hides the fact that the two events have divergent rubrics. Mitigated by tracking both explicitly in `HACKATHON.md` and by the §3 design consequence in `dual-event-fit.md`
- Risks: Orion's tolerance for an agent whose contracts live on X Layer rather than Base is unverified. Both current gallery entries are Base-tagged, though the written rules bind only the wallet to Base
- Things to avoid / learning IDs: LEARN-002
- Impact: all stages. Every scope and schedule decision is made against Event A's 2026-08-21 23:59 UTC deadline
- Approved by: pending
- Approval date: pending
- Revisit condition: Orion clarifies that entries must be Base-native, or Event A publishes an exclusivity rule

### DEC-002 — Use X Layer Testnet chain ID 1952

- Stage: 1
- Status: approved
- Decision requested: which chain ID to configure for X Layer Testnet
- Selected option: chain ID 1952, RPC `https://testrpc.xlayer.tech/terigon`, gas token OKB, explorer `https://web3.okx.com/explorer/x-layer-testnet` (verified 2026-08-17 — canonical form; the older `xlayer-test` path 301-redirects here). Mainnet is 196 at `https://rpc.xlayer.tech`
- Rationale: first-party OKX documentation. The competing value 195 comes from third-party aggregators, and Chainlist's own 195 entry is labelled deprecated — it refers to the pre-OP-Stack testnet
- Alternatives: chain ID 195 as reported by Chainlist, evmchainlist.org, rpc.info, thirdweb, Alchemy — rejected as stale
- Evidence and reference IDs: REF-005 (official), REF-006 (third-party)
- Service IDs: none
- Trade-offs: none
- Risks: tooling defaults (wallet presets, SDK chain lists) may still ship 195 and need explicit override
- Things to avoid / learning IDs: LEARN-003
- Impact: Stage 4 architecture, Stage 5 deployment configuration
- Approved by: Claude, resolved on first-party evidence
- Approval date: 2026-08-16
- Revisit condition: OKX publishes a further network migration

### DEC-003 — Final idea selection

- Stage: 2
- Status: reversed
- Superseded by: DEC-004 on 2026-08-16
- Decision requested: which idea to build for both events
- Selected option: **EXITPROOF, post-validation scope.** Publish executable exit depth for tokenised equities on X Layer — how much of an asset can actually be sold at a given price impact right now — measured by quoting through the deployed Uniswap router at real position sizes rather than modelled, and written to X Layer as a contract-readable object. Backing is **not** measured: the issuer already publishes proof of reserves. Redemption capacity is read from public policy state, not probed
- Rationale: two independent validators (Fable and Codex GPT-5.6-high, separate sessions, given a brief containing no recommendation or scores) both returned MODIFY and converged on the same modification — cut executed probes and the bonded challenge, promote quote-based exit depth to the core. The modification was then executed live: NVDAx published DEX liquidity is $478,411 while only ~$55,858 is sellable under 1% price impact and no route exists above ~500 shares, an overstatement of roughly eight times. Demand is evidenced rather than assumed: Chaos Labs computes *"the maximum size that can be swapped within 5% price impact"* by hand in Aave governance, and that number sets supply caps and whether collateral is enabled at all (REF-015)
- Alternatives: **BLACKLETTER** — rejected after `onchainos agent search` found two live incumbents on the target chain doing its core mechanism, Merita #5516 and Internet Court MCP #2162. **THESEUS** — rejected; its two weakest rows, user value and product completeness, are both official Event A criteria. Earlier candidates C1/C4/C5/C6/C7, DOCKET, PROBATE, DEFER, TELLTALE all rejected with reasons recorded
- **Superseded rationale (recorded, not deleted):** this decision previously recommended C1 on the claim that no catalogued project both decides and is accountable for the decision. That claim was drawn from a 22-row sample of what is actually a 242-row corpus and is false. Seven winners occupy that space — ClawMon (ETHDenver Village Winner), Mnemosyne, Phare, The Dojo, Moltbet, World of Geneva (SF x402 1st), Immunity. ClawMon had already published the same core insight. See LEARN-006, LEARN-007
- Evidence and reference IDs: REF-004, REF-012, REF-013, REF-014, REF-015, REF-016, REF-017; `outputs/02-ideation/validation-synthesis.md`, `outputs/02-ideation/independent-validation-result.md`, `outputs/01-research/u1-u5-verification.md`
- Service IDs: pending Stage 4
- Trade-offs: novelty is narrower than originally claimed. Pharos already publishes exit and redemption scores for stablecoins across 113 chains (REF-016), and Liquidity Load Layer won 3rd at MIT Bitcoin 2026 doing continuous custodial exit-risk scoring. What survives is the asset class, the chain, measurement-by-quote rather than by model, and the on-chain object
- Risks: **no customer exists on X Layer** — Aave X Layer lists 9 reserves and none is an xStock, and no protocol has been asked to consume the score. The consumer contract must be presented as a reference integration, never as adoption. Product completeness remains the weakest official criterion for one person in the time available
- Things to avoid / learning IDs: LEARN-001, LEARN-002, LEARN-004, LEARN-005, LEARN-006, LEARN-007
- Impact: gates Stage 3 and everything after it. Also selects which of Event A's three prize paths is being contested
- Approved by: Dien
- Approval date: 2026-08-16
- Approved scope: EXITPROOF with the post-validation revision — executable exit-depth measured through the deployed router, backing NOT measured (issuer already publishes proof of reserves), executed redemption probes and the bonded challenge market explicitly out and labelled roadmap. See `outputs/02-ideation/validation-synthesis.md` §4.
- Revisit condition: no genuinely public evidence source can be secured for at least two independent inputs, or Dien prefers to optimise for Orion instead

### DEC-004 — Reopen Checkpoint 1 and abandon EXITPROOF

- Stage: 2
- Status: approved
- Decision requested: whether to build EXITPROOF or return to ideation
- Selected option: **abandon EXITPROOF, reopen Stage 2 ideation** targeting both events
- Rationale: two independent scoring agents, working from a deliberately balance-checked brief with no recommendation, converged on a mid-pack result. Hackathon A: 22/35 (Codex, est. 4th–10th) and 19/35 (Fable). Liquidity Grant 12/20 and 11/20. Hackathon B: 8/15 both. Both named **product completeness** as the weakest criterion, and Fable additionally scored **application of AI at 2** — *"in an AI Season the AI is ancillary to a deterministic product"* — and **growth potential at 2** because the consumers do not exist. Dien independently reached the same conclusion on use case, innovation and growth potential
- Alternatives: proceed anyway and accept a mid-pack score — rejected. Narrow further — rejected, the weak criteria are structural rather than scope-related
- Evidence and reference IDs: REF-014, REF-015, REF-016, REF-017; `outputs/03-product/exitproof-judging-scorecard-prompt.md` and the two returned scorecards; `outputs/03-product/use-cases-and-competitors.md`
- Service IDs: none
- Trade-offs: spends ideation time from a ~5.7-day window. Justified because the weak criteria (AI centrality, growth, completeness) could not be fixed by rescoping
- Risks: a replacement idea must clear the same bar, and less time remains to build it
- Things to avoid / learning IDs: LEARN-001 (no feasibility filtering during generation), LEARN-004, LEARN-005, LEARN-007, LEARN-009
- Impact: Stage 3 returns to not-started, Stage 2 reopens, Checkpoint 1 returns to pending
- Approved by: Dien
- Approval date: 2026-08-16
- Revisit condition: none — EXITPROOF moves to the graveyard and must not be re-proposed

### DEC-005 — Select AFTERHOURS, close Checkpoint 1

- Stage: 2
- Status: approved
- Decision requested: which idea to build after reopening Stage 2 per DEC-004
- Selected option: **AFTERHOURS — corporate-events oracle for tokenised equities on X Layer.** An agent watches SEC EDGAR (8-K, Form 4), parses each filing three times with independent LLM calls into structured factual fields, diffs the three parses per field and publishes the agreement level, and posts the result on-chain with a USD₮0 bond guaranteeing parse fidelity against the source document's content hash — never against price. Consumers: a Uniswap v4 hook (deterministic, hard-bounded fee policy over the bonded fields), a per-address holder digest (no wallet connection), a forward calendar of dates the same filings announce for the future, and a public X feed. Two measurements, deliberately separated after round-7 verification: a retroactive on-chain reaction-latency study (how long the pool stays stale after a filing) and a prospective lead-time scoreboard (how far the feed runs ahead of a self-recorded reference price, from day 1 onward)
- Rationale: seven rounds of ideation/validation (recorded in full in `outputs/02-ideation/afterhours-spec.md` §8) progressively fixed the criticisms that sank EXITPROOF and its own earlier drafts — "AI is a bolt-on" (fixed by making three-way parsing the core, not a summarizer), "bond bets on price not correctness" (fixed by a parse-fidelity bond against a document hash), "unbonded judgment controls fees" (fixed by a hard fee band with deterministic policy over bonded fields only), "beneficiary unmeasured" (round-5 user-value score of 3/5 specifically cited an unmeasured lead-time claim and a pool with no external LPs; round 6 added the holder digest, forward calendar, and the retroactive reaction-latency study to attack exactly those two gaps rather than adding unrelated features). Round 7 then verified the architecture directly on-chain and found three assumptions wrong: Uniswap v4 does not exist on X Layer testnet (deploy own PoolManager there), the "lead time" claim as originally framed cannot be supported by sparse historical trade data (median 5.4 min to first trade, 2 of 7 sampled events with none in an hour — see LEARN-010), and the closed-hours disclosure statistic recounts to ~97.1%, not the earlier 98.2%
- Alternatives: **EXITPROOF** — abandoned per DEC-004, retired to the graveyard. A sibling idea **NIGHTDESK** (news-materiality judgment + bounded protective exits) was parked, not merged — its spec exists at `outputs/02-ideation/nightdesk-validation-prompt.md` if ever revisited. Within AFTERHOURS's own design history, five earlier component designs were proposed and rejected (D1–D5, recorded in spec §8) plus two rejected during this round: **D6** — a monitor for divergence between the wrapped token and its underlying's rebase multiplier, killed by direct on-chain verification showing `convertToAssets` tracks the multiplier exactly, in the same call, with no lag; **D7** — claiming lead time directly from historical on-chain trades, killed per LEARN-010 above and replaced by the retroactive/prospective split
- Evidence and reference IDs: REF-018, REF-019, REF-020, REF-021, REF-022; `outputs/02-ideation/afterhours-spec.md` (full spec, §7 verified facts, §8 validation history including D6/D7), `outputs/02-ideation/afterhours-validation-prompt.md` (neutral scoring brief, kept in sync with the spec but without its argumentation)
- Service IDs: see `SERVICES.md` — SVC-001 through SVC-004 populated for categories verified live this session; hosting and bot-hosting remain deferred
- Trade-offs: the reframe from "lead time" to "reaction latency" is more defensible but structurally smaller — it proves the pool is stale, not that AFTERHOURS's own parsing is fast, and the genuine lead-time claim now has zero historical data and can only accrue from the day the index poller starts. The testnet leg of the v4 hook runs against a builder-deployed PoolManager rather than canonical Uniswap, which must be disclosed in the submission, not discovered by a judge
- Risks: no external party consumes any component yet, and none can be manufactured in the remaining ~4.5 days — the holder digest and forward calendar are designed to be useful at zero adoption, which is not the same claim as adoption. The markout study (dollar cost of the measured staleness) has not been run and may return a small number. Eligibility items (funded wallet, mainnet purchase, testnet PoolManager deploy) are scheduled for day 1 and not yet done as of this decision
- Things to avoid / learning IDs: LEARN-001, LEARN-002, LEARN-004, LEARN-005, LEARN-006, LEARN-007, LEARN-010
- Impact: closes Checkpoint 1 (status → approved). Gates Stage 3 (backfilled same session — see PIPELINE.md) and Stage 4 (`outputs/04-planning/task-tracker.md`, in progress, pending Checkpoint 2)
- Approved by: Dien
- Approval date: 2026-08-17
- Revisit condition: the on-chain reaction-latency backtest (§4.8b) or the markout study (§4.8c) returns a null/trivial result that removes the unscheduled-event value claim entirely — in that case reframe the pitch around the forward calendar and holder digest rather than reopening ideation, per the fallback already recorded in spec §9

### DEC-006 — Approve Checkpoint 2 implementation plan

- Stage: 4 → 5
- Status: approved
- Decision requested: whether to approve `outputs/04-planning/task-tracker.md` as the Stage 5 execution plan, including its multi-agent orchestrator/executor protocol, and close the two remaining Stage 4 exit criteria (frontend/backend hosting decisions)
- Selected option: **approve as written**, with hosting decided in the same session — frontend on Vercel (SVC-005), backend compute on Dien's own VPS (SVC-006). Plan of record: `outputs/04-planning/task-tracker.md` — ~55 tasks across 10 phases (Event A Phase 0–6, Event B Phase 7–10), each with an ID, a dependency line, and an acceptance criterion grounded in a fact verified in spec §7. Orchestrator/executor protocol: one orchestrator Claude Code session owns the tracker and the pipeline control files; executors plan on Opus 5, get explicit orchestrator approval, then execute on Sonnet 5; concurrency capped at 2 executors; a fixed list of HUMAN-ONLY tasks (real-money spends, irreversible external submissions) is never delegated to an executor agent
- Rationale: the plan mirrors spec §5.1's execution order exactly — eligibility first (the only items that can cause ineligibility rather than a low score), then the index poller (cannot be backfilled if delayed), then the parsing/registry pipeline, then the measurement studies (promoted above the hook per round-7 verification), then consumer surfaces, then the v4 hook, then scoreboard/feed, then submission assembly. Every acceptance criterion traces to spec §7 rather than to an assumption. Hosting decisions (Vercel + Dien's own VPS) were Dien's explicit choice, made after a full inventory of what needs continuous compute (agent, index poller, bots, demo relayer) versus what can be static (holder digest, forward calendar, evidence pages)
- Alternatives: a single-executor build with no orchestrator/executor split was the implicit default before this session — superseded by Dien's explicit request for multi-agent parallelism. A managed compute platform (Railway/Render/Fly.io) was available as a backend alternative — not selected; Dien's own VPS was preferred to avoid a new vendor relationship
- Evidence and reference IDs: REF-018–REF-022; `outputs/02-ideation/afterhours-spec.md` §4, §4.9, §5, §7, §9; `outputs/04-planning/task-tracker.md`; `SERVICES.md` SVC-001–SVC-006
- Service IDs: SVC-001 through SVC-006, all `selected`/`approved` as of this decision
- Trade-offs: backend compute has no managed-platform fallback — uptime is entirely Dien's responsibility, with no pre-arranged backup host if the VPS goes down. This is accepted knowingly because it avoids a new vendor relationship during a compressed timeline, not because the risk is small — see SERVICES.md SVC-006
- Risks: the plan assumes 2 concurrent executor agent sessions plus the orchestrator are actually available; if Dien runs this solo without separate Claude Code sessions, task-tracker.md §1's shared-file "Mechanism A" is the fallback and execution will be slower than the phase ordering implies. The VPS single-point-of-failure risk above is the most consequential open risk carried into Stage 5
- Things to avoid / learning IDs: LEARN-002, LEARN-010
- Impact: closes Checkpoint 2 (status → approved), closes Stage 4 (status → completed), opens Stage 5 (status → in-progress). Orchestrator now assigns task-tracker.md Phase 0 tasks
- Approved by: Dien
- Approval date: 2026-08-17
- Revisit condition: the VPS proves unreliable during rehearsal (before Event A submission) — in that case fall back to a managed compute platform for SVC-006 before the Event B live window around the 2026-08-26 NVIDIA earnings, where an outage would be maximally costly

### DEC-007 — Switch LLM parsing provider to Google Gemini (temporary), confirm hosting access

- Stage: 5
- Status: approved
- Decision requested: SVC-004 (LLM parsing) was selected as Claude Opus 5 at Checkpoint 2 approval (DEC-006); Dien requested a change immediately after — switch to Google Gemini — plus self-confirmed access to the two hosting services (SVC-005 Vercel, SVC-006 VPS) that Checkpoint 2 had recorded as `selected` without verification evidence
- Selected option: **Google Gemini, Flash tier**, explicitly stated as temporary. Dien's own framing, recorded verbatim in intent: this is a current limitation because Claude requires payment; Claude Opus 5 remains the plan once billing is set up. Both SVC-005 and SVC-006 move from "decided, unverified" to "decided, access confirmed" (status `setup`) on Dien's direct confirmation that he can log into Vercel and SSH into his VPS
- Rationale: Gemini's Flash tier requires no billing setup at all (REF-023) — this is a genuinely different constraint than Claude, not a workaround for an amount that was already shown to be small (Claude Opus 5 at this project's volume was verified at roughly a two-figure dollar sum for the whole Event A window, per the prior SVC-004 entry and REF-019). The actual blocker is payment-method setup, not the dollar figure, and Dien's own framing already says so — recorded here so a future reader doesn't assume the switch means Gemini is "necessary" rather than "currently more convenient." The bonded-fields requirement (schema-guaranteed structured output) is satisfied by both providers, so this is a provider swap at the API layer, not an architecture change: the three-way parse, per-field diff, and agreement-level design (spec §4.1) are unaffected
- Alternatives: stay on Claude and set up billing now — not chosen, Dien's explicit preference is to defer that setup. A mixed approach (Gemini for the 3 parses, Claude for the single grade call) was not requested and not adopted — keeping one provider for both calls in §4.1 is simpler and cheaper to reason about during the build window
- Evidence and reference IDs: REF-023 (Gemini structured-output capability + pricing, secondary sources — reverify before scale-up), REF-024 (Vercel access confirmed), REF-025 (VPS SSH access confirmed); `SERVICES.md` SVC-004/005/006
- Service IDs: SVC-004 (decision changed), SVC-005 and SVC-006 (verification evidence added, decision unchanged from DEC-005/DEC-006)
- Trade-offs: Gemini's free tier carries a stated possibility that free-tier request data may be used to improve Google's products (REF-023) — treated as low-risk here because SEC 8-K/Form 4 filings are already public record, not confidential input. Free-tier rate limits (~5–15 req/min, ≤1,000 req/day) are well above AFTERHOURS's actual polling volume at 2 live names, but would need re-checking if live coverage expands to more of the 10 underlyings before migrating to Claude
- Risks: whoever picks up task-tracker.md P1.3/P1.5 later must not silently "fix" the Gemini reference back to Claude without checking this decision first — the temporary-provider note is now embedded directly in spec §4.1, task-tracker.md P1.3, and SERVICES.md SVC-004 specifically to prevent that. **Update, same day:** the migration was scheduled sooner than this decision anticipated — Dien asked for it to be added immediately rather than deferred, since no build work had started yet and there was no reason to wait. It is now task-tracker.md P1.10 (billing setup, HUMAN-ONLY) and P1.11 (the swap itself), explicitly marked off the critical path for both events
- Things to avoid / learning IDs: none new
- Impact: `SERVICES.md` SVC-004 rewritten; `outputs/02-ideation/afterhours-spec.md` §4.1 cost sentence updated; `outputs/04-planning/task-tracker.md` P0.7, P0.11, P1.3, P1.5 updated. Checkpoint 2 (DEC-006) is not reopened — this is an in-place service-level amendment to an already-approved plan, not an architecture invalidation
- Approved by: Dien
- Approval date: 2026-08-17
- Revisit condition: billing/payment is set up for Claude (task-tracker.md P1.10) — then execute P1.11 per the fallback already recorded in the SVC-004 entry

### DEC-008 — Rename product from AFTERHOURS to Tinjau

- Stage: 6 (Event A submission assembly, ~1 day before deadline)
- Status: approved
- Decision requested: Dien requested a full product rename, including the live production VPS infrastructure, one day before the Event A deadline (2026-08-21 23:59 UTC)
- Selected option: **Tinjau** — domain `tinjau.xyz` (Dien's plan, not yet deployed at decision time), X account already switched to `@tinjauAI` (P0.1's account, renamed in place rather than a new account). Everything user/judge-facing (frontend UI text, page titles/metadata, `PRODUCT.md`, `DESIGN.md`) renamed immediately. Live VPS infrastructure (systemd unit names, `/opt/afterhours/` directory, `AFTERHOURS_*` env var prefixes) renamed next, carefully, preserving all running services' persisted state (cold-start seals, pointers) across the rename — see the task tracker for the exact sequence and verification.
- Rationale: Dien's own product-naming decision; no technical or judging-criteria reason forced it. Executed as requested despite the deadline proximity because the user was warned of and explicitly accepted the risk (see the tracker's own note on this).
- Alternatives: rename only the judge-visible surface (frontend + docs), leave VPS internals as `afterhours-*` — this was offered explicitly and Dien chose the fuller rename instead
- Evidence and reference IDs: none new — this is a naming change, not a fact correction
- Service IDs: none changed
- Trade-offs: **locked historical records are deliberately NOT rewritten** — `afterhours-spec.md`'s body text, this file's own DEC-005/DEC-006/DEC-007 entries, and the task tracker's evidence log entries written before 2026-08-20 all still say "AFTERHOURS." That is treated as the correct historical record (the product genuinely was called that when those decisions were made and that work was done), not a leftover requiring a global find-and-replace. A rename note was added at the top of `afterhours-spec.md` and to `PRODUCT.md` instead of rewriting either document's body.
- Risks: the deployed `AfterhoursFeeHook` contract on X Layer testnet **cannot be renamed at all** — its name is fixed in already-broadcast bytecode. Submission materials must refer to it by its real deployed name and disclose the mismatch with the product's current name, rather than imply a contract called "TinjauFeeHook" exists (it does not). VPS-side rename carries real operational risk this close to the deadline (service downtime, state loss) — mitigated by renaming one service at a time with a state/functionality check after each, never a bulk rename-and-hope.
- Things to avoid / learning IDs: none new
- Impact: `apps/web` (all UI text), `PRODUCT.md`, `DESIGN.md` rewritten to "Tinjau." `afterhours-spec.md` and this file's own prior entries left as historical record, with a rename note added. VPS infra rename tracked separately in `task-tracker.md`.
- Approved by: Dien
- Approval date: 2026-08-20
- Revisit condition: none — this is a completed rename, not conditional

### DEC-009 — Evolve Tinjau into an LP Risk Autopilot

- Stage: 3
- Status: approved
- Decision requested: whether Tinjau should remain primarily a corporate-filing oracle/dynamic-fee prototype or become a complete, bounded LP-risk product
- Selected option: position Tinjau as a **corporate-event-aware market discontinuity guard for tokenized-stock liquidity on X Layer**. Preserve the existing bonded official-evidence pipeline, then add safe rumor containment, an AI Evidence Graph, independent OKX/X Layer market confirmation, `NORMAL/WATCH/PROTECT`, bounded fee action with deterministic recovery, a minimal reusable risk record, and Proof of Protection against static-fee and volatility-only baselines
- Rationale: the prior prototype proved that the components can be built, but it did not prove protection beyond a generic volatility controller, safe handling of uncertain information, or reusable ecosystem value. The revised vertical workflow makes those claims directly testable without granting an LLM unrestricted execution authority
- Alternatives: (a) remain a filing-to-fee oracle — rejected because AI, user value, and product completeness remain narrow; (b) add unrestricted news-driven action — rejected because a rumor would become an unsafe execution authority; (c) build all proposed x402, Agentic Wallet, Exchange OS, and multi-provider features now — rejected as incompatible with the Hackathon MVP boundary
- Evidence and reference IDs: REF-028, REF-029; `outputs/02-ideation/afterhours-independent-validation.md`
- Service IDs: preserves SVC-001–SVC-006; introduces pending categories SVC-007 and SVC-008
- Trade-offs: the design is more differentiated but requires one complete proof loop. Breadth is deliberately sacrificed: one official event, one rumor, one asset/pool, one market-confirmation path, one bounded action, and one three-policy benchmark
- Risks: current contracts and registry do not yet implement the final state/policy schema; current public infrastructure may still expose old branding; live news/social access is unresolved; the measured historical median LP effect is small and tail-concentrated, so results must report the distribution honestly
- Things to avoid / learning IDs: LEARN-004, LEARN-005, LEARN-007, LEARN-009, LEARN-010, LEARN-011
- Impact: completes the revised Stage 3 product definition, prospectively supersedes the original implementation scope in DEC-006, and reopens Stage 4/Checkpoint 2. Historical prototype evidence remains valid and must not be rewritten
- Approved by: Dien
- Approval date: 2026-08-20
- Revisit condition: the final vertical slice cannot be implemented safely within the available environment, or the three-policy benchmark shows no added event-aware value; in either case narrow the claim rather than changing the recorded result

### DEC-010 — Adopt the revised Hackathon MVP tracker

- Stage: 4 → 5
- Status: approved
- Decision requested: whether `outputs/04-planning/tinjau-lp-risk-autopilot-task-tracker.md` becomes the prospective Stage 5 plan of record
- Selected option: approve the new dependency-ordered P0 vertical slice, with P1 score-raising work below the cut line, P2 roadmap excluded, and immutable source-linked replay fixtures selected for the P0 news/social paths
- Rationale: the original tracker remains useful historical evidence but does not contain the five final differentiators, three-policy benchmark, final risk states, bounded recovery, or reusable risk record. Mixing new work into it would make completed prototype tasks look like completed final-product behavior
- Alternatives: (a) continue editing the historical tracker — rejected because it obscures the scope change; (b) treat every roadmap integration as Hackathon MVP — rejected because it weakens completion probability; (c) begin implementation before re-approval — rejected by Checkpoint 2
- Evidence and reference IDs: REF-028, REF-029, REF-030; `outputs/04-planning/tinjau-lp-risk-autopilot-task-tracker.md`
- Service IDs: SVC-001–SVC-008; Dien explicitly approved SVC-007/SVC-008's repository replay-fixture approach on 2026-08-20
- Trade-offs: the plan prioritizes a defensible proof over provider breadth, mainnet, monetization, and a live Exchange OS adapter
- Risks: REF-030 confirms substantial reuse but also seven compatibility gaps. The remaining Event A window is compressed, and news/social input is limited to source-linked replay fixtures; no live-monitoring claim is permitted
- Things to avoid / learning IDs: LEARN-002, LEARN-009, LEARN-010, LEARN-011
- Impact: closes the reopened Checkpoint 2 and unlocks Stage 5 under the revised scope. The historical build remains reusable evidence, subject to T0.1's recorded compatibility gaps
- Approved by: Dien
- Approval date: 2026-08-20
- Revisit condition: T0.1 reveals that the reusable baseline is materially different from the tracker assumptions, or the user changes the Hackathon MVP boundary

### DEC-011 — Split Stage 5 execution at the frontend boundary

- Stage: 5
- Status: approved
- Decision requested: how to divide implementation between an external AI agent that has no prior conversation context and the Codex frontend owner
- Selected option: Dien's external AI agent owns all non-frontend implementation; Codex owns all frontend implementation; tasks that span both surfaces use separate file lanes and mandatory versioned handoff artifacts. Dien remains integration and product-decision owner
- Rationale: the external agent needs a self-contained product, safety, evidence, and scope brief, while the frontend owner needs stable schemas and deterministic scenario data. A hard file boundary prevents accidental frontend edits, duplicated implementation, and backend/UI contract drift
- Alternatives: (a) let one agent implement everything — rejected by Dien; (b) allow both agents to edit `apps/web/**` — rejected because it creates ownership and merge conflicts; (c) let the frontend infer schemas from logs or contracts — rejected because field meaning, provenance, and degraded behavior would be ambiguous
- Evidence and reference IDs: Dien's explicit instruction on 2026-08-20; REF-028; REF-030; `outputs/04-planning/tinjau-lp-risk-autopilot-task-tracker.md` §0.21–§0.26
- Service IDs: no service selection changes; SVC-001–SVC-008 remain governed by DEC-010
- Trade-offs: stable handoff artifacts add documentation work, and some split tasks cannot close until both lanes finish; in return, each agent can work without hidden conversation context or overlapping file ownership
- Risks: an agent may treat a split task as cross-file authorization, change a schema after handoff without versioning, or claim completion before the other lane passes its acceptance checks
- Things to avoid / learning IDs: LEARN-009, LEARN-010, LEARN-011
- Impact: changes Stage 5 execution ownership only. Product scope, architecture, services, claims, and Checkpoint 2 approval remain unchanged, so Checkpoint 2 is not reopened
- Approved by: Dien
- Approval date: 2026-08-20
- Revisit condition: Dien changes the executor assignment, the repository is reorganized so the file boundary is no longer valid, or a required integration cannot be completed through the documented handoff contract
