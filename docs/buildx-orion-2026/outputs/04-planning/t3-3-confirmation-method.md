# T3.3 — Market-confirmation method

- Date: 2026-08-20; amended 2026-08-21 by T3.4
- Task: T3.3 (depends on T3.1, T3.2, T1.2 — all complete)
- Owner: external non-frontend AI agent
- Rule version: **`tinjau.confirm/2.0.0`** (was `tinjau.confirm/1.0.0`)
- Config: `apps/server/src/market/confirmationConfig.ts`
- Engine: `apps/server/src/market/confirm.ts`

**§1–§6 of this document were written before any frozen scenario's market data was scored.**
§7 records the results afterwards. §9 records the T3.4 amendment, made after §7 was known.

## 0. Amendment notice — rule 2.0.0 (2026-08-21)

T3.4 found two defects in this method's implementation and they are now closed. **No threshold
value in this document changed.** 200 bps, 300 s, 0.5 retention, 30 swaps, 2.0× and 300 bps are
all carried over untouched. What changed is the decision rule that consumes them:

1. **Anti-wick is a necessary condition for any `CONFIRMED`** (§6, F1). It previously gated the
   drawdown signal alone.
2. **Persistence is the median retention across the whole hold interval**, not the value at the
   single observation nearest trough + hold (§3.3a, F2).
3. A below-floor sample window emits `INSUFFICIENT_SAMPLE` rather than
   `MARKET_DATA_UNAVAILABLE`. Status is unchanged; only the reason is now accurate.

§7's four verdicts were re-run through the production adapter under 2.0.0 and are **unchanged**.
They are restated in §9.1 so no reader attributes a 1.0.0 verdict to 2.0.0 rules.

## 1. ⚠️ Partial-contamination disclosure

The brief for this task said the thresholds should be frozen blind, and that the author had
deliberately not been told the measured metrics for the four frozen windows.

**That precondition did not hold, and pretending otherwise would be worse than saying so.**

[Fakta] The author inherited a transcript containing T3.2's completion report, which includes a
summary table of measured values for all four windows (swap counts, open/close prices, max
drawdown in bps, volume, and exit depth). [Fakta] `poolTelemetry.ts` itself also carries
measured values in its source comments — for example the doc on `THIN_WINDOW_SWAP_THRESHOLD`
names scenario C's swap count, and the doc on the default probe sizes names the pool's
measured depth in base tokens.

[Inferensi] So "blind" is not an accurate description of how these thresholds were set, and
this document must not claim the same pre-registration guarantee that T0.4 earned. What
follows is the strongest available substitute, not an equivalent:

1. **Every threshold is anchored to something external to these four windows.** The anchors are
   the deployed hook's `maxFee`, T1.2's already-frozen freshness bound, X Layer's block rate,
   and the arithmetic of the window shape itself. §3 writes out each derivation chain.
2. **No threshold was selected by trying values and observing outcomes.** Each was derived once
   and written down before §7 was computed.
3. **Two thresholds are deliberately shape choices rather than tuned values** — the anti-wick
   retention fraction is one half, and the velocity ratio is a doubling. Neither has a finer
   gradation that could be defended, which makes them hard to fit even in principle.
4. **The derivation chains are written out so a reviewer can audit them for fitting.** If a
   threshold looks reverse-engineered, the argument for it is on the page to be attacked.

**Recommended action for Dien:** review §3 specifically for whether any threshold looks fitted
to the results in §7. The one most worth scrutinising is `minDrawdownBps`, because it is the
only threshold that separates the scenarios from one another.

[Inferensi] For T5, the mitigation that matters more than any of the above: the benchmark's
`k`-grid discipline already requires reporting the volatility baseline at three thresholds
rather than one. The same treatment should be extended here — see §8.

## 2. What confirmation is for

Confirmation answers one question: **is the market independently showing a consequence?**

It is not a second opinion on the evidence, and it cannot rescue evidence that failed. §0.7
requires qualifying evidence *first*; a market move with no material corporate event behind it
is a market observation, not a corporate event. The reverse is equally true and is the point of
the whole dual-confirmation design: a filing is a reason to look, not a licence to act.

