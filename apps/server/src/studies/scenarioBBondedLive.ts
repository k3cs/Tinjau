/**
 * S2.1 — Scenario B with the bonded parse bit COMPUTED instead of assumed.
 *
 * ---------------------------------------------------------------------------------------
 * WHAT THIS EXISTS TO FIX.
 *
 * `RunScenarioOptions.officialEvidencePassed` is an INPUT everywhere it is published. Its own
 * doc comment says so, and it defaults to `true` so that a refusal can never be an artefact of
 * assuming the bond failed. That default is the honest choice for a scenario nobody has run the
 * parser against — but it means every published scenario answers the question "would the engine
 * promote IF the three-way parse agreed?", not "did the three-way parse agree?".
 *
 * This entry point closes that gap for exactly one scenario. It reads the sha256-pinned 8-K off
 * disk, strips it, runs the REAL `parseFilingThreeWays` against the live model three times,
 * builds the REAL `buildAgreementReport`, and feeds `agreement.readyToPost` into `runScenario`
 * as `officialEvidencePassed`. Nothing in the decision engine is touched, patched, or wrapped:
 * `scenarioRunner.ts`, `orchestrate.ts` and the scenario JSON are byte-identical before and
 * after this file exists. The only thing that changed is where one boolean came from.
 *
 * THE POINT IS THAT THE BIT IS COMPUTED, NOT WHAT STATE COMES OUT. Scenario B's canonical,
 * published, pre-registered outcome is `WATCH`: its market leg is `NOT_CONFIRMED` on the chain
 * 196 replay, and the scenario file itself pre-registers WATCH as the correct answer whenever
 * market confirmation fails (`preRegisteredExpectation.ifMarketConfirmationFails`). A `WATCH`
 * here is the run SUCCEEDING. Nothing in this file, and nothing written to the artifact, treats
 * `WATCH` as an error, a fallback, or a degraded result. The `comparison` block exists precisely
 * so a reader can see for themselves whether computing the bit moved the outcome at all — and
 * "it did not move" is a finding worth publishing, not a wasted run.
 *
 * WHY THE DOCUMENT IS READ FROM DISK AND NEVER FROM EDGAR. The scenario pins
 * `sourceContentSha256` for `claim-b-001`. A network fetch could return an amended filing, or a
 * byte-different rendering of the same one, and the parse would then no longer be a parse of the
 * frozen scenario's evidence. The local copy is committed and byte-pinned; it is checked against
 * the scenario's own hash before a single token is sent to the model, and a mismatch exits
 * without spending an LLM call. That check is what makes this run reproducible rather than
 * merely repeatable.
 *
 * WHY THE MODEL IS PINNED HERE RATHER THAN INHERITED. `getGeminiModelId()` reads `GEMINI_MODEL`,
 * which is an escape hatch for quota exhaustion, not a second default (see `llm/provider.ts`).
 * A published artifact collected under whatever the operator's shell happened to export is not
 * comparable to anything. So this script resolves the model itself, defaulting to the pinned id
 * regardless of the ambient variable, and records BOTH the id it used and the ambient value it
 * overrode. If you want a different model, say so with `--model` and the artifact will say so
 * too.
 *
 * ---------------------------------------------------------------------------------------
 * CLI
 *
 *   npx tsx src/studies/scenarioBBondedLive.ts
 *       Parse + decide + write the artifact. Makes three Gemini calls. Sends NOTHING to a
 *       chain. This is the default because a chain write is not something a script should do
 *       because nobody remembered to pass a flag.
 *
 *   npx tsx src/studies/scenarioBBondedLive.ts --post
 *       The same, then signs and relays ONE new assessment to the live X Layer Testnet
 *       registry. Appends only; it can never overwrite or rewrite an existing record.
 *
 *   --out <path>    Where the artifact goes. Defaults to the S2.1 data path below.
 *   --model <id>    Overrides the pinned model id. Recorded in the artifact.
 *   --help          Prints this and exits before any file read, LLM call or network call.
 *
 * SECRETS. No key of any kind is printed, logged, or written. Error messages name environment
 * VARIABLES, never values. Before the artifact is written it is scanned against the actual
 * secret values present in `process.env` and the write is refused if any of them appears — the
 * scan is by value, not by shape, because the artifact legitimately contains 64-hex transaction
 * hashes and a 64-hex document digest that a shape-based scan would flag forever.
 * ---------------------------------------------------------------------------------------
 */

import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { privateKeyToAccount } from "viem/accounts";

import { stripFilingHtml } from "../parsing/stripFilingHtml.js";
import {
  parseFilingThreeWays,
  type FilingParseContext,
  type ParseAttemptResult,
} from "../llm/parseFiling.js";
import { buildAgreementReport, type AgreementReport } from "../diff/agreement.js";
import { getGeminiModelId, getLanguageModel } from "../llm/provider.js";
import { runScenario, type FrozenScenario } from "../decision/scenarioRunner.js";
import type { RawClaimInput } from "../evidence/normalize.js";
import type { Decision } from "../decision/orchestrate.js";
import type { ReasonCode } from "../risk/types.js";
import { blockToUnixSeconds, type SwapWindowFixture } from "../market/poolTelemetry.js";
import {
  chainNowSeconds,
  makeTinjauClients,
  type TinjauChainConfig,
  type TinjauClients,
} from "../chain/tinjauChain.js";
import { TINJAU_RISK_REGISTRY_ABI } from "../chain/tinjauAbi.js";
import type { PostResult } from "../chain/tinjauHarness.js";
import {
  setAssessorKey,
  signAndPostDecision,
  timeShiftScenario,
  timeShiftSwapWindow,
} from "../chain/tinjauScenes.js";
import { deriveRoleKey } from "../chain/tinjauRoleKeys.js";
import { normalizeKey } from "../chain/tinjauPreflight.js";

