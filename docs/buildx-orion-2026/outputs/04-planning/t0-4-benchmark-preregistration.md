# T0.4 — Three-policy benchmark pre-registration

- Date: 2026-08-20
- Task: T0.4 (depends on T0.2, complete)
- Owner: external non-frontend AI agent
- Status: **pre-registered — written before any policy was implemented and before any policy outcome was computed**
- Frozen inputs: `apps/server/scenarios/` (T0.2)
- Method ancestor: `../05-build/markout-study.md` (task P2.4), whose formulas and pre-registration discipline this document reuses deliberately

## 0. Pre-registration statement

Everything in §1–§8 is fixed in advance. At the time of writing:

- no static, volatility-only, or Tinjau policy has been implemented;
- no policy outcome, markout, or fee-revenue figure has been computed for any frozen scenario;
- the only market measurements taken on the four frozen windows are **swap counts and RPC
  error counts** (T0.2 §6), which establish data availability, not results;
- pool parameters below were read live because the benchmark cannot be specified without
  them, and they are properties of the venue rather than outcomes of any policy.

The commitment this makes: if the results contradict Tinjau, §8's reporting rules apply
unchanged and the loss-reduction claim stays disabled.

## 1. What is being compared

Three fee policies, over identical trades, on identical windows, with identical starting
state:

| Policy | Sees market data | Sees filings / news / rumour / event type | Fee behaviour |
|---|---|---|---|
| `STATIC` | no | no | constant `500` (0.05%) |
| `VOLATILITY_ONLY` | yes | **no** | raises fee on price/flow signals alone |
| `TINJAU` | yes | yes | raises fee only via the evidence + confirmation path |

`VOLATILITY_ONLY` is the policy that matters. "AI plus dynamic fee" is a crowded category, so
Tinjau earns its claim only if causal event awareness adds measurable value **beyond** a
controller that watches price and flow. If it does not, that is the finding.

## 2. Frozen venue parameters

[Fakta] Read live from the reference pool `0x2a2b11730c2b6d99a58034a869dd810d7300a7b2` on
X Layer mainnet (chain 196) on 2026-08-20:

| Parameter | Value | Source call |
|---|---|---|
| `token0` | `0x4ae46a…d2dc8` USDG, 6 decimals | `token0()`, `decimals()` |
| `token1` | `0xa8ddb5…850d5` wNVDAx, 18 decimals | `token1()`, `decimals()` |
| `usdgIsToken0` | `true` | derived, never hardcoded |
| `fee` | `500` (0.05%) | `fee()` → `0x1f4` |
| `tickSpacing` | `10` | `tickSpacing()` → `0xa` |
| `feeProtocol` | `0x44` → 25% of the pool fee to protocol | `slot0()` |

These match the values `markout-study.md` §2.1 verified independently on 2026-08-17.

Fee envelope, inherited from the already-deployed `AfterhoursFeeHook` rather than chosen now:

| Bound | Value | Why it is not fitted |
|---|---|---|
| `baseFee` | `500` | equals the live pool fee |
| `maxFee` | `20000` (2%) | deployed at `0xbCb4B7…d8080` before this task existed |
| `widenDuration` | `3600 s` | as deployed |
| `decayDuration` | `18000 s` | as deployed |

`VOLATILITY_ONLY` and `TINJAU` use the **same** ceiling, widen duration and decay curve.
Comparing a policy that may reach 2% against one capped lower would measure the cap, not the
signal.

## 3. Frozen event set

The four T0.2 scenarios, unchanged. No event may be added, dropped, or re-anchored after any
result is seen.

| Scenario | Anchor | Window blocks | Swaps | Economic row |
|---|---|---|---|---|
| A — false rumour | 2026-07-27T20:33:00Z | `66411744`–`66436944` | 0 | **no** |
| B — confirmed event | 2026-08-17T12:41:33Z | `68197857`–`68223057` | 4,145 | yes |
| C — ambiguous | 2026-08-15T19:38:26Z | `68050070`–`68075270` | 265 | yes |
| D — neutral | 2026-08-12T21:13:10Z | `67796554`–`67821754` | 367 | yes |

