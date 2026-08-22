# Tinjau — Post-Submission Score and Substance Tracker

Stage 5 planning artifact for workspace `buildx-orion-2026`. Successor to
`tinjau-score-improvement-task-tracker.md`, which is now closed: every task in it is `[x]`, `[!]`
or time-expired, and it is **historical evidence, not a source of open work**.

- Status: **open, unstarted. No task here is approved yet.** Dien approves tasks individually, or
  approves a phase explicitly. Handing this file to an agent is NOT approval to execute it.
- Created: **2026-08-22, after the submission deadline** (2026-08-21 23:59 UTC).
- Scope: raise the project's real standing on all seven published judging criteria, and on the
  four-part Liquidity Grant wording, **without breaking the claim discipline that is the project's
  most valuable asset**.

---

## 0. Mandatory context for an agent with no prior knowledge of this project

**Read this whole section before planning or touching anything.** It is long because getting this
project wrong is easy and expensive: almost every mistake available here is the mistake of claiming
more than the evidence supports, and that is the one failure this project cannot absorb.

### 0.1 Mission, and the one rule that outranks the mission

The mission is to make the project genuinely better on the seven criteria a judge scores.

The rule that outranks it: **if improving a score would require weakening a disclosure, overwriting
historical evidence, or making a claim the data does not support, the score does not get improved.**
Record the conflict and stop. An independent evaluation scored this project's honesty as its
strongest property. Trading that away for a point on another axis is a net loss, and is forbidden.

Authority order when documents disagree:

1. Dien's current instruction, and the integrity rules in §0.4;
2. this tracker, for scope and acceptance evidence;
3. `tinjau-lp-risk-autopilot-task-tracker.md` §0 for product behaviour, invariants and claim
   boundaries (its §0.7 invariants and §0.19 claim boundary apply verbatim here);
4. `tinjau-score-improvement-task-tracker.md` for what was already tried, found, and rejected —
   **read its Evidence fields before proposing anything, so you do not redo settled work**;
5. the deployed contracts and published artifacts as ground truth about what exists.

### 0.2 What Tinjau is, in enough detail not to misread it

Tinjau protects liquidity providers in pools of tokenized US equities on X Layer (an EVM chain by
OKX; testnet chain id **1952**, RPC `https://testrpc.xlayer.tech`; mainnet chain id **196**, RPC
`https://rpc.xlayer.tech`).

The problem: tokenized stocks trade on-chain 24/7, but the US reference market closes and SEC
filings arrive at arbitrary times. A trader who has read a disclosure can trade against a pool's
stale quote, and the loss lands on LPs.

Pipeline, in order:

```text
ingest claim (SEC filing / news / social post)
-> normalize with provenance (OFFICIAL | NEWS | RUMOR, publisher, timestamp, URL, content hash)
-> evidence graph (entity resolution, syndication dedup, contradiction marks)
-> deterministic promotion rules -> risk state NORMAL | WATCH | PROTECT
-> independent market confirmation (pool price, basis, drawdown, velocity, exit depth,
   freshness, anti-wick)
-> signed record written to TinjauRiskRegistry on X Layer Testnet
-> Uniswap v4 hook (TinjauFeeHook) reads the record and charges a bounded fee per swap
```

Non-negotiable invariants, enforced in code and tests:

- rumor-only evidence can never exceed `WATCH`; one news source alone cannot authorize `PROTECT`;
- syndicated copies of one origin count as one source;
- stale or missing market data cannot create a new `PROTECT`, and cannot cancel a running one;
- `PROTECT` is bounded: baseFee 500 pips, maxFee 20,000 pips, 3,600 s widen, 18,000 s decay,
  21,600 s hard cap, 3,600 s cooldown; expiry applies at read time, with no keeper;
- **the AI may never set a fee, pick a runtime threshold, authorize an action, or touch chain
  state.** The contract can reject any proposal and can only ever lower a proposed fee.

### 0.3 The claim gate — memorise this, it invalidates work that breaches it

Published positions that must survive everything in this tracker:

- **`canClaimLossAvoided` is `false`.** The pre-registered benchmark condition failed. These
  sentences are prohibited outright, in any paraphrase: *"Tinjau reduces LP loss"*, *"Tinjau
  avoided X dollars of loss"*, *"Tinjau outperformed the baselines economically"*.
- **No "first", "only", or "unique" precedence claims, ever**, regardless of what any survey finds.
  A competitor survey returning nothing does not upgrade "not found" into "first".
