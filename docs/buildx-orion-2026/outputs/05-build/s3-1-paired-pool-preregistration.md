# S3.1 — Paired-pool protection experiment, pre-registration

- Date: 2026-08-21 (authoring session; the repo clock rolled past 2026-08-22T00:00Z while this
  was being written, and no run has been started in either day)
- Task: S3.1 (depends on S0.1, S2.1). Binds S3.2.
- Owner: non-frontend agent designs; Dien pre-approved execution on 2026-08-21 (tracker Q5),
  conditional on this document being committed **before any result exists** and on whatever the
  run shows being published.
- Status: **pre-registered — committed before any result existed.** At commit time no pool for
  this experiment had been deployed, no swap had been sent, no assessment had been posted, and no
  retained-value figure had been computed for either arm.
- Method ancestor: `../04-planning/t0-4-benchmark-preregistration.md`, whose freeze-first
  discipline, sensitivity-grid habit and reporting rules this document reuses deliberately.

## 0. Pre-registration statement

Everything in §1–§10 is fixed in advance. At the time of writing:

- no pool, token, or position for this experiment exists on any chain;
- no swap has been executed for it, on testnet or anywhere else;
- no assessment has been posted for any pool id defined here;
- the only values read while writing this document are **already-frozen committed artifacts**
  (the scenario-B telemetry fixture, the deployed-address record, the deployed envelope, the
  frozen promotion config) and the **source of the contracts**. Those are properties of the
  venue and of code that predates this task, not outcomes of it.

The commitment this makes: if the result is null or adverse, §8's reporting rules apply
unchanged, `canClaimLossAvoided` stays `false`, and the prohibited sentence in §9 stays
prohibited.

## 1. The question, stated narrowly

> Two otherwise-identical builder-controlled testnet pools receive the same replayed sequence of
> real trades. One is enforcing a Tinjau `PROTECT`; the other has no hook. How much more, or
> less, of the flow's notional does the LP position retain in the protected pool?

That is the whole question. It is **conditional on protection already being in force**. It is
not "does Tinjau protect at the right times", which §3 shows this experiment structurally
cannot answer, and it is not "does Tinjau reduce LP loss", which §9 keeps prohibited.

## 2. Frozen pools

Two arms per run, plus a second run (§4.3). Everything below is fixed now.

### 2.1 Reused, not created

Taken from `frontend-handoff/deployed-addresses.json` (`status: T7_2_AUTHORITATIVE`), the
**production-envelope** stack on X Layer Testnet, chain id **1952**:

| Role | Address |
|---|---|
| `PoolManager` | `0x8F862A8b6f00C99b0610dc764228C661c4909ae1` |
| `TinjauFeeHook` | `0x1092C9fe2dB084F26aa415A0fda14B001A786080` |
| `TinjauRiskRegistry` | `0x60062389a7AB08F0030FC06Adf9CE0C180537317` |
| swap router (`PoolSwapTest`) | `0xe5823a180BFAcbC24Aa9a744B76f3Dfb8bbECDA9` |
| liquidity router (`PoolModifyLiquidityTest`) | `0x1324A9A175779D53c65F9A43493CEa302cd54587` |

Envelope, inherited and unmodifiable (the registry sets it in its constructor and has no setter;
the hook copies it into immutables at construction):

`baseFee 500` · `maxFee 20000` · `widenDuration 3600 s` · `decayDuration 18000 s` ·
`maxProtectDuration 21600 s` · `cooldown 3600 s`.

**Why the production envelope and not the 60×-compressed demo one.** The replay must finish
while the fee is on its constant plateau, so that a per-swap fee difference is a single number
rather than a point on a decay curve. `widenDuration = 3600 s` gives an hour of plateau; the
demo envelope's 60 s does not. The cost of this choice is stated in §9: the decay half of the
episode is never exercised, so any positive result is an **upper bound** on the benefit
averaged over a whole protection episode.

### 2.2 Created fresh, once per run

**Tokens.** Two freshly deployed `MockERC20` (`contracts/src/mocks/MockERC20.sol`), both with
**18 decimals**:

- risk asset — name `Mock wNVDAx (S3.1)`, symbol `wNVDAx31`
- quote asset — name `Mock USDG (S3.1)`, symbol `USDG31`

