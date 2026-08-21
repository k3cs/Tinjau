# T5.5 — Proof of Protection, and the claim result

- Date: 2026-08-21
- Task: T5.5 (publish the Proof of Protection record and the claim result)
- Governed by: tracker §0.13, §0.24, §1 "Claim gate"
- Machine-readable record: [`proof-of-protection.json`](./proof-of-protection.json)
- Schema: [`proof-of-protection.schema.json`](./proof-of-protection.schema.json) — `tinjau.proof-of-protection/1.0.0`
- Verifier: `node docs/buildx-orion-2026/outputs/05-build/tools/verify-proof-of-protection.mjs`

## 0. The result, in five sentences

**The economic claim failed, and this document does not soften it.** Tinjau never promotes to
`PROTECT` on any of the four frozen replay scenarios, at any threshold in the AMD-001 grid, so its
replayed economics are **identical to the do-nothing `STATIC` policy, not better than it**, and
`canClaimLossAvoided` is **`false`** — a tie is not a win. On markout the benchmark cannot even
determine which policy did better: all 27 comparable cells flip sign between the pre-registered
basis and AMD-002's post-hoc basis, and neither basis is clean. **The only observed `PROTECT`
interval in this project exists on a builder-controlled X Layer Testnet stack with a constructed
market leg**, so what follows is a proof of *enforcement* — the contract bounded the fee, charged
it, and recovered it exactly as specified — and **not** a demonstration that the intervention
helped, because no measured event warranted one. What the work does establish is behavioural:
*Tinjau declined to act on two large price moves because neither had a qualifying cause, and one of
them a volatility-only policy would have traded on.*

## 1. What §0.13 asks for, and where each piece is

§0.13 requires every completed `PROTECT` interval to connect eight things. All eight are in the
JSON record; this table says where, and states the epistemic status of each.

| §0.13 requirement | Location in `proof-of-protection.json` | Status |
|---|---|---|
| triggering evidence | `trigger.evidence` | **real, source-linked** — SEC 8-K `0001045810-26-000069`, primary document sha256 `1c480e33…928133` |
| market observations | `trigger.marketObservations` | **CONSTRUCTED** — the price path was authored; the verdict on it was not |
| selected state, reason, policy version | `selection` | observed on chain (`PROTECT`, reason bits `344340`, `tinjau.policy/1.0.0`) |
| bounded action requested | `boundedAction.requestedFeePips` | 20,000 pips proposed |
| bounded action actually applied | `observedOnChainProtection.feePathActuallyCharged` | **20,000 → 9,470 → 500 → 500**, decoded from PoolManager's own `Swap` event |
| observed protected-pool outcome | `observedOnChainProtection` | **enforcement facts only**, no economics — see §3 |
| replayed static-fee outcome | `replayedCounterfactualBaselines.policies.STATIC` | counterfactual, mainnet replay |
| replayed volatility-only outcome | `replayedCounterfactualBaselines.policies.VOLATILITY_ONLY` | counterfactual, mainnet replay, `k ∈ {2,3,5}` |

## 2. Why this record is labelled **constructed**

No replay scenario produced a `PROTECT`. Scenario B — the confirmed-event showcase, a real 8-K
with a bonded, hash-pinned primary document — **resolves to `WATCH`** on canonical mainnet data
because its market leg is `NOT_CONFIRMED`: the 235 bps drawdown clears the floor but retains only
13% after five minutes, so the pool dipped and bounced and anti-wick does not hold.

That verdict was tested against the correction that would have *helped* it. Measuring drawdown
post-anchor only gives 101 bps, half the floor — scenario B gets **weaker**, not stronger. The
rules were not loosened to escape the result.

A `PROTECT` demonstration therefore cannot be a replay. The demo scene pairs the **real replayed
8-K evidence** with a **constructed price path on the builder-controlled testnet pool**, and how
much was constructed is measured rather than asserted. The reason-code diff against the canonical
run is exactly:

```text
only in canonical  : ANTI_WICK_FAILED, MARKET_NOT_CONFIRMED
only in constructed: MARKET_CONFIRMED
```

All three are market-leg codes. Every evidence-leg conclusion (`OFFICIAL_FILING`,
`BONDED_EVIDENCE_PASSED`, `DUPLICATE_SYNDICATION`, `STALE_EVIDENCE`) is identical in both runs, and
a test in the harness fails if a non-market reason ever moves.

The record carries `canonicalReplayOfThisEvent` as a required, non-empty field, and the verifier
refuses a document whose canonical state is `PROTECT` — so the constructed record can never be
read on its own.

## 3. What the observed half deliberately does **not** contain

`observedOnChainProtection` carries **no USD figure and no LP outcome**, and that is not an
omission. The pool is builder-controlled, seeded by this project with freely-mintable mock tokens
that have no value. Attaching an economic number to it would manufacture a market result out of
liquidity we minted for ourselves.

What it does carry is enforcement, all of it decoded from chain state:

| Fact | Evidence |
|---|---|
| the pool charged the bounded fee | swap `0x2e313c44…3f787`, `appliedFee` **20,000** from PoolManager's `Swap` event |
| the fee decayed on time alone | swap `0x93ae1e24…7bab` at +210 s, **9,470** |
| protection ended with no transaction | swap `0xcf229e22…4c0`, **500**, `effectiveState` `NORMAL`, no keeper call |
| stored state is not rewritten | the record still reads `PROTECT` at that swap; expiry is applied at read time |
| re-arming is refused on chain | `postAssessment` reverts `CooldownActive(1787284659, 60)` |
| a failed action claims nothing | guardian pause → `ProtectionPaused`, `action.status: FAILED`, measured fee afterwards **500** |

A quoted fee is an **upper bound during decay**: `previewFee` returned 9,730 where the pool charged
9,470, because the fee is continuous in time and seconds elapse between quote and inclusion. Both
values are recorded rather than reconciled away.

### The observed run used the demo envelope

X Layer Testnet exposes no `evm_increaseTime`, so the production envelope's 21,600 s recovery
cannot be watched live. The chain-1952 run uses a **60×-compressed demo envelope**
(60 / 300 / 360 s) that preserves `cap == widen + decay` and `cooldown == widen` exactly. The
production timings are proven by `forge test` (134/134) and by the local Anvil run, where the same
scene charges **20,000 → 10,250 → 500 → 500**. Anything shown from the 1952 run must be labelled
as using demo timings.

## 4. How observed and counterfactual are kept apart

Separation is **enforced by a runnable check**, not by a convention in prose. `verify-proof-of-protection.mjs`
exits non-zero on any of these:

| # | Invariant |
|---|---|
| INV-1 | every metric leaf carries `unit` **and** `basis`; a bare number cannot say whether it was measured or re-priced |
| INV-2 | every metric leaf inside `observedOnChainProtection` has `basis: "OBSERVED"` |
| INV-3 | the two halves share no top-level key except the venue-identity keys, so no figure has a same-named twin a reader could line up and net |
| INV-4 | those identity keys must **differ**: chain 1952 / `BUILDER_CONTROLLED` against chain 196 / `THIRD_PARTY_MAINNET` |
| INV-5 | `claimGate.canClaimLossAvoided` equals the benchmark's value, and the benchmark's value is `false`; the gate reads the pre-registered metric only |
| INV-6 | every replayed figure equals `three-policy-benchmark.json` to the bit, all three policies share one replay-input fingerprint, and `TINJAU` still ties `STATIC` |
| INV-7 | every observed fee and transaction hash equals the decoded `Swap` events in `t4-demo-manifest-xlayer-testnet.json` |
| INV-8 | a `CONSTRUCTED` market leg forces a populated `canonicalReplayOfThisEvent` whose state is not `PROTECT` |
| INV-9 | no §0.19 forbidden claim appears in any string that does not disown it in the same sentence |
| INV-10 | no key-shaped value sits beside a credential-shaped label |