- The four frozen scenarios resolve **A=WATCH, B=WATCH, C=WATCH, D=NORMAL**. The demonstrated
  `PROTECT` uses a **CONSTRUCTED** price path on a builder-controlled pool; the canonical replay of
  the same event resolves to `WATCH`. The rumor input is **SIMULATED**.
- Both deployed pools hold **builder-controlled mock tokens with no value**. Neither is a market.
- The reference consumer was built by Tinjau and **is not evidence of adoption**.
- The contracts are **unaudited**. No auditor, no report, no scope, no engagement exists.

A task may relax a prohibited sentence **only** by the mechanism that created it: a pre-registered
condition, published raw data, and the flag flipping in the published artifact. **Never by editing
copy first.** Selecting events, thresholds, or scenarios after seeing results is forbidden
everywhere in this tracker.

### 0.4 Integrity rules, absolute

1. **Never backdate anything.** No commit-date manipulation, no editing a dated document to look
   as though it predated the deadline, no rewriting of historical evidence files.
2. **Label post-deadline work.** The submitted state is the tag **`submission-final`**, commit
   `58ab29dd`, dated **2026-08-21 19:28:21 UTC**. Every judge-visible change after it gets a dated
   line in **`POST-SUBMISSION.md`** at the repository root. This is not optional bookkeeping; it is
   the mechanism that lets a judge trust anything else in the repository.
3. **Corrections are written as corrections.** When you find something wrong in the project's own
   records, fix it in a way that quotes the previous claim and dates the correction. Do not silently
   overwrite. Three overconfident claims were found and corrected this way on 2026-08-21; follow
   that pattern.
4. **Do not edit frozen artifacts to improve their wording.** Several published files feed the demo
   manifest sha256 `be884920d860b0f4c92180670f52ae54400f4e5d77e25d95ae111b7221ee7196`:
   `scenario-rumor-watch.json`, `scenario-confirmed-protect.json`, `three-policy-benchmark.json`,
   `proof-of-protection.json`, `deployed-addresses.json`, `t4-demo-manifest-xlayer-testnet.json`
   (see `demo/tinjau-demo.mjs` `SOURCES`). If a claim on one of those surfaces needs qualifying,
   qualify it **at the render site**, not in the artifact. If the manifest hash changes and you did
   not deliberately intend it, you have broken something.
5. **Never write a secret** into any file, fixture, log, commit, or artifact. Error messages name
   environment variables, never values.

### 0.5 What was already done, so you do not repeat it

On 2026-08-21 a full sprint ran against the previous tracker. Its Evidence fields carry the detail.
Summary of what is now true, and what it cost:

| Done | Result |
|---|---|
| `contracts/` builds from a bare clone | vendored deps, `forge test` = **145 pass** with no setup step |
| Bonded-evidence bit disclosed on every surface | it was an assumed input presented as a passed check |
| One pinned LLM model id | `gemini-3.6-flash`; the published parse study used five others |
| Silently-skipped test suites now announce themselves | counts are **594** full / **590** without `contracts/out` / **583** without Foundry |
| Bonded bit **computed live** and posted on chain | tx `0x7edfb15d…dd507`, block 38,875,116, `WATCH`; the computed value **matched** the assumed one |
| Model run against the evidence-graph heuristics | entity 10/10, contradiction 10/10, syndication **7/10**, disagreements published unresolved |
| Paired-pool experiment, pre-registered then run | band `CONFIRMS`, but see §0.6 — it is a conformance test |
| Scenario expansion, pre-registered then run | **the expansion set is empty**; see §0.6 |
| Competitor survey | claim survives; nearest prior art is **Ondo Global Markets** |
| Integration kit, RPC note, mainnet memo, outreach kit | written; none published or sent externally |
| X listener | **BLOCKED**: X API returns HTTP 402 credits-depleted |
| Live news intake | works: EDGAR Atom, 10 filings, dedup collapsed 10 origins to 1 |

### 0.6 Findings that change strategy — read these before proposing any task

These were established on 2026-08-21 and several of them invalidate obvious-looking plans.

