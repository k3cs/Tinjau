# T5.1 / T5.2 — the two baseline policies

- Date: 2026-08-21
- Tasks: T5.1 (static-fee baseline), T5.2 (volatility-only baseline)
- Depends on: T0.4 (`t0-4-benchmark-preregistration.md`), T0.2 (frozen scenarios)
- Owner: external non-frontend AI agent
- Code: `apps/server/src/benchmark/`
- Tests: `apps/server/test/benchmark{Markout,VolatilityBaseline,Baselines}.test.ts` — **50 tests, 50 pass**

> **Extended, not superseded.** The Tinjau arm, the three-policy comparison, the claim-gate result
> and amendment AMD-002 are in `../05-build/three-policy-benchmark.md`. This document is left
> exactly as written, before any comparison existed, because that is part of the evidence: every
> choice recorded in §5 below was made without a comparison to steer it. The baseline figures here
> are unchanged by the later work; AMD-002 adds a second metric alongside the frozen one and
> changes nothing reported here.

## 0. Scope limit, stated first

This document contains **no Tinjau row and no comparison of any kind**. Not a difference, not a
ranking, not a "which won". T5.3 (replay runner) and T5.4 (outcome calculation) own the
comparison and depend on T4.5, which is not finished.

The reason is not procedural tidiness. With a comparison visible, every remaining implementation
choice — the estimator, the coverage rule, the tie-breaks — acquires a direction, and there is no
way afterwards to demonstrate it did not. The pre-registration exists to prevent exactly that, so
the baselines stop at their own per-event rows.

`apps/server/src/benchmark/index.ts` enforces this: the artifact carries only `STATIC` and
`VOLATILITY_ONLY` rows, and a test walks every key in the serialised artifact rejecting any that
reads like a comparison.

## 1. What was built

| File | Role |
|---|---|
| `envelope.ts` | the frozen fee envelope, read from `benchmark-preregistration.json`; the shared widen-and-decay curve |
| `replayInput.ts` | the one shared replay input, plus its fingerprint |
| `markout.ts` | per-swap markout and fee revenue, formulas reused from P2.4 |
| `staticPolicy.ts` | **T5.1** |
| `volatilityPolicy.ts` | **T5.2** |
| `score.ts` | turns a fee schedule into a marked, unit-carrying result row |
| `index.ts` | `runBaselines()` — the deterministic versioned artifact |

Nothing outside `src/benchmark/` was created or modified. `src/market/**` and `src/studies/` were
read only. No new field was requested in the orchestrator-owned shared vocabulary.

### 1.1 Identity of inputs is structural (T5.1's acceptance criterion)

T5.1 requires the static baseline to replay "the same trades, liquidity, timestamps, costs, and
initial state as the other policies". That is made structural rather than remembered:

- `loadReplayInput(scenarioId)` is the **only** constructor. A policy takes a `ReplayInput` it
  cannot build for itself, so it has no second place to get a trade list, a starting fee or a
  protocol-fee share from.
- Every row carries the input's **`fingerprint`** (sha256 over trades, window, anchor, envelope,
  costs and initial state). Two rows claiming the same replay with different fingerprints is a
  mechanical contradiction, so a later refactor that re-slices a window fails rather than shifts.
- The loader cross-checks the captured pool fixture against the frozen scenario's declared window
  and **throws** on mismatch.
- A test asserts `M_0` is identical across policies for a scenario. `M_0` depends only on the
  trades, so a difference would mean the policies saw different data.

### 1.2 Evidence blindness is structural (T5.2's core requirement)

T0.4 §6.2 forbids any filing, news, rumour, event-type, market-hours or corporate-action input
reaching the volatility baseline. A comment would not survive one careless edit, and the damage
would be invisible — the baseline would simply look better. Three independent mechanisms:

1. **The input type cannot be satisfied.** `VolatilityOnlyInput` is branded with a module-private
   `unique symbol`. No code outside `volatilityPolicy.ts` can write a literal of that type;
   `projectVolatilityOnlyInput` is the only constructor, and it builds a fresh object from a fixed
   key list rather than spreading and deleting. Pinned by a `@ts-expect-error` test, so removing
   the brand fails `tsc --noEmit`.
