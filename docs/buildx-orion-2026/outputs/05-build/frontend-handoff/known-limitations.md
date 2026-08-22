# Known limitations

Read this before writing any user-facing copy, pitch line, or judge-facing claim. Everything
here is a limitation that exists **today**, stated plainly so nobody has to discover it during
a demo.

Tracker §1 "Claim gate" and design §15 "Approved claims" are the governing rules. This file is
the concrete list. Current as of 2026-08-21, after T5 and the T4.2 testnet deployment.

---

## 1. ⚠️ The RPC lies about the present — the most important operational fact here

**X Layer's public RPC serves stale reads.** A `postAssessment` transaction confirmed, its own
`AssessmentPosted` event decoded to `PROTECT`, and the very next `currentRecord()` call returned
the **previous `WATCH` record, 13 seconds older** — while the pool correctly charged 20,000 pips
on the swap in that same scene. The RPC is load-balanced, so a read right after a confirmed
write can be answered by a node at an older height.

Measured convergence lag: **2,519–2,746 ms per write.**

> **A consumer polling `currentRecord` can read `NORMAL` while a `PROTECT` is live.**

For a risk registry that is the dangerous direction: you under-report danger, silently. Follow
the `AssessmentPosted` event, or pin every read to an explicit block number. Never render a
disagreement as a state change. Full guidance in `api-contract.md` §0.

This also means: **do not claim real-time readback.** What is proven is that a confirmed write
becomes readable within a few seconds, if you wait for convergence.

## 2. Tinjau never protects on a real replay

**Tinjau reaches `PROTECT` on none of the four frozen scenarios, at any threshold in the
AMD-001 grid.** A → `WATCH`, B → `WATCH`, C → `WATCH`, D → `NORMAL`.

Scenario B carries qualifying official evidence and is refused by the **market** leg: its
235 bps drawdown clears the 200 bps floor but retains only ~10–13% over the hold interval. The
pool dipped and bounced. T0.2 pre-registered `PROTECT` *conditional on* fresh market confirmation
and pre-registered `WATCH` as the fallback; the fallback is what happened, and it stands.

The agent checked whether its own method was unfairly harsh: measuring drawdown post-anchor only
— the correction that would favour B — gives 101 bps, half the floor. B gets **weaker**, so the
verdict is robust to the method choice.

**S3.3 update (2026-08-21 UTC) — the count did not grow, and the reason matters.** S3.3 asked whether
the `PROTECT`-free record is a property of the *events chosen* rather than of the thresholds. It
pre-registered a deterministic selection rule (`../s3-3-scenario-expansion-selection-rule.md`,
committed before any market data was read) and applied it. The rule selects **one** 8-K in the
only window where this pool's market leg is physically measurable, and it is scenario B's own
filing. **The expansion set is empty: 0 of 0 additional events reached `PROTECT`, because there
were no additional events.** NVIDIA filed four documents with the SEC in those thirty days and
T0.2 already used two of them; scenario B carries the only MATERIAL 8-K NVIDIA filed in twelve
months. The frozen set is close to a **census**, not a curated sample — so "no canonical replay
reaches `PROTECT`" cannot be explained by event selection. It equally does **not** show the
thresholds are right: with no ground truth about which events should have dislocated the price,
S3.3 cannot separate "the events were quiet" from "anti-wick is too strict for a pool this thin".
That stays open. See `../s3-3-scenario-expansion-result.md`.

Two figures above are sharpened by that run, both in the direction of a **stronger** refusal:
retention is exactly **9.66% median / 4.38% minimum over 68 observations** (not ~10–13%), and the
234.86 bps drawdown **troughs at 11:58:36Z, 43 minutes before the 12:41:33Z filing** — so the
move predates the event and could not have been caused by it. Velocity on that window is
**0.41×**, i.e. trade intensity *fell* after the filing; there was no volume burst on this event.

