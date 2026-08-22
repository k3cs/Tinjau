# Tinjau — evaluation dossier

**Purpose.** To let an evaluator with no prior knowledge of this project reach their own judgement
about it. It supplies facts, sources, and commands. It supplies **no scores and no conclusions**;
those are yours to form.

**Date: 2026-08-22.** This supersedes `EVALUATE-TINJAU.txt`, which was written on 2026-08-21 and is
now factually stale: it predates the vendored contracts, a live-computed on-chain record, the
paired-pool experiment, the scenario-expansion result, and several corrections the project made to
its own records. `EVALUATE-TINJAU.txt` is retained unedited as historical evidence of what was
handed to an earlier evaluator, not as a current description.

---

## 0. How to use this document

1. **Do not treat any statement here as established because this document says so.** Every
   substantive claim below names a file, a command, a transaction, or a URL. Check the ones that
   matter to your judgement.
2. **This document is written by the project.** It has an obvious interest in the outcome. Its only
   defence against that is that it tries to be checkable and to state the project's failures at the
   same weight as its successes. Judge whether it succeeds at that; if it does not, that is itself
   evidence about the project.
3. **No prior scores appear in this document, deliberately.** An earlier independent evaluation
   exists and produced numbers. They are omitted here so they cannot anchor you. If you want them
   afterwards, they are in
   `docs/buildx-orion-2026/outputs/04-planning/tinjau-score-improvement-task-tracker.md` §0.4.
4. Section 6 lists what the project says it **cannot** claim, and section 9 lists questions
   designed to go against it. Both are part of the evidence, not disclaimers appended to it.
5. Repository: `https://github.com/k3cs/Tinjau`. Site: `https://tinjau.xyz`.
   The state submitted to the hackathon is the tag **`submission-final`** (commit `58ab29dd`,
   2026-08-21 19:28:21 UTC). Changes after it are listed and dated in `POST-SUBMISSION.md` at the
   repository root. If your remit is the submitted state, evaluate the tag; if it is the current
   state, evaluate `main` and use `POST-SUBMISSION.md` to see what arrived late.

---

## 1. Facts you can verify before reading any prose

| Fact | How to check it |
|---|---|
| Contracts deployed on X Layer Testnet (chain 1952) in block **38,824,844**, 2026-08-21 03:41:21 UTC | block explorer, or `eth_getCode` on the addresses in §4 |
| `TinjauRiskRegistry` at `0x60062389a7AB08F0030FC06Adf9CE0C180537317` | §8 command 6 |
| `TinjauFeeHook` at `0x1092C9fe2dB084F26aa415A0fda14B001A786080` | `eth_getCode` |
| Repository is public | anonymous clone |
| Site returns 200 | `curl -I https://tinjau.xyz` |
| Contract tests: **145 pass, 0 fail**, from a bare clone with no setup step | §8 command 3 |
| Server tests: **594 pass, 0 fail** (590 without `contracts/out`, 583 without Foundry, each printing a named notice) | §8 command 1 |
| Web tests: **32 contract + 54 e2e**, 0 fail | §8 commands 2 and 5 |

---

## 2. The problem the project says it addresses

Tokenized US equities trade on-chain continuously. The information that determines their value does
not: the US reference market closes, and corporate filings arrive at arbitrary times. A trader who
has read a disclosure can trade against a pool's stale quote before a static fee policy adapts, and
the cost falls on liquidity providers.

The project's own measurement of the problem's size is on `https://tinjau.xyz/why-it-matters`: 32
real SEC filings against ten real tokenized-equity pools on X Layer mainnet. **Note what that page
also says about itself**: those ten pools had no Tinjau hook attached, so the page measures the
problem, not any solution to it.

**A question worth asking early:** is the problem large enough to matter? The project's own figure
for executable depth in the measured pool is **$120–$517 quotable within one tick range**. A
mainnet-readiness memo in the repository separately records the same pool holding roughly $259k in
reserves, with about $5,500 moving the price 1%. Both figures are the project's own and they
describe different things (executable depth versus reserves). Decide for yourself whether the
addressable harm justifies the machinery.

---

## 3. What the system does

```text
ingest claim (SEC filing / news / social post)
-> normalize with provenance (OFFICIAL | NEWS | RUMOR, publisher, timestamp, URL, content hash)
-> evidence graph (entity resolution, syndication dedup, contradiction marks)
-> deterministic promotion rules -> risk state NORMAL | WATCH | PROTECT
-> independent market confirmation (drawdown, basis, velocity, exit depth, freshness, anti-wick)
-> signed record written to TinjauRiskRegistry on X Layer Testnet
-> Uniswap v4 hook reads the record and charges a bounded fee per swap
```

