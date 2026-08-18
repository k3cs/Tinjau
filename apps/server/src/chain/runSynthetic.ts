/**
 * P4.4 orchestration entrypoint: end-to-end synthetic-injection test of the AFTERHOURS
 * parsing pipeline + on-chain posting + `AfterhoursFeeHook` fee widening, using a
 * self-identifying fabricated filing (never a real EDGAR document) instead of
 * `runOnce.ts`'s live-EDGAR-only path (see `syntheticFiling.ts` for why).
 *
 * Usage:
 *   tsx src/chain/runSynthetic.ts --filing <id> [--bond 10] [--dry-run] \
 *     [--replay <path>] [--allow-post]
 *
 * Known `--filing` ids: nvdax-grave-bankruptcy (positive arm), nvdax-nonmaterial-annual-meeting
 * (negative control) — see `syntheticFiling.ts::SYNTHETIC_FILINGS`.
 *
 * Anti-quota-waste design: every LIVE run (i.e. not `--replay`) persists the full
 * `PipelineResult` to `apps/server/synthetic/out/<filingId>-<isoTimestamp>.json`
 * immediately after the pipeline runs, before any chain interaction — so a run that fails
 * or is interrupted after the (quota-costing) Gemini calls can still be inspected/replayed
 * via `--replay <path>` without spending quota again.
 *
 * Negative-control safety: if `readyToPost === false`, this prints "NEGATIVE-CONTROL
 * CONFIRMED" and exits 0 WITHOUT sending any transaction — matching `postEvent.ts`'s
 * existing (P1.8) `readyToPost` gate. If `readyToPost === true`, posting additionally
 * requires `--allow-post` to be passed explicitly, so a negative-control document that
 * unexpectedly passes the gate cannot post by accident. `--force` is deliberately NOT
 * exposed here (unlike `runOnce.ts`) — that would let a failed-gate document post anyway,
 * destroying the negative control's meaning.
 */

import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runPipelineForFiling, type PipelineResult } from "../pipeline.js";
import { loadSyntheticFiling, SYNTHETIC_FILINGS } from "./syntheticFiling.js";
import { postPipelineResult } from "./postEvent.js";
import { readEventBack } from "./readBack.js";
import { getRegistryAddress, getRpcUrl } from "./client.js";

const EXPLORER_BASE = "https://www.okx.com/web3/explorer/xlayer-test";
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "..", "synthetic", "out");

interface CliArgs {
  filing: string;
  bond: string;
  dryRun: boolean;
  replay?: string;
  allowPost: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { filing: "", bond: "10", dryRun: false, allowPost: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--filing":
        args.filing = argv[++i];
        break;
      case "--bond":
        args.bond = argv[++i];
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--replay":
        args.replay = argv[++i];
        break;
      case "--allow-post":
        args.allowPost = true;
        break;
      default:
        throw new Error(`Unknown argument: ${a}`);
    }
  }
  if (!args.filing) {
    throw new Error(
      `Usage: tsx src/chain/runSynthetic.ts --filing <id> [--bond 10] [--dry-run] [--replay <path>] [--allow-post]\n` +
        `Known ids: ${Object.keys(SYNTHETIC_FILINGS).join(", ")}`,
    );
  }
  return args;
}