**Consequence:** the demo's confirmed-protection scene cannot be a mainnet replay. It is
`scenario-confirmed-protect.json`, built from real replayed 8-K evidence paired with a
**constructed** price path on the builder-controlled testnet pool. Only the market data is
constructed — the `CONFIRMED` verdict is the real engine's under its own unmodified thresholds.
Presenting it as a replayed outcome would be the most misleading thing this project could
publish.

## 3. `canClaimLossAvoided` is false, and the benchmark cannot rank the policies on markout

Two separate limitations, both blocking.

**The gate is closed.** Tinjau's fee stays at 500 pips through every window, so its replayed
economics are **identical to `STATIC`, not better**. 27 of 27 comparable cells are
`TINJAU_TIES`, and "beats" means strictly greater. A tie is not a win.
**No judge-facing material may claim "Tinjau reduces LP loss."**

**The comparison's sign is decided by the metric, not by the data.** All 27 comparable cells
flip from `TINJAU_BEATS` to `TINJAU_LOSES` between the two bases, on identical trades, triggers
and schedules:

- the **pre-registered** metric debits a counterfactual protocol cut of a fee it never credits
  the LP with earning, so it mechanically **penalises** fee-raising;
- **AMD-002**'s post-hoc consistent basis credits counterfactual fee revenue assuming zero flow
  elasticity, so it mechanically **rewards** fee-raising.

Neither is clean. The truth is bracketed and the bracket spans the sign. Quoting either number
alone would be picking a winner by choosing an arithmetic convention. Both are published;
AMD-002 is labelled post-hoc and is **structurally excluded** from the claim gate.

**What the benchmark *can* determine is behavioural**, and that is unaffected by the metric
choice: `VOLATILITY_ONLY` fires on the neutral control — a routine insider Form 4 that T0.2
pre-registered `NORMAL` — at every `k` ∈ {2,3,5}, while Tinjau declines it **twice**, once on
materiality and once on persistence.

That is the claim the submission may make, phrased narrowly:

> Tinjau declined to act on two large price moves because neither had a qualifying cause, and
> one of them a volatility-only policy would have traded on.

A finding about restraint, not a demonstration of protection. It arrives from the **control**,
not the showcase, which is what makes it credible rather than curated.

## 4. The OKX leg is `UNAVAILABLE` for all four scenarios

No committed OKX index data covers any frozen anchor — the only index NDJSON is 2026-08-18, and
all four anchors predate it. SVC-003 records that index history is not retroactively available.

Dien decided (2026-08-20) that the X Layer pool leg may satisfy confirmation on its own, with
the OKX leg marked `UNAVAILABLE` and disclosed in every record.

> **No artifact may claim "dual OKX/X Layer confirmation" for a replayed scenario.**

A test fails if the data is ever backfilled, so this limitation cannot silently stop being true.

## 5. Addresses are working addresses, not final

`deployed-addresses.json` carries `status: "T4.2_WORKING_ADDRESSES_NOT_FINAL"`. T7.2 re-verifies
and owns the authoritative list. Do not hardcode them anywhere judge-facing without checking
with the non-frontend lane.

Two stacks exist because X Layer Testnet exposes no `evm_increaseTime`, so the production
envelope's 21,600 s recovery cannot be watched live. The demo stack is 60× compressed and
preserves `cap == widen + decay` and `cooldown == widen`. `advanceTime` **refuses loudly rather
than faking a curve** — verified against the production stack — so three swaps at one instant
can never be presented as a decay curve.

The recovery curve you can show was measured under the **compressed** envelope. Say so.

## 6. The demo pool is builder-controlled

The X Layer **Testnet** pool (chain 1952) is ours, with freely-mintable mock tokens. It must be
labelled builder-controlled wherever it appears. The asset in every on-chain scene is a mock
standing in for canonical `wNVDAx`; only that field was remapped, and the decision itself is
unmodified.

The chain-196 mainnet pool used for the frozen replay windows is real third-party liquidity —
that one is not ours. Keep the two visually and verbally separate.

