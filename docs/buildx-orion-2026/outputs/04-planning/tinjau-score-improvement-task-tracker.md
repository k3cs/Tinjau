# Tinjau — Judge-Score Improvement Task Tracker

Stage 4+ planning artifact for workspace `buildx-orion-2026`.

- Status: **ready — Dien handing this tracker to an executing agent constitutes approval of the
  P0 sprint (S1.1–S1.3) and the S0 bookkeeping; every other task additionally needs the
  named per-task confirmations, and every §0.8 boundary crossing needs Dien at the moment of
  the action**
- Created: 2026-08-21 23:06 WIB (16:06 UTC) — **about 8 hours BEFORE the submission deadline**
- Source of every gap in this tracker: the independent evaluation run on 2026-08-21 against
  `../07-submission/EVALUATE-TINJAU.txt` (its findings are reproduced in full in §0.4, so this
  document does not depend on access to that session)
- Sibling tracker: `tinjau-lp-risk-autopilot-task-tracker.md` (the MVP build tracker; historical
  evidence, not a source of open work for this tracker)
- Scope: raise the submission's standing on the seven judging criteria **without breaking the
  project's claim discipline**, which the evaluation identified as its strongest asset

## 0. Mandatory context for an agent with no prior knowledge of this project

Read this entire section before planning or changing anything. Everything an executing agent
needs is restated here; the sibling tracker's §0 is the deeper reference but is not required
reading to start.

### 0.1 Mission and authority

The mission is to execute improvements that an independent evaluation said would move each
criterion's score, plus fix the three defects that evaluation found, while preserving the one
property the evaluation scored highest: every public claim is verifiable and every limitation is
disclosed on the surface where the corresponding claim appears.

Authority order when documents differ:

1. the current instruction from Dien (the human owner) and this tracker's integrity rules (§0.3);
2. this tracker for scope, order, and acceptance evidence;
3. `tinjau-lp-risk-autopilot-task-tracker.md` §0 for product behavior, invariants, and claim
   boundaries (its §0.7 invariants and §0.19 claim boundary apply verbatim to all work here);
4. the deployed contracts and published artifacts as ground truth about what exists.

If improving a score would require weakening a disclosure, overwriting historical evidence, or
making a claim the data does not support, the score does not get improved. Record the conflict
and stop.

### 0.2 What Tinjau is, in enough detail to not misread it

Tinjau protects liquidity providers (LPs) in pools of tokenized US equities on X Layer (an
EVM-compatible chain by OKX; testnet chain id 1952, RPC `https://testrpc.xlayer.tech`). The
problem: tokenized stocks trade on-chain 24/7, but the US reference market closes and SEC
filings arrive at arbitrary times, so a trader who has read a disclosure can trade against a
pool's stale quote; the loss lands on LPs.

The pipeline, in order:

```text
ingest claim (SEC filing / news / social post)
-> normalize with provenance (OFFICIAL | NEWS | RUMOR, publisher, timestamp, URL, content hash)
-> evidence graph (entity resolution, syndication dedup, contradiction marks, official confirmation)
-> deterministic promotion rules -> risk state NORMAL | WATCH | PROTECT
-> independent market confirmation (pool price, basis, drawdown, velocity, exit depth, freshness, anti-wick)
-> signed record written to TinjauRiskRegistry on X Layer Testnet
-> Uniswap v4 hook (TinjauFeeHook) reads the record and charges a bounded fee per swap
```

Non-negotiable invariants (enforced in code and tests, not advisory):

- rumor-only evidence can never exceed `WATCH`; one news source alone cannot authorize `PROTECT`;
- syndicated copies of one origin count as one source;
- stale/missing market data cannot create a new `PROTECT` but also cannot cancel a running one;
- `PROTECT` is bounded: baseFee 500 pips, maxFee 20 000 pips, 3 600 s widen, 18 000 s decay,
  21 600 s hard cap, 3 600 s cooldown; expiry is applied at read time (no keeper);
- the AI model may never set a fee, pick a runtime threshold, authorize an action, or touch
  chain state; the contract can reject any proposal.

The AI layer is Gemini Flash via the Vercel AI SDK (`apps/server/src/llm/`): three independent
structured parses per filing (`parseFiling.ts`) with per-field agreement gating
(`src/diff/agreement.ts`).

### 0.3 The deadline reality and the integrity rules that follow from it

Facts, verifiable on chain and in the event terms:

- The hackathon submission deadline is **2026-08-21 23:59 UTC**, which is
  **2026-08-22 06:59 WIB**. At this tracker's creation (23:06 WIB / 16:06 UTC) roughly
  **8 hours remain**. Anything that lands on `main` and on the live site before that instant is
  part of the submitted, in-hackathon state and needs no special labeling.
- Eligibility is already secured and cannot be lost by later work: `TinjauRiskRegistry` and
  `TinjauFeeHook` deployment transactions landed in block **38 824 844**, timestamp
  **2026-08-21 03:41:21 UTC**, before the deadline.
- It is **unknown** whether judges consider repository or website changes made after the
  deadline, and unknown when judging happens. Task S0.1 resolves this for the post-deadline
  phase only; it must not delay the pre-deadline sprint.

Consequences for execution order:

