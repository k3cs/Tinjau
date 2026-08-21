/**
 * S2.2 — Scenario A's evidence graph, derived by the MODEL as well as by the heuristics, and
 * published where the two disagree.
 *
 * ---------------------------------------------------------------------------------------
 * WHAT THIS EXISTS TO SHOW, AND WHAT IT DELIBERATELY DOES NOT.
 *
 * `apps/server/src/evidence/` derives the evidence graph with heuristics: `resolveAsset` maps a
 * company/symbol/address triple onto a supported pool, `deriveIndependence` reads attribution
 * phrases and collapses syndications into an origin, `detectSelfRevision` looks for one source
 * line stating two figures, and `buildEvidenceGraph` assembles the lot. Those are regular
 * expressions and table lookups. The site labels the capability "AI Evidence Graph", and until
 * this file existed no model had ever been asked the same questions on the same input.
 *
 * So this asks it. Once. On one scenario. And then publishes a per-edge table of where the two
 * answers coincide and where they do not.
 *
 * THE DISAGREEMENTS ARE THE PRODUCT. Nothing here adjudicates them. The model is not treated as
 * ground truth for the heuristic, and the heuristic is not treated as ground truth for the
 * model. No heuristic is patched to match the model, and no model output is post-processed to
 * match the heuristic. If you find yourself reading this file looking for the place where the
 * two are reconciled, there isn't one, and its absence is the whole point.
 *
 * THE DECIDER DOES NOT CHANGE. `runScenario` is called once at the end, on the unchanged
 * scenario, through the unchanged decision engine, and its verdict is recorded for reference.
 * The model's output is NOT an input to it and cannot be: nothing in this file is wired into
 * `decision/`, `risk/`, or any scenario file. Scenario A's published state is WATCH before this
 * script runs and WATCH after, and the artifact records that so a reader can check rather than
 * take it on trust.
 *
 * ---------------------------------------------------------------------------------------
 * WHAT EACH SIDE IS SHOWN, AND THE ONE PLACE THAT IS NOT SYMMETRIC.
 *
 * Both sides are given exactly the same claim fields: claimId, sourceClass, sourceId,
 * publisherOrAuthor, publishedAt, company, tokenSymbol, tokenAddress, eventType, and the
 * verbatim `claimTextOrPointer`.
 *
 * The model is NOT shown `independenceGroup`, `relation`, or `duplicateOf`. Those are the frozen
 * scenario's HAND LABELS — they are the answer written down by a human in T0.2. Showing them to
 * the model would turn this study into a reading-comprehension test of the fixture, and the
 * agreement number would mean nothing. `deriveIndependence` does not read them for its
 * derivation either (it only compares against them afterwards), so withholding them keeps the
 * two sides answering the same question from the same evidence.
 *
 * THE ASYMMETRY, STATED PLAINLY: on the CONTRADICTION axis the heuristic is partly reading a
 * hand label. `buildEvidenceGraph`'s `CONTRADICTION_DECLARED` factor fires on
 * `relation === "CONTRADICTS"`, which a human typed. Only `detectSelfRevision` is derived from
 * text. The model gets no such label. That axis is therefore not a like-for-like comparison, it
 * is recorded as one of the limitations, and no conclusion about "the model missed a
 * contradiction" may be drawn from it.
 *
 * A SECOND ASYMMETRY, ALSO STATED: claim-a-001's `claimTextOrPointer` is a POINTER
 * ("sources/simulated-rumor-2026-07-27-social.json#claimText"), not prose. `normalizeClaim`
 * stores it verbatim, so the heuristic never reads the rumour's language. To keep the sides
 * even, neither does the model — it is shown the same pointer string. Both sides are therefore
 * blind to that one claim's wording, which is a property of the frozen fixture rather than of
 * either method.
 *
 * ---------------------------------------------------------------------------------------
 * INTEGRITY, BEFORE ANY TOKEN IS SPENT.
 *
 * S2.1 verified its 8-K against `claim-b-001.sourceContentSha256` before constructing a model.
 * Scenario A cannot do the same, because SCENARIO A PINS NO DOCUMENT HASHES AT ALL — none of its
 * five claims carries `sourceContentSha256`, and only one references a local file. That is a
 * real gap in the fixture, and papering over it with a check that always passes would be worse
 * than having none.
 *
 * So two checks run instead, and the artifact says which is which:
 *
 *   1. The SCENARIO FILE itself is hashed and compared against `PINNED_SCENARIO_SHA256` below.
 *      This is a pin declared by THIS FILE at authoring time, not an independently frozen one;
 *      it exists so that an edit to the frozen scenario breaks this study loudly instead of
 *      silently changing what was compared. A mismatch exits before the model is constructed.
 *   2. Every claim that references a local source document has that document hashed. Where the
 *      claim carries `sourceContentSha256` the two are compared and a mismatch aborts. Where it
 *      does not, the observed hash is recorded and the claim is marked UNPINNED — recorded as a
 *      fact about the fixture, never reported as a pass.
 *
 * ---------------------------------------------------------------------------------------
 * MODEL PINNING. `getGeminiModelId()` reads `GEMINI_MODEL`, which `provider.ts` documents as an
 * escape hatch for quota exhaustion rather than a second default. This machine exports
 * `gemini-3.5-flash` ambiently. An artifact collected under whatever a shell happened to export
 * is comparable to nothing, so the id is resolved here, defaulting to the project's pinned
 * value regardless of the environment, and BOTH the id used and the ambient value overridden are
 * recorded.
 *
 * ---------------------------------------------------------------------------------------
 * CLI
 *
 *   npx tsx src/studies/scenarioAGraphLive.ts
 *       Verify hashes, run the heuristics, make ONE live model call, build the agreement table,
 *       write the artifact. No chain is touched by any code path in this file.
 *
 *   npx tsx src/studies/scenarioAGraphLive.ts --dry-run
 *       Everything except the model call and the write. Spends no tokens and produces no file.
 *       Use it to check the heuristic side and the integrity gates on their own.
 *
 *   --out <path>    Artifact destination. Defaults to the S2.2 data path below.
 *   --model <id>    Overrides the pinned model id. Recorded in the artifact.
 *   --help          Prints this and exits before any file read or LLM call.
 *
 * SECRETS. No key is printed, logged, or written. Error messages name environment VARIABLES,
 * never values. Before the artifact is written it is scanned against the actual secret values
 * present in `process.env` and the write is refused if any of them appears — by value, not by
 * shape, because the artifact legitimately contains 64-hex document digests.
 * ---------------------------------------------------------------------------------------
 */

