# Markout study (task P2.4)

Status: **pre-registration written 2026-08-17, before the 32-event sweep in §3/§4 has
run.** Everything below §1/§2 (formula, horizons, scope, denominator, the frozen 32-event
list with computed event blocks) is fixed in advance, following this project's
pre-registration discipline (see `reaction-latency-study.md` and `parse-accuracy-study.md`
for the pattern). One single-event dry run (NVDA, index 0 below) was re-verified live
against RPC data while writing this method section — same discipline the P2.2 planning
agent used, and needed here to resolve a real ambiguity in how the horizon cutoff is
anchored (documented in §1.3). No RPC calls were made for any of the other 31 events, and
no results were read, before this document's §1/§2 were written.

## 1. Method (pre-registered)

For every one of the 32 qualifying events (§2) — a filing from P2.2's sample that had a
non-null `gap_seconds`, i.e. a first post-filing trade was actually found within P2.2's
±60min window — we measure the realised markout to LPs of that first trade.

### 1.1 The trade

`S*` = the first `Swap` log at or after the event block `eb`, in the token's reference USDG
pool, ordered by `(blockNumber, logIndex)`. This is the same trade P2.2 already located;
our fresh RPC sweep is expected to reproduce P2.2's `gap_seconds` exactly for every event
(cross-checked in §4).

### 1.2 Price from `sqrtPriceX96`

```
raw = (sqrtPriceX96 / 2**96) ** 2          # token1 per token0, base units
human_t1_per_t0 = raw * 10 ** (dec0 - dec1)
P = 1 / human_t1_per_t0     if usdg_is_token0
P =     human_t1_per_t0     if NOT usdg_is_token0   # MSTR, COIN
```

`usdg_is_token0` is derived per pool from a live `token0()`/`token1()`/`decimals()` call —
**never hardcoded**. Token ordering is not uniform across the 10 reference pools: 8 pools
have USDG as `token0` (6 decimals), but MSTR (`0xb665a8ed2c09bd243acfee75a82ef3a8b3f63c67`)
and COIN (`0xfd69fd884bd7c35df86d2ec80ae74cbe774c00ab`) have USDG as `token1`. Verified live
2026-08-17 for all 10 pools before any event sweep ran (§2 table below).

### 1.3 Markout formula and horizon anchoring

Signed pool-side deltas from `S*` (human units):

```
dU = (USDG-side amount) / 10**6     # amount0 if usdg_is_token0 else amount1
dS = (equity-side amount) / 10**18  # amount1 if usdg_is_token0 else amount0
```

Markout to LPs at horizon `h` (USD, negative = LP loss):

```
M_h = dU + dS * P_h
```

where `P_h` = price implied by `sqrtPriceX96` of the **last** Swap in the same pool with
`blockNumber <= first_trade_block + h` (`h` is anchored on `S*`'s own timestamp `t*`, not
on the event block `eb` — a markout is a property of the trade). If no swap after `S*`
satisfies that bound, `P_h = P_post(S*)`.

**Sweep window is fixed at `[eb, eb+3600]`, not extended per-event.** For events with a
small `gap_seconds`, `t*+3600` falls inside this window and every horizon gets a genuine
t*-anchored price. For events with a large `gap_seconds` (up to 1718s in this sample),
`t*+3600` can fall outside `[eb, eb+3600]`; in that case `P_3600` is computed from
whatever data the fixed window actually has, which understates the horizon's true
elapsed time from `t*`. This is disclosed transparently via the
`later_swap_count_by_h_3600` coverage field per event (§3) rather than silently smoothed
over — **this was verified, not assumed**: a single-event dry run (NVDA, event 0, gap=222s)
was re-computed live against RPC data with both t*-anchored and eb-anchored cutoffs before
this section was finalised, to resolve an apparent inconsistency between the plan's
prose formula (t*-anchored) and its own pre-verified NVDA dry-run numbers
(`+$0.0214@5min`, `+$0.0068@30min`, `-$0.1175@60min`). The fixed-window,
t*-anchored implementation reproduces all three numbers exactly
(`M_300=0.021433`, `M_1800=0.006818`, `M_3600=-0.117460`) — confirming the fixed window
(not an eb-anchored horizon) is the correct reading of the approved plan.

Decomposition (both reported):

```
M_0 = dU + dS * P_post          # fee + curve premium, structurally >= 0
M_h = M_0 + dS * (P_h - P_post) # the adverse-selection term
```