Two structural properties, inherited from T3.1 and T3.2 and preserved here:

- **Neither data module can return `CONFIRMED`.** `okxReference.ts` and `poolTelemetry.ts` emit
  only `UNAVAILABLE` / `STALE` / `NOT_CONFIRMED`. The data layer cannot manufacture the one
  value that opens the aggressive fee path. This engine owns that decision and does not push it
  back down.
- **`CONFIRMED` is required by exact equality downstream.** `promote()` and the on-chain
  registry both compare against `Confirmed` exactly, never with an ordering comparison, so a
  future enum member cannot silently widen the gate.

## 3. The thresholds, and where each number comes from

### 3.1 Freshness — 900 seconds

Inherited verbatim from `FROZEN_PROMOTION_CONFIG.marketFreshnessSec`, frozen in T1.2.

Not re-derived, on purpose. `promote()` already re-checks freshness against this bound; two
different numbers for "how old is too old" would let a sample be fresh to one layer and stale
to the other, and the discrepancy would surface as an unexplainable state.

### 3.2 Drawdown — 200 bps

**Anchor: the deployed hook's `maxFee` of 20,000 pips = 2% = 200 bps.** That constant was
deployed at `0xbCb4B7…d8080` long before these scenarios existed.

The economic argument: the only action this confirmation can authorise is a fee rising to at
most 2%. Invoking a 2% fee against a dislocation smaller than 2% is incoherent — the defence
would cost the pool's counterparties more than the exposure it answers. So the natural floor
for "worth protecting against" is where the observed dislocation matches what the maximum
permitted fee could itself recover.

[Inferensi] This ties the confirmation threshold to the action's own economics rather than to
an arbitrary volatility percentile, which is what makes it defensible without a calibration
dataset. It is also the threshold most worth auditing for fitting (§1).

### 3.3 Anti-wick hold — 300 seconds, 0.5 retention

**Anchor: X Layer's block rate of one block per second**, verified exact across the frozen
range in T0.2.

A wick is by definition a transient touch. Requiring the extreme to still hold five minutes
later means ~300 independent blocks must pass without the move retracing — a single trade, a
single block, or a brief cascade cannot satisfy it.

Five minutes is also cheap: the deployed policy holds a widened fee for 3,600s, so spending
300s establishing that the move is real costs about 8% of the protection window.

The retention fraction is **one half** — a shape choice, not a tuned value. Requiring the full
move to persist would be wrong for a pool where a single ordinary trade moves the price several
bps; requiring a token fraction would let a near-complete retrace pass as persistence.

This is the mechanism that satisfies the acceptance criterion *"no single short-lived price
spike is sufficient"*. It is a hard gate, not a score. **Under 2.0.0 it gates the whole verdict**
— see §6 and §9.

### 3.3a How persistence is measured: median, not minimum (amended, rule 2.0.0)

Rule 1.0.0 read **one** observation, the first at least 300 s after the trough, and computed
retention from it. [Fakta] T3.4 measured the consequence on two paths differing by a single
trade: the control retained 0% and refused; adding one momentary re-dip at that instant retained
98% and fired the drawdown signal. "Persisted" meant "was dislocated at one moment".

2.0.0 computes retention at **every** observation strictly after the trough and no later than
trough + 300 s, and takes the **median**.

**Why the median and not the minimum.** Both are shape choices with no finer gradation to fit,
and either closes F2. They ask different questions:

- The **minimum** asks *"was the dislocation never interrupted?"* — a one-sided question. On a
  pool this thin a single counter-trade (an ordinary large buy, a stale-liquidity print, an
  upward wick) can retrace much of the fall for one observation, and under the minimum that one
  trade refuses an otherwise genuine dislocation. [Inferensi] That hands an adversary a
  **single-trade suppression attack** — the exact mirror of the single-trade fabrication attack
  being removed. Swapping one manipulation surface for another is not a fix. It also contradicts
  §3.3's own reasoning for the 0.5 fraction: requiring the full move to persist was rejected
  precisely because one ordinary trade moves this pool several bps.