Fresh tokens rather than the existing mocks, because `PoolKey` *is* the pool's identity: reusing
`0xf07A9D…F903` / `0x666e81…0e99` at tick spacing 60 with this hook would resolve to the already-
initialised, already-traded demo pool id `0x5e9eff…f730`. A virgin pool per arm per run is only
obtainable with a virgin token pair.

`currency0` / `currency1` are assigned by address sort at run time and **never hardcoded**;
`quoteIsCurrency0` is derived and recorded. The guardian
(`0x8BCC23b3352e9c450160676803AC5cfe1e2329e1`) calls
`setAssetSupported(riskAsset, true)` and leaves the quote asset unsupported, so the hook's
`_resolveAsset` returns the risk asset and never `AmbiguousAsset`.

**Arm H (hooked).**

```text
PoolKey { currency0, currency1, fee = 0x800000 (DYNAMIC_FEE_FLAG), tickSpacing = 60,
          hooks = 0x1092C9fe2dB084F26aa415A0fda14B001A786080 }
```

**Arm C (control, no hook).**

```text
PoolKey { currency0, currency1, fee = 500 (static, = baseFee), tickSpacing = 60,
          hooks = 0x0000000000000000000000000000000000000000 }
```

Both initialised at `sqrtPriceX96 = 79228162514264337593543950336` (price 1.0, tick 0).

**The two arms cannot be made more identical than this, and the reason is in the contract.**
`TinjauFeeHook.beforeInitialize` reverts with `PoolMustUseDynamicFee(fee)` unless the pool
carries the dynamic-fee flag (`contracts/src/TinjauFeeHook.sol`, and the test
`test_staticFeePoolCannotBeInitialisedWithThisHook`). So "the same pool without the hook" cannot
exist: removing the hook forces the fee field to change from `DYNAMIC_FEE_FLAG` to a static
value. The control's static value is set to `500`, exactly the hook's `baseFee`, so the two arms
charge **the identical fee whenever the hook is not protecting**. §4.3's WATCH run tests that
equality empirically rather than assuming it.

**Liquidity.** One position per pool, identical in both arms:

```text
tickLower = -6000, tickUpper = 6000, liquidityDelta = 1_000_000e18, salt = bytes32(0)
```

added by one EOA through `PoolModifyLiquidityTest`, which holds the position as
`owner = address(router)` and settles tokens to the calling EOA. Bounds are multiples of the tick
spacing and span roughly 0.55×–1.82× the initial price — deliberately far wider than the deploy
script's `[-120, 120]`, because a replay of a real dislocation moves price by more than the ±1.2%
that narrow range covers, and a position that runs out of range mid-replay produces partial
fills that would break the comparison (§7.1 guard 4).

**Protocol fee** must read `0` on both pools; the value is recorded either way and must be equal
across arms.

## 3. The §17 timing problem, confronted

`known-limitations.md` §17 records: *"The assessment instant is the window end … protection would
begin at the window end and almost no swaps would be re-priced, so the economic comparison for a
promoting Tinjau is not measurable on these windows."*

That is correct and it applies here. Scenario B's frozen window is blocks `68197857`–`68223057`
(anchor −1 h to anchor +6 h). The market-confirmation leg consumes the **whole** window, so the
assessment instant is the window's last block. Every one of the 4,145 recorded swaps precedes it.
A naive design — assess on the window, then replay the window — re-prices **zero** swaps and
measures nothing.

Three ways out were considered. Two are rejected on the record.

**Rejected — move the assessment instant earlier so post-assessment swaps exist.** Cutting the
confirmation window at anchor + Δ and replaying the remainder would give a genuinely caused
assessment. It is rejected because Δ would have to be chosen, and any Δ that makes scenario B
confirm would be a threshold picked to manufacture a `PROTECT`. That is the exact failure this
project forbids. Worse, it would not work: `known-limitations.md` §2 records that scenario B
fails the **market** leg (235 bps drawdown clears the floor, ~10–13% retention fails anti-wick),
and that measuring drawdown post-anchor only makes B *weaker*, at 101 bps. No honest Δ promotes
scenario B.