The generator **derives** both halves rather than transcribing them: counterfactual figures are
read out of `three-policy-benchmark.json` and observed figures out of the on-chain manifest, so
the three artifacts cannot drift apart. No wall-clock time is read, so re-running the generator
produces a byte-identical file and an empty diff is meaningful evidence.

The checks were **mutation-tested**, because a suite that is green on its first run proves
nothing. Eleven doctored copies were each rejected by the invariant they attacked, and the
unmodified record passes:

flipping an observed `basis` to `COUNTERFACTUAL`; deleting a `unit`; opening the claim gate;
doctoring a replayed markout; doctoring an observed fee; claiming the canonical replay reached
`PROTECT`; inserting "first self-protecting pool"; inserting a dual-OKX claim; relabelling the
builder-controlled pool as third-party; switching the gate to the AMD-002 basis; stripping the
post-hoc label off an AMD-002 figure.

## 5. The replayed baselines — the honest numbers

Scenario B, mainnet replay, 4,145 swaps, 0 RPC range errors, primary horizon 3,600 s. `CF` =
counterfactual, `OBS` = observed.

| Policy | Parameter | Status | Fee revenue gross | `M_3600_LP` pre-registered | `M_3600_LP` AMD-002 post-hoc |
|---|---|---|---|---|---|
| `STATIC` | — | `CONSTANT_BASE_FEE` | 339.0950 `OBS` | **+229.7785** `CF` | +229.7785 `CF` |
| `VOLATILITY_ONLY` | k = 2, 3, 5 | `TRIGGERED` | 10,071.6906 `CF` | **−2,203.3704** `CF` | +7,529.2252 `CF` |
| `TINJAU` | 150 / 200 / 300 bps | `WATCH` | 339.0950 `OBS` | **+229.7785** `CF` | +229.7785 `CF` |

Tinjau's row is identical to `STATIC`'s in every column, at every threshold. That equality **is**
the result, not a rounding artefact, and it is asserted by test in the benchmark suite and again
by INV-6 here.

**The comparison's sign is decided by the metric, not by the data.** All 27 comparable cells flip
from `TINJAU_BEATS` to `TINJAU_LOSES` between the two bases, on identical trades, triggers and fee
schedules. The pre-registered metric debits a counterfactual fee it never credits, so it
mechanically penalises any fee-raising policy; AMD-002 credits counterfactual fee revenue assuming
zero flow elasticity, so it mechanically rewards one. **On markout, this benchmark cannot determine
which policy did better.** It brackets the answer and the bracket spans the sign. Stating that is
more useful than picking the half that flatters the product.

## 6. `canClaimLossAvoided` = **false**

Copied from `three-policy-benchmark.json`; this record does not compute its own gate and INV-5
prevents it from opening one the benchmark closed.

| # | Condition (T0.4 §8.6, tightened by AMD-001) | Result |
|---|---|---|
| 1 | the scenario has a non-null economic row | **pass** — 3 of 4; scenario A's window has zero swaps |
| 2 | Tinjau beats both baselines at every `k` and every threshold | **FAIL** — 27 of 27 comparable cells are `TINJAU_TIES` against `STATIC` |
| 3 | the margin exceeds the best-worst `k` spread | not evaluable — condition 2 failed, so there is no margin |
| 4 | the frozen thresholds were not modified after a result was seen | **process fact, not a computation** — reported as such |

There is a second, independent reason the claim would stay closed even if the benchmark had
produced a win: the only observed `PROTECT` has a constructed market leg on a pool this project
controls. **A loss-avoided claim needs a measured event that warranted an intervention. There
isn't one.**

## 7. What may and may not be said

**May be said, each backed by an artifact:**

- The contract bounded, charged, decayed and recovered the fee exactly as specified, on a public
  testnet, with decoded transaction evidence.
- A failed action is recorded as failed and claims no benefit; the measured fee afterwards was
  unchanged.