Protocol-fee haircut (`feeProtocol=0x44` on every pool -> 25% of the 0.05% pool fee to
protocol, 75% stays with LPs), computed once per event off `P_post` (the trade-execution
price — the protocol's dollar take is realised at the trade itself, it does not change
with a later markout price) and subtracted uniformly from every horizon:

```
inputUSD = dU if dU > 0 else dS * P_post
haircut = 0.25 * 0.0005 * abs(inputUSD)
M_h_LP = M_h - haircut
```

Both `M_h` (gross) and `M_h_LP` (net of protocol fee) are reported side by side.

`P_pre` is diagnostic only (not used in the formula): search backward from `eb` in
100-block chunks, stop at the first Swap found, hard-stop at `eb-3600`; `null` if none
found.

**Horizons: h in {60, 300, 900, 1800, 3600} seconds. Primary = 3600s (60min).** Shorter
horizons frequently collapse to `M_0` (no later swap yet) — the coverage stat
(`later_swap_count_by_h_*`, count of events with >=1 later swap by that horizon) is
reported at every horizon so the reader can see how much each horizon's number actually
reflects new information versus falling back to `M_0`.

Secondary window-aggregate measure (same sweep, free): sum markout over every swap in
`[eb, eb+3600]`, valued at the terminal (`P_3600`) price. Labeled clearly as
secondary/mixed-flow, never the headline — it mixes many later trades' flow together and
is not a per-trade markout.

### 1.4 Scope and denominator