**(a) The hook cannot be attached to existing X Layer liquidity. This is structural, not
financial.** The ten real tokenized-equity pools on X Layer are **Uniswap v3**; `TinjauFeeHook` is a
**v4** hook; in v4 the hook is part of the `PoolKey` and is fixed at pool initialization. Verified
directly: pool `0x2a2b11730c2b6d99a58034a869dd810d7300a7b2` answers `slot0()` and `fee()` = 500,
and v4 has no per-pool contracts at all because pools live inside the singleton PoolManager, which
does exist on chain 196 at 24,009 bytes. **Therefore "attach Tinjau to an existing pool" is
impossible and must never be offered to anyone.** The only route to real liquidity is funding a new
v4 pool and attracting flow to it.

**(b) Mainnet is a stated participation requirement with no published deadline.** Verbatim from the
event page: *"During the Hackathon, the project must be deployed on the X Layer Testnet and
subsequently launched on the X Layer Mainnet."* It sits inside the block whose preamble says
failing any requirement makes a project *"ineligible to participate in the Hackathon or receive
prizes"*, and it carries **no date**. Whether it gates judging is **not determinable** from
published material. Do not assert either reading.

**(c) The production blocker for mainnet is a key, not money.** The assessor key is derived as
`keccak256(posterKey ‖ "tinjau.rolekey/1.0.0:assessor")` (`apps/server/src/chain/tinjauRoleKeys.ts`),
and that module's own header says a derived key shares the fate of its parent and is not acceptable
for production. On mainnet the poster must be online to relay, so one hot-wallet compromise hands
over signing authority; with `guardian == poster` it hands over the kill switch in the same breach.
**This is hours of work to clear, not dollars.** Clearing it is a precondition for taking mainnet
seriously.

**(d) The paired-pool `CONFIRMS` is a conformance test, not a discovery.** `D = 195.3812 bps`
against a realised fee differential of `195.0000 bps` is **100.195% of the mechanism's own
arithmetic ceiling**. Under a fixed trade list a higher fee necessarily leaves the LP holding more;
the pre-registration predicted this in advance. It establishes nothing about whether Tinjau acts at
the right *times*, assumes zero flow elasticity under a 40x fee difference, and exercised only 364 s
of the 3,600 s plateau so the figure is an upper bound. Its `PROTECT` trigger was **constructed**.

**(e) The frozen scenario set is close to a census, not a curated sample.** A pre-registered
selection rule found that inside the only window where the pool's market leg is measurable, NVIDIA
filed **four documents in total** and the existing scenarios already used two. Scenario B carries
the only MATERIAL 8-K NVIDIA filed in twelve months. So "no canonical replay reaches `PROTECT`"
**cannot** be explained by cherry-picking. It equally does **not** show the thresholds are right:
with no ground truth about which events should have moved the price, the question is open.

**(f) The covered universe is one asset.** `SUPPORTED_ASSETS` in `apps/server/src/evidence/assets.ts`
contains only `wNVDAx` (supported) and `NVDAx` (unsupported, no pool). **There is no MSTR-linked
asset at all**, despite `config/tickers.ts` tracking ten tickers and the parse study being half
MSTR. `resolveAsset` returns `UNSUPPORTED_ASSET` for all of them, so they cannot produce a risk
state. Some documents imply broader coverage than the code has.

**(g) The public RPC's read lag is not a footnote; it corrupted an experiment.** Convergence was
observed within **2,519–2,746 ms** across eight testnet writes, all converging on exactly the third
attempt. **Those are upper bounds, not lags** — the measuring harness polled on a fixed 1,000 ms
interval. The paired-pool experiment's first run produced a spectacular false `CONFIRMS` at
**49,804 bps** because an "after" balance was served by a node that had not seen the burn. Any new
chain-reading work must pin reads to a block number or follow events.

**(h) Two latent defects were found and deliberately not fixed.** Both are candidate tasks here:
- `apps/server/src/evidence/graph.ts` derives an unrecognised publisher's origin from
  `sourceId.split("/")[0]`, so **the independent-origin count depends on a string shape the intake
  adapter chooses**. A different adapter could make one registrant filing ten times count as ten
  independent sources, which is the dangerous direction for the invariant the promotion path leans
  on.
- `explainWatch()` in `apps/server/src/risk/promote.ts` tests `independentSources < 2` before the
  confirmation status without regard to source class, so an `OFFICIAL` record's prose names a gate
  that is not operative on that path. State, authorisation and reason codes are all correct; only
  the explanation is wrong. Fixing it changes scenarios A and C's prose too.

