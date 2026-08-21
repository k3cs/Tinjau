# Three-policy benchmark — static, volatility-only, Tinjau

- Date: 2026-08-21
- Tasks: T5.3 (replay runner and Tinjau arm), T5.4 (outcome calculation)
- Governed by: `../04-planning/t0-4-benchmark-preregistration.md` (frozen 2026-08-20)
- Baselines: `../04-planning/t5-1-t5-2-baselines.md` (T5.1 / T5.2, written before any comparison existed)
- Machine-readable artifact: `three-policy-benchmark.json`
- Code: `apps/server/src/benchmark/` — Tests: `apps/server/test/benchmark*.test.ts`, **81 pass / 81**

## 0. The result, in four sentences

**Tinjau does not promote to `PROTECT` on any of the four frozen scenarios, at any drawdown
threshold in the AMD-001 grid.** Its fee stays at the base fee throughout every window, so its
replayed economics are *identical* to the do-nothing static policy rather than better than it.
**`canClaimLossAvoided` is `false`**: T0.4 §8.6 requires Tinjau to *beat* both baselines, "beats"
means strictly greater, and a tie is not a win. The volatility-only baseline fires on the neutral
control at every `k`, which is a false positive at 2, 3 and 5 — that restraint result is the most
defensible thing this benchmark has produced, and it comes from the control rather than from the
showcase.

## 1. Why a comparison exists now and did not before

T5.1 and T5.2 deliberately produced no comparison. This document was written only after all four
of the following were true:

1. both baselines were frozen and their rows pinned by test;
2. the scenario-C method question was settled — the stated rule governs, the parenthetical does
   not, so C reports `TRIGGERED`;
3. the `M_h_LP` fee-basis defect was recorded and its remedy fixed **in advance** as AMD-002;
4. the Tinjau arm was wired to the real `decide()` engine rather than reimplemented.

The sequence is the evidence. Code cannot demonstrate that no implementation choice was steered by
a result it had not yet seen; only the order of the artifacts can.

## 2. The Tinjau arm measures the real engine

`src/benchmark/tinjauPolicy.ts` calls `src/decision/decide()` — the T4.1 orchestrator — fed by the
real upstream stages: `normalizeClaims` (T2.1) → `buildEvidenceGraph` (T2.3) → `resolveAsset`
(T2.2) → `confirmMarket` (T3.3) → `decide`. There is no benchmark reimplementation of Tinjau, so a
divergence cannot surface as a product result.

The wiring is a copy of `decision/scenarioRunner.runScenario` with **one** change: `confirmMarket`
receives a config whose `minDrawdownBps` comes from the AMD-001 grid, because `runScenario` takes
no config and cannot express a grid. To stop that copy becoming a second implementation, a test
asserts the benchmark arm at the frozen 200 bps reproduces `runScenario`'s `Decision`
**field for field**. If the production runner changes, the benchmark fails rather than drifts.

**Envelope identity.** Tinjau's fee schedule uses `decision/envelope.decayedFee` — the mirror of
`TinjauRiskPolicy.decayedFee` the contract runs. A test sweeps 650 elapsed values and proves it is
the same function as the benchmark's own curve at the frozen envelope, so "same ceiling, same widen
and decay as the baselines" is checked, not claimed. Tinjau's *proposal* is capped by confidence
band (LOW 7,000 / MEDIUM 13,500 / HIGH 20,000 pips) while the volatility baseline always steps to
20,000; the **ceiling** is 20,000 for both, which is what T0.4 §2 requires. That asymmetry is the
product's real behaviour and was not adjusted for the benchmark's convenience.

**Input identity.** All three policies score the same `ReplayInput`, and every row carries its
sha256 `fingerprint`. One fingerprint per scenario across all seven policy rows, asserted by test.
`M_0` — which depends only on the trades — is identical across all three policies on every
scenario, which is the same fact checked from the other end.

**Assessment instant.** The window end, matching `runScenario`'s documented default and its
reasoning: the promotion engine re-judges the market observation's age against `now` under a 900 s
freshness bound, so assessing at the anchor would discard the market leg on timing before its
verdict was considered. The window end makes the last observation 0 s old — the most favourable
timing promotion can get. Every refusal below is therefore on the merits, not on timing.

## 3. Amendment AMD-002 — the consistent fee basis

### 3.1 The defect it addresses

The pre-registered metric mixes two fee bases in one number. `markout.ts` computes

```text
M_h_LP = (dU + dS * P_h)  -  0.25 * f_p * |inputUSD|
          ^^^^^^^^^^^^^^      ^^^^^^^^^^^^^^^^^^^^^^
          embeds the fee      the protocol's cut of the
          the pool REALLY     COUNTERFACTUAL fee f_p
          charged, f_o
```

