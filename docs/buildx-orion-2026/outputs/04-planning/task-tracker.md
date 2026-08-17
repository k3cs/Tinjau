# AFTERHOURS — Task Tracker & Multi-Agent Execution Plan

Stage 4 output for workspace `buildx-orion-2026` (see `../../PIPELINE.md`, Stage 4 — Architecture and Execution Planning). This file is the ordered, checkbox-tracked work breakdown for both events. It does not restate the architecture — that lives in `../02-ideation/afterhours-spec.md` §4 (components) and §4.9 (data flow) — this file only sequences the work and assigns it.

**Source of truth for facts:** `../02-ideation/afterhours-spec.md` (why things are built this way) and `../02-ideation/afterhours-validation-prompt.md` (the neutral fact set). If a task's acceptance criterion conflicts with those files, the spec wins — fix this file, not the other way around.

**Today:** 2026-08-17. **Event A deadline:** 2026-08-21 23:59 UTC (~4.5 days). **Event B deadline:** 2026-09-02 23:59 UTC.

---

## 0. How to use this file

1. Read §1 (protocol) once before touching any task, whether you are the orchestrator or an executor.
2. Find the next unblocked task in §3 (Event A) or §4 (Event B) — "unblocked" means every ID in its `Depends on` line is already checked.
3. Follow the plan → approve → execute → verify cycle in §1. Do not skip the approval step because a task looks small — the gate is what keeps four parallel executors from stepping on each other's files.
4. Only the **orchestrator** checks the final box, and only after confirming the evidence line, not the executor's say-so.
5. If a task turns out to be wrong, too big, or blocked by something not listed — stop, do not silently reinterpret it. Add a line under §5 (Deviations Log) and get the orchestrator to update this file before continuing.

---

## 1. Multi-agent orchestration protocol

### Roles

- **Orchestrator** — one Claude Code session (this session, by default, unless the user starts a dedicated one). Owns this file. Assigns task IDs, reviews and approves/rejects executor plans, independently verifies evidence, checks the final box, and is the only role permitted to edit `../../PIPELINE.md`, `../../DECISIONS.md`, or `../../SERVICES.md`.
- **Executor** — additional Claude Code session(s), one task in flight at a time each. Never self-assigns from the task list. Never checks its own box. Never touches the pipeline control files (`PIPELINE.md`, `DECISIONS.md`, `SERVICES.md`, `TEAM.md`) — only this tracker and the product code/artifacts.

### Per-task cycle (mandatory — no task skips this)

1. **Assign.** Orchestrator picks the next unblocked task, names an executor for it, and writes the assignment under §6 (Active Assignments) with a timestamp.
2. **Plan (Opus 5).** Executor switches to Opus 5 — `/model opus` in that session, or launch with `--model claude-opus-5` — and drafts an implementation plan against the task's `Acceptance` line, using Claude Code's plan mode (`EnterPlanMode` → draft → `ExitPlanMode`) to structure it. The plan must name every file it will touch and every external action it will take (see the HUMAN-ONLY list below — if the task is on that list, the "plan" is instructions for Dien, not code).
3. **Submit for approval.** Executor posts the plan text under the task's entry in §6, or — if this is a genuinely separate local Claude Code session visible via `ListAgents` — sends it directly to the orchestrator session with `SendMessage`. Either channel is fine; pick whichever the user has actually set up. Do not start building before this step lands somewhere the orchestrator will read it.
4. **Approve.** Orchestrator checks the plan against the task's `Acceptance` line and against the verified facts in spec §7 (nothing that contradicts a measured fact gets approved). Replies `APPROVED — <date>` in §6, or requests a specific revision. No silent approval by omission — if nobody looked at it, it is not approved.
5. **Execute (Sonnet 5).** Only after an explicit `APPROVED` line exists, executor switches to Sonnet 5 — `/model sonnet` — and implements exactly the approved plan. Scope creep beyond the approved plan goes back to step 2.
6. **Report.** Executor appends one evidence line to the task in §3/§4 (file path, tx hash, URL, or command output) and marks it `done (unverified)` in §6.
7. **Verify and close.** Orchestrator independently confirms the evidence — opens the tx link, runs the command, reads the file — then checks the box in §3/§4 and removes the row from §6.

### HUMAN-ONLY tasks — never delegate to an executor agent

These involve real money, an irreversible external submission, or an account only Dien controls. An executor may prepare everything up to the button press; Dien presses it. Tagged inline as **[HUMAN-ONLY]** wherever they appear below:

- Funding any wallet with real OKB
- The mainnet wNVDAx purchase and seed transaction
- The Orion Base wallet-signature registration (non-refundable ETH spend — TEAM.md already flags this)
- Posting from the project X account, submitting the Event A Google Form, submitting Event B

### Coordination mechanism