**Rejected — accept the null and replay canonical scenario B unchanged.** Tinjau resolves to
`WATCH`, charges `baseFee`, and both arms charge 500. The retained-value difference is then zero
by construction. This is not discarded: it is **run, as run W** (§4.3), because a bit-exact zero
is a strong validity check on the harness. It is rejected as the *only* run because it re-derives
a result already published, at the cost of a testnet deploy.

**Chosen — decouple the assessment instant from the trade script's own timeline, and say so.**

- The **trade script** is a real recorded swap sequence from scenario B's fixture (§4.1).
- The **risk state** is set by a separately-driven assessment that is *posted and confirmed
  before the first replayed swap is sent* (§4.2), so all 120 replayed swaps are re-priced.
- The two are therefore **not causally linked**. The trades did not produce the assessment.

**What this costs, stated as a choice with its price.** The experiment can no longer claim the
protection was *caused by* the data the trades came from. It measures a strictly conditional
quantity: *given* that Tinjau is in `PROTECT`, what does the LP retain over this real trade shape
versus an unprotected pool. It says nothing about how often Tinjau is right to be in `PROTECT`.
Those are two separate questions, S3.3 owns the second one, and this document answers only the
first.

**§17 is not solved; it is sidestepped, and the sidestep is measurable.** §7.1 guard 3 makes the
sidestep machine-checkable: if fewer than all 120 replayed swaps in run P record an applied fee
above `baseFee`, §17 has reasserted itself, and the run is **VOID** rather than reported.

## 4. The frozen trade script and the frozen risk state

### 4.1 Trade script

**Source fixture, named:** `apps/server/src/market/fixtures/pool-scenario-b-swaps.json`
(`_schemaVersion: tinjau.pool-telemetry-fixture/1.0.0`, `scenarioId: B`, chain 196 pool
`0x2a2b11730c2b6d99a58034a869dd810d7300a7b2`, `token0` = USDG 6 dec, `token1` = wNVDAx 18 dec,
`quoteIsToken0: true`, columns
`[blockNumber, logIndex, amount0, amount1, sqrtPriceX96, liquidity, tick]`). This is real
third-party mainnet liquidity, captured 2026-08-21, and is **not** the builder pool.

**Slice, frozen:** rows with `blockNumber >= 68201457`, in the fixture's recorded
`(blockNumber, logIndex)` order, **first 120**. `68201457 = fromBlock 68197857 + 3600`, i.e. the
event anchor `2026-08-17T12:41:33Z`; X Layer produces one block per second, so the offset is
exact. The hour after the anchor is the flow a protection would actually face.

`N = 120` is set by the wall-clock budget, not by the data: 120 steps × 2 arms × ~6 s per
confirmed testnet transaction ≈ 24 minutes, giving more than 2× headroom inside the 3,600 s
plateau (§7.1 guard 2). If fewer than 120 rows qualify, all qualifying rows are used and the
shortfall is published as a deviation (§10).

**Per-row direction and input**, from pool-side deltas:

```text
amount0 > 0  ->  side = SELL_QUOTE, inHuman = amount0 / 1e6      # trader paid USDG
amount0 < 0  ->  side = SELL_RISK,  inHuman = amount1 / 1e18     # trader paid wNVDAx
amount0 == 0, or sign(amount0) == sign(amount1)  ->  row dropped, and the drop is published
```

**Scaling to the testnet pool**, one constant for the whole script:

```text
L_src_human  = liquidity(first row of the slice) / 1e12        # 1e12 = 10 ** ((6 + 18) / 2)
L_test_human = 1_000_000e18 / 1e18 = 1e6
K            = L_test_human / L_src_human
amtRaw_i     = round(inHuman_i * K * 1e18)                     # both mocks are 18 dec
```

`K` preserves each swap's `input / liquidity` ratio, which is what sets its price impact, so the
replay preserves the *shape* of the flow rather than its absolute size. A single constant is used
rather than a per-row one so relative trade sizes inside the script are not rewritten; the
fixture's min and max `liquidity` over the slice are published so a reader can see how far
mainnet liquidity drifted during the hour. Any row scaling to `amtRaw_i == 0` is dropped and the
drop is published.

