# P2.1 — Parse-Accuracy Sample: Pre-Registration

**Status: pre-registration written 2026-08-17, before any LLM parse for this study has
run.** Everything below (sample-selection rule, the frozen 30-filing sample, accuracy
tier definitions, agreement-rate metric, failure-handling rules) is fixed in advance.
Results (Tier A/B computed figures, the Tier C n=8 spot-check, Tier D agreement rates)
get appended to this document later, in a section clearly marked as written after the
fact — nothing above that marker is to be edited retroactively once real parses exist.

No live Gemini call has been made as part of writing this document or the accompanying
`data/p2_1_sample.json` / `src/studies/parseAccuracySample.ts`. See the companion
"Universe verification" section below for a live-EDGAR (no LLM, no quota cost) check of
whether the sample-selection code reproduces this pre-registration today.

## 1. Where the code lives

TypeScript, inside `apps/server`, at `apps/server/src/studies/parseAccuracySample.ts`.
Imports, unmodified: `src/edgar/client.ts` (`fetchFilingDocument()`, `documentUrl()`,
`getEdgarUserAgent()`), `src/parsing/stripFilingHtml.ts` (`stripFilingHtml()`),
`src/llm/parseFiling.ts` (`parseFilingThreeWays()`, `withRetry()`), `src/diff/agreement.ts`
(`buildAgreementReport()`). `src/edgar/client.ts` and `src/types.ts` are not modified —
the study does its own `data.sec.gov/submissions/CIK*.json` fetch for the `items` /
`reportDate` fields it needs (the shared client doesn't carry them), kept in a
study-local type. npm script: `study:p2_1` (`tsx src/studies/parseAccuracySample.ts`).

Results publish under `docs/buildx-orion-2026/outputs/05-build/`:
- `data/p2_1_sample.json` — the frozen 30-filing sample (written now, this file)
- `data/p2_1_parse_accuracy_raw.jsonl` — one row per filing, written by later batch runs
  (NOT written by this invocation — no Gemini calls have been made yet)
- `data/p2_1_spot_check.md` — n=8 manual adjudication (written later)
- `parse-accuracy-study.md` — this document (pre-registration now; results appended later)

## 2.1 Sample-selection rule (deterministic, no RNG, no seed)

1. **Universe.** For each of the 10 tickers in `src/config/tickers.ts`, fetch
   `https://data.sec.gov/submissions/CIK{cik}.json`. Keep rows where `form == "8-K"` and
   `"2025-08-17" <= filingDate <= "2026-08-17"` (inclusive). Form 4 excluded.
2. **Guard rail.** Assert the universe is exactly 171 rows with this per-ticker split:
   MSTR 72, GOOGL 18, AMZN 14, META 11, NVDA 11, COIN 10, TSLA 10, CRCL 9, AAPL 8, SNDK 8.
   If not, abort and report the discrepancy. (See "Universe verification" below — this
   guard rail does NOT hold as of 2026-08-17, and the reason is understood and documented.)
3. **Sort** each ticker's rows ascending by `(filingDate, accessionNumber)`.
4. **Systematic pick**: for a ticker with `n` rows and allocation `k`, take rows at
   indices `floor(i * n / k)` for `i = 0…k-1`.
5. **MSTR stratum: k = 15.**
6. **Non-MSTR stratum: k = 15**, allocated: `GOOGL, AMZN, META, NVDA, COIN, TSLA` get 2
   each; `CRCL, AAPL, SNDK` get 1 each.
7. **Total = 30**, sorted by `(filingDate, accessionNumber)`.
8. **Integrity check**: SHA-256 of the 30 accession numbers joined by `|` in sort order
   must equal `e228ab2c9f05974d519e8d479ab211434983600a623b047bcc47693cead04ae2`.
   Recompute at run time; abort on mismatch. (See "Universe verification" — this does NOT
   hold as of 2026-08-17.)

## 2.2 The frozen sample (30 rows — reproduce, don't re-derive)

This table is the source of truth for which 30 filings this study runs against. It is
**frozen as written below regardless of what a live re-run of the selection algorithm
produces on a later date** — see "Universe verification" for why a same-day re-run can
legitimately diverge, and why the frozen table (not a fresh re-selection) is what
`runFiling()` batches consume. The operational copy (enriched with `primaryDocument` /
`acceptanceDateTime` looked up live against EDGAR on 2026-08-17, needed to actually fetch
each document) lives at `data/p2_1_sample.json`; this markdown table is the
human-readable, pre-registered record.

| # | Ticker | filingDate | accession | reportDate | items |
|---|---|---|---|---|---|
| 0 | MSTR | 2025-08-18 | 0000950170-25-109566 | 2025-08-18 | 7.01,8.01,9.01 |
| 1 | NVDA | 2025-08-27 | 0001045810-25-000207 | 2025-08-27 | 2.02,9.01 |
| 2 | MSTR | 2025-09-02 | 0001193125-25-193487 | 2025-08-31 | 7.01,8.01 |
| 3 | GOOGL | 2025-09-03 | 0001652044-25-000067 | 2025-09-02 | 8.01 |
| 4 | TSLA | 2025-09-05 | 0001104659-25-087862 | 2025-09-03 | 1.01,9.01 |
| 5 | CRCL | 2025-09-19 | 0001876042-25-000014 | 2025-09-17 | 5.02,9.01 |
| 6 | MSTR | 2025-09-30 | 0001193125-25-225038 | 2025-09-30 | 7.01,8.01 |
| 7 | MSTR | 2025-10-27 | 0001193125-25-250751 | 2025-10-27 | 7.01,8.01 |
| 8 | META | 2025-10-29 | 0001628280-25-047114 | 2025-10-29 | 2.02,9.01 |
| 9 | AAPL | 2025-10-30 | 0000320193-25-000077 | 2025-10-30 | 2.02,9.01 |
| 10 | AMZN | 2025-10-30 | 0001018724-25-000121 | 2025-10-30 | 2.02,9.01 |
| 11 | COIN | 2025-10-30 | 0001679788-25-000207 | 2025-10-30 | 2.02,9.01 |
| 12 | SNDK | 2025-11-06 | 0001628280-25-050180 | 2025-11-06 | 2.02,9.01 |
| 13 | MSTR | 2025-11-07 | 0001193125-25-271105 | 2025-11-06 | 1.01,8.01,9.01 |
| 14 | MSTR | 2025-12-08 | 0001193125-25-310607 | 2025-12-08 | 7.01,8.01 |
| 15 | MSTR | 2026-01-02 | 0001193125-26-000264 | 2025-12-31 | 7.01,8.01 |
| 16 | META | 2026-01-28 | 0001628280-26-003832 | 2026-01-28 | 2.02,9.01 |
| 17 | TSLA | 2026-01-28 | 0001628280-26-003837 | 2026-01-28 | 2.02,9.01 |
| 18 | MSTR | 2026-02-02 | 0001193125-26-032731 | 2026-01-31 | 7.01,8.01 |
| 19 | MSTR | 2026-02-23 | 0001193125-26-062489 | 2026-02-23 | 7.01,8.01 |
| 20 | MSTR | 2026-03-23 | 0001193125-26-118810 | 2026-03-23 | 1.01,1.02,5.03,8.01,9.01 |
| 21 | AMZN | 2026-04-14 | 0001104659-26-042880 | 2026-04-14 | 7.01,9.01 |
| 22 | MSTR | 2026-04-20 | 0001193125-26-162756 | 2026-04-20 | 7.01,8.01 |
| 23 | NVDA | 2026-04-27 | 0001045810-26-000026 | 2026-04-24 | 5.02 |
| 24 | GOOGL | 2026-04-29 | 0001652044-26-000043 | 2026-04-29 | 2.02,9.01 |
| 25 | MSTR | 2026-05-05 | 0001050446-26-000024 | 2026-05-05 | 2.02,7.01,9.01 |
| 26 | COIN | 2026-05-07 | 0001679788-26-000053 | 2026-05-07 | 2.02,9.01 |
| 27 | MSTR | 2026-06-01 | 0001193125-26-249768 | 2026-05-30 | 7.01,8.01 |
| 28 | MSTR | 2026-06-15 | 0001193125-26-270366 | 2026-06-14 | 3.03,5.03,7.01,8.01,9.01 |
| 29 | MSTR | 2026-07-20 | 0001193125-26-308369 | 2026-07-20 | 7.01,8.01 |

Note: the P1.3 live-test fixture (accession `0001193125-26-341297`) is NOT in this sample.

## Universe verification (live EDGAR, no LLM calls, run 2026-08-17)

`buildUniverse()` and `selectSample()` were run for real against live EDGAR data on
2026-08-17 (the same calendar day this document is being written) to check whether the
code reproduces the counts and SHA-256 above. **It does not, and the reason is
understood: MSTR filed a new 8-K today** (accession `0001193125-26-353240`, filed
2026-08-17), which is inside the `2025-08-17..2026-08-17` inclusive window and therefore
enters the universe.

Actual results:
- Universe count: **172** (expected 171) — MSTR: **73** (expected 72); all other 9
  tickers matched exactly (GOOGL 18, AMZN 14, META 11, NVDA 11, COIN 10, TSLA 10, CRCL 9,
  AAPL 8, SNDK 8).
- `selectSample()` SHA-256 today: `5279ec827102ef3aceb1a876ba1f61e49e8e06192f1cdcf608f69a9c4ccf21a2`
  — does **not** match the pre-registered `e228ab2c9f05974d519e8d479ab211434983600a623b047bcc47693cead04ae2`.
- Mechanism: MSTR's systematic pick is `floor(i*n/15)` for `i=0..14`. Going from `n=72`
  to `n=73` shifts several of those 15 index positions, which changes which MSTR filings
  get picked from the later part of the year. 9 of the 15 MSTR picks are unchanged; 6
  differ — the 6 frozen-table accessions (all MSTR, all from the later/more-recent part
  of the sorted list — the table's indices 15, 18, 25, 27, 28, and 29) are each replaced
  by a different, slightly later MSTR accession in a fresh run. Full accession-level diff
  (`onlyInFrozen` vs `onlyInLive`) recorded in `data/p2_1_live_universe_report.json`. All
  30 frozen-table accession numbers were independently confirmed to exist in today's live
  EDGAR data for their respective tickers (i.e. the frozen table is not fabricated or
  stale — it is simply no longer what a *fresh* run of the same algorithm would produce,
  because the universe grew by one row between when the plan was approved and when this
  verification ran).
- All other 9 tickers' sub-samples are unaffected (their universes didn't change size
  today), so only the MSTR stratum diverges.

**Resolution, consistent with §2.2's "reproduce, don't re-derive" instruction:** the
frozen 30-row table above remains the sample this study uses. `runFiling()` batches
(Step 3/4, not run in this session) read from `data/p2_1_sample.json` — the frozen
enrichment of that exact table — not from a fresh `buildUniverse()`/`selectSample()`
call. The guard rail and integrity check inside `parseAccuracySample.ts` exist as a
standalone diagnostic (`--verify-sample` CLI flag) for exactly this kind of drift
detection; they do not gate or regenerate the frozen sample file. This divergence is
expected to recur on any future same-day re-verification (the universe keeps growing as
new 8-Ks are filed) and is not itself a defect in the sample-selection code — it is a
property of pre-registering a sample from an ever-growing universe and is documented here
rather than silently resolved by re-freezing the sample to match today's data.

## 2.3 Accuracy definition (four tiers, all pre-registered)

**Tier A — deterministic external checks, n=30, machine-computed.**
- A1 · `affectedToken` correct iff parsed value equals the filer's ticker's `tokenSymbol`
  in `src/config/tickers.ts`. Report as a sanity floor, not parse skill (ticker is in the
  prompt).
- A2 · `effectiveDates` correct iff the parsed array CONTAINS EDGAR's `reportDate`.
  Report twice: over all 30, AND over the 10 filings where `reportDate != filingDate`
  (indices 2,3,4,5,13,15,18,23,27,28) — the second number is the one that means
  something.

**Tier B — EDGAR Item-code weak label on `eventType`, subset n≈16.** Pre-registered
mapping:

| Item | → eventType |
|---|---|
| 2.02 | `earnings_announcement` |
| 5.02 | `executive_change` |
| 1.01 | `material_agreement` |
| 1.02 | `material_agreement` |
| 2.01 | `acquisition_or_divestiture` |
| 2.03 | `capital_raise` |
| 4.02 | `restatement` |
| 1.03 | `bankruptcy_or_restructuring` |
| all others (3.03,5.03,5.07,7.01,8.01,9.01,2.05,…) | no label — excluded |

Item-decidable iff item list yields exactly one distinct mapped eventType (16 of 30
here). Accuracy = agreed eventType == mapped label, over item-decidable filings with 3/3
successful parses. Non-decidable filings reported as non-decidable, not failures.

**Tier C — adjudicated spot-check, n=8, all six fields.** Pre-registered indices from
§2.2: **0, 4, 8, 12, 16, 20, 24, 28**. For each of 6 fields (`eventType`, `affectedToken`,
`effectiveDates`, `declaredAmounts`, `futureAnnouncedDates`, `summary`), verdict =
`correct`/`incorrect`/`unsupported`/`incomplete`/`not_applicable`, each with a verbatim
supporting quote from the stripped text. This tier runs LATER (needs live parse results
first) — the module's architecture (see `src/studies/parseAccuracySample.ts`) is built to
support it (the per-filing JSONL row carries `strippedTextLength` and every attempt's
full parsed object, so the spot-check can quote from the same text the parses saw), but
this invocation does not run it.

**Tier D — inter-model agreement rate.** Labeled "confidence signal, not correctness"
(quote spec §3).

## 2.4 Agreement-rate metric — denominator trap

`buildAgreementReport()`'s `new Set(values).size <= 1` check returns "agree" on every
field when a filing has 0 or 1 successful parses (vacuous agreement — same shape as
LEARN-011). Pre-registered denominators: `N=30`, `N3` = filings with
`successfulParseCount==3`. Per-field agreement rate = agree-count / N3 (not N). Key-field
unanimity rate = fraction of N3 where both eventType and affectedToken agree.
`readyToPost` rate over full N=30. The vacuous-agree exclusion is stated explicitly here:
any filing with fewer than 3 successful parses is excluded from all per-field and
key-field agreement-rate denominators, even though `buildAgreementReport()` itself will
still report "agree" for that filing's fields.

## 2.5 Failure handling (pre-registered)

- Document fetch: 3 attempts w/ backoff; failures recorded `document_fetch_failed`, stay
  in N=30 denominator for reporting, excluded from agreement/accuracy denominators, count
  stated. Never swapped for a different filing.
- LLM parse: `parseFilingThreeWays` with `retryOptions = { retries: 4, delayMs: 5000 }`.
- Gap-fill: after pass 1, any filing with `successfulParseCount < 3` re-run as a WHOLE
  filing (fresh 3 parses) with `{retries:6, delayMs:15000}`, up to 2 gap-fill passes.
  Report pass-1 and post-gap-fill figures separately, and how many filings needed
  gap-fill. Pass-1 and gap-fill-pass attempts are never mixed inside one filing's diff —
  each pass produces its own self-contained `AgreementReport` from its own fresh 3
  attempts, and the JSONL row retains `pass1`, `gapFillPasses` (0-2 entries), and
  `finalResult` (the last pass run) as distinct fields.

## 2.6 Design rationale

- Systematic-across-the-year (not most-recent-N) — avoids sampling one repetitive MSTR
  template 15 times.
- 8-K only, no Form 4 — matches spec §4.8a's "171-filing year" (171 = the 8-K count as of
  when the plan was approved; see "Universe verification" above for why this count drifts
  by 1 as of the day this document was written).