2. **The projection is numeric-only.** `assertMarketOnly` enforces exact key-set equality and
   requires every leaf to be a finite number, at construction *and* on every run. A string, enum,
   nested object or extra field throws. Ten leak shapes are covered by test, including a decision
   anchor smuggled in as a bare number.
3. **The anchor is withheld.** The decision anchor is a filing timestamp — evidence, though
   numeric — so it is absent from the projection. `actionLatency` is computed by the scoring layer
   *after* the policy returns. A test shifts the anchor by 9,999 s and asserts the policy's output
   is byte-identical.

The strongest proof is the fourth test: a full evidence payload (source class, event type,
accession number, claim ids, risk state, materiality) is attached to the replay input, and the
policy's output is **byte-identical** to the clean run.

What is deliberately *not* withheld: the replay window itself is anchored on the event. T0.4 §1
requires identical windows for all three policies, so the boundaries are common ground rather than
a leak. The meaningful line is the raw anchor instant.

### 1.3 `k` is never chosen

`evaluateKGrid` is the only public evaluation entry point and always returns all three of
`k ∈ {2, 3, 5}`. There is no single-`k` code path that could be used to publish one row. Tests
assert every scenario carries exactly three volatility rows and that the artifact's `kGrid` is
`[2,3,5]`.

### 1.4 The output shape can carry a grid

Rows are keyed by `(scenarioId, policyId, parameters)` where `parameters` is a **map**, not a
fixed `k` field. `STATIC` emits `{}`, volatility emits `{ k: 2 }`. Amendment AMD-001 extends the
same discipline to Tinjau's `minDrawdownBps` at 150/200/300, so T5.3 can emit
`{ minDrawdownBps: 150 }` rows into this shape with no schema change. A shape that could only hold
one value per policy would have made AMD-001's original mistake structural.

### 1.5 Determinism and markers

Every function is pure with respect to the fixtures on disk — no clock, no network, no randomness.
Tests assert `JSON.stringify(runBaselines())` is identical across runs, and that the volatility
policy is byte-stable per scenario.

Every number carries a unit and a `basis`. Scenario-level metrics are `{ value, unit, basis }`
objects so the three cannot separate in transit; per-swap rows are columnar with a
`perSwapColumns` descriptor giving each column its own name, unit and basis — the same convention
the pool fixtures already use. A test walks the whole artifact and fails on any marked value
missing a unit, missing a basis, or holding a bare `null` without a stated reason.

## 2. Per-event rows — `STATIC` (T5.1)

Fee is 500 pips (0.05%) on every swap. Primary metric is `M_3600_LP`.

| Scenario | Swaps | feeRevenue gross (USD) | M_3600_LP (USD) | bps of notional | bps of TVL |
|---|---|---|---|---|---|
| A — false rumour | 0 | — | — | — | — |
| B — confirmed event | 4,145 | 339.0950 `OBSERVED` | +229.7785 `CF` | +3.3876 `CF` | null |
| C — ambiguous | 265 | 21.5106 `OBSERVED` | +14.8909 `CF` | +3.4620 `CF` | null |
| D — neutral control | 367 | 22.9443 `OBSERVED` | +15.3307 `CF` | +3.3354 `CF` | +0.7120 `CF` |

`CF` = `COUNTERFACTUAL`. Behaviour on every row: 0 triggers, `maxFeeReached` 500 pips
`OBSERVED`, `actionLatency` null, `protectionDuration` 0 s, `timeToDecay` null.

Scenario A carries **no economic row**: 0 swaps, 0 RPC range errors — a measured absence. T0.4 §3
requires it reported rather than dropped or imputed; T0.2's deviation log forbids widening the
window. Asserted by test for all four of A's rows.

## 3. Per-event rows — `VOLATILITY_ONLY` (T5.2), all three `k`

