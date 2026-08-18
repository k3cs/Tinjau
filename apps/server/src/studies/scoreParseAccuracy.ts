/**
 * P2.1 scorer — aggregates `data/p2_1_parse_accuracy_raw.jsonl` into the Tier A/B/D
 * figures pre-registered in `parse-accuracy-study.md` §2.3-2.4. Read-only over the raw
 * JSONL; makes no LLM/network calls; safe to re-run any number of times.
 *
 * Tier A1/A2 are computed per-attempt already inside each row's
 * `finalResult.groundTruth.perAttempt[]` (written by `parseAccuracySample.ts` at collection
 * time) — this script only aggregates them. Tier B and Tier D are computed here for the
 * first time, straight from `finalResult.agreement`.
 *
 * Tier C (n=8 manual adjudication) is NOT computed here — it requires a human (or a
 * separate, deliberate LLM-as-judge pass) reading verbatim source text, not a pure
 * aggregation. Left as an explicitly open follow-up, per the pre-registration's own framing
 * ("this tier runs LATER").
 *
 * Usage: tsx src/studies/scoreParseAccuracy.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TRACKED_TICKERS } from "../config/tickers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_JSONL_PATH = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "docs",
  "buildx-orion-2026",
  "outputs",
  "05-build",
  "data",
  "p2_1_parse_accuracy_raw.jsonl",
);

// Tier A2's "the second number is the one that means something" subset — filings where
// reportDate != filingDate, pre-registered by index in parse-accuracy-study.md §2.3.
const A2_MEANINGFUL_INDICES = new Set([2, 3, 4, 5, 13, 15, 18, 23, 27, 28]);

// Tier B — pre-registered item -> eventType mapping, parse-accuracy-study.md §2.3.
const ITEM_TO_EVENT_TYPE: Record<string, string> = {
  "2.02": "earnings_announcement",
  "5.02": "executive_change",
  "1.01": "material_agreement",
  "1.02": "material_agreement",
  "2.01": "acquisition_or_divestiture",
  "2.03": "capital_raise",
  "4.02": "restatement",
  "1.03": "bankruptcy_or_restructuring",
};

interface RawRow {
  index: number;
  ticker: string;
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  items: string;
  geminiModel?: string;
  finalResult: {
    documentFetchStatus: "ok" | "document_fetch_failed";
    agreement?: {
      fields: Array<{ field: string; isKeyField: boolean; agreement: "agree" | "disagree"; agreedValue: unknown }>;
      successfulParseCount: number;
      readyToPost: boolean;
      flagReasons: string[];
    };
    groundTruth?: {
      perAttempt: Array<{ attempt: number; a1AffectedTokenCorrect: boolean; a2EffectiveDatesContainsReportDate: boolean }>;
    };
  };
}

function loadRows(): RawRow[] {
  const raw = readFileSync(RAW_JSONL_PATH, "utf8");
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as RawRow)
    .sort((a, b) => a.index - b.index);
}

function fieldOf(row: RawRow, name: string) {
  return row.finalResult.agreement?.fields.find((f) => f.field === name);
}

function main() {
  const rows = loadRows();
  const N = rows.length;
  console.log(`[score] loaded ${N} rows from ${RAW_JSONL_PATH}`);

  const fetchFailures = rows.filter((r) => r.finalResult.documentFetchStatus !== "ok");
  const fetchOk = rows.filter((r) => r.finalResult.documentFetchStatus === "ok");

  // --- Tier A: deterministic external checks, over document-fetch-ok rows ---
  let a1Correct = 0;
  let a1Total = 0;
  let a2Correct = 0;
  let a2Total = 0;
  let a2MeaningfulCorrect = 0;
  let a2MeaningfulTotal = 0;

  for (const row of fetchOk) {
    const perAttempt = row.finalResult.groundTruth?.perAttempt ?? [];
    for (const a of perAttempt) {
      a1Total++;
      if (a.a1AffectedTokenCorrect) a1Correct++;
      a2Total++;
      if (a.a2EffectiveDatesContainsReportDate) a2Correct++;
      if (A2_MEANINGFUL_INDICES.has(row.index)) {
        a2MeaningfulTotal++;
        if (a.a2EffectiveDatesContainsReportDate) a2MeaningfulCorrect++;
      }
    }
  }

  // --- Tier B: item-code weak label, over item-decidable filings with 3/3 successful parses ---
  let bDecidableTotal = 0;
  let bCorrect = 0;
  const bNonDecidable: number[] = [];
  const bExcludedNot3of3: number[] = [];

  for (const row of fetchOk) {
    const items = row.items.split(",").map((s) => s.trim());
    const mapped = new Set(items.map((i) => ITEM_TO_EVENT_TYPE[i]).filter((v): v is string => v !== undefined));
    if (mapped.size !== 1) {
      bNonDecidable.push(row.index);
      continue;
    }
    const spc = row.finalResult.agreement?.successfulParseCount ?? 0;
    if (spc !== 3) {
      bExcludedNot3of3.push(row.index);
      continue;
    }
    bDecidableTotal++;
    const [expected] = mapped;
    const eventTypeField = fieldOf(row, "eventType");
    if (eventTypeField?.agreement === "agree" && eventTypeField.agreedValue === expected) {
      bCorrect++;
    }
  }

  // --- Tier D: inter-model agreement rate — N3 denominator, vacuous-agree excluded ---
  const n3Rows = fetchOk.filter((r) => (r.finalResult.agreement?.successfulParseCount ?? 0) === 3);
  const N3 = n3Rows.length;
  const perFieldAgree: Record<string, number> = {};
  const DIFFABLE = ["eventType", "affectedToken", "effectiveDates", "declaredAmounts", "futureAnnouncedDates"];
  for (const f of DIFFABLE) perFieldAgree[f] = 0;
  let keyFieldUnanimity = 0;

  for (const row of n3Rows) {
    let bothKeyAgree = true;
    for (const f of DIFFABLE) {
      const fd = fieldOf(row, f);
      if (fd?.agreement === "agree") perFieldAgree[f]++;
      if (fd?.isKeyField && fd.agreement !== "agree") bothKeyAgree = false;
    }
    if (bothKeyAgree) keyFieldUnanimity++;
  }

  const readyToPostCount = rows.filter((r) => r.finalResult.agreement?.readyToPost === true).length;

  // --- Model-mix disclosure (real deviation from the pre-registered single-model assumption) ---
  const modelCounts: Record<string, number> = {};
  for (const row of rows) {
    const m = row.geminiModel ?? "unknown (collected before geminiModel field existed)";
    modelCounts[m] = (modelCounts[m] ?? 0) + 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    N,
    documentFetchFailures: fetchFailures.map((r) => r.index),
    modelDistribution: modelCounts,
    modelMixCaveat:
      "This sample was NOT collected against a single Gemini model. Google's free-tier daily " +
      "quota (20 req/day per API key+model pair) was exhausted repeatedly during collection on " +
      "2026-08-18, forcing model switches mid-study. Figures below are pooled across all models " +
      "listed in modelDistribution — they measure 'accuracy of this mixed Gemini-model pipeline " +
      "run on this specific day', not 'gemini-3.6-flash accuracy' (the model apps/server's " +
      "production agent.ts actually runs). Do not present these numbers as a single-model result.",
    tierA: {
      a1AffectedToken: { correct: a1Correct, total: a1Total, rate: a1Total ? a1Correct / a1Total : null },
      a2EffectiveDatesContainsReportDate_all: { correct: a2Correct, total: a2Total, rate: a2Total ? a2Correct / a2Total : null },
      a2EffectiveDatesContainsReportDate_meaningfulSubset: {
        correct: a2MeaningfulCorrect,
        total: a2MeaningfulTotal,
        rate: a2MeaningfulTotal ? a2MeaningfulCorrect / a2MeaningfulTotal : null,
        note: "Only the 10 filings (indices 2,3,4,5,13,15,18,23,27,28) where reportDate != filingDate — this is the number that means something per §2.3.",
      },
    },
    tierB: {
      itemDecidableTotal: bDecidableTotal,
      correct: bCorrect,
      rate: bDecidableTotal ? bCorrect / bDecidableTotal : null,
      nonDecidableIndices: bNonDecidable,
      excludedNotFullAgreementIndices: bExcludedNot3of3,
    },
    tierC: { status: "not run — requires manual/adjudicated spot-check per §2.3, indices [0,4,8,12,16,20,24,28]" },
    tierD: {
      N3,
      perFieldAgreementRate: Object.fromEntries(DIFFABLE.map((f) => [f, N3 ? perFieldAgree[f] / N3 : null])),
      keyFieldUnanimityRate: N3 ? keyFieldUnanimity / N3 : null,
      readyToPostRateOverFullN: { count: readyToPostCount, total: N, rate: readyToPostCount / N },
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

main();