// ---------------------------------------------------------------------------
// Paths and constants
// ---------------------------------------------------------------------------

const here = dirname(fileURLToPath(import.meta.url));
// apps/server/src/studies -> apps/server -> repo root.
const serverRoot = join(here, "..", "..");
const repoRoot = join(serverRoot, "..", "..");

const SCENARIO_PATH = join(serverRoot, "scenarios", "scenario-b-confirmed-protect.json");
const SCENARIOS_DIR = join(serverRoot, "scenarios");
const SWAP_FIXTURE_PATH = join(
  serverRoot,
  "src",
  "market",
  "fixtures",
  "pool-scenario-b-swaps.json",
);
const DEPLOYED_ADDRESSES_PATH = join(
  repoRoot,
  "docs",
  "buildx-orion-2026",
  "outputs",
  "05-build",
  "frontend-handoff",
  "deployed-addresses.json",
);
const DEFAULT_OUT_PATH = join(
  repoRoot,
  "docs",
  "buildx-orion-2026",
  "outputs",
  "05-build",
  "data",
  "s2_1_scenario_b_bonded_live.json",
);

/** The claim whose document carries the OFFICIAL evidence the bonded path is about. */
const OFFICIAL_CLAIM_ID = "claim-b-001";

/**
 * The project's pinned model id, restated here rather than imported.
 *
 * `provider.ts` keeps its default private and exposes only `getGeminiModelId()`, which already
 * consults `GEMINI_MODEL` — so reading it back would give us whatever the shell exported, which
 * is the exact thing this study must not inherit. Naming the id here means the pin is visible in
 * the file that depends on it, and a drift between the two is a one-line grep away.
 */
const PINNED_GEMINI_MODEL = "gemini-3.6-flash";

/**
 * The only chain this script may touch.
 *
 * A positive allow-list of ONE, not a deny-list of mainnet. `tinjauDemoRun.ts` allows 31337 as
 * well because it can boot its own Anvil; this script cannot, and an allow-list that admits a
 * chain the script has no way to reach is just an untested branch. X Layer mainnet (196) is
 * absent and stays absent: no mainnet action is authorised for this project.
 */
const ALLOWED_CHAIN_IDS = new Set([1952]);

/** The stack whose registry is the published, authoritative one. */
const AUTHORITATIVE_STACK_ID = "production-envelope";

const SCHEMA_VERSION = "tinjau.scenario-b-bonded-live/1.0.0";
const PRODUCED_BY = "apps/server/src/studies/scenarioBBondedLive.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The scenario file as it is on disk.
 *
 * `FrozenScenario` is the subset `runScenario` reads, and `RawClaimInput` is the subset the
 * evidence normaliser reads. Neither carries the filing metadata the LLM prompt needs
 * (`accessionNumber`, `secForm`, `reportDate`, `sourceLocalPath`), so this widens both rather
 * than editing the shared types — the shared types are correct for their consumers and this
 * script is not a reason to grow them.
 */
type ScenarioClaimOnDisk = RawClaimInput & {
  accessionNumber?: string;
  secForm?: string;
  reportDate?: string;
  sourceLocalPath?: string;
};

interface ScenarioBOnDisk extends Omit<FrozenScenario, "asset" | "claims"> {
  asset: FrozenScenario["asset"] & { ticker: string };
  claims: ScenarioClaimOnDisk[];
}

/** The slice of `deployed-addresses.json` this script needs. Read, never hardcoded. */
interface DeployedStack {
  stackId: string;
  label: string;
  isDemoEnvelope: boolean;
  poolId: `0x${string}`;
  tickSpacing: number;
  contracts: { role: string; address: `0x${string}` }[];
}

interface DeployedAddressesFile {
  network: { chainId: number; rpc: string; name: string };
  stacks: DeployedStack[];
}

interface DecisionSummary {
  state: string;
  reasonCodes: ReasonCode[];
}