| Scenario | k | Status | Triggers | actionLatency (s) | feeRevenue gross (USD) | M_3600_LP (USD) | bps of notional | False-positive label |
|---|---|---|---|---|---|---|---|---|
| A | 2 | `INDETERMINATE` | 0 | null | — | — | — | `NO_ECONOMIC_ROW` |
| A | 3 | `INDETERMINATE` | 0 | null | — | — | — | `NO_ECONOMIC_ROW` |
| A | 5 | `INDETERMINATE` | 0 | null | — | — | — | `NO_ECONOMIC_ROW` |
| B | 2 | `TRIGGERED` | 1 | −2,520 | 10,071.6906 | −2,203.3704 | −32.4845 | `NOT_DETERMINABLE` |
| B | 3 | `TRIGGERED` | 1 | −2,520 | 10,071.6906 | −2,203.3704 | −32.4845 | `NOT_DETERMINABLE` |
| B | 5 | `TRIGGERED` | 1 | −2,520 | 10,071.6906 | −2,203.3704 | −32.4845 | `NOT_DETERMINABLE` |
| C | 2 | `TRIGGERED` | 2 | −3,120 | 641.5931 | −140.1297 | −32.5792 | `NOT_DETERMINABLE` |
| C | 3 | `TRIGGERED` | 1 | +2,880 | 473.7543 | −98.1700 | −22.8239 | `NOT_DETERMINABLE` |
| C | 5 | `TRIGGERED` | 1 | +2,940 | 427.2915 | −86.5543 | −20.1233 | `NOT_DETERMINABLE` |
| D | 2 | `TRIGGERED` | 2 | −3,000 | 758.6653 | −168.5995 | −36.6807 | **`FALSE_POSITIVE`** |
| D | 3 | `TRIGGERED` | 1 | +6,900 | 409.1229 | −81.2139 | −17.6690 | **`FALSE_POSITIVE`** |
| D | 5 | `TRIGGERED` | 1 | +19,680 | 584.9017 | −125.1586 | −27.2296 | **`FALSE_POSITIVE`** |

All fee-revenue and markout figures are `COUNTERFACTUAL`. `maxFeeReached` is 20,000 pips
`COUNTERFACTUAL` on every triggered row and 500 pips on every `INDETERMINATE` row.

Trigger detail (`rv_short`, `rv_ref` dimensionless log-return units over 15 min):

| Scenario | k | ratio at first trigger | rv_short | rv_ref | grid position |
|---|---|---|---|---|---|
| B | 2 / 3 / 5 | 8.31 | 2.933e−2 | 3.530e−3 | 18 min into the window |
| C | 2 | 2.99 | 3.917e−5 | 1.311e−5 | 8 min |
| C | 3 | 4.24 | 2.242e−4 | 5.287e−5 | 108 min |
| C | 5 | 6.04 | 3.207e−4 | 5.310e−5 | 109 min |
| D | 2 | 2.17 | 2.601e−3 | 1.200e−3 | 10 min |
| D | 3 | 3.13 | 2.922e−3 | 9.323e−4 | 175 min |
| D | 5 | 5.20 | 6.424e−3 | 1.235e−3 | 388 min |

Duration and recovery:

| Scenario | k | protectionDuration (s) | timeToDecay (s) |
|---|---|---|---|
| B | 2 / 3 / 5 | 21,600 | 21,600 |
| C | 2 | 24,420 (two episodes) | 21,600 (first episode) |
| C | 3 | 18,720 | null — window ends before recovery |
| C | 5 | 18,660 | null — window ends before recovery |
| D | 2 | 23,820 (two episodes) | 21,600 (first episode) |
| D | 3 | 14,700 | null — window ends before recovery |
| D | 5 | 1,920 | null — window ends before recovery |

Reference coverage, reported per row because no window can supply the pre-registration's assumed
24 hours:

| Scenario | rv_short estimable | ratio evaluable | max reference span | of 86,400 s |
|---|---|---|---|---|
| A | 0 / 421 | 0 | 0 s | 0% |
| B | 420 / 421 | 418 | 25,140 s | 29.1% |
| C | 366 / 421 | 364 | 24,840 s | 28.8% |
| D | 372 / 421 | 370 | 24,900 s | 28.8% |