**(i) Judging surface is unknown.** Whether judges read a frozen submission or the live repository
is not determinable from published material; the submission form is links-only with no commit hash
or version field. See `../05-build/s0-1-judging-timeline-note.md`. Plan for both: keep
`submission-final` meaningful, and keep `POST-SUBMISSION.md` honest.

### 0.7 Baseline verification commands

Run these before and after any change. All passed on 2026-08-22.

```bash
# server: expect 594 pass, 0 fail (590 without contracts/out, 583 without Foundry — all three
# are correct and each prints a named notice explaining itself)
cd apps/server && npm install && npm test

# web: expect 32 pass, 0 fail
cd apps/web && npm install && npm run test:contract

# contracts: expect 145 pass, 0 fail, no setup step, no forge install
cd contracts && forge test

# demo manifest: expect "byte-identical" and sha256 be884920d860b0f4c92180670f52ae54400f4e5d77e25d95ae111b7221ee7196
node demo/tinjau-demo.mjs check

# published artifacts
node docs/buildx-orion-2026/outputs/05-build/frontend-handoff/tools/validate.mjs

# on-chain read, no credentials needed
node tools/risk-reader/tinjau-risk-read.mjs \
  --rpc-url https://testrpc.xlayer.tech --chain-id 1952 \
  --registry 0x60062389a7AB08F0030FC06Adf9CE0C180537317 \
  --asset    0xf07A9D89848bc694c7154Fda4cce707Eb409F903 \
  --pool-id  0x5e9eff19074225e9132eb73dc25cf0e3ff55c3fb31c9b28ab633851d2b54f730
```

### 0.8 Hard boundaries — stop and ask Dien at the moment of the action

No task here authorizes, on its own: real-money spend; **any mainnet transaction**; creating
accounts or credentials; **contacting any external person or organization**, including the event
organizer; publishing to npm or any package registry; posting to social media or third-party
forums; or submitting anything to the event organizer.

Specifically prepared-but-not-executed, and still requiring Dien: publishing the integration kit to
npm, filing the RPC note with X Layer, any outreach contact from the outreach kit, any mainnet
action, and connecting the X **Publisher** (outbound posting). The X **listener** is read-only and
was authorized; the publisher was not.

### 0.9 Starting protocol

1. Read all of §0. Run every §0.7 command and record the results before changing anything.
2. Read the previous tracker's Evidence fields for anything adjacent to your task.
3. `git status`; preserve pre-existing changes and untracked files.
4. **Confirm the specific task with Dien before starting it.** Nothing here is pre-approved.
5. Write a short plan naming files, tests and external actions before editing.
6. Evidence means command output, chain data, or published artifacts — never code existence.
   Record it in the task's `Evidence` field, dated.
7. A task is `[x]` only when its acceptance line is independently checkable by re-running the
   commands it names, and the §0.7 baseline still passes.
8. Add a dated line to `POST-SUBMISSION.md` for every judge-visible change.

---

## 1. Execution rules

- `[ ]` not started · `[~]` in progress · `[x]` verified complete · `[!]` blocked (record blocker
  and fallback)
- **P0** — protects what already exists, or unblocks everything else.
- **P1** — moves a criterion with work achievable without a §0.8 crossing.
- **P2** — needs Dien, money, an external party, or mainnet. The agent prepares; Dien executes.
- One primary task in progress at a time. The claim gate wins every conflict.

---

## 2. Where the project actually stands

Scores are from the independent evaluation of 2026-08-21 (evaluator's own 0–10 scale; the organizer
publishes no rubric). The right-hand column is what is true **after** the sprint, and is the honest
starting point for this tracker.

| Criterion | Scored | What moved on 2026-08-21 | What is still missing |
|---|---|---|---|
| Integration with X Layer | 8 | nothing structural | mainnet, blocked on §0.6(c); the hook cannot join existing liquidity, §0.6(a) |
| Innovation | 7 | novelty claim now has a 40-query survey behind it | a live, non-simulated event decided end to end |
| Product completeness | 7 | contracts build from a bare clone; live EDGAR intake works | live NEWS-class intake; event classification |
| Application of AI | 6 | bonded bit computed live and posted on chain; model vs heuristics published | the model deciding something that changes an outcome |
| Ecosystem contribution | 6 | integration kit, standalone RPC note | a third party actually consuming any of it |
| Growth potential | 4 | outreach kit prepared | one external party expressing concrete intent |
| User value | 3 | paired-pool conformance test | a real event, on a real pool, with a real outcome |

