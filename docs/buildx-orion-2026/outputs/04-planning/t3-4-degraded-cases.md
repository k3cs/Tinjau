# T3.4 — Degraded-data and manipulation cases

- Date: 2026-08-20; **closed 2026-08-21**
- Task: T3.4 (depends on T3.3)
- Owner: external non-frontend AI agent
- Result: **acceptance criterion MET — both blocking defects fixed and verified**
- Rule version: `tinjau.confirm/2.0.0` (was `tinjau.confirm/1.0.0`)
- Tests: `apps/server/test/marketDegraded.test.ts` (38 cases, 38 pass, **0 `todo`**) and
  `apps/server/test/marketConfirmation.test.ts` (28 cases, 28 pass)
- Fixtures: `apps/server/src/market/fixtures/degraded-f{1,2}-*.json`

## 1. Headline

The tracker's acceptance criterion is:

> Every degraded case produces `unavailable`, `WATCH`, or continued bounded expiry as
> specified — **never unsupported promotion.**

[Fakta] **It is now met.** The two defects found on 2026-08-20 (F1, F2) are closed in the engine
and the four `{ todo: true }` tests that asserted the correct behaviour are ordinary passing
regression tests.

[Fakta] **The four frozen scenarios are unaffected.** Re-run through `buildConfirmationInput`
plus the production adapter under 2.0.0: A `UNAVAILABLE`, B/C/D `NOT_CONFIRMED`,
`dualLegConfirmed` false everywhere — identical to T3.3's published results. §6 gives the
before/after table, including the one sub-result that did move.

**No threshold value was changed.** 200 bps, 300 s, 0.5 retention, 30 swaps, 2.0× and 300 bps
are all carried over untouched.

## 2. F1 (critical) — `velocity` bypassed the anti-wick gate → **FIXED**

### The defect, as found

[Fakta] The verdict was a disjunction (`confirm.ts:445` under 1.0.0):

```ts
const confirmed = drawdown.fired || velocity.fired || basis.fired;
```

and the anti-wick gate was applied to `drawdown` **only**:

```ts
const drawdownFired = drawdownMeetsSize && antiWick.held;
```

`velocity` had no persistence gate, no anti-manipulation gate, and no price precondition.

[Fakta] Measured under 1.0.0 — a fall of −500 bps that **fully retraces**, accompanied by the
burst of trading that accompanies virtually every real spike:

| Field | Value |
|---|---|
| `signals.drawdown.value` | 500 bps |
| `signals.drawdown.fired` | `false` ✅ correctly refused |
| `antiWick.held` | `false` ✅ correctly identified as a wick |
| `signals.velocity.value` | 3.10× |
| **`status`** | **`CONFIRMED`** ❌ |

[Fakta] The purest form — a **completely flat price**, zero drawdown, only a trading burst —
also returned `CONFIRMED` on velocity alone.

[Inferensi] The gate was close to inert in practice: a price spike almost always brings a volume
burst, so the very event the gate exists to reject arrived carrying its own bypass. It was also
the cheapest manipulation surface in the stack — doubling a trade rate requires no capital at
risk and no price impact; wash trading between two addresses suffices. Against scenario C's
measured 0.633 swaps/min baseline, doubling it over a 5-minute post-anchor assessment needs
**7 swaps**; over 2 minutes, **3**.

### The fix

**Anti-wick is now a necessary condition for any `CONFIRMED`.** Velocity and basis may
corroborate a persistent price dislocation; neither may substitute for one.

Implemented in two places so it cannot be lost:

1. each signal's `fired` embeds `antiWick.held`, so `fired` means the same thing for all three —
   "this signal is entitled to contribute to the verdict";
2. the verdict restates the conjunction (`antiWick.held && (…)`) so a future fourth signal
   cannot reopen the hole by forgetting the gate.

A signal's raw value is still reported next to the reason it was or was not allowed to count
(`signals.velocity.value: 3.10`, `fired: false`, plus the gate note in its `explanation`), so
the record stays decomposable rather than collapsing to a bare refusal.

### A disclosed narrowing that comes with it