**The trust boundary, which is the project's central design claim.** The model reads and proposes:
it extracts fields, resolves entities, groups duplicates, marks contradictions. Deterministic code
and the contract decide: asset validity, state transitions, signature, nonce, freshness, expiry,
fee ceiling, maximum duration, cooldown, recovery. The contract can reject a proposal and can only
ever lower a proposed fee, never raise it. `requestedFee` is signed and bound into the EIP-712 hash
but is never written into `RiskRecord`, which has no fee field.

Enforcement envelope as deployed: base 500 pips, max 20,000 pips, 3,600 s widen, 18,000 s decay,
21,600 s hard cap, 3,600 s cooldown. Expiry is applied at read time with no keeper, so protection
ends by the clock rather than by anyone's action.

Invariants the project states are enforced in code and tests: rumor-only evidence can never exceed
`WATCH`; one news source alone cannot authorize `PROTECT`; syndicated copies of one origin count as
one source; stale or missing market data can neither create a new `PROTECT` nor cancel a running
one.

---

## 4. What is deployed, and what it is

| Component | Address (X Layer Testnet, chain 1952) |
|---|---|
| `TinjauRiskRegistry` | `0x60062389a7AB08F0030FC06Adf9CE0C180537317` |
| `TinjauFeeHook` (v4, beforeSwap flag `0x080`) | `0x1092C9fe2dB084F26aa415A0fda14B001A786080` |
| `PoolManager` (Uniswap v4) | `0x8F862A8b6f00C99b0610dc764228C661c4909ae1` |
| mock wNVDAx (no value) | `0xf07A9D89848bc694c7154Fda4cce707Eb409F903` |
| mock USDG (no value) | `0x666e81CCb9D4d6c2e7A3ed9f317E3dFBa2410e99` |

**Both deployed pools hold builder-controlled mock tokens with no value.** Neither is a market: no
external liquidity, no external participant, no price discovery. Everything on chain here
demonstrates enforcement, not adoption.

**Nothing is deployed on X Layer mainnet.** The event's published participation requirements state
that a project deployed on testnet during the hackathon must be *"subsequently launched on the X
Layer Mainnet"*; that clause carries no date. Whether it gates judging is not determinable from the
organizer's published material, and the project does not assert either reading.

---

## 5. What the project claims it demonstrates

Each row is a claim plus the artifact that is supposed to support it. Check the ones that matter.

| Claim | Where to check |
|---|---|
| A bounded fee is really charged by a real pool, and decays without a transaction | `node demo/tinjau-demo.mjs scene2`; fees decoded from PoolManager's own `Swap` event, tx hashes in the output |
| Protection ends by expiry at read time, and a naive consumer gets it wrong | §8 command 6: the live record reads stored `PROTECT` but effective `NORMAL` |
| Rumor containment: rumor-only evidence cannot reach `PROTECT` | `apps/server/test/riskPromotion*.test.ts`; scenario A |
| Syndication dedup counts one origin once | exercised on live data: 10 EDGAR filings collapsed to 1 origin, `docs/…/05-build/data/s5_2_news_intake_live.json` |
| The AI cannot set a fee or touch chain state | `contracts/src/TinjauRiskTypes.sol`; `RiskRecord` has no fee field |
| A reason bit was computed live by three independent model parses and posted on chain | tx `0x7edfb15d0ad5ff44da16253dfabe1191843ebbacf584c2daabc2ad07c4fdd507`, block 38,875,116; artifact `docs/…/05-build/data/s2_1_scenario_b_bonded_live.json` |
| The model was run against the evidence-graph heuristics and the disagreements published | `docs/…/05-build/s2-2-evidence-graph-live.md`: entity 10/10, contradiction 10/10, syndication 7/10 |
| Contracts build and test from a bare public clone | §8 command 3 |
| A dependency-free third party can read the registry | `INTEGRATION.md`; `tools/risk-reader/` uses zero npm packages |

---

## 6. What the project states it cannot claim

This section is the project's own published claim boundary. It is reproduced here at full weight
because an evaluator should be able to see what the project rules out without hunting for it.

- **`canClaimLossAvoided` is `false`.** The pre-registered benchmark condition **failed**. The
  sentences *"Tinjau reduces LP loss"*, *"Tinjau avoided X dollars of loss"* and *"Tinjau
  outperformed the baselines economically"* are prohibited in the project's own claim gate, and a
  test scans the website source to enforce it.
- **On the four frozen scenarios, Tinjau ties a do-nothing static fee policy.** It does not beat it.
  The published three-policy benchmark is not favourable.