interface ChainPostRecord {
  chainId: number;
  networkLabel: string;
  registryAddress: `0x${string}`;
  /**
   * The registry key this record was written under, and the pool the deployed hook actually
   * serves. They differ, deliberately — see `postDecisionOnChain` for why, and the limitations
   * array for what that means for a reader.
   */
  postedUnderPoolId: `0x${string}`;
  deployedStackPoolId: `0x${string}`;
  assessorAddress: `0x${string}`;
  posterAddress: `0x${string}`;
  envelopeReadFromChain: {
    baseFee: number;
    maxFee: number;
    widenDuration: number;
    decayDuration: number;
    maxProtectDuration: number;
    cooldown: number;
  };
  /**
   * Seconds the frozen scenario was shifted forward so its assessment is postable at all.
   *
   * A scenario anchored on 2026-08-17 signs an assessment whose `expiresAt` is in the past, and
   * `TinjauRiskRegistry.postAssessment` reverts it with `AssessmentExpired` before looking at
   * anything else. The shift moves the WHOLE scenario — every claim timestamp, the anchor, and
   * every block in the swap window — by one constant, which preserves every relationship
   * between them. It is asserted below to leave the state and the reason codes unchanged; if it
   * ever changed them, this script refuses to post rather than publishing the shift's answer.
   */
  timeShiftSeconds: number;
  shiftPreservedOutcome: boolean;
  shiftedDecision: DecisionSummary;
  post: PostResult | null;
  /** Set when the post was refused before it was attempted, e.g. a shift that moved the verdict. */
  refusedReason: string | null;
}

interface BondedLiveArtifact {
  schemaVersion: string;
  producedBy: string;
  runAtUtc: string;

  scenarioId: string;
  accessionNumber: string;
  documentSha256: string;
  documentLocalPath: string;
  documentBytes: number;
  strippedTextLength: number;

  geminiModel: string;
  ambientGeminiModelEnv: string | null;
  ambientGeminiModelOverridden: boolean;

  attempts: ParseAttemptResult[];
  agreement: AgreementReport;

  officialEvidencePassed: boolean;
  officialEvidencePassedSource: "computed";

  decision: Decision;
  comparison: {
    computed: DecisionSummary & { officialEvidencePassed: boolean };
    assumedTrue: DecisionSummary & { officialEvidencePassed: true };
    outcomeChanged: boolean;
  };

  chainPost: ChainPostRecord | null;
  limitations: string[];
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function getArgValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : undefined;
}

/**
 * `bigint` renders as a decimal string rather than being dropped.
 *
 * A `Decision` carries `assessedAt`, `expiresAt`, `nonce` and `deadline` as bigints, and a
 * decoded revert carries them too (`CooldownActive(uint64, uint32)`). `JSON.stringify` throws on
 * a bigint by default; silently omitting them would remove exactly the numbers a reader of a
 * refusal most needs. Same treatment `tinjauDemoRun.ts` gives its manifest.
 */