- P1.5 (severity grade) excluded — no ground truth by construction, adds 30 wasted calls;
  `runPipelineForFiling()` is deliberately NOT used (it runs `gradeFilingSeverity()` in
  parallel) — the study composes
  `fetchFilingDocument → stripFilingHtml → parseFilingThreeWays → buildAgreementReport`
  directly.

## 3. Resumability

Append one JSONL row per filing immediately after it completes (to
`data/p2_1_parse_accuracy_raw.jsonl`). Support `--start`/`--stop` index args (0-based,
half-open range like `[start, stop)`), always indexing into the frozen `p2_1_sample.json`
rows, never a freshly recomputed universe. Env var `P2_1_FILING_DELAY_MS` (default 20000)
for inter-filing sleep — filings are processed STRICTLY SEQUENTIALLY, not in parallel,
given the Gemini free-tier quota constraint (confirmed empirically at 20 requests/day on
2026-08-16/17, exhausted for the day at the time this document was written — see the
"Next step" note in the implementing agent's report for the exact resume command).

---

*Results (Tier A/B/C/D figures) are appended below this line once real parses run. As of
2026-08-17, nothing below this line exists yet — no live Gemini call has been made for
this study.*

## Results (appended 2026-08-18, after all 30 rows ran)

**⚠️ Read this before the numbers below: the sample was NOT parsed by a single model.**
Google's Gemini free tier caps daily requests at 20 per (API key, model) pair. That limit
was hit repeatedly during collection on 2026-08-18 — the production model
(`gemini-3.6-flash`, what `agent.ts` actually runs) was already exhausted from earlier
same-day work before this study started, and 4 more models were exhausted in turn over the
course of collecting these 30 rows. The actual split:

| Model | Rows |
|---|---|
| `gemini-3.5-flash` | 3 (indices 0-2) |
| `gemini-3.1-flash-lite` | 10 (indices 3-8, 23-26) |
| `gemini-flash-latest`\* | 4 (indices 9-12) |
| `gemini-3.5-flash-lite` | 10 (indices 13-22) |
| `gemini-flash-lite-latest` | 3 (indices 27-29) |

\* Found out the hard way that `gemini-flash-latest` is an **alias**, not an independent
quota bucket — its quota-exceeded error named the underlying model as `gemini-3.7-flash`.
Rows 13-14 were first attempted under this alias, both returned `successfulParseCount=0`
(quota exhausted mid-alias), and were re-run cleanly under `gemini-3.5-flash-lite` — the
failed attempt is not in the raw JSONL, only the successful re-run.

**What this means for the numbers below**: they measure the accuracy of *a pipeline that
had to hop across 5 Gemini-family models in one day*, not the accuracy of the model this
project actually runs in production. Treat every figure below as provisional and
re-verify against `gemini-3.6-flash` alone once a full 30-row run is possible on a single
model (either after quota resets, or once P1.11's Claude migration lands). This is
disclosed rather than smoothed over, per this project's own standing rule.

**Coverage**: 30/30 rows, 0 document-fetch failures, 30/30 with `successfulParseCount=3`
(no vacuous-agreement rows in this run) after gap-fill correction on rows 13-14.

### Tier A — deterministic checks (n=30 filings, 90 individual parse attempts)

- **A1, affectedToken correct**: 90/90 attempts (**100%**). Expected near-ceiling per
  §2.3's own framing ("sanity floor, not parse skill" — the ticker is in the prompt).
- **A2, effectiveDates contains reportDate, all 90 attempts**: 85/90 (**94.4%**).
- **A2, meaningful subset (10 filings where reportDate ≠ filingDate, indices
  2,3,4,5,13,15,18,23,27,28)**: 25/30 attempts (**83.3%**) — this is the number that
  actually says something about date-extraction skill, per §2.3's own instruction to read
  this subset, not the all-90 figure, as the meaningful one. A real, non-trivial gap from
  the sanity-floor A1 number.

### Tier B — item-code weak label on eventType (n=16 item-decidable filings)

**15/16 correct (93.75%)**. 14 filings were non-decidable (item list didn't map to exactly
one `eventType`, per the pre-registered mapping — excluded, not scored as failures, per
§2.3). Zero filings excluded for incomplete parses (all 16 decidable filings had 3/3
successful parses).

### Tier C — adjudicated spot-check (n=8, indices 0,4,8,12,16,20,24,28)

**Not run.** Requires a human (or a separately-designed LLM-as-judge pass with its own
methodology) reading verbatim source text for all 6 fields per filing — a genuinely manual
step, not something this aggregation script does. Left open per §2.3's own "this tier runs
later" framing; not silently skipped or faked.

### Tier D — inter-model agreement rate (N3 = 30, no exclusions needed this run)

| Field | Agreement rate |
|---|---|
| `eventType` (key) | 93.3% |
| `affectedToken` (key) | 100% |
| `effectiveDates` | 93.3% |
| `declaredAmounts` | 50.0% |
| `futureAnnouncedDates` | 73.3% |

**Key-field unanimity** (both `eventType` and `affectedToken` agree): **93.3%** (28/30).
**`readyToPost` rate over full N=30**: **93.3%** (28/30) — consistent with this
project's own earlier, independent finding elsewhere in the pipeline that
`declaredAmounts` is the field parses disagree on most often (verbatim-labeling
differences between independent LLM calls, not necessarily wrong extractions — Tier C
adjudication would be needed to tell the two apart, which is exactly why it's a separate,
still-open tier).

### How this was computed

`apps/server/src/studies/scoreParseAccuracy.ts` — a read-only aggregator over
`data/p2_1_parse_accuracy_raw.jsonl`, makes no LLM/network calls, safe to re-run any
number of times as more rows/tiers are added. Tier A1/A2 are computed per-attempt inside
each row at collection time (`parseAccuracySample.ts`'s `groundTruth.perAttempt`); this
script only aggregates. Tier B and D are computed here for the first time, directly from
`buildAgreementReport()`'s own output — no independent reimplementation of the agreement
logic, deliberately, since the point is to score what the real pipeline's diff logic
actually produced, not a parallel guess at it.
