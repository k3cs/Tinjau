# S3.2 — Paired-pool protection experiment, result

**Outcome band: `CONFIRMS`, at `D = 195.38 bps` under the primary mark, with the sign holding
under all three marks and the control run reading exactly zero.** That is the band the frozen
pre-registration defines, and it is stated first because the pre-registration requires the band to
be stated first whichever way it lands. It is also, on its own, worth very little: §8's caveats are
carried forward in full below, the mechanism is arithmetically favoured by construction, and this
result does **not** license the sentence "Tinjau reduces LP loss", which stays prohibited.

**This is the third testnet execution. The first two are void and are published here in full.** The
first passed all seven of the pre-registration's validity gates and printed `CONFIRMS` at
**49,804 bps** — 255× the arithmetic ceiling the fee mechanism can produce — off three withdrawals
that had never read back. It was examined and discarded. A reader who wants to know whether these
numbers can be trusted should read §7 (the post-mortem) before §4 (the result).

- Date: 2026-08-22 (run at `2026-08-21T19:20:06Z` UTC)
- Task: S3.2, executing `s3-1-paired-pool-preregistration.md` (frozen, committed `7d1caa6`)
- Chain: X Layer **Testnet**, id **1952**. No mainnet action was taken or is authorised.
- Raw data: `data/s3_2_paired_pool_result.json`. **Deviation 9, added at commit time.** The
  pre-registration's §7.1 names the path `s3-2-paired-pool-raw.json`, and the run wrote both that
  path and the `data/` one with byte-identical contents. The duplicate was removed and the
  `data/` path kept, because every other study in this repository publishes under `data/` and
  storing 490 KB of the same bytes twice is not a service to anyone. The frozen document was not
  edited; this note is the record, and the file it names is the file below.
- Script: `apps/server/src/studies/pairedPoolExperiment.ts`

---

## 1. What was asked, and what was measured

The frozen question, from §1 of the pre-registration:

> Two otherwise-identical builder-controlled testnet pools receive the same replayed sequence of
> real trades. One is enforcing a Tinjau `PROTECT`; the other has no hook. How much more, or less,
> of the flow's notional does the LP position retain in the protected pool?

That is the whole question. It is **conditional on protection already being in force**. It is not
"does Tinjau protect at the right times" — §3 of the pre-registration shows this experiment
structurally cannot answer that — and it is not "does Tinjau reduce LP loss", which §9 keeps
prohibited.

---

## 2. Deviations from the pre-registration

§10 requires every departure to be published **before** the affected number is quoted. There are
eight. Two of them are substantive; six are cosmetic or are corrections that made the code match
the frozen document rather than the other way round.

**Substantive.**

1. **§6.1 — a validity gate was ADDED (gate 8).** The frozen §6.1 has seven gates and none of them
   says anything about the withdrawal. Testnet attempt 1 passed all seven and reported `CONFIRMS`
   off three withdrawals that had not read back (§7). Gate 8 now voids a run when any arm's full
   burn fails to read back as a burn: no positive return in either currency, non-zero position
   liquidity afterwards, the seeded liquidity missing beforehand, or the two arms' totals more than
   2× apart. **Effect on the bands: one-directional.** This gate can only ever make a run `VOID`.
   It cannot turn a `NULL` into a positive, cannot move a threshold, and cannot rescue a result, so
   adding it after a number had been seen cannot flatter the experiment. `s3-1-...md` was **not**
   edited.

2. **§5.1 / §5.2 — how the readings are taken.** Balance readings either side of the burn are
   pinned to `withdrawBlock - 1` and `withdrawBlock`; each arm's pre-replay state is pinned to its
   seeding block and its terminal state to the block of its own last swap; and a pinned read
   retries while the answering node reports the block as out of range. **Effect on the bands:
   none** — it is provably a no-op on a chain without read lag, because the Anvil rehearsal
   produces bit-identical retained values before and after the change. On *this* venue it is the
   difference between a number and an artefact (§7).

**Cosmetic or corrective.**

3. **§9 — script path.** The script is at `apps/server/src/studies/pairedPoolExperiment.ts`, not
   `src/chain/`. `src/chain` holds the shared harness; `src/studies` holds studies that consume it.