import "dotenv/config";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateObject } from "ai";
import { z } from "zod";

import { normalizeClaims, type NormalizedClaim, type RawClaimInput } from "../evidence/normalize.js";
import {
  buildEvidenceGraph,
  deriveIndependence,
  detectSelfRevision,
  type EvidenceGraph,
  type IndependenceFinding,
  type SelfRevisionFinding,
} from "../evidence/graph.js";
import { resolveAsset, type Resolution } from "../evidence/assets.js";
import {
  buildClusters,
  proposeClustersDeterministically,
  type ClusteringResult,
} from "../evidence/cluster.js";
import { getGeminiModelId, getLanguageModel } from "../llm/provider.js";
import { runScenario, type FrozenScenario } from "../decision/scenarioRunner.js";
import { FROZEN_PROMOTION_CONFIG } from "../risk/promotionConfig.js";
import { blockToUnixSeconds, type SwapWindowFixture } from "../market/poolTelemetry.js";
import type { ReasonCode } from "../risk/types.js";

// ---------------------------------------------------------------------------
// Paths and constants
// ---------------------------------------------------------------------------

const here = dirname(fileURLToPath(import.meta.url));
// apps/server/src/studies -> apps/server -> repo root.
const serverRoot = join(here, "..", "..");
const repoRoot = join(serverRoot, "..", "..");

const SCENARIOS_DIR = join(serverRoot, "scenarios");
const SCENARIO_PATH = join(SCENARIOS_DIR, "scenario-a-rumor-watch.json");
const SWAP_FIXTURE_PATH = join(
  serverRoot,
  "src",
  "market",
  "fixtures",
  "pool-scenario-a-swaps.json",
);
const DEFAULT_OUT_PATH = join(
  repoRoot,
  "docs",
  "buildx-orion-2026",
  "outputs",
  "05-build",
  "data",
  "s2_2_scenario_a_graph_live.json",
);

/**
 * The project's pinned model id, restated here rather than imported.
 *
 * `provider.ts` keeps its default private and exposes only `getGeminiModelId()`, which already
 * consults `GEMINI_MODEL` — so reading it back would give whatever the shell exported, which is
 * the exact thing this study must not inherit. Same reasoning, same constant, as S2.1.
 */
const PINNED_GEMINI_MODEL = "gemini-3.6-flash";

/**
 * sha256 of `scenarios/scenario-a-rumor-watch.json` as this study was written against it.
 *
 * NOT an independently frozen pin — the scenario file carries no self-hash, and T0.2 did not
 * publish one. It was computed from the file on disk on 2026-08-21 and written here so that a
 * later edit to the frozen scenario makes this study fail loudly rather than quietly comparing
 * two methods on different evidence. If it trips, read the diff and update this constant
 * deliberately; do not delete the check.
 */
const PINNED_SCENARIO_SHA256 =
  "a69691da55a84968c9076b6f71d6dd64fbca2a647e8a03785dd3598d2f03fc22";

const SCHEMA_VERSION = "tinjau.scenario-a-graph-live/1.0.0";
const PRODUCED_BY = "apps/server/src/studies/scenarioAGraphLive.ts";

// ---------------------------------------------------------------------------
// The scenario as it is on disk
// ---------------------------------------------------------------------------

/**
 * `FrozenScenario` is the subset `runScenario` reads and `RawClaimInput` the subset the
 * normaliser reads. Neither carries `duplicateOf` or `sourceLocalPath`, which this script needs
 * for the integrity pass and for reporting the hand labels. Widened here rather than by editing
 * the shared types, which are correct for their own consumers.
 */
type ScenarioClaimOnDisk = RawClaimInput & {
  duplicateOf?: string;
  sourceLocalPath?: string;
};

interface ScenarioAOnDisk extends Omit<FrozenScenario, "asset" | "claims"> {
  asset: FrozenScenario["asset"] & { ticker: string };
  claims: ScenarioClaimOnDisk[];
}

// ---------------------------------------------------------------------------
// The model's answer shape
// ---------------------------------------------------------------------------

/**
 * Graph structure ONLY. No state, no severity, no confidence, no recommendation.
 *
 * The model is asked three questions and permitted to answer nothing else. A Zod schema through
 * `generateObject` makes that structural rather than a request the model may decline — the same
 * discipline `llm/parseFiling.ts` applies to `BondedFilingFieldsSchema`, for the same reason:
 * best-effort JSON that has to be repaired downstream is a place for a silent fix to hide.
 *
 * `originClaimId` is nullable because an origin genuinely may not be in the claim set. Forcing a
 * string there would make the model nominate a member as the origin whether or not it believed
 * it, which is the failure mode a "structurally guaranteed" schema is supposed to prevent.
 */
const GraphStructureSchema = z.object({
  entityGroups: z
    .array(
      z.object({
        entityLabel: z
          .string()
          .describe('The company or asset these claims are about, e.g. "NVIDIA CORPORATION / wNVDAx"'),
        claimIds: z.array(z.string()).describe("Claim ids that refer to this same entity"),
      }),
    )
    .describe(
      "Partition of the claims by the ENTITY each one is about. Every claim id must appear in " +
        "exactly one group.",
    ),
  syndicationGroups: z
    .array(
      z.object({
        originLabel: z
          .string()
          .describe('The single reporting origin this group traces back to, e.g. "The Wall Street Journal, 2026-07-26"'),
        originClaimId: z
          .string()
          .nullable()
          .describe(
            "The claim id that IS the origin, or null when the origin is not present in this claim set",
          ),
        claimIds: z
          .array(z.string())
          .describe("Every claim id in this group, including the origin claim when it is present"),
        basis: z.string().describe("The wording in the claims that led you to group them"),
      }),
    )
    .describe(
      "Partition of the claims by REPORTING ORIGIN. Claims that merely repeat one other " +
        "outlet's report belong in that outlet's group. A group with one member means that " +
        "claim is its own independent origin. Every claim id must appear in exactly one group.",
    ),
  contradictions: z
    .array(
      z.object({
        claimIdA: z.string(),
        claimIdB: z.string(),
        basis: z.string().describe("What the two claims state that cannot both be true"),
      }),
    )
    .describe(
      "Pairs of claims that directly contradict each other. Empty array if none do. Two claims " +
        "describing different aspects of one event do NOT contradict each other.",
    ),
});