Distribution and tail concentration are computed on every economic row (T0.4 §8.2–§8.3). The
sharpest tail figure: on scenario D at k=3 the **single worst swap supplies 49.8%** of the
window's total markout loss, and at k=5, 37.6%. Under `STATIC` the window total is positive, so a
"share of a loss" is undefined and the field is null with the reason attached rather than printed
as a misleading percentage.

## 4. Findings

### 4.1 `M_3600_LP` is a monotone decreasing function of realised fee revenue

This is the most important thing in this document and it needs an orchestrator decision **before**
T5.3/T5.4 publish anything.

T0.4 §4 states: "`feeRate` is the fee the policy under test would have charged on that swap …
**This is the single place where the three policies diverge arithmetically.**" `feeRate` appears
in exactly one term, the protocol haircut. Therefore:

```text
M_h      = dU + dS * P_h                 # identical for every policy
haircut  = 0.25 * feeRate * |inputUSD|   # the only policy-dependent term
M_h_LP   = M_h - haircut
```

Raising the fee strictly *lowers* `M_h_LP`. Verified numerically, not just algebraically: on
scenario B the entire markout gap between the two baselines is 2,433.15 USD, which equals exactly
0.25 × the fee-revenue gap (10,071.6906 − 339.0950). To the last decimal, the markout difference
**is** the haircut difference.

Two consequences:

- `M_3600_LP` cannot rank fee policies on protection quality. It measures −0.25 × fee revenue plus
  a policy-independent constant.
- **`canClaimLossAvoided` (T0.4 §8.6) is structurally unreachable** for any policy that ever
  raises a fee, because it requires `TINJAU` to beat `STATIC` on `M_3600_LP` at every `k`, and
  `STATIC` — never raising a fee — always has the largest `M_3600_LP` of any policy on the same
  trades.

This is not a bug in the implementation and I have not worked around it. It is a property of the
frozen method, and I lack the authority to change a frozen method after results exist. It needs an
amendment recorded in the tracker before T5.4 publishes, and the honest options are narrow: either
accept that the claim gate is closed by construction (which is a defensible outcome and consistent
with T0.4 §9), or amend the method — in which case §6.4 of the pre-registration voids prior results
and the whole benchmark is re-run and re-labelled.

I did not attempt the obvious "fix" of recomputing `dU`/`dS` under a different fee split. That
would change the frozen arithmetic on my own initiative, after seeing results, in the direction
that makes fee-raising policies look better.

### 4.2 `M_0` is not "structurally >= 0"

T0.4 §4 and `markout-study.md` §1.3 both annotate `M_0 = dU + dS * P_post` as "fee plus curve
premium, structurally >= 0". Measured over the full swap population rather than P2.4's
first-trade-only sample, it is false for **216 of 4,777 swaps**: 153 of 4,145 in scenario B and 63
of 367 in D, none in C.

Valued at the post-trade marginal price, `M_0` is the fee earned minus the cost of having executed
at an average price worse than the post price. The fee scales with size; the curve cost scales
roughly with size² / liquidity. On a pool this thin, a large enough trade flips the sign. Every
swap with `M_0 < 0` is larger than the median trade (asserted by test); P2.4's sample had a median
notional near $105 while the offenders here carry notionals in the thousands.

It matters because "M_0 >= 0" invites the reading that any negative markout must be adverse
selection. Part of it is ordinary curve slippage on a large trade. Pinned by test as a
measurement, not silently absorbed.

### 4.3 The volatility baseline fires on the neutral control at every `k`

Scenario D is a routine insider Form 4 whose pre-registration is unconditional `NORMAL` with
`mustHoldRegardlessOfMarketData: true`. The volatility baseline triggers on it at `k = 2`, `3` and
`5`, so the row is labelled `FALSE_POSITIVE` at every grid point.