- **If executors are separate local Claude Code sessions:** orchestrator runs `ListAgents` to see them by name, uses `SendMessage` to hand out task IDs and receive plans/reports directly. Fastest path, use it when available.
- **If running solo across terminal tabs with no cross-session messaging:** §6 of this file is the shared mailbox. Write, save, switch tabs, read, approve inline. Slower but works with nothing extra set up.

### Parallelism rules

- Only tasks with **zero unresolved dependencies** may run concurrently.
- Default cap: **2 concurrent executors**. `TEAM.md` records a solo-mode 1-workstream limit for the *human*; this raises it to 2 agent sessions because Dien is still the one reviewing every piece of evidence, and a third stream means evidence review becomes the bottleneck instead of build time. Raise the cap only if Dien explicitly says review capacity allows it.
- Never run two executors against the same contract, the same file, or the same wallet at once, even if the dependency graph technically allows it — the orchestrator sequences those by hand.
- The registry contract (§3 Phase 1) and the v4 hook (§3 Phase 4) are two different executors' work by design — they only meet at the interface the hook reads from the registry, which is exactly why Phase 1 must be *checked* (not just started) before Phase 4 begins.

### Model assignment (default for every task unless noted)

| Step | Model | Why |
|---|---|---|
| Plan | Opus 5 (`claude-opus-5`) | Planning is where a wrong call is expensive; spend the better model here. |
| Execute | Sonnet 5 (`claude-sonnet-5`) | Implementation of an already-approved plan is mechanical; Sonnet is fast and cheap enough to run several in parallel. |

For genuinely one-line operational tasks (claim a faucet, create an account), the "plan" can be one sentence — the approval gate still applies, it just takes seconds.

---

## 2. Dependency spine (read before assigning Phase 1+)

```
Day-1 eligibility (§3 Phase 0)
    │
    ├──► VPS provisioned (P0.11) + Vercel project created (P0.12) — do these early,
    │    almost everything else in Phase 1+ needs one or the other to run against
    │
    ├──► Index poller (P0.8) — depends on P0.11, start immediately once the VPS is up,
    │    cannot be backfilled if delayed (spec §4.6, §7)
    │
    ├──► Mainnet wNVDAx purchase + seed (P0.4) ──► v4 hook, mainnet leg (P4.3)
    │
    └──► Own testnet PoolManager deploy (P0.5) ──► v4 hook, testnet leg (P4.2)

Core pipeline (§3 Phase 1: parse → diff → registry) ──► everything that reads the registry:
    ├──► Measurement studies (§3 Phase 2)
    ├──► Holder digest + forward calendar (§3 Phase 3)
    ├──► v4 hook (§3 Phase 4) — also needs P0.4/P0.5 above
    └──► Scoreboard + X feed (§3 Phase 5) — scoreboard also needs P0.9

Everything above ──► Demo assembly + submission (§3 Phase 6)

Event A submission ──► Event B (§4): Orion registration is independent and can start
    anytime in the window; the live NVIDIA trace (§4 Phase 8) needs Phase 1 (parsing)
    and Phase 4 (hook) already working from Event A.

SIDE TRACK, not on the critical path — Claude migration (P1.10 billing, P1.11 swap):
    depends only on P1.3/P1.5 existing (Gemini working). Runs whenever billing is ready,
    in parallel with everything else. Nothing downstream depends on P1.11 completing —
    both events ship correctly on Gemini if it's still open at either deadline.
```

---

## 3. Event A task list (deadline 2026-08-21 23:59 UTC)

### Phase 0 — Eligibility & infrastructure (Day 1 — blocks nothing internally except where noted; run these in parallel across executors first)

- [x] **P0.0** — wMSTRx mechanics verification *(spec §7)*
  - Depends on: none
  - Acceptance: `asset()`, `multiplier()`, `convertToAssets(1e18)` confirmed identical pattern to wNVDAx.
  - Evidence: done 2026-08-17, recorded in spec §7 — pre-completed during planning, not a build task.