4. **§9 — CLI flag.** The irreversible mode is `--execute`, not `--remote`; `--dry-run` is the
   default and `--rehearse-local` is the §10 Anvil rehearsal. The npm alias
   `experiment:paired-pool` exists as §9 asks.
5. **§7.1 — raw artifact path.** Written to **both** the pre-registered
   `data/s3_2_paired_pool_result.json` (see deviation 9 on the path), identical
   bytes, so the pre-registered name is not quietly dropped.
6. **§9 — environment.** Addresses come from `deployed-addresses.json` (stack
   `production-envelope`) because none of the `TINJAU_*` variables is set here. Every resolved
   address was compared against §2.1's table and matched (`addressesMatchPreRegistration: true`);
   a mismatch would have refused to run.
7. **§4.1 — how `K` is applied.** `K = L_test_human / L_src_human = 1e18 / L_first` exactly, so the
   per-row conversions were applied as exact integer arithmetic rather than through a
   floating-point `K`. Algebraically identical to the document's formula; it removes floating-point
   noise from the low digits of a ~1e21 base-unit amount, which matters only because both arms must
   receive bit-identical inputs.
8. **§9 — reuse.** `decideFromScenario` is composed locally from the exported production modules,
   because the equivalent glue in `tinjauScenes.ts` is not exported and `runScenario` has no
   `poolId` option — and the record must land on *this* run's pool or the hook could never read it.
   Every stage is the unmodified production module, and the composition is asserted against
   `runScenario` on the unshifted canonical scenario before either run proceeds.

**One correction found before any testnet number existed.** The §10 Anvil rehearsal caught the
trade-script builder negating `amount1` on `SELL_RISK` rows, which turned all 50 of them into
exact-*output* swaps and failed gate 4 on 100 of 240 swaps. Fixed to follow §4.1's table literally.
No threshold, mark, band, slice bound, `N` or scale constant was touched — the fix made the code
match the frozen document.

---

## 3. What was actually run

**Frozen inputs, verified on chain before anything was spent.**

| Input | Value | Checked |
|---|---|---|
| `PoolManager` / hook / registry | §2.1's addresses | matched the frozen table |
| envelope | `500 / 20000 / 3600 / 18000 / 21600 / 3600` | read from the registry, matched §2.1 |
| registry paused | `false` | read before the run |
| trade slice | blocks `68201457`–`68201557`, first **120** of 2,952 qualifying rows | 0 rows dropped |
| `K` | `7.104726316809` | from the slice's first-row liquidity `140751375268896370` |
| source liquidity over the slice | min `140751375268896370`, max `143868014728516267` | published per §4.1 |
| position | `[-6000, 6000]`, `liquidityDelta = 1e24`, `salt = 0` | identical in all four arms |
| initial price | `sqrtPriceX96 = 79228162514264337593543950336` (tick 0) | identical in all four pools |
| protocol fee | `0` on every arm | gate 7 |

**Fresh tokens per run**, as §2.2 requires, because `PoolKey` *is* the pool's identity and a virgin
pool is only obtainable with a virgin pair. Both runs' `(riskAsset, poolId_H)` keys were verified
empty (`neverAssessed`) before either assessment was posted, and neither pool id appears in
`deployed-addresses.json`. **No published record was overwritten.**

| | Run W (control) | Run P (treatment) |
|---|---|---|
| risk asset | `0xae1c9c16…d47d60` | `0x39eac3e1…67ac6f` |
| quote asset | `0x166617f1…152f18` | `0xe19e4724…1b463f1` |
| `quoteIsCurrency0` | `true` | `false` |
| pool C (no hook, fee 500) | `0xf6dd5be0…d49d7416` | `0x7df885c1…eaa33793` |
| pool H (hook, dynamic fee) | `0x6f2b9b82…c952411f` | `0xc44df308…e383e927` |
| assessment posted | `0xd4709443…ae4ed8bf` | `0xd1c80996…d129bd99` |
| state posted | `WATCH` (confidence MEDIUM) | `PROTECT` (confidence HIGH) |
| market leg | canonical scenario B, time-shifted | **CONSTRUCTED** |