type GraphStructure = z.infer<typeof GraphStructureSchema>;

// ---------------------------------------------------------------------------
// Artifact types
// ---------------------------------------------------------------------------

type IntegrityStatus = "VERIFIED" | "UNPINNED" | "MISSING_FILE";

interface DocumentIntegrityRow {
  claimId: string;
  localPath: string;
  observedSha256: string | null;
  pinnedSha256: string | null;
  status: IntegrityStatus;
}

/** Exactly the fields both sides were shown. Published so the input is checkable. */
interface PresentedClaim {
  claimId: string;
  sourceClass: string;
  sourceId: string;
  publisherOrAuthor: string | null;
  publishedAt: string;
  company: string;
  tokenSymbol: string;
  tokenAddress: string | null;
  eventType: string;
  claimTextOrPointer: string;
}

/** The hand labels. Withheld from the model, published here so a reader can see them. */
interface HandLabel {
  claimId: string;
  independenceGroup: string;
  relation: string;
  duplicateOf: string | null;
}

interface EntityResolutionRow {
  claimId: string;
  outcome: Resolution["outcome"];
  resolvedTokenAddress: string | null;
  entityKey: string;
  explanation: string;
}

type AgreementVerdict = "AGREE" | "DISAGREE" | "MODEL_SILENT";

interface EdgeComparison<T> {
  heuristic: T;
  model: T | null;
  verdict: AgreementVerdict;
  heuristicBasis: string;
  modelBasis: string | null;
}

interface PairEdge {
  claimIdA: string;
  claimIdB: string;
  entitySame: EdgeComparison<boolean>;
  syndicationSameOrigin: EdgeComparison<boolean>;
  contradicts: EdgeComparison<boolean>;
}

interface CategoryCounts {
  totalPairs: number;
  agree: number;
  disagree: number;
  modelSilent: number;
  disagreeingPairs: string[];
}

interface GraphLiveArtifact {
  schemaVersion: string;
  producedBy: string;
  runAtUtc: string;

  scenarioId: string;
  scenarioFilePath: string;
  scenarioFileSha256: string;
  scenarioFilePinnedSha256: string;
  documentIntegrity: {
    note: string;
    pinnedClaimCount: number;
    rows: DocumentIntegrityRow[];
  };

  geminiModel: string;
  ambientGeminiModelEnv: string | null;
  ambientGeminiModelOverridden: boolean;

  presentedClaims: PresentedClaim[];
  handLabelsWithheldFromModel: HandLabel[];
  prompt: string;
  promptSha256: string;

  heuristic: {
    entityResolutions: EntityResolutionRow[];
    independence: IndependenceFinding[];
    selfRevision: SelfRevisionFinding[];
    evidenceGraph: EvidenceGraph;
    deterministicClustering: ClusteringResult;
  };

  model: {
    rawOutput: GraphStructure;
    unknownClaimIdsNamed: string[];
    claimIdsNotPlacedInAnyEntityGroup: string[];
    claimIdsNotPlacedInAnySyndicationGroup: string[];
    claimIdsPlacedInMoreThanOneEntityGroup: string[];
    claimIdsPlacedInMoreThanOneSyndicationGroup: string[];
  };

  edges: PairEdge[];
  counts: {
    entity: CategoryCounts;
    syndication: CategoryCounts;
    contradiction: CategoryCounts;
  };

  deterministicDecision: {
    state: string;
    reasonCodes: ReasonCode[];
    note: string;
  };

  limitations: string[];
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function getArgValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : undefined;
}