function stringifyMaybeBigint(v: unknown): string {
  return JSON.stringify(v, (_k, val) => (typeof val === "bigint" ? val.toString() : val), 2);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bondAmountBaseUnits = BigInt(Math.round(Number(args.bond) * 1_000_000));

  const { filing, rawHtml } = loadSyntheticFiling(args.filing);
  console.log(`[runSynthetic] filing: ${args.filing} — ${SYNTHETIC_FILINGS[args.filing].description}`);
  console.log(`[runSynthetic] sourceUrl: ${filing.documentUrl}`);
  console.log(`[runSynthetic] accessionNumber: ${filing.accessionNumber}`);

  let result: PipelineResult;
  if (args.replay) {
    console.log(`[runSynthetic] --replay set — skipping the LLM entirely, loading saved result from: ${args.replay}`);
    result = JSON.parse(readFileSync(args.replay, "utf8")) as PipelineResult;
  } else {
    console.log(`[runSynthetic] running pipeline (sha256 -> strip -> 3x parse ∥ grade -> diff)...`);
    result = await runPipelineForFiling(filing, { rawHtml });

    mkdirSync(OUT_DIR, { recursive: true });
    const outPath = join(OUT_DIR, `${args.filing}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    writeFileSync(outPath, stringifyMaybeBigint(result));
    console.log(`[runSynthetic] persisted full PipelineResult to: ${outPath}`);
    console.log(`[runSynthetic] replay this exact result later with: --replay ${outPath}`);
  }

  console.log(`\n[runSynthetic] contentHash: ${result.contentHash}`);
  console.log(`[runSynthetic] severityGrade: ${result.severityGrade.grade.severity} / ${result.severityGrade.grade.direction}`);
  console.log(`[runSynthetic] successfulParseCount: ${result.agreement.successfulParseCount}/${result.agreement.totalAttempts}`);
  console.log(`[runSynthetic] readyToPost: ${result.agreement.readyToPost}`);
  console.log(`[runSynthetic] flagReasons: ${JSON.stringify(result.agreement.flagReasons)}`);
  console.log(`\n[runSynthetic] 3-way field diff:`);
  for (const f of result.agreement.fields) {
    console.log(`  ${f.agreement === "agree" ? "AGREE   " : "DISAGREE"}  ${f.field}${f.isKeyField ? " (key field)" : ""}`);
    console.log(`      values: ${JSON.stringify(f.values)}`);
  }

  if (!result.agreement.readyToPost) {
    console.log(`\n[runSynthetic] NEGATIVE-CONTROL CONFIRMED — readyToPost=false, refusing to post. No transaction sent.`);
    console.log(`[runSynthetic] flagReasons: ${JSON.stringify(result.agreement.flagReasons)}`);
    return;
  }

  console.log(`\n[runSynthetic] readyToPost=true.`);
  if (!args.allowPost) {
    console.error(
      `[runSynthetic] readyToPost=true but --allow-post was not passed — refusing to post without an explicit ` +
        `opt-in (this guard exists so a negative-control document that unexpectedly passes the gate cannot post ` +
        `by accident). Re-run with --allow-post to actually send the transaction, or inspect the persisted JSON above.`,
    );
    process.exit(1);
  }

  const outcome = await postPipelineResult(result, {
    bondAmountBaseUnits,
    dryRun: args.dryRun,
    network: "testnet",
  });

  console.log(`\n[runSynthetic] mapped postEvent() args:`);
  console.log(stringifyMaybeBigint(outcome.args));

  if (outcome.dryRun) {
    console.log(`\n[runSynthetic] --dry-run set — stopping before any transaction.`);
    return;
  }

  console.log(`\n[runSynthetic] reading back and verifying...`);
  const readBack = await readEventBack(outcome.eventId, outcome.args);

  console.log(`\n[runSynthetic] read-back results:`);
  for (const c of readBack.checks) {
    console.log(`  ${c.pass ? "PASS" : "FAIL"}  ${c.field}`);
    if (!c.pass) {
      console.log(`        expected: ${stringifyMaybeBigint(c.expected)}`);
      console.log(`        actual:   ${stringifyMaybeBigint(c.actual)}`);
    }
  }

  const registryAddress = getRegistryAddress();
  console.log(`\n=== EVIDENCE BLOCK (P4.4: ${args.filing}) ===`);
  console.log(`rpcUrl: ${getRpcUrl()}`);
  console.log(`registry: ${registryAddress}`);
  console.log(`eventId: ${outcome.eventId}`);
  console.log(`contentHash: 0x${result.contentHash}`);
  console.log(`sourceUrl: ${filing.documentUrl}`);
  console.log(`accessionNumber: ${filing.accessionNumber}`);
  console.log(`postTxHash: ${outcome.postTxHash}`);
  console.log(`postTxExplorer: ${EXPLORER_BASE}/tx/${outcome.postTxHash}`);
  if (outcome.mintTxHash) {
    console.log(`mintTxHash: ${outcome.mintTxHash}`);
    console.log(`mintTxExplorer: ${EXPLORER_BASE}/tx/${outcome.mintTxHash}`);
  }
  if (outcome.approveTxHash) {
    console.log(`approveTxHash: ${outcome.approveTxHash}`);
    console.log(`approveTxExplorer: ${EXPLORER_BASE}/tx/${outcome.approveTxHash}`);
  }
  console.log(`gasUsed: ${outcome.gasUsed}`);
  console.log(`bondAmountBaseUnits: ${bondAmountBaseUnits}`);
  console.log(`readBack.allPass: ${readBack.allPass}`);
  console.log(`=== END EVIDENCE BLOCK ===\n`);

  if (!readBack.allPass) {
    console.error(`[runSynthetic] read-back verification FAILED — see above.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[runSynthetic] failed:", err);
  process.exit(1);
});