The two arms differ in exactly the one way the contract forces them to. `TinjauFeeHook.beforeInitialize`
reverts unless the pool carries `DYNAMIC_FEE_FLAG`, so "the same pool without the hook" cannot
exist; the control's static fee is set to `500`, exactly the hook's `baseFee`, and run W tests that
equality empirically rather than assuming it.

**Run W was executed and evaluated first**, as §4.3 requires, so the noise floor was measured before
the treatment and could not be chosen to fit it.

---

## 4. The result

### 4.1 Run W — the control

Run W carries a hard pre-registered prediction: both arms charge exactly 500 on every swap, both
pools start identical, v4's math is deterministic, so the retained-value difference **must be
exactly zero in base units**, not approximately zero.

It is exactly zero.

```text
arm C returned  W0 = 371849304347066139176754   W1 = 157948771065150158984844
arm H returned  W0 = 371849304347066139176754   W1 = 157948771065150158984844
retainedDelta = 0 under all three marks
```

Bit-identical, both positions reading 0 liquidity after the burn. All 120 swaps on both arms
charged exactly 500. `|D_notional,watch| = 0.000000 bps`, which is the noise floor §6.2 uses.

### 4.2 Run P — the treatment

All 120 arm-H swaps were charged **20,000 pips**; all 120 arm-C swaps were charged **500**. The
hook's `previewFee` agreed with what `PoolManager` charged on **120 of 120** swaps. The realised
fee differential is therefore `Δf̄ = 195.0000 bps` exactly.

```text
arm C returned  Wq = 371849304347066139176754   Wr = 157948771065150158984844
arm H returned  Wq = 371862020807784762904962   Wr = 159736500001720652453540
```

**All three marks, published together. Quoting the primary alone is forbidden by §7.6.**

| Mark | `P_ref` (quote per risk) | `D_notional` | `D_LP` | sign |
|---|---|---|---|---|
| **PRIMARY** — arm C terminal price | `1.237927721114` | **`195.3812 bps`** | `39.2295 bps` | `+` |
| **S1** — initial price 1.0 | `1.000000000000` | `158.2181 bps` | `33.9836 bps` | `+` |
| **S2** — arm H terminal price | `1.233045899945` | `194.6195 bps` | `39.1288 bps` | `+` |

**The sign held under all three marks**, so the outcome is not `SIGN-INDETERMINATE`. This matters:
`known-limitations.md` §3 records that all 27 comparable cells of the three-policy benchmark flipped
sign between two arithmetic conventions, which is why §7.2 makes a sign flip disqualifying rather
than a footnote.

### 4.3 The band

```text
D  = 195.3812 bps      (primary mark)
Δf̄ = 195.0000 bps      (realised, from the fees the pools actually charged)
F  = max(0.05 × Δf̄, 3 × |D_watch|) = max(9.75, 0.00) = 9.7500 bps
CONFIRMS threshold = 0.50 × Δf̄ = 97.5000 bps

D ≥ 97.5000 and D ≥ 9.7500  ->  CONFIRMS
```

### 4.4 Is the magnitude plausible? — the check that attempt 1 failed

A `CONFIRMS` from a mechanism that is arithmetically favoured by construction deserves *more*
scepticism, not less. The check is whether `D` is near the ceiling the fee differential can produce,
and not wildly above it:

```text
cumulativeNotional                    1.13921e23 mock-quote base units
retainedDelta                         2.22580e21
naive ceiling (Δf̄ × notional)         2.22145e21
actual / naive                        1.00195
```

`D` is **100.195%** of what the fee differential alone predicts. The extra 0.195% is the expected
second-order term: arm H's price moved less (terminal tick 2094 against arm C's 2134) because less
notional reached the curve, so it gave out less risk asset, and that surplus is worth slightly more
than par when valued at arm C's terminal mark. Under mark S1, which values it at par, `D` falls to
81% of `Δf̄`. Both directions are what the mechanism predicts.

For contrast, attempt 1's discarded figure was `49,804 bps`, i.e. **255× the ceiling**. No envelope
bounded at `maxFee = 20000` can produce that, which is exactly why it was not believed.