Scenario A is reported as an **evidence-path row with null economics**, never silently
dropped and never imputed. Removing it from the table would hide the fact that the
false-rumour case cannot be priced.

Scenario C's Tinjau row is **reported under both permitted branches** (`WATCH` and `PROTECT`,
per T0.2 §5), because its promotion rule is not yet decided. Once T1.2 freezes the rule, the
non-selected branch stays in the artifact as a disclosed sensitivity, not deleted.

## 4. Trade extraction and pricing

Reused verbatim from `markout-study.md` §1.2–§1.3 so the two studies remain comparable.

Price from `sqrtPriceX96`:

```text
raw            = (sqrtPriceX96 / 2**96) ** 2      # token1 per token0, base units
human_t1_per_t0 = raw * 10 ** (dec0 - dec1)
P              = 1 / human_t1_per_t0              # since usdgIsToken0 is true here
```

Signed pool-side deltas per swap, human units:

```text
dU = amount0 / 10**6      # USDG side
dS = amount1 / 10**18     # wNVDAx side
```

Markout to LPs at horizon `h`, in USD, negative meaning LP loss:

```text
M_0 = dU + dS * P_post                  # fee plus curve premium, structurally >= 0
M_h = M_0 + dS * (P_h - P_post)         # the adverse-selection term
```

`P_h` is the price implied by the last swap in the pool at or before `t* + h`, where `t*` is
the trade's own timestamp. Horizons `h ∈ {60, 300, 900, 1800, 3600}` seconds; **primary is
3600**. Every horizon reports its coverage count (`later_swap_count_by_h_*`) so a reader can
see when a horizon has collapsed back to `M_0` for want of a later trade.

Protocol haircut, computed once per swap off `P_post` and subtracted at every horizon:

```text
inputUSD = dU if dU > 0 else dS * P_post
haircut  = 0.25 * feeRate * abs(inputUSD)
M_h_LP   = M_h - haircut
```

`feeRate` is the fee **the policy under test would have charged on that swap**, not the pool's
actual 0.05%. This is the single place where the three policies diverge arithmetically.

## 5. The counterfactual, and its central limitation

All three policies are scored by re-pricing **the same observed swap sequence** under
different fee schedules. Tracker §0.13 prescribes identical trades, and this document follows
that prescription. It must not be presented as a neutral choice, because it embeds an
assumption that is false in the real world:

> **Changing the fee would have changed the trades.**

A pool charging 2% deters swaps that a pool charging 0.05% attracts. Replaying an identical
trade list under a raised fee therefore:

- **overstates** fee revenue for any policy that raises fees, because trades that would not
  have happened still pay the higher fee;
- **understates** the adverse-selection benefit of raising fees, because informed flow that
  the higher fee would have deterred is still present in the replay.

The two biases push in opposite directions and **the net sign cannot be determined from this
data**. Anyone claiming the result is conservative, or that it is inflated, is guessing. The
honest statement is that the elasticity of flow to fee on this pool is unmeasured.

Consequences, binding on every downstream artifact:

1. Fee revenue is reported **separately** from markout, never netted into one headline number
   that hides which side the bias came from.
2. The phrase "loss avoided" is gated by §8.
3. Every chart, table and slide carrying these numbers must carry the counterfactual label
   defined in §7.
4. `TINJAU`'s observed testnet action and this mainnet replay are **different pools** and are
   never combined into one figure.

A behavioural-response model is explicitly **out of scope** for the MVP and is recorded as a
known limitation, not as future work that softens the caveat.

## 6. Policy specifications

### 6.1 `STATIC`

