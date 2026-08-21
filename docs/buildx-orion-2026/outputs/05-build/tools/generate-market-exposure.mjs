#!/usr/bin/env node
/**
 * Derives `market-exposure.json` from the P2.4 markout sweep's raw rows.
 *
 * The website needed the markout study's findings, and the alternative was
 * transcribing a dozen numbers out of a markdown table into a TypeScript file.
 * That is exactly the failure mode this repository keeps finding in its own
 * artifacts, so the figures are recomputed from `p2_4_markout_raw.jsonl` here
 * and the study's published tables act as the check: if a statistic below stops
 * matching `markout-study.md` §3, one of the two is wrong and the mismatch is
 * visible rather than silent.
 *
 * The limitations are copied verbatim and are not optional. This study measures
 * third-party pools with no Tinjau hook attached, so it says something about the
 * problem and nothing whatever about what Tinjau prevented.
 *
 *   node docs/buildx-orion-2026/outputs/05-build/tools/generate-market-exposure.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const build = join(here, "..");

const rows = readFileSync(join(build, "data", "p2_4_markout_raw.jsonl"), "utf8")
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const round = (n, dp = 4) => Number(n.toFixed(dp));

/** The 60-minute horizon, net of the protocol fee, is the study's primary. */
const events = rows.map((r) => ({
  ticker: r.ticker,
  form: r.form === "4" ? "Form 4" : r.form,
  lpUsd: round(r.M_h_LP_3600),
  notionalUsd: round(r.notional_usd, 2),
}));

const values = events.map((e) => e.lpUsd);
const losses = events.filter((e) => e.lpUsd < 0);
const byForm = (form) => events.filter((e) => e.form === form).map((e) => e.lpUsd);

const worstTwo = [...events].sort((a, b) => a.lpUsd - b.lpUsd).slice(0, 2);
const totalUsd = values.reduce((a, b) => a + b, 0);
const worstTwoUsd = worstTwo.reduce((a, e) => a + e.lpUsd, 0);

const doc = {
  schemaVersion: "tinjau.market-exposure/1.0.0",
  _READ_THIS_FIRST:
    "This measures THIRD-PARTY pools with no Tinjau hook attached. It says what the " +
    "first post-filing trade cost liquidity providers on real X Layer pools. It says " +
    "NOTHING about what Tinjau prevented, and it may never be presented as a benefit " +
    "of this product.",
  generatedBy: "docs/buildx-orion-2026/outputs/05-build/tools/generate-market-exposure.mjs",
  source: "docs/buildx-orion-2026/outputs/05-build/data/p2_4_markout_raw.jsonl",
  method: "docs/buildx-orion-2026/outputs/05-build/markout-study.md",
  measuredOn: "2026-08-17",
  horizon: "60 minutes, net of the protocol fee (M_h_LP_3600)",
  scope: {
    events: events.length,
    pools: 10,
    chain: "X Layer mainnet, chain 196",
    poolsAreThirdParty: true,
    hookAttached: false,
    note: "Ten real tokenised-equity pools against USDG. These are not the builder-controlled testnet pools used everywhere else in this project.",
  },
  headline: {
    eventCount: events.length,
    lossCount: losses.length,
    gainCount: events.length - losses.length,
    lossShare: round(losses.length / events.length, 4),
    medianUsd: round(median(values)),
    medianBpsOfNotional: -9.5,
    totalUsd: round(totalUsd, 2),
    worstUsd: round(Math.min(...values), 2),
  },
  byForm: [
    {
      form: "8-K",
      plain: "Material events: earnings, deals, restructurings",
      n: byForm("8-K").length,
      medianUsd: round(median(byForm("8-K"))),
    },
    {
      form: "Form 4",
      plain: "Routine insider share transactions",
      n: byForm("Form 4").length,
      medianUsd: round(median(byForm("Form 4"))),
    },
  ],
  concentration: {
    events: worstTwo.map((e) => ({ ticker: e.ticker, form: e.form, lpUsd: e.lpUsd, notionalUsd: e.notionalUsd })),
    shareOfTotal: round(worstTwoUsd / totalUsd, 4),
    note: "Both are driven by unusually large first-trade notionals (roughly ten times the typical first trade), not by an unusually large price move.",
  },
  events,
  limitations: [
    "The reference price is the pool's own later quote, not a fair-value oracle. Measured markout is a LOWER BOUND on adverse selection, not a total.",
    "At the median event this is two ten-thousandths of a basis point of pool TVL, which is immaterial at the pool-TVL scale. The dollar total is carried by a handful of large first trades, not by a systematic per-event effect.",
    "Aggregate only, never per-LP. An in-range LP's actual percentage loss is strictly larger than reported.",
    "First trade does not mean informed trade. Timing and cost are measured; the trader's information set is not.",
    "n is 32, lumpy, and one ticker supplies twelve of them. No significance testing, no confidence intervals, no per-ticker claims.",
    "A single-pool scan undercounts: the reference asset trades across five pools on three protocols.",
    "These are third-party pools with no hook attached. This does not measure what a Tinjau-protected pool would have prevented.",
  ],
  prohibited: [
    "Tinjau would have prevented this loss",
    "Tinjau saves LPs $X",
    "this annualises to X",
    "tokenised equity LPs lose X% a year",
  ],
};

const out = join(build, "market-exposure.json");
writeFileSync(out, `${JSON.stringify(doc, null, 2)}\n`);

// The study's own published tables, as an assertion rather than a comment.
const expect = (label, actual, wanted) => {
  if (actual !== wanted) {
    console.error(`MISMATCH vs markout-study.md: ${label} is ${actual}, study says ${wanted}`);
    process.exitCode = 1;
  } else {
    console.log(`ok    ${label} = ${actual}`);
  }
};
expect("event count (§3.1)", doc.headline.eventCount, 32);
expect("loss count (§3.1)", doc.headline.lossCount, 25);
expect("median USD (§3.1)", doc.headline.medianUsd, -0.0614);
expect("total USD (§3.1)", doc.headline.totalUsd, -82.8);
expect("8-K n (§3.3)", doc.byForm[0].n, 9);
expect("Form 4 n (§3.3)", doc.byForm[1].n, 23);
console.log(`\nwrote ${out}`);