- The **median** asks *"was the dislocation in place for most of the interval?"* One observation
  cannot move it in either direction.

**What the median costs, stated plainly.** [Inferensi]

1. An attacker who can hold the price down for **more than half** of the 300 s interval still
   passes. The median buys resistance to single-observation manipulation, not to sustained
   manipulation. Sustaining a dislocation for 150+ s costs real capital at risk, which is the
   cost the gate exists to impose — but it is not infinite.
2. A genuine dislocation that begins retracing just before the interval's halfway point is
   refused. That is a false negative, and it is the conservative direction.
3. Unlike the minimum, the median cannot report "the move was never interrupted". The engine
   therefore reports `minRetention` alongside the governing median on every result, so the
   stricter reading is available to a reader without being the gate.

**Fail-closed on a sparse interval.** An interval containing fewer than `antiWickMinSamples`
observations yields `evaluated: false, held: false`. Not knowing is not the same as having
persisted, and a statistic over one point is exactly the defect being removed. The value is
**2**, inherited verbatim from `poolTelemetry.MINIMUM_SWAPS_FOR_METRICS`, which already governs
"may a window metric be emitted at all". It is not a new tuned number.

### 3.4 Minimum sample — 30 swaps

**Anchor: the window shape.** Each frozen window is anchor − 60 min to anchor + 6 h, so seven
hours. Thirty swaps is roughly one trade per fifteen minutes.

Below that, a "price path" is a handful of points, and a drawdown is an artifact of which
individual trades happened to land rather than a property of the market.

This is deliberately a **third** threshold, distinct from the two in `poolTelemetry`:

| Constant | Value | Governs |
|---|---|---|
| `MINIMUM_SWAPS_FOR_METRICS` | 2 | whether a metric may be emitted at all |
| `THIN_WINDOW_SWAP_THRESHOLD` | 420 | whether a warning label is attached |
| `minSwapsForVerdict` | 30 | whether a **verdict** may be formed |

[Inferensi] A number can be worth reporting and still be too sparse to act on. Collapsing these
three would either suppress honest reporting or authorise action on noise.

### 3.5 Velocity — 2.0× the pre-anchor rate

**Anchor: the window's own pre-anchor segment.** Each frozen window carries 60 minutes before
the anchor, so the baseline comes from the same pool in the same session rather than from a
global average that would need its own calibration.

Scale-free by construction, which matters because absolute velocity on this pool is low and an
absolute threshold would need a per-pool constant. A doubling is the conventional plain-language
threshold for "abnormal activity", and — like the retention fraction — it is a shape choice with
no defensible finer gradation.

Velocity is computed over whole segments rather than a rolling burst, so it is inherently
sustained and cannot be satisfied by one flurry of trades.

### 3.6 Basis — 300 bps, **never exercised**

⚠️ The OKX index leg is `UNAVAILABLE` for all four frozen anchors and cannot be backfilled
(SVC-003: index history is not retroactively available; the only committed sample is
2026-08-18 and every anchor predates it).

This value exists so the code path exists and is tested synthetically. **It has no empirical
grounding and must be re-derived before anyone relies on a basis-driven confirmation.**

## 4. Exit depth is advisory only

T3.2 measures exit depth as a **lower bound** (`isLowerBound: true` on every result), because
liquidity only changes at initialized ticks and a swap log does not reveal them, so the nearest
`tickSpacing` boundary is used instead.

A lower bound **under-states depth** and therefore **over-states risk**. [Inferensi] Treating a
thin lower-bound reading as proof that exit liquidity is genuinely thin would manufacture false
positives in exactly the direction that costs LPs money for nothing.

So the engine sets `exitDepthMayConfirm: false`. Exit depth is recorded on every result with
its provenance, and `THIN_EXIT_DEPTH` may be emitted as an advisory reason, but it can neither
confirm nor block. The restraint is encoded in the config and asserted by test, not left to a
comment.