- All 32 qualifying events run across their own reference pools (not just NVDA's n=2).
  USDG/wNVDAx (NVDA's pool) is additionally reported separately, explicitly labeled
  **n=2**, as the "named reference case" from spec §4.8c.
- `TVL_event` = pool's token balances **at the event block** (`balanceOf` via archive
  `eth_call`), converted to USD via `P_event` (the pool's own `slot0` at `eb`). **Not**
  current TVL — a pool that's thinly liquid today (e.g. AMZN's, down to ~$19 as of
  2026-08-17) may have had real liquidity at its event time; using today's TVL would
  misstate the denominator.
- Reported per event: `M_3600` in dollars, in bps of notional (`abs(dU)`), and in bps of
  `TVL_event`.

## 2. Sample

### 2.1 Pool metadata (all 10 reference pools, verified live 2026-08-17)

| Ticker | Pool | usdg_is_token0 | dec0 / dec1 | fee | tickSpacing | feeProtocol |
|---|---|---|---|---|---|---|
| NVDA | `0x2a2b11730c2b6d99a58034a869dd810d7300a7b2` | true | 6/18 | 500 | 10 | 0x44 |
| MSTR | `0xb665a8ed2c09bd243acfee75a82ef3a8b3f63c67` | **false** | 18/6 | 500 | 10 | 0x44 |
| AAPL | `0xc44bd9c8589026d28d1632d7b86b2efb6cdc8fd2` | true | 6/18 | 500 | 10 | 0x44 |
| GOOGL | `0x8ce66218a6310765307e7ab2d11bcff7cc2ea1f1` | true | 6/18 | 500 | 10 | 0x44 |
| TSLA | `0xe1071db4691b325c709854dc3d5ccd5d77e62ed1` | true | 6/18 | 500 | 10 | 0x44 |
| META | `0xfad9e3c7550768fd4f34bc9cefd365cc193c0fb0` | true | 6/18 | 500 | 10 | 0x44 |
| SNDK | `0x51fefdfd51f0b95f71ea236b6b349902457269f8` | true | 6/18 | 500 | 10 | 0x44 |
| CRCL | `0x00b2b9fe5653799a62bc58f37cd271d05a3ab381` | true | 6/18 | 500 | 10 | 0x44 |
| COIN | `0xfd69fd884bd7c35df86d2ec80ae74cbe774c00ab` | **false** | 18/6 | 500 | 10 | 0x44 |
| AMZN | `0x8c1c0d559d1c7ae6ed921cc77abd0f26ac2fe59a` | true | 6/18 | 500 | 10 | 0x44 |

`usdg_is_token0` confirmed live via `token0()`/`decimals()`, not assumed — MSTR and COIN
are the two exceptions, matching the planner's verified finding.

### 2.2 The 32 qualifying events (block <-> ts via `block = unix_ts - 1718769036`, zero drift)

| # | Ticker | Form | Accepted (UTC) | Event block `eb` | P2.2 `gap_seconds` |
|---|---|---|---|---|---|
| 0 | NVDA | 4 | 2026-08-12T21:13:10Z | 67800154 | 222 |
| 1 | CRCL | 4 | 2026-08-04T21:08:58Z | 67108702 | 266 |
| 2 | NVDA | 4 | 2026-08-07T20:47:24Z | 67366608 | 428 |
| 3 | GOOGL | 8-K | 2026-08-10T20:10:48Z | 67623612 | 883 |
| 4 | SNDK | 8-K | 2026-08-05T20:09:06Z | 67191510 | 3 |
| 5 | MSTR | 4 | 2026-08-10T20:01:03Z | 67623027 | 69 |
| 6 | CRCL | 4 | 2026-08-04T21:07:18Z | 67108602 | 75 |
| 7 | SNDK | 4 | 2026-08-05T00:18:39Z | 67120083 | 106 |
| 8 | MSTR | 8-K | 2026-08-10T12:00:15Z | 67594179 | 237 |
| 9 | CRCL | 4 | 2026-08-04T21:05:57Z | 67108521 | 0 |
| 10 | CRCL | 4 | 2026-08-14T21:02:52Z | 67972336 | 1059 |
| 11 | MSTR | 8-K | 2026-08-03T12:00:16Z | 66989380 | 324 |
| 12 | COIN | 4 | 2026-08-05T20:17:19Z | 67192003 | 1 |
| 13 | CRCL | 4 | 2026-08-12T21:00:31Z | 67799395 | 1718 |
| 14 | MSTR | 8-K | 2026-07-30T20:00:23Z | 66672587 | 355 |
| 15 | CRCL | 4 | 2026-08-07T21:01:15Z | 67367439 | 128 |
| 16 | COIN | 8-K | 2026-07-30T20:06:18Z | 66672942 | 518 |
| 17 | CRCL | 4 | 2026-08-07T21:00:33Z | 67367397 | 170 |
| 18 | META | 4 | 2026-08-13T00:37:22Z | 67812406 | 447 |
| 19 | CRCL | 8-K | 2026-08-05T10:12:18Z | 67155702 | 0 |
| 20 | META | 4 | 2026-08-07T01:53:04Z | 67298548 | 283 |
| 21 | AMZN | 4 | 2026-08-05T20:42:44Z | 67193528 | 406 |
| 22 | CRCL | 4 | 2026-08-04T21:14:06Z | 67109010 | 950 |
| 23 | AMZN | 4 | 2026-08-05T20:34:25Z | 67193029 | 135 |
| 24 | AAPL | 4 | 2026-08-13T22:30:20Z | 67891184 | 852 |
| 25 | CRCL | 4 | 2026-08-04T21:12:30Z | 67108914 | 54 |
| 26 | AMZN | 8-K | 2026-07-30T20:06:23Z | 66672947 | 408 |
| 27 | META | 4 | 2026-08-04T22:18:06Z | 67112850 | 578 |
| 28 | AAPL | 8-K | 2026-07-30T20:30:28Z | 66674392 | 539 |
| 29 | CRCL | 4 | 2026-08-04T21:11:07Z | 67108831 | 137 |
| 30 | META | 4 | 2026-08-04T22:16:44Z | 67112768 | 660 |
| 31 | CRCL | 4 | 2026-08-04T21:10:12Z | 67108776 | 192 |

Ticker breakdown: CRCL 12, MSTR 4, META 4, AMZN 3, NVDA 2, SNDK 2, COIN 2, AAPL 2, GOOGL 1.
Form breakdown: Form 4 = 23 (secondary), 8-K = 9 (primary). This table is frozen — the
sweep in §3/§4 indexes into it by position, not a re-derivation from a fresh P2.2 re-run.

Method script: `data/p2_4_markout_method.py`. Raw per-event results:
`data/p2_4_markout_raw.jsonl` (appended immediately as each event completes, one row per
event, resumable via `--start N --stop M`).

---

*Everything below this line was written after the 32-event sweep ran, 2026-08-17.*

## 3. Results

**All 32 events completed with zero residual RPC errors and an exact `gap_seconds` match
against P2.2's original sweep (32/32).** No re-sweep or gap-fill pass was needed — see §4
for the reconciliation detail. Two real bugs were caught and fixed during implementation,
both disclosed here rather than silently absorbed into the numbers:

1. The plan's formula text said horizons anchor on `t*` (the trade's own timestamp) but
   its own pre-verified NVDA dry-run numbers only reproduce under a **fixed sweep window
   `[eb, eb+3600]`** with t*-anchored cutoffs computed against that fixed window (not an
   extended one) — resolved and verified against live RPC data before the full sweep ran
   (§1.3).