- **Pre-deadline sprint (now → 23:59 UTC):** execute the P0 defect fixes S1.1 → S1.2 → S1.3 in
  that order, committing and (for S1.2's web copy) deploying each as it completes, so each one
  independently makes the deadline. Do not start a task in this window that cannot be finished
  and verified inside it; a half-landed change is worse than none. S2.1 is an explicit stretch
  goal: attempt it only if S1.1–S1.3 are done, the `GEMINI_API_KEY` and funded assessor key are
  confirmed available, and at least 3 hours remain.
- **At the deadline:** tag the last commit that made it (`submission-final`), record the exact
  commit hash and the deployed site state in the Evidence field of S0.2, and only then continue
  with post-deadline work.

Integrity rules, absolute for every task in this tracker:

1. **Never backdate anything.** No commit date manipulation, no editing of dated documents to
   make post-deadline work appear pre-deadline, no rewriting of historical evidence files.
2. **After the deadline passes, label post-deadline additions as post-deadline** wherever a
   judge could otherwise assume they were part of the submitted state. A dated
   "post-submission" changelog section is the preferred mechanism. Work landing before the
   deadline is exempt: it is simply part of the submission.
3. **The submitted state must remain reconstructible.** The submitted state is whatever `main`
   holds at 2026-08-21 23:59 UTC (the tracker was created at commit `7e2a6b1`; the final
   pre-deadline commit may be later). S0.2 pins it with a tag at deadline time.
4. If S0.1 finds that post-deadline changes cannot influence hackathon judging, the remaining
   P1 tasks still hold value for the **AI-RWA Liquidity Grant** (same track, judged on
   "overall performance during the Hackathon, including product quality, innovation, user value,
   and contribution to the ecosystem") and for the project's life after the event — but re-rank
   priorities accordingly and record the decision in §5.

### 0.4 The independent evaluation this tracker answers

Run on 2026-08-21 against the public repo (fresh clone at `7e2a6b1`), the public testnet RPC,
and the live site. Scale 0–10, evaluator's own (the organizer publishes no rubric). Equal
weighting. Scores and the evaluator's stated way to move each score:

| Criterion | Score | What would move it, verbatim |
|---|---|---|
| Integration with X Layer | 8/10 | "mainnet deployment, or a hook attached to real X Layer liquidity" |
| Innovation | 7/10 | "the provenance gate deciding correctly on a live, non-simulated event rather than a frozen fixture" |
| Product completeness | 7/10 | "live news/social intake wired in, and a contracts package that builds from a bare public clone" |
| Application of AI | 6/10 | "one scenario where the live three-way parse produces the bonded-evidence result that lands in the on-chain record" |
| Ecosystem contribution | 6/10 | "any third party citing or consuming the registry, reader, or measurement" |
| Growth potential | 4/10 | "a single external LP, pool operator, or protocol expressing concrete intent to attach the hook or read the registry" |
| User value | 3/10 | "one interval where a protected pool demonstrably retains more than an identical unprotected pool through the same real event" |

Mean 5.9/10. The evaluation's summary judgment: *"strong on 'is it real and honest'
(integration, completeness, innovation), weak on 'does it matter yet' (user value, growth)."*

The three defects it found (all confirmed with evidence; these are S1 tasks):

1. **`cd contracts && forge test` fails on a bare public clone.** `contracts/lib/` is gitignored
   and no dependency revisions are pinned anywhere public; installing current upstream
   `Uniswap/v4-core` does not compile against the sources. The evaluator could only reproduce
   the 137/137 pass using the builder's local checkout (`forge-std` local copy, `v4-core` at
   revision `46c6834`). The submitted evaluation prompt (`../07-submission/EVALUATE-TINJAU.txt`
   §7) tells judges to run this exact failing command.
2. **`BONDED_EVIDENCE_PASSED` reads as a computed check but was an assumed input.** In the four
   frozen scenarios, `apps/server/src/decision/scenarioRunner.ts:44–50` takes
   `officialEvidencePassed` as an input defaulting to `true` ("Still an INPUT rather than a
   computation"). The on-chain record's reason bit 18, the reader tool's explanation text, and
   the demo copy ("Official and bonded evidence conditions pass") all present it as a passed
   check. The assumption is disclosed only in
   `../05-build/frontend-handoff/known-limitations.md:256` and the code comment — not on the
   surfaces where the bit is displayed. The evaluation called this "the one place the project
   falls short of its own disclosure bar."
3. **Model id drift.** `apps/server/src/llm/provider.ts` defaults to `gemini-3.6-flash`, while
   the published parse study rows (`../05-build/data/p2_1_parse_accuracy_raw.jsonl`) record five
   other Flash ids across 30 rows. No single pinned model for the published parses.

Claims the evaluation could **not** verify (each is a candidate task to convert into a verified
claim or an honest correction):

- the novelty claim ("combination not found in public competitors") — no survey was performed;
- the RPC convergence-lag numbers (2 519–2 746 ms) — verified as published raw observations
  only, not independently re-measured;
- the 32-filing markout figures — raw data and method exist, numbers not re-derived;
- the authenticity of the ten third-party mainnet pools measured;
- fixture fidelity (content hashes not compared to origin copies; on-chain evidence commitment
  not recomputed).

### 0.5 Claim discipline (the asset every task must protect)

The project's published positions that must survive all work here, verbatim from its own claim
gate:

- `canClaimLossAvoided` is `false`. The pre-registered benchmark condition failed. Prohibited
  sentences include "Tinjau reduces LP loss", "Tinjau avoided X dollars of loss", "Tinjau
  outperformed the baselines economically".
- The four frozen scenarios resolve A=WATCH, B=WATCH, C=WATCH, D=NORMAL. The demonstrated
  PROTECT uses a CONSTRUCTED price path on a builder-controlled pool; the canonical replay of
  the same event resolves to WATCH. The rumor input is SIMULATED. Both deployed pools hold
  builder-controlled mock liquidity.
- The reference consumer was built by Tinjau and is not evidence of adoption.

A task that produces a new positive result may relax a prohibited sentence **only** by the same
mechanism that created it: a pre-registered condition, published raw data, and the flag flipping
in the published artifact — never by editing copy first. Selecting events, thresholds, or
scenarios after seeing results is forbidden everywhere in this tracker.

### 0.6 Ground truth: deployed contracts and repository map

X Layer Testnet (chain id 1952), current production envelope — all verified live on 2026-08-21:

| Component | Address |
|---|---|
| `TinjauRiskRegistry` | `0x60062389a7AB08F0030FC06Adf9CE0C180537317` |
| `TinjauFeeHook` (v4, beforeSwap flag `0x080`) | `0x1092C9fe2dB084F26aa415A0fda14B001A786080` |
| `PoolManager` (Uniswap v4) | `0x8F862A8b6f00C99b0610dc764228C661c4909ae1` |
| Swap router | `0xe5823a180BFAcbC24Aa9a744B76f3Dfb8bbECDA9` |
| Liquidity router | `0x1324A9A175779D53c65F9A43493CEa302cd54587` |
| mock wNVDAx (no value) | `0xf07A9D89848bc694c7154Fda4cce707Eb409F903` |
| mock USDG (no value) | `0x666e81CCb9D4d6c2e7A3ed9f317E3dFBa2410e99` |

Repository (public: `https://github.com/k3cs/Tinjau`; site: `https://tinjau.xyz`):

| Path | Role |
|---|---|
| `contracts/` | Solidity: registry, hook, policy, types, 137 Foundry tests incl. fuzz invariants |
| `apps/server/` | pipeline, LLM layer, decision engine, market confirmation, benchmark; 594 tests |
| `apps/web/` | the website; 30 tests incl. a claim-gate test scanning source for unsupported claims |
| `tools/risk-reader/` | zero-npm-dependency on-chain reader with hand-transcribed ABI |
| `demo/` | three-scene demo driver; `node demo/tinjau-demo.mjs check` re-derives the manifest |
| `docs/buildx-orion-2026/outputs/` | all planning/build/submission evidence, incl. raw study data |

### 0.7 Baseline verification commands (run these before and after any change)

All of the following passed on 2026-08-21 at commit `7e2a6b1`:

```bash
# server: expect 594 pass, 0 fail
cd apps/server && npm install && npm test

# web: expect 30 pass, 0 fail
cd apps/web && npm install && npm run test:contract

# contracts: expect 137 pass — CURRENTLY FAILS ON A FRESH CLONE (S1.1); passes only with
# the correct lib/ revisions (forge-std + v4-core @ 46c6834) present in contracts/lib/
cd contracts && forge test

# demo manifest: expect "byte-identical", sha256 be884920d860b0f4c92180670f52ae54400f4e5d77e25d95ae111b7221ee7196
node demo/tinjau-demo.mjs check

# data artifacts: expect "all frontend-handoff artifacts validate"
node docs/buildx-orion-2026/outputs/05-build/frontend-handoff/tools/validate.mjs

# on-chain read (no server needed): expect the §0.2 fee envelope and an expired PROTECT
# reading back as effective NORMAL at 500 pips
node tools/risk-reader/tinjau-risk-read.mjs \
  --rpc-url https://testrpc.xlayer.tech --chain-id 1952 \
  --registry 0x60062389a7AB08F0030FC06Adf9CE0C180537317 \
  --asset    0xf07A9D89848bc694c7154Fda4cce707Eb409F903 \
  --pool-id  0x5e9eff19074225e9132eb73dc25cf0e3ff55c3fb31c9b28ab633851d2b54f730
```

### 0.8 Hard boundaries

No task in this tracker authorizes, on its own: real-money spend; mainnet transactions;
creating accounts or credentials; contacting external people or organizations; publishing to
package registries, social media, or third-party forums; changing the submitted evaluation
prompt after it has been sent to anyone; or submitting anything to the event organizer. Each of
those requires Dien's explicit go-ahead at the moment of the action, and the tasks that need
one say so in their `Work` line. Secrets (RPC keys, `GEMINI_API_KEY`, wallet keys) must never
enter documents, fixtures, logs, or commits.

### 0.9 Starting protocol and definition of done

1. Read §0 fully. Run every §0.7 baseline command and record the results before changing anything.
2. Inspect `git status`; preserve pre-existing changes and untracked files.
3. The pre-deadline sprint (S1.1 → S1.2 → S1.3) is pre-approved by the handoff of this tracker —
   start it immediately after step 1, without waiting for further confirmation. All other tasks:
   confirm with Dien first. One primary task in progress at a time.
4. For each task, write a short plan naming files, tests, and external actions before editing.
5. Evidence means command output, chain data, or published artifacts — never code existence.
   Record it in the task's `Evidence` field with dates.
6. A task is `[x]` only when its acceptance line is independently checkable by re-running the
   commands it names, and the §0.7 baseline still passes.
7. Anything requiring a §0.8 boundary crossing: stop, present the exact action to Dien, wait.

## 1. Execution rules

- `[ ]` not started · `[~]` in progress · `[x]` verified complete · `[!]` blocked (record blocker
  and fallback)
- **P0** — defends the already-earned scores: fixes defects a judge would find, or resolves the
  timeline question that ranks everything else. Do these first, in order.
- **P1** — moves a score with work that is achievable without §0.8 boundary crossings.
- **P2** — moves a score but requires human action, external parties, or mainnet; the agent
  prepares, Dien executes.

The claim gate (§0.5) applies to every task. When a task and the claim gate conflict, the claim
gate wins.

## 2. Task list

### Phase S0 — Timeline and submission-state bookkeeping (P0, but never ahead of the sprint)

- [ ] **S0.1 — Establish whether post-deadline work can influence judging**
  Depends on: none, but runs AFTER the §0.3 pre-deadline sprint (S1.1–S1.3), never instead of it.
  Owner: agent research + Dien confirms interpretation.
  Work: from the event's published terms and announcements (the terms text used at submission is
  quoted in `../07-submission/`), determine: (a) when judging occurs; (b) whether judges are
  directed at a frozen submission artifact or at the live repo/site; (c) the Liquidity Grant's
  evaluation window. Do not contact the organizer without Dien. Record findings with quotations
  and URLs. If the answer is "unknowable from public material", say exactly that and present
  Dien the ranking decision of §0.3 rule 4.
  Acceptance: a dated note exists stating what is known, what is assumed, and how the
  post-deadline priorities were re-ranked as a result; Dien has approved the ranking.
  Evidence: —

- [ ] **S0.2 — At the deadline, tag the submitted state; afterwards, keep a post-submission changelog**
  Depends on: the deadline instant (2026-08-21 23:59 UTC); do not tag earlier.
  Owner: agent.
  Work: when the deadline passes, tag the last pre-deadline commit on `main` as
  `submission-final` and record its hash. From the first post-deadline commit onward, maintain
  `POST-SUBMISSION.md` at repo root: one dated line per judge-visible change, plus the §0.3
  integrity rules in one paragraph. Link it from the README's top.
  Acceptance: the tag exists on the last commit whose push preceded 23:59 UTC; every later
  commit touching judge-facing surfaces appends a dated line to `POST-SUBMISSION.md`.
  Evidence: —

### Phase S1 — Fix the three audit defects (P0; the pre-deadline sprint of §0.3)

These three run first, in order, right now — each landing before 23:59 UTC makes it part of the
submission itself.

- [x] **S1.1 — Make `contracts/` build and test from a bare public clone**
  Depends on: none (sprint task).
  Owner: agent.
  Work: pin the dependency revisions publicly. Preferred mechanism: commit `.gitmodules` with
  `forge-std` and `v4-core` as submodules at the exact revisions the 137-test pass uses
  (v4-core is at `46c6834` in the builder's checkout; record the forge-std revision the same
  way), or vendor `lib/` outright if submodules fight the repo layout. Update the root README's
  contracts section (it currently contains a stale paragraph describing contracts as a separate
  unpublished repository) and `contracts/README.md`. Do NOT change already-sent copies of the
  evaluation prompt; if a copy has not been sent yet, fix its §7 to match.
  Acceptance: in a fresh temp directory, `git clone <public-url> && cd Tinjau/contracts &&
  git submodule update --init --recursive` (or nothing extra, if vendored) followed by
  `forge test` yields 137 passed, 0 failed, with no reference to any local machine path.
  Evidence: **done 2026-08-21, commit `1c789e0`, pre-deadline.** Vendored, not submoduled.
  Submodules were attempted first and rejected on two findings: (a) the `forge-std` in the
  builder's `contracts/lib/` is a plain directory with no `.git`, so its commit is not
  recoverable from this machine and any submodule pin would have been fabricated (its own
  `package.json` reports `1.16.2`); (b) `v4-core@46c6834` pins `lib/solmate` at
  `4b47a19038b798b4a33d9749d25e570443520647`, while the tree that actually produces the
  137-test pass has solmate at `89365b880c4f3c786bdd453d4b8e8fe410344a69`. A submodule setup
  would therefore have reproduced the pinned-but-untested combination, which is the reported
  breakage restated. Committed tree is 3.2 MB, not 26 MB: nested `.git` directories (required,
  git will not track inside an embedded repo), `v4-core/docs`, `v4-core/test/js-scripts` and
  `.github` were removed; every upstream licence file is preserved. `forge test` re-run after
  the deletions: 137 passed, 0 failed, identical to before them. Provenance table (upstream
  URL, revision, licence per dependency) in `contracts/lib/VENDORED.md`.
  Fresh-clone verification, 2026-08-21 ~16:45 UTC, clone into an empty temp directory, no
  `forge install` and no `git submodule update` executed:
  `git clone <repo> && cd contracts && forge test` -> `Ran 7 test suites: 137 tests passed,
  0 failed, 0 skipped (137 total tests)`, no local machine path referenced.
  Stale README §8.3 (which described `contracts/` as a separate unpublished repository needing
  `forge install`) replaced with the actual zero-setup instructions; `contracts/README.md`
  gained a "Setup: there isn't one" section. Both evaluation prompts already instruct exactly
  `cd contracts && forge test`, so neither needed editing and no §0.8 crossing arose.

- [x] **S1.2 — Disclose the assumed bonded-evidence input on every surface that shows the bit**
  Depends on: none (sprint task; deploy the web change before the deadline)
  Owner: agent (web copy is in scope for this tracker; there is no frontend/backend owner split
  here unless Dien reinstates one).
  Work: wherever `BONDED_EVIDENCE_PASSED` (reason bit 18) is rendered or explained, add the
  qualifier that in the frozen scenarios this flag was an assumed input, not a live parse result,
  with a pointer to the limitation. Known surfaces: `apps/web/src/lib/risk/reason-codes.ts`
  (the bit's title/description), the demo mission copy in
  `apps/web/src/lib/demo/missions/confirmed.ts` ("Official and bonded evidence conditions
  pass"), the reader tool's explanation string in `tools/risk-reader/`, and the /proof
  capability table if it names the bonded path. Extend the existing web claim-gate test
  (`apps/web` test: "no source file makes a claim the evidence does not support") to assert the
  qualifier's presence next to the bit.
  Acceptance: grepping the built site copy and the reader output for the bit's display text
  shows the qualifier everywhere; web tests pass including the new assertion; if S2.1 later
  computes the flag for real, the qualifier is scoped to the scenarios where it was assumed.
  Evidence: **done 2026-08-21, commit `3d4c91a`, pre-deadline.** Surfaces changed:
  (1) `apps/web/src/lib/risk/reason-codes.ts` — `ReasonMeaning` gains an optional `caveat`
  field, set for `BONDED_EVIDENCE_PASSED`; its `plain` no longer says "The filing cleared the
  existing parse-agreement and bond/challenge checks", which asserted a check that did not run.
  (2) `apps/web/src/app/risk/_components/reason-ledger.tsx` — paints the caveat inline next to
  the code in the watch colour under the label "Assumed, not computed"; a caveat that exists in
  data but is never rendered discloses nothing.
  (3) `apps/web/src/app/risk/_components/state-header.tsx` — the header renders
  `record.humanExplanation` verbatim from the published artifact, and on the official scenarios
  that sentence says "passed the bonded-evidence checks". The correction is attached directly
  beneath it, conditional on the record carrying the bit.
  (4) `apps/web/src/lib/demo/missions/confirmed.ts` — the `known` field no longer reads
  "Official and bonded evidence conditions pass"; the stage output summary now names the
  assumed leg too.
  (5) `tools/risk-reader/abi/reason-bits.json` + `tinjau-risk-read.mjs` — bit 18 carries its own
  `caveat`, printed under the bit as `LIMIT OF THIS BIT:` with a new `wrap()` helper. The reader
  is a separate consumer with a hand-transcribed table, so it gets its own copy rather than an
  import.
  **Deliberately NOT changed: the published handoff artifacts**
  (`scenario-confirmed-protect.json`, `three-policy-comparison.json`). Their `humanExplanation`
  and `statusReason` strings feed the demo manifest sha256 that this project publishes as
  evidence (`demo/tinjau-demo.mjs:104`), and editing an evidence artifact to improve its
  wording is precisely what the disclosure discipline exists to prevent. The correction is
  attached at the render site instead. The manifest hash is unchanged after this task:
  `be884920d860b0f4c92180670f52ae54400f4e5d77e25d95ae111b7221ee7196`, which is itself the proof
  that no evidence artifact was touched.
  `/proof` was checked and does not name the bonded path, so it needed nothing.
  Acceptance evidence: `npm run build` then grep of the built output —
  `.next/server/app/risk/page.js` contains "assumed input, not a live parse result" (4
  occurrences). Live reader run against the public RPC prints the caveat under
  `[bit 18] BONDED_EVIDENCE_PASSED`. Web tests **32 pass, 0 fail** (was 30), including two new
  structural assertions ("the assumed bonded-evidence input is disclosed wherever the bit is
  shown", "the demo mission does not present the bonded condition as established"). They assert
  the disclosure's presence, not its exact wording, so the copy may improve but cannot silently
  vanish. The caveat text is scoped to "every published scenario", so S2.1 can narrow it by
  editing one string once a computed record exists.
  Full §0.7 baseline after the change: server 594/594, web 32/32, contracts 137/137, manifest
  byte-identical, all artifacts validate.

- [x] **S1.3 — Pin and document the LLM model id**
  Depends on: none (sprint task)
  Owner: agent.
  Work: reconcile `provider.ts`'s default (`gemini-3.6-flash`) with the five Flash ids recorded
  in `p2_1_parse_accuracy_raw.jsonl`. Pin one current model id as the default, document in the
  study doc why the published rows carry mixed ids (they are historical facts; do not edit the
  rows), and add a one-line note to `SERVICES.md` SVC-004.
  Acceptance: one default model id in code, an explanation in the study doc's post-results
  section dated per §0.3, raw rows untouched (`git diff` empty for the `.jsonl`).
  Evidence: **done 2026-08-21, commit `0c05d7e`, pre-deadline.** The drift was three-way, not
  two-way: `provider.ts:22` defaulted to `gemini-3.6-flash`, `apps/server/.env.example:16-17`
  still documented `gemini-2.5-flash` (deprecated, which `provider.ts`'s own comment records was
  confirmed by a live API call on 2026-08-17), and the 30 published rows carry five further ids
  in field `geminiModel` — `gemini-3.1-flash-lite` (10 rows), `gemini-3.5-flash-lite` (10),
  `gemini-flash-latest` (4), `gemini-3.5-flash` (3), `gemini-flash-lite-latest` (3), none of
  them the default.
  `gemini-3.6-flash` is pinned. Its value in `provider.ts` was NOT changed: it is already what
  `agent.ts` runs and what SVC-004 records, so the correct fix is to make the documentation and
  the study agree with the code. `.env.example` now documents the same id and states that
  leaving `GEMINI_MODEL` unset is the intended configuration; `provider.ts`'s comment names it
  as the pin and `GEMINI_MODEL` as an escape hatch rather than a second default; `SERVICES.md`
  SVC-004 gained one `- Pinned model id:` line (the temporary-provider note at line 98 is
  intact, as that line itself requires).
  `parse-accuracy-study.md` gained a dated appended subsection "Model id, pinned (added
  2026-08-21)" at the end, which cross-references the existing 2026-08-18 model-mix caveat
  rather than restating it, and states the consequence explicitly: **the published accuracy
  numbers do not measure the pinned model.** They measure a mixed Flash population over one
  day, and the study against `gemini-3.6-flash` alone has not been run. Two of the five ids are
  also not independent models (`gemini-flash-latest` is an alias whose quota error named
  `gemini-3.7-flash`).
  Raw rows untouched: `git diff -- docs/…/data/p2_1_parse_accuracy_raw.jsonl` is **empty**.
  No `.env` file was read or written, and no key material appears in any change.
  Full §0.7 baseline after the change: server 594/594, web 32/32, contracts 137/137, manifest
  byte-identical, all artifacts validate.

### Phase S2 — Application of AI: put the live model on the flagship path (P1; target 6→8)

- [ ] **S2.1 — Compute the bonded-evidence result live for scenario B and land it on chain**
  Depends on: S1.2, S1.3; requires `GEMINI_API_KEY` (already an approved service, SVC-004) and
  testnet gas from the existing funded assessor key (Dien confirms key availability). Stretch
  goal for the pre-deadline sprint under the §0.3 conditions (≥3 hours left, keys confirmed);
  otherwise a post-deadline task.
  Work: run the real three-way `parseFilingThreeWays` + `buildAgreementReport` path on scenario
  B's actual 8-K (accession `0001045810-26-000069`, primary document sha256 `1c480e33…928133`),
  publish the raw per-call outputs with model ids exactly like the p2_1 study format, compute
  `officialEvidencePassed` from the agreement result instead of assuming it, re-run the scenario
  through the unchanged decision engine, and post the resulting record to the registry as a new
  assessment (never overwriting history). The pre-registered outcome rule from the MVP tracker
  stands: B resolves `PROTECT` only conditional on fresh market confirmation, otherwise `WATCH`
  — the expected canonical result is therefore `WATCH`, and that is fine: the point is that the
  bit is computed, not what state results.
  Acceptance: a published artifact (same directory pattern as `p2_1_*`) contains the three raw
  parses and the computed agreement; `scenarioRunner` accepts a computed value on this path (the
  assumed-input default remains available but the scenario B artifact records
  `officialEvidencePassed: computed`); a new on-chain record exists whose reason bits derive
  from the computed flag; `POST-SUBMISSION.md` dates it; S1.2's qualifier is narrowed
  accordingly.
  Evidence: —

- [ ] **S2.2 — Run the LLM evidence-graph derivations live for one scenario, cross-checked**
  Depends on: S2.1
  Owner: agent.
  Work: the replay scenarios currently use heuristic derivations for entity resolution,
  syndication dedup, and contradiction marks (site label: "IMPLEMENTED REPLAY"). Run the model
  live on one scenario's claim set (scenario A's five-claim syndication collapse is the natural
  choice), publish raw outputs, and record agreements/disagreements between the model and the
  heuristics without silently repairing either. The deterministic promotion engine stays the
  decider; the model's output is graph structure only.
  Acceptance: a published artifact shows model-derived graph structure beside the heuristic
  derivation with a per-edge agreement table; any disagreement is surfaced, not patched; the
  /proof capability label for the evidence graph is updated from "IMPLEMENTED REPLAY" to
  reflect exactly what is now live, no more.
  Evidence: —

### Phase S3 — User value: a real economic demonstration, honestly bounded (P1; target 3→5)

- [ ] **S3.1 — Pre-register a paired-pool protection experiment**
  Depends on: S0.1 (ranking), S2.1 (so the demonstrated path is the computed one)
  Owner: agent designs; Dien approves the pre-registration before any run.
  Work: design the experiment the evaluation asked for: two identical builder-controlled testnet
  pools (same tokens, same initial liquidity, same trade script derived from a real event's
  recorded swap sequence), one with the hook attached and one without; replay the same trades
  through both; measure retained value difference. Freeze pools, trade script, metrics, and the
  success/failure condition in a pre-registration document before running, exactly like
  `t0-4-benchmark-preregistration.md` did. State in the pre-registration what this can and
  cannot show: it demonstrates the mechanism's effect under a replayed path on mock liquidity —
  it does NOT license "reduces LP loss", which stays prohibited until the original
  `canClaimLossAvoided` conditions pass on canonical data.
  Acceptance: pre-registration committed and approved before any result exists; both outcomes
  (including "no measurable difference") have a designated publication surface.
  Evidence: —

- [ ] **S3.2 — Run the paired-pool experiment and publish whatever it shows**
  Depends on: S3.1; requires testnet gas (Dien confirms).
  Work: execute per the pre-registration; publish per-swap raw data, both pools' end states, and
  the comparison under the frozen metrics; update the site's user-value answer only in the
  direction the data supports.
  Acceptance: results are reproducible from published raw data; the claim gate output states
  exactly which sentence (if any) the result newly licenses; a null or adverse result is
  published with the same prominence a positive one would have received.
  Evidence: —

- [ ] **S3.3 — Widen the canonical scenario set hunting for a real PROTECT, pre-registered**
  Depends on: S0.1
  Owner: agent.
  Work: the evaluation noted no canonical replay reaches PROTECT. Extend the frozen-scenario
  method (the MVP tracker's T0.2 pattern: real timeline, pre-registered expected outcome,
  availability measured without inspecting price paths) to additional real 8-K events on the
  same asset universe, selected by a rule written down before looking at any market data.
  If some scenario canonically reaches PROTECT, that becomes the flagship demonstration and the
  CONSTRUCTED one is retired to an appendix. If none does, publish that: it is evidence about
  the threshold calibration, and feeds an honest "when does this fire at all" analysis.
  Acceptance: selection rule committed before market data is touched; every new scenario carries
  the full provenance schema; outcomes published regardless of direction; no threshold is
  changed to manufacture a PROTECT.
  Evidence: —

### Phase S4 — Innovation: substantiate or correct the novelty claim (P1; target: defend 7)

- [ ] **S4.1 — Run and publish the competitor survey the novelty claim assumes**
  Depends on: the §0.3 sprint being finished; otherwise unblocked
  Owner: agent.
  Work: the site claims the combination (source-grounded tokenized-equity evidence, rumor
  containment, market confirmation, bounded LP action, deterministic recovery, measured
  three-policy outcome) "wasn't found in public competitors" — the evaluation left this
  unverified. Do the survey: document the search method (queries, dates, venues — v4 hook
  directories, ETHGlobal showcases, academic/industry write-ups, the projects already named in
  the MVP tracker §0.19: RiskClaw, NeuralHook, Sentinel Agent, UniBrain, Hypernative, Chaos
  Labs, Chainlink corporate-actions, RavenPack), and the per-candidate comparison against the
  six-element combination. If a counterexample exists, correct the site claim; if not, the claim
  gains a citable method instead of being an assertion.
  Acceptance: a dated survey document with reproducible method; the site's novelty sentence
  either survives with a footnote pointing at the survey or is corrected; §0.19's prohibited
  "first X" claims remain prohibited regardless of outcome.
  Evidence: —

### Phase S5 — Product completeness: live intake (P1; target 7→8)

- [ ] **S5.1 — Wire the built-but-unwired X listener into the loop, clearly labeled LIVE**
  Depends on: S0.1; Dien confirms the X account/API access status before work starts.
  Owner: agent.
  Work: the roadmap lists "X Listener" and "X Publisher" as built but not connected. Connect the
  listener so at least one live social claim flows: intake → normalization (with real
  `sourceClass: RUMOR`/`NEWS`, real URL, real timestamp, `dataMode: LIVE`) → evidence graph →
  decision engine. The containment invariant does the demonstrating: a live rumor should land at
  most `WATCH`. Do not connect the publisher (outbound posting) without separate Dien approval —
  it is an irreversible external channel.
  Acceptance: one end-to-end run from a live social post to a decision record with `LIVE` data
  mode, captured with timestamps; the roadmap page moves the listener from "built, not
  connected" to "connected" with the date; latency/coverage claims remain prohibited until
  measured (a single run measures neither).
  Evidence: —

- [ ] **S5.2 — Live news intake for one feed, provenance-first**
  Depends on: S5.1
  Owner: agent; any paid API or new account requires Dien per §0.8.
  Work: replace one frozen news fixture path with a live feed (narrowest viable source; an RSS
  or Atom feed of a wire/publisher requires no credentials and is preferred), preserving the
  full provenance schema. Syndication dedup must run on the live items.
  Acceptance: a live news item traverses the full pipeline with provenance intact; SVC-007's
  "does not prove live discovery" limitation is updated to state exactly what is now live and
  what still is not.
  Evidence: —

### Phase S6 — Growth and ecosystem: make consumption real (P1 prep, P2 execution)

- [ ] **S6.1 — Package the registry consumer path so a third party can adopt it in minutes**
  Depends on: S1.1
  Owner: agent prepares; publishing to npm (if desired) is a §0.8 action for Dien.
  Work: turn the zero-dependency reader into an adoptable integration kit: a documented
  `INTEGRATION.md` (addresses, ABI mapping, `effectiveState()` vs `currentRecord()` semantics
  including the stale-read warning, the convergence-lag mitigation of pinning reads to a block),
  a minimal Solidity example of another contract reading the record, and a copy-paste consumer
  snippet. Keep the existing "not evidence of adoption" honesty: the kit lowers the cost of
  adoption, it is not adoption.
  Acceptance: a stranger following only `INTEGRATION.md` on a clean machine reaches a correct
  read of the live record; the example contract compiles in the fixed S1.1 environment.
  Evidence: —

- [ ] **S6.2 — Write the X Layer RPC read-consistency note as a standalone contribution**
  Depends on: the §0.3 sprint being finished; otherwise unblocked
  Owner: agent writes; any submission to X Layer's repo/forum/team is Dien's action (§0.8).
  Work: extract the measured finding (public RPC serves reads from nodes at differing heights;
  per-write convergence waits 2 519–2 746 ms; raw observations in
  `../05-build/proof-of-protection.json` under `readConsistency`) into a self-contained note:
  method, raw data, reproduction script, and the two mitigations (block-pinned reads, following
  `AssessmentPosted` events). This is the ecosystem artifact the evaluation said any X Layer
  builder could use — make it usable without cloning Tinjau.
  Acceptance: the note stands alone (no Tinjau context required to act on it), includes a
  reproduction script an outsider can run against the public RPC, and is ready for Dien to file
  wherever X Layer takes such reports.
  Evidence: —

- [ ] **S6.3 — Demand-evidence outreach kit** (P2)
  Depends on: S6.1, S3.2
  Owner: agent prepares materials only; all contact is Dien's (§0.8).
  Work: the growth score moves on "a single external LP, pool operator, or protocol expressing
  concrete intent". Prepare the shortest honest pitch for the three audiences (LP, pool
  operator, protocol): what the registry gives them today on testnet, what the paired-pool
  result showed (whatever it showed), what is explicitly not yet proven. No claims beyond the
  claim gate.
  Acceptance: materials exist per audience, pass the web claim-gate test's standards, and Dien
  has what they need to start conversations; any expression of interest that results is recorded
  as evidence with the counterpart's consent.
  Evidence: —

### Phase S7 — X Layer integration: beyond testnet (P2; target 8→9, human-gated)

- [ ] **S7.1 — Mainnet readiness memo, not a mainnet deployment**
  Depends on: S3.2, S5.1
  Owner: agent writes; deployment itself is far outside this tracker (§0.8: mainnet, real money).
  Work: the last evaluation point ("mainnet deployment, or a hook attached to real X Layer
  liquidity") is a business decision with real-money risk. Produce the decision memo for Dien:
  exact costs (gas, liquidity), the security review the contracts have NOT had (state this
  plainly), what a minimal real-liquidity pilot would look like, which claims mainnet presence
  would and would not license, and the do-nothing alternative. Recommend, don't decide.
  Acceptance: the memo lets Dien make the call in one sitting; it contains no instruction to
  deploy; the un-audited status of the contracts is stated in the first paragraph.
  Evidence: —

## 3. Dependency spine

```text
PRE-DEADLINE SPRINT (now → 2026-08-21 23:59 UTC):
  S1.1 ──> S1.2 ──> S1.3 ──> (stretch: S2.1)

AT THE DEADLINE:  S0.2 (tag submission-final)

POST-DEADLINE:
  S0.1 (timeline) ──> ranking of everything below
  S1.2 + S1.3 ──> S2.1 (if not done in sprint) ──> S2.2
  S0.1 + S2.1 ──> S3.1 ──> S3.2 ──> S6.3, S7.1
  S0.1 ──> S3.3, S5.1 ──> S5.2, S7.1
  S1.1 ──> S6.1 ──> S6.3
  S4.1, S6.2 — unblocked any time after the sprint
```

## 4. Acceptance matrix: task → criterion it moves

| Task | Criterion served | Nature |
|---|---|---|
| S1.1 | Product completeness (defends 7) | removes the defect a judge hits first |
| S1.2 | Application of AI (defends 6) | closes the one disclosure gap found |
| S1.3 | Application of AI (defends 6) | hygiene |
| S2.1, S2.2 | Application of AI (6→8) | the evaluator's exact stated mover |
| S3.1–S3.3 | User value (3→5), Innovation | the evaluator's exact stated mover, honestly bounded |
| S4.1 | Innovation (defends 7) | converts the unverified novelty claim |
| S5.1, S5.2 | Product completeness (7→8), Innovation | the evaluator's exact stated mover |
| S6.1, S6.2 | Ecosystem contribution (6→7) | makes the artifacts consumable |
| S6.3 | Growth potential (4→?) | the only path to demand evidence |
| S7.1 | Integration with X Layer (8→9) | prepares the human decision |

Under the Liquidity Grant's four-part wording (product quality, innovation, user value,
ecosystem contribution), the highest-leverage tasks are S3.x and S6.x, because user value and
ecosystem carry 2 of 4 weights there versus 2 of 7 here.

## 5. Deviations and blockers log

| Date | Task | Deviation/blocker | Resolution |
|---|---|---|---|
| 2026-08-21 | §0.7 baseline | `cd apps/server && npm install` fails (`ERESOLVE`, `knip` vs `typescript@5.9.3`). `apps/server` ships `pnpm-lock.yaml` only, and README §8.2 says `pnpm`. Both evaluation prompts tell the evaluator to run `npm install`. Same defect class as S1.1 defect 1, on the server lane. | Baseline re-run with the existing `node_modules`: **594 pass, 0 fail**. Not fixed — outside the approved sprint. Raised to Dien for a go/no-go; see §6. |
| 2026-08-21 | S1.1 | Tracker's preferred mechanism (submodules) was not usable. | Vendored instead, which the task's own `Work` line permits. Both reasons recorded in the S1.1 Evidence field. |

### 5.1 §0.7 baseline, run 2026-08-21 16:13-16:20 UTC at commit `1cd4add` (pre-change)

| Command | Expected | Observed |
|---|---|---|
| `cd apps/server && npm test` | 594 pass, 0 fail | **594 pass, 0 fail** (`npm install` failed first, see log above) |
| `cd apps/web && npm run test:contract` | 30 pass, 0 fail | **30 pass, 0 fail** |
| `cd contracts && forge test` | 137 pass (local `lib/` only) | **137 pass, 0 fail** with the builder's `lib/`; the S1.1 defect confirmed as described |
| `node demo/tinjau-demo.mjs check` | byte-identical, sha256 `be884920…7196` | **byte-identical**, sha256 `be884920d860b0f4c92180670f52ae54400f4e5d77e25d95ae111b7221ee7196` |
| `node …/frontend-handoff/tools/validate.mjs` | all artifacts validate | **all frontend-handoff artifacts validate** |
| `tools/risk-reader/tinjau-risk-read.mjs` (live RPC) | §0.2 envelope, expired PROTECT reading as NORMAL 500 pips | **stored PROTECT, effective NORMAL, 500 pips (0.0500%)**, `expiresAt` 2026-08-21T09:59:57Z |

Note the starting commit was `1cd4add`, not the `7e2a6b1` named in §0.3 — `1cd4add` is a later
pre-existing pre-deadline commit, exactly the case §0.3 rule 3 anticipates.

## 6. Open questions for Dien

| # | Question | Blocks | Status |
|---|---|---|---|
| Q1 | Is `GEMINI_API_KEY` available, and is the funded assessor key available? | S2.1 stretch goal only | asked 2026-08-21, unanswered |
| Q2 | `npm install` in `apps/server` fails on a fresh clone; the fix is a server-lane change outside the approved sprint. Fix it before the deadline, or leave it? | nothing in the sprint | asked 2026-08-21, unanswered |
| Q3 | Has `07-submission/EVALUATE-TINJAU.txt` been **sent to anyone**? It needed no change for S1.1, but §0.8 governs any future edit. | nothing yet | asked 2026-08-21, unanswered |