This is what T3.2's finding predicted — D's measured max drawdown (241 bps) exceeded B's (235 bps),
so a policy watching price alone was always liable to fire on the control. The result is recorded
as measured. **No comparison to Tinjau is drawn here**; the argument that could be built from it
belongs to T5.4.

Labels are attached by the scoring layer *after* the policy returns, from the frozen scenario's own
pre-registration. B and C stay `NOT_DETERMINABLE`: B's expectation is conditional on market
confirmation and C's is explicitly undecided, so labelling either would need a judgement the freeze
withholds. `falsePositive.costUsd` is deliberately `null` — costing it means differencing two
policies' markout, which is T5.4's comparison.

### 4.4 The baseline fires before the anchor on three of four scenarios at `k = 2`

At `k = 2`, B, C and D all trigger 8–18 minutes into the window, which is *before* the decision
anchor (the window starts at anchor − 60 min). `actionLatency` is negative and is reported as-is
rather than clamped.

Two contributing causes, and they should be read together:

- Early in a window the strictly-trailing reference median is built from very few observations, so
  it is easy to exceed. This is an artefact of applying a 24-hour reference to a 7-hour window
  (§5.2), not a property of the market.
- Scenario B's first trigger is nonetheless a genuine burst: `rv_short` was **8.31×** the reference,
  far above even `k = 5`, during the pre-market hour before an 8-K. That one is not an artefact.

I did not add a warm-up period or a minimum-coverage gate to suppress the early triggers. Both
would be thresholds invented after seeing this result, and both would push in the direction that
flatters Tinjau by silencing its only competitor. Coverage is disclosed on every row instead, so a
reviewer can apply their own rule to published numbers.

### 4.5 `TVL_event` is unavailable for three of four scenarios

T0.4 §7 defines `TVL_event` as pool balances at the anchor block via archive `eth_call`. That
cannot be derived from swap logs and this work makes no network calls. Scenario D's anchor block is
the same block P2.4 measured independently, so its recorded `tvl_event_usd` (215,311.15) is reused
with provenance. A, B and C report `null` with the reason. "bps of TVL" is therefore available only
for D. Filling B and C needs an archive call, which is T5.3/T5.4's to make.

## 5. Where the pre-registration was under-specified, and how it was resolved

This section matters more than the code. An under-specified pre-registration is a hole a later
result can slip through, so every choice I had to make is named here with its direction of effect.

### 5.1 The realised-volatility estimator is not defined

T0.4 §6.2 says "realised volatility of pool mid-price over a trailing 15-minute window" without
naming an estimator.

**Resolved as** the square root of the sum of squared log returns between consecutive observations
in the window. No mean subtraction, no annualisation — both add a parameter without adding
information at this horizon. Returns `null`, never `0`, when fewer than two observations exist, so
"no estimate" stays distinguishable from "an estimate of zero".

**Direction of effect:** neutral. Any monotone volatility estimator would order the same windows
similarly; the trigger is a ratio, so scale conventions cancel.

### 5.2 A 24-hour reference window cannot exist inside a 7-hour replay window

T0.4 §6.2 sets `referenceWindow = 86,400 s`. The frozen replay windows are 25,200 s (anchor − 60 min
to anchor + 6 h) and T0.2 forbids widening them. **No scenario can supply the specified reference.**

**Resolved as** taking the median over whatever trailing data exists, and reporting
`maxReferenceCoverageSec` and `maxReferenceCoverageRatio` on every row (28.8–29.1% for B, C and D).

**Direction of effect and why this direction:** the alternative — refusing to estimate without full
coverage — would mark all four scenarios `INDETERMINATE` and delete the volatility baseline from
the benchmark entirely. That is the direction that flatters Tinjau, by silencing its only
competitor. Estimating-and-disclosing is the direction that keeps the comparator speaking. I chose
the permissive direction deliberately and state that reasoning so it can be challenged.

**Residual risk:** an early-window reference built from few observations is easy to exceed
(§4.4). Disclosed, not suppressed.