Reading the tick bitmap would be needed for a true figure. That is out of MVP scope and belongs
in the limitations, not in a future-work sentence that softens the caveat.

## 5. Market hours are context, not a gate

Every frozen anchor lands while the US reference market is closed. That is not a disqualifier —
it is precisely the asymmetry the product exists to guard: the reference market is shut, the
X Layer pool keeps trading, and an LP's stale policy is exposed.

`REFERENCE_MARKET_CLOSED` is therefore recorded as context on every such result and never
subtracts from the verdict.

## 6. The decision rule

Gates, in order. Any failure stops the evaluation:

1. `swapCount >= minSwapsForVerdict` — else `UNAVAILABLE` (`INSUFFICIENT_SAMPLE`)
2. observation age `<= freshnessSeconds` — else `STALE` (`MARKET_DATA_STALE`)
3. **the anti-wick hold passed** — else no signal may contribute (amended, rule 2.0.0)

Signals, at least one required, each additionally requiring gate 3:

- **drawdown**: `maxDrawdownBps >= minDrawdownBps`
- **velocity**: `postAnchorRate / preAnchorRate >= minVelocityRatio`
- **basis**: `|basisBps| >= minBasisBps` — unreachable while the OKX leg is unavailable

Verdict: `CONFIRMED` if the anti-wick hold passed **and** at least one signal fired, else
`NOT_CONFIRMED`.

### 6.0 Anti-wick is necessary, not just sufficient-blocking (amended, rule 2.0.0)

Rule 1.0.0's verdict was the bare disjunction `drawdown.fired || velocity.fired || basis.fired`,
and the gate sat on `drawdown` alone.

[Fakta] T3.4 measured the consequence: a −500 bps fall that **fully retraces** returned
`CONFIRMED` because the accompanying volume burst fired the ungated velocity signal, and in its
purest form a **completely flat price** with only a trading burst returned `CONFIRMED`.

[Inferensi] The gate was therefore close to inert in practice — a price spike almost always
brings a volume burst, so the very event the gate exists to reject arrived carrying its own
bypass. Velocity was also the cheapest surface in the stack: doubling a trade rate risks no
capital and moves no price. Against scenario C's measured 0.633 swaps/min baseline, doubling it
over a 5-minute assessment needs 7 swaps.

So **velocity and basis may corroborate a persistent price dislocation; neither may substitute
for one.** In the engine each signal's `fired` now embeds `antiWick.held`, and the verdict
restates the conjunction so a future fourth signal cannot reopen the hole by forgetting the gate.
A signal's raw value is still reported next to the reason it was or was not allowed to count, so
the record stays decomposable.

**A disclosed narrowing.** The gate is written against the pool's *own* price path, so a pool
sitting persistently far below the OKX reference with a flat own-price path now fails it: there
is no peak-to-trough fall to measure. That case cannot confirm on basis alone under 2.0.0.
[Inferensi] It fails closed rather than open, and §3.6 already records that the basis path has
never been exercised against real data, so nothing measured depends on it. It is pinned by test
so the narrowing cannot be discovered by surprise later.

### 6.1 Incomplete windows

If `rpcRangeErrors > 0` the window has holes, so its swap count and drawdown are both lower
bounds.

[Inferensi] This is asymmetric and the engine treats it asymmetrically: a **positive** verdict
from an incomplete window still stands, because the move we did observe genuinely happened; a
**negative** verdict is unreliable, because the extreme may have fallen in a hole. So holes
never block confirmation, and `windowComplete: false` is carried on the result so a
`NOT_CONFIRMED` from a holed window is never read as a clean negative.

### 6.2 `dualLegConfirmed` — the field that cannot be glossed

Dien decided the X Layer pool leg may satisfy confirmation on its own, with the OKX leg marked
`UNAVAILABLE` and disclosed. §6 of the design supports this — it names "abnormal trade velocity,
or worsening executable exit depth" as valid confirmation signals — and §0.10 makes the OKX
basis one of eight inputs rather than a precondition.