function bigintSafe(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

/**
 * Refuses to write anything that contains a live secret.
 *
 * Scans BY VALUE, against what is actually in the environment right now — not by hex shape. A
 * shape-based scan would be useless here: this artifact legitimately contains a 64-hex document
 * digest, and after `--post` it contains 64-hex transaction hashes and a 32-byte evidence
 * commitment. A shape scan would either flag every honest run or be tuned until it flagged
 * nothing, and both outcomes are worse than no scan at all.
 *
 * Every candidate is compared in the forms a serialiser could plausibly emit it in: verbatim,
 * lower-cased, and with the `0x` prefix added or stripped. The failure message names the
 * variable and never the value.
 */
function assertNoSecretsInSerialized(serialized: string, extraSecrets: string[] = []): void {
  const envNames = [
    "GEMINI_API_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "GOOGLE_API_KEY",
    "POSTER_PRIVATE_KEY",
    "TINJAU_ASSESSOR_PRIVATE_KEY",
    "GUARDIAN_PRIVATE_KEY",
    "DEMO_RELAYER_PRIVATE_KEY",
  ];

  const haystack = serialized.toLowerCase();

  const variants = (raw: string): string[] => {
    const v = raw.trim();
    const out = new Set<string>([v, v.toLowerCase()]);
    if (v.startsWith("0x")) out.add(v.slice(2).toLowerCase());
    else out.add(`0x${v}`.toLowerCase());
    return [...out];
  };

  for (const name of envNames) {
    const value = process.env[name]?.trim();
    // Eight characters is short enough to catch any real credential and long enough that a
    // stray one-character variable cannot match half the file and produce a false refusal.
    if (!value || value.length < 8) continue;
    for (const candidate of variants(value)) {
      if (haystack.includes(candidate.toLowerCase())) {
        throw new Error(
          `Refusing to write the artifact: it contains the value of ${name}. ` +
            `Nothing was written. This is a bug in this script, not in your environment.`,
        );
      }
    }
  }

  // Keys this script derived itself never touched an environment variable, so the loop above
  // cannot see them. They are passed in here explicitly for the same check.
  for (const secret of extraSecrets) {
    if (!secret || secret.length < 8) continue;
    for (const candidate of variants(secret)) {
      if (haystack.includes(candidate.toLowerCase())) {
        throw new Error(
          "Refusing to write the artifact: it contains a derived signing key. Nothing was " +
            "written. This is a bug in this script.",
        );
      }
    }
  }
}

function summarize(decision: Decision): DecisionSummary {
  return { state: decision.record.state, reasonCodes: [...decision.record.reasonCodes] };
}

function sameOutcome(a: DecisionSummary, b: DecisionSummary): boolean {
  return (
    a.state === b.state &&
    JSON.stringify([...a.reasonCodes].sort()) === JSON.stringify([...b.reasonCodes].sort())
  );
}

// ---------------------------------------------------------------------------
// Deployed addresses
// ---------------------------------------------------------------------------

interface ResolvedTarget {
  chainId: number;
  rpcUrl: string;
  networkLabel: string;
  registry: `0x${string}`;
  hook: `0x${string}`;
  poolManager: `0x${string}`;
  swapRouter: `0x${string}`;
  liquidityRouter: `0x${string}`;
  riskAsset: `0x${string}`;
  quoteAsset: `0x${string}`;
  poolId: `0x${string}`;
  tickSpacing: number;
}

/**
 * Reads the target out of the published address list instead of demanding fifteen `TINJAU_*`
 * variables.
 *
 * `tinjauDemoRun.ts` takes every address from the environment, which is right for a runner that
 * may point at a freshly deployed stack. This script has exactly one legitimate target — the
 * published, T7.2-verified production-envelope stack — and asking an operator to retype it from
 * a file that already states it is how a run ends up posting to the wrong registry. The file is
 * the source of truth; `TINJAU_RPC_URL` and `TINJAU_REGISTRY` remain as deliberate overrides for
 * the case where it is genuinely wrong.
 */
function resolveTarget(): ResolvedTarget {
  const file = readJson<DeployedAddressesFile>(DEPLOYED_ADDRESSES_PATH);
  const stack = file.stacks.find((s) => s.stackId === AUTHORITATIVE_STACK_ID);
  if (!stack) {
    throw new Error(
      `No stack with stackId "${AUTHORITATIVE_STACK_ID}" in ${DEPLOYED_ADDRESSES_PATH}. ` +
        `Refusing to guess which of the published stacks is the authoritative one.`,
    );
  }

  const addressFor = (role: string): `0x${string}` => {
    const found = stack.contracts.find((c) => c.role === role || c.role.startsWith(role));
    if (!found) {
      throw new Error(
        `Stack "${stack.stackId}" in ${DEPLOYED_ADDRESSES_PATH} has no contract with role ` +
          `"${role}". The address list changed shape; this script will not substitute a default.`,
      );
    }
    return found.address;
  };

  const chainId = Number(process.env.TINJAU_CHAIN_ID ?? file.network.chainId);
  if (!ALLOWED_CHAIN_IDS.has(chainId)) {
    throw new Error(
      `Refusing to run against chain ${chainId}. This script is permitted on ` +
        `${[...ALLOWED_CHAIN_IDS].join(", ")} only. X Layer mainnet (196) is deliberately not ` +
        `on the list; no mainnet action is authorised for this project.`,
    );
  }

  return {
    chainId,
    rpcUrl: process.env.TINJAU_RPC_URL?.trim() || file.network.rpc,
    networkLabel: file.network.name,
    registry: (process.env.TINJAU_REGISTRY?.trim() as `0x${string}`) || addressFor("TinjauRiskRegistry"),
    hook: addressFor("TinjauFeeHook"),
    poolManager: addressFor("PoolManager"),
    swapRouter: addressFor("swap router"),
    liquidityRouter: addressFor("liquidity router"),
    riskAsset: addressFor("risk asset"),
    quoteAsset: addressFor("quote asset"),
    poolId: stack.poolId,
    tickSpacing: stack.tickSpacing,
  };
}

// ---------------------------------------------------------------------------
// Chain posting
// ---------------------------------------------------------------------------

/**
 * Builds the client set for a post.
 *
 * `TinjauChainConfig` is shaped for the full demo harness, which swaps and pauses as well as
 * posting. This run only signs and relays one assessment, so several of its fields exist here
 * purely to satisfy the shape, and each is set to something true rather than something
 * plausible:
 *
 *   - `relayer` and `guardian` point at the poster's account. No swap is executed and nothing is
 *     paused, so neither role is ever exercised; demanding `DEMO_RELAYER_PRIVATE_KEY` for a run
 *     that cannot use it would just be a variable to get wrong.
 *   - `supportsTimeTravel` is false and `allowWallClockWait` is false. This script never advances
 *     a clock; it shifts the scenario's own timestamps instead, which is a different thing.
 *   - `poolId` is set by the caller to the key the record is actually written under, not to the
 *     demo pool. `postAssessment` waits for `currentRecord(riskAsset, config.poolId)` to reflect
 *     the write before returning, and pointing that read at a key nothing wrote would sit for
 *     ninety seconds and then report a revert that never happened.
 */
function buildClients(
  target: ResolvedTarget,
  postedUnderPoolId: `0x${string}`,
): { clients: TinjauClients; assessorKey: `0x${string}` } {
  const posterKey = normalizeKey(process.env.POSTER_PRIVATE_KEY, "POSTER_PRIVATE_KEY");

  // Identical derivation to `tinjauDemoRun.ts`: an explicit assessor key wins, otherwise one is
  // derived from the poster's. The assessor pays no gas — it only signs — so a derived key needs
  // no funded wallet, and deriving beats collapsing the signing role onto the relaying wallet.
  // `tinjauRoleKeys.ts` records why that is a testnet arrangement and not a production one.
  const assessorKey = process.env.TINJAU_ASSESSOR_PRIVATE_KEY?.trim()
    ? normalizeKey(process.env.TINJAU_ASSESSOR_PRIVATE_KEY, "TINJAU_ASSESSOR_PRIVATE_KEY")
    : deriveRoleKey(posterKey, "assessor");

  const poster = privateKeyToAccount(posterKey);

  const config: TinjauChainConfig = {
    rpcUrl: target.rpcUrl,
    chainId: target.chainId,
    networkLabel: target.networkLabel,
    addresses: {
      registry: target.registry,
      hook: target.hook,
      poolManager: target.poolManager,
      swapRouter: target.swapRouter,
      liquidityRouter: target.liquidityRouter,
      riskAsset: target.riskAsset,
      quoteAsset: target.quoteAsset,
      // v4 orders a pool's currencies by address. Derived rather than transcribed so the pair
      // cannot silently invert if the address list is edited. Unused by this run — no swap is
      // executed — but wrong is wrong even in a field nobody reads.
      token0:
        target.riskAsset.toLowerCase() < target.quoteAsset.toLowerCase()
          ? target.riskAsset
          : target.quoteAsset,
      token1:
        target.riskAsset.toLowerCase() < target.quoteAsset.toLowerCase()
          ? target.quoteAsset
          : target.riskAsset,
      poolId: postedUnderPoolId,
      tickSpacing: target.tickSpacing,
    },
    // Placeholder, overwritten from the chain before anything is signed. The envelope is never
    // taken on trust from a file: it is a property of the deployed registry, and the artifact
    // should record what the registry says rather than what a document said it should say.
    envelope: {
      baseFee: 0,
      maxFee: 0,
      widenDuration: 0,
      decayDuration: 0,
      maxProtectDuration: 0,
      cooldown: 0,
      demoEnvelope: false,
    },
    accounts: {
      assessor: privateKeyToAccount(assessorKey),
      poster,
      relayer: poster,
      guardian: poster,
    },
    supportsTimeTravel: false,
    allowWallClockWait: false,
  };

  return { clients: makeTinjauClients(config), assessorKey };
}

async function readEnvelopeFromChain(
  clients: TinjauClients,
): Promise<ChainPostRecord["envelopeReadFromChain"]> {
  const [baseFee, maxFee, widenDuration, decayDuration, maxProtectDuration, cooldown] =
    (await clients.publicClient.readContract({
      address: clients.config.addresses.registry,
      abi: TINJAU_RISK_REGISTRY_ABI,
      functionName: "envelope",
    })) as [number, number, number, number, number, number];

  return {
    baseFee: Number(baseFee),
    maxFee: Number(maxFee),
    widenDuration: Number(widenDuration),
    decayDuration: Number(decayDuration),
    maxProtectDuration: Number(maxProtectDuration),
    cooldown: Number(cooldown),
  };
}

/**
 * Signs one assessment and relays it. Appends; never rewrites.
 *
 * `postAssessment` writes a new record and pushes onto the registry's history array. There is no
 * code path here that edits, deletes, or replaces an earlier record, and none that retries. A
 * revert — `CooldownActive`, `AssessmentExpired`, `StaleAssessment`, anything — is returned as a
 * decoded `PostResult` and published as such. Retrying a refused write until it lands is how a
 * demo starts lying about what the contract permits.
 */
async function postDecisionOnChain(
  canonical: Decision,
  canonicalSummary: DecisionSummary,
  scenario: ScenarioBOnDisk,
  swapWindow: SwapWindowFixture,
  officialEvidencePassed: boolean,
  target: ResolvedTarget,
): Promise<{ record: ChainPostRecord; assessorKey: `0x${string}` }> {
  // The canonical decision's pool id is the chain-196 pool the replay was measured against.
  // `remapAssetForChain` (inside `signAndPostDecision`) substitutes the deployed mock for the
  // canonical ASSET and deliberately leaves the pool id alone, so this is the key the record
  // lands under. The client config must name that same key or the post-write read-back looks
  // in the wrong place. Recorded in the artifact beside the demo pool id so the difference is
  // visible rather than buried.
  const postedUnderPoolId = canonical.assessment.poolId;
  const { clients, assessorKey } = buildClients(target, postedUnderPoolId);

  const envelopeReadFromChain = await readEnvelopeFromChain(clients);
  const chainNow = await chainNowSeconds(clients);

  // The frozen scenario is anchored on 2026-08-17. Its signed assessment expired days ago, so
  // the registry would reject it on `AssessmentExpired` before evaluating anything this study is
  // about. Shift the entire scenario — claims, anchor, swap window — by one constant so the
  // replay ends at chain time. Same mechanism `runSceneA` uses, and same guard: the shift must
  // be presentational, and if it is not, the run refuses rather than reporting the shift's
  // answer as the scenario's.
  const timeShiftSeconds = chainNow - blockToUnixSeconds(swapWindow.toBlock);
  const shiftedScenario = timeShiftScenario(scenario, timeShiftSeconds) as ScenarioBOnDisk;
  const shiftedWindow = timeShiftSwapWindow(swapWindow, timeShiftSeconds);

  const shifted = runScenario(shiftedScenario, shiftedWindow, {
    chainId: target.chainId,
    registryAddress: target.registry,
    officialEvidencePassed,
  });
  const shiftedSummary = summarize(shifted);
  const shiftPreservedOutcome = sameOutcome(canonicalSummary, shiftedSummary);

  const base: ChainPostRecord = {
    chainId: target.chainId,
    networkLabel: target.networkLabel,
    registryAddress: target.registry,
    postedUnderPoolId,
    deployedStackPoolId: target.poolId,
    assessorAddress: clients.config.accounts.assessor.address,
    posterAddress: clients.config.accounts.poster.address,
    envelopeReadFromChain,
    timeShiftSeconds,
    shiftPreservedOutcome,
    shiftedDecision: shiftedSummary,
    post: null,
    refusedReason: null,
  };

  if (!shiftPreservedOutcome) {
    return {
      record: {
        ...base,
        refusedReason:
          `The time shift changed the verdict (${canonicalSummary.state} -> ` +
          `${shiftedSummary.state}). Nothing was sent. Posting would have published the ` +
          `shift's answer under the scenario's name.`,
      },
      assessorKey,
    };
  }

  if (!shifted.postable) {
    return {
      record: {
        ...base,
        refusedReason:
          "The decision is not postable: the asset or pool did not resolve. That is the " +
          "fail-closed behaviour working, not a transport problem. Nothing was sent.",
      },
      assessorKey,
    };
  }

  // `signAndPostDecision` refuses to read a signing key implicitly, which is the right default:
  // a module that reaches into the environment for a private key on its own is a module that can
  // sign something nobody asked it to. So the key is handed over explicitly, here, at the last
  // moment before the one signature this run produces.
  setAssessorKey(assessorKey);

  // One attempt. No retry, no force, no second signature.
  const { post } = await signAndPostDecision(clients, shifted);
  return { record: { ...base, post }, assessorKey };
}

// ---------------------------------------------------------------------------
// Limitations
// ---------------------------------------------------------------------------

/**
 * What this artifact does NOT establish.
 *
 * Written as a function rather than a constant because two of the entries only apply to a run
 * that posted. An artifact whose limitations list describes a chain write that never happened is
 * as misleading as one that omits a limitation that does apply.
 */
function buildLimitations(posted: boolean, outcomeChanged: boolean): string[] {
  const limitations = [
    "Three live LLM calls are not deterministic. Re-running this script can produce a " +
      "different set of parses, therefore a different agreement report, therefore a different " +
      "officialEvidencePassed value, therefore possibly a different state. This artifact " +
      "records one run; it is not a claim about what the model always does.",
    "This computes officialEvidencePassed for scenario B ONLY. Every other published scenario, " +
      "and every published demo manifest, still takes that boolean as an assumed input " +
      "defaulting to true. Nothing here retroactively changes those results.",
    "The market leg in this run is the CANONICAL chain-196 replay from " +
      "pool-scenario-b-swaps.json, not the constructed price path that Scene B uses to " +
      "demonstrate a PROTECT. On the canonical replay the market leg is NOT_CONFIRMED, so WATCH " +
      "is the pre-registered correct outcome (see the scenario file's " +
      "preRegisteredExpectation.ifMarketConfirmationFails). WATCH here is the run working.",
    "A single run measures nothing about parse accuracy and nothing about latency. Accuracy " +
      "belongs to the p2.1 study and its 30-filing sample; this is one document, once.",
    "Only the OFFICIAL claim's document (claim-b-001) is parsed. The scenario's other claims, " +
      "including the Exhibit 99.1 press release in the same accession, are not re-parsed here, " +
      "so this bit speaks to the origin filing rather than to the whole evidence set.",
  ];

  if (!outcomeChanged) {
    limitations.push(
      "Computing the bit did not change scenario B's outcome in this run. That is a real " +
        "finding and it is published as one, but it also means this run does not demonstrate " +
        "that the bonded path can change a verdict — only that the engine was fed a computed " +
        "value instead of an assumed one.",
    );
  }

  if (posted) {
    limitations.push(
      "To be postable at all, the frozen scenario was shifted forward by one constant so its " +
        "replay window ends at chain time; an assessment anchored in the past is rejected by " +
        "the registry on AssessmentExpired. The shift was asserted to leave the state and the " +
        "reason codes unchanged. The on-chain record therefore carries shifted timestamps and " +
        "must never be read as evidence about when the filing landed.",
      "The record was written under the CANONICAL chain-196 pool id, which is not the pool id " +
        "the deployed TinjauFeeHook serves. The assessment is genuinely on chain and genuinely " +
        "signed, but no swap on the builder-controlled testnet pool reads it. This run " +
        "demonstrates the assessment path, not fee enforcement.",
      "The testnet asset is a freely-mintable MOCK standing in for canonical wNVDAx, in a " +
        "BUILDER-CONTROLLED pool that is not a market. The assessor key is derived from the " +
        "poster key unless TINJAU_ASSESSOR_PRIVATE_KEY is set, which is a testnet arrangement " +
        "and not a production one.",
    );
  }

  return limitations;
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

const HELP = `
S2.1 — scenario B with the bonded parse bit computed, not assumed.

  npx tsx src/studies/scenarioBBondedLive.ts [--post] [--out <path>] [--model <id>]

  (no flags)      Read the sha256-pinned 8-K from disk, strip it, run three live parses,
                  compute officialEvidencePassed from the agreement report, re-run scenario B
                  through the unchanged decision engine, write the artifact. NO chain write.
  --post          Additionally sign and relay ONE new assessment to the live X Layer Testnet
                  registry (chain 1952). Appends; never rewrites. Requires POSTER_PRIVATE_KEY.
  --out <path>    Artifact destination.
                  Default: docs/buildx-orion-2026/outputs/05-build/data/s2_1_scenario_b_bonded_live.json
  --model <id>    Override the pinned model id (default ${PINNED_GEMINI_MODEL}). Recorded in the
                  artifact, along with any ambient GEMINI_MODEL that was overridden.
  --help          This text. Exits before any file read, LLM call or network call.

Environment:
  GEMINI_API_KEY               required (or GOOGLE_GENERATIVE_AI_API_KEY / GOOGLE_API_KEY)
  POSTER_PRIVATE_KEY           required for --post only
  TINJAU_ASSESSOR_PRIVATE_KEY  optional; otherwise derived from POSTER_PRIVATE_KEY
  TINJAU_RPC_URL               optional override of the published RPC
  TINJAU_REGISTRY              optional override of the published registry address

The expected canonical outcome is WATCH. That is a success.
`.trimStart();

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }

  const shouldPost = args.includes("--post");
  const outPath = getArgValue(args, "--out") ?? DEFAULT_OUT_PATH;

  // ---- 1. Pin the model BEFORE anything can read it ------------------------------------
  //
  // Captured first, then overwritten. `parseFilingThreeWays` falls back to `getLanguageModel()`
  // internally when no model is supplied, and that reads `GEMINI_MODEL` — so setting the
  // variable is what makes the pin hold on every path, not just the one this file takes.
  const ambientGeminiModelEnv = process.env.GEMINI_MODEL?.trim() || null;
  const resolvedModelId = getArgValue(args, "--model")?.trim() || PINNED_GEMINI_MODEL;
  process.env.GEMINI_MODEL = resolvedModelId;
  const ambientGeminiModelOverridden =
    ambientGeminiModelEnv !== null && ambientGeminiModelEnv !== resolvedModelId;

  console.log(`[s2.1] model: ${resolvedModelId}`);
  if (ambientGeminiModelOverridden) {
    console.log(
      `[s2.1] ambient GEMINI_MODEL was "${ambientGeminiModelEnv}" and was overridden for this ` +
        `run. Both values are recorded in the artifact.`,
    );
  }

  // ---- 2. Load the frozen scenario and its pinned document ------------------------------
  const scenario = readJson<ScenarioBOnDisk>(SCENARIO_PATH);
  const claim = scenario.claims.find((c) => c.claimId === OFFICIAL_CLAIM_ID);
  if (!claim) {
    throw new Error(
      `${SCENARIO_PATH} has no claim "${OFFICIAL_CLAIM_ID}". The scenario changed shape; this ` +
        `script will not guess which claim carries the OFFICIAL evidence.`,
    );
  }
  if (!claim.sourceLocalPath || !claim.sourceContentSha256 || !claim.accessionNumber) {
    throw new Error(
      `Claim "${OFFICIAL_CLAIM_ID}" is missing sourceLocalPath, sourceContentSha256 or ` +
        `accessionNumber. Without all three the parse cannot be pinned to the frozen evidence.`,
    );
  }

  const documentPath = join(SCENARIOS_DIR, claim.sourceLocalPath);
  const rawBytes = readFileSync(documentPath);
  const documentSha256 = createHash("sha256").update(rawBytes).digest("hex");

  // ---- 3. Verify the document BEFORE spending an LLM call -------------------------------
  //
  // A mismatch means the bytes on disk are not the bytes the scenario was frozen against, and a
  // parse of the wrong bytes is worse than no parse: it would be published under the scenario's
  // name. Exits before the model is ever constructed, so a mismatch costs nothing.
  if (documentSha256 !== claim.sourceContentSha256) {
    console.error(
      `[s2.1] DOCUMENT HASH MISMATCH — refusing to parse.\n` +
        `  file:     ${documentPath}\n` +
        `  expected: ${claim.sourceContentSha256}  (${OFFICIAL_CLAIM_ID}.sourceContentSha256)\n` +
        `  actual:   ${documentSha256}\n` +
        `No LLM call was made. The local copy is not the frozen evidence; do not re-fetch it ` +
        `from EDGAR, because the network copy may have been amended since the scenario froze.`,
    );
    process.exit(1);
  }
  console.log(`[s2.1] document verified: ${documentSha256} (${rawBytes.length} bytes)`);

  // ---- 4. Strip and parse three ways, for real -------------------------------------------
  const stripped = stripFilingHtml(rawBytes.toString("utf8"));
  const ctx: FilingParseContext = {
    ticker: scenario.asset.ticker,
    form: claim.secForm ?? "8-K",
    filingDate: claim.reportDate ?? scenario.decisionAnchor.at.slice(0, 10),
    accessionNumber: claim.accessionNumber,
  };

  console.log(
    `[s2.1] stripped to ${stripped.strippedLength} chars (~${stripped.estimatedTokens} tokens); ` +
      `running three independent parses...`,
  );
  // The model instance is built once and passed in, so all three attempts provably use the same
  // pinned id rather than each re-resolving it from an environment another process could edit.
  const model = getLanguageModel();
  const attempts = await parseFilingThreeWays(stripped.text, ctx, { model });
  const agreement = buildAgreementReport(attempts);

  // ---- 5. The bit, computed -------------------------------------------------------------
  //
  // `readyToPost` is true only when all three parses succeeded AND both key fields (eventType,
  // affectedToken) agree. That is exactly the bonded parse-agreement condition the decision
  // engine has been assuming; nothing is reinterpreted here, the existing report's own verdict
  // is passed straight through.
  const officialEvidencePassed = agreement.readyToPost;
  console.log(
    `[s2.1] parses ok: ${agreement.successfulParseCount}/${agreement.totalAttempts}  ` +
      `readyToPost: ${officialEvidencePassed}` +
      (agreement.flagReasons.length ? `  flags: ${agreement.flagReasons.join(", ")}` : ""),
  );

  // ---- 6. Re-run the UNCHANGED decision engine, both ways --------------------------------
  const swapWindow = readJson<SwapWindowFixture>(SWAP_FIXTURE_PATH);

  // `chainId` and `registryAddress` are supplied even without `--post`. The EIP-712 domain is
  // part of the decision, and an artifact whose digest was bound to a placeholder registry would
  // not be the same assessment the posting path produces.
  const target = resolveTarget();
  const runOptions = { chainId: target.chainId, registryAddress: target.registry };

  const decision = runScenario(scenario, swapWindow, { ...runOptions, officialEvidencePassed });
  const computedSummary = summarize(decision);

  // The old assumption, re-run side by side. When the computed bit is already true these two are
  // the same run and `outcomeChanged` is false — which is the honest answer, not a null result.
  const assumedTrue = runScenario(scenario, swapWindow, {
    ...runOptions,
    officialEvidencePassed: true,
  });
  const assumedSummary = summarize(assumedTrue);
  const outcomeChanged = !sameOutcome(computedSummary, assumedSummary);

  console.log(
    `[s2.1] state: ${computedSummary.state}  (assumed-true run: ${assumedSummary.state})  ` +
      `outcomeChanged: ${outcomeChanged}`,
  );
  console.log(`[s2.1] reason codes: ${computedSummary.reasonCodes.join(", ") || "(none)"}`);

  // ---- 7. Optional chain write ------------------------------------------------------------
  let chainPost: ChainPostRecord | null = null;
  let derivedAssessorKey: string | null = null;
  if (shouldPost) {
    console.log(`[s2.1] --post: signing and relaying ONE new assessment to ${target.registry}`);
    const posted = await postDecisionOnChain(
      decision,
      computedSummary,
      scenario,
      swapWindow,
      officialEvidencePassed,
      target,
    );
    chainPost = posted.record;
    derivedAssessorKey = posted.assessorKey;
  }

  // ---- 8. Write the artifact --------------------------------------------------------------
  const artifact: BondedLiveArtifact = {
    schemaVersion: SCHEMA_VERSION,
    producedBy: PRODUCED_BY,
    runAtUtc: new Date().toISOString(),

    scenarioId: scenario.scenarioId,
    accessionNumber: claim.accessionNumber,
    documentSha256,
    documentLocalPath: `apps/server/scenarios/${claim.sourceLocalPath}`,
    documentBytes: rawBytes.length,
    strippedTextLength: stripped.strippedLength,

    geminiModel: getGeminiModelId(),
    ambientGeminiModelEnv,
    ambientGeminiModelOverridden,

    attempts,
    agreement,

    officialEvidencePassed,
    officialEvidencePassedSource: "computed",

    decision,
    comparison: {
      computed: { ...computedSummary, officialEvidencePassed },
      assumedTrue: { ...assumedSummary, officialEvidencePassed: true },
      outcomeChanged,
    },

    chainPost,
    limitations: buildLimitations(shouldPost, outcomeChanged),
  };

  const serialized = `${JSON.stringify(artifact, bigintSafe, 2)}\n`;
  assertNoSecretsInSerialized(serialized, derivedAssessorKey ? [derivedAssessorKey] : []);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, serialized, "utf8");
  console.log(`[s2.1] artifact: ${outPath}`);

  // ---- 9. Report the chain result last, so it is the last thing on screen -----------------
  if (chainPost) {
    if (chainPost.refusedReason) {
      console.error(`\n[s2.1] POST REFUSED: ${chainPost.refusedReason}`);
      process.exit(1);
    }
    if (chainPost.post?.ok && chainPost.post.txHash) {
      console.log(`\n[s2.1] POSTED  tx: ${chainPost.post.txHash}`);
      console.log(
        `[s2.1] block ${chainPost.post.blockNumber}  state ` +
          `${chainPost.post.assessmentPosted?.state ?? "(event not decoded)"}  ` +
          `registry ${chainPost.registryAddress}  chain ${chainPost.chainId}`,
      );
    } else {
      const failure = chainPost.post?.failure;
      console.error(
        `\n[s2.1] POST FAILED: ${failure?.errorName ?? "unknown"}` +
          (failure?.args?.length ? ` (${failure.args.join(", ")})` : ""),
      );
      console.error(
        `[s2.1] The decoded failure is recorded in the artifact. Not retried and not forced — ` +
          `a refused write is a result this record has to be able to state.`,
      );
      process.exit(1);
    }
  }
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  main().catch((err) => {
    // Message only. Every error path in the modules this touches is written to name environment
    // VARIABLES rather than values, and a stack trace could carry an argument that is not.
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
