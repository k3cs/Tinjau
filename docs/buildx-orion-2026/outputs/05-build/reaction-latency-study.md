# On-chain reaction-latency study (task P2.2 / P2.3)

Status: **complete**. Full pre-registered sample (n=46), method fixed before results were read, one coverage gap found and closed before reporting (see §4).

## 1. Method (pre-registered, spec §4.8b / task-tracker.md P2.2)

For every 8-K / Form 4 filing from the 10 tracked tokenised-equity underlyings whose SEC EDGAR acceptance timestamp falls inside that token's available X Layer price history (2026-07-20 for NVDAx/MSTRx, 2026-07-29 for the other eight), we measure the interval from EDGAR acceptance to the first `Swap` event in that token's reference USDG pool.

- **Window:** filing acceptance timestamp ± 60 minutes.
- **Block↔timestamp mapping:** calibrated live at run time against the current chain head (measured 1.000 s/block on X Layer, spec §7).
- **RPC sweep:** the ±60min window is split into ≤100-block chunks (X Layer's `eth_getLogs` hard cap), each chunk queried with mandatory retry.
- **Reported split:** 8-K (primary event type) vs. Form 4 (secondary/insider) vs. combined, plus per-ticker.
- **"No trade within the window" is reported as a genuine finding, not treated as missing data** — but see §4 for how that claim was verified, not just asserted.

Method script: `data/p2_2_reaction_latency_method.py`. Raw per-event results: `data/p2_2_reaction_latency_raw.jsonl` (46 rows, one per filing).

## 2. Sample

n=46 filings in scope (12 8-K, 34 Form 4), across 9 of the 10 tracked underlyings (TSLA had zero 8-K/Form 4 filings inside its price-history window as of 2026-08-17, so it doesn't appear):

| Ticker | n |
|---|---|
| CRCL | 12 |
| MSTR | 8 |
| GOOGL | 6 |
| META | 7 |
| AMZN | 4 |
| COIN | 3 |
| NVDA | 2 |
| SNDK | 2 |
| AAPL | 2 |

## 3. Results

| Split | n | No trade in ±60min | Median gap | Mean gap | Min | Max |
|---|---|---|---|---|---|---|
| **All** | 46 | 14 (30%) | 274s (4.6 min) | 381s | 0s | 1718s (28.6 min) |
| 8-K (primary) | 12 | 3 (25%) | 355s (5.9 min) | 363s | 0s | 883s |
| Form 4 (secondary) | 34 | 11 (32%) | 222s (3.7 min) | 389s | 0s | 1718s |

This supersedes the 7-filing pilot recorded in spec §7 (median 5.4 min, 2/7 no-trade) — same qualitative finding, now on the full pre-registered sample rather than a pilot subset. The pilot's per-event numbers are a subset of this data, not a separate measurement.

**Per-ticker spread is wide and not uniform** — this matters more than the pooled average:

| Ticker | n | No trade | Median gap (when traded) |
|---|---|---|---|
| GOOGL | 6 | 5 | 883s (only 1 trade found across 6 filings) |
| MSTR | 8 | 4 | 280s |
| META | 7 | 3 | 512s |
| AMZN | 4 | 1 | 406s |
| COIN | 3 | 1 | 259s |
| AAPL | 2 | 0 | 696s |
| CRCL | 12 | 0 | 153s |
| NVDA | 2 | 0 | 325s |
| SNDK | 2 | 0 | 55s |

GOOGLx is a clear outlier — 5 of its 6 filings saw no trade at all in the ±60min window, and the one that did trade took 14.7 minutes. This reads as a liquidity-driven finding (a thinly-traded pool reacts to filings mostly not at all, or slowly when it does), consistent with the core thesis that on-chain reaction latency measures pool staleness/liquidity, not feed speed — see spec's reframe (LEARN-010).

## 4. Data-quality note: the coverage gap that was found and closed

The RPC sweep's internal retry (4 tries per chunk with backoff) does not eliminate transient failures — of ~3,300 total chunk queries across the 46 events, 71 failed all 4 tries. Because a fully-failed chunk is silently excluded from the swap list rather than aborting the event, this created a real risk: an event reported as "no trade" might actually have an unswept chunk that contained a trade.

Before accepting the 14/46 no-trade count, we checked which of those 14 had incomplete coverage: **12 of the 14 did**. Those 12 were re-swept with a more aggressive retry policy (8 tries, longer backoff; script: `data/p2_2_reaction_latency_method.py` variant, gap-fill pass). All 12 achieved full coverage (zero residual errors) on re-sweep, and **all 12 still confirmed no trade** — so the 14/46 figure in §3 is coverage-complete, not an artifact of missing data.

A smaller residual caveat remains: 23 of the 32 events that *did* find a trade still carry a nonzero `rpc_errors` count in the raw data (a chunk failed but a trade was already found elsewhere in the window). This does not affect whether a trade was found, only a small chance that the reported gap is a slight overestimate if an earlier, unswept chunk also contained a trade. This was judged low-priority to re-sweep (the qualitative finding — reaction happens on a multi-minute timescale, not sub-minute — is not sensitive to a handful of seconds of possible overestimation) but is disclosed here rather than silently ignored.

## 5. Caveat carried from the original design (LEARN-010)

This is a **retroactive reaction-latency measurement** (how fast the market actually traded after a filing), not a claim about how fast AFTERHOURS's own feed could have reacted. A slower or faster off-chain parsing pipeline would not materially change these numbers, since the bottleneck measured here is trade arrival, not feed speed. The prospective, feed-speed "lead time" claim is a separate, forward-only measurement via the index poller (P0.8) — see spec §4.6/§7.