**Direction mapping** is derived at run time —
`zeroForOne = (side == SELL_QUOTE) === quoteIsCurrency0` — never hardcoded, because fresh token
addresses sort unpredictably.

**Timing is compressed, and by how much.** Recorded inter-arrival times are **not** preserved.
Swaps are sent back to back as fast as the chain confirms them: roughly one hour of mainnet
arrivals replayed in roughly 24 minutes of testnet wall clock. This is defensible only because
the whole replay sits inside the constant-fee plateau, where the fee does not depend on when a
swap lands — so compression cannot change the fee any swap pays. It would **not** be defensible
under the demo envelope or across the decay curve, and §9 records the consequence.

**Execution order:** interleaved, step by step — for each `i`, arm C then arm H — so that any
chain-level drift (congestion, RPC lag) hits both arms alike rather than accumulating in whichever
arm ran second.

### 4.2 Risk state, and how it is set — the protected arm is driven by a **posted** assessment

Stated plainly and up front: **the market leg of the protected arm is CONSTRUCTED, not
observed.** This is the same mechanism `runSceneB` already uses and labels
(`apps/server/src/chain/tinjauScenes.ts`, `buildConstructedProtectWindow`), and the same reason:
canonical scenario B does not confirm.

What is real and what is constructed:

| Component | Status |
|---|---|
| 8-K evidence, claims, evidence graph, independence derivation | **real**, from `apps/server/scenarios/scenario-b-confirmed-protect.json` |
| promotion thresholds (`FROZEN_PROMOTION_CONFIG`, `tinjau.policy/1.0.0`) | **real**, unmodified |
| the `CONFIRMED` verdict and the `PROTECT` decision | **real** — produced by the unmodified `confirmMarket` / `decide` engines |
| the price path fed to `confirmMarket` in run P | **CONSTRUCTED** |
| the EIP-712 signature, the registry write, the fee the pool charged | **real**, on chain |

The constructed path is fed to the real engine rather than short-circuited, so the engine still
applies its own 200 bps drawdown floor, its anti-wick retention test and its 30-swap minimum. If
a future tightening of those rules rejects the path, the run fails — which is the correct
outcome, not a bug.

Evidence is time-shifted by one constant offset via `timeShiftScenario` / `timeShiftSwapWindow`,
exactly as the existing scenes do, because `evidenceWindowSec` is 72 h and the 8-K is older than
that. The existing assertion carries over unchanged: **the shifted run must produce the same
state and the same reason codes as the canonical unshifted run**, or the run fails rather than
reporting the shifted answer.

**When protection begins, relative to the trade script.** The assessment is posted to
`(riskAsset, poolId_H)` and read back to consistency (`waitForReadConsistency`, because the
public RPC serves stale reads for ~2.5–2.7 s per write) **before** replay step 1 is sent. Arm C
receives no record; it has no hook and could not read one. Recorded and published:
`protectStartedAt`, the timestamp of the first replayed swap, and the timestamp of the last.

### 4.3 Two runs, not one

Both runs use the same trade script, the same envelope, the same tick range, the same liquidity,
and freshly deployed token pairs and pools of their own. They differ in **exactly one input**:
the market window handed to `confirmMarket`.

| Run | Market leg | Engine verdict | Purpose |
|---|---|---|---|
| **W** (first) | canonical scenario-B window, time-shifted | `NOT_CONFIRMED` → **`WATCH`** | canonical-data result **and** harness noise floor |
| **P** (second) | constructed path, time-shifted | `CONFIRMED` → **`PROTECT`** | the conditional measurement of §1 |

Run W is executed first, so the noise floor is measured before the treatment and cannot be
chosen to fit it.

**Run W carries a hard pre-registered prediction.** Both arms charge exactly 500 on every swap,
both pools start identical, and v4's math is deterministic — so run W's retained-value difference
must be **exactly zero in base units**, not approximately zero. Any non-zero value is a defect in
the harness or an undeclared asymmetry between a dynamic-fee pool at `baseFee` and a static-fee
pool at `500`, and it must be explained in the published result **before** run P's number is
interpreted (§7.1 guard 6).

## 5. Metrics