## 7. The X Layer market for this asset is weeks old, and extraordinarily thin

The wNVDAx/USDG reference pool's first block with bytecode is `65946484`
(2026-07-22T10:18:40Z), and it was still untraded days later.

- No event before late July 2026 can be market-confirmed at all.
- Two older NVDA 8-Ks in the repository's own sample had to be excluded for this reason.
- Only **0.53–2.29 wNVDAx (~$120–$517)** is provably quotable within one tick range across the
  four windows. Any realistic LP exit is unquotable from swap-log data alone.
- Executable exit depth is a **lower bound** (`isLowerBound: true` on every result): liquidity
  only changes at *initialized* ticks, which a swap log does not reveal, so the nearest
  `tickSpacing` boundary is used. It under-states depth and therefore **over-states** risk.

Do not present exit-depth figures as representative of a liquid market, and any phrasing
implying a long observed history is false.

## 8. One frozen scenario has no trades

Scenario A's seven-hour replay window contains **zero** swaps (measured, 0 RPC errors). It
carries no economic row: all three benchmark policies would earn zero fees and realise zero
markout. Reported as `null`, never dropped or imputed. Widening the window to reach liquidity is
explicitly forbidden.

It remains valuable as the cleanest single-origin containment test and as a genuine
degraded-data case — but it can support no economic claim.

Its market leg is therefore `UNAVAILABLE` with `observedAt: null`.

## 9. `observedAt` nullability is not what it looks like

`marketConfirmation.observedAt` is `["string", "null"]` since schema `risk-record/1.0.1.json`.
The field is **still required** — an omitted field and an explicit `null` are different facts.

`null` means **nothing was observed**. Nullity tracks *"was anything observed"*, **not** the
status. `UNAVAILABLE` covers two different situations:

- a window with zero swaps → no observation → `observedAt: null`;
- a window whose sample is below the engine's floor → **real observations exist** → the
  timestamp is kept.

So `UNAVAILABLE ⟹ null` is a **false invariant**. Do not build one, and do not compute
`age = now - observedAt` without a null check: reading a substituted timestamp would make a leg
that was never observed look perfectly fresh.

## 10. The rumour is fabricated

One claim in the frozen evidence set is a `SIMULATED` social post written by us. No live social
provider is authorised for this MVP (DEC-010), and a public search found no citable, durably
addressable post that could be byte-pinned. It carries `sourceUrl: null` and a `simulated://`
identifier.

**This cannot support any claim about live social monitoring, discovery, coverage, or latency.**
It proves one thing only: that the pipeline contains a rumour safely.

The real news chain that ran alongside it *is* genuine and source-linked. Record-level `dataMode`
is `SIMULATED` for the whole of scenario A because the least-live claim decides it — this
deliberately **over-states** how synthetic the record is; `evidence[].dataMode` carries each
claim's own mode.

## 11. Two frozen claims have no retrievable URL

They are paywalled WSJ originals. They are **displayed, not hidden** — a claim rejected for
incomplete provenance is part of why the state is what it is, and hiding them would make a
`WATCH` unexplainable.

## 12. Speculation detection is a marker list, not a model

`analyseSpeculation` matches curated English hedging phrases and will miss hedging the list does
not cover.

It is deployed in the one direction where being wrong is cheap: detection may only ever
**weaken** a claim's assertion level, never strengthen it. A missed hedge leaves a claim looking
stronger than it is, which is still caught downstream by the two-source and market-confirmation
requirements. Neither error can by itself cause an unsupported action.

## 13. Independence derivation is heuristic

Attribution phrases and publisher aliases are a curated list. Two failure modes were found and
fixed during T2.3 (a byline naming another outlet; a headline ending "- report"). More certainly
exist.

Where the derivation and a fixture's hand label disagree, the disagreement is **surfaced, never
auto-resolved** — either could be wrong, and which is right is a question for a human.

## 14. Anti-wick is not manipulation-proof

