# Scoreboard reaction definition (task P5.1) — pre-registered method

This is the pre-registered method for the AFTERHOURS scoreboard page's "first index
reaction" column. Written and committed **before** any code that computes a real reaction
value against the live registry, per this project's pre-registration discipline (compare
P2.2/P2.4's pre-registered study methods). Nothing in this document is tuned after seeing
the outcome for a specific event — the threshold's own provisional status and its revisit
trigger are stated explicitly below, precisely so a future change to it is a disclosed
methodology revision, not a silent per-event nudge.

## 1. Post time

**Post time** = `EventState.timestamp` (on-chain, seconds), read directly via
`EventStateRegistry.getEvent(id)`. No archive lookup, no block-timestamp binary search —
the contract already stores the canonical post timestamp as a `uint256` field, so this is
a direct field read, not a derived value.

## 2. Token → instrument mapping

Only two on-chain tokens resolve to a polled index instrument, because P0.8's poller only
ever polls two tickers:

| Registry `token` (tracked ticker) | P0.8 instrument name |
|---|---|
| NVDAx | wNVDAx |
| MSTRx | wMSTRx |

Any other tracked-token event (any ticker outside this table, including tickers configured
elsewhere in the codebase but not yet polled — see `NOT_YET_TRACKED_TICKERS` in
`apps/web/src/lib/chain/tokenAddresses.ts`) resolves to the `no_poller_coverage` state **by
construction** — there is no index series for it to ever read, regardless of how much time
passes.

## 3. Pre-window

Samples with `t ∈ [postTime − 1800s, postTime)` — the 30 minutes immediately before the
post time, excluding the post time itself.

## 4. Baseline

**Baseline** = median price of the pre-window. Median rather than mean because it is
outlier-robust against a single bad tick from the underlying OKX index feed.

## 5. Post-window

Samples with `t ∈ [postTime, postTime + 3600s]` — 60 minutes after (and including) the post
time. Reused directly from P2.2's own reaction-latency study, which used the same
±60-minute convention for its RPC-swap-window search (`reaction-latency-study.md`).

## 6. Threshold — 0.50% absolute deviation from baseline, explicitly provisional

**Threshold**: a post-window sample "reacts" when
`|price − baseline| / baseline ≥ 0.50%`.

**Justification** (both figures independently re-verified against real data 2026-08-18,
not taken on the planning agent's word):

- **≥3× the poller's measured consecutive-sample noise.** Computed from the first 8 real
  `wNVDAx` rows recorded 2026-08-18
  (`/opt/afterhours/data/index/index-wNVDAx-2026-08-18.ndjson` on the VPS): the 7
  consecutive-sample percent deltas across those 8 rows have **mean 0.086%, population
  stdev 0.036%**. 0.50% is >5.8× the mean and >13× the stdev of this idle-market noise
  floor — comfortably clears a "≥3×" bar in both statistics.
- **≥3× the OKX-index-vs-on-chain cross-validation agreement band.** Recorded in the
  tracker's P0.8 evidence: two independent live cross-checks of the OKX index feed against
  a raw on-chain `slot0()` read found the two sources agree to **+0.05%** (wNVDAx) and
  **+0.01%** (wMSTRx) — both comfortably inside a "sub-0.15%" band. 0.50% is >3.3× that
  band.

**Explicitly disclosed as provisional**: this is a bootstrap estimate from an **8-sample**
window on one instrument, one idle (non-event) period. It is not a statistically powered
estimate of the feed's true noise distribution across market conditions.
**Predeclared revisit trigger: once ≥100 samples/token have been recorded**, recompute the
noise statistics from the full sample and re-justify (or revise) this threshold as a
dated, disclosed methodology update — **never silently re-tuned per event**, and never
adjusted retroactively to make a specific event's classification come out a particular
way.

## 7. Reaction time

**Reaction time** = the timestamp of the first post-window sample where
`|price − baseline| / baseline ≥ 0.50%`.

## 8. Five states

| State | Condition |
|---|---|
| `no_poller_coverage` | Zero post-window rows (includes: the token isn't one of the 2 polled tickers by construction, or the poller simply wasn't running yet at post time — both collapse to the same observable fact: no data exists for the window). |
| `insufficient_baseline` | The post-window has data, but the pre-window has fewer than 2 samples — too few to trust a median. |
| `reacted` | Threshold crossed. Reports reaction time, the crossing sample's price, the baseline, and the percent move. |
| `no_reaction_in_window` | Post-window has ≥80% of expected sample coverage (at the poller's ~3-minute cadence, ~20 expected samples across 60 minutes) and nothing crossed the threshold — a real finding, reported plainly, exactly like P2.2's "no trade" rows. Never hidden as if it were missing data. |
| `pending` | The post-window has not fully elapsed yet (current time < postTime + 3600s) and nothing has crossed the threshold so far. |

If a threshold crossing is found while the post-window is still open, `reacted` is reported
immediately rather than waiting for the window to close — a real crossing that already
happened is not made less true by the window not being over yet.

**Implementation note, not part of the pre-registered method**: the five states above are
not perfectly exhaustive of every possible (coverage, elapsed) combination — specifically,
an *elapsed* window with *some* but `<80%` expected coverage and no crossing has no named
6th state in this pre-registration. The implementation (`scoreboardReaction.ts`) reports
this case as `no_reaction_in_window` but always carries the real `coverageFraction` in the
response, so a sparse, low-confidence reading is never presented with the same implied
confidence as a well-covered one. This is a disclosed implementation choice, not a new
state.

## Reference data

- 8-row wNVDAx noise sample: `/opt/afterhours/data/index/index-wNVDAx-2026-08-18.ndjson` on
  the VPS (first 8 rows).
- OKX-vs-on-chain cross-validation: `docs/buildx-orion-2026/outputs/04-planning/task-tracker.md`,
  P0.8 entry, "Cross-validated the index price against an independent on-chain read".
- Reaction-latency ±60-minute convention: `docs/buildx-orion-2026/outputs/05-build/reaction-latency-study.md`.