The honest consequence is enforced structurally. Every result carries:

```ts
okxLegAvailable: boolean;
dualLegConfirmed: boolean;   // CONFIRMED && okxLegAvailable
```

**`dualLegConfirmed` is false for every frozen scenario.** No artifact — UI, README, pitch, or
submission copy — may claim "dual OKX/X Layer confirmation" for an assessment where it is false.
A single-leg confirmation is a real confirmation; it is just not the one the phrase describes.

## 7. Results

Computed after §1–§6 were fixed. **No threshold was changed after seeing these.**

### 7.1 The headline

**No frozen scenario reaches `CONFIRMED`.**

⚠️ **These are the rule `tinjau.confirm/1.0.0` results.** They are kept verbatim as the record of
what 1.0.0 produced. §9.1 restates the same four scenarios under 2.0.0 — the verdicts are
identical, some of the underlying figures are not.

| Scenario | Verdict | Swaps | Max drawdown | Anti-wick | Velocity |
|---|---|---|---|---|---|
| A — rumour | `UNAVAILABLE` | 0 | — | not evaluable | — |
| B — official 8-K | `NOT_CONFIRMED` | 4,145 | **234.9 bps** ✅ | **failed**, 13.0% retained | 0.41× |
| C — two origins | `NOT_CONFIRMED` | 265 | 11.4 bps | **failed**, 45.9% retained | 1.00× |
| D — neutral Form 4 | `NOT_CONFIRMED` | 367 | **241.4 bps** ✅ | **failed**, 10.3% retained | 1.16× |

[Fakta] **Correction (2026-08-21):** row C previously read "held, 45.9%". That was wrong. 45.9%
is below the 50% required, so under 1.0.0 the outcome was `held: false`. Re-measured directly:
`antiWick.held === false`, `retention === 0.4593`. The verdict was and remains `NOT_CONFIRMED`
on other grounds — C's 11.4 bps drawdown is far below the 200 bps floor and its velocity is
1.00× — so nothing downstream depended on the error, but the record said the opposite of what
the engine did.

`dualLegConfirmed` is **false everywhere** — no OKX index data covers any anchor.

### 7.2 ⚠️ This means scenario B resolves to `WATCH`, not `PROTECT`

[Fakta] Scenario B is the confirmed-protection path and the centrepiece of the demo. Its
drawdown of 234.9 bps clears the 200 bps floor. It fails on persistence: only **13%** of the
fall was still intact five minutes after the trough. Net change across the whole window was
**−45 bps**. The pool dipped and bounced; it did not dislocate.

[Inferensi] Under the anti-wick rule — which exists precisely to satisfy *"no single short-lived
price spike is sufficient"* — that is not a market consequence, and calling it one would make
the rule decorative.

T0.2 pre-registered this exact fallback and forbade engineering around it:

> `ifMarketConfirmationFails`: `{ "state": "WATCH", "…That result must be reported as-is and
> must not be worked around by loosening the confirmation rules." }`

So the honest outcome stands: **the demo's Scene B shows `WATCH`, not `PROTECT`, on the
mainnet replay.** §7.5 covers what that leaves the demo able to show.

### 7.3 A robustness check that mattered

[Inferensi] After seeing B fail, an obvious objection is that the drawdown was measured across
the whole window including the 60 minutes *before* the anchor, which conflates pre-event noise
with post-event reaction. Measuring only post-anchor would be the more principled method.

[Fakta] Recomputed as a disclosed sensitivity — **and flagged as post-hoc, because it was
prompted by the result**:

| Scenario | Full-window drawdown | Post-anchor only | Net change |
|---|---|---|---|
| B | 234.9 bps | **101.3 bps** | −56.5 bps |
| C | 11.4 bps | 11.4 bps | +2.4 bps |
| D | 241.4 bps | 241.4 bps | +52.4 bps |