**Independent cross-check.** The same script run against a local Anvil with a freshly deployed
stack produces **bit-identical** retained values for all four arms and `D = 195.38121848451166 bps`
— identical to 17 significant figures. Two independent chains, the same v4 bytecode, the same
inputs, the same answer. The rehearsal artifact is at
`data/s3_2_paired_pool_anvil_rehearsal.json` and is labelled `ANVIL_REHEARSAL`; per §10 its numbers
are a dry run and are never the result.

### 4.5 Validity gates

| Gate | Clause | Requirement | Run W | Run P |
|---|---|---|---|---|
| 1 | §6.1.1 | both pools identical before replay step 1 | PASS | PASS |
| 2 | §6.1.2 | run P's last swap within 3,000 s of `protectStartedAt` | n/a | PASS (`t = 364 s`) |
| 3 | §6.1.3 | the §17 guard — all N arm-H swaps above base, all arm-C at base | PASS | PASS (120/120, 120/120) |
| 4 | §6.1.4 | no partial fill on either arm | PASS (240/240) | PASS (240/240) |
| 5 | §6.1.5 | registry record correct before and after; no published pool written | PASS | PASS |
| 6 | §6.1.6 | run W's `retainedDelta` exactly 0 in base units | PASS | n/a |
| 7 | §6.1.7 | protocol fee equal on both arms, recorded (`0`) | PASS | PASS |
| **8** | **ADDED by S3.2** | every full burn reads back as a burn | PASS | PASS |

Gate 8 is not in the frozen §6.1. See §2, deviation 1.

### 4.6 Cost

| | Before | After | Spent |
|---|---|---|---|
| LP / guardian `0x8BCC…29e1` | `0.199232962 OKB` | `0.199130319 OKB` | `0.000102643 OKB` |
| swapper `0x4e769…9eBd` | `0.197436985 OKB` | `0.196075504 OKB` | `0.001361480 OKB` |

`72,581,425` gas units for the whole experiment. Across all three attempts the two wallets spent
`~0.00413 OKB` of the `~0.199 OKB` each held at the start. Gas is testnet-only, is paid by the
builder rather than by an LP, and is excluded from every metric per §5.5.

---

## 5. Every number carries its basis

| Field | Basis |
|---|---|
| the 120-row trade script, its direction and sizes | **OBSERVED** — real chain-196 swaps, frozen fixture |
| the fees each pool charged | **OBSERVED** — from `PoolManager`'s own `Swap` event |
| both pools' start and terminal states | **OBSERVED** — pinned `extsload` reads |
| the withdrawals, `Wq` and `Wr` | **OBSERVED** — pinned `balanceOf` either side of the burn |
| the registry writes and the fee enforcement | **OBSERVED** — on chain, transaction hashes in the raw artifact |
| **run P's market leg, and therefore the `PROTECT` itself** | **CONSTRUCTED** |
| the 8-K evidence, the promotion thresholds, the `CONFIRMED` verdict | **OBSERVED** / real engine, unmodified |

Standing label, on every figure: **both pools hold builder-controlled, freely-mintable mock tokens
with no value.** Every amount is in base units of those mocks. No figure here is money, a market
result, or a price.

---

## 6. What this can and cannot show

§8 of the pre-registration, carried forward unchanged now that a number exists. Nothing here is
softened because the result came out positive.

**It can show:** on a builder-controlled X Layer Testnet pool holding freely-mintable mock tokens,
replaying a real recorded swap sequence through two pools that are identical except for the hook,
how much more of the flow's notional the LP position retains while a Tinjau `PROTECT` is being
enforced at full strength.

**It cannot show, and no artifact may imply otherwise:**

- **It does not license the sentence "Tinjau reduces LP loss."** That sentence stays prohibited
  until the original pre-registered `canClaimLossAvoided` conditions
  (`t0-4-benchmark-preregistration.md` §8.6) pass on canonical data. This experiment does not touch
  those conditions and cannot open that gate. `known-limitations.md` §18 stands unchanged.
- **Neither pool is a market.** No external liquidity, no external participant, no price discovery.
- **The trigger is constructed.** Run P assumes protection; it does not earn it. It says nothing
  about whether Tinjau would have protected on this event — and the published answer to *that*
  question is that it would **not** (`known-limitations.md` §2). The trades did not cause the
  assessment; §17's timing problem is sidestepped, not solved.
