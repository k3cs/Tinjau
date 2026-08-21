/**
 * S5.1 — the X Listener, actually connected.
 *
 * ---------------------------------------------------------------------------------------
 * WHAT THIS EXISTS TO FIX.
 *
 * The X Listener and the X Publisher were both built and neither was joined to the loop
 * (`/roadmap` says so, in a section called "Built, not plugged in"). Every social claim in
 * the product until now has been the SIMULATED one in scenario A — written by this project as
 * a safety test, carrying a null source URL and a `simulated://` source id.
 *
 * This entry point connects the READ half, and only the read half:
 *
 *   GET /2/tweets/search/recent  ->  normalizeClaim (T2.1)  ->  buildEvidenceGraph (T2.3)
 *                               ->  resolveAsset (T2.2)     ->  confirmMarket (T3.3)
 *                               ->  decide (T4.1)           ->  one decision record
 *
 * Nothing in the evidence or decision path is touched, patched, or wrapped. `normalize.ts`,
 * `graph.ts`, `assets.ts`, `confirm.ts`, `promote.ts`, `orchestrate.ts` and `scenarioRunner.ts`
 * are byte-identical before and after this file exists. The only thing that changed is where
 * one claim came from.
 *
 * ---------------------------------------------------------------------------------------
 * THIS SCRIPT CANNOT WRITE TO X.
 *
 * It imports `readFromX.ts`, whose only request primitive hardcodes `method: "GET"`. It does
 * NOT import `postToX.ts`, `composeTweet.ts` or `xbot/main.ts`, and there is no branch, flag,
 * or environment variable in this file that produces a tweet, reply, like, follow or delete.
 * Outbound posting is an irreversible public channel and is out of scope for this task by
 * explicit instruction. `xbot/main.ts` still defaults to dry-run and was not modified.
 *
 * ---------------------------------------------------------------------------------------
 * THE POINT IS THE CONTAINMENT INVARIANT, NOT THE STATE THAT COMES OUT.
 *
 * A live post from an ordinary account is `sourceClass: RUMOR`, and §0.7 caps rumour-only
 * evidence at `WATCH` unconditionally — `mayReachProtect` returns false for RUMOR before any
 * market argument is even considered (`risk/types.ts::mayReachProtect`, invariant 1). So the
 * expected outcome of a successful run is `WATCH` or `NORMAL`, never `PROTECT`. A `WATCH` here
 * is the run SUCCEEDING. If this ever printed `PROTECT` off a single rumour, the engine would
 * be wrong and would need fixing; nothing in this file would.
 *
 * ---------------------------------------------------------------------------------------
 * NOTHING IS FABRICATED.
 *
 * Every provenance field is either taken from the API response or recorded as UNAVAILABLE.
 * There is no default, no inference, and no placeholder for `publishedAt`, `publisherOrAuthor`,
 * `sourceUrl` or the content hash. If the API returns nothing usable — an empty result set, or
 * an access refusal — this publishes that fact as the run's result. It does not fall back to a
 * fixture, it does not scrape, and it does not retry.
 *
 * SECRETS. No credential is printed, logged, or written. Error messages name environment
 * VARIABLES, never values. Before the artifact is written it is scanned against the actual
 * secret values present in `process.env` and the write is refused if any of them appears — the
 * same by-value scan `scenarioBBondedLive.ts` uses, for the same reason: this artifact
 * legitimately contains a 64-hex content digest that a shape-based scan would flag forever.
 *
 * ---------------------------------------------------------------------------------------
 * CLI
 *
 *   npx tsx src/studies/xListenerLive.ts
 *       One read of search/recent, normalise, decide, write the artifact. Read-only.
 *
 *   --out <path>    Artifact destination. Defaults to the S5.1 data path below.
 *   --max <n>       How many posts to ask for (X permits 10..100). Default 10.
 *   --query <q>     Override the derived query. The derived one is built from the SUPPORTED
 *                   asset registry, not from a hand-typed ticker.
 *   --help          Prints this and exits before any file read or network call.
 * ---------------------------------------------------------------------------------------
 */

import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SEARCH_RECENT_ENDPOINT,
  SEARCH_RECENT_FIELDS,
  findAuthor,
  searchRecentPosts,
  type XAuthor,
  type XPost,
  type XReadResult,
  type XSearchPayload,
} from "../xbot/readFromX.js";
import { SUPPORTED_ASSETS, type SupportedAsset } from "../evidence/assets.js";
import { normalizeClaim, type NormalizedClaim, type RawClaimInput } from "../evidence/normalize.js";
import { runScenario, type FrozenScenario } from "../decision/scenarioRunner.js";
import type { Decision } from "../decision/orchestrate.js";
import type { ReasonCode, SourceClass } from "../risk/types.js";
import type { SwapWindowFixture } from "../market/poolTelemetry.js";

// ---------------------------------------------------------------------------
// Paths and constants
// ---------------------------------------------------------------------------