All amounts are in **base units of the freshly deployed 18-decimal mock tokens**. They have no
value, they are freely mintable, and no currency symbol appears anywhere in the output. "Notional"
means mock-quote base units, never dollars.

### 5.1 Value retained

Measured by **withdrawing the entire position and counting what comes back**, which folds
principal and accrued fees into one number and requires no accounting judgement.

After the last replayed swap of a run, and after reading terminal state (§5.2):

```text
for arm in [C, H]:
    b0_before, b1_before = balanceOf(LP_EOA, currency0), balanceOf(LP_EOA, currency1)
    liquidityRouter.modifyLiquidity(key_arm,
        { tickLower: -6000, tickUpper: 6000, liquidityDelta: -1_000_000e18, salt: 0 }, "")
    W0_arm = balanceOf(LP_EOA, currency0) - b0_before
    W1_arm = balanceOf(LP_EOA, currency1) - b1_before
```

`PoolModifyLiquidityTest` settles to `msg.sender`, and a full burn returns principal plus every
fee the position accrued, so `W0`/`W1` are complete. Arm C is withdrawn first, then arm H, so the
two deltas never overlap.

Mapped to quote / risk by the derived `quoteIsCurrency0`, giving `Wq_arm` and `Wr_arm`.

```text
retained(arm) = Wq_arm + Wr_arm * P_ref
```

### 5.2 The reference mark, and why it is not each pool's own price

The two arms end at **different prices** — the hooked pool's price moved less, because less
notional reached the curve. Valuing each pool's leftover risk asset at its *own* terminal price
would credit the hooked pool for its own price impact mitigation and is circular. Both arms are
therefore valued at one **common** mark, fixed now:

- **Primary mark `P_ref`** — the terminal price of **arm C**, computed from
  `getSlot0(poolId_C).sqrtPriceX96` read immediately after the last replayed swap and before any
  withdrawal, converted to quote-per-risk using the derived `quoteIsCurrency0`. Rationale: arm C
  absorbed the full unmitigated flow, so its terminal price is the best available proxy for what
  the replayed event did to the price.

Two further marks are computed and published **alongside**, never selected after the fact:

- **Mark S1** — `P_ref = 1.0`, the initial price. A conservative floor framing.
- **Mark S2** — arm H's own terminal price. The framing that flatters Tinjau, published so the
  reader sees the whole bracket rather than the favourable end of it.

This is the direct lesson of `known-limitations.md` §3, where all 27 comparable cells of the
three-policy benchmark flipped sign between two arithmetic conventions. §7.2 makes a sign flip
across these three marks a disqualifying outcome rather than a footnote.

### 5.3 The decision quantity

```text
cumulativeNotional = Σ_i  ( in_i               if side_i == SELL_QUOTE
                            in_i * P_ref       if side_i == SELL_RISK )   # actual executed inputs
retainedDelta      = retained(H) - retained(C)                            # mock-quote base units
D_notional         = 10_000 * retainedDelta / cumulativeNotional          # bps  <- PRIMARY
D_LP               = 10_000 * retainedDelta / retained(C)                 # bps  <- reported
```

`D_notional` is the decision quantity because it is **scale-free**: its expected magnitude is set
by the fee differential, not by how large the script happened to be relative to the pool. Choosing
`D_LP` as the decider would have made the verdict depend on a pool-size ratio nobody pre-registered.

The realised fee differential, the anchor for §7.2's bands, computed from the fees the pool
actually charged rather than assumed:

```text
Δf̄ = ( Σ_i (fee_H,i - fee_C,i) * in_i ) / ( Σ_i in_i ) / 100      # bps; fees in pips
```

`fee_H,i` and `fee_C,i` are read from `PoolManager`'s own `Swap` event per swap, never from the
hook's preview. The hook's `previewFee` is recorded alongside so a divergence is visible.

### 5.4 Also recorded, not used to decide

Per swap, per arm: index, side, requested input, `amount0`, `amount1`, applied fee, previewed
fee, previewed degraded reason, tick, block, timestamp, tx hash. Per run, per arm: initial and
terminal `sqrtPriceX96`, tick and pool liquidity; protocol fee; the registry record before and
after; `Wq`, `Wr`; derived fee income `Σ_i fee_i/1e6 × in_i` as a reconciliation figure.