function sha256Hex(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

/** `bigint` renders as a decimal string rather than throwing. Same treatment S2.1 gives its artifact. */
function bigintSafe(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

/**
 * Refuses to write anything containing a live secret.
 *
 * Scans BY VALUE against what is actually in the environment, not by hex shape. A shape-based
 * scan is useless here: this artifact legitimately contains 64-hex document digests, so it would
 * either flag every honest run or be tuned until it flagged nothing. The failure message names
 * the variable and never the value.
 */
function assertNoSecretsInSerialized(serialized: string): void {
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
    // Eight characters is short enough to catch any real credential and long enough that a stray
    // one-character variable cannot match half the file and produce a false refusal.
    if (!value || value.length < 8) continue;
    for (const candidate of variants(value)) {
      if (haystack.includes(candidate.toLowerCase())) {
        throw new Error(
          `Refusing to write the artifact: it contains the value of ${name}. Nothing was ` +
            `written. This is a bug in this script, not in your environment.`,
        );
      }
    }
  }
}

function pairKey(a: string, b: string): string {
  return `${a}::${b}`;
}

// ---------------------------------------------------------------------------
// Integrity
// ---------------------------------------------------------------------------

/**
 * Hashes every local source document scenario A references, and compares where a pin exists.
 *
 * Two ways a claim points at a local file: `sourceLocalPath` (the shape scenarios B and D use)
 * and a `claimTextOrPointer` of the form `sources/<file>#<field>` (the shape scenario A's
 * simulated rumour uses). Both are followed. A claim that references no local file is simply
 * absent from the table rather than appearing as a vacuous pass.
 */
function checkDocumentIntegrity(scenario: ScenarioAOnDisk): DocumentIntegrityRow[] {
  const rows: DocumentIntegrityRow[] = [];

  for (const claim of scenario.claims) {
    const pointer = claim.claimTextOrPointer ?? "";
    const relative =
      claim.sourceLocalPath ??
      (pointer.startsWith("sources/") ? pointer.split("#")[0] : undefined);
    if (!relative) continue;

    const absolute = join(SCENARIOS_DIR, relative);
    if (!existsSync(absolute)) {
      rows.push({
        claimId: claim.claimId,
        localPath: `apps/server/scenarios/${relative}`,
        observedSha256: null,
        pinnedSha256: claim.sourceContentSha256 ?? null,
        status: "MISSING_FILE",
      });
      continue;
    }

    const observed = sha256Hex(readFileSync(absolute));
    const pinned = claim.sourceContentSha256 ?? null;
    rows.push({
      claimId: claim.claimId,
      localPath: `apps/server/scenarios/${relative}`,
      observedSha256: observed,
      pinnedSha256: pinned,
      // UNPINNED is not a pass. It records that the fixture never committed to a hash for this
      // document, so nothing about it was actually verified.
      status: pinned === null ? "UNPINNED" : observed === pinned ? "VERIFIED" : "MISSING_FILE",
    });

    if (pinned !== null && observed !== pinned) {
      throw new Error(
        `DOCUMENT HASH MISMATCH — refusing to run.\n` +
          `  file:     apps/server/scenarios/${relative}\n` +
          `  expected: ${pinned}  (${claim.claimId}.sourceContentSha256)\n` +
          `  actual:   ${observed}\n` +
          `No LLM call was made. The bytes on disk are not the bytes the scenario was frozen ` +
          `against, and a comparison run on the wrong bytes would be published under the ` +
          `scenario's name.`,
      );
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Heuristic side
// ---------------------------------------------------------------------------

/**
 * The entity key `resolveAsset` effectively assigns a claim.
 *
 * When the claim resolves, its identity is the token address — the one unambiguous handle in
 * this system, per `assets.ts`. When it does not, the key is built from the refusal and the raw
 * hints, so two claims that failed to resolve for DIFFERENT reasons are never merged into one
 * entity just because both failed.
 */
function entityKeyFor(claim: NormalizedClaim, resolution: Resolution): string {
  if (resolution.outcome === "RESOLVED" && resolution.asset) {
    return `asset:${resolution.asset.tokenAddress.toLowerCase()}`;
  }
  return `${resolution.outcome}:${claim.company.trim().toUpperCase()}|${claim.tokenSymbol.trim().toUpperCase()}|${(claim.tokenAddress ?? "").toLowerCase()}`;
}

interface HeuristicSide {
  entityResolutions: EntityResolutionRow[];
  entityKeyById: Map<string, string>;
  independence: IndependenceFinding[];
  originKeyById: Map<string, IndependenceFinding>;
  selfRevision: SelfRevisionFinding[];
  revisedOriginKeys: Set<string>;
  contradictionRelationIds: Set<string>;
  evidenceGraph: EvidenceGraph;
  clustering: ClusteringResult;
}

function runHeuristics(claims: NormalizedClaim[], nowUnixSeconds: number): HeuristicSide {
  const entityResolutions: EntityResolutionRow[] = [];
  const entityKeyById = new Map<string, string>();

  for (const claim of claims) {
    const resolution = resolveAsset(claim.company, claim.tokenSymbol, claim.tokenAddress);
    const key = entityKeyFor(claim, resolution);
    entityKeyById.set(claim.claimId, key);
    entityResolutions.push({
      claimId: claim.claimId,
      outcome: resolution.outcome,
      resolvedTokenAddress: resolution.asset?.tokenAddress ?? null,
      entityKey: key,
      explanation: resolution.explanation,
    });
  }

  const independence = deriveIndependence(claims);
  const selfRevision = detectSelfRevision(claims, independence);

  return {
    entityResolutions,
    entityKeyById,
    independence,
    originKeyById: new Map(independence.map((f) => [f.claimId, f])),
    selfRevision,
    revisedOriginKeys: new Set(selfRevision.filter((s) => s.revised).map((s) => s.originKey)),
    contradictionRelationIds: new Set(
      claims.filter((c) => c.relation === "CONTRADICTS").map((c) => c.claimId),
    ),
    // The assembled graph is recorded whole. It is what the rest of the pipeline actually
    // consumes, and publishing only the three slices this study compares would let a reader
    // assume the slices are all there is.
    evidenceGraph: buildEvidenceGraph(
      claims,
      nowUnixSeconds,
      FROZEN_PROMOTION_CONFIG.evidenceWindowSec,
    ),
    // Recorded for completeness, not compared per-edge. `proposeClustersDeterministically`
    // groups by (company, eventType) and its own doc comment calls it a crude FALLBACK for when
    // no model is available — scoring a model against a stated fallback would be a rigged
    // comparison, so the entity axis uses `resolveAsset` instead and this is published beside it.
    clustering: buildClusters(claims, proposeClustersDeterministically(claims)),
  };
}

// ---------------------------------------------------------------------------
// The prompt
// ---------------------------------------------------------------------------

function buildPrompt(presented: PresentedClaim[]): string {
  return [
    `You are deriving the STRUCTURE of an evidence graph over a fixed set of claims about a ` +
      `tokenised equity. You are not assessing risk, severity, or truth, and you are not ` +
      `recommending any action. Answer only the three structural questions below.`,

    `1. ENTITY. Which claims refer to the same underlying entity (company and tokenised asset)? ` +
      `Partition every claim id into entity groups.`,

    `2. SYNDICATION ORIGIN. Which claims are syndicated copies of one origin's reporting? A ` +
      `claim that attributes its story to another outlet belongs in that outlet's group, not ` +
      `its own. A claim that is nobody's copy forms a group of one. Partition every claim id ` +
      `into origin groups, and name the origin claim id when the origin is itself one of the ` +
      `claims below.`,

    `3. CONTRADICTION. Which PAIRS of claims directly contradict each other — that is, state ` +
      `things that cannot both be true? Different aspects of the same event are not a ` +
      `contradiction. Return an empty array if there are none.`,

    `Use only the fields given. Do not use outside knowledge about these companies or these ` +
      `news stories. Every claimId you return must be one of the ids below, spelled exactly.`,

    `Note: one claim's "claimTextOrPointer" is a file pointer rather than prose. Treat it as ` +
      `the only text available for that claim; do not invent its contents.`,

    `--- CLAIMS START ---`,
    JSON.stringify(presented, null, 2),
    `--- CLAIMS END ---`,
  ].join("\n\n");
}

// ---------------------------------------------------------------------------
// Model side, read but never repaired
// ---------------------------------------------------------------------------

interface ModelSide {
  entityGroupById: Map<string, number>;
  syndicationGroupById: Map<string, number>;
  contradictionPairs: Set<string>;
  entityBasisById: Map<string, string>;
  syndicationBasisById: Map<string, string>;
  contradictionBasis: Map<string, string>;
  unknownClaimIdsNamed: string[];
  notInAnyEntityGroup: string[];
  notInAnySyndicationGroup: string[];
  inMoreThanOneEntityGroup: string[];
  inMoreThanOneSyndicationGroup: string[];
}

/**
 * Indexes the model's answer WITHOUT correcting it.
 *
 * A claim the model placed in two groups is recorded as placed in two groups; the first
 * placement is used for indexing and the duplication is published rather than resolved. A claim
 * it placed in none is recorded as unanswered and every edge touching it is scored
 * MODEL_SILENT, not "disagrees". An id it invented is recorded and ignored. None of these are
 * failures to hide: they are what a live structured-output call actually returned.
 */
function indexModelOutput(output: GraphStructure, knownIds: Set<string>): ModelSide {
  const unknown = new Set<string>();
  const entityGroupById = new Map<string, number>();
  const syndicationGroupById = new Map<string, number>();
  const entityBasisById = new Map<string, string>();
  const syndicationBasisById = new Map<string, string>();
  const inMoreThanOneEntityGroup: string[] = [];
  const inMoreThanOneSyndicationGroup: string[] = [];

  output.entityGroups.forEach((group, index) => {
    for (const id of group.claimIds) {
      if (!knownIds.has(id)) {
        unknown.add(id);
        continue;
      }
      if (entityGroupById.has(id)) {
        inMoreThanOneEntityGroup.push(id);
        continue;
      }
      entityGroupById.set(id, index);
      entityBasisById.set(id, group.entityLabel);
    }
  });

  output.syndicationGroups.forEach((group, index) => {
    for (const id of group.claimIds) {
      if (!knownIds.has(id)) {
        unknown.add(id);
        continue;
      }
      if (syndicationGroupById.has(id)) {
        inMoreThanOneSyndicationGroup.push(id);
        continue;
      }
      syndicationGroupById.set(id, index);
      syndicationBasisById.set(
        id,
        `origin "${group.originLabel}" (originClaimId ${group.originClaimId ?? "null"}): ${group.basis}`,
      );
    }
    if (group.originClaimId !== null && !knownIds.has(group.originClaimId)) {
      unknown.add(group.originClaimId);
    }
  });

  const contradictionPairs = new Set<string>();
  const contradictionBasis = new Map<string, string>();
  for (const pair of output.contradictions) {
    if (!knownIds.has(pair.claimIdA)) unknown.add(pair.claimIdA);
    if (!knownIds.has(pair.claimIdB)) unknown.add(pair.claimIdB);
    if (!knownIds.has(pair.claimIdA) || !knownIds.has(pair.claimIdB)) continue;
    const [a, b] = [pair.claimIdA, pair.claimIdB].sort();
    contradictionPairs.add(pairKey(a, b));
    contradictionBasis.set(pairKey(a, b), pair.basis);
  }

  return {
    entityGroupById,
    syndicationGroupById,
    contradictionPairs,
    entityBasisById,
    syndicationBasisById,
    contradictionBasis,
    unknownClaimIdsNamed: [...unknown].sort(),
    notInAnyEntityGroup: [...knownIds].filter((id) => !entityGroupById.has(id)).sort(),
    notInAnySyndicationGroup: [...knownIds].filter((id) => !syndicationGroupById.has(id)).sort(),
    inMoreThanOneEntityGroup: [...new Set(inMoreThanOneEntityGroup)].sort(),
    inMoreThanOneSyndicationGroup: [...new Set(inMoreThanOneSyndicationGroup)].sort(),
  };
}

// ---------------------------------------------------------------------------
// The per-edge table
// ---------------------------------------------------------------------------

function verdictFor(heuristic: boolean, model: boolean | null): AgreementVerdict {
  if (model === null) return "MODEL_SILENT";
  return heuristic === model ? "AGREE" : "DISAGREE";
}

function buildEdges(
  claims: NormalizedClaim[],
  heuristics: HeuristicSide,
  model: ModelSide,
): PairEdge[] {
  const edges: PairEdge[] = [];

  for (let i = 0; i < claims.length; i++) {
    for (let j = i + 1; j < claims.length; j++) {
      const a = claims[i];
      const b = claims[j];

      // ---- entity ------------------------------------------------------------------
      const keyA = heuristics.entityKeyById.get(a.claimId)!;
      const keyB = heuristics.entityKeyById.get(b.claimId)!;
      const hEntity = keyA === keyB;

      const mEntityA = model.entityGroupById.get(a.claimId);
      const mEntityB = model.entityGroupById.get(b.claimId);
      const mEntity =
        mEntityA === undefined || mEntityB === undefined ? null : mEntityA === mEntityB;

      // ---- syndication origin -------------------------------------------------------
      const findA = heuristics.originKeyById.get(a.claimId)!;
      const findB = heuristics.originKeyById.get(b.claimId)!;
      const hSynd = findA.derivedOriginKey === findB.derivedOriginKey;

      const mSyndA = model.syndicationGroupById.get(a.claimId);
      const mSyndB = model.syndicationGroupById.get(b.claimId);
      const mSynd = mSyndA === undefined || mSyndB === undefined ? null : mSyndA === mSyndB;

      // ---- contradiction ------------------------------------------------------------
      //
      // Two heuristic routes, both from `evidence/graph.ts`, combined with OR:
      //   - a declared CONTRADICTS relation on either claim, which is the input
      //     `buildEvidenceGraph`'s CONTRADICTION_DECLARED factor reads. It is a HAND LABEL;
      //   - both claims sitting in one derived origin that `detectSelfRevision` flagged as
      //     having stated two different figures, which is derived from text.
      // The hand-label half is why this axis is not like-for-like — see the limitations.
      const declared =
        heuristics.contradictionRelationIds.has(a.claimId) ||
        heuristics.contradictionRelationIds.has(b.claimId);
      const sharedRevisedOrigin =
        findA.derivedOriginKey === findB.derivedOriginKey &&
        heuristics.revisedOriginKeys.has(findA.derivedOriginKey);
      const hContra = declared || sharedRevisedOrigin;

      const [sa, sb] = [a.claimId, b.claimId].sort();
      const mContra = model.contradictionPairs.has(pairKey(sa, sb));

      edges.push({
        claimIdA: a.claimId,
        claimIdB: b.claimId,
        entitySame: {
          heuristic: hEntity,
          model: mEntity,
          verdict: verdictFor(hEntity, mEntity),
          heuristicBasis: `resolveAsset entity keys: "${keyA}" vs "${keyB}"`,
          modelBasis:
            mEntity === null
              ? null
              : `model entity labels: "${model.entityBasisById.get(a.claimId) ?? "(none)"}" vs ` +
                `"${model.entityBasisById.get(b.claimId) ?? "(none)"}"`,
        },
        syndicationSameOrigin: {
          heuristic: hSynd,
          model: mSynd,
          verdict: verdictFor(hSynd, mSynd),
          heuristicBasis:
            `deriveIndependence origin keys: "${findA.derivedOriginKey}" ` +
            `(attributedTo=${findA.attributedTo ?? "null"}, relaysUnnamedReport=${findA.relaysUnnamedReport}) vs ` +
            `"${findB.derivedOriginKey}" ` +
            `(attributedTo=${findB.attributedTo ?? "null"}, relaysUnnamedReport=${findB.relaysUnnamedReport})`,
          modelBasis:
            mSynd === null
              ? null
              : `${model.syndicationBasisById.get(a.claimId) ?? "(none)"} || ` +
                `${model.syndicationBasisById.get(b.claimId) ?? "(none)"}`,
        },
        contradicts: {
          heuristic: hContra,
          model: mContra,
          verdict: verdictFor(hContra, mContra),
          heuristicBasis:
            `declaredContradictsRelation=${declared} (hand label), ` +
            `sharedSelfRevisedOrigin=${sharedRevisedOrigin} (derived)`,
          modelBasis: mContra
            ? (model.contradictionBasis.get(pairKey(sa, sb)) ?? "(no basis given)")
            : "model listed no contradiction for this pair",
        },
      });
    }
  }

  return edges;
}

function countCategory(edges: PairEdge[], pick: (e: PairEdge) => EdgeComparison<boolean>): CategoryCounts {
  const disagreeing = edges.filter((e) => pick(e).verdict === "DISAGREE");
  return {
    totalPairs: edges.length,
    agree: edges.filter((e) => pick(e).verdict === "AGREE").length,
    disagree: disagreeing.length,
    modelSilent: edges.filter((e) => pick(e).verdict === "MODEL_SILENT").length,
    disagreeingPairs: disagreeing.map((e) => `${e.claimIdA} / ${e.claimIdB}`),
  };
}

// ---------------------------------------------------------------------------
// Limitations
// ---------------------------------------------------------------------------

function buildLimitations(
  unpinnedCount: number,
  totalDisagreements: number,
  modelSilentCount: number,
): string[] {
  const limitations = [
    "One scenario, one run, one live non-deterministic model call. This measures NOTHING about " +
      "accuracy. Re-running it can produce a different grouping and therefore a different " +
      "agreement count. It is a record of what one call returned, not a claim about what the " +
      "model does.",
    "The deterministic promotion engine remains the decider. The model's output is graph " +
      "structure only and is not wired into decision/, risk/, or any scenario file. Scenario A's " +
      "published state is unchanged by this study, and the state produced by the unchanged " +
      "engine is recorded in `deterministicDecision` so a reader can check that rather than " +
      "take it on trust.",
    "Disagreements are REPORTED, not adjudicated. Neither the model nor the heuristic is " +
      "treated as ground truth anywhere in this artifact. No heuristic was changed to match the " +
      "model and no model output was post-processed to match a heuristic.",
    "The CONTRADICTION axis is not like-for-like. The heuristic half of it reads " +
      "`relation === \"CONTRADICTS\"`, which is a hand label a human wrote into the frozen " +
      "scenario in T0.2; only the self-revision half is derived from text. The model was " +
      "deliberately not shown that label. Agreement or disagreement on this axis therefore says " +
      "less than it appears to.",
    "The model was shown claimId, sourceClass, sourceId, publisherOrAuthor, publishedAt, " +
      "company, tokenSymbol, tokenAddress, eventType and the verbatim claimTextOrPointer, and " +
      "was NOT shown independenceGroup, relation or duplicateOf. Those are the frozen " +
      "scenario's answers; showing them would have made this a reading test of the fixture.",
    "claim-a-001's claimTextOrPointer is a file pointer, not prose. `normalizeClaim` stores it " +
      "verbatim, so the heuristic never reads the rumour's wording — and to keep the sides even " +
      "neither does the model. Both are blind to that claim's language, which is a property of " +
      "the fixture rather than of either method.",
    "Scenario A's evidence window contains zero swaps on chain 196, so there is no market leg " +
      "here at all. This study is entirely on the evidence path.",
    "Only three structural questions were asked. Recency, provenance violations, materiality, " +
      "assertion level and self-revision amounts are derived by the heuristics alone and were " +
      "not put to the model, so `heuristic.evidenceGraph` contains findings with no counterpart " +
      "in `model.rawOutput`.",
  ];

  if (unpinnedCount > 0) {
    limitations.push(
      `${unpinnedCount} of the local source documents scenario A references carry no ` +
        `sourceContentSha256 in the scenario file, so nothing about their bytes was actually ` +
        `verified. Their observed hashes are recorded as UNPINNED, which is a statement about ` +
        `the fixture and must not be read as a pass. The scenario FILE itself is pinned, but by ` +
        `a constant this study declared at authoring time rather than by an independent freeze.`,
    );
  }

  if (modelSilentCount > 0) {
    limitations.push(
      `${modelSilentCount} edge comparison(s) are MODEL_SILENT: the model did not place one or ` +
        `both claims in any group, so there is no model answer to compare. These are counted ` +
        `separately and are neither agreements nor disagreements.`,
    );
  }

  if (totalDisagreements === 0) {
    limitations.push(
      "The two sides agreed on every comparable edge in this run. That is a real result and it " +
        "is published as one, but a single run agreeing does not establish that the heuristics " +
        "and the model generally agree, and it certainly does not establish that either is right.",
    );
  }

  return limitations;
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

const HELP = `
S2.2 — scenario A's evidence graph derived live by the model, next to the heuristics.

  npx tsx src/studies/scenarioAGraphLive.ts [--dry-run] [--out <path>] [--model <id>]

  (no flags)      Verify hashes, run the heuristics, make ONE live model call for graph
                  structure, build the per-edge agreement table, write the artifact.
                  No chain is touched by any code path in this file.
  --dry-run       Everything except the model call and the write. Spends no tokens.
  --out <path>    Artifact destination.
                  Default: docs/buildx-orion-2026/outputs/05-build/data/s2_2_scenario_a_graph_live.json
  --model <id>    Override the pinned model id (default ${PINNED_GEMINI_MODEL}). Recorded in the
                  artifact, along with any ambient GEMINI_MODEL that was overridden.
  --help          This text. Exits before any file read or LLM call.

Environment:
  GEMINI_API_KEY  required (or GOOGLE_GENERATIVE_AI_API_KEY / GOOGLE_API_KEY)

Disagreements are the output, not a failure. Nothing here adjudicates them.
`.trimStart();

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }

  const dryRun = args.includes("--dry-run");
  const outPath = getArgValue(args, "--out") ?? DEFAULT_OUT_PATH;

  // ---- 1. Pin the model BEFORE anything can read it --------------------------------------
  const ambientGeminiModelEnv = process.env.GEMINI_MODEL?.trim() || null;
  const resolvedModelId = getArgValue(args, "--model")?.trim() || PINNED_GEMINI_MODEL;
  process.env.GEMINI_MODEL = resolvedModelId;
  const ambientGeminiModelOverridden =
    ambientGeminiModelEnv !== null && ambientGeminiModelEnv !== resolvedModelId;

  console.log(`[s2.2] model: ${resolvedModelId}`);
  if (ambientGeminiModelOverridden) {
    console.log(
      `[s2.2] ambient GEMINI_MODEL was "${ambientGeminiModelEnv}" and was overridden for this ` +
        `run. Both values are recorded in the artifact.`,
    );
  }

  // ---- 2. Integrity, before a single token is spent ---------------------------------------
  const scenarioBytes = readFileSync(SCENARIO_PATH);
  const scenarioFileSha256 = sha256Hex(scenarioBytes);
  if (scenarioFileSha256 !== PINNED_SCENARIO_SHA256) {
    console.error(
      `[s2.2] SCENARIO FILE HASH MISMATCH — refusing to run.\n` +
        `  file:     apps/server/scenarios/scenario-a-rumor-watch.json\n` +
        `  expected: ${PINNED_SCENARIO_SHA256}  (PINNED_SCENARIO_SHA256 in this file)\n` +
        `  actual:   ${scenarioFileSha256}\n` +
        `No LLM call was made. The frozen scenario changed since this study was written. Read ` +
        `the diff and update the constant deliberately; do not delete the check.`,
    );
    process.exit(1);
  }

  const scenario = JSON.parse(scenarioBytes.toString("utf8")) as ScenarioAOnDisk;
  const integrityRows = checkDocumentIntegrity(scenario);
  const pinnedClaimCount = integrityRows.filter((r) => r.pinnedSha256 !== null).length;
  const unpinnedCount = integrityRows.filter((r) => r.status === "UNPINNED").length;

  console.log(
    `[s2.2] scenario verified: ${scenarioFileSha256} (${scenarioBytes.length} bytes); ` +
      `local source documents: ${integrityRows.length}, of which pinned: ${pinnedClaimCount}`,
  );
  if (unpinnedCount > 0) {
    console.log(
      `[s2.2] NOTE: ${unpinnedCount} referenced document(s) carry no sourceContentSha256 in the ` +
        `scenario. Their hashes are RECORDED, not verified. This is a gap in the fixture and it ` +
        `is published as one.`,
    );
  }

  // ---- 3. Heuristic side -------------------------------------------------------------------
  const claims = normalizeClaims(scenario.claims);
  // The heuristics are run at the scenario's own decision anchor, which is the instant the
  // evidence landed. `runScenario` separately defaults to the market window end for the decision
  // itself; that difference belongs to the market leg, and scenario A has no market leg.
  const anchorUnix = Math.floor(Date.parse(scenario.decisionAnchor.at) / 1000);
  const heuristics = runHeuristics(claims, anchorUnix);

  console.log(
    `[s2.2] heuristics: ${claims.length} claims, ` +
      `${new Set(heuristics.entityKeyById.values()).size} entity key(s), ` +
      `${new Set(heuristics.independence.map((f) => f.derivedOriginKey)).size} derived origin(s), ` +
      `usableOriginCount ${heuristics.evidenceGraph.usableOriginCount}`,
  );
  for (const finding of heuristics.independence) {
    console.log(
      `[s2.2]   ${finding.claimId}: origin="${finding.derivedOriginKey}" ` +
        `syndication=${finding.isSyndication} relaysUnnamedReport=${finding.relaysUnnamedReport}`,
    );
  }

  // ---- 4. What the model is shown ----------------------------------------------------------
  const presented: PresentedClaim[] = claims.map((c) => ({
    claimId: c.claimId,
    sourceClass: c.sourceClass,
    sourceId: c.sourceId,
    publisherOrAuthor: c.publisherOrAuthor,
    publishedAt: c.publishedAt,
    company: c.company,
    tokenSymbol: c.tokenSymbol,
    tokenAddress: c.tokenAddress,
    eventType: c.eventType,
    claimTextOrPointer: c.claimTextOrPointer,
  }));

  const handLabels: HandLabel[] = scenario.claims.map((c) => ({
    claimId: c.claimId,
    independenceGroup: c.independenceGroup ?? "",
    relation: c.relation ?? "ORIGIN",
    duplicateOf: c.duplicateOf ?? null,
  }));

  const prompt = buildPrompt(presented);
  const promptSha256 = sha256Hex(prompt);

  if (dryRun) {
    console.log(
      `[s2.2] --dry-run: stopping before the model call. prompt sha256 ${promptSha256}, ` +
        `${prompt.length} chars. Nothing was written.`,
    );
    return;
  }

  // ---- 5. One live model call, graph structure only -----------------------------------------
  console.log(`[s2.2] calling the model once (prompt sha256 ${promptSha256})...`);
  const { object: rawOutput } = await generateObject({
    model: getLanguageModel(),
    schema: GraphStructureSchema,
    prompt,
  });

  const knownIds = new Set(claims.map((c) => c.claimId));
  const modelSide = indexModelOutput(rawOutput, knownIds);

  console.log(
    `[s2.2] model returned ${rawOutput.entityGroups.length} entity group(s), ` +
      `${rawOutput.syndicationGroups.length} origin group(s), ` +
      `${rawOutput.contradictions.length} contradiction(s)`,
  );
  if (modelSide.unknownClaimIdsNamed.length > 0) {
    console.log(
      `[s2.2] model named ${modelSide.unknownClaimIdsNamed.length} claim id(s) that do not ` +
        `exist: ${modelSide.unknownClaimIdsNamed.join(", ")}. Recorded and ignored, not repaired.`,
    );
  }

  // ---- 6. The per-edge table ----------------------------------------------------------------
  const edges = buildEdges(claims, heuristics, modelSide);
  const counts = {
    entity: countCategory(edges, (e) => e.entitySame),
    syndication: countCategory(edges, (e) => e.syndicationSameOrigin),
    contradiction: countCategory(edges, (e) => e.contradicts),
  };

  for (const [label, c] of Object.entries(counts)) {
    console.log(
      `[s2.2] ${label.padEnd(13)} agree ${c.agree}/${c.totalPairs}  disagree ${c.disagree}  ` +
        `modelSilent ${c.modelSilent}` +
        (c.disagreeingPairs.length ? `  -> ${c.disagreeingPairs.join(", ")}` : ""),
    );
  }

  // ---- 7. The unchanged engine, for reference ------------------------------------------------
  //
  // The model's output is NOT an input here. This is `runScenario` on the untouched scenario,
  // recorded so the artifact can state what the decider says rather than assert that nothing
  // moved.
  const swapWindow = readJson<SwapWindowFixture>(SWAP_FIXTURE_PATH);
  const decision = runScenario(scenario, swapWindow);
  const deterministicDecision = {
    state: decision.record.state,
    reasonCodes: [...decision.record.reasonCodes],
    note:
      "Produced by runScenario on the unchanged scenario through the unchanged decision engine. " +
      "The model output above was not an input to it. Scenario A's pre-registered expectation " +
      "is WATCH.",
  };
  console.log(
    `[s2.2] deterministic engine (model output NOT an input): ${deterministicDecision.state}`,
  );

  // ---- 8. Write the artifact ------------------------------------------------------------------
  const totalDisagreements =
    counts.entity.disagree + counts.syndication.disagree + counts.contradiction.disagree;
  const totalModelSilent =
    counts.entity.modelSilent + counts.syndication.modelSilent + counts.contradiction.modelSilent;

  const artifact: GraphLiveArtifact = {
    schemaVersion: SCHEMA_VERSION,
    producedBy: PRODUCED_BY,
    runAtUtc: new Date().toISOString(),

    scenarioId: scenario.scenarioId,
    scenarioFilePath: "apps/server/scenarios/scenario-a-rumor-watch.json",
    scenarioFileSha256,
    scenarioFilePinnedSha256: PINNED_SCENARIO_SHA256,
    documentIntegrity: {
      note:
        "Scenario A pins no sourceContentSha256 on any claim. Rows marked UNPINNED were hashed " +
        "and recorded but NOT verified against anything. The scenario file itself is checked " +
        "against a constant this study declared at authoring time, which is a drift alarm rather " +
        "than an independent freeze.",
      pinnedClaimCount,
      rows: integrityRows,
    },

    geminiModel: getGeminiModelId(),
    ambientGeminiModelEnv,
    ambientGeminiModelOverridden,

    presentedClaims: presented,
    handLabelsWithheldFromModel: handLabels,
    prompt,
    promptSha256,

    heuristic: {
      entityResolutions: heuristics.entityResolutions,
      independence: heuristics.independence,
      selfRevision: heuristics.selfRevision,
      evidenceGraph: heuristics.evidenceGraph,
      deterministicClustering: heuristics.clustering,
    },

    model: {
      rawOutput,
      unknownClaimIdsNamed: modelSide.unknownClaimIdsNamed,
      claimIdsNotPlacedInAnyEntityGroup: modelSide.notInAnyEntityGroup,
      claimIdsNotPlacedInAnySyndicationGroup: modelSide.notInAnySyndicationGroup,
      claimIdsPlacedInMoreThanOneEntityGroup: modelSide.inMoreThanOneEntityGroup,
      claimIdsPlacedInMoreThanOneSyndicationGroup: modelSide.inMoreThanOneSyndicationGroup,
    },

    edges,
    counts,

    deterministicDecision,

    limitations: buildLimitations(unpinnedCount, totalDisagreements, totalModelSilent),
  };

  const serialized = `${JSON.stringify(artifact, bigintSafe, 2)}\n`;
  assertNoSecretsInSerialized(serialized);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, serialized, "utf8");
  console.log(`[s2.2] artifact: ${outPath}`);
  console.log(
    `[s2.2] ${totalDisagreements} disagreement(s) across ${edges.length * 3} comparisons. ` +
      `None were resolved in either side's favour.`,
  );
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  main().catch((err) => {
    // Message only. Every error path in the modules this touches names environment VARIABLES
    // rather than values, and a stack trace could carry an argument that is not.
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