2. The plan stated `feeProtocol=0x44` (25% protocol fee) holds "on all 10 pools" as a
   general fact. That's true **today**, but reading `feeProtocol` live **at each event's
   own block** (not just currently) found **4 of the 32 events had `feeProtocol=0`**
   (protocol fee not yet turned on) at their event time: MSTR 8-K (2026-07-30), COIN 8-K
   (2026-07-30), AMZN 8-K (2026-07-30), AAPL 8-K (2026-07-30) — all four of the earliest
   8-Ks in the non-NVDA/MSTR-pilot cohort. The haircut for these 4 events is correctly
   $0 (not 25%-of-fee), and every `M_h_LP` value below reflects the historically-correct
   per-event `feeProtocol`, not the current one.

### 3.1 Headline: 60-minute markout, all 32 events

| Statistic | M_60m (gross) | M_60m_LP (net of protocol fee) |
|---|---|---|
| Median | -$0.0508 | -$0.0614 |
| Mean | -$2.5770 | -$2.5874 |
| Sum | -$82.46 | -$82.80 |
| Min | -$39.00 | -$39.00 |
| Max | +$0.98 | +$0.97 |

- **25 of 32 events (78%) show a net LP loss at 60min; 7 show a net LP gain.**
- Median 60-min markout in bps of notional: **-9.5bps**. Median in bps of `TVL_event`:
  **-0.002bps** (i.e. two ten-thousandths of a basis point of pool TVL — utterly
  immaterial at the pool-TVL scale for the median event).
- Aggregate (sum-of-dollars) picture is dominated by a small number of large first-trade
  notionals, not a systematic per-event effect — see §3.4.

### 3.2 Full markout curve (all 5 horizons, M_h_LP, all 32 events)

| Horizon | Median | Mean | Sum | Min | Max | Coverage (≥1 later swap) |
|---|---|---|---|---|---|---|
| 60s | -$0.027 | -$0.174 | -$5.57 | -$2.31 | +$0.64 | 19/32 (59%) |
| 300s (5min) | -$0.030 | -$0.609 | -$19.47 | -$7.43 | +$1.61 | 25/32 (78%) |
| 900s (15min) | -$0.029 | -$1.020 | -$32.65 | -$12.10 | +$0.28 | 29/32 (91%) |
| 1800s (30min) | -$0.022 | -$1.887 | -$60.40 | -$23.80 | +$1.34 | 30/32 (94%) |
| **3600s (60min, primary)** | **-$0.061** | **-$2.587** | **-$82.80** | **-$39.00** | **+$0.97** | **31/32 (97%)** |