Persistence is the **median** retention across the whole hold interval, not the value at a single
instant. Median over minimum, deliberately: the minimum asks "was it never interrupted?", which
on this thin pool lets one counter-trade refuse a genuine dislocation — a suppression attack
mirroring the fabrication attack being removed.

**Disclosed cost:** an attacker holding the price down for more than 150 s of the 300 s interval
still passes. "Manipulation-proof" is not a claim this earns.

Also disclosed: anti-wick is now a **necessary** condition for any `CONFIRMED`, which narrows
the engine — a flat-price pool persistently diverged from the OKX reference can no longer confirm
on basis alone.

## 15. The public API is stale

`https://tinjau.xyz/api/scoreboard` currently returns an event labelled
`"8-K — bankruptcy_or_restructuring"` for NVDAx **with no source field at all**. That document
was fabricated by us for a pipeline test. As served today, the API asserts a false corporate
event about a real company.

The fix (an additive `provenance` object built from on-chain `sourceUrl`/`sourceContentHash`)
exists in code and is tested, but is **not deployed**. Until T7.3 redeploys the backend:

- do not cite that endpoint as evidence;
- do not screenshot it;
- do not link judges to it.

## 16. Known integration blocker — owned by the frontend lane

`apps/web/src/lib/risk/model.ts` `REASON_CODES` is missing three codes the published
`risk-record.schema.json` carries:

- `INSUFFICIENT_SAMPLE`
- `PERSISTENCE_UNOBSERVED` (bit 22, added mid-session)
- `UNKNOWN_COMPANY`

`scenario-rumor-watch.json`'s record emits `INSUFFICIENT_SAMPLE`, so
`apps/web/src/lib/risk/validate.ts` **throws on a record that is valid against the published
schema**. Any frontend fed real orchestrator output fails on scenario A.

`apps/web/**` is the frontend owner's lane and the non-frontend agents are forbidden from
entering it (§0.22), so this is **reported, not fixed**. Diff `model.ts` against the **current**
`$defs.reasonCode.enum`, not against any earlier list — the enum moved three times during this
session.

## 17. Other structural limitations worth knowing

- **`officialEvidencePassed` is still an input, not a computation.** The scenario runner defaults
  it to `true` so an OFFICIAL scenario is evaluated on its most favourable bonded assumption, and
  a refusal is never an artefact of assuming the bond failed.
- **The assessment instant is the window end.** Moot for the frozen set since Tinjau never
  promotes, but if it ever did, protection would begin at the window end and almost no swaps
  would be re-priced — so the economic comparison for a *promoting* Tinjau is not measurable on
  these windows.
- **Deployment transaction hashes were not recorded.** The Foundry broadcast directory was
  deleted so nothing implied a deployment that had not happened. Bytecode is verified directly by
  `eth_getCode` instead, which is the stronger check.
- **The assessor key is derived** (`keccak256(posterKey ‖ "tinjau.rolekey/1.0.0:assessor")`) and
  gas-less by design. Testnet only: a derived key shares the fate of its parent, so production
  requires an independently generated assessor key. Guardian and poster are the same key on
  testnet, because pausing needs gas.
- **A quoted fee is an upper bound during decay** (previewed 9,730 vs charged 9,470). The fee is
  continuous in time and seconds pass between quote and inclusion. Not a discrepancy.
- **A pause fails closed.** The hook drops to `baseFee` while the record, its history and its
  clock are untouched, so a pause can only ever shorten protection, never extend it. Settled by
  Dien on 2026-08-21 (DEC-012).

## 17b. The paired-pool experiment (S3.2), and what its CONFIRMS does not mean

Added 2026-08-21 UTC, per the S3.2 pre-registration's own publication requirement.

Two builder-controlled testnet pools were replayed through the same 120 recorded swaps, one with
`TinjauFeeHook` attached and one without. Pre-registered before any result existed
(`../s3-1-paired-pool-preregistration.md`, committed at `7d1caa6`).