The LP is debited a protocol cut of a fee it is never credited with earning. T0.4 §4 says the fee
rate is "the single place where the three policies diverge arithmetically", and it appears only in
that haircut — so raising the fee strictly *lowers* `M_h_LP`. Verified numerically on scenario B:
the entire markout gap between the two baselines is 2,433.15 USD, exactly 0.25 × the fee-revenue
gap, to the last decimal.

### 3.2 Derivation

Put both sides on the counterfactual basis: remove the fee the pool really took from the credit
side, add the one this policy would take, then subtract the protocol's cut of that.

```text
M_h_LP_consistent = M_h  - f_o*|inputUSD|          # take out the observed fee
                         + f_p*|inputUSD|          # put in the counterfactual one
                         - 0.25*f_p*|inputUSD|     # the protocol's cut of it
                  = M_h_LP + (f_p - f_o) * |inputUSD|
```

The correction is exactly the **incremental gross fee** the counterfactual schedule would have
charged over the observed one. `inputUSD` is T0.4 §4's own definition (`dU` if `dU > 0` else
`dS * P_post`), so the credit and debit sides use one definition rather than two. `f_o` is read
from the venue (`pool.feePips`, 500), never assumed. Pinned by test, including the invariant that
the two bases coincide *exactly* whenever a policy sits at the pool's own fee.

### 3.3 What it assumes about the observed fee embedded in `dU`

Two assumptions. The first holds; **the second is false, in two independent ways, and is not
repaired**:

1. The pool's realised fee on a swap is exactly `f_o * |inputUSD|`. On a v3 pool the fee is taken
   from the gross input, which is what the `Swap` log records, so this holds up to per-tick
   rounding inside the swap loop — `markout-study.md` §5.3 puts that error below 0.01% of the fee.
2. The same trade would have moved the same tokens under a different fee, with only the fee
   component rescaled. False because:
   - **behaviourally**, a 2% fee deters trades a 0.05% fee attracts (T0.4 §5, unchanged);
   - **mechanically**, v3 deducts the fee from the input *before* the remainder reaches the curve,
     so a higher fee would send less to the curve, move the price less, and hand the LP back more
     of the base asset than this arithmetic credits.

Those two run in opposite directions and neither is measured. The net sign is undetermined, exactly
as T0.4 §5 already records.

### 3.4 Direction of effect — stated before any value

`M_h_LP_consistent ≥ M_h_LP` for every policy charging at or above the pool's own 500 pips. It
therefore **flatters every fee-raising policy, Tinjau included**. On this event set Tinjau never
raises a fee, so the amendment flatters *only the volatility baseline* — the direction that works
against Tinjau.

**It does not remove T0.4 §5's counterfactual bias. It relocates it.** The frozen metric
quarantined fee-raising upside in a separate column, as §5's first binding consequence requires,
and mechanically penalised fee-raising in the headline. The consistent metric pulls that upside
into the headline and mechanically rewards fee-raising. Neither is clean; the truth is bracketed
between them, and §6.2 below shows the bracket is wide enough to flip the sign of every cell.

### 3.5 It may not open the claim gate

`evaluateClaimGate` reads `PRE_REGISTERED` cells only. This is structural, not a convention: a test
doctors the cell set so that every post-hoc cell would pass and the pre-registered ones still fail,
and asserts the gate still returns `false`. A converse test proves the check is not vacuous. A
metric derived after seeing results cannot authorise a claim, or the pre-registration is decorative.

## 4. Per-event rows

All 28 rows are in `three-policy-benchmark.json`. `M_3600_LP` in USD; `CF` = `COUNTERFACTUAL`,
`OBS` = `OBSERVED`.

### 4.1 Scenario A — false rumour (0 swaps, 0 RPC range errors)

No economic row. A measured absence, reported rather than dropped or imputed; widening the window
is forbidden by T0.2's deviation log.

| Policy | Parameter | Status | Economics |
|---|---|---|---|
| `STATIC` | — | `CONSTANT_BASE_FEE` | none |
| `VOLATILITY_ONLY` | k = 2, 3, 5 | `INDETERMINATE` | none |
| `TINJAU` | 150, 200, 300 bps | `WATCH` | none |

Tinjau's confirmation leg is `UNAVAILABLE` at all three thresholds. **The rumour invariant holds**
— T0.4 §9 lists "Tinjau reaches `PROTECT` on scenario A" as a failure condition, and it does not.

### 4.2 Scenarios B, C, D — the economic rows