### 5.3 `MIN_REFERENCE_OBSERVATIONS` is my number, not the pre-registration's

Set to **2**, the smallest count for which a median is not simply the single sample itself. No
larger coverage threshold is imposed. Any larger number would be invented after the pre-registration
and, per §5.2, would silence thin windows. Coverage is published so a reviewer can apply a stricter
rule to the numbers as they stand.

### 5.4 §6.2's parenthetical expects scenario C to be `INDETERMINATE`; the stated rule does not

T0.4 §6.2 writes "(scenario C is thin, scenario A is empty)" while parenthesising its degenerate-input
rule. The **rule** is "too few trades to estimate `rv_ref`". Scenario C has 265 swaps over 7 hours;
`rv_short` is estimable at 366 of 421 grid points, so the rule does not force `INDETERMINATE`.

**Resolved as** implementing the rule, not the parenthetical guess. C reports `TRIGGERED`.

I considered gating on the existing `THIN_WINDOW_SWAP_THRESHOLD = 420` from `poolTelemetry.ts`
(frozen before any T5 result, and which flags both C and D as `THIN`). Rejected for two reasons:
its own documentation says it "only ever attaches a warning label, it never gates a promotion", so
using it as a gate would repurpose a threshold; and it would also silence scenario D, removing the
one false-positive measurement the benchmark has. Both effects are outcome-relevant, in opposite
directions, which is precisely why I did not want to be the one choosing.

**Flagged for the orchestrator**: if the T0.4 author intended C to be `INDETERMINATE`, that is a
method clarification and should be recorded as a deviation before T5.4 publishes — not decided by
me now that C's rows exist.

### 5.5 The `rv_short` sampling scheme is not specified

**Resolved as** a fixed 60-second clock grid, not sampling at each trade. A trade-sampled median is
weighted by trade arrival, so a busy hour contributes more observations and drags the reference
toward busy-period volatility. A clock grid makes the reference a time-median, independent of how
flow clustered.

**Direction of effect:** trade-sampling would raise the reference in busy windows and make triggers
*less* likely there. The clock grid is the more neutral choice, not the more permissive one.

### 5.6 "Trailing" is ambiguous about whether the current observation is included

**Resolved as** strictly trailing (`s < t`). An observation is not part of its own baseline;
including it would damp the very spike the trigger exists to detect. Pinned by test.

### 5.7 A zero reference median is not addressed

If `rv_ref = 0`, then `rv_short >= k * 0` is trivially true for any positive `rv_short` — a
degenerate automatic trigger.

**Resolved as** treating the ratio as undefined at that grid point and not evaluating the trigger
there. If *no* grid point in a window ever has an evaluable ratio, the window is `INDETERMINATE`
with a reason distinguishing it from the zero-swap case. A test exercises this branch on a
synthetic flat price path. Zero such points occurred in any frozen scenario.

### 5.8 Re-triggering during an active episode is not addressed

T0.4 §6.2 gives the response to *a* trigger but not what happens if the condition fires again while
the fee is still widened or decaying.

**Resolved as**: triggers are only evaluated when the fee is back at base. A trigger inside an
active episode does not extend it. This mirrors T1.4's no-ratcheting rule, where refreshing an
assessment cannot push the duration cap forward. C and D at `k = 2` each produce two episodes,
because the second fired after the first had fully recovered.

**Direction of effect:** conservative. Allowing extension would raise the fee-raising policy's
realised fee revenue and, per §4.1, lower its markout further.

### 5.9 `feeRevenue` has no formula

§7 lists `feeRevenue` in USD but §4 gives an arithmetic definition only for the haircut.

**Resolved as** `feeGross = feeRate * |inputUSD|` and `feeToLp = (1 − 0.25) * feeGross`, using the
**same** `inputUSD` definition §4 gives for the haircut (`dU` if `dU > 0` else `dS * P_post`), so
the two are consistent by construction. Under `STATIC` this is the fee the pool actually charged,
which is what makes §6.1's reconciliation check meaningful. Both gross and LP-share are reported.

