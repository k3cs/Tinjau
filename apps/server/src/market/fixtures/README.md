# Market adapter fixtures (task T3.1)

These files are **synthetic**, written by the Tinjau team to exercise failure paths that the
real sampled data does not contain. They are not observations of anything.

The one piece of **real** sampled data lives elsewhere and is deliberately not copied here:

```
docs/buildx-orion-2026/outputs/05-build/data/index/index-wNVDAx-2026-08-18.ndjson
```

Duplicating it would create two sources of truth that can drift. `okxReference.test.ts`
references that canonical path directly and pins its sha256, so a change to it fails loudly.

This directory is shared by the market adapters. The files below belong to the OKX
reference-price adapter (T3.1); pool-telemetry fixtures (T3.2) are documented by that module.

| File | What it is for |
|---|---|
| `degraded-rows.ndjson` | malformed lines — bad JSON, missing fields, missing/unparseable source time, empty price |
| `wrong-asset.ndjson` | well-formed rows for a *different* instrument, to prove asset mapping refuses rather than substitutes |

## T3.4 manipulation fixtures

| File | What it is for |
|---|---|
| `degraded-f1-wick-with-volume-burst.json` | a fully-retraced −500 bps spike carrying the volume burst that accompanies almost every real spike |
| `degraded-f2-single-point-persistence.json` | the same recovered spike plus ONE re-dip timed at rule 1.0.0's persistence sampling instant |

Both returned `CONFIRMED` under rule `tinjau.confirm/1.0.0` and were the evidence for defects F1
and F2. Both return `NOT_CONFIRMED` under `tinjau.confirm/2.0.0` and are retained as regression
fixtures, asserted through `buildConfirmationInput` — the production adapter — in
`test/marketDegraded.test.ts`. Their `_status` field records the closure.

## Why these are synthetic and the price data is not

Failure modes are cheap to fabricate honestly and expensive to wait for: the poller has not
yet produced a corrupt row. A fabricated corrupt row proves the parser rejects it. A
fabricated *price*, by contrast, would be a claim about a market that never happened, so no
file here contains a price presented as observed.

## What these fixtures cannot prove

They exercise this module's own logic only. They say nothing about live OKX availability,
latency, or coverage — see the SVC-003 limitation recorded in the T3.1 report.