Fee is `500` for every swap in every window. No state, no triggers. This is the pool's actual
live behaviour, so its row doubles as a sanity check: `STATIC`'s replayed fee revenue must
reconcile with what the pool actually charged.

### 6.2 `VOLATILITY_ONLY`

Receives price, volume and liquidity. Receives **no** filing, news, rumour, event-type,
market-hours or corporate-action input. Any leakage of evidence-derived state into this policy
invalidates the comparison and must fail a test.

Trigger, fixed now:

```text
rv_short = realised volatility of pool mid-price over a trailing 15-minute window
rv_ref   = median of rv_short over the trailing 24 hours
trigger  = rv_short >= k * rv_ref
```

On trigger, the fee follows the **same** widen-and-decay curve as the deployed hook: step to
`maxFee`, hold for `widenDuration`, decay linearly to `baseFee` over `decayDuration`.

`k` is a judgment call and is therefore **not** chosen. The benchmark reports
`k ∈ {2, 3, 5}` as three separate rows for every event, and the headline comparison uses
**all three**. Reporting a single `k` would let the strongest one be selected after the fact.
If Tinjau loses to `VOLATILITY_ONLY` at any `k`, that is reported at that `k`.

Degenerate-input rule, fixed now: where a window has too few trades to estimate `rv_ref`
(scenario C is thin, scenario A is empty), the policy is recorded as `INDETERMINATE` for that
window, never as "did not trigger". Silence and a decision not to act are different findings.

### 6.3 `TINJAU`

Receives the same market data as `VOLATILITY_ONLY`, plus the frozen evidence graph and the
market-confirmation result. It may raise the fee only when the state machine reaches
`PROTECT`, and only inside the §2 envelope.

Its promotion thresholds belong to T1.2 and T3.3, not to this document. What is fixed here:

1. those thresholds must be frozen in versioned configuration **before** any scenario's
   market data is scored;
2. the same frozen configuration must be applied to all four scenarios;
3. the configuration version must be recorded in every result row;
4. if a threshold is changed after any result is seen, every prior result is void and the
   whole benchmark is re-run and re-labelled.

## 7. Metrics and units

Per swap, per scenario, per policy, per `k` where applicable:

| Metric | Unit | Observed or counterfactual |
|---|---|---|
| `feeRevenue` | USD | counterfactual for every policy except `STATIC` |
| `M_3600_LP` (primary markout) | USD | counterfactual |
| `M_3600_LP` in bps of notional | bps of `abs(dU)` | counterfactual |
| `M_3600_LP` in bps of TVL | bps of `TVL_event` | counterfactual |
| `adverseSelection` = `M_h − M_0` | USD | counterfactual |
| `actionLatency` | seconds from anchor to fee change | counterfactual |
| `maxFeeReached` | pips | counterfactual |
| `protectionDuration` | seconds | counterfactual |
| `timeToDecay` | seconds | counterfactual |
| `falsePositive` | boolean + USD cost | counterfactual |
| `falseNegative` | boolean, where determinable | counterfactual |

`TVL_event` is the pool's token balances **at the anchor block** via archive `eth_call`,
priced at the pool's own `slot0` at that block — not current TVL.

Every field in the published artifact carries an explicit
`basis: "OBSERVED" | "COUNTERFACTUAL"` marker. There is no unmarked number.

## 8. Reporting rules

Fixed before results, and binding:

1. **Per-event rows first.** The per-scenario, per-policy, per-`k` table is the primary
   output. Aggregates come after it, never instead of it.
2. **Full distribution, not averages.** Report min, p25, median, p75, max and the two most
   extreme swaps per scenario. A mean alone is not an acceptable summary.
3. **Tail concentration disclosed.** Report what share of total markout comes from the single
   worst swap and from the worst 5%. If the result is carried by one trade, that must be
   visible in the headline, not buried.
4. **Null rows stay.** Scenario A appears with null economics and a stated reason.
   `INDETERMINATE` volatility rows appear as `INDETERMINATE`.