| Scenario | Policy | Parameter | Status | feeRevenue gross | `M_3600_LP` (pre-registered) | `M_3600_LP` (AMD-002, post-hoc) |
|---|---|---|---|---|---|---|
| B | `STATIC` | — | `CONSTANT_BASE_FEE` | 339.0950 `OBS` | **+229.7785** `CF` | +229.7785 `CF` |
| B | `VOLATILITY_ONLY` | k=2 | `TRIGGERED` | 10,071.6906 `CF` | **−2,203.3704** `CF` | +7,529.2252 `CF` |
| B | `VOLATILITY_ONLY` | k=3 | `TRIGGERED` | 10,071.6906 `CF` | **−2,203.3704** `CF` | +7,529.2252 `CF` |
| B | `VOLATILITY_ONLY` | k=5 | `TRIGGERED` | 10,071.6906 `CF` | **−2,203.3704** `CF` | +7,529.2252 `CF` |
| B | `TINJAU` | 150 / 200 / 300 bps | `WATCH` | 339.0950 `OBS` | **+229.7785** `CF` | +229.7785 `CF` |
| C | `STATIC` | — | `CONSTANT_BASE_FEE` | 21.5106 `OBS` | **+14.8909** `CF` | +14.8909 `CF` |
| C | `VOLATILITY_ONLY` | k=2 | `TRIGGERED` (2 episodes) | 641.5931 `CF` | **−140.1297** `CF` | +479.9528 `CF` |
| C | `VOLATILITY_ONLY` | k=3 | `TRIGGERED` | 473.7543 `CF` | **−98.1700** `CF` | +354.0736 `CF` |
| C | `VOLATILITY_ONLY` | k=5 | `TRIGGERED` | 427.2915 `CF` | **−86.5543** `CF` | +319.2266 `CF` |
| C | `TINJAU` | 150 / 200 / 300 bps | `WATCH` | 21.5106 `OBS` | **+14.8909** `CF` | +14.8909 `CF` |
| D | `STATIC` | — | `CONSTANT_BASE_FEE` | 22.9443 `OBS` | **+15.3307** `CF` | +15.3307 `CF` |
| D | `VOLATILITY_ONLY` | k=2 | `TRIGGERED` (2 episodes) | 758.6653 `CF` | **−168.5995** `CF` | +567.1215 `CF` |
| D | `VOLATILITY_ONLY` | k=3 | `TRIGGERED` | 409.1229 `CF` | **−81.2139** `CF` | +304.9646 `CF` |
| D | `VOLATILITY_ONLY` | k=5 | `TRIGGERED` | 584.9017 `CF` | **−125.1586** `CF` | +436.7988 `CF` |
| D | `TINJAU` | 150 / 200 / 300 bps | `NORMAL` | 22.9443 `OBS` | **+15.3307** `CF` | +15.3307 `CF` |

Tinjau's rows are identical to `STATIC`'s in every column, on every scenario, at every threshold —
the direct consequence of never leaving the base fee. Asserted as an equality by test, because
"Tinjau matched the do-nothing policy" is the result, not a rounding artefact.

Behaviour on every Tinjau row: 0 triggers, `maxFeeReached` 500 pips, `actionLatency` null,
`protectionDuration` 0 s, `timeToDecay` null. Volatility's trigger times, durations, per-horizon
coverage, distributions and tail concentration are in `../04-planning/t5-1-t5-2-baselines.md` §3
and in the JSON.

### 4.3 Why Tinjau declined, per scenario

| Scenario | State | Confirmation | Reason codes |
|---|---|---|---|
| A | `WATCH` | `UNAVAILABLE` | `SINGLE_SOURCE`, `DUPLICATE_SYNDICATION`, `NO_OFFICIAL_CONFIRMATION`, `INSUFFICIENT_SAMPLE`, `MARKET_DATA_UNAVAILABLE`, `REFERENCE_MARKET_CLOSED` |
| B | `WATCH` | `NOT_CONFIRMED` | `OFFICIAL_FILING`, `BONDED_EVIDENCE_PASSED`, `ANTI_WICK_FAILED`¹, `MARKET_NOT_CONFIRMED`, `STALE_EVIDENCE`, `DUPLICATE_SYNDICATION` |
| C | `WATCH` | `NOT_CONFIRMED` | `SINGLE_SOURCE`², `NO_OFFICIAL_CONFIRMATION`, `MARKET_NOT_CONFIRMED`, `DUPLICATE_SYNDICATION` |
| D | `NORMAL` | `NOT_CONFIRMED` | `NON_MATERIAL_EVENT`, `OFFICIAL_FILING`, `BONDED_EVIDENCE_PASSED`, `ANTI_WICK_FAILED`¹, `MARKET_NOT_CONFIRMED`, `THIN_EXIT_DEPTH` |