**Under the Liquidity Grant's four-part wording** (product quality, innovation, user value,
ecosystem contribution), user value and ecosystem carry 2 of 4 weights rather than 2 of 7. Phases
S9 and S11 are therefore the highest-leverage work in this document.

---

## 3. Task list

### Phase S8 — Repair what is known to be wrong (P0)

These are defects the project already knows about and has published. Leaving a known defect
unfixed while adding features is the worst available trade.

- [ ] **S8.1 — Make the independent-origin count independent of the intake adapter**
  Depends on: none. Owner: agent. Criterion: product completeness, and the safety story.
  Context: §0.6(h). `graph.ts` derives an unrecognised publisher's origin from
  `sourceId.split("/")[0]`. The count that gates `PROTECT` therefore depends on a string shape each
  adapter picks. The live EDGAR run collapsed 10 filings to 1 origin **only because** its adapter
  chose an origin-leading `sourceId`; EDGAR's own per-entry URN would have produced ten.
  Work: give origin derivation an explicit, adapter-independent basis. Do not weaken the invariant
  to make the problem go away. Add a test that a set of claims from one registrant collapses to one
  origin **regardless of `sourceId` shape**, and a test pinning the current frozen-scenario
  behaviour so this change cannot silently alter A, B, C or D.
  Acceptance: `apps/server` tests pass at 594 or higher with the new tests; the four frozen
  scenarios produce byte-identical decisions before and after (prove it, do not assert it);
  `node demo/tinjau-demo.mjs check` still byte-identical.
  Evidence: —

- [ ] **S8.2 — Fix the `explainWatch()` prose gate**
  Depends on: none. Owner: agent. Criterion: product completeness.
  Context: §0.6(h). An `OFFICIAL` record's explanation names a two-origin gate that is not
  operative on the official path. State and reason codes are correct; only the sentence is wrong.
  Work: make the explanation branch on source class. This will change scenarios A and C's prose,
  which is expected and must be shown in the diff rather than avoided.
  Acceptance: an `OFFICIAL` record's explanation no longer cites a gate `mayReachProtect` does not
  apply to it; scenario A and C explanations reviewed and correct; tests pass.
  Evidence: —

- [ ] **S8.3 — Make the documented asset universe match the code**
  Depends on: none. Owner: agent. Criterion: product completeness, honesty.
  Context: §0.6(f). Documents imply broader coverage than `SUPPORTED_ASSETS` has. Either the docs
  are corrected to say "one asset, NVDA/wNVDAx", or a second asset is genuinely supported.
  **Correcting the docs is the honest default**; adding an asset is a real piece of work and must
  not be faked by adding a row without a verified pool.
  Acceptance: no document claims coverage the code does not have; if an asset was added, it
  resolves and has a verified pool address.
  Evidence: —

### Phase S9 — User value: the criterion scored lowest, and the honest path is long (P1/P2; 3 -> ?)

Read §0.6(a), (d) and (e) before proposing anything here. The three easy-looking routes are all
closed: the hook cannot join existing liquidity, the paired-pool result is a conformance test by
construction, and there is no wider event population to search on this asset.

- [ ] **S9.1 — Decide, with Dien, what user value can honestly be demonstrated at all**
  Depends on: none, and everything else in S9 depends on this. Owner: agent drafts, **Dien decides**.
  Work: this is a scoping decision, not an experiment. Lay out the three candidate routes with
  their real cost and what each would and would not license:
  (a) **a real event on a real pool** — needs a funded v4 pool on mainnet with genuine third-party
  flow, i.e. §0.6(a) plus §0.6(b) plus §0.6(c). Highest value, highest cost, gated on a security
  review;
  (b) **a wider asset universe on testnet** — more assets means more events, which is the only way
  the census problem in §0.6(e) dissolves. Medium cost, and it still runs on builder-controlled
  liquidity, so it can never license a loss claim;
  (c) **accept that user value stays low and say so precisely** — publish a clear statement of what
  would have to be true to demonstrate it, and stop implying it is around the corner.
  Route (c) is a legitimate outcome and must be presented as such, not as a failure.
  Acceptance: a dated decision memo; Dien has chosen a route; the choice is recorded here.
  Evidence: —