- **Zero flow elasticity is assumed.** Identical trades were replayed under a 40× fee difference.
  In reality a 2% fee deters much of the flow a 0.05% fee attracts. This **overstates** the fee side
  and **understates** the adverse-selection side; the net sign of the bias is unmeasured and anyone
  calling this result conservative is guessing.
- **Only the plateau is exercised.** The whole replay sat inside `widenDuration` at a constant
  20,000 pips — `t = 364 s` of a 3,600 s plateau. The decay curve, which is most of a real
  protection episode, contributed nothing. **`195.38 bps` is an upper bound** on the benefit
  averaged over a full episode.
- **One event, one hour, 120 swaps, one asset, one mock pool.**
- **The mechanism is arithmetically favoured by construction.** Under a fixed trade list a higher
  fee necessarily leaves the LP holding more of the input asset for the same output delivered. What
  was genuinely uncertain was the *magnitude* after curve effects, whether the harness is symmetric,
  and whether the sign survives the reference mark. **This experiment is closer to a conformance
  test of the fee mechanism on a real trade shape than to a discovery, and it must be described
  that way.** The honest one-line reading is: *the fee mechanism delivered essentially exactly its
  own arithmetic ceiling, and the harness was symmetric.*
- **Nothing here may appear in the same table as the three-policy benchmark.** That study is a
  mainnet replay on a different pool, and `t0-4` §5.4 forbids combining the two into one figure.

**Registry side effect.** This experiment marked six freshly deployed mock tokens as supported
assets on the authoritative production-envelope registry — two from the result run and four from the
two void attempts. They are experiment artifacts, not vetted production assets. Their addresses and
the marking transactions are in the raw artifacts.

---

## 7. Post-mortem — the two void attempts, published in full

This section exists because a sceptical reader should weigh it more heavily than §4. A result of
attempt 1's shape, published unchecked, would have been indefensible.

### 7.1 Attempt 1 — all seven gates passed and the answer was nonsense

Attempt 1 printed:

```text
[s3.2:W] arm C withdrawn: Wq=0 Wr=0
[s3.2:W] arm H withdrawn: Wq=0 Wr=0
[s3.2:P] arm C withdrawn: Wq=0 Wr=0
[s3.2:P] arm H withdrawn: Wq=371849304347066139176754 Wr=157948771065150158984844
[s3.2] OUTCOME BAND: CONFIRMS   D = 49804.7048 bps
```

A full burn of a `[-6000, 6000]` position seeded with `1e24` cannot return zero of both currencies.
Three of the four withdrawals did not read back, and the consequences were:

- **Run W's `D = 0.0000` was a false pass.** It was zero because nothing was measured on either
  side, not because the two arms matched. A control that is zero by no-op proves nothing, and it
  would have been reported as the pre-registered bit-exact zero.
- **Run P's `D = 49,804.7 bps` was "one arm has a balance and the other has none"**, not a fee
  effect. 255× the arithmetic ceiling.
- **All seven of §6.1's gates passed anyway**, because none of them says anything about the
  withdrawal.

**Root cause, from the raw balances rather than from a guess.** Every reading in that run returned
`9481658664595193566921460`, for both currencies, in both runs, across four distinct token
contracts. That value is not noise — it is exactly `1e25 − 2 × 2.5918e23`, the correct LP balance
after both positions were seeded. So the reads were hitting the right account and the seeding had
worked; the **"after" readings were served from a node that had not seen the burn**. Run P's arm H
differenced a stale "before" against an "after" that had caught up by exactly one withdrawal, which
is why its delta equals arm C's expected withdrawal to the digit.

This is a documented property of the venue, not a surprise: `deployed-addresses.json` records a
measured 2,519–2,746 ms convergence lag and `known-limitations.md` §1 calls it *"the most important
operational fact here"*. §5.1 says "`balanceOf` before, `balanceOf` after"; on this RPC that
instruction, taken literally, differences two stale reads.