¹ Present at 150 and 200 bps; absent at 300 bps, where the drawdown never clears the floor so
anti-wick is never reached. The state is unchanged at all three.
² C's two apparent origins collapse to one under T1.2's self-revision rule.

**The grid earns its keep here.** The state is identical at 150, 200 and 300 bps on every scenario,
so the result demonstrably does not hang on the one threshold a reviewer would most suspect. That
is what a sensitivity grid is for, and it is the first time AMD-001 has had anything to report.

## 5. The comparison and the claim gate

72 cells: 4 scenarios × 3 `k` × 3 `minDrawdownBps` × 2 metric bases. Every one is in the artifact.
T0.4 §8.5 forbids publishing a favourable subset, and the verdict distribution is pinned by test on
**both** bases — including the one on which Tinjau loses everything.

### 5.1 Verdict distribution

| Metric basis | vs `STATIC` | vs `VOLATILITY_ONLY` | Cells |
|---|---|---|---|
| Pre-registered | `TINJAU_TIES` | `TINJAU_BEATS` | 27 |
| Pre-registered | `NOT_COMPARABLE` | `NOT_COMPARABLE` | 9 (scenario A) |
| **AMD-002 post-hoc** | `TINJAU_TIES` | **`TINJAU_LOSES`** | **27** |
| AMD-002 post-hoc | `NOT_COMPARABLE` | `NOT_COMPARABLE` | 9 (scenario A) |

Scenario A's cells are `NOT_COMPARABLE` because the volatility baseline is `INDETERMINATE` there.
T0.4 §6.2 distinguishes `INDETERMINATE` from "did not trigger", so scoring it as a Tinjau win would
manufacture a victory out of missing data.

### 5.2 `canClaimLossAvoided` = **false**

| # | Condition (T0.4 §8.6, tightened by AMD-001) | Result |
|---|---|---|
| 1 | the scenario has a non-null economic row | **pass** — 3 of 4 (A has zero swaps) |
| 2 | Tinjau beats both `STATIC` and `VOLATILITY_ONLY` at every `k` and every threshold | **FAIL** — 27 of 27 comparable cells are `TINJAU_TIES` against `STATIC` |
| 3 | the margin exceeds the best-worst `k` spread for `VOLATILITY_ONLY` | not evaluable — condition 2 failed, so there is no margin. Spreads recorded anyway: B $0.0000, C $53.5754, D $87.3856 |
| 4 | the frozen threshold configuration was not modified after any result was seen | **process fact, not a computation** — reported as such rather than dressed up as a machine check |

Condition 2 fails for a substantive reason, not a technicality: Tinjau never protected, so it did
nothing that `STATIC` did not also do. The loss-reduction claim stays disabled per tracker §1.

On condition 4, what *can* be stated: the promotion and confirmation configs are the frozen
T1.2/T3.3 versions, recorded in every Tinjau row's `ruleVersions`; the only value varied is
`minDrawdownBps`, whose grid was recorded as AMD-001 before any T5 result existed; AMD-002 added a
metric, not a threshold, and is excluded from this gate.

## 6. Findings

### 6.1 Tinjau's result is restraint, not protection

Across four events and three thresholds, Tinjau raised the fee zero times. Scenario B — the
confirmed-event showcase, a real 8-K with a bonded, hash-pinned primary document — resolves to
`WATCH` because its 235 bps drawdown does not persist: the pool dipped and bounced, retaining 13%
after five minutes. That is T3.3's published finding, unchanged and unrescued.

So the defensible claim from this benchmark is narrow: **Tinjau declined to act on two large price
moves because neither had a qualifying cause, and on one of them a volatility-only policy traded at
every `k` in the grid.** That is a finding about restraint. It is not a demonstration of protection,
and no artifact may present it as one.

### 6.2 The comparison's sign is decided by the metric, not by the data

Every one of the 27 comparable cells flips from `TINJAU_BEATS` to `TINJAU_LOSES` between the two
metric bases — same trades, same triggers, same fee schedules. Neither basis is clean:

- the **pre-registered** metric debits a counterfactual fee it never credits, so it mechanically
  penalises any fee-raising policy;
- the **AMD-002** basis credits counterfactual fee revenue assuming zero flow elasticity, so it
  mechanically rewards any fee-raising policy.

**On markout, this benchmark cannot currently determine which policy did better.** It brackets the
answer, and the bracket spans the sign. Stating that is more useful than picking the half that
flatters the product, and it is pinned as a test so it cannot quietly stop being said.