[Inferensi] The post-anchor measurement makes B **weaker**, not stronger — 101 bps is only half
the 200 bps floor. So the verdict is robust to the method choice, and the pre-registered method
is not biased against the product story. Had it gone the other way, this section would have had
to recommend a re-run under the corrected method rather than quietly adopting it.

### 7.4 D is the more interesting result

[Fakta] The neutral control — a routine insider Form 4 — shows a **241 bps** drawdown, larger
than the official 8-K's.

[Inferensi] This is the strongest evidence so far for the product's actual thesis, and it
arrives from the control rather than from the showcase. A volatility-only policy watching this
pool would see D's move and fire; Tinjau does not, because the evidence layer already knows a
Section 16 filing reports no corporate action. **That is a false positive avoided, and it is
exactly the comparison T5 is built to measure.**

Note that D's anti-wick also failed (10.3% retained), so Tinjau would decline twice over —
once on materiality, once on persistence.

### 7.5 What the demo can still show, honestly

- **Scene A (rumour containment):** unaffected. It never depended on confirmation.
- **Scene B (protection):** the mainnet replay yields `WATCH`. A bounded fee action can still
  be demonstrated end to end on the **builder-controlled testnet pool** (T4.2), where the
  market state is ours to construct — but it must be labelled as such and must never be
  presented as a confirmed mainnet event.
- **Scene C (three-policy comparison):** unaffected, and §7.4 suggests it is where the real
  result lives.

[Inferensi] The product claim that survives is narrower and more defensible than the one
originally scoped: *Tinjau declined to act on two large price moves because neither had a
qualifying cause behind it, and one of them a volatility-only policy would have traded on.*
That is a genuine finding about restraint, not a demo of protection.

## 8. Carried forward

1. **[Inferensi] Apply the T0.4 `k`-grid discipline to `minDrawdownBps` in T5.** The benchmark
   already reports the volatility baseline at three thresholds so the strongest cannot be picked
   after the fact. Given §1's contamination, Tinjau's own drawdown threshold deserves the same
   treatment — report the three-policy comparison at 150 / 200 / 300 bps rather than at 200
   alone. Without that, a reviewer cannot tell whether the result depends on the threshold.
2. **The basis path is untested against real data** (§3.6) and must be re-derived before use.
3. **Exit depth needs the tick bitmap** to become a confirming signal rather than advisory.
4. ~~**A distinct `INSUFFICIENT_SAMPLE` reason code would be more precise** than reusing
   `MARKET_DATA_UNAVAILABLE` for a window that has data but too little of it.~~ **Closed.** The
   orchestrator added `REASON_INSUFFICIENT_SAMPLE` (bit 21) in both languages; T3.4 wired
   `confirm.ts` to emit it. Status is unchanged; only the reason is now accurate.
5. ~~**There is no reason code for "persistence could not be observed".**~~ **Closed
   2026-08-21.** The orchestrator added `REASON_PERSISTENCE_UNOBSERVED` (**bit 22**) to Solidity,
   TypeScript, the parity map and the published schema; T3.4 wired `confirm.ts` to emit it.

   The distinction is now machine-readable, not only prose:

   | Code | Bit | Means |
   |---|---|---|
   | `ANTI_WICK_FAILED` | 12 | a **positive finding** — the hold interval was watched and the move retraced, so it was a spike |
   | `PERSISTENCE_UNOBSERVED` | 22 | the hold interval was **unreachable or too sparse**, so persistence was never observed either way |

   They are **mutually exclusive by construction**: one requires `antiWick.evaluated === true`,
   the other `false`. [Inferensi] Emitting `ANTI_WICK_FAILED` on an unobserved interval would
   assert a retracement nobody saw — the same class of overclaim the gate refuses to make on its
   own behalf. Pinned by a sweep test over five window shapes that exercises both codes and
   asserts they never co-occur.

   [Fakta] **No frozen scenario carries the new code.** A returns at gate 1 and says
   `INSUFFICIENT_SAMPLE`; B, C and D all have `antiWick.evaluated === true` (68, 14 and 4
   observations in their hold intervals). All four reason **sets** are byte-identical to what
   they were before bit 22 existed.