[Fakta] The gate is written against the pool's **own** price path. A pool sitting persistently
1000 bps below the OKX reference with a flat own-price path has no peak-to-trough fall, so
`antiWick.held` is false and it cannot confirm on basis alone under 2.0.0.

[Inferensi] This is a real narrowing and it is deliberate. It fails closed rather than open, and
T3.3 §3.6 already records that the basis path has never been exercised against real data (no OKX
index covers any frozen anchor), so nothing measured depends on it. It is pinned by a named test
so it cannot be discovered by surprise later.

## 3. F2 (high) — persistence sampled at one instant → **FIXED**

### The defect, as found

[Fakta] `evaluateAntiWick` located persistence with a single lookup:

```ts
const later = pricePath.find((p) => p.unixSeconds >= checkAfter);
```

It read **one** observation — the first at least 300 s after the trough — and computed retention
from it alone.

[Fakta] Identical price behaviour (a spike that fully recovers and stays recovered), differing
by one trade:

| Variant | Retention | `drawdown.fired` |
|---|---|---|
| Control — no extra trade | 0% | `false` ✅ |
| One momentary re-dip at the sample instant | **98%** | **`true`** ❌ |

[Inferensi] Cost to an attacker: one trade, timed 300 seconds after the trough.

### The fix, and the min-vs-median decision

Retention is now computed at **every** observation strictly after the trough and no later than
trough + 300 s, and the **median** governs the gate.

**Median, not minimum.** Both are shape choices with no defensible finer gradation, and either
closes F2. They ask different questions:

- the **minimum** asks *"was the dislocation never interrupted?"* — one-sided. On a pool this
  thin a single counter-trade can retrace much of the fall for one observation, and under the
  minimum that one trade refuses an otherwise genuine dislocation. [Inferensi] That hands an
  adversary a **single-trade suppression attack**, the exact mirror of the single-trade
  fabrication attack being removed. Swapping one manipulation surface for another is not a fix.
  It also contradicts the existing reasoning for the 0.5 fraction, which rejected "the full move
  must persist" precisely because one ordinary trade moves this pool several bps.
- the **median** asks *"was the dislocation in place for most of the interval?"* One observation
  cannot move it in either direction.

**What the median costs.** [Inferensi]

1. An attacker able to hold the price down for **more than half** of the 300 s interval still
   passes. The median buys resistance to single-observation manipulation, not to sustained
   manipulation — and sustaining a dislocation for 150+ s costs real capital at risk, which is
   the cost the gate exists to impose.
2. A genuine dislocation that begins retracing just before the interval's halfway point is
   refused: a false negative, in the conservative direction.
3. The median cannot report "never interrupted". So `minRetention` is reported alongside the
   governing median on every result — the stricter reading stays available to a reader without
   being the gate.

**Fail-closed on a sparse interval.** An interval with fewer than `antiWickMinSamples`
observations yields `evaluated: false, held: false`. Not knowing is not the same as having
persisted, and a statistic over one point is exactly the defect being removed. The value is
**2**, taken verbatim from the pre-existing `poolTelemetry.MINIMUM_SWAPS_FOR_METRICS`, which
already governs "may a window metric be emitted at all". It is not a new tuned number.

### A hypothesis checked and disproved (kept from the original report)

[Fakta] RPC holes were suspected of manufacturing apparent persistence by removing the recovery
from the observed path. An A/B on identical price paths — one complete, one with
`rpcRangeErrors: 3` and the recovery points removed — returned **identical** verdicts. The hole
was not the cause; the single-point sampling was. Recorded so the negative result is not
re-investigated.

## 4. Minor — `INSUFFICIENT_SAMPLE` → **FIXED**

[Fakta] `confirm.ts` emitted `MARKET_DATA_UNAVAILABLE` for a below-floor sample window. It now
emits `INSUFFICIENT_SAMPLE` (bit 21, already present in Solidity and TypeScript). `status`
remains `UNAVAILABLE`.

"Too few trades to judge" and "could not look" are different facts, and §0.12 requires the record
to explain itself accurately. Scenario A's zero-swap window is the clearest case: the query
succeeded with zero RPC range errors and found nothing, so *we looked* is true and *there was too
little to judge* is the accurate reason. The OKX leg being unavailable is a separate fact and
keeps its own `MARKET_DATA_UNAVAILABLE` code, so A carries both.