### 5.5 Explicitly excluded

Gas (paid by the builder, not by an LP, and valueless on testnet); any conversion to a real
currency; any impermanent-loss-versus-HODL framing; anything from the three-policy benchmark —
that study is a **mainnet replay on a different pool** and `t0-4` §5.4 forbids combining the two
into one figure. This experiment's numbers never appear in the same table as it.

## 6. Success, failure and null — the decision rule

Fixed now, evaluated in this order.

### 6.1 Validity gates (a failure here makes the run VOID, not a result)

1. Both pools read identical `sqrtPriceX96`, tick, tick spacing and position liquidity before
   replay step 1.
2. The last replayed swap of run P lands at `protectStartedAt + t` with `t < 3000 s`. The runner
   aborts the run if the budget would be exceeded.
3. **The §17 guard.** In run P, all `N` swaps on arm H record an applied fee `> 500`, and all `N`
   on arm C record exactly `500`.
4. No partial fill: every swap's realised input equals its requested input, on both arms. A
   partial fill on one arm but not the other voids the run outright.
5. Registry not paused throughout; the record for `(riskAsset, poolId_H)` reads `PROTECT` with
   `confirmation == Confirmed` and no `REASON_RUMOR_ONLY` bit, before and after the replay; and
   the experiment writes no record for any pool id published in `deployed-addresses.json`.
6. Run W's `retainedDelta` is exactly `0` in base units. If it is not, run P's bands are not
   applied until the asymmetry is explained in the published result, and the measured
   `|D_notional,watch|` becomes a noise floor that run P must clear (§6.2).
7. Protocol fee is equal on both arms and its value is recorded.

### 6.2 The bands

Let `D = D_notional` for **run P** under the **primary mark**, and
`F = max( 0.05 × Δf̄ , 3 × |D_notional,watch| )`.

| Outcome | Condition | What it means |
|---|---|---|
| **CONFIRMS** | `D ≥ 0.50 × Δf̄` **and** `D ≥ F` | the mechanism delivered at least half of its own arithmetic ceiling |
| **WEAK** | `F ≤ D < 0.50 × Δf̄` | a positive but small effect, well below what the fee differential predicts; reported as a partial result and the shortfall investigated, **not** as a win |
| **NULL** | `\|D\| < F` | **no measurable difference** |
| **ADVERSE** | `D ≤ -F` | the protected pool retained **less** |
| **SIGN-INDETERMINATE** | `D` does not have the same sign under all three marks of §5.2 | the valuation convention decided the answer, not the data; licenses nothing, whatever the primary mark says |

`Δf̄ ≈ 195 bps` if the plateau holds (`(20000 − 500) / 100`), making the bands ≈ 97.5 bps and
≈ 9.75 bps. Both fractions are fixed here and anchored to the **deployed envelope**, which
predates this task, not to anything measured in the run. Direction of effect: a `WEAK` band that
refuses to count a small positive as a win, and a noise floor taken from a control run rather
than asserted, can only make the gate harder to pass.

### 6.3 What would count as this experiment failing

Stated now so it cannot be redefined later:

- run W's difference is not exactly zero — the harness is asymmetric and nothing built on it is
  trustworthy until that is explained;
- `D` lands in `NULL` or `ADVERSE`;
- `D` is positive but `WEAK`, i.e. the mechanism delivered far less than its own arithmetic
  predicts;
- the sign flips across the three marks;
- fewer than `N` swaps are re-priced in run P, i.e. §17 reasserts itself;
- the constructed path is refused by the unmodified confirmation engine, so run P never reaches
  `PROTECT` at all.

None of these is a reason to change the method, the mark, the bands, the script, or `N`.

## 7. Publication surface — for every outcome, including the adverse one

Fixed now, and binding on S3.2:

1. **Raw data first.** `docs/buildx-orion-2026/outputs/05-build/s3-2-paired-pool-raw.json` carries
   every per-swap row of §5.4 for both arms of both runs, plus the frozen inputs (`K`, the slice's
   block range, token and pool addresses, `Δf̄`, all three marks). The result must be
   recomputable from it without re-running the chain.