const here = dirname(fileURLToPath(import.meta.url));
// apps/server/src/studies -> apps/server -> repo root.
const serverRoot = join(here, "..", "..");
const repoRoot = join(serverRoot, "..", "..");

/**
 * The market leg.
 *
 * Pinned to scenario A's captured chain-196 window rather than fetched live, and that choice is
 * a limitation this artifact states rather than hides. This task authorises a live SOCIAL
 * intake; it does not authorise a live market capture, and a run that quietly fetched one would
 * be publishing a second live claim nobody reviewed. The consequence is honest and fail-safe:
 * the window holds zero swaps, so market confirmation is UNAVAILABLE and the market leg cannot
 * contribute to a promotion. For a rumour that is doubly moot — §0.7 already caps it.
 */
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
  "s5_1_x_listener_live.json",
);

const SCHEMA_VERSION = "tinjau.x-listener-live/1.0.0";
const PRODUCED_BY = "apps/server/src/studies/xListenerLive.ts";

/** Chain the EIP-712 domain is bound to. X Layer mainnet, matching every published scenario. */
const CANONICAL_CHAIN_ID = 196;
const PLACEHOLDER_REGISTRY = "0x00000000000000000000000000000000000000c1" as const;

const DEFAULT_MAX_RESULTS = 10;

/**
 * Handles this project is willing to classify as `NEWS` rather than `RUMOR`.
 *
 * An explicit, short, auditable allow-list — not a heuristic over follower counts or the blue
 * check, both of which are purchasable. Anything not on it is `RUMOR`, which is the fail-safe
 * direction: misclassifying a wire service as a rumour caps a decision one notch too low,
 * while misclassifying an anonymous account as a wire service would let a stranger's post
 * count toward the two-independent-origin gate that authorises an action.
 *
 * Note what is deliberately NOT here: an issuer's own account (`@nvidia`). A company posting
 * about itself on social media is not an OFFICIAL source in this system — `normalize.ts`
 * requires an `https://www.sec.gov/` URL and a content hash for OFFICIAL, and a tweet has
 * neither. It would be NEWS at most, and it is left off entirely rather than guessed at.
 */