- **No canonical replay ever reaches `PROTECT`.** The four frozen scenarios resolve A=WATCH,
  B=WATCH, C=WATCH, D=NORMAL. The one demonstrated `PROTECT` uses a **CONSTRUCTED** price path on a
  builder-controlled pool; the canonical replay of that same event resolves to `WATCH`.
- **The rumor input in the demo is SIMULATED**, not a real social post.
- **The reference consumer was built by Tinjau** and is not evidence of adoption.
- **The contracts are unaudited.** No auditor, no report, no scope, no engagement exists.
- **No "first", "only", or "unique" claim is made** about the design, and the project prohibits them
  permanently regardless of what any survey finds.
- **The markout comparison brackets zero** and cannot rank the policies.

---

## 7. Findings from 2026-08-21 and 2026-08-22 that bear on evaluation

These were established during a work sprint after the independent evaluation. Several are
unfavourable to the project. They are listed because they change what the evidence means, not
because they are flattering.

**(a) The hook cannot be attached to any existing X Layer liquidity.** The ten real
tokenized-equity pools on X Layer are **Uniswap v3**; `TinjauFeeHook` is a **v4** hook; in v4 the
hook is part of the `PoolKey` and fixed at pool initialization. Verifiable: pool
`0x2a2b11730c2b6d99a58034a869dd810d7300a7b2` answers `slot0()` and `fee()`, and v4 has no per-pool
contracts because pools live inside a singleton PoolManager (which does exist on chain 196, 24,009
bytes). **Consequence:** the only route to real liquidity is funding a new v4 pool and attracting
flow to it. Any suggestion that an existing pool could "add Tinjau" is false.

**(b) The paired-pool experiment returned `CONFIRMS`, and the ratio is the interesting part.**
Two builder-controlled testnet pools replayed the same 120 recorded swaps, one enforcing a
constructed `PROTECT`, one with no hook. Result `D = 195.3812 bps` against a realised fee
differential of `195.0000 bps` — **100.195% of the mechanism's own arithmetic ceiling**. Under a
fixed trade list a higher fee necessarily leaves the LP holding more, and the pre-registration said
so before the run. Treat it as a conformance test of the fee mechanism, not as evidence about
outcomes. It assumes zero flow elasticity under a 40x fee difference, exercised only 364 s of a
3,600 s plateau, and its trigger was constructed. `docs/…/05-build/s3-2-paired-pool-result.md`.

**(c) Two of that experiment's three runs were void, and all three are published.** The first
printed a passing band at **49,804 bps** — 255 times the largest gap the fee can produce — because
three of four withdrawals never read back. Root cause was the public RPC answering from a node that
had not seen the burn. It was caught, voided, and published in full.

**(d) An attempt to widen the canonical scenario set found nothing to widen it with.** A selection
rule was pre-registered and committed before any market data was read, then applied: it selects
exactly one 8-K, and it is the scenario the project already had. Inside the window where the pool's
market leg is measurable, NVIDIA filed four documents in total. **Consequence:** the absence of a
canonical `PROTECT` cannot be explained by cherry-picked events. It equally does **not** show the
thresholds are correct; with no ground truth about which events should have moved the price, that
question is open in both directions. `docs/…/05-build/s3-3-scenario-expansion-result.md`.

**(e) The supported asset universe is one asset.** `apps/server/src/evidence/assets.ts` contains
only `wNVDAx` (supported) and `NVDAx` (unsupported, no pool). There is no MSTR-linked asset,
despite other files tracking ten tickers.

**(f) Live intake is partial.** A credential-free SEC EDGAR Atom feed read returned 10 live 8-K
entries, all normalised with full provenance, with dedup exercised live. **But an 8-K is
`OFFICIAL`, not `NEWS`**: there is no live third-party press intake, and every `NEWS`-class claim in
the product is still a frozen fixture. The X listener is built and read-only but **blocked**: X
returns HTTP 402 credits-depleted, so no live social claim has ever entered the pipeline.

**(g) Event classification is not done.** The live run left `eventType` and `materiality` as
`UNKNOWN`, so a filing whose own SEC summary reads "Item 1.01: Entry into a Material Definitive
Agreement" still resolved to `NON_MATERIAL_EVENT`.

**(h) Two latent defects are published and unfixed.** The independent-origin count derives from a
string shape the intake adapter chooses, so a different adapter could make one filer look like many
sources. And an `OFFICIAL` record's explanation text names a gate that is not operative on that
path (state and reason codes are correct; only the prose is wrong).

**(i) The project corrected three of its own overconfident records** during this sprint, each
written as a dated correction quoting the original error rather than an overwrite. Two concerned
misreadings of the event's own published terms; one concerned a figure that no raw observation
supported.

---

## 8. Verification you can run

No credentials are needed for any of these. Times are approximate.