2. **The write-up.** `docs/buildx-orion-2026/outputs/05-build/s3-2-paired-pool-result.md` states
   the outcome band in its first line, before any narrative.
3. **The site.** The user-value surface (`apps/web/src/app/why-it-matters`, and `/proof` where it
   lists capabilities) is updated **only in the direction the data supports**. A `NULL` or
   `ADVERSE` outcome is written onto the same surface, in the same position, at the same visual
   weight a positive one would have received. A null result is not moved to an appendix, not
   softened to "inconclusive pending further work", and not omitted.
4. **Known limitations.** `known-limitations.md` gains a subsection recording the outcome
   whichever way it goes, and — if run P reaches `PROTECT` — recording that the trigger for it
   was constructed.
5. **Every number carries its basis**, as in `t0-4` §7: `basis: "OBSERVED" | "CONSTRUCTED"` per
   field, plus the standing label that both pools hold builder-controlled valueless mock tokens.
   There is no unmarked number.
6. **All three marks are published**, always. Quoting the primary alone is forbidden.
7. **Machine-checkable completeness**: the artifact must contain a row for every
   (run, arm, swap index) triple that was attempted, including any that failed.

## 8. What this can and cannot show

**It can show:** on a builder-controlled X Layer Testnet pool holding freely-mintable mock tokens,
replaying a real recorded swap sequence through two pools that are identical except for the hook,
how much more or less of the flow's notional the LP position retains while a Tinjau `PROTECT` is
being enforced at full strength.

**It cannot show, and no artifact may imply otherwise:**

- **It does not license the sentence "Tinjau reduces LP loss."** That sentence stays prohibited
  until the original pre-registered `canClaimLossAvoided` conditions
  (`t0-4-benchmark-preregistration.md` §8.6) pass on canonical data. This experiment does not
  touch those conditions and cannot open that gate. `known-limitations.md` §18 stands unchanged.
- **Neither pool is a market.** Both hold builder-controlled valueless mock tokens that anyone
  can mint. There is no external liquidity, no external participant, and no price discovery. No
  figure from this experiment is a market result.
- **The trigger is constructed** (§4.2). The experiment assumes protection, it does not earn it.
  It says nothing about whether Tinjau would have protected on this event — and the published
  answer to *that* question is that it would not (`known-limitations.md` §2).
- **Zero flow elasticity is assumed.** Identical trades are replayed under a 40× fee difference.
  In reality a 2% fee deters much of the flow a 0.05% fee attracts. This **overstates** the fee
  side and **understates** the adverse-selection side, exactly as `t0-4` §5 records; the net sign
  of the bias is unmeasured and anyone calling the result conservative is guessing.
- **Only the plateau is exercised.** The whole replay sits inside `widenDuration`, at the
  constant `maxFee`. The decay curve — most of a real protection episode — contributes nothing.
  Any positive result is an **upper bound** on the benefit averaged over a full episode.
- **One event, one hour, 120 swaps, one asset, one mock pool.** No sentence may generalise from
  it to tokenized equities, to other assets, or to real liquidity.
- **The mechanism is arithmetically favoured by construction.** Under a fixed trade list, a
  higher fee necessarily leaves the LP holding more quote asset for the same risk asset acquired.
  What is genuinely uncertain is the *magnitude* after curve effects, whether the harness is
  symmetric, and whether the sign survives the reference mark. This experiment is closer to a
  conformance test of the fee mechanism on a real trade shape than to a discovery, and it must be
  described that way.

## 9. How this will be executed

**Script (to be written by S3.2, not by this task):**
`apps/server/src/chain/pairedPoolExperiment.ts`, exposed as
`npm run experiment:paired-pool -- --remote` from `apps/server`.

It must call `assertTestnetOnly(chainId)` before anything else; chain 196 is not on the allow
list and no mainnet action is authorised.