- Tinjau declined to act on two large price moves because neither had a qualifying cause, and one
  of them a volatility-only policy would have traded on at every `k` in the grid.
- The volatility-only baseline fires a **false positive on the neutral control** — a routine
  insider Form 4 pre-registered `NORMAL` — at `k` = 2, 3 and 5. This arrives from the control, not
  the showcase.

**May not be said:**

- "Tinjau reduces LP loss" — the gate is closed and the sign is undetermined.
- "Confirmed protection on a replayed event" — the replay resolves to `WATCH`.
- "Dual OKX/X Layer confirmation" — the OKX leg is `UNAVAILABLE` for all four scenarios.
- "Production-ready", or anything implying production liquidity — the pool is builder-controlled
  with valueless mocks.
- Any §0.19 "first" claim.

## 8. Limitations carried into this record

1. The market leg of the observed `PROTECT` is **constructed**. The evidence leg is real.
2. The observed run used the **demo envelope**, not the production one.
3. Executable exit depth is a **lower bound**, and the mainnet pool is extraordinarily thin: only
   **0.53–2.29 wNVDAx (~$120–$517)** is provably quotable within one tick range across the four
   windows. Exit-depth figures are not representative of a liquid market.
4. The benchmark re-prices identical observed trades under different fee schedules. Fee revenue is
   overstated for fee-raising policies and adverse-selection benefit is understated; **the net sign
   is undetermined**. These results may not be called conservative.
5. Three economic scenarios, one asset, one pool, a market weeks old.
6. The assessment instant is the window end, so a *promoting* Tinjau's economics are not measurable
   on these windows.
7. `TVL_event` is unavailable for scenario B, so every "bps of TVL" figure is `null`, not zero.
8. X Layer's public RPC serves stale reads — measured **2,519–2,746 ms** convergence lag per write.
   A naive consumer can read `NORMAL` while a `PROTECT` is live. Pin reads to a block or follow
   `AssessmentPosted`.
9. The rumour fixture in scenario A is `SIMULATED`; SVC-007/SVC-008 use immutable replay fixtures.
   Containment is provable; live discovery, coverage and latency are not.
10. Every address here is a **T4.2 working address, not final**. T7.2 owns the authoritative list.

## 9. Reproduction

```bash
# rebuild the record from the benchmark and the on-chain manifest (byte-identical)
node docs/buildx-orion-2026/outputs/05-build/tools/build-proof-of-protection.mjs

# enforce the ten invariants above
node docs/buildx-orion-2026/outputs/05-build/tools/verify-proof-of-protection.mjs
```

Both scripts have zero dependencies, read only committed artifacts, make no network call, and
require no credential.

Upstream inputs, each reproducible on its own:

```bash
cd apps/server
npx tsx src/benchmark/emit.ts               # rewrites three-policy-benchmark.json byte-identically
npx tsx src/chain/tinjauDemoRun.ts --local  # boots its own Anvil, production envelope
```

The chain-1952 demo-envelope run is documented in full in
[`../04-planning/t4-2-t4-5-harness-and-testnet-run.md`](../04-planning/t4-2-t4-5-harness-and-testnet-run.md) §9.

## 10. Handoff note

`proof-of-protection.schema.json` and `proof-of-protection.json` are written here rather than in
`frontend-handoff/` because that directory has another owner. The frontend handoff's
`proof-of-protection.schema.json` slot (§0.23 item 5) should reference or copy this schema
unchanged; if it is copied, the copy must keep the `$id`
`https://tinjau.xyz/schemas/proof-of-protection/1.0.0.json` so the two cannot silently diverge.

Two display rules the record cannot enforce on the consumer's behalf:

1. `observedOnChainProtection` and `replayedCounterfactualBaselines` must never share a visual
   treatment, a total, or an axis. They are different chains, different pools, and different
   epistemic status.
2. `_READ_THIS_FIRST` must be rendered wherever the record is rendered. It is the sentence that
   stops the constructed interval being read as a result.