### 5.10 §7 marks `STATIC`'s markout `COUNTERFACTUAL` but its fee revenue `OBSERVED`

The table carves `STATIC` out of "counterfactual" for `feeRevenue` and does not do so for
`M_3600_LP`, although under `STATIC` the markout uses the pool's real fee rate and is arguably as
observed as the fee revenue is.

**Resolved as** following §7 literally. Re-labelling a published metric after the method was frozen
is exactly the kind of after-the-fact adjustment the pre-registration forbids. The discrepancy is
recorded here and pinned by test.

### 5.11 The brief pointed at `apps/server/src/studies/` for the P2.4 markout code

That directory holds parse-accuracy and scoreboard-reaction studies. The P2.4 markout method is
Python, at `docs/buildx-orion-2026/outputs/05-build/data/p2_4_markout_method.py`, with results in
`p2_4_markout_raw.jsonl`.

**Resolved as** porting from the Python method and then *proving* the port. Scenario D's anchor
block is the same block P2.4 measured independently in August, so its recorded row is an external
fixture this implementation reproduces field for field — `dU`, `dS`, `P_post`, `M_0`, the haircut,
and `M_h`, `M_h_LP`, `P_h` and `later_swap_count_by_h_*` at all five horizons, all matching to
1e−12 relative. The coverage counts are the sharpest part of that check: they are sensitive to
P2.4's "strictly greater block number" rule, which excludes same-block later-`logIndex` swaps.

`priceFromSqrtPriceX96` and `swapAmounts` are imported from `market/poolTelemetry.ts` rather than
copied, because a second, subtly different price function would make every cross-reference between
the studies meaningless.

### 5.12 The horizon window is not bounded in T0.4

P2.4 §1.3 used a fixed `[eb, eb+3600]` sweep; T0.4 §4 states only that `P_h` is the last swap at or
before `t* + h`.

**Resolved as** bounding lookups by the replay window. Near the window's end `t* + 3600` runs past
the last captured block and `P_h` falls back to what the window holds — the same truncation P2.4
documented, disclosed the same way, through `laterSwapCount` per horizon on every swap.

## 6. Limitations

1. **The counterfactual limitation stands unchanged** (T0.4 §5). Every row re-prices the *same*
   observed swap sequence under a different fee schedule, which embeds the false assumption that a
   higher fee would not have deterred any trade. Fee revenue is overstated for any fee-raising
   policy; the adverse-selection benefit is understated. The two biases oppose each other and **the
   net sign is undetermined**. These results may not be described as conservative. The artifact
   carries this text in a top-level field so it travels with the numbers.
2. **Three scenarios, one asset, one pool, a market weeks old.** No sentence built on these rows may
   imply a general result about tokenized equities.
3. **`TVL_event` for A, B and C is unavailable**, so "bps of TVL" exists only for D (§4.5).
4. **The reference window is 29% covered**, at best (§5.2).
5. **The pool is extraordinarily thin** — T3.2 measured 0.53–2.29 wNVDAx provably quotable within
   one tick range. Fee-revenue figures in the thousands of USD on scenario B come from re-pricing
   $678k of notional at 2%, on a pool where a $500 exit is not quotable. That number is arithmetic,
   not a claim about achievable revenue.
6. **`src/benchmark/` imports from `src/market/poolTelemetry.ts`**, which another agent was editing
   concurrently. The import is deliberate (shared price arithmetic is required by T0.4) but it is a
   coupling: a change to `priceFromSqrtPriceX96`, `swapAmounts`, `decodeFixtureSwaps` or
   `SwapWindowFixture` breaks these tests, which is the intended failure mode.
7. **No artifact file is written to disk.** `runBaselines()` returns the versioned object; T5.3 owns
   emission and the frontend-handoff directory is orchestrator-owned.

## 7. Reproduction

```bash
cd apps/server
pnpm test            # full suite, 518 tests
npx tsx --test 'test/benchmark*.test.ts'   # the 50 tests for this task
pnpm typecheck
```

No network access, no credentials, no deploy. Every input is a committed fixture.