- [ ] **S9.2 — Widen the asset universe so events exist to measure** (conditional on S9.1 = b)
  Depends on: S9.1, S8.3. Owner: agent.
  Work: add genuinely supported assets with verified pools, then re-run the S3.3 selection rule
  over the widened universe. **Pre-register the widened rule before touching market data**, exactly
  as S3.3 did: write and commit the rule, then apply it. The point is to find whether any canonical
  event reaches `PROTECT` when there is a real population to draw from.
  Acceptance: selection rule committed before any market data is read; every outcome published
  including "still none"; no threshold changed in response to any result.
  Evidence: —

- [ ] **S9.3 — Exercise the decay curve, not just the plateau** (P1)
  Depends on: S9.1. Owner: agent.
  Context: §0.6(d). The paired-pool run exercised 364 s of a 3,600 s plateau, so its figure is an
  upper bound and the decay curve, which is most of a real episode, contributed nothing.
  Work: re-run the frozen paired-pool method over a window that spans widen, decay and recovery.
  **Do not re-tune anything**; this is the same experiment over a longer window. Publish the
  resulting profile and state plainly that it remains a conformance test with a constructed
  trigger.
  Acceptance: a full-episode profile published; the write-up repeats §0.6(d)'s caveats rather than
  dropping them now that a nicer number exists.
  Evidence: —

### Phase S10 — Application of AI: make the model decide something that matters (P1; 6 -> ?)

- [ ] **S10.1 — Classify event type and materiality from the filing, live**
  Depends on: none. Owner: agent. Criterion: application of AI, product completeness.
  Context: the live EDGAR run left `eventType` and `materiality` as `UNKNOWN`, so a filing whose own
  SEC summary reads "Item 1.01: Entry into a Material Definitive Agreement" still resolved to
  `NON_MATERIAL_EVENT`. This is the single clearest place where the model would change an outcome
  rather than annotate one.
  Work: extend the parse path to classify event type and materiality, with the same three-way
  agreement gating the bonded path already uses. Publish raw per-call outputs in the `p2_1` format.
  **The deterministic engine keeps deciding**; the model supplies a field, and a disagreement
  between passes must fail closed to `UNKNOWN`, never to "material".
  Acceptance: a published artifact with three raw parses and the agreement; a live filing resolving
  with a computed materiality; a test that split parses fail closed.
  Evidence: —

- [ ] **S10.2 — Resolve the item-2.02 materiality question, in the open**
  Depends on: S10.1. Owner: agent drafts, Dien approves.
  Context: S3.3 classified item 2.02 (earnings) as `NON_MATERIAL` following the engine's literal
  wording. That was frozen before enumeration and is strictly conservative, but it is contestable:
  2.02 is the most reliably price-moving 8-K item there is.
  Work: decide the classification deliberately and publish the reasoning either way. **Do not
  change it as a result of any run that has already happened** — that would be selecting a
  threshold after seeing results. If it changes, re-run affected analyses and say what moved.
  Acceptance: a dated decision with reasoning; if changed, every affected published figure re-run
  and re-published.
  Evidence: —

### Phase S11 — Ecosystem and growth: the only route is a real third party (P2; 6 and 4 -> ?)

Everything here needs Dien, because contact is a §0.8 boundary.

- [ ] **S11.1 — Publish the RPC read-consistency note where X Layer builders will find it**
  Depends on: none. Owner: **Dien executes**; agent may only prepare.
  Context: the note at `../05-build/s6-2-xlayer-rpc-read-consistency.md` is written, self-contained,
  and has a runnable reproduction script. It is the one artifact of clear value to an unrelated X
  Layer developer. Filing it is organizer or community contact.
  Acceptance: filed somewhere X Layer builders read; the venue and date recorded here.
  Evidence: —

- [ ] **S11.2 — Publish the integration kit as a consumable package** (P2)
  Depends on: S8.1 (do not publish an origin-count defect). Owner: agent prepares; **npm publish is
  Dien's**.
  Acceptance: a stranger on a clean machine reaches a correct read following only the published
  package; the "not adoption" honesty is preserved in the package README.
  Evidence: —

- [ ] **S11.3 — Use the outreach kit** (P2)
  Depends on: S9.1 (so the pitch matches what is actually true). Owner: **Dien only**.
  Context: `../05-build/s6-3-outreach-kit.md` is written and gated behind a paired-pool slot that is
  now fillable. Its pool-operator section correctly refuses the "attach to your pool" pitch.
  Acceptance: any expression of interest recorded as evidence **with the counterpart's consent**;
  no claim beyond the claim gate made in any conversation.
  Evidence: —