## 9. The T3.4 amendment — rule `tinjau.confirm/2.0.0`

### 9.0 Why the version was bumped, and why major

The rule that decides `CONFIRMED` changed. `ruleVersion` is stamped into every result precisely
so a reader knows which rules produced it, and a 2.0.0 verdict carrying a 1.0.0 label would be
indistinguishable from a genuine 1.0.0 verdict — the exact failure the field exists to prevent.
So a bump was mandatory, not discretionary.

**Major rather than minor**, because a verdict can differ from 1.0.0 in **both** directions:

- The F1 change (anti-wick necessary for every signal) is a **strict narrowing** — anything that
  confirms under 2.0.0 would also have confirmed under 1.0.0.
- The F2 change (median across the interval, not the endpoint sample) is **two-sided**. A move
  that stayed dislocated throughout the hold but happened to bounce at the sampled instant was
  refused by 1.0.0 and is accepted by 2.0.0.

[Inferensi] So "1.1.0" would misdescribe the change as a compatible refinement. Only a major
bump says unambiguously that results carrying the two labels were produced by different rules.

[Fakta] **No threshold value changed**, and none was touched after seeing a result. The only new
number is `antiWickMinSamples = 2`, taken verbatim from the pre-existing
`poolTelemetry.MINIMUM_SWAPS_FOR_METRICS`.

### 9.1 The four frozen verdicts, restated under rule 2.0.0

[Fakta] Re-run 2026-08-21 through `buildConfirmationInput` plus `confirmMarket` — the production
adapter, not a test harness — with the same anchors, `okx: null`, and the window end as `now`.

| Scenario | 1.0.0 verdict | **2.0.0 verdict** | Changed? |
|---|---|---|---|
| A — rumour | `UNAVAILABLE` | `UNAVAILABLE` | no |
| B — official 8-K | `NOT_CONFIRMED` | `NOT_CONFIRMED` | no |
| C — two origins | `NOT_CONFIRMED` | `NOT_CONFIRMED` | no |
| D — neutral Form 4 | `NOT_CONFIRMED` | `NOT_CONFIRMED` | no |

`dualLegConfirmed` remains **false for all four**. **§7.2's conclusion stands unchanged: scenario
B resolves to `WATCH`, not `PROTECT`.** §7.3, §7.4 and §7.5 are likewise unaffected.

### 9.2 What did move underneath the verdicts

[Fakta] The verdicts are stable; three underlying figures are not, and the differences are the
F1/F2 changes visible on real data.

| Scenario | Anti-wick 1.0.0 | Anti-wick 2.0.0 (median) | Samples in hold | Lowest in hold |
|---|---|---|---|---|
| B | failed, 13.0% | failed, **9.7%** | 68 | 4.4% |
| C | failed, 45.9% | **held, 65.2%** | 14 | 43.9% |
| D | failed, 10.3% | failed, **11.4%** | 4 | 9.7% |

[Fakta] **Scenario C's anti-wick sub-result flipped from `false` to `true`.** Its verdict did not
change: C's 11.4 bps drawdown is an order of magnitude below the 200 bps floor and its velocity
is 1.00×, so no signal is available for the gate to admit.

[Inferensi] This is the two-sided nature of the F2 change, caught on real data rather than
argued in the abstract. 1.0.0 happened to sample an instant where C had given back most of a
tiny 11 bps wobble; across the interval the median observation had given back only a third of
it. Neither number is load-bearing for any published result, but the flip is the concrete
demonstration that 2.0.0 is not a strict narrowing — which is why §9.0 chose a major bump.

[Fakta] Scenario A additionally now emits `INSUFFICIENT_SAMPLE` alongside
`MARKET_DATA_UNAVAILABLE`. Its status is unchanged. The window was queried successfully with
zero RPC range errors and contained zero swaps, so "we looked and there was too little to judge"
is the accurate description; the OKX leg being unavailable is a separate fact and keeps its own
code.