- [ ] **P0.1** — Create dedicated project X account *(Event A mandatory requirement #3)*
  - Depends on: none · **[HUMAN-ONLY]**
  - Acceptance: account exists, is named for the project, and is capable of posting.

- [ ] **P0.2** — Fund mainnet wallet with OKB
  - Depends on: none · **[HUMAN-ONLY]**
  - Acceptance: wallet balance > 0 OKB on chain 196, confirmed by `cast balance`.

- [ ] **P0.3** — Claim testnet OKB from the faucet (chain 1952)
  - Depends on: none · **[HUMAN-ONLY]** (captcha/wallet flow — unverified end-to-end per spec §9)
  - Acceptance: wallet balance > 0 OKB on chain 1952, confirmed by `cast balance --rpc-url https://testrpc.xlayer.tech`.

- [ ] **P0.4** — Mainnet wNVDAx purchase + seed transaction
  - Depends on: P0.2 · **[HUMAN-ONLY]** (execution); executor may prepare the exact swap calldata/route beforehand
  - Acceptance: wallet holds wNVDAx (`0xa8ddb5cd...50D5`) purchased via the USDG/wNVDAx v3 pool (`0x2a2b1173...a7b2`); tx hash recorded.

- [ ] **P0.5** — Deploy builder-owned Uniswap v4 PoolManager on testnet 1952
  - Depends on: P0.3
  - Acceptance: `v4-core` PoolManager deployed at a new address on chain 1952 (canonical address has `codesize` 0 there — confirmed spec §7); deployer, address, and deploy tx recorded; submission copy will state plainly this is not canonical Uniswap.

- [ ] **P0.6** — Create Event B assets: website shell, GitHub repo, Discord or Telegram link
  - Depends on: none
  - Acceptance: all four links live and reachable (website, X profile — reuses P0.1 —, GitHub, Discord/Telegram).

- [x] **P0.7** — Populate `SERVICES.md` service categories, get service plan Checkpoint-2-ready
  - Depends on: none · orchestrator-only task (touches a control file)
  - Acceptance: every category implied by the architecture has a `selected`/`deferred`/`not-needed` decision (SEC EDGAR access, LLM parsing — currently Gemini, see SVC-004, X Layer RPC, page hosting, bot hosting, GitHub, Discord/Telegram); see `SERVICES.md` for entries already added.
  - Evidence: done 2026-08-17, `SERVICES.md` SVC-001–SVC-006 all decided, Checkpoint 2 approved (DEC-006).

- [ ] **P0.13** — Obtain a Gemini API key *(SERVICES.md SVC-004, gates live testing of P1.3/P1.5)*
  - Depends on: none · **[HUMAN-ONLY]** — needs Dien's own Google account
  - Acceptance: a working Gemini API key exists and is placed on the VPS as an env var per P0.11. Not previously tracked as its own task — surfaced 2026-08-17 during environment audit: no `GEMINI_API_KEY`/`GOOGLE_API_KEY` is present anywhere in this environment, so P1.3/P1.5 can be **written** without this but cannot be **tested live** until it exists.

- [ ] **P0.11** — Provision the VPS as the backend host *(SERVICES.md SVC-006)*
  - Depends on: none
  - Acceptance: runtime installed, process manager (systemd/pm2/Docker — Dien's choice) configured to restart the agent across reboots, secrets set as environment variables (LLM API key — **Gemini for now, temporary; swap to Claude when SVC-004 migrates**, X Layer RPC, registry-poster private key, demo-relayer private key — **a different key from the poster key**, X/Telegram bot tokens), SSH hardened. This is the single highest-consequence infrastructure item — if it goes down overnight during the closed-market window, that's the exact failure mode the product argues against (SERVICES.md SVC-006).

- [ ] **P0.12** — Create the Vercel project *(SERVICES.md SVC-005)*
  - Depends on: none
  - Acceptance: `apps/web` (or a new app in the monorepo) deploys a placeholder page on Vercel and is publicly reachable, before any real page is built against it.

- [ ] **P0.8** — Start the OKX index-price poller (wNVDAx + wMSTRx)
  - Depends on: P0.7, P0.11 (needs somewhere to run)
  - Acceptance: a cron job or long-running process on the VPS is writing `(timestamp, price)` rows for both tokens at least every few minutes; **do this before anything else feels more urgent — the index endpoint has no history, so every hour not recorded is lost permanently (spec §7, §4.6).**

### Phase 1 — Core parsing pipeline *(spec §4.1, §4.2)*

- [x] **P1.1** — EDGAR poller for 8-K / Form 4
  - Depends on: P0.7, P0.11
  - Acceptance: polls SEC EDGAR submissions API for NVDA (CIK 0001045810) and MSTR (CIK 0001050446) live; the other 9 underlyings present as config rows (not polled) per spec §4.1; runs on the VPS from P0.11.
  - Evidence: `apps/server/src/edgar/client.ts` + `src/edgar/poller.ts` + `src/config/tickers.ts`, done 2026-08-17. Correct submissions-API/Archives URL construction, required `EDGAR_USER_AGENT` header enforced (fails fast if unset), 5-min default poll interval with a 30s floor guard against tight-looping SEC. CIKs independently cross-checked against `company_tickers.json`. **Not yet run against live traffic** — requires the VPS from P0.11 to actually run continuously; code itself is orchestrator-verified via `tsc --noEmit` + reading. Live long-running smoke test still pending P0.11.

- [x] **P1.2** — HTML → clean-text stripper for filing documents
  - Depends on: P1.1
  - Acceptance: strips XBRL/HTML tags before any model call; a 200 KB raw 8-K reduces to ~10 K characters (measured range spec §7: 2,500–3,700 tokens after stripping).
  - Evidence: `apps/server/src/parsing/stripFilingHtml.ts`, done 2026-08-17. Orchestrator ran it directly against the real fixture (MSTR 8-K, accession 0001193125-26-341297): 200,720 raw bytes → 7,857 stripped chars (~1,964 est. tokens). This is below the spec's 2,500–3,700 range; orchestrator inspected the **full** stripped output (not an excerpt) and confirmed it's genuinely complete prose — cover page through signature block, all three disclosure sections (ATM/BTC/repurchase updates) intact, nothing truncated. This specific filing is a short 8-K (mostly tables + a brief Item 7.01 note); the token estimate is legitimate document-size variance, not a stripping bug. Acceptance line's "~10K chars" example should be read as a range anchor, not a hard floor.

- [x] **P1.3** — Three independent structured-output parses per filing
  - Depends on: P1.2, P0.11
  - Acceptance: three separate model calls — **Google Gemini (Flash tier), temporary per SVC-004; migration to Claude Opus 5 is tracked as P1.11, gated on P1.10 (billing)** — each produce the full field set (event type, effective date, amounts, affected token, future-announced dates for §4.4) from the same stripped text, using Gemini's `responseMimeType: "application/json"` + `responseSchema` for schema-guaranteed output (REF-023). Build this against Gemini now; P1.11 handles the swap later — do not build for both providers at once.
  - Evidence: `apps/server/src/llm/parseFiling.ts` + `src/llm/schema.ts` + `src/llm/provider.ts`, done 2026-08-17 (code-complete, orchestrator-reviewed). Three genuinely independent `generateObject` calls (not one call asked for variations), each with its own retry (2 retries, 500ms delay), partial-failure-tolerant (P1.4 already treats <3 successes as not-ready-to-post). Provider isolated behind a single `getLanguageModel()` choke point built explicitly for the P1.11 swap. **Cannot be tested live** — blocked on P0.13 (no Gemini key in this environment). `parseFiling.test.ts` covers retry/schema-validation/error-path logic with a mocked `generateFn`, no live call.

- [x] **P1.4** — Per-field diff + agreement level
  - Depends on: P1.3
  - Acceptance: fields compared across the 3 parses, not documents compared whole; every field carries an agreement level; if a designated key field disagrees, the record is queued for manual review and **not** auto-posted.
  - Evidence: `apps/server/src/diff/agreement.ts`, done 2026-08-17, orchestrator-reviewed line by line. Order-insensitive canonicalization (arrays/object keys sorted before comparison) correctly prevents spurious disagreements. Key fields (`eventType`, `affectedToken`) block auto-post on disagreement; fail-closed on zero or <3 successful parses. Test coverage confirmed passing (`agreement.test.ts`, part of the 23/23 orchestrator re-ran directly).

- [x] **P1.5** — Severity/direction grade (unbonded, separate call)
  - Depends on: P1.2, P0.11
  - Acceptance: one additional model call (same provider as P1.3 — Gemini for now) outputs a severity tier + direction, kept structurally separate from the bonded fields (spec §3 — "not describe the grade as bonded").
  - Evidence: `apps/server/src/llm/gradeFiling.ts`, done 2026-08-17, orchestrator-reviewed. Genuinely structurally separate: distinct function, distinct return type (`SeverityGradeResult`, tagged with a `kind: "unbonded_severity_grade"` marker so it can't be silently treated as a bonded field downstream), `diff/agreement.ts` never imports from this file. Same live-test blocker as P1.3 (P0.13).

- [x] **P1.6** — EventState registry contract
  - Depends on: none (can be written in parallel with P1.1–P1.5, needs them only for the first real post)
  - Acceptance: on-chain struct holds token, event type, structured fields, per-field agreement, severity grade, source URL, SHA-256 content hash, timestamp; bond posted in USD₮0 (`0x779ded...3736`, **6 decimals — verify this in the contract, not 18**).
  - Evidence: `contracts/src/EventStateRegistry.sol`, done 2026-08-17. Orchestrator independently ran `forge clean && forge build` (91 files, clean compile, zero warnings) and `forge test` (24/24 tests in `EventStateRegistry.t.sol` passing) directly — not just trusting the executor's report. Bonded (`FactualFields`, `FieldAgreement`) vs. unbonded (`SeverityGrade`) fields are separate structs, matching the spec requirement structurally, not just in comments. 6-decimal USD₮0 convention correct and locked in by `test_bondAmount_humanUnitsUse6DecimalScale`. Poster/resolver/owner are three distinct roles specifically to prevent a poster adjudicating their own challenge (`test_resolveChallenge_posterCannotResolveOwnEvent` passing). Nothing deployed anywhere yet — local Foundry tests only, per scope.

- [x] **P1.7** — Challenge-window bond mechanism
  - Depends on: P1.6
  - Acceptance: bare contract call (no UI, per scope cut spec §5.1); anyone can dispute a posted state by showing fields mismatch the linked document hash within the window; resolution by a named resolver key for MVP (disclosed centralization, not hidden).
  - Evidence: same file/commit as P1.6, done 2026-08-17. `challenge()`/`resolveChallenge()` reviewed directly — binary bond outcome (full amount to challenger or back to poster, no partial slash for MVP), one-open-challenge-per-event, window-boundary test (`test_challenge_atExactWindowBoundary_succeeds`) passing. Orchestrator's own `forge test` run confirms all challenge/resolution tests pass (part of the same 24/24 above).

- [ ] **P1.8** — Deploy registry to testnet 1952, smoke-test
  - Depends on: P1.6, P1.7, P0.3
  - Acceptance: one real filing goes end-to-end — poll → strip → 3× parse → diff → bond → post — and is readable back from the contract.

- [ ] **P1.9** — Deploy registry to mainnet 196
  - Depends on: P1.8, P0.4
  - Acceptance: same as P1.8 but on chain 196; this is what the Event A mainnet-launch requirement is checked against.

- [ ] **P1.10** — Set up Claude API billing *(SERVICES.md SVC-004 fallback)*
  - Depends on: none · **[HUMAN-ONLY]**
  - Acceptance: Anthropic billing configured, a working Claude API key obtained. No fixed date — this task exists so the precondition is tracked and visible rather than left as a footnote (added to the tracker 2026-08-17 per Dien's request, since no build work had started yet and there was no reason to defer writing it down).

- [ ] **P1.11** — Migrate LLM parsing from Gemini to Claude Opus 5 *(spec §4.1, SERVICES.md SVC-004, DEC-007)*
  - Depends on: P1.10, P1.3, P1.5
  - Acceptance: swap the API client used in P1.3 (three-way parse) and P1.5 (severity grade) from Gemini's `responseMimeType`/`responseSchema` to Claude's `output_config.format`, same JSON schema. The three-way-parse and per-field-diff logic (P1.4) does not change — this is a provider swap at the API-client layer only. Re-run P2.1's parse-accuracy sample, or at minimum one real filing, to confirm schema-valid output on the new provider before marking this done. **Not on the critical path for either event** — both Event A and Event B ship correctly on Gemini if this task is still open when their deadlines arrive; do not let it block or delay anything else in Phase 1+.

### Phase 2 — Measurement studies *(spec §4.8, promoted above the hook in build order)*

- [ ] **P2.1** — Parse-accuracy sample
  - Depends on: P1.3
  - Acceptance: parser run over a predeclared ~30-filing sample (drawn from the 171-filing year, MSTR-heavy per spec §7); reports field-level accuracy **and** the inter-model agreement rate from P1.4; method predeclared before results are read.

- [x] **P2.2** — On-chain reaction-latency study
  - Depends on: P0.8 not required (this study uses historical trades, not the poller) — depends only on RPC access
  - Acceptance: for every filing whose EDGAR timestamp falls inside that token's available price window (starts 2026-07-20 for NVDAx/MSTRx, 2026-07-29 for the other eight — spec §7), compute the interval to the first Swap event in the reference USDG pool via targeted ±60-minute RPC windows (72 calls per event against the 100-block cap) **with mandatory per-call retry** (spec §7: no-retry vs retry gave 435 s vs 237 s on the same filing). Report median, spread, and no-trade count, **split by form type** — 8-K (n=12) as primary, Form 4 (n=34) as secondary — across all 10 underlyings (n=46 total). Pre-register this split before running.
  - Evidence: `outputs/05-build/reaction-latency-study.md` + `outputs/05-build/data/p2_2_reaction_latency_raw.jsonl`, done 2026-08-17. n=46 as pre-registered (12 8-K + 34 Form 4, 9/10 tickers — TSLA had zero qualifying filings). Result: 14/46 (30%) no trade in ±60min; median gap 274s (4.6 min) overall, 355s (5.9 min) for 8-K, 222s (3.7 min) for Form 4. **A real data-quality gap was found and closed before reporting**: 12 of the 14 no-trade events initially had incomplete RPC window coverage (a chunk failed all 4 internal retries); orchestrator re-swept exactly those 12 with a more aggressive retry policy — all 12 achieved full coverage and all still confirmed no trade, so the reported count is coverage-complete, not a data artifact. See the doc §4 for the full accounting, including a disclosed minor residual caveat on 23 events with a found trade but a nonzero non-blocking `rpc_errors` count.

- [x] **P2.3** — Publish reaction-latency methodology + results
  - Depends on: P2.2
  - Acceptance: a results page/doc stating the pre-registered method and the actual numbers, published regardless of outcome, linked from the submission narrative (P6.3).
  - Evidence: `outputs/05-build/reaction-latency-study.md`, done 2026-08-17. States method, sample, results (pooled + per-form-type + per-ticker), and the coverage-gap finding/fix transparently. Not yet linked from a live submission narrative — P6.3 is still open and depends on this.

- [ ] **P2.4** — Markout study
  - Depends on: P2.2
  - Acceptance: realised LP loss on the first post-filing trade in the reference USDG pool, computed for the events identified in P2.2, using the same targeted RPC windows; reported in dollars against the pool's actual size (~$221k for USDG/wNVDAx).

### Phase 3 — Consumer surfaces: holder digest + forward calendar *(spec §4.4, §4.5)*

- [ ] **P3.1** — Holder digest page
  - Depends on: P1.9 (needs a live registry to join against), P0.12
  - Acceptance: paste an address → RPC balance read across NVDAx/MSTRx/wNVDAx/wMSTRx → joined against registry events → per-token event list with source-doc link and on-chain tx link. No wallet connection, no signature, no gas. Deployed on Vercel; build client-side (browser calls RPC directly) if possible to avoid needing a VPS round-trip for a read-only page.

- [ ] **P3.2** — Forward calendar
  - Depends on: P1.9, P0.12
  - Acceptance: queryable read exposing the future-dated fields extracted in P1.3 (dividend record/payment dates, split effective dates, announced earnings times) per token; NVDAx's 2026-08-26 earnings answerable correctly on submission day as the worked instance. Deployed on Vercel, same client-side-first approach as P3.1.

- [ ] **P3.3** — Smoke-test holder digest against a real address
  - Depends on: P3.1
  - Acceptance: run against one of NVDAx's 1,663 existing holder addresses; confirm zero-wallet, zero-gas experience end to end.

### Phase 4 — Uniswap v4 hook *(spec §4.3)*

- [x] **P4.1** — Write `beforeSwap` hook
  - Depends on: P1.9 (interface must match a live registry)
  - Acceptance: deterministic fee policy over bonded fields (form type, event type, agreement level) with hard min/max band + per-event rate limit in the contract; severity grade only modulates fee within that band — verify by attempting to push the fee out of band with an extreme grade value and confirming it's clamped.
  - Evidence: `contracts/src/AfterhoursFeePolicy.sol` (pure fee math) + `contracts/src/AfterhoursFeeHook.sol` (`beforeSwap` hook), done 2026-08-17. Orchestrator independently reviewed `AfterhoursFeePolicy.sol` in full: bonded fields (`eventType`, `agreement`) set a 0–3 concern tier which anchors the fee target; unbonded severity may only nudge within a capped 20%-of-band-width swing, and every path funnels through one `_clamp()` before returning — this is genuinely provable, not just documented. Orchestrator's own `forge test` run confirms `testFuzz_computeFee_neverEscapesBand_evenWithAdversarialSeverity` (256 fuzz runs, full `int8` range including the undocumented -128/127 extremes) plus two real-swap integration tests that drive an actual `PoolManager.swap()` with maxed-out severity and assert the emitted fee stays in-band — 32/32 hook+policy tests passing (21 policy + 11 hook, part of the same independent `forge test` run as P1.6/P1.7). Uses real `v4-core` (cloned fresh, not stubbed) with a hand-written minimal `IHooks` implementation instead of `v4-periphery`/`BaseHook` — a documented dependency-surface reduction, not a fallback from a failed fetch. Not yet deployed anywhere (P4.2/P4.3, still open, depend on P0.5/P0.4 which are HUMAN-ONLY infra tasks not yet done).

- [ ] **P4.2** — Deploy hook + pool on testnet (builder's own PoolManager)
  - Depends on: P4.1, P0.5
  - Acceptance: wNVDAx/USDG pool live against the testnet-1952 PoolManager from P0.5, hook attached, swappable.

- [ ] **P4.3** — Deploy hook + pool on mainnet (canonical PoolManager)
  - Depends on: P4.1, P0.4
  - Acceptance: wNVDAx/USDG pool live against the canonical mainnet PoolManager (`0x360e68...fb32`), hook attached, seeded by the builder; this is the mainnet-launch evidence for Event A.

- [ ] **P4.4** — End-to-end synthetic-injection test
  - Depends on: P4.2, P1.8
  - Acceptance: a synthetic high-severity 8-K for NVDAx goes through parse → three-way diff → bonded post → fee widen, and a testnet swap visibly pays the widened fee; a non-material injected filing produces no state change (negative control, must also be tested).

### Phase 5 — Scoreboard & X feed *(spec §4.6, §4.7)*

- [ ] **P5.1** — Scoreboard page
  - Depends on: P0.8, P1.9, P0.11, P0.12
  - Acceptance: two columns per event — agent on-chain post time, first index-reaction time from the P0.8 poller — labelled analytics, explicitly not connected to slashing. Small API on the VPS (P0.11) serves the poller data; the page itself deploys on Vercel (P0.12) and calls that API.

- [ ] **P5.2** — Landing-page evidence copy
  - Depends on: P2.2, P2.3 (needs the real numbers)
  - Acceptance: states the closed-hours share (~97%, spec §7 — publish the classifier or write "~97%") and the measured 5.4-minute median staleness finding, both with their stated caveats.

- [ ] **P5.3** — X bot posting every parsed event
  - Depends on: P1.9, P0.1, P0.11
  - Acceptance: every posted registry event (8-K and Form 4) gets an X post with its on-chain tx link, automatically; runs on the VPS as a downstream step of the P1.1–P1.9 pipeline.

- [ ] **P5.4** — Static Telegram channel link
  - Depends on: P0.6
  - Acceptance: channel exists, link is live; manual posting is acceptable for Event A (automation deferred to Event B, P9.4).

### Phase 6 — Event A demo & submission assembly

- [ ] **P6.1** — Assemble demo script
  - Depends on: P3.1, P3.2, P2.3, P4.4
  - Acceptance: judge flow matches spec §5.3 order — live record first, then holder digest (zero-wallet), then forward calendar, then the reaction-latency study, then the synthetic injection demo **last**, clearly marked synthetic.

- [ ] **P6.2** — Hosted synthetic-injection demo page
  - Depends on: P4.4, P0.11, P0.12
  - Acceptance: pre-funded relayer means a judge needs zero OKB and zero tokens to run the injection demo end to end. Relayer + trigger logic lives on the VPS (P0.11) behind its own private key, separate from the registry-poster key; the button itself is a Vercel page (P0.12) calling that endpoint.

- [ ] **P6.3** — Submission narrative
  - Depends on: P2.3, P4.3, P5.1
  - Acceptance: maps to Event A's 7 criteria (spec §6 mapping table), states AI-RWA track membership explicitly (form has no track selector), links every mainnet tx.

- [ ] **P6.4** — Verify all mainnet tx links resolve publicly
  - Depends on: P1.9, P4.3
  - Acceptance: every tx link in the submission opens on a public explorer with no auth required.

- [ ] **P6.5** — Post from project X account mentioning @XLayerOfficial
  - Depends on: P6.3 · **[HUMAN-ONLY]**
  - Acceptance: post is live, from the account created in P0.1, mentions @XLayerOfficial (Event A mandatory requirement #4).

- [ ] **P6.6** — Submit Google Form
  - Depends on: P6.3, P6.5 · **[HUMAN-ONLY]**
  - Acceptance: form submitted before 2026-08-21 23:59 UTC; confirmation saved.

- [ ] **P6.7** — Final Event A eligibility checklist
  - Depends on: P6.6
  - Acceptance: all five mandatory items confirmed — AI in product design ✓ deployed on X Layer ✓; testnet-then-mainnet ✓ (with the testnet-PoolManager caveat stated, not hidden); dedicated active X account ✓; submission post ✓; form by deadline ✓.

---

## 4. Event B task list (window 2026-08-22 → 2026-09-02, deadline 2026-09-02 23:59 UTC)

### Phase 7 — Orion registration & assets

- [ ] **P7.1** — Orion wallet-signature registration on Base
  - Depends on: none (can start any time in the window) · **[HUMAN-ONLY]** — non-refundable ~$10 ETH spend, TEAM.md already flags this as Dien-only
  - Acceptance: registration confirmed; only the wallet touches Base, the product stays on X Layer.

- [ ] **P7.2** — Confirm required Event B assets present
  - Depends on: P0.6
  - Acceptance: website, X profile, GitHub, Discord/Telegram all still live (reused from Event A).

### Phase 8 — Live NVIDIA earnings trace & sentinel A/B

- [ ] **P8.1** — Monitor the live 2026-08-26 NVIDIA earnings event
  - Depends on: P1.9, P4.3 (Event A pipeline must already be working)
  - Acceptance: complete trace captured — filing → parsed state → on-chain post → fee change → scoreboard entry — for the real earnings release (~20:20 UTC results, 21:00 UTC call per spec §7).

- [ ] **P8.2** — Sentinel A/B test
  - Depends on: P8.1
  - Acceptance: two equal small LP positions in the existing v3 wNVDAx pool, one passive, one feed-guarded (withdrawn/narrowed on a GRAVE-state signal).

- [ ] **P8.3** — Publish sentinel A/B results
  - Depends on: P8.2 · involves real fund movement — orchestrator confirms with Dien before treating as **[HUMAN-ONLY]** or executor-fundable from a pre-approved small pool
  - Acceptance: both P&Ls and all transaction links published after the earnings event, regardless of outcome.

### Phase 9 — Deferred-item backfill (time-permitting, in this priority order)

- [ ] **P9.1** — Extend reaction-latency + markout coverage with new filings
  - Depends on: P2.2, P2.4
  - Acceptance: incorporate filings that land during the Event B window (~1.6/day across the 10 names) into the existing studies.

- [ ] **P9.2** — Grade calibration against realized outcomes
  - Depends on: P1.5, P5.1
  - Acceptance: severity/direction grades compared against what actually happened to the reference price; published as a track record (spec §4.2).

- [ ] **P9.3** — Scoreboard backfill
  - Depends on: P5.1
  - Acceptance: historical entries added retroactively where reaction data exists.

- [ ] **P9.4** — Telegram bot (automate the static channel)
  - Depends on: P5.4, P5.3
  - Acceptance: same posting logic as the X bot (P5.3), pointed at Telegram.

- [ ] **P9.5** — Automatic index-reaction detection
  - Depends on: P5.1
  - Acceptance: scoreboard's reaction timestamps stop being operator-recorded and are detected programmatically from the P0.8 poller series.

- [ ] **P9.6** — ERC-8004 registration
  - Depends on: none
  - Acceptance: single CLI command run; not marketed as a headline feature (spec §3 — explicit anti-pattern from the winner corpus).

### Phase 10 — Event B submission assembly

- [ ] **P10.1** — Submission narrative
  - Depends on: P8.3
  - Acceptance: frames the event agent as the submitted AI agent, its on-chain effects as bonded registry updates that change live swap pricing.

- [ ] **P10.2** — Feature the NVIDIA trace + sentinel A/B as the differentiator
  - Depends on: P8.3, P10.1
  - Acceptance: explicitly contrasts against the two existing read-only analyst entries on Base (spec §2 field note) — this project *acts* on-chain, theirs don't.

- [ ] **P10.3** — Final Event B submission
  - Depends on: P7.1, P10.1, P10.2 · **[HUMAN-ONLY]**
  - Acceptance: submitted before 2026-09-02 23:59 UTC.

---

## 5. Deviations log

Record here, don't silently reinterpret a task. One line each: date, task ID, what changed, why, who approved it.

- **2026-08-17, P0.6 (GitHub repo scaffolding).** Dien decided `git init` should happen at the repo root (`/Users/scientivan/Programming/New`), accepting the stated tradeoff that other local projects (`.impeccable/`, `.superstack/`) live in the same directory. Implementation choice made by orchestrator, not separately re-confirmed: `contracts/` stays its own independent git repo (needed for Foundry's `forge install` submodule-based dependency management, already working — 56/56 tests passing) rather than being folded into the root repo; root `.gitignore` excludes it, `.impeccable/`, `.superstack/`, `node_modules/`, and `.env`. Root repo initialized locally (`git init` run, `.gitignore` written) but **not yet committed, no remote created, nothing pushed** — those are separate, more consequential steps deferred until explicitly requested or until P0.6/P6 actually need the repo live. If Dien wants `contracts/` folded into the root repo instead (single unified history, submodule surgery required), say so and this gets redone before the first commit.

---

## 6. Active assignments

Orchestrator writes one block per in-flight task here; delete the block once §7's verify-and-close step completes and the task's evidence line is filled in above.

```
Task:      [ID]
Executor:  [session name / "Dien" for HUMAN-ONLY]
Assigned:  [date/time]
Plan:      [pasted here, or "sent via SendMessage to <session>"]
Approval:  [pending / APPROVED — date / revision requested: <what>]
Status:    [planning / executing / done (unverified) / verified]
```

Task:      P1.6, P1.7, P4.1 (contracts)
Executor:  subagent "contracts-executor" (Agent tool, general-purpose, Sonnet 5)
Assigned:  2026-08-17
Status:    verified 2026-08-17 — orchestrator independently ran `forge build`/`forge test` (56/56 passing) and read every contract file directly; boxes checked above with evidence.

Task:      P1.1, P1.2, P1.3, P1.4, P1.5 (EDGAR pipeline)
Executor:  subagent "pipeline-executor" (Agent tool, general-purpose, Sonnet 5)
Assigned:  2026-08-17
Status:    verified 2026-08-17 — orchestrator independently ran `tsc --noEmit` and the full test suite (23/23 passing), read every source file directly, and personally resolved a stripped-text token-count discrepancy (not just trusted the executor's explanation) by running the stripper and reading its full output; boxes checked above with evidence. Live behavior (P1.1 continuous polling, P1.3/P1.5 real Gemini calls) still blocked on P0.11 (VPS) / P0.13 (Gemini key) — noted per-task above, not silently marked fully done.

(no active assignments — the two background executor streams and the orchestrator-direct P2.2 study all completed and were independently verified 2026-08-17; see evidence lines in §3 above. Next unblocked work is Phase 0's remaining HUMAN-ONLY items, P0.1–P0.4, P0.11–P0.13.)

- **2026-08-17, wallet generation for P0.2/P0.4/P0.11/P6.2.** Orchestrator generated two wallets via `cast wallet new` (poster key, demo-relayer key — deliberately separate per spec, so the demo relayer can never also post events). Private keys saved only to `/Users/scientivan/Programming/New/.secrets/` (chmod 600, directory chmod 700, confirmed `.gitignore`d before any `git add` touched the repo). Only the public addresses are recorded here for Dien to fund:
  - Poster wallet: `0x2139b8E4AdB0755cE1776717016b1Ff8Fabac4E2`
  - Demo-relayer wallet: `0x0d6d05e9AEE5e21dE241299Cabd566a3B1F1d732`