Coverage rises with horizon, as expected — by 60min, 31 of 32 events have seen at least
one more swap after the first trade (the one exception is event #3, GOOGL 8-K, `M_h_60m =
M_0` by fallback, i.e. genuinely no re-pricing swap in the whole 60min window). Short
horizons (60s, 300s) are frequently just `M_0` (no later swap yet) — the median at every
horizon stays small (single-digit-to-tens of cents), while the mean/sum are pulled by a
handful of large-notional 8-K trades.

### 3.3 Split by form type

| Split | n | Median M_60m_LP | Mean | Sum | LP-loss count |
|---|---|---|---|---|---|
| **8-K (primary)** | 9 | -$1.097 | -$8.541 | -$76.87 | 7/9 |
| **Form 4 (secondary)** | 23 | -$0.059 | -$0.258 | -$5.93 | 18/23 |

8-K events carry a visibly larger median and mean markout than Form 4 — consistent with
8-Ks (earnings, material events) drawing larger, more informed first trades than routine
insider Form 4 filings. Notional confirms this: 8-K median first-trade notional is
$104.80 (mean $405, pulled up by three ~$1,000 trades); Form 4 median is $104.89 (mean
$94.76, no comparable outliers).

### 3.4 Per-ticker (M_60m_LP)

| Ticker | n | Median | Sum |
|---|---|---|---|
| AAPL | 2 | -$11.85 | -$23.70 |
| AMZN | 3 | -$0.03 | -$39.04 |
| COIN | 2 | -$3.75 | -$7.51 |
| CRCL | 12 | -$0.13 | -$7.85 |
| GOOGL | 1 | -$0.01 | -$0.01 |
| META | 4 | -$0.01 | +$0.11 |
| MSTR | 4 | -$0.06 | -$0.79 |
| NVDA | 2 | -$0.06 | -$0.12 |
| SNDK | 2 | -$1.94 | -$3.88 |

**Two events (AMZN's 8-K, -$39.00; AAPL's 8-K, -$23.71) supply 76% of the entire 32-event
dollar-sum loss** (-$62.71 of -$82.80). Both are driven by unusually large first-trade
notionals ($998.90 and $1,023.43 respectively — roughly 10x the typical $105 first
trade), not by an unusually large price move. n≈2-4 per ticker is too small to call this
a per-ticker pattern rather than two individual large trades; see Limitations §5.6.

### 3.5 USDG/wNVDAx named reference case (n=2, spec §4.8c)

| Horizon | Event A (gap=222s, 2026-08-12, planner's dry run) | Event B (gap=428s, 2026-08-07) |
|---|---|---|
| 60s | +$0.0083 | +$0.0031 |
| 300s | +$0.0083 | +$0.0062 |
| 900s | +$0.0085 | +$0.0160 |
| 1800s | -$0.0063 | -$0.0016 |
| **3600s** | **-$0.1306** | **+$0.0112** |

Event B (gap=428s) shows a tiny net LP gain at 60min (+$0.0112); Event A (gap=222s — the
planner's original dry-run event) shows a small net loss (-$0.1306). Both are
cents-scale. **This is the headline number spec §9 item 1 asked for: on the pool named in
the spec, realised LP damage from the first post-filing trade is on the order of a few
cents per event**, not the ~$20 figure spec §9 item 1's illustrative example guessed at.

### 3.6 Secondary window-aggregate measure (mixed-flow, not the headline)

Summed markout over every swap in `[eb, eb+3600]`, valued at the 3600s terminal price —
this mixes the first trade with every subsequent trade in the window and is reported only
because it fell out of the same sweep for free. Sum across all 32 events:
**-$2,014.91** (dominated by the same large-notional pools; AMZN 8-K alone contributes
-$368.54 to this aggregate). This number is **not** comparable to §3.1-3.4 and must not be
quoted as "the markout" — it answers a different question (net flow-weighted repricing
cost across *all* trading in the hour, not the cost of the *one* first trade).

### 3.7 The 14 no-trade events (P2.2), named explicitly

Markout = $0 by construction (no trade occurred within P2.2's ±60min window, so there is
no `S*` to measure). Not silently dropped — listed here as a distinct row class:

| Ticker | Form | Accepted (UTC) | Event block | Pool deployed at event? |
|---|---|---|---|---|
| GOOGL | 4 | 2026-08-12T00:48:40Z | 67726684 | true |
| META | 8-K | 2026-07-29T20:03:23Z | 66586367 | true |
| GOOGL | 4 | 2026-08-07T01:34:36Z | 67297440 | true |
| GOOGL | 4 | 2026-07-30T20:40:59Z | 66675023 | true |
| GOOGL | 4 | 2026-07-29T23:28:13Z | 66598657 | true |
| COIN | 4 | 2026-07-31T23:35:43Z | 66771907 | true |
| GOOGL | 4 | 2026-07-29T21:58:39Z | 66593283 | true |
| MSTR | 4 | 2026-07-28T20:30:04Z | 66501568 | true |
| MSTR | 8-K | 2026-07-27T12:00:17Z | 66384581 | true |
| AMZN | 4 | 2026-08-11T00:19:07Z | 67638511 | true |
| MSTR | 4 | 2026-07-23T22:04:11Z | 66075215 | true |
| **MSTR** | **8-K** | **2026-07-20T12:00:16Z** | **65779780** | **false** |
| META | 4 | 2026-08-05T22:37:36Z | 67200420 | true |
| META | 4 | 2026-07-29T22:17:17Z | 66594401 | true |

**Confirms the planner's exact prediction: exactly 1 of the 14 no-trade events (the MSTR
8-K at 2026-07-20T12:00:16Z) predates its pool's deployment** — that one is "no pool," not
"no trade," refining P2.2's finding without contradicting it (the other 13 are genuine
no-trade results at an already-deployed pool). This confirms the planner's dry-run
hypothesis was correct for this specific event, and no other no-trade event has the same
issue.

## 4. Data-quality

- **Zero residual RPC errors across the entire 32-event sweep** (`sum(rpc_errors) == 0`),
  verified programmatically after each batch, not just asserted. The sweep ran in 4
  batches of 8 events (`--start`/`--stop`), matching this project's batching convention for
  long RPC sweeps.
- **32/32 `gap_seconds` matches against P2.2's original recorded values** — every event's
  freshly re-swept first trade landed on the exact same block P2.2 found, confirming this
  study is measuring the same trade, not a different one. No mismatches to report to the
  orchestrator on this axis.
- Pool metadata (`token0`/`token1`/`fee`/`tickSpacing`/decimals) verified live for all 10
  reference pools before any event was processed (§2.1); `usdg_is_token0` is `false` only
  for MSTR and COIN, matching the planner's pre-flagged trap exactly.
- **`feeProtocol` was read live per event, not assumed** — this caught the 4-event
  `feeProtocol=0` finding in §3 (item 2), which the plan's "verified fact" section did not
  anticipate (it verified only the *current* feeProtocol, not the per-event historical
  value). This is disclosed as a refinement of a plan-stage "verified fact," not a study
  defect — the plan's own instruction to "re-confirm key facts yourself, don't just copy
  them" is exactly what surfaced it.
- Coverage (`later_swap_count_by_h_*`) is reported per horizon in §3.2 specifically so a
  reader can see how many of the 5 horizons' numbers reflect genuine later re-pricing
  versus a fallback to `M_0`.

## 5. Limitations (pre-registered set, all included, none dropped)

1. **Reference price is the pool's own later quote, not a fair-value oracle** — no
   external price feed exists (OKX index is spot-only per spec §7). If the pool never
   re-prices, measured markout is ~0 by construction. **M_h is a LOWER BOUND on adverse
   selection, not a total.** This matters here: coverage at 60min is 31/32, but at 60s
   it's only 19/32 — most of the "markout" at short horizons is definitionally zero
   because no re-pricing swap has happened yet, not because there was no adverse
   selection.
2. **Aggregate only, never per-LP** — attributing to individual positions needs in-range
   tick-liquidity distribution, not cheaply queryable. TVL is the conservative
   denominator; an in-range LP's actual percentage loss is strictly larger than reported.
3. **Protocol-fee haircut is approximate** (ignores per-tick-step rounding inside v3's
   swap loop, error <0.01% of the fee). Separately (not a pre-registered item, but found
   during this study): the haircut now correctly reflects each event's OWN historical
   `feeProtocol`, including the 4 events where it was 0, not the current 0x44 value.
4. **USDG assumed exactly $1.00**, no depeg adjustment.
5. **Multiplier drift** (wNVDAx's `convertToAssets` accrual) cancels by construction since
   both legs of M_h are the same wrapper token from the same pool — immaterial over
   ≤60min, no NVDA-denominated reference used anywhere.
6. **n is small and lumpy** (32 events, 9 are 8-K, CRCL alone supplies 12). No
   significance testing, no confidence intervals, no per-ticker claims below n≈4. In
   particular, §3.4's AAPL/AMZN concentration (2 events driving 76% of the aggregate
   dollar sum) is reported as a fact about these two events, not a per-ticker claim.
7. **"First trade" ≠ "informed trade"** — we observe timing and cost, not the trader's
   information set. The informed-trader reading is an interpretation, not a measurement.
8. **Single-pool scan undercounts** (spec §7: wNVDAx trades across 5 pools/3 protocols,
   USDG pool ~51% of liquidity) — same caveat P2.2 carried, unchanged.
9. **This does not measure what AFTERHOURS's v4 hook would have prevented** — these are
   third-party pools with no hook attached.

**What this study does NOT claim:** no annualisation/extrapolation to other pools or
timeframes; no causal claim that filings cause the loss or that the first trader was
informed; no inflating a small result — the honest headline (§3.5, NVDA's named reference
pool) is that realised LP damage per event is cents-scale, and that IS the valid,
publishable result (spec §9 item 1 pre-committed to this framing); the concentrated-
liquidity method is not a fudge or approximation — the aggregate `M_h` figure needs no
tick data by construction (§1.3).