Candidate explanations that the evidence **rules out**: a wrong position tuple or wrong `salt` (the
burns all succeeded and Anvil reproduced them exactly); settlement to the router rather than the
caller (the "before" balance was correct for the LP account); a `quoteIsCurrency0` ordering bug (the
same zero appeared in both runs, and the two runs have opposite ordering); mismatched
`takeClaims` / `settleUsingBurn` flags (identical to the add path, and correct on Anvil).

Preserved at `data/s3_2_paired_pool_run1_void_raw.json` and
`data/s3_2_paired_pool_run1_void_console.log`, unedited.

### 7.2 Attempt 2 — the same fault, surfacing loudly

With the readings pinned to block numbers, attempt 2's run W threw at its terminal state read:

```text
eth_call ... "0x2514283"   ->  block is out of range
```

The node answering had not reached the block its own last swap had just confirmed in. Pinning had
converted a silent wrong answer into a loud refusal — better, but still fatal. The runner published
the attempt and refused to fall back to `"latest"`, so run W never completed; with no control there
is no noise floor, and §4.3 does not permit run P's bands without one, so run P was stopped by hand
rather than left to compute a band it was not entitled to.

Preserved at `data/s3_2_paired_pool_run2_void_console.log`. No raw artifact exists — the process was
stopped before it wrote one.

### 7.3 The single named fix, and the evidence it was load-bearing

> **Pin every post-transaction read to the block number of the transaction that produced it, and
> retry while the answering node reports that block as missing. Never fall back to `"latest"`, and
> never accept an earlier block's answer.**

Nothing in §2–§4 changed: same tokens-per-run rule, same envelope, same tick range, same liquidity,
same slice, same `N`, same `K`, same marks, same bands.

The result run records both readings, so the fix can be seen working rather than taken on trust. In
run P, on the run that produced the published number:

```text
arm C   pinned delta = 157948771065150158984844 / 371849304347066139176754
arm C   naive  delta = 0 / 0                     <- what "latest" still returned
arm H   pinned delta = 159736500001720652453540 / 371862020807784762904962
arm H   naive  delta = 0 / 0                     <- what "latest" still returned
```

The naive reads would have returned zero **again**, in the successful run. Measured read-consistency
waiting across the run: 56 observations, 22,692 ms total, 2,860 ms maximum — consistent with the
2,519–2,746 ms figure already published for this RPC.

### 7.4 What this says about the pre-registration

The gap is in the frozen document, not only in the code. §6.1 specifies seven gates covering pool
state, timing, fees, fills, the registry and the protocol fee — and nothing covering the measurement
step that produces the actual decision quantity. A future pre-registration of this shape should gate
its own measurement. That is recorded here rather than fixed by editing `s3-1-...md`, which stays
frozen.

---

## 8. Reproducing this

```bash
cd apps/server
npx tsx src/studies/pairedPoolExperiment.ts --dry-run        # verifies inputs, sends nothing
npx tsx src/studies/pairedPoolExperiment.ts --rehearse-local # full run on a local Anvil (§10)
npx tsx src/studies/pairedPoolExperiment.ts --execute        # X Layer Testnet, irreversible
```

The result is recomputable from `data/s3_2_paired_pool_result.json` without re-running the chain: it carries
a row for every `(run, arm, swap index)` triple attempted — 480 rows — plus both pools' start and
end states, all three marks, `Δf̄`, every gate with its pass/fail and its detail, every transaction
hash, gas, and the frozen trade script including `K` and the (empty) dropped-row list.

---

## 9. The claim gate

Unchanged by this result, and unchangeable by it:

> **"Tinjau reduces LP loss", and every variant of it, remains prohibited.**
> `canClaimLossAvoided` stays `false`.

What may be said, and only with its conditions attached:

> On two builder-controlled X Layer Testnet pools holding valueless mock tokens, identical except
> for the hook, replaying 120 real recorded swaps while a **constructed** `PROTECT` was enforced at
> full strength on the constant-fee plateau, the protected pool's LP position retained
> **195.38 bps** more of the flow's notional than the unprotected pool under the pre-registered
> primary mark (**158.22–195.38 bps** across all three marks), against a realised fee differential
> of 195 bps. The paired control run, in which both pools charged the same fee, differed by exactly
> zero.
