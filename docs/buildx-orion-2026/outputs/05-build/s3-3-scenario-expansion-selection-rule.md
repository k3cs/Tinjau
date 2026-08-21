# S3.3 — Scenario expansion, event-selection rule (pre-registration)

- Date: 2026-08-21 (authoring session; the repo clock rolled past 2026-08-22T00:00Z while this
  was being written, and no market data for this task has been read in either day). The rule's
  date-window end bound in §3.3 is anchored to **2026-08-21T00:00:00Z** and does not move with
  the clock.
- Task: S3.3. Binds the S3.3 execution pass (Phase 2) and anything published from it.
- Status: **written before any market data for this task was touched.** At the time §0–§10 below
  were fixed, no swap log had been fetched for any candidate event, no pool state had been read,
  no price path had been inspected, no confirmation verdict had been computed, and no promotion
  had been run for any event outside the four already-frozen scenarios. That is still true as
  this line is written.
- Result of applying the rule: **the expansion set is empty.** One 8-K qualifies and it is
  scenario B's own filing. See §5.0. The rule is published unchanged, with the empty set as its
  outcome; §5.4 lists the amendments that were considered and deliberately not taken.
- Method ancestors, reused deliberately:
  `../05-build/parse-accuracy-study.md` §2.1 (deterministic, no-RNG, no-seed sample selection),
  `../04-planning/t0-4-benchmark-preregistration.md` (freeze-first discipline, publish-everything
  reporting), `../05-build/s3-1-paired-pool-preregistration.md` (rejecting tempting shortcuts on
  the record, and stating the price of the chosen one).

## 0. Pre-registration statement

### 0.1 What was read while writing this

Only code, frozen artifacts, and prose that predate this task:

- `apps/server/scenarios/README.md`, `manifest.json`, and the four `scenario-*.json` files —
  for the schema, the provenance fields, and the venue constraints they record;
- `apps/server/src/evidence/assets.ts` (`SUPPORTED_ASSETS`, `resolveAsset`);
- `apps/server/src/risk/promote.ts`, `apps/server/src/risk/types.ts` (`mayReachProtect`),
  `apps/server/src/risk/promotionConfig.ts`;
- `apps/server/src/market/confirm.ts`, `confirmationConfig.ts`, `poolTelemetry.ts`;
- `apps/server/src/decision/scenarioRunner.ts`, `apps/server/src/edgar/client.ts`;
- `docs/.../frontend-handoff/known-limitations.md`, and the three method ancestors above.