5. **No hiding a loss.** If `VOLATILITY_ONLY` matches or beats `TINJAU` at any `k`, on any
   metric, that comparison is published with the same prominence as any favourable one.
   Tracker §0.13 forbids omitting it and this document makes that machine-checkable: the
   artifact must contain a row for every (scenario, policy, k) triple that was run.
6. **`canClaimLossAvoided`** is `true` only when **all** of the following hold, and the
   artifact records which condition failed when it is `false`:
   - the scenario has a non-null economic row;
   - `TINJAU` beats **both** `STATIC` and `VOLATILITY_ONLY` at every `k`, on the primary
     metric `M_3600_LP`;
   - the margin exceeds the spread between the best and worst `k` for `VOLATILITY_ONLY`,
     so the win is not smaller than the noise from an arbitrary threshold choice;
   - the frozen threshold configuration was not modified after any result was seen.
7. **Sample size stated everywhere.** The economic distribution rests on **three** scenarios
   on **one** asset over windows in a market that is weeks old (T0.2 §2.1). No sentence may
   imply a general result about tokenized equities.

## 9. What would count as Tinjau failing

Stated now so it cannot be redefined later:

- `TINJAU` does not beat `VOLATILITY_ONLY` on `M_3600_LP` at one or more `k`;
- `TINJAU` promotes on scenario D (a routine Form 4), showing its materiality semantics are
  wrong;
- `TINJAU` reaches `PROTECT` on scenario A, violating the rumour invariant;
- `TINJAU`'s advantage on scenario B disappears once the single largest swap is excluded;
- `TINJAU`'s advantage exists only at one `k` for the volatility baseline.

Any of these is reported as the finding. None of them is a reason to change the method.

## 9.1 Amendment AMD-001 — drawdown sensitivity grid (2026-08-20, T3.3)

Recorded **before** any T5 result exists, per §10.

**Change.** Tinjau's own `minDrawdownBps` inherits the §6.2 grid discipline. T5 reports every
event at **150, 200 and 300 bps**, not at 200 alone.

**Why.** T3.3's agent was briefed to freeze thresholds blind. The brief failed: a forked agent
inherits the orchestrator's context, and that context already carried T3.2's measured
drawdowns. The agent disclosed the contamination rather than claiming blindness it did not
have. `minDrawdownBps` is the one threshold that separates the frozen scenarios, so without a
grid a reviewer cannot tell whether the result depends on it.

**Direction of effect.** Disclosure only. A sensitivity grid cannot make a result look better
than a single chosen value — it can only expose fragility a single value would have hidden.

**Effect on the claim gate.** Tightens it. §8.6 already requires Tinjau to beat both baselines
at every `k`; the same must now hold across every drawdown threshold in the grid.

**On the chosen value.** 200 bps is anchored to the deployed hook's `maxFee` of 2%: invoking a
2% fee against a smaller dislocation is incoherent, because the defence would cost more than
the exposure. That anchor is external to the four windows and predates any measurement of them.
[Inferensi] The strongest evidence the thresholds were not fitted is that they produce a result
which *harms* the demo — a fitted threshold would have promoted scenario B, not refused it.

## 10. Deliverables this pre-registration binds

| Task | Artifact | Must conform to |
|---|---|---|
| T5.1 | static baseline | §2, §4, §6.1 |
| T5.2 | volatility-only baseline | §6.2 including the `k` grid and `INDETERMINATE` rule |
| T5.3 | replay runner, one command, deterministic | §3, §4, §5 |
| T5.4 | outcome calculation | §7, §8.1–§8.5 |
| T5.5 | Proof of Protection record | §5.4, §7 basis markers, §8.6 claim gate |
| T6.2 | comparison UI (frontend owner) | consumes `three-policy-comparison.json`; no winner language hard-coded |

Any deviation from this document must be recorded in the tracker's deviations log **before**
the affected result is published, with the reason and the effect on the claim gate.