## 4.1 `PERSISTENCE_UNOBSERVED` — "we could not tell" is not "it retraced"

[Fakta] The orchestrator added `REASON_PERSISTENCE_UNOBSERVED` (**bit 22**) across Solidity,
TypeScript, the parity map and the published schema. T3.4 wired `confirm.ts` to emit it.

| Code | Bit | Means | Requires |
|---|---|---|---|
| `ANTI_WICK_FAILED` | 12 | a **positive finding** — the hold interval was watched and the move retraced, so it was a spike | `antiWick.evaluated === true` |
| `PERSISTENCE_UNOBSERVED` | 22 | the hold interval was **unreachable or too sparse**, so persistence was never observed either way | `antiWick.evaluated === false` |

The new code fires on exactly the two fail-closed paths: the window ending before the 300 s hold
elapsed, and the interval containing fewer than `antiWickMinSamples` observations. It is emitted
**unconditionally on whether a signal met its bar** — "we could not tell whether the move
persisted" is a fact about the window, not about which signals happened to fire, and a consumer
reading a `NOT_CONFIRMED` needs it either way. Windows that never reach the verdict block already
explain themselves (`INSUFFICIENT_SAMPLE`, `MARKET_DATA_STALE`), so the code is not added there.

[Inferensi] The two are **mutually exclusive by construction**, since the branch condition is the
same boolean. Emitting `ANTI_WICK_FAILED` on an unobserved interval would assert a retracement
nobody saw — the same class of overclaim the gate refuses to make on its own behalf. Pinned by a
sweep over five window shapes that exercises both codes and asserts they never co-occur, plus a
named test for each of the two unobserved paths. Before bit 22 existed, the "window ended before
the hold" case explained itself only in prose.

[Fakta] **No frozen scenario carries the new code, and no reason set changed.** A returns at
gate 1 with `INSUFFICIENT_SAMPLE`; B, C and D all have `antiWick.evaluated === true` (68, 14 and
4 observations in their hold intervals respectively). All four reason sets are identical to what
they were before the bit existed:

| Scenario | Reason codes | Changed? |
|---|---|---|
| A | `INSUFFICIENT_SAMPLE`, `MARKET_DATA_UNAVAILABLE`, `REFERENCE_MARKET_CLOSED` | no |
| B | `ANTI_WICK_FAILED`, `MARKET_DATA_UNAVAILABLE`, `MARKET_NOT_CONFIRMED`, `REFERENCE_MARKET_CLOSED` | no |
| C | `MARKET_DATA_UNAVAILABLE`, `MARKET_NOT_CONFIRMED`, `REFERENCE_MARKET_CLOSED` | no |
| D | `ANTI_WICK_FAILED`, `MARKET_DATA_UNAVAILABLE`, `MARKET_NOT_CONFIRMED`, `REFERENCE_MARKET_CLOSED`, `THIN_EXIT_DEPTH` | no |

**No second version bump.** [Inferensi] `tinjau.confirm/2.0.0` is unreleased — nothing has been
deployed, published or persisted under it — so this rides along inside the same batch of changes
that earned the bump. A reason-set change **is** observable to a consumer and would warrant a
bump on its own if 2.0.0 had already shipped; it has not, and no result stamped 2.0.0 exists that
predates this addition. Bumping again would imply two distinct released rule sets where there is
one.

## 5. Test coverage after the fix

[Fakta] `marketDegraded.test.ts`: **38 tests, 38 pass, 0 `todo`** (was 27 with 4 `todo`).
`marketConfirmation.test.ts`: **28 tests, 28 pass** (was 25).

The four former `todo` tests, now real:

| Test | Asserts |
|---|---|
| `F1: a fully-retraced spike must not confirm…` | velocity ≥ 2.0× **and** `fired: false`, status `NOT_CONFIRMED`, `ANTI_WICK_FAILED` |
| `F1b: a trading burst with no price movement…` | drawdown 0 bps, velocity ≥ 2.0×, `NOT_CONFIRMED` |
| `F1+F2 are closed through the production adapter…` | both committed fixtures `NOT_CONFIRMED` via `buildConfirmationInput` |
| `F2: persistence is assessed over the hold interval…` | control and one-re-dip variant give the **same** retention |