The only *numbers* taken from any of it are frozen thresholds, deployed constants, and venue
facts (the reference pool's first block with code, the block/timestamp relation). None is an
outcome of this task.

### 0.2 The ordering claim, and its limit

§1–§4 and §6–§10 were fixed before the EDGAR universe in §5 was enumerated, and the whole
document was fixed before any swap log was fetched. The enumeration in §5 reads **SEC filing
metadata only** — form type, acceptance timestamp, accession number, item codes. It reads no
price, no swap, and no pool state.

The honest limit: this ordering is a statement about how the work was done, and the commit that
carries this file is the only external record of it. It is asserted here so that a reviewer can
check the harder, machine-checkable property instead — §4.1 is a closed algorithm with no free
parameter, §5's set is pinned by a SHA-256 over its accession numbers, and §7.2 forbids the set
from changing for any reason once this file is committed.

### 0.3 The commitment

Whatever the Phase 2 run produces is published under §7, including — and especially — the
outcome that **no event reaches `PROTECT`**. No threshold moves (§9). No event is added,
dropped, or re-weighted after a result exists (§7.2).

## 1. The question, stated narrowly

> The four frozen scenarios resolve A=`WATCH`, B=`WATCH`, C=`WATCH`, D=`NORMAL`. No canonical
> replay has ever reached `PROTECT`. Is that a property of the **four events that were chosen**,
> or of the **frozen thresholds**?

This task attacks the first half of that disjunction and only the first half. It extends the
frozen-scenario method to every other real 8-K on the same asset, in the only date window where
the market leg is physically measurable, chosen by a rule written down first.

It is **not** an attempt to find an event that reaches `PROTECT`. If such an event exists in the
window the rule will surface it; if none does, that is the result. The distinction matters
because a search that stops when it finds a `PROTECT` is not a measurement.

## 2. The universe

### 2.1 What `SUPPORTED_ASSETS` actually contains — verified, not assumed

`apps/server/src/evidence/assets.ts` exports exactly **two** entries, both NVIDIA, and exactly
**one** of them is supported:

| Company | Ticker | Token | Pool | `supported` |
|---|---|---|---|---|
| NVIDIA CORPORATION | NVDA | `wNVDAx` `0xa8ddb5…50d5` | `0x2a2b11…a7b2` (USDG) | **true** |
| NVIDIA CORPORATION | NVDA | `NVDAx` `0xc845b2…849d` | `null` | false |

There is **no MSTR-linked asset**, and no asset for any other ticker, anywhere in
`SUPPORTED_ASSETS`. `apps/server/src/config/tickers.ts` tracks ten tickers and the P2.1
parse-accuracy sample is 50% MSTR by row count, but neither of those is the covered universe:
`resolveAsset` returns `UNSUPPORTED_ASSET` or `UNKNOWN_COMPANY` for every one of them, and
`promote()` hard-blocks on anything short of `RESOLVED`. An event on a ticker with no pool
cannot produce a risk state at all, let alone a `PROTECT`.

### 2.2 The universe, therefore

**One asset.** NVIDIA CORPORATION, CIK `0001045810`, token `wNVDAx`
`0xa8ddb5cd96b5222afe198316e9a57caa642850d5`, chain 196, reference pool
`0x2a2b11730c2b6d99a58034a869dd810d7300a7b2`.

This is a real and severe limit on what S3.3 can conclude, and §8 states it rather than working
around it. It is the honest universe: widening it would mean either inventing pool coverage that
does not exist, or reporting states for assets the engine refuses to act on.

## 3. The event source and the date window

### 3.1 Source

`https://data.sec.gov/submissions/CIK0001045810.json`, the SEC's own per-company filing index,
fetched with `EDGAR_USER_AGENT` set (SVC-001). The fields used are exactly those
`apps/server/src/edgar/client.ts` already models — `accessionNumber`, `form`,
`acceptanceDateTime`, `primaryDocument` — plus `items` and `reportDate`, which the shared client
does not carry and which P2.1 already established the pattern of reading study-locally.

### 3.2 Form type

`form === "8-K"`, exact string match.

`8-K/A` (amendments) is **excluded**. An amendment's acceptance timestamp is not the instant the
market learned the fact; treating it as a decision anchor would date the anchor to a
housekeeping event. Form 4 is excluded because this task is about 8-K events; scenario D already
holds the Form 4 control and is not being re-litigated.

### 3.3 The date window — both bounds inherited, neither chosen

Selection is on **`acceptanceDateTime`** (the EDGAR acceptance instant, converted to UTC), not
on `filingDate`. This is the same anchor scenario B uses, and it is the only field with
second precision.

```text
W_start = 2026-07-22T11:18:40Z
W_end   = 2026-08-20T18:00:00Z
qualify iff  W_start <= acceptanceDateTime <= W_end
```

**`W_start` is the pool's own birth, plus the replay window's own lead-in.** `manifest.json`
records the reference pool's first block with bytecode as `65946484` =
`2026-07-22T10:18:40Z`. The frozen replay window shape is `anchor − 3600 s .. anchor + 21600 s`,
so an anchor earlier than pool-birth + 3600 s has a replay window that begins before the pool
existed. `10:18:40Z + 3600 s = 11:18:40Z`. Nothing here is chosen; both terms predate this task.

**`W_end` is "the replay window must already be in the past".** The window ends at
`anchor + 21600 s`, and it must be complete at the instant this rule was written — the start of
the authoring day, `2026-08-21T00:00:00Z`. `00:00:00Z − 21600 s = 2026-08-20T18:00:00Z`. The
repo clock rolled past 2026-08-22T00:00Z during authoring; **`W_end` does not move with it.**
Letting an end bound drift forward after the rule is written is how a window gets extended until
it contains something interesting.

**Acknowledged consequence:** this window is about **30 days** long. It is short because the
venue is young, not because it was trimmed. `known-limitations.md` §7 records the same
constraint — the whole X Layer market for this asset is weeks old, and T0.2 already had to
exclude two older NVDA 8-Ks for exactly this reason. If the resulting event count is small, that
is a finding about the venue, and §7 publishes it as one.

### 3.4 Item codes that qualify: **all of them**

No item-code filter is applied at selection time. Every 8-K accepted inside the window enters
the set, whatever its items.

This is deliberate and it is the single most important anti-fitting decision in §3–§4. Materiality
is not discarded — it is applied *inside the engine*, by the frozen `promote()` materiality gate,
using the item→materiality map frozen in §4.3 below. Pre-filtering on item codes would apply the
same judgement twice, once where it is auditable and once where it is not, and the unauditable
copy is the one that decides which events a reader ever sees.

## 4. The selection rule

### 4.1 The algorithm — deterministic, no RNG, no seed, no discretion

Given the same EDGAR response, this selects the same events on any machine.

1. **Fetch** `https://data.sec.gov/submissions/CIK0001045810.json`. Use `filings.recent` only;
   `filings.files` (the paginated older archive) is not consulted, because §3.3's window is
   inside the last 30 days and cannot reach it.
2. **Filter** to rows with `form === "8-K"` and
   `W_start <= acceptanceDateTime <= W_end` per §3.3.
3. **Sort** ascending by `(acceptanceDateTime, accessionNumber)`.
4. **Cap.** Let `n` be the count after step 3 and `k = 12`. If `n <= k`, take all `n`. If
   `n > k`, take the rows at indices `floor(i * n / k)` for `i = 0 … k-1` — the systematic pick
   of `parse-accuracy-study.md` §2.1 step 4, reused verbatim rather than reinvented.
5. **Label, do not remove.** Any selected accession that is already the anchor of a frozen
   scenario in `apps/server/scenarios/manifest.json` is marked `role: CONTROL_REPRODUCTION` and
   is reported separately from the expansion set. It is **not** dropped — see §4.2.
6. **Pin.** `sha256` of the selected accession numbers joined by `|` in sort order is recorded
   in §5 and re-checked at run time. A mismatch aborts the run and is published as a deviation;
   it never silently re-selects.

`k = 12` is fixed here, before `n` is known. It exists so that a large `n` cannot later justify
introducing a cap that happens to trim the set; it is expected not to bind, and §5 records
whether it did.

### 4.2 Shortcuts considered and rejected, on the record

**Rejected — filter to items 1.01 / 2.03 / 2.04 / 3.01, the ones most likely to promote.**
This would raise the hit rate and it is exactly the forbidden move: it picks the events by the
outcome they are expected to produce, then reports the outcome as if the population had produced
it. The materiality gate belongs inside the engine where it is auditable, not in the sampling
frame. Rejected.

**Rejected — widen the universe to MSTR, or to the ten tracked tickers, to get more events.**
`SUPPORTED_ASSETS` has no pool for any of them (§2.1). Every such event resolves
`UNSUPPORTED_ASSET`, `promote()` hard-blocks, and the result is a refusal that says nothing
about thresholds. It would inflate `n` with rows that cannot vary. Rejected.

**Rejected — widen the window backwards to reach more filings.** Before
2026-07-22T11:18:40Z the pool has no bytecode; the market leg returns `UNAVAILABLE` by
construction and every event resolves `WATCH` at best, for a reason that has nothing to do with
the event. This would manufacture a run of `WATCH`s and make the population look worse-behaved
than it is. It is the mirror image of T0.2's "do not widen scenario A's window to reach
liquidity". Rejected.

**Rejected — drop the already-frozen scenario B accession from the set.**
Tempting, because the task asks for *additional* events and B's answer is already published. It
is kept as `CONTROL_REPRODUCTION` for the same reason S3.1 keeps its run W: an independently
re-derived scenario that reproduces the published `WATCH`, with the same reason codes, is a
validity check on the whole Phase 2 harness. If the control does **not** reproduce, no other row
in the run is trustworthy and §7.3 makes the run VOID rather than reported. It is reported
outside the expansion set so it cannot pad the denominator.

**Rejected — hand-assemble a news-claim graph for each event.** Every frozen scenario carries
hand-curated `NEWS` claims. Reproducing that for `n` new events would put a search-and-judgement
step inside the selection frame, and the judgement (which outlets count, which are syndications)
is precisely what would be tuned. §4.4 therefore builds each new scenario from the **official
document alone**. The price of that choice is stated in §8: this run exercises the official path
and cannot test the two-independent-origin news path at all.

### 4.3 The frozen item→materiality map

`promote()` takes `materiality` as a **claim field**, not as something it derives. Left
unspecified, that field is pure discretion, so it is frozen here, before the universe is known.

The rule is `promote.ts`'s own words, applied literally: material means *"a corporate action
affecting obligations, solvency, or listing status."*

**MATERIAL item codes:**
`1.01`, `1.02`, `1.03`, `2.01`, `2.03`, `2.04`, `2.05`, `2.06`, `3.01`, `3.03`, `4.01`, `4.02`,
`5.01`.

**NON_MATERIAL item codes:**
`1.04`, `2.02`, `3.02`, `5.02`, `5.03`, `5.04`, `5.05`, `5.06`, `5.07`, `5.08`, `6.01`–`6.06`,
`7.01`, `8.01`, `9.01`.

**Combination rule:** a filing is `MATERIAL` if **any** of its item codes is in the MATERIAL
set. `7.01` and `9.01` travel with almost every 8-K and must not dilute a qualifying item.

**Unlisted item code:** `UNKNOWN`. `promote()` treats `UNKNOWN` as non-promotable, so an
unclassified item fails closed. This is stated so the failure direction is a property of the
rule rather than an accident.

**The one contestable classification, named rather than buried.** `2.02` (Results of Operations
and Financial Condition) is the most reliably price-moving 8-K item there is, and this map calls
it `NON_MATERIAL`. That follows the engine's literal definition — an earnings release reports
performance, not a change to obligations, solvency, or listing status — and it is consistent
with scenario D's frozen reasoning, which refuses to let official provenance stand in for
materiality. It is recorded as **contestable**, not as settled. Two things keep it from being a
result-driven choice: it is fixed before the universe is enumerated, and it is strictly
conservative — it can only ever *block* a promotion, never enable one. If the window contains a
2.02 filing, its `NORMAL` outcome is published as a finding about the materiality gate, and
§9 still forbids changing anything in response.

### 4.4 How a selected event becomes a scenario — mechanical, one claim

For each selected accession, Phase 2 builds a scenario file at
`apps/server/scenarios/expansion/scenario-x{NN}-{accession}.json`. **The four existing
`scenario-*.json` files and `manifest.json` are not modified.**

Every field is derived, none is chosen:

| Field | Derivation |
|---|---|
| `decisionAnchor.at` | `acceptanceDateTime`, UTC |
| `decisionAnchor.blockNumber` | `unixSeconds − 1718769036` (manifest's verified relation) |
| `asset` | the single §2.2 asset, verbatim |
| `evidenceWindow` | `anchor − 72 h .. anchor` (`FROZEN_PROMOTION_CONFIG.evidenceWindowSec`) |
| `marketReplayWindow` | `anchor − 3600 s .. anchor + 21600 s`, the frozen scenario shape |
| `claims` | exactly one: the 8-K primary document |
| `claims[0].sourceClass` | `OFFICIAL` |
| `claims[0].dataMode` | `REPLAY` |
| `claims[0].sourceUrl` | `documentUrl(cik, accession, primaryDocument)` |
| `claims[0].sourceContentSha256` | `sha256` of the retrieved document's exact bytes, stored under `apps/server/scenarios/expansion/sources/` |
| `claims[0].publishedAt` | `acceptanceDateTime`, precision `SECOND` |
| `claims[0].relation` | `ORIGIN` |
| `claims[0].independenceGroup` | `official:edgar/{accession}` |
| `claims[0].officialConfirmation` | `true` |
| `claims[0].materiality` | §4.3 map applied to the filing's `items` |
| `claims[0].secItems` | the filing's `items`, verbatim |

`runScenario(scenario, swapWindow, { officialEvidencePassed: true })`
(`apps/server/src/decision/scenarioRunner.ts`) is the harness, unmodified, with its documented
defaults: `now` = the replay window end, which gives the market leg its most favourable possible
timing. `officialEvidencePassed: true` is the runner's own default and is the most favourable
bonded assumption, so no refusal in this run can be an artefact of assuming the bond failed.

`claimTextOrPointer` is a pointer to the byte-pinned local file plus the filing's item list. No
verbatim excerpt is hand-selected, because choosing which sentence to quote is a judgement and
this run has no place to put one.

## 5. The frozen set, and the expected outcome for each event

**Enumerated from SEC filing metadata only.** No price, no swap, no pool state was read to
produce this table, and none had been read anywhere in this task when it was written.

<!-- S3.3-ENUMERATION-BEGIN -->

### 5.0 Headline: the expansion set is **empty**

> Applying §4.1 to live EDGAR on 2026-08-21 selects **one** 8-K. It is
> `0001045810-26-000069` — **scenario B's own filing**, already frozen. After §4.1 step 5 labels
> it `CONTROL_REPRODUCTION`, the expansion set contains **zero** events.

This is not a shortfall to be worked around. It is the primary result of S3.3 and §7 publishes
it as one. §5.3 explains why it is informative rather than merely disappointing.

### 5.1 The frozen set

Enumerated 2026-08-21 from `https://data.sec.gov/submissions/CIK0001045810.json`
(`filings.recent`, 1,009 rows, filer `NVIDIA CORP`).

- Rows matching `form === "8-K"` inside `W_start .. W_end`: **n = 1**
- §4.1 step 4 cap (`k = 12`): **not bound** (`n <= k`), all rows taken
- §4.1 step 6 integrity pin —
  `sha256("0001045810-26-000069")` over the `|`-joined accession list in sort order:
  `a100bacb196058b91bb8586dcb8addf9fde9ef70ef1f76f9d459c4f44f45386d`

| # | Accession | Acceptance (UTC) | Items | Materiality (§4.3) | Anchor block | Role | Expected |
|---|---|---|---|---|---|---|---|
| 0 | `0001045810-26-000069` | 2026-08-17T12:41:33Z (Mon) | 1.01, 2.03, 7.01 | `MATERIAL` | `68201457` | `CONTROL_REPRODUCTION` | reproduce `WATCH` |

Replay window, from the frozen shape: blocks `68197857 .. 68223057`.

**Expansion set: 0 events. Control set: 1 event.**

**Expected outcome for the one row, recorded before any market data.** It must reproduce
scenario B's published result exactly: state `WATCH`, `aggressiveFeeAuthorized: false`, market
leg `NOT_CONFIRMED`, with the anti-wick gate as the binding refusal. Anything else means the
independently-derived scenario file, the fixture capture, or the harness disagrees with the
frozen artifact, and §7.3 makes that VOID rather than a result. Note this row is **not** a
prediction about the world — it is a prediction about the harness, and it is the only
falsifiable thing Phase 2 can now test.

### 5.2 Reporting diagnostics — filing metadata only, not part of the rule

These were computed **after** §5.1 and change nothing in §1–§4. They exist because "the set is
empty" is only interpretable next to the population it was drawn from. Every figure below comes
from the same EDGAR submissions index. **No market data was read to produce any of them.**

**D1 — every document NVIDIA filed with the SEC inside the measurable window, all form types:**

| Acceptance (UTC) | Form | Accession | Items |
|---|---|---|---|
| 2026-08-07T20:47:24Z | 4 | `0001197647-26-000007` | — |
| 2026-08-12T21:13:10Z | 4 | `0001310264-26-000008` | — |
| 2026-08-14T20:19:53Z | 13F-HR | `0001045810-26-000065` | — |
| 2026-08-17T12:41:33Z | 8-K | `0001045810-26-000069` | 1.01, 2.03, 7.01 |

**Four documents in thirty days.** Two of them are already frozen scenarios: the 8-K is scenario
B, and the 2026-08-12T21:13:10Z Form 4 is scenario D (`manifest.json` pins the same accession
and the same acceptance instant). The remaining two are a second insider Form 4 and a quarterly
13F-HR holdings report.

**D2 — NVDA 8-K base rate, trailing twelve months to `W_end`: 12 filings, ~1.0 per month.**

| Filed | Accession | Items | Materiality (§4.3) |
|---|---|---|---|
| 2025-08-27 | `0001045810-25-000207` | 2.02, 9.01 | NON_MATERIAL |
| 2025-11-19 | `0001045810-25-000228` | 2.02, 9.01 | NON_MATERIAL |
| 2026-01-23 | `0001045810-26-000003` | 5.02 | NON_MATERIAL |
| 2026-02-25 | `0001045810-26-000019` | 2.02, 9.01 | NON_MATERIAL |
| 2026-03-06 | `0001045810-26-000024` | 5.02, 9.01 | NON_MATERIAL |
| 2026-04-27 | `0001045810-26-000026` | 5.02 | NON_MATERIAL |
| 2026-05-08 | `0001045810-26-000028` | 5.02 | NON_MATERIAL |
| 2026-05-20 | `0001045810-26-000051` | 2.02, 9.01 | NON_MATERIAL |
| 2026-06-18 | `0001193125-26-275783` | 8.01, 9.01 | NON_MATERIAL |
| 2026-06-30 | `0001045810-26-000056` | 5.07 | NON_MATERIAL |
| 2026-07-02 | `0001045810-26-000060` | 5.02 | NON_MATERIAL |
| **2026-08-17** | **`0001045810-26-000069`** | **1.01, 2.03, 7.01** | **MATERIAL** |

**Item-code frequency over those twelve:** `9.01`×6, `5.02`×5, `2.02`×4, then one each of
`1.01`, `2.03`, `7.01`, `5.07`, `8.01`.

**D3 — how much further back `W_start` would have to move to reach more 8-Ks:** the nearest
prior 8-K is 19 days before `W_start` (`0001045810-26-000060`, item 5.02), then 21 days, then
33, 62, 74, 85. All six are `NON_MATERIAL` under §4.3, and all six predate the reference pool's
first block with bytecode, so all six have a market leg that is `UNAVAILABLE` by construction.

**D4 — acceptance-hour distribution (UTC) over those twelve:** `{12:1, 13:1, 20:6, 21:3, 22:1}`.
Ten of twelve land at or after 20:00Z, i.e. after the 20:00Z US regular-session close.

### 5.3 What the diagnostics mean — three findings, stated plainly

**Finding 1 — the frozen set is close to a census, not a curated sample.**
NVIDIA filed four documents with the SEC inside the entire measurable window (D1). T0.2 built
scenarios from two of them. The remaining two are a second routine insider Form 4 and a
quarterly holdings report, neither of which is an 8-K and neither of which could produce a
different class of outcome. The premise behind this task — that the four frozen scenarios might
be an unrepresentative selection from a larger pool of real events — **does not hold on this
asset**. There was no larger pool to select from.

**Finding 2 — scenario B is the only MATERIAL 8-K NVIDIA filed in a year.**
Of twelve trailing-12-month 8-Ks (D2), eleven carry only `2.02`, `5.02`, `5.07`, `8.01` and
`9.01`, all `NON_MATERIAL` under the §4.3 map, which was frozen before this table was
enumerated. Exactly one carries a MATERIAL item, and it is scenario B's `1.01` / `2.03`. So
T0.2 did not get lucky and did not cherry-pick: on a twelve-month view there was **one**
candidate for the protection path, and it is the one already frozen. Widening the window a year
would add eleven events whose pre-registered expectation is `NORMAL` before any market data is
touched — and D3 shows all of them also predate the pool, so their market leg would be
`UNAVAILABLE` too. That would be a longer table, not more evidence.

**Finding 3 — "the anchors land while the US market is closed" is a property of the filer, not
of the selection.** `scenarios/README.md` records the closed-market timing as a T0.2 selection
criterion. D4 shows ten of twelve NVDA 8-Ks are accepted after the US close anyway. The
criterion was very nearly free, which slightly *strengthens* the frozen set's claim to be
representative of how this filer behaves, and removes one candidate explanation for the
`WATCH`-only outcome.

### 5.4 Consequence for Phase 2, and the amendment this task will **not** make on its own

Under this pre-registration, Phase 2 consists of: build one scenario file for
`0001045810-26-000069` independently from EDGAR, capture its window, run it, and check it
reproduces scenario B's published `WATCH`. It measures the harness. It adds **no** new evidence
about thresholds, because the expansion set is empty.

Amendments that would produce new rows are listed here so they are on the record as *considered
and not taken*. Each is a change to a rule that has already been written down, so none may be
made by the executing agent; each requires Dien's explicit approval, must be pre-registered as a
dated amendment to this file **before** any market data is read for it, and must publish the
fact that the original rule returned an empty set first.

1. **Extend `W_end` forward as time passes.** The only amendment that adds *measurable* events
   without touching any rejected reasoning. It adds roughly one 8-K per month, of which
   historically ~1 in 12 is MATERIAL. Cost: it makes S3.3 an ongoing collection rather than a
   result, and D2's base rate says the expected wait for a second MATERIAL 8-K is on the order
   of a year.
2. **Admit Form 4 and other form types.** Adds two rows inside the window (D1), both
   pre-registered `NORMAL` by scenario D's own frozen reasoning. It would test the materiality
   gate's false-positive behaviour on more routine filings, which is a real question — but it is
   a *different* question from the one §1 asks, and it cannot produce a `PROTECT` by
   construction.
3. **Widen `W_start` backwards.** Already rejected in §4.2, and D3 confirms the rejection
   empirically: every reachable prior 8-K is both `NON_MATERIAL` and outside the pool's
   lifetime. This one should stay rejected.

**None of these is taken here, and the empty set is published as the result either way** (§7.1).

<!-- S3.3-ENUMERATION-END -->

### 5.x How each expectation is reasoned (the general form, fixed before the table)

For an 8-K, `highestClass = OFFICIAL` and `officialEvidencePassed = true`, so
`mayReachProtect` reduces to a single condition:

```text
OFFICIAL path:  PROTECT  <=>  materiality == MATERIAL
                          AND resolution == RESOLVED        (always true here, §2.2)
                          AND confirmation == "CONFIRMED"   (exact string; STALE, NOT_CONFIRMED,
                                                             UNAVAILABLE all fail closed)
```

and `confirmMarket` returns `CONFIRMED` only when **all** of:

- `swapCount >= 30` (`minSwapsForVerdict`), else the verdict is `UNAVAILABLE` before any signal
  is evaluated;
- `antiWick.held` — the median retention over the 300 s hold interval is `>= 0.5`, assessed over
  at least 2 observations. Since rule `tinjau.confirm/2.0.0` this is a **necessary** condition
  that no other signal can substitute for;
- and at least one of `drawdown >= 200 bps`, `velocity >= 2.0x`, `basis >= 300 bps`. The basis
  leg is dead on arrival: the OKX index leg is `UNAVAILABLE` for every anchor before
  2026-08-18 and is not retroactively available (SVC-003, `known-limitations.md` §4), so in
  practice it is drawdown or velocity.

So each row's expectation is fully determined by two things known without any market data:
its item codes (via §4.3) and whether it is inside the measurable window (always true, by §3.3).

- **`items` map to `NON_MATERIAL` only → expected `NORMAL`.** Unconditional. `promote()`
  returns `NORMAL` for non-material-only evidence and no market behaviour can change it,
  because §0.7 requires qualifying evidence before the market leg is consulted at all. This
  expectation is `mustHoldRegardlessOfMarketData: true`.
- **`items` include a MATERIAL code → expected `WATCH`, conditional; `PROTECT` if and only if
  the market leg confirms.** This is scenario B's pre-registration shape, reused verbatim
  because it is the same evidence shape.

**The prior, stated as a prediction and not as a hedge.** I expect **zero** MATERIAL events in
this set to reach `PROTECT`, and the reason is the anti-wick gate rather than the drawdown
floor. `known-limitations.md` §2 records that scenario B — the strongest evidence in the frozen
set, on the busiest window in it, 4,145 swaps — cleared the 200 bps floor at 235 bps and then
retained only ~10–13% across the hold interval. On a pool where 265–4,145 swaps is the observed
range for a seven-hour window, a single ordinary trade moves the price several bps, so a
dislocation that is still half-intact five minutes later is a demanding thing to ask. If that is
right, a run of `WATCH` outcomes here is evidence about the **venue's liquidity**, and only
secondarily about the thresholds. §8 keeps those two apart.

## 6. Market-data availability — measured without inspecting price paths

This is the one place where a price path could leak into the selection, and it is closed
structurally rather than by intention.

### 6.1 The two-pass rule

Phase 2 runs in two passes with a **committed artifact between them**.

**Pass 1 — counts only.** For each event in §5, compute `fromBlock`/`toBlock` from the frozen
window shape, then sweep `eth_getLogs` for `SWAP_TOPIC0` on the reference pool using the
existing `fetchSwapWindow` (`apps/server/src/market/poolTelemetry.ts`), chunked at 100 blocks.
Pass 1 writes exactly these fields per event, and nothing else:

```text
accession, anchorAt, anchorBlock, fromBlock, toBlock,
swapCount, swapsBeforeAnchor, swapsAtOrAfterAnchor,
rpcRangeErrors, rpcCalls, availability
```

`swapCount` is `logs.length` summed over chunks and `swapsBeforeAnchor` /
`swapsAtOrAfterAnchor` are a comparison of `log.blockNumber` against `anchorBlock`. **Neither
requires the log's `data` word to be decoded** — `sqrtPriceX96`, `tick`, `liquidity` and the
amounts all live in `data`, and pass 1 never reads it. Availability is therefore a function of
log *presence* and *block height*, which is as close to "measurable without seeing the prices"
as this venue permits.

The pass-1 artifact `data/s3-3-market-availability.json` is written and committed **before**
`confirmMarket` is invoked for any event.

**Pass 2 — the verdict.** Only then are the full swap windows decoded, the fixtures written, and
`runScenario` invoked for every event in §5, in the §4.1 sort order, with no early exit.

### 6.2 The availability predicate, fixed now

```text
DEGRADED     if rpcRangeErrors > 0                     -> swapCount is a lower bound
INSUFFICIENT if rpcRangeErrors == 0 and swapCount < 30 -> below minSwapsForVerdict
AVAILABLE    if rpcRangeErrors == 0 and swapCount >= 30
```

`30` is `FROZEN_CONFIRMATION_CONFIG.minSwapsForVerdict`, inherited verbatim. It is not a new
threshold and it is not being re-derived here.

### 6.3 Availability is **reported, never used to exclude**

The subtle failure this guards against: "market data was unavailable" is the one exclusion that
sounds legitimate, and it is therefore the one that could quietly remove an inconvenient event.

So it removes nothing. Every event in §5 is scored and published, whatever pass 1 said about it.
An `INSUFFICIENT` event still runs; `confirmMarket` returns `UNAVAILABLE` on its own 30-swap
minimum; the resulting `WATCH` (or `NORMAL`) is published as a row with its availability label
attached. `DEGRADED` events are published with `rpcRangeErrors` visible and their `swapCount`
marked a lower bound, exactly as `fetchSwapWindow` already documents.

The denominator of every rate reported in §7 is `|§5 expansion set|`, never "the events with
usable data".

## 7. Publication commitment

### 7.1 Everything, in every direction

1. **Raw first.** `data/s3-3-market-availability.json` (pass 1) and
   `data/s3-3-scenario-expansion-raw.jsonl` (pass 2: one row per event carrying the full
   `Decision` — state, every reason code, confidence band, independent-source count, and the
   complete `ConfirmationResult` including each signal's `fired`/`evaluated`/`value`/`threshold`
   and the full `antiWick` outcome). The write-up must be recomputable from these without
   re-running the chain.
2. **The write-up.** `s3-3-scenario-expansion-result.md` states the outcome distribution in its
   **first line**, before any narrative — including, if that is what happened, *"n of N events
   reached PROTECT: 0."*
3. **Known limitations.** `known-limitations.md` §2 is updated with the expanded count either
   way. If the count of canonical `PROTECT` outcomes stays zero, §2's sentence gets *stronger*
   and more precise, not softer.
4. **The site.** Any user-facing surface that characterises Tinjau's behaviour is updated only
   in the direction the data supports, at the same visual weight a favourable result would have
   received. A null result is not moved to an appendix and not softened to "inconclusive".
5. **Every number carries its basis** (`OBSERVED` throughout this run — nothing here is
   constructed) and its availability label.
6. **Machine-checkable completeness.** The raw artifact must contain a row for every accession
   in §5, including any whose fetch failed. A missing row is a failed run, not a smaller set.

### 7.2 The set cannot change

Once this file is committed, the §5 set is frozen. No event may be added, dropped, re-ordered,
re-weighted, or re-classified after any result exists. If the §4.1 SHA-256 fails at run time
(EDGAR revised or added a filing, as it did to P2.1's universe on the day it was written), the
run **aborts**, the discrepancy is published, and §5's frozen table — not a fresh re-selection —
remains the sample. This is `parse-accuracy-study.md` §2.2's "reproduce, don't re-derive",
applied unchanged.

### 7.3 What makes the run VOID rather than a result

- The `CONTROL_REPRODUCTION` row does not reproduce scenario B's published `WATCH` with the same
  reason codes. Nothing else in the run is trustworthy until that is explained.
- Any of the four existing frozen `scenario-*.json` files, `manifest.json`,
  `promotionConfig.ts`, or `confirmationConfig.ts` differs from `HEAD` at the end of the run.
- A row is missing from the raw artifact.

A VOID is published with the guard that failed.

## 8. What this can and cannot show

**It can show:** across every real 8-K NVIDIA filed in the only ~30-day window where the
wNVDAx/USDG market leg is physically measurable, what risk state the unmodified Tinjau engine
assigns under its unmodified frozen thresholds, and which specific gate stopped each event that
did not promote.

**What it actually showed (§5.0), and the limit that creates:** the rule returned an empty
expansion set. So S3.3 **cannot answer §1's question at all** on this universe. It does not show
that the thresholds are right, and it does not show they are wrong. What it establishes instead
is that the disjunction in §1 is not resolvable here: the "events chosen" branch is closed,
because there were no other qualifying events to choose. Anyone wanting to test the thresholds
needs a different asset with pool coverage, or a longer measurable history — neither of which
exists today (§2.1, `known-limitations.md` §7).

**It cannot show, and no artifact may imply otherwise:**

- **A set that all resolves `WATCH` is not evidence that the system is broken.** `WATCH` is the
  designed outcome for material official evidence that the market has not independently
  corroborated. A population that produces it is a population where the market did not
  corroborate.
- **It is equally not evidence that the system is correct.** The events could all be genuinely
  non-dislocating (thresholds fine, population quiet), or the anti-wick gate could be too strict
  for a pool this thin (thresholds mis-calibrated for the venue). **This run cannot separate
  those two hypotheses**, because it has no independent ground truth about which events *should*
  have dislocated the price. Distinguishing them needs a labelled set of true dislocations,
  which does not exist for this asset and is out of scope here.
- **What it genuinely constrains** is narrower: the *rate* at which the official path reaches
  `PROTECT` on this asset in this window, and the *identity of the binding gate* — whether
  refusals cluster on materiality, on the 30-swap minimum, on the 200 bps floor, or on anti-wick
  persistence. The clustering is the useful output, and it is informative in either direction.
- **One asset, one pool, ~30 days, one chain.** No sentence may generalise from this to
  tokenized equities as a class, to MSTR or any other ticker (§2.1: none is covered), or to a
  liquid market. `known-limitations.md` §7 stands.
- **The official path only.** §4.4 builds one `OFFICIAL` claim per event and no `NEWS` claims.
  This run says nothing about the two-independent-origin non-official path, about syndication
  collapsing, or about the self-revision rule.
- **`officialEvidencePassed` is assumed `true`, not computed.** It remains an input (tracker §8
  limitation), so this run does not exercise the bonded parse-agreement path either.
- **The OKX leg is `UNAVAILABLE` throughout**, as it is for all four frozen scenarios (§4 of
  `known-limitations.md`). No result here may be described as dual-leg confirmed.
- **It does not open `canClaimLossAvoided`.** That gate's conditions are in
  `t0-4-benchmark-preregistration.md` §8.6, this task does not touch them, and
  `known-limitations.md` §18 stands unchanged.

## 9. No threshold will be changed

**Whatever this run shows, no threshold moves as a result of it.**

`FROZEN_PROMOTION_CONFIG` (`tinjau.policy/1.0.0`) and `FROZEN_CONFIRMATION_CONFIG`
(`tinjau.confirm/2.0.0`) — the 72 h evidence window, the 900 s market freshness bound, the two
independent-origin minimum, the 200 bps drawdown floor, the 300 s anti-wick hold, the 0.5
retention fraction, the 2-observation minimum, the 30-swap verdict minimum, the 2.0× velocity
ratio, the 300 bps basis floor, `exitDepthMayConfirm: false`, `okxLegRequired: false` — are
untouched by this task and by anything published from it.

If the run produces zero `PROTECT` outcomes, that is a **finding about threshold calibration and
about the event population**, published as such under §7. It is not a defect to be fixed by
tuning. `t0-4` §6.3 is binding and is repeated here: if any threshold changes after a result has
been seen, every prior result is void and the whole benchmark is re-run and re-labelled. There
is no version of this task in which a `PROTECT` is manufactured by moving a number.

The four existing frozen scenarios are historical evidence and are **not modified**, not
re-scored, and not re-anchored. New scenarios live in `apps/server/scenarios/expansion/`.

## 10. Deviations policy

Any departure from §1–§9 is recorded in the tracker's deviations log and published in
`s3-3-scenario-expansion-result.md` **before** any affected number is quoted anywhere.

- **EDGAR's universe has changed** since §5 was enumerated (a new or revised filing inside the
  window): §7.2 applies — abort, publish the diff, keep the frozen table.
- **A document fetch fails** for a selected accession: the row is published with the failure and
  its state recorded as un-derivable. It is not replaced by another event.
- **The RPC cannot serve a window**: the row is published `DEGRADED` with `rpcRangeErrors`. The
  window is never widened, shifted, or re-timed to reach liquidity — T0.2's prohibition on
  moving scenario A's window applies to every event in this set.
- **The run is VOID under §7.3**: the void is published with the guard that failed. A re-run is
  permitted only after the fix is described in writing, and its parameters must be identical to
  §2–§6 except for the single named fix.
- **A threshold, window shape, materiality map, sort order, cap, or set membership is changed
  after any result has been seen**: every result from this task is void, and the whole thing is
  re-run and re-labelled.