### Phase S12 — X Layer integration and mainnet (P2, human-gated; 8 -> ?)

- [ ] **S12.1 — Clear the derived-assessor-key blocker**
  Depends on: none. Owner: agent implements, Dien holds the keys.
  Context: §0.6(c). This is the precondition for taking mainnet seriously, and it is hours of work.
  Work: generate an independent assessor key, separate the guardian from the poster, and document
  the rotation path. **Key generation and custody are Dien's**; the agent changes the code paths and
  the documentation.
  Acceptance: no derived role key on any production path; guardian and poster are distinct;
  `known-limitations.md` updated to say what is now true.
  Evidence: —

- [ ] **S12.2 — Ask the organizer what "subsequently" means** (P2)
  Depends on: none. Owner: **Dien only** (§0.8: organizer contact).
  Context: §0.6(b). One message, no cost, and it is the single input that would change the mainnet
  recommendation in either direction.
  Acceptance: the answer, or the absence of one, recorded here with its date.
  Evidence: —

- [ ] **S12.3 — Mainnet deployment decision** (P2)
  Depends on: S12.1, S12.2, and a security review. Owner: **Dien decides**.
  Context: `../05-build/s7-1-mainnet-readiness-memo.md` recommends not launching until the key is
  clear and the contracts are reviewed. That recommendation stands until those change.
  Acceptance: a dated decision either way; if deploying, the memo's cost and risk sections are
  re-verified first because they will have aged.
  Evidence: —

### Phase S13 — Keep the record honest (P0, continuous)

- [ ] **S13.1 — Maintain `POST-SUBMISSION.md`**
  Owner: agent, every commit. One dated line per judge-visible change, favourable or not.
  Acceptance: no judge-visible post-deadline commit is missing a line.
  Evidence: —

- [ ] **S13.2 — Re-verify the claims that have aged**
  Owner: agent, periodically.
  Context: several published figures are dated observations that may drift: the RPC convergence
  numbers (§0.6(g)), the live pool depth cited in the mainnet memo, the competitor survey's
  "not found", and every "verified live on 2026-08-21" line.
  Work: re-run and re-date, or mark stale. **Do not quietly leave a dated claim implying it is
  current.**
  Acceptance: every published live-verified figure either re-verified with a new date, or marked
  as an observation from its original date.
  Evidence: —

---

## 4. Dependency spine

```text
S8.1 ──> S11.2                      (do not ship a known origin-count defect)
S8.3 ──> S9.2

S9.1 ──> S9.2, S9.3, S11.3          (decide what is demonstrable before demonstrating)
S10.1 ──> S10.2

S12.1 ──┐
S12.2 ──┴> S12.3                    (key cleared and question asked, before any mainnet call)

S13.1, S13.2 run continuously alongside everything
```

## 5. Acceptance matrix: task -> criterion

| Task | Criterion served | Nature |
|---|---|---|
| S8.1, S8.2, S8.3 | product completeness, and the safety story | repairs known, published defects |
| S9.1 | user value | decides whether the criterion is reachable at all |
| S9.2, S9.3 | user value, innovation | the only honest routes left after §0.6 |
| S10.1 | application of AI, product completeness | the model changing an outcome, not annotating one |
| S10.2 | application of AI | resolves a contestable gate in the open |
| S11.1, S11.2 | ecosystem contribution | makes the artifacts genuinely consumable |
| S11.3 | growth potential | the only path to demand evidence |
| S12.1 | integration with X Layer | unblocks everything mainnet |
| S12.2, S12.3 | integration with X Layer | the human decisions |
| S13.1, S13.2 | all of them | keeps the record trustworthy, which is the asset |

## 6. Deviations and blockers log

| Date | Task | Deviation/blocker | Resolution |
|---|---|---|---|
| — | — | — | — |

## 7. Open questions for Dien

| # | Question | Blocks | Status |
|---|---|---|---|
| Q1 | Buy X API read credits? The listener is built and read-only; X returns HTTP 402 credits-depleted, so no live social claim can enter the pipeline until then. | S5.1 from the previous tracker, permanently `[!]` otherwise | open |
| Q2 | Ask the organizer what "subsequently" means for the mainnet clause? | S12.2, S12.3 | open |
| Q3 | Which user-value route (§S9.1 a, b, or c)? | all of S9 | open |
| Q4 | Is a paid security review in scope at all? It gates any serious mainnet plan. | S12.3 | open |