What the benchmark *can* determine is behavioural, and is unaffected by the metric question:
whether a policy fired, when, on what, and whether the event warranted it.

### 6.3 Carried forward from T5.1 / T5.2, not dropped

**The volatility baseline fires on the neutral control at every `k`.** Scenario D is a routine
insider Form 4, pre-registered `NORMAL` with `mustHoldRegardlessOfMarketData: true`. The volatility
baseline triggers at 2, 3 and 5 — a false positive at every point in the grid — while Tinjau
declines it twice over, on materiality and on persistence. This arrives from the control rather than
the showcase, which is what makes it credible, and it is the mechanism T3.2 predicted when it
measured D's max drawdown (241 bps) above B's (235 bps): **market data alone cannot distinguish a
material event from a routine one.**

**`M_0` is not "structurally >= 0"** as T0.4 §4 and `markout-study.md` §1.3 both state. False for
**216 of 4,777 swaps** — 153 of 4,145 in B, 63 of 367 in D, none in C — and every offender is
larger than the median trade. Valued at the post-trade price, `M_0` is the fee earned minus the cost
of executing at an average price worse than the post price; the fee scales with size, the curve cost
with size² / liquidity, so on a pool this thin a large enough trade flips the sign. It matters
because "M_0 >= 0" invites the reading that any negative markout must be adverse selection; part of
it is ordinary curve slippage.

### 6.4 Two of T0.4 §9's five failure conditions are cleared; one is now unreachable

§9 fixed five ways Tinjau could fail, so they could not be redefined later:

| Condition | Outcome |
|---|---|
| Tinjau promotes on scenario D (routine Form 4) | **cleared** — `NORMAL` at every threshold, refused on materiality |
| Tinjau reaches `PROTECT` on scenario A (rumour) | **cleared** — `WATCH` at every threshold |
| Tinjau does not beat `VOLATILITY_ONLY` on `M_3600_LP` at one or more `k` | pre-registered basis: beats at every `k`. AMD-002 basis: loses at every `k`. See §6.2 |
| Tinjau's advantage on B disappears without the single largest swap | **not reachable** — Tinjau has no advantage on B to test; it ties `STATIC` |
| Tinjau's advantage exists only at one `k` | **not reachable** — same reason |

The last two cannot be evaluated because the policy never acted. That is reported as unreachable
rather than as passed.

## 7. Limitations

1. **The counterfactual limitation stands unchanged** (T0.4 §5). Every row re-prices the *same*
   observed swap sequence under a different fee schedule. Fee revenue is overstated for any
   fee-raising policy; the adverse-selection benefit is understated; **the net sign is
   undetermined**. These results may not be described as conservative. AMD-002 does not fix this —
   §3.4.
2. **Three economic scenarios, one asset, one pool, a market weeks old.** No sentence built on
   these rows may imply a general result about tokenized equities.
3. **Tinjau never acted, so the protecting branch of its fee schedule is untested by observation.**
   It is covered by a *constructed* test, labelled as constructed so it is never read as a result.
4. **The assessment instant is the window end.** If Tinjau ever did promote on one of these
   windows, protection would begin at the window end and almost no swaps would be re-priced. The
   economic comparison for a promoting Tinjau is therefore not measurable on these windows without
   a rolling-assessment method the pre-registration does not contain.
5. **`TVL_event` exists only for scenario D** (215,311.15 USD, from P2.4's archive measurement at
   the same block). "bps of TVL" is null for A, B and C rather than imputed.
6. **The volatility baseline's reference window is 29% covered at best** — a 24-hour reference
   cannot exist inside a 7-hour replay window. Disclosed per row; see the baselines doc §5.2.
7. **The pool is extraordinarily thin.** Fee-revenue figures in the thousands of USD come from
   re-pricing $678k of notional at 2% on a pool where T3.2 measured only 0.53–2.29 wNVDAx as
   provably quotable. Those numbers are arithmetic, not achievable revenue.
8. **Nothing here is deployed.** No address, no transaction. This is a mainnet *replay* of a
   third-party pool; Tinjau's own testnet action is a different pool and the two are never combined
   into one figure.

## 8. Reproduction

```bash
cd apps/server
npx tsx src/benchmark/emit.ts     # rewrites three-policy-benchmark.json, byte-identically
npx tsx --test 'test/benchmark*.test.ts'   # 81 tests
pnpm test                          # full suite, 556 tests
pnpm typecheck
```

No network access, no credentials, no deploy. Every input is a committed fixture. Re-running `emit`
produces a byte-identical file, so an empty diff after a rerun is meaningful evidence rather than a
coincidence.