const RECOGNISED_NEWS_HANDLES: ReadonlySet<string> = new Set(
  [
    "reuters",
    "business", // Bloomberg
    "wsj",
    "ft",
    "cnbc",
    "apnews",
    "financialtimes",
    "markets", // Bloomberg Markets
    "bloombergtv",
  ].map((h) => h.toLowerCase()),
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IntakeOutcome =
  | "CLAIM_NORMALISED"
  | "NO_QUALIFYING_POST_IN_WINDOW_SAMPLED"
  | "BLOCKED_NO_READ_ACCESS"
  | "BLOCKED_AUTH"
  | "BLOCKED_RATE_LIMIT"
  | "BLOCKED_BAD_REQUEST"
  | "BLOCKED_TRANSIENT";

interface StageTimestamp {
  stage: string;
  atUtc: string;
}

interface IntakeRecord {
  provider: "x-api-v2";
  endpoint: string;
  httpMethod: "GET";
  authMode: "oauth1-user-context";
  /** Explicit, so a reader does not have to infer it from the absence of a flag. */
  outboundWritesAttempted: 0;
  query: string;
  maxResultsRequested: number;
  requestedFields: Record<string, string>;
  httpStatus: number;
  ok: boolean;
  resultCount: number | null;
  rateLimitRemaining: string | null;
  /** Populated only on a failure. Names and titles only — never a credential. */
  failure: {
    kind: string;
    apiTitle: string | null;
    apiType: string | null;
    detail: string;
  } | null;
}

/** Why each returned post was or was not eligible. Published so the selection is checkable. */
interface CandidateVerdict {
  postId: string | null;
  eligible: boolean;
  rejectedBecause: string | null;
  matchedTicker: string | null;
}

interface ProvenanceField {
  value: string | null;
  /** `"x-api-v2"` when the API supplied it; `"UNAVAILABLE"` when it did not. Never "derived". */
  source: "x-api-v2" | "derived-from-x-api-v2" | "project-registry" | "UNAVAILABLE";
  note?: string;
}

interface ClaimProvenanceRecord {
  claimId: ProvenanceField;
  sourceClass: ProvenanceField;
  sourceClassRule: string;
  dataMode: ProvenanceField;
  sourceUrl: ProvenanceField;
  sourceId: ProvenanceField;
  publisherOrAuthor: ProvenanceField;
  publishedAt: ProvenanceField;
  publishedAtPrecision: ProvenanceField;
  sourceContentSha256: ProvenanceField;
  company: ProvenanceField;
  tokenSymbol: ProvenanceField;
  tokenAddress: ProvenanceField;
  eventType: ProvenanceField;
  materiality: ProvenanceField;
  independenceGroup: ProvenanceField;
  expiresAt: ProvenanceField;
  /** The post, verbatim. A public post; provenance is the whole point of this run. */
  postText: ProvenanceField;
  authorHandle: ProvenanceField;
  authorDisplayName: ProvenanceField;
  authorIsProtected: boolean;
}

interface DecisionSummary {
  state: string;
  reasonCodes: ReasonCode[];
  confidence: string;
  confirmationStatus: string;
}

interface ListenerArtifact {
  schemaVersion: string;
  producedBy: string;
  runAtUtc: string;
  taskId: "S5.1";

  outcome: IntakeOutcome;
  headline: string;

  assetUniverse: {
    source: string;
    supported: { company: string; ticker: string; tokenSymbol: string; tokenAddress: string; poolAddress: string | null }[];
    unsupportedButKnown: { tokenSymbol: string; reason: string }[];
  };

  intake: IntakeRecord;
  candidates: CandidateVerdict[];

  claim: {
    provenance: ClaimProvenanceRecord;
    normalized: NormalizedClaim;
    provenanceViolations: string[];
    promotable: boolean;
  } | null;

  decision: Decision | null;
  decisionSummary: DecisionSummary | null;

  containmentInvariant: {
    statement: string;
    highestSourceClass: SourceClass | null;
    stateReached: string | null;
    held: boolean | null;
  };

  marketLeg: {
    fixturePath: string;
    why: string;
  };

  stages: StageTimestamp[];
  limitations: string[];
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function getArgValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : undefined;
}

/** `bigint` renders as a decimal string rather than being dropped — same as `tinjauDemoRun.ts`. */
function bigintSafe(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

const stages: StageTimestamp[] = [];
function markStage(stage: string): void {
  stages.push({ stage, atUtc: new Date().toISOString() });
}

function unavailable(note: string): ProvenanceField {
  return { value: null, source: "UNAVAILABLE", note };
}

/**
 * Refuses to write anything that contains a live secret.
 *
 * Scans BY VALUE against what is actually in `process.env`, not by hex shape — the artifact
 * legitimately contains a 64-hex sha256 of the post text, and a shape-based scan would either
 * flag every honest run or be tuned until it flagged nothing. Copied in structure from
 * `scenarioBBondedLive.ts::assertNoSecretsInSerialized`, with the X credential names added.
 * The failure message names the variable and never the value.
 */
function assertNoSecretsInSerialized(serialized: string): void {
  const envNames = [
    "X_API_KEY",
    "X_API_SECRET",
    "X_ACCESS_TOKEN",
    "X_ACCESS_TOKEN_SECRET",
    "X_CLIENT_ID",
    "X_CLIENT_SECRET",
    "X_BEARER_TOKEN",
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
    // Eight characters: long enough that a stray short variable cannot match half the file.
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

// ---------------------------------------------------------------------------
// The asset universe — read from the registry, never invented
// ---------------------------------------------------------------------------

/**
 * The assets a claim may resolve to.
 *
 * `SUPPORTED_ASSETS` is the T2.2 registry and the single source of truth for "what this system
 * can act on". It is filtered to `supported === true`, which today means exactly one asset —
 * wNVDAx. `NVDAx` is present in the registry and deliberately unsupported (no verified pool),
 * and any MSTR-linked token is absent from it entirely. The query below is derived from this
 * list rather than typed, so it cannot drift away from what the resolver will accept.
 */
function supportedAssets(): SupportedAsset[] {
  return SUPPORTED_ASSETS.filter((a) => a.supported);
}

/**
 * Builds the search query from the registry's tickers.
 *
 * `-is:retweet` because a retweet's `text` is a truncated copy of someone else's post, so its
 * content hash would commit to bytes that are not the original's. `-is:reply` keeps the sample
 * to standalone claims. `lang:en` because the speculation analyser's marker list is English.
 */
function buildQuery(assets: SupportedAsset[]): string {
  const tickers = [...new Set(assets.map((a) => a.ticker))];
  const cashtags = tickers.map((t) => `$${t}`).join(" OR ");
  return `(${cashtags}) -is:retweet -is:reply lang:en`;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

/**
 * `RUMOR` unless the author is on the short recognised-news allow-list.
 *
 * Fails closed by construction: the default is the least-privileged class, and moving a post
 * up to `NEWS` requires an exact handle match against a list a human wrote. Nothing about the
 * post's content, engagement, or verification badge can raise it.
 */
function classifySourceClass(author: XAuthor | null): { sourceClass: SourceClass; rule: string } {
  const handle = author?.username?.toLowerCase() ?? null;
  if (handle && RECOGNISED_NEWS_HANDLES.has(handle)) {
    return {
      sourceClass: "NEWS",
      rule: `author handle @${author?.username} is on the project's recognised-news allow-list`,
    };
  }
  return {
    sourceClass: "RUMOR",
    rule:
      handle === null
        ? "author handle unavailable, so the least-privileged class is used"
        : `author handle @${author?.username} is not on the project's recognised-news allow-list; ` +
          `a social post from an unrecognised account is a RUMOR`,
  };
}

/** The first registry ticker whose cashtag appears in the post. Null when none does. */
function matchAsset(text: string, assets: SupportedAsset[]): SupportedAsset | null {
  const upper = text.toUpperCase();
  for (const asset of assets) {
    if (upper.includes(`$${asset.ticker}`)) return asset;
  }
  return null;
}

/**
 * Decides whether one returned post may become a claim, and says why when it may not.
 *
 * Protected accounts are excluded unconditionally. `search/recent` should never return one, but
 * "should never" is not a guarantee worth publishing a private person's words on, so it is
 * checked rather than assumed.
 */
function judgeCandidate(
  post: XPost,
  author: XAuthor | null,
  assets: SupportedAsset[],
): CandidateVerdict {
  const postId = post.id ?? null;
  const base = { postId, matchedTicker: null as string | null };

  if (!post.id) return { ...base, eligible: false, rejectedBecause: "the API returned no post id" };
  if (!post.text || post.text.trim().length === 0) {
    return { ...base, eligible: false, rejectedBecause: "the API returned no post text" };
  }
  if (author?.protected === true) {
    return {
      ...base,
      eligible: false,
      rejectedBecause: "the author's account is protected; a private account's words are never ingested",
    };
  }
  if (post.referenced_tweets?.some((r) => r.type === "retweeted")) {
    return {
      ...base,
      eligible: false,
      rejectedBecause: "the post is a retweet, so its text is a truncated copy of another post",
    };
  }
  if (!post.created_at) {
    return {
      ...base,
      eligible: false,
      rejectedBecause: "the API returned no created_at, so the publication timestamp is unavailable and cannot be invented",
    };
  }

  const asset = matchAsset(post.text, assets);
  if (!asset) {
    return {
      ...base,
      eligible: false,
      rejectedBecause: "no cashtag from the supported-asset registry appears in the post text",
    };
  }

  return { postId, eligible: true, rejectedBecause: null, matchedTicker: asset.ticker };
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

/**
 * Turns one eligible post into a `RawClaimInput`, taking every field from the API response.
 *
 * WHAT IS DELIBERATELY LEFT UNSET, AND WHY:
 *   - `eventType` — a post's event type cannot be read off its text without a classifier this
 *     task does not authorise. `normalizeClaim` records it as `"UNKNOWN"`.
 *   - `materiality` — likewise. `UNKNOWN`, which `promote.ts` refuses to promote on. That is
 *     the fail-safe direction and it is left there on purpose.
 *   - `assertionHint` — the caller is supposed to supply only structural knowledge that
 *     language cannot. We have none: the speculation level is derived from the post's own
 *     words by `analyseSpeculation`, which is exactly where that judgement belongs.
 *   - `expiresAt` — no source fact supports a TTL for a tweet, and the frozen scenarios' 24h
 *     rumour TTL is a scenario-authoring convention, not something the API said. Left null.
 *   - `officialConfirmation` — false. No filing confirmed this; asserting otherwise from a
 *     social post is precisely the laundering `normalize.ts` exists to prevent.
 */
function toRawClaim(
  post: XPost,
  author: XAuthor | null,
  asset: SupportedAsset,
  sourceClass: SourceClass,
): { raw: RawClaimInput; sourceUrl: string | null; contentSha256: string } {
  const handle = author?.username ?? null;
  const text = post.text!;
  const contentSha256 = createHash("sha256").update(Buffer.from(text, "utf8")).digest("hex");

  // Only constructible when the handle is known. X canonicalises the path segment case-
  // insensitively, but a URL built from a handle we do not have would be a fabrication, so it
  // stays null and `normalizeClaim` records MISSING_URL_FOR_NON_SIMULATED for it.
  const sourceUrl = handle ? `https://x.com/${handle}/status/${post.id}` : null;

  const raw: RawClaimInput = {
    claimId: `x-${post.id}`,
    sourceClass,
    dataMode: "LIVE",
    sourceUrl,
    // Always present even when the handle is not: the numeric post id is the API's own stable
    // identifier and does not depend on any expansion having been granted.
    sourceId: `x.com/i/status/${post.id}`,
    publisherOrAuthor: handle ? `@${handle}` : null,
    publishedAt: post.created_at!,
    // X returns `created_at` to the second (RFC 3339, e.g. 2026-08-22T09:14:07.000Z). Stated as
    // SECOND rather than the schema default of DAY because the API genuinely supplies it.
    publishedAtPrecision: "SECOND",
    sourceContentSha256: contentSha256,
    company: asset.company,
    tokenSymbol: asset.tokenSymbol,
    tokenAddress: asset.tokenAddress,
    claimTextOrPointer: text,
    // Each author is their own origin. Two accounts repeating the same story are two claims in
    // two groups, which is honest at intake — collapsing genuine syndication is `graph.ts`'s
    // job and it does it from the claims, not from a guess made here.
    independenceGroup: `x:author:${post.author_id ?? post.id}`,
    relation: "ORIGIN",
    officialConfirmation: false,
  };

  return { raw, sourceUrl, contentSha256 };
}

function buildProvenanceRecord(
  post: XPost,
  author: XAuthor | null,
  asset: SupportedAsset,
  classification: { sourceClass: SourceClass; rule: string },
  normalized: NormalizedClaim,
): ClaimProvenanceRecord {
  const handle = author?.username ?? null;
  return {
    claimId: { value: normalized.claimId, source: "derived-from-x-api-v2", note: "x-<post id>" },
    sourceClass: { value: normalized.sourceClass, source: "derived-from-x-api-v2" },
    sourceClassRule: classification.rule,
    dataMode: {
      value: normalized.dataMode,
      source: "derived-from-x-api-v2",
      note: "LIVE: read from the X API during this run, not replayed from a fixture.",
    },
    sourceUrl: normalized.sourceUrl
      ? { value: normalized.sourceUrl, source: "derived-from-x-api-v2", note: "canonical permalink built from the author handle and post id" }
      : unavailable("the author handle expansion was not returned, so no permalink can be built"),
    sourceId: { value: normalized.sourceId, source: "derived-from-x-api-v2" },
    publisherOrAuthor: normalized.publisherOrAuthor
      ? { value: normalized.publisherOrAuthor, source: "x-api-v2", note: "includes.users[].username" }
      : unavailable("includes.users did not carry this post's author"),
    publishedAt: { value: normalized.publishedAt, source: "x-api-v2", note: "tweet.fields=created_at" },
    publishedAtPrecision: { value: normalized.publishedAtPrecision, source: "x-api-v2", note: "X returns created_at to the second" },
    sourceContentSha256: {
      value: normalized.sourceContentSha256,
      source: "derived-from-x-api-v2",
      note: "sha256 over the UTF-8 bytes of the post text exactly as the API returned it",
    },
    company: { value: normalized.company, source: "project-registry", note: "evidence/assets.ts SUPPORTED_ASSETS" },
    tokenSymbol: { value: normalized.tokenSymbol, source: "project-registry" },
    tokenAddress: { value: normalized.tokenAddress, source: "project-registry" },
    eventType: {
      value: normalized.eventType,
      source: "UNAVAILABLE",
      note: "not classified: reading an event type off a post's text needs a classifier this task does not authorise",
    },
    materiality: {
      value: normalized.materiality,
      source: "UNAVAILABLE",
      note: "not determined; UNKNOWN is the value the promotion engine refuses to promote on",
    },
    independenceGroup: { value: normalized.independenceGroup, source: "derived-from-x-api-v2", note: "one group per author id" },
    expiresAt: normalized.expiresAt
      ? { value: normalized.expiresAt, source: "derived-from-x-api-v2" }
      : unavailable("no source fact supports a TTL for a post; left null rather than assumed"),
    postText: { value: normalized.claimTextOrPointer, source: "x-api-v2", note: "verbatim, public post" },
    authorHandle: handle ? { value: `@${handle}`, source: "x-api-v2" } : unavailable("author expansion not returned"),
    authorDisplayName: author?.name ? { value: author.name, source: "x-api-v2" } : unavailable("author expansion not returned"),
    authorIsProtected: author?.protected === true,
  };
}

// ---------------------------------------------------------------------------
// Limitations
// ---------------------------------------------------------------------------

/**
 * What this artifact does NOT establish.
 *
 * A function rather than a constant because several entries only apply to a run that actually
 * ingested a claim. A limitations list describing a decision that never happened is as
 * misleading as one that omits a limitation that does apply.
 */
function buildLimitations(outcome: IntakeOutcome, sourceClass: SourceClass | null): string[] {
  const limitations = [
    "This is ONE read of one endpoint at one moment. It measures nothing about latency and " +
      "nothing about coverage, and it does not make the listener production monitoring. No " +
      "process polls X, no window is guaranteed to be sampled, and nothing here supports a " +
      "claim about how quickly a post would be seen.",
    "Read-only. This run made zero outbound writes to X: no post, reply, like, follow or " +
      "delete. The publisher (src/xbot/postToX.ts, src/xbot/main.ts) is not imported by this " +
      "study and was not enabled; xbot/main.ts still defaults to dry-run.",
  ];

  if (outcome === "CLAIM_NORMALISED") {
    limitations.push(
      "The market leg is the PINNED chain-196 replay window from pool-scenario-a-swaps.json, " +
        "not a live capture. That window holds zero swaps, so market confirmation is " +
        "UNAVAILABLE and the market cannot contribute to a promotion in this run. This task " +
        "authorised a live social intake only; a live market capture would have been a second " +
        "live input nobody reviewed.",
      "The claim's eventType and materiality are UNKNOWN because neither can be read off a " +
        "post's text without a classifier this task does not authorise. UNKNOWN is a value the " +
        "promotion engine refuses to promote on, so the state reached here is partly a " +
        "consequence of what was NOT classified, not only of the source class.",
      "sourceClass is assigned by an explicit handle allow-list, not by analysis. Every account " +
        "outside that short list is RUMOR. That is deliberate and fail-safe, but it means a " +
        "genuine wire-service post from an account not on the list would be undercounted.",
      "The content hash commits to the post TEXT as the API returned it, not to a rendered page " +
        "or to any media the post carried. A post edited after this read would not be detected " +
        "by re-hashing this artifact's recorded text against itself.",
      "One claim is not an evidence set. The evidence graph ran over a single origin, so its " +
        "duplicate-collapsing and contradiction-detection paths were exercised trivially at best.",
    );
  }

  if (sourceClass === "RUMOR") {
    limitations.push(
      "The containment invariant holding on ONE rumour is a demonstration, not a proof. The " +
        "proof is riskPromotionScenarios/decisionScenarios in the test suite and the frozen " +
        "scenario A pre-registration; this run shows the same rule applying to a claim that " +
        "was not written by us.",
    );
  }

  if (outcome !== "CLAIM_NORMALISED") {
    limitations.push(
      "No live claim was ingested in this run, so no decision record was produced from live " +
        "data. Nothing in this artifact should be read as the listener having been exercised " +
        "end to end. The intake record states exactly how far it got.",
    );
  }

  return limitations;
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

const HELP = `
S5.1 — the X Listener, connected. READ-ONLY: this script cannot post to X.

  npx tsx src/studies/xListenerLive.ts [--out <path>] [--max <n>] [--query <q>]

  (no flags)      One GET of /2/tweets/search/recent, normalise the first eligible post into
                  the project's provenance schema, run it through the unchanged evidence graph
                  and decision engine, write the artifact. No outbound write of any kind.
  --out <path>    Artifact destination.
                  Default: docs/buildx-orion-2026/outputs/05-build/data/s5_1_x_listener_live.json
  --max <n>       Posts to request (X permits 10..100). Default ${DEFAULT_MAX_RESULTS}.
  --query <q>     Override the query derived from the supported-asset registry.
  --help          This text. Exits before any file read or network call.

Environment:
  X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET   required (read scope)

The expected outcome for a live rumour is WATCH or NORMAL. PROTECT is unreachable from
rumour-only evidence by invariant, and reaching it would mean the engine is wrong.
`.trimStart();

function outcomeForFailure(kind: string): IntakeOutcome {
  switch (kind) {
    case "no_read_access":
      return "BLOCKED_NO_READ_ACCESS";
    case "auth":
      return "BLOCKED_AUTH";
    case "rate_limit":
      return "BLOCKED_RATE_LIMIT";
    case "bad_request":
      return "BLOCKED_BAD_REQUEST";
    default:
      return "BLOCKED_TRANSIENT";
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }

  const outPath = getArgValue(args, "--out") ?? DEFAULT_OUT_PATH;
  const maxResults = Number(getArgValue(args, "--max") ?? DEFAULT_MAX_RESULTS);
  if (!Number.isInteger(maxResults) || maxResults < 10 || maxResults > 100) {
    throw new Error(`--max must be an integer between 10 and 100 (X's own bounds); got "${maxResults}".`);
  }

  markStage("run_started");

  // ---- 1. The asset universe, read from the registry ------------------------------------
  const assets = supportedAssets();
  if (assets.length === 0) {
    throw new Error(
      "SUPPORTED_ASSETS contains no supported asset. Refusing to invent a ticker to search for.",
    );
  }
  const query = getArgValue(args, "--query") ?? buildQuery(assets);
  console.log(`[s5.1] asset universe: ${assets.map((a) => `${a.ticker}/${a.tokenSymbol}`).join(", ")}`);
  console.log(`[s5.1] query: ${query}`);
  markStage("asset_universe_resolved");

  // ---- 2. One read. Read-only. No retry. --------------------------------------------------
  console.log(`[s5.1] GET ${SEARCH_RECENT_ENDPOINT} (read-only, max_results=${maxResults})`);
  markStage("x_read_requested");
  const read: XReadResult = await searchRecentPosts({ query, maxResults });
  markStage("x_read_completed");

  const intake: IntakeRecord = {
    provider: "x-api-v2",
    endpoint: SEARCH_RECENT_ENDPOINT,
    httpMethod: "GET",
    authMode: "oauth1-user-context",
    outboundWritesAttempted: 0,
    query,
    maxResultsRequested: maxResults,
    requestedFields: { ...SEARCH_RECENT_FIELDS },
    httpStatus: read.ok ? read.httpStatus : read.httpStatus,
    ok: read.ok,
    resultCount: read.ok ? (read.payload.meta?.result_count ?? read.payload.data?.length ?? 0) : null,
    rateLimitRemaining: read.ok ? read.rateLimitRemaining : null,
    failure: read.ok
      ? null
      : { kind: read.kind, apiTitle: read.apiTitle, apiType: read.apiType, detail: read.detail },
  };

  const assetUniverse: ListenerArtifact["assetUniverse"] = {
    source: "apps/server/src/evidence/assets.ts :: SUPPORTED_ASSETS (supported === true)",
    supported: assets.map((a) => ({
      company: a.company,
      ticker: a.ticker,
      tokenSymbol: a.tokenSymbol,
      tokenAddress: a.tokenAddress,
      poolAddress: a.poolAddress,
    })),
    unsupportedButKnown: SUPPORTED_ASSETS.filter((a) => !a.supported).map((a) => ({
      tokenSymbol: a.tokenSymbol,
      reason: a.supportNote,
    })),
  };

  // ---- 3. Blocked path: publish the truth, do not work around it --------------------------
  if (!read.ok) {
    const outcome = outcomeForFailure(read.kind);
    const headline =
      `X read refused: HTTP ${read.httpStatus} (${read.apiTitle ?? read.kind}). No live claim was ` +
      `ingested, and none was manufactured.`;
    console.error(`\n[s5.1] ${headline}`);
    console.error(`[s5.1] api type: ${read.apiType ?? "(none)"}`);
    console.error(
      `[s5.1] Not retried, not worked around, no fixture substituted. The credentials are read ` +
        `from X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET; no value is printed.`,
    );

    writeArtifact(outPath, {
      schemaVersion: SCHEMA_VERSION,
      producedBy: PRODUCED_BY,
      runAtUtc: new Date().toISOString(),
      taskId: "S5.1",
      outcome,
      headline,
      assetUniverse,
      intake,
      candidates: [],
      claim: null,
      decision: null,
      decisionSummary: null,
      containmentInvariant: {
        statement: "Rumour-only evidence can never exceed WATCH (risk/types.ts::mayReachProtect, invariant 1).",
        highestSourceClass: null,
        stateReached: null,
        held: null,
      },
      marketLeg: {
        fixturePath: "apps/server/src/market/fixtures/pool-scenario-a-swaps.json",
        why: "Not reached: no claim was ingested, so the decision engine was not run.",
      },
      stages,
      limitations: buildLimitations(outcome, null),
    });
    console.log(`\n[s5.1] STATE: (none — no claim reached the decision engine)`);
    process.exit(1);
  }

  // ---- 4. Pick the first eligible post ----------------------------------------------------
  const payload: XSearchPayload = read.payload;
  const posts = payload.data ?? [];
  console.log(`[s5.1] returned ${posts.length} post(s)`);

  const candidates: CandidateVerdict[] = [];
  let chosen: { post: XPost; author: XAuthor | null; asset: SupportedAsset } | null = null;

  for (const post of posts) {
    const author = findAuthor(payload, post.author_id);
    const verdict = judgeCandidate(post, author, assets);
    candidates.push(verdict);
    if (verdict.eligible && chosen === null) {
      chosen = { post, author, asset: matchAsset(post.text!, assets)! };
    }
  }
  markStage("candidates_judged");

  if (chosen === null) {
    const headline =
      `No qualifying live claim found in the window sampled: ${posts.length} post(s) returned, ` +
      `none eligible. Nothing was manufactured.`;
    console.log(`\n[s5.1] ${headline}`);
    for (const c of candidates) console.log(`[s5.1]   ${c.postId}: ${c.rejectedBecause}`);

    writeArtifact(outPath, {
      schemaVersion: SCHEMA_VERSION,
      producedBy: PRODUCED_BY,
      runAtUtc: new Date().toISOString(),
      taskId: "S5.1",
      outcome: "NO_QUALIFYING_POST_IN_WINDOW_SAMPLED",
      headline,
      assetUniverse,
      intake,
      candidates,
      claim: null,
      decision: null,
      decisionSummary: null,
      containmentInvariant: {
        statement: "Rumour-only evidence can never exceed WATCH (risk/types.ts::mayReachProtect, invariant 1).",
        highestSourceClass: null,
        stateReached: null,
        held: null,
      },
      marketLeg: {
        fixturePath: "apps/server/src/market/fixtures/pool-scenario-a-swaps.json",
        why: "Not reached: no claim was ingested, so the decision engine was not run.",
      },
      stages,
      limitations: buildLimitations("NO_QUALIFYING_POST_IN_WINDOW_SAMPLED", null),
    });
    console.log(`\n[s5.1] STATE: (none — no claim reached the decision engine)`);
    return;
  }

  // ---- 5. Normalise, for real -------------------------------------------------------------
  const classification = classifySourceClass(chosen.author);
  const { raw } = toRawClaim(chosen.post, chosen.author, chosen.asset, classification.sourceClass);
  const normalized = normalizeClaim(raw);
  markStage("claim_normalised");

  console.log(
    `[s5.1] normalised ${normalized.claimId}: sourceClass=${normalized.sourceClass} ` +
      `dataMode=${normalized.dataMode} publishedAt=${normalized.publishedAt} ` +
      `assertionLevel=${normalized.assertionLevel} promotable=${normalized.promotable}`,
  );
  if (normalized.provenanceViolations.length > 0) {
    console.log(`[s5.1] provenance violations: ${normalized.provenanceViolations.join(", ")}`);
  }

  // ---- 6. Run the UNCHANGED evidence graph and decision engine -----------------------------
  //
  // `runScenario` is the production path every frozen scenario goes through. It is handed a
  // scenario built from the live claim rather than read off disk; nothing inside it is altered.
  const swapWindow = JSON.parse(readFileSync(SWAP_FIXTURE_PATH, "utf8")) as SwapWindowFixture;

  const scenario: FrozenScenario = {
    scenarioId: `S5.1-x-listener-live/${chosen.post.id}`,
    asset: {
      company: chosen.asset.company,
      tokenSymbol: chosen.asset.tokenSymbol,
      tokenAddress: chosen.asset.tokenAddress,
      poolIdOrAddress: chosen.asset.poolAddress ?? chosen.asset.tokenAddress,
    },
    decisionAnchor: {
      at: normalized.publishedAt,
      // Not determined. False is the value scenario A uses for an after-hours anchor and it is
      // the less favourable one for the market leg, so it cannot inflate a verdict. Stated in
      // the limitations rather than dressed up as a computed fact.
      usReferenceMarketOpen: false,
    },
    claims: [raw],
  };

  // `now` is the moment the claim was published, not the moment this script ran. That is what
  // puts the claim inside the evidence window while leaving the July market observation as old
  // as it genuinely is — the promotion engine re-judges that observation's age against `now`,
  // so a replayed window cannot look fresh here.
  const nowUnixSeconds = Math.floor(Date.parse(normalized.publishedAt) / 1000);

  const decision: Decision = runScenario(scenario, swapWindow, {
    chainId: CANONICAL_CHAIN_ID,
    registryAddress: PLACEHOLDER_REGISTRY,
    nowUnixSeconds,
    // No OFFICIAL evidence is present, so this boolean is not consulted for a RUMOR/NEWS claim.
    // Left at the published default so this run makes no new assumption of its own.
    officialEvidencePassed: true,
  });
  markStage("decision_produced");

  const decisionSummary: DecisionSummary = {
    state: decision.record.state,
    reasonCodes: [...decision.record.reasonCodes],
    confidence: decision.record.confidenceBand,
    confirmationStatus: decision.record.marketConfirmation.status,
  };

  const held =
    normalized.sourceClass === "RUMOR" ? decisionSummary.state !== "PROTECT" : true;

  // ---- 7. Write the artifact ---------------------------------------------------------------
  const headline =
    `One live X post (${normalized.sourceClass}, dataMode LIVE) traversed intake -> normalisation ` +
    `-> evidence graph -> decision engine and produced ${decisionSummary.state}.`;

  writeArtifact(outPath, {
    schemaVersion: SCHEMA_VERSION,
    producedBy: PRODUCED_BY,
    runAtUtc: new Date().toISOString(),
    taskId: "S5.1",
    outcome: "CLAIM_NORMALISED",
    headline,
    assetUniverse,
    intake,
    candidates,
    claim: {
      provenance: buildProvenanceRecord(chosen.post, chosen.author, chosen.asset, classification, normalized),
      normalized,
      provenanceViolations: [...normalized.provenanceViolations],
      promotable: normalized.promotable,
    },
    decision,
    decisionSummary,
    containmentInvariant: {
      statement:
        "Rumour-only evidence can never exceed WATCH (risk/types.ts::mayReachProtect, invariant 1: " +
        "highestClass === 'RUMOR' returns false before any market argument is considered).",
      highestSourceClass: normalized.sourceClass,
      stateReached: decisionSummary.state,
      held,
    },
    marketLeg: {
      fixturePath: "apps/server/src/market/fixtures/pool-scenario-a-swaps.json",
      why:
        "Pinned chain-196 replay, not a live capture. This task authorised a live SOCIAL intake " +
        "only. The window holds zero swaps, so market confirmation is UNAVAILABLE and fails closed.",
    },
    stages,
    limitations: buildLimitations("CLAIM_NORMALISED", normalized.sourceClass),
  });

  // ---- 8. The state, last and loud ---------------------------------------------------------
  console.log(`\n[s5.1] ==========================================`);
  console.log(`[s5.1] STATE: ${decisionSummary.state}`);
  console.log(`[s5.1] reason codes: ${decisionSummary.reasonCodes.join(", ") || "(none)"}`);
  console.log(`[s5.1] confidence: ${decisionSummary.confidence}  market: ${decisionSummary.confirmationStatus}`);
  console.log(
    `[s5.1] containment invariant (rumour-only <= WATCH): ` +
      `${normalized.sourceClass === "RUMOR" ? (held ? "HELD" : "VIOLATED") : "n/a (not rumour-only)"}`,
  );
  console.log(`[s5.1] ==========================================`);

  if (!held) {
    console.error(
      `[s5.1] The engine returned PROTECT off rumour-only evidence. That is an engine defect, ` +
        `not a listener defect. The artifact records it rather than hiding it.`,
    );
    process.exit(1);
  }
}

function writeArtifact(outPath: string, artifact: ListenerArtifact): void {
  const serialized = `${JSON.stringify(artifact, bigintSafe, 2)}\n`;
  assertNoSecretsInSerialized(serialized);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, serialized, "utf8");
  console.log(`[s5.1] artifact: ${outPath}`);
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  main().catch((err) => {
    // Message only. A stack trace could carry an argument that a message would not, and every
    // error path in the modules this touches names environment VARIABLES rather than values.
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