```bash
# 0. clone
git clone https://github.com/k3cs/Tinjau && cd Tinjau

# 1. server suite — expect 594 pass, 0 fail. On a fresh clone before any forge build it reports
#    590, and prints a named notice explaining the difference. Both are correct.
cd apps/server && npm install && npm test

# 2. web contract tests, including the claim-gate scan — expect 32 pass, 0 fail
cd ../../apps/web && npm install && npm run test:contract

# 3. contracts from a bare clone, no setup step, no forge install — expect 145 pass, 0 fail
cd ../../contracts && forge test

# 4. the offline demo, with the network sealed shut (fetch/net/tls/dns/http/https all throw)
cd .. && node demo/tinjau-demo.mjs all
node demo/tinjau-demo.mjs seal-selftest

# 5. browser end-to-end — expect 54 passed, 1 skipped. Takes ~14 minutes.
cd apps/web && npm run test:e2e

# 6. read the live on-chain record with a zero-dependency tool. Expect stored PROTECT but
#    EFFECTIVE NORMAL: the divergence is the point.
cd .. && node tools/risk-reader/tinjau-risk-read.mjs \
  --rpc-url https://testrpc.xlayer.tech --chain-id 1952 \
  --registry 0x60062389a7AB08F0030FC06Adf9CE0C180537317 \
  --asset    0xf07A9D89848bc694c7154Fda4cce707Eb409F903 \
  --pool-id  0x5e9eff19074225e9132eb73dc25cf0e3ff55c3fb31c9b28ab633851d2b54f730

# 7. read the record whose bonded-evidence bit was computed live rather than assumed
node tools/risk-reader/tinjau-risk-read.mjs \
  --rpc-url https://testrpc.xlayer.tech --chain-id 1952 \
  --registry 0x60062389a7AB08F0030FC06Adf9CE0C180537317 \
  --asset    0xf07A9D89848bc694c7154Fda4cce707Eb409F903 \
  --pool-id  0x0000000000000000000000002a2b11730c2b6d99a58034a869dd810d7300a7b2

# 8. re-derive the demo manifest from its sources and diff it; expect byte-identical
node demo/tinjau-demo.mjs check

# 9. validate the published data artifacts against their schemas
node docs/buildx-orion-2026/outputs/05-build/frontend-handoff/tools/validate.mjs
```

If any of these disagrees with what this document says, **the command is right and this document is
wrong.** Report the discrepancy in your evaluation; it is a finding about the project.

---

## 9. Questions designed to go against the project

Press on these. They are the ones the project is most exposed to.

1. **Does it work, or has it only been shown not to misfire?** Every published canonical scenario
   declines to act. The one `PROTECT` was constructed by hand. Is a system that has never
   demonstrably fired correctly on real data a working product, or a well-tested refusal?
2. **Is the paired-pool result informative at all**, given the mechanism is arithmetically favoured
   under a fixed trade list, and the result landed at 100.195% of the ceiling that arithmetic sets?
3. **Does the census finding help or hurt?** The project shows there were almost no qualifying
   events available. Does that excuse the absent `PROTECT`, or reveal that the addressable event
   rate is too low for the product to matter?
4. **How much of the innovation is combination rather than invention?** The project says every
   component has prior art and claims only the combination. Its own survey names Ondo Global
   Markets as already taking bounded, expiring, corporate-event-driven on-chain action on tokenized
   equities. What is left that is genuinely new?
5. **Is the trust-boundary claim load-bearing or decorative?** The model proposes and code decides.
   How much would break if the model were replaced with a stub? Does the AI earn its place?
6. **One asset, one chain, testnet, mock tokens, no external user.** What is the honest maturity
   label for that?
7. **Is the honesty itself a form of positioning?** The project discloses failures prominently. Is
   that genuine discipline, or a rhetorical strategy that converts weak results into a credibility
   claim? Test it: look for a disclosure that costs the project something, and for anything
   material that is *not* disclosed.
8. **Would a third party actually integrate?** Nobody has. The hook cannot join existing liquidity
   (§7a). What would a real LP or pool operator do with this next week?
9. **What happens when it is wrong?** The failure modes of a false `PROTECT` (LPs overcharge,
   traders route away) are not measured anywhere. Should they have been?

---

## 10. What this document does not tell you

- **It gives no scores and no verdict.** That is deliberate.
- It does not tell you how much weight to put on honesty versus capability. That trade is the
  central judgement about this project and it is yours.
- It does not claim completeness. If you find something material that is absent here, that absence
  is itself evidence.
- Every figure in it is an observation with a date. Several were measured on 2026-08-21 and 2026-08-22
  and may have aged: the RPC timings, the pool depths, the "not found" in the competitor survey,
  and every test count.