New adversarial and control coverage:

| Test | Purpose |
|---|---|
| `F2b: a re-dip anywhere inside the hold interval…` | the attack retimed to 4 instants inside the interval |
| `an interval with too few observations fails closed…` | one sample ⇒ `evaluated: false`, never `held` |
| **`a genuine persistent dislocation still confirms on drawdown`** | **positive control — the gate is not inert** |
| **`velocity corroborates a persistent dislocation instead of substituting for one`** | velocity is gated, not dead |
| `a single counter-trade inside the hold interval does not…` | proves the min-vs-median choice: `minRetention < 0.5` yet `held: true` |
| `velocity alone cannot confirm…` / `velocity cannot rescue a spike…` | F1 from the confirmation suite's side |
| `basis is gated by anti-wick too, which narrows it…` | pins the disclosed narrowing |
| `a below-floor window says INSUFFICIENT_SAMPLE…` | the reason-code fix |
| `a window that ends before the hold elapses says PERSISTENCE_UNOBSERVED…` | makes the previously prose-only distinction machine-readable |
| `a hold interval too sparse to summarise also says PERSISTENCE_UNOBSERVED` | the second fail-closed path |
| `a measured retracement says ANTI_WICK_FAILED, not PERSISTENCE_UNOBSERVED` | the mirror case |
| `the two persistence codes are mutually exclusive on every shape tried` | sweep over 5 shapes; asserts both codes are exercised, never together |

[Inferensi] The positive controls matter as much as the negative ones. Replacing a false-positive
defect with a blanket refusal would be replacing one defect with another, and only a test that
still confirms on a genuine dislocation distinguishes the two.

## 6. Re-verification of the four frozen scenarios

[Fakta] Re-run 2026-08-21 through `buildConfirmationInput` + `confirmMarket`, same anchors,
`okx: null`, window end as `now`.

| Scenario | T3.3 published (1.0.0) | **2.0.0** | Changed? |
|---|---|---|---|
| A — rumour | `UNAVAILABLE` | `UNAVAILABLE` | no |
| B — official 8-K | `NOT_CONFIRMED` | `NOT_CONFIRMED` | no |
| C — two origins | `NOT_CONFIRMED` | `NOT_CONFIRMED` | no |
| D — neutral Form 4 | `NOT_CONFIRMED` | `NOT_CONFIRMED` | no |

`dualLegConfirmed` remains false for all four. **The prediction that these fixes are
outcome-neutral on the frozen set was verified, not assumed.** T3.3 §7.2's conclusion stands:
scenario B resolves to `WATCH`, not `PROTECT`.

### 6.1 One sub-result did move, and it must not be glossed

[Fakta] The anti-wick figures underneath the verdicts:

| Scenario | 1.0.0 | 2.0.0 (median) | Samples in hold | Lowest in hold |
|---|---|---|---|---|
| B | failed, 13.0% | failed, **9.7%** | 68 | 4.4% |
| C | failed, 45.9% | **held, 65.2%** | 14 | 43.9% |
| D | failed, 10.3% | failed, **11.4%** | 4 | 9.7% |

[Fakta] **Scenario C's `antiWick.held` flipped `false` → `true`.** Its verdict did not change:
C's drawdown is 11.4 bps against a 200 bps floor and its velocity is 1.00×, so no signal exists
for the gate to admit.

[Inferensi] This is the two-sided nature of the F2 change caught on real data rather than argued
in the abstract. 1.0.0 happened to sample an instant where C had given back most of a tiny 11 bps
wobble; across the interval the median observation had given back only a third of it. Neither
figure is load-bearing for any published result — but the flip is the concrete reason the rule
version was bumped **major** rather than minor: 2.0.0 is not a strict narrowing of 1.0.0.

### 6.2 A documentation error corrected

[Fakta] T3.3 §7.1's table recorded scenario C as "held, 45.9%" under rule 1.0.0. That was wrong:
45.9% is below the 50% required, so the outcome was `held: false`. Re-measured directly against
the 1.0.0 code before the fix landed: `antiWick.held === false`, `retention === 0.4593`. The row
is corrected in place with a dated note. Nothing downstream depended on it, but the record said
the opposite of what the engine did.