**Environment**, the same variables `tinjauDemoRun.ts --remote` already reads:
`TINJAU_CHAIN_ID=1952`, `TINJAU_RPC_URL`, `TINJAU_REGISTRY`, `TINJAU_HOOK`, `POOL_MANAGER`,
`SWAP_ROUTER`, `LIQUIDITY_ROUTER`, `POSTER_PRIVATE_KEY`, `DEMO_RELAYER_PRIVATE_KEY`,
optionally `GUARDIAN_PRIVATE_KEY` / `TINJAU_ASSESSOR_PRIVATE_KEY`. `RISK_ASSET`, `QUOTE_ASSET`,
`TOKEN0`, `TOKEN1`, `POOL_ID`, `TICK_SPACING` are **not** read — this experiment deploys its own.

**Reused unchanged** (the script must not reimplement any of it): `makeTinjauClients`,
`chainNowSeconds`, `waitForReadConsistency`, `decodeRevert`, `postAssessment`, `readRecord`,
`readFeeDetail`, `readEffectiveState`, `signAssessment`, `runScenario` / `decide`,
`confirmMarket` / `buildConfirmationInput`, `FROZEN_PROMOTION_CONFIG`, `timeShiftScenario`,
`timeShiftSwapWindow`, `buildConstructedProtectWindow`, `decideConstructedProtect`, and the
frozen fixtures `scenario-b-confirmed-protect.json` and `pool-scenario-b-swaps.json`.

**New capability the script has to add**, because nothing in the tree does it today:

1. **Pool-key-parameterised swaps and reads.** `poolKeyOf` / `executeSwap` / `readFeeDetail` in
   `tinjauHarness.ts` are hardwired to the single pool in `TinjauChainConfig`. Variants taking an
   explicit `PoolKeyTuple` are required, including one that works on a **hookless static-fee**
   pool, where there is no `previewFee` to read.
2. **Fresh-token bootstrap.** Deploy two `MockERC20`, mint to the LP EOA and the relayer, approve
   both routers, and call the guardian's `setAssetSupported(riskAsset, true)`.
3. **Pool creation from TypeScript.** `PoolManager.initialize` for both arms. Today only the
   Solidity deploy script initialises pools.
4. **Liquidity add and full withdraw** through `PoolModifyLiquidityTest`, with the LP EOA's token
   balances captured either side of each call. Nothing in the TypeScript harness calls
   `modifyLiquidity` today.
5. **Pool state reads** — `getSlot0`, `getLiquidity`, `getPositionInfo` — via `PoolManager`'s
   `extsload`/`StateLibrary` layout. No helper exists.
6. **Trade-script builder** implementing §4.1 exactly, emitting the frozen script (with `K`, the
   slice bounds, and every dropped row) into the raw output *before* the first swap is sent.
7. **Metric and decision evaluation** implementing §5 and §6, including all three marks, and the
   abort/void guards of §6.1.

**Ordering the script must enforce:** run W complete (deploy → initialise → seed → post `WATCH` →
replay → withdraw → measure) before run P begins, and inside run P the assessment must be
posted and read-consistent before replay step 1.

## 10. Deviations policy

Any departure from §1–§9 is recorded in the tracker's deviations log and published in
`s3-2-paired-pool-result.md` **before** the affected number is quoted anywhere, with the reason
and its effect on the bands. Specifically:

- **The run cannot execute at all** (gas exhausted, RPC unusable, a deploy reverts): S3.2
  publishes the attempt and the failure. It does not substitute a simulation, an Anvil run, or a
  hand-computed figure for the testnet result. An Anvil rehearsal is permitted and encouraged as
  a *dry run*, and its numbers are labelled `ANVIL_REHEARSAL` and are never reported as the
  result.
- **The run is VOID under §6.1**: the void is published with the guard that failed. A re-run is
  permitted only after the fix is described in writing, and the re-run's parameters must be
  identical to §2–§4 except for the single named fix.
- **`N` is reduced**, or rows are dropped by §4.1's rules: the count, the reason and the affected
  indices are published.
- **A threshold, mark, band, script slice, or `N` is changed after any number from either run has
  been seen**: every result from this experiment is void, and the whole thing is re-run and
  re-labelled. This is the same rule as `t0-4` §6.3 and it is not negotiable.
- **The registry side effect** — this experiment marks two fresh mock tokens as supported assets
  on the authoritative production-envelope registry. Their addresses, and the transactions that
  marked them, are published in the raw output and flagged as experiment artifacts so a later
  reader of the registry's supported set is not surprised by them.