**Result: band `CONFIRMS`.** `D = 195.3812 bps` under the primary mark against a realised fee
differential of `195.0000 bps`, sign held across all three marks (195.38 / 158.22 / 194.62 bps).
The control run W, replaying canonical scenario B where neither arm is protected, returned
**bit-identical withdrawals and exactly zero** in base units, which was the pre-registered hard
prediction and the falsifiable half of the design.

**Read the ratio before the band.** `D` is **100.195%** of the fee differential's own arithmetic
ceiling. That is the signature of a conformance test, not of a discovery: under a fixed trade
list, a higher fee necessarily leaves the LP holding more of the quote asset for the same risk
asset acquired. The experiment's own pre-registration said so in advance. The genuinely open
questions were magnitude, harness symmetry and mark-robustness, and those are what came out
clean.

What it therefore does **not** establish, each of which is load-bearing:

- **Nothing about whether Tinjau protects at the right times.** Run P's `PROTECT` trigger is
  CONSTRUCTED. On canonical data scenario B does not promote, and S3.3 later established that the
  frozen scenario set is close to a census, so there is no wider event population in which to look
  for one that would.
- **It assumes zero flow elasticity** under a 40x fee difference. In a real market a 2% fee deters
  much of the flow a 0.05% fee attracts. This is the same assumption that sank the three-policy
  benchmark, inherited knowingly.
- **195 bps is an upper bound on a full episode**, not a typical figure. Only 364 s of the
  3,600 s plateau was exercised, and the decay curve, which is most of a real episode, contributes
  nothing here.
- **Both pools hold builder-controlled mock tokens with no value.** Neither is a market.

`canClaimLossAvoided` remains **false** and "Tinjau reduces LP loss" remains prohibited. This
result licenses no new sentence about LP outcomes.

**Three testnet executions, two of them void, all three published.** Run 1 printed
`OUTCOME BAND: CONFIRMS` with `D = 49,804 bps`. Two framings of that same number appear across
these documents and both are correct: it is **498% of notional**, and it is **255 times** the
largest gap this fee differential can arithmetically produce. The second framing is the one that
makes it obviously impossible. It was produced by a broken withdrawal readback in which three of
four arms returned zero. Its run W "passed" at exactly zero for the
wrong reason: nothing had been withdrawn on either side. It was caught, voided, and is published
in full rather than deleted, because a result of that shape published unchecked would have been
indefensible. Root cause was not the position tuple or the settlement flags but the RPC read lag
already recorded in §1 of this document: the "after" balance was served by a node that had not yet
seen the burn. Attempt 2 turned the same staleness into a loud `block is out of range` and
aborted rather than reporting a number. The successful run pins its readings to block numbers, and
records that naive `"latest"` reads still returned `0/0` during it, so the fix is visible rather
than asserted.

A validity gate was **added** during the experiment (gate 8: a burn must read back as a burn) and
recorded as a deviation rather than written into the frozen pre-registration. It is one-directional
by construction: it can only ever void a run, never turn a null into a positive.

## 18. Prohibited claims

Never say, in any artifact:

- Tinjau reduces LP loss, or avoided *N* dollars of loss
- Tinjau outperformed the baselines economically
- dual OKX/X Layer confirmation, for any replayed scenario
- a replayed `PROTECT`, or any framing of the constructed scene as an observation
- first AI dynamic-fee hook
- first multi-agent corporate-action oracle
- first on-chain risk registry
- first CEX/DEX risk agent
- first self-protecting pool
- production-ready, or anything implying production liquidity
- external adoption, protected TVL, customers, or revenue
- a live Exchange OS integration
- manipulation-proof confirmation
- live news or social discovery, coverage, or latency

The safe positioning, verbatim from the design:

> No complete public product with the exact reviewed combination of source-grounded
> tokenized-equity evidence, rumor containment, OKX/X Layer confirmation, bounded LP action,
> deterministic recovery, and measured three-policy outcome was found.