## 7. Rule-version decision

**Bumped `tinjau.confirm/1.0.0` → `tinjau.confirm/2.0.0`.**

A bump was mandatory: `ruleVersion` exists so a reader knows which rules produced a result, and a
2.0.0 verdict carrying a 1.0.0 label would be indistinguishable from a genuine 1.0.0 verdict.

**Major rather than minor**, because a verdict can differ in **both** directions. F1 is a strict
narrowing; F2 is two-sided — a move that stayed dislocated throughout the hold but bounced at the
sampled instant was refused by 1.0.0 and is accepted by 2.0.0 (§6.1 shows this happening on real
data). "1.1.0" would misdescribe the change as a compatible refinement.

T3.3's four published verdicts are restated under 2.0.0 in that document's new §9.1, and §7.1's
table is now labelled as the 1.0.0 record.

## 8. What behaves correctly (unchanged from the original report)

[Fakta] All verified by passing tests.

| Case | Behaviour |
|---|---|
| Full retrace | `antiWick.held = false`, all signals refused, `ANTI_WICK_FAILED` recorded |
| Retention boundary | Exact and inclusive at 50% (49% refuses, 50% and 51% hold) |
| Rising price | "never fell", nothing to persist |
| Window ends before hold elapses | `evaluated: false` — not knowing ≠ having persisted |
| Hold interval too sparse | `evaluated: false` — a statistic over one point is not an interval |
| Stale OKX sample | Never reads as an available leg; no basis computed |
| Unavailable OKX leg | `dualLegConfirmed: false`, explanation says single-leg explicitly |
| RPC-holed window, negative verdict | `windowComplete: false`, "not a clean one" in the explanation |
| Partial read below sample floor | Degrades to `UNAVAILABLE` + `INSUFFICIENT_SAMPLE` — weaker, never stronger |
| Thin exit depth | Advisory only; `exitDepthMayConfirm: false`; cannot confirm or block |
| Empty window | `UNAVAILABLE`, every metric `null` — absence never reads as zero |
| Below `minSwapsForVerdict` | `UNAVAILABLE`, no signals evaluated |
| Future-dated observation | `fresh: false` → `STALE`; negative age fails closed |
| Stale observation | `STALE`, window not scored |
| Zero pre-anchor baseline | Velocity `null`, not infinite abnormality |
| Conflicting signals | No averaging; both refuse → `NOT_CONFIRMED` |

## 9. The structural guarantee still holds

[Fakta] T3.1 and T3.2 both claim their modules cannot return `CONFIRMED`, and that is unchanged
by this work:

- `okxReference.confirmationCeiling` is an exhaustive switch over three availability values
  returning only `UNAVAILABLE`, `STALE`, or `null`;
- `poolTelemetry.marketDataStatus` is assigned at exactly two sites, yielding `UNAVAILABLE`,
  `STALE`, or `NOT_CONFIRMED`.

Swept across five adversarial synthetic fixtures plus all four real scenario windows:
`CONFIRMED` never appears from the data layer.

## 10. Carried forward

1. ~~**There is no reason code for "persistence could not be observed".**~~ **Closed 2026-08-21
   — see §4.1.**
2. [Inferensi] **The median is not resistant to sustained manipulation** (§3). An adversary who
   holds the price down for more than half of the 300 s interval passes the gate. That is the
   intended cost boundary — real capital at risk — but no artifact should describe confirmation
   as manipulation-*proof*; "resistant to single-trade manipulation" is what was earned.
3. **The basis path remains unexercised against real data** and is now additionally gated by the
   pool's own price path (§2). Re-derive `minBasisBps` and reconsider the gate's shape before any
   basis-driven confirmation is relied on.
4. [Inferensi] **`antiWickMinSamples = 2` can refuse a genuine dislocation on a very sparse
   pool** — one where fewer than two trades land in the five minutes after the trough. That is
   the fail-closed direction and it is consistent with `minSwapsForVerdict = 30` already refusing
   sparse windows, but it is a real false-negative surface on thin markets. All four frozen
   windows clear it (4 to 68 samples in the hold interval).
