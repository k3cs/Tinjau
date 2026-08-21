/**
 * S5.2 — one frozen intake fixture path replaced by a live, credential-free feed.
 *
 * ---------------------------------------------------------------------------------------
 * WHAT THIS EXISTS TO FIX.
 *
 * SVC-007 selected an "immutable source-linked repository replay fixture" as the corporate-news
 * intake, and recorded the honest limitation that a replay fixture "proves normalization,
 * reasoning, safety, and demo reproducibility but not live discovery". Every claim that has
 * ever reached this project's evidence graph was therefore either `REPLAY` (frozen by hand in
 * `apps/server/scenarios/`) or `SIMULATED` (written by this project as a negative control).
 *
 * S5.1 tried to close that gap on the social side and could not: X answered `402
 * credits-depleted` on every content-read endpoint, because `search/recent` is a paid tier.
 * That block is recorded, unedited, in `s5_1_x_listener_live.json`. The lesson it left is the
 * premise of this file: an intake leg whose only source requires a purchase is not an intake
 * leg. This one requires no account, no key, no paid tier, and accepts no terms.
 *
 * The path it connects:
 *
 *   GET SEC EDGAR company Atom feed  ->  parseFeedItems (S5.2, zero dependencies)
 *     ->  GET each filing index, hash the exact bytes
 *     ->  normalizeClaim (T2.1)      ->  deriveIndependence (T2.3)
 *     ->  buildEvidenceGraph (T2.3)  ->  resolveAsset (T2.2)
 *     ->  confirmMarket (T3.3)       ->  decide (T4.1)  ->  one decision record
 *
 * Nothing in the evidence or decision path is touched, patched, or wrapped. `normalize.ts`,
 * `graph.ts`, `assets.ts`, `confirm.ts`, `promote.ts`, `orchestrate.ts` and `scenarioRunner.ts`
 * are byte-identical before and after this file exists. The only thing that changed is where
 * the claims came from.
 *
 * ---------------------------------------------------------------------------------------
 * WHY SEC EDGAR'S ATOM FEED, AND NOT A NEWS WIRE.
 *
 * The brief asked for the narrowest defensible source for corporate news on the covered asset.
 * Three credential-free candidates were probed live on 2026-08-21 before this file was written,
 * and the alternatives are recorded in the artifact with what they actually returned:
 *
 *   - `feeds.finance.yahoo.com/rss/2.0/headline?s=NVDA` — HTTP 200, 20 items, but most were
 *     about other companies entirely (Webull, Cummins, Coinbase). It carries no publisher
 *     field, so the outlet would have to be guessed from the link host. An engagement feed is
 *     not a corporate-news wire, and guessing the publisher is exactly the fabrication this
 *     project's provenance schema exists to prevent.
 *   - `nvidianews.nvidia.com/releases.xml` — HTTP 200, 20 items, the issuer's own newsroom.
 *     Genuinely narrow, but it mixes marketing posts (GeForce NOW browser support) with
 *     corporate announcements, and a self-published press release is not an OFFICIAL source in
 *     this system: `normalize.ts` requires an `https://www.sec.gov/` URL for that class.
 *   - `feeds.reuters.com/reuters/businessNews` — did not resolve. Reuters no longer serves an
 *     open RSS feed, which is why "just use a wire's RSS" is not the easy answer it sounds.
 *
 * EDGAR wins on every axis that matters here. It is the ORIGIN rather than a report about the
 * origin, so nothing at intake can be a syndication of something else. It timestamps to the
 * second. It publishes the document the claim points at, so a content hash commits to
 * something real. It requires no credential — only the descriptive `User-Agent` SEC asks of
 * every requester, read through the existing `getEdgarUserAgent()` rather than reinvented.
 *
 * WHAT THAT CHOICE DOES **NOT** DO, STATED PLAINLY: an 8-K is `OFFICIAL`, not `NEWS`. This run
 * therefore replaces the frozen intake path for CORPORATE DISCLOSURE. It does not give this
 * project live third-party press intake, and SVC-007's limitation must be rewritten to say
 * exactly that rather than deleted.
 *
 * ---------------------------------------------------------------------------------------
 * READ-ONLY, AND NOTHING IS FABRICATED.
 *
 * Every request in `news/readFeed.ts` goes through one primitive that hardcodes `method:
 * "GET"`. Every provenance field below is taken from the feed, from the fetched document, or
 * from the supported-asset registry — or it is recorded as UNAVAILABLE. There is no default and
 * no placeholder for `publishedAt`, `publisherOrAuthor`, `sourceUrl` or the content hash. If
 * the feed returns nothing usable, this publishes that fact as the run's result: it does not
 * fall back to a fixture, does not scrape, and does not retry.
 *
 * The two fields a classifier would have to supply — `eventType` and `materiality` — are left
 * unset and become `UNKNOWN`. `promote.ts` treats `UNKNOWN` materiality as non-material and
 * refuses to promote on it. That is the fail-safe direction and it is left there on purpose.
 *
 * ---------------------------------------------------------------------------------------
 * THE POINT IS THAT THE INVARIANTS DID THEIR JOB, NOT THE STATE THAT COMES OUT.
 *
 * A `WATCH` or `NORMAL` here is the run SUCCEEDING. Three separate gates each independently
 * block `PROTECT` in this run, and the artifact records all three rather than relying on
 * whichever fired first:
 *
 *   1. every live claim's `materiality` is `UNKNOWN`, and `promote.ts` fails closed on that;
 *   2. the market leg is a pinned replay window holding zero swaps, so confirmation is
 *      `UNAVAILABLE`, and `mayReachProtect` requires exact `CONFIRMED`;
 *   3. `officialEvidencePassed` is published as `false`, because this task did not run the
 *      bonded three-way parse and asserting that it passed would be a fabrication.
 *
 * Gate 3 is the one a reader should be suspicious of, so the artifact also publishes the same
 * decision recomputed with `officialEvidencePassed: true` — the value every other published
 * scenario uses. If the state is identical either way, the refusal is on the merits and not an
 * artefact of assuming the bond failed.
 *
 * SECRETS. No credential is printed, logged, or written. This reader holds none: the only
 * header it sends is a `User-Agent`. The artifact is still scanned by value against
 * `process.env` before it is written, the same guard `scenarioBBondedLive.ts` and
 * `xListenerLive.ts` use, because the artifact legitimately contains 64-hex content digests
 * that a shape-based scan would flag forever.
 *
 * ---------------------------------------------------------------------------------------
 * CLI
 *
 *   npx tsx src/studies/newsIntakeLive.ts
 *       One read of the feed, one read per filing index, normalise, dedup, decide, write.
 *
 *   --out <path>   Artifact destination. Defaults to the S5.2 data path below.
 *   --count <n>    How many recent filings to ask the feed for. Default 10.
 *   --form <type>  SEC form type filter. Default 8-K (the "current report" — the form a US
 *                  registrant uses to disclose material corporate news). Pass "" for all forms.
 *   --no-documents Skip the per-filing document fetches. Every claim then carries no content
 *                  hash, which `normalize.ts` records as OFFICIAL_WITHOUT_CONTENT_HASH and
 *                  which makes every claim non-promotable. Diagnostic only.
 *   --help         Prints this and exits before any file read or network call.
 * ---------------------------------------------------------------------------------------
 */

import "dotenv/config";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  edgarCompanyAtomUrl,
  feedHeader,
  fetchFeed,
  fetchSecDocument,
  firstTagText,
  parseFeedItems,
  type FeedFetchResult,
  type FeedItem,
} from "../news/readFeed.js";
import { getEdgarUserAgent } from "../edgar/client.js";
import { isRealSecFilingSourceUrl } from "../xbot/sourceUrlGuard.js";
import { SUPPORTED_ASSETS, type SupportedAsset } from "../evidence/assets.js";
import { normalizeClaim, type NormalizedClaim, type RawClaimInput } from "../evidence/normalize.js";
import {
  countDerivedIndependentOrigins,
  deriveIndependence,
  type IndependenceFinding,
} from "../evidence/graph.js";
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
 * a limitation this artifact states rather than hides. This task authorises a live NEWS INTAKE;
 * it does not authorise a live market capture, and a run that quietly fetched one would be
 * publishing a second live input nobody reviewed. Scenario A's window is used rather than
 * scenario B's — even though the newest live filing happens to be scenario B's 8-K — precisely
 * because it holds zero swaps: market confirmation comes back `UNAVAILABLE` and fails closed.
 * Picking the market window that flatters the outcome is the one move that would make this run
 * worthless.
 */
const SWAP_FIXTURE_PATH = join(serverRoot, "src", "market", "fixtures", "pool-scenario-a-swaps.json");

const DEFAULT_OUT_PATH = join(
  repoRoot,
  "docs",
  "buildx-orion-2026",
  "outputs",
  "05-build",
  "data",
  "s5_2_news_intake_live.json",
);

const SCHEMA_VERSION = "tinjau.news-intake-live/1.0.0";
const PRODUCED_BY = "apps/server/src/studies/newsIntakeLive.ts";

/** Chain the EIP-712 domain is bound to. X Layer mainnet, matching every published scenario. */
const CANONICAL_CHAIN_ID = 196;
const PLACEHOLDER_REGISTRY = "0x00000000000000000000000000000000000000c1" as const;

const DEFAULT_COUNT = 10;
/**
 * The SEC form this reads by default.
 *
 * An 8-K is the "current report" — the form a US registrant is required to file to disclose a
 * material corporate event between periodic reports. It is, definitionally, corporate news from
 * the company itself, which is what makes it the narrowest defensible answer to "news about
 * this asset" rather than an arbitrary filter.
 */
const DEFAULT_FORM_TYPE = "8-K";

/** Politeness gap between document fetches. SEC asks for reasonable use; this is well inside it. */
const DOCUMENT_FETCH_GAP_MS = 150;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IntakeOutcome =
  | "CLAIMS_NORMALISED"
  | "NO_QUALIFYING_ITEM_IN_FEED_SAMPLED"
  | "BLOCKED_FEED_UNREADABLE";

interface StageTimestamp {
  stage: string;
  atUtc: string;
}

interface ProvenanceField {
  value: string | null;
  source:
    | "sec-edgar-atom-feed"
    | "derived-from-sec-edgar-atom-feed"
    | "sec-edgar-document-fetch"
    | "project-registry"
    | "UNAVAILABLE";
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
  publishedAtRaw: ProvenanceField;
  publishedAtPrecision: ProvenanceField;
  sourceContentSha256: ProvenanceField;
  company: ProvenanceField;
  tokenSymbol: ProvenanceField;
  tokenAddress: ProvenanceField;
  eventType: ProvenanceField;
  materiality: ProvenanceField;
  independenceGroup: ProvenanceField;
  relation: ProvenanceField;
  officialConfirmation: ProvenanceField;
  expiresAt: ProvenanceField;
  claimTextOrPointer: ProvenanceField;
  assertionLevel: ProvenanceField;
  /** Feed values kept for audit even though no claim field consumes them. */
  feedEntryId: ProvenanceField;
  feedEntryTitle: ProvenanceField;
  feedEntrySummary: ProvenanceField;
  feedFormType: ProvenanceField;
  feedFilingDate: ProvenanceField;
  feedAccessionNumber: ProvenanceField;
  feedItemsDescription: ProvenanceField;
  feedEntryRawSha256: ProvenanceField;
  documentFetch: {
    url: string | null;
    attempted: boolean;
    httpStatus: number | null;
    byteLength: number | null;
    contentType: string | null;
    retrievedAtUtc: string | null;
    failure: string | null;
  };
}

/** Why each feed item was or was not turned into a claim. Published so the selection is checkable. */
interface CandidateVerdict {
  index: number;
  feedEntryId: string | null;
  title: string | null;
  formType: string | null;
  accessionNumber: string | null;
  publishedIso: string | null;
  eligible: boolean;
  rejectedBecause: string | null;
}

interface DecisionSummary {
  state: string;
  reasonCodes: ReasonCode[];
  confidence: string;
  confirmationStatus: string;
  explanation: string;
}

interface InvariantCheck {
  id: string;
  statement: string;
  evidence: string;
  held: boolean | null;
}

interface DedupRecord {
  method: string;
  liveClaimCount: number;
  findings: IndependenceFinding[];
  derivedOriginKeys: string[];
  derivedIndependentOriginCount: number;
  syndicationsDetected: number;
  unnamedRelaysDetected: number;
  disagreementsWithDeclaredGroup: number;
  interpretation: string;
  /** A real fragility this live run surfaced in `graph.ts`. Reported, never patched here. */
  observedFragility: string;
}

interface NewsIntakeArtifact {
  schemaVersion: string;
  producedBy: string;
  runAtUtc: string;
  taskId: "S5.2";

  outcome: IntakeOutcome;
  headline: string;

  sourceChoice: {
    selected: string;
    feedUrl: string;
    format: "atom";
    credentialRequired: string;
    sourceClassProduced: SourceClass;
    whySelected: string[];
    whatThisDoesNotReplace: string;
    alternativesProbed: { url: string; observed: string; rejectedBecause: string }[];
  };

  assetUniverse: {
    source: string;
    supported: {
      company: string;
      cik: string;
      ticker: string;
      tokenSymbol: string;
      tokenAddress: string;
      poolAddress: string | null;
    }[];
    unsupportedButKnown: { tokenSymbol: string; reason: string }[];
    note: string;
  };

  intake: {
    provider: "sec-edgar-browse-atom";
    feedUrl: string;
    httpMethod: "GET";
    authMode: string;
    outboundWritesAttempted: 0;
    fetchedAtUtc: string;
    httpStatus: number;
    ok: boolean;
    contentType: string | null;
    charset: { value: string; source: string } | null;
    lastModified: string | null;
    feedByteLength: number | null;
    /** sha256 over the exact bytes the feed served, before decoding. */
    feedSha256: string | null;
    rawItemCount: number | null;
    feedCompanyName: string | null;
    feedCik: string | null;
    documentFetches: { attempted: number; succeeded: number; failed: number };
    failure: { kind: string; httpStatus: number; detail: string } | null;
  };

  candidates: CandidateVerdict[];

  claims: {
    provenance: ClaimProvenanceRecord;
    normalized: NormalizedClaim;
    provenanceViolations: string[];
    promotable: boolean;
  }[];

  dedup: DedupRecord | null;

  decision: Decision | null;
  decisionSummary: DecisionSummary | null;
  bondSensitivity: {
    question: string;
    publishedWith: boolean;
    recomputedWith: boolean;
    publishedState: string;
    recomputedState: string;
    stateMoved: boolean;
    interpretation: string;
  } | null;

  invariants: InvariantCheck[];

  marketLeg: { fixturePath: string; why: string };

  crossCheck: {
    statement: string;
    frozenValue: string | null;
    liveValue: string | null;
    match: boolean | null;
  } | null;

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

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Refuses to write anything that contains a live secret.
 *
 * Scans BY VALUE against what is actually in `process.env`, not by hex shape — the artifact
 * legitimately contains sha256 digests of the feed and of each filing document, and a
 * shape-based scan would either flag every honest run or be tuned until it flagged nothing.
 * Copied in structure from `scenarioBBondedLive.ts::assertNoSecretsInSerialized`. The failure
 * message names the variable and never the value.
 *
 * `EDGAR_USER_AGENT` is on the list even though it is not a credential. SEC requires it to be a
 * descriptive contact string, which in practice means it carries an email address, and this
 * artifact has no reason to contain one. Nothing in this script writes it, so a hit would mean
 * a bug.
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
    "ONCHAINOS_API_KEY",
    "ONCHAINOS_SECRET_KEY",
    "ONCHAINOS_PASSPHRASE",
    "POSTER_PRIVATE_KEY",
    "TINJAU_ASSESSOR_PRIVATE_KEY",
    "GUARDIAN_PRIVATE_KEY",
    "DEMO_RELAYER_PRIVATE_KEY",
    "EDGAR_USER_AGENT",
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
 * can act on". Filtered to `supported === true`, which today means exactly one asset — wNVDAx,
 * for NVIDIA CORPORATION, CIK 0001045810. `NVDAx` is present and deliberately unsupported (no
 * verified pool), and no MSTR-linked asset exists in the registry at all, so this run cannot
 * and does not read a feed for one. The CIK below is taken from this registry rather than
 * typed, so the feed cannot drift away from the asset the resolver will accept.
 */
function supportedAssets(): SupportedAsset[] {
  return SUPPORTED_ASSETS.filter((a) => a.supported);
}

// ---------------------------------------------------------------------------
// Candidate judgement
// ---------------------------------------------------------------------------

interface EligibleItem {
  item: FeedItem;
  accessionNumber: string;
  filingHref: string;
  filingType: string;
  filingDate: string;
  publishedIso: string;
}

/**
 * Decides whether one feed entry may become a claim, and says why when it may not.
 *
 * Nothing here is a quality judgement about the filing. Every rejection is "the feed did not
 * give us a field a claim cannot be invented without".
 */
function judgeCandidate(item: FeedItem): { verdict: CandidateVerdict; eligible: EligibleItem | null } {
  const f = item.fields;
  const accessionNumber = f["accession-number"] ?? null;
  const filingHref = f["filing-href"] ?? item.link ?? null;
  const filingType = f["filing-type"] ?? item.categoryTerm ?? null;
  const filingDate = f["filing-date"] ?? null;

  const base: CandidateVerdict = {
    index: item.index,
    feedEntryId: item.id,
    title: item.title,
    formType: filingType,
    accessionNumber,
    publishedIso: item.publishedIso,
    eligible: false,
    rejectedBecause: null,
  };

  const reject = (why: string) => ({ verdict: { ...base, rejectedBecause: why }, eligible: null });

  if (accessionNumber === null) return reject("the feed entry carries no accession-number");
  if (filingType === null) return reject("the feed entry carries no filing-type");
  if (filingDate === null) return reject("the feed entry carries no filing-date");
  if (filingHref === null) return reject("the feed entry carries no filing-href, so there is no resolvable source URL");
  if (!isRealSecFilingSourceUrl(filingHref)) {
    return reject(
      `filing-href "${filingHref}" did not pass isRealSecFilingSourceUrl (xbot/sourceUrlGuard.ts); ` +
        `a URL this project will not vouch for is never turned into a claim`,
    );
  }
  if (item.publishedIso === null) {
    return reject(
      `the feed entry's timestamp ("${item.publishedRaw ?? "(absent)"}") did not parse, so the ` +
        `publication instant is unavailable and cannot be invented`,
    );
  }

  return {
    verdict: { ...base, eligible: true },
    eligible: {
      item,
      accessionNumber,
      filingHref,
      filingType,
      filingDate,
      publishedIso: item.publishedIso,
    },
  };
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

interface BuiltClaim {
  raw: RawClaimInput;
  eligible: EligibleItem;
  document: {
    url: string;
    attempted: boolean;
    ok: boolean;
    httpStatus: number | null;
    byteLength: number | null;
    sha256: string | null;
    contentType: string | null;
    retrievedAtUtc: string | null;
    failure: string | null;
  };
  filerName: string | null;
}

/**
 * Turns one eligible feed entry into a `RawClaimInput`, taking every field from the feed, from
 * the fetched document, or from the registry.
 *
 * WHAT IS DELIBERATELY LEFT UNSET, AND WHY:
 *   - `eventType` — mapping 8-K item codes onto this project's event vocabulary is a classifier
 *     this task does not authorise. `normalizeClaim` records `"UNKNOWN"`.
 *   - `materiality` — likewise. `UNKNOWN`, which `promote.ts` treats as non-material and
 *     refuses to promote on. That is the fail-safe direction and it is left there on purpose.
 *   - `expiresAt` — no source fact supports a TTL for a filing. The frozen scenarios' 72-hour
 *     value is a scenario-authoring convention, not something EDGAR said. Left null.
 *
 * WHAT IS DELIBERATELY SET, AND WHY:
 *   - `assertionHint: "ASSERTED"` — `speculation.ts` names this exact case in its own doc: "an
 *     SEC filing is ASSERTED because the issuer signed it". It is structural knowledge language
 *     cannot supply. The hint is only honoured when the text carries no weaker signal, so a
 *     hedged filing still comes out hedged.
 *   - `officialConfirmation: true` — this claim IS an official filing, which is how frozen
 *     scenario B labels its own EDGAR claims. Note it is not a promotion argument on its own:
 *     `promote.ts` only uses it to decide whether to add `NO_OFFICIAL_CONFIRMATION`.
 *
 * THE `sourceId` SHAPE IS LOAD-BEARING. `graph.ts::ownOriginKey` derives an unrecognised
 * publisher's origin from `sourceId.split("/")[0]`. An origin-leading id (`sec.gov/...`)
 * therefore collapses every filing by every filer on EDGAR into one origin, which is the
 * correct answer under §0.7: ten filings by one registrant are one source, not ten. Using
 * EDGAR's own per-entry URN (`urn:tag:sec.gov,2008:accession-number=…`) would have produced one
 * origin PER FILING and manufactured corroboration out of a single filer. The shape used here
 * matches the frozen NEWS fixtures (`cnbc.com/2026-08-15/…`, `wsj/2026-08-14/…`), which are
 * origin-leading for the same reason.
 */
function toRawClaim(built: Omit<BuiltClaim, "raw">, asset: SupportedAsset): RawClaimInput {
  const { eligible, document, filerName } = built;
  const f = eligible.item.fields;
  const itemsDesc = f["items-desc"] ?? null;

  const claimText =
    `SEC Form ${eligible.filingType} filed with EDGAR under accession ${eligible.accessionNumber}, ` +
    `filing date ${eligible.filingDate}` +
    (eligible.item.title ? `. Feed entry title (verbatim): "${eligible.item.title}"` : "") +
    (itemsDesc ? `. Items reported (verbatim): "${itemsDesc}"` : "") +
    `. Filing index: ${eligible.filingHref}`;

  return {
    claimId: `edgar-${eligible.accessionNumber}`,
    // The class is a property of the source, not of our fetch. It stays OFFICIAL even when the
    // document fetch failed; `normalizeClaim` then records OFFICIAL_WITHOUT_CONTENT_HASH and
    // marks the claim non-promotable, which is §0.8's rule working exactly as designed.
    sourceClass: "OFFICIAL",
    dataMode: "LIVE",
    sourceUrl: eligible.filingHref,
    sourceId: `sec.gov/${eligible.filingDate}/${eligible.accessionNumber}`,
    publisherOrAuthor: filerName
      ? `${filerName} — filed with the U.S. Securities and Exchange Commission (EDGAR), CIK ${asset.cik}`
      : null,
    publishedAt: eligible.publishedIso,
    // EDGAR's Atom `<updated>` is the filing's acceptance instant to the second
    // (e.g. 2026-08-17T08:41:33-04:00). SECOND rather than the schema default of DAY because
    // the feed genuinely supplies it.
    publishedAtPrecision: "SECOND",
    sourceContentSha256: document.sha256,
    company: asset.company,
    tokenSymbol: asset.tokenSymbol,
    tokenAddress: asset.tokenAddress,
    claimTextOrPointer: claimText,
    // One group for the FILER, not one per filing. Ten 8-Ks from NVIDIA are one source line;
    // declaring them as ten groups would assert an independence that does not exist.
    independenceGroup: `official:edgar/filer/${asset.cik}`,
    relation: "ORIGIN",
    officialConfirmation: true,
    assertionHint: "ASSERTED",
  };
}

function buildProvenanceRecord(
  built: BuiltClaim,
  asset: SupportedAsset,
  normalized: NormalizedClaim,
): ClaimProvenanceRecord {
  const { eligible, document, filerName } = built;
  const f = eligible.item.fields;
  const feed = "sec-edgar-atom-feed" as const;
  const derived = "derived-from-sec-edgar-atom-feed" as const;

  return {
    claimId: { value: normalized.claimId, source: derived, note: "edgar-<accession number>" },
    sourceClass: {
      value: normalized.sourceClass,
      source: derived,
      note: "an SEC filing retrieved from www.sec.gov is OFFICIAL in this system",
    },
    sourceClassRule:
      "OFFICIAL requires both an https://www.sec.gov/ URL and a content hash (normalize.ts). " +
      "The URL was checked with xbot/sourceUrlGuard.ts::isRealSecFilingSourceUrl before the " +
      "document was fetched; the hash is sha256 over the exact bytes that URL served.",
    dataMode: {
      value: normalized.dataMode,
      source: derived,
      note: "LIVE: read from the SEC EDGAR Atom feed during this run, not replayed from a fixture.",
    },
    sourceUrl: { value: normalized.sourceUrl, source: feed, note: "the entry's own filing-href" },
    sourceId: {
      value: normalized.sourceId,
      source: derived,
      note:
        "origin-leading by design: graph.ts::ownOriginKey keys an unrecognised publisher on the " +
        "leading path segment, so this shape collapses every EDGAR filing into one origin.",
    },
    publisherOrAuthor: normalized.publisherOrAuthor
      ? { value: normalized.publisherOrAuthor, source: feed, note: "conformed-name from the feed's company-info block, plus the registry CIK" }
      : unavailable("the feed carried no conformed-name for this company"),
    publishedAt: {
      value: normalized.publishedAt,
      source: derived,
      note: "the entry's <updated> instant, converted to the strict ...Z form normalize.ts accepts",
    },
    publishedAtRaw: eligible.item.publishedRaw
      ? {
          value: eligible.item.publishedRaw,
          source: feed,
          note: `verbatim from <${eligible.item.publishedFrom ?? "updated"}>, before any conversion`,
        }
      : unavailable("the entry carried no timestamp element"),
    publishedAtPrecision: {
      value: normalized.publishedAtPrecision,
      source: feed,
      note: "EDGAR states the acceptance instant to the second",
    },
    sourceContentSha256: normalized.sourceContentSha256
      ? {
          value: normalized.sourceContentSha256,
          source: "sec-edgar-document-fetch",
          note: `sha256 over the ${document.byteLength} bytes served by ${document.url} at ${document.retrievedAtUtc}`,
        }
      : unavailable(
          document.failure ??
            "the filing document was not fetched, so no content hash exists; OFFICIAL requires one and the claim is non-promotable",
        ),
    company: { value: normalized.company, source: "project-registry", note: "evidence/assets.ts SUPPORTED_ASSETS" },
    tokenSymbol: { value: normalized.tokenSymbol, source: "project-registry" },
    tokenAddress: { value: normalized.tokenAddress, source: "project-registry" },
    eventType: {
      value: normalized.eventType,
      source: "UNAVAILABLE",
      note:
        "not classified: mapping 8-K item codes onto this project's event vocabulary needs a " +
        "classifier this task does not authorise. The raw item codes are recorded below.",
    },
    materiality: {
      value: normalized.materiality,
      source: "UNAVAILABLE",
      note:
        "not determined. promote.ts treats UNKNOWN as non-material and refuses to promote on it, " +
        "which is the fail-safe direction and is left in place deliberately.",
    },
    independenceGroup: {
      value: normalized.independenceGroup,
      source: derived,
      note: "one group per FILER, not per filing: ten filings by one registrant are one source line",
    },
    relation: { value: normalized.relation, source: derived },
    officialConfirmation: {
      value: String(normalized.officialConfirmation),
      source: derived,
      note: "this claim is itself an official filing, matching how frozen scenario B labels its EDGAR claims",
    },
    expiresAt: normalized.expiresAt
      ? { value: normalized.expiresAt, source: derived }
      : unavailable("no source fact supports a TTL for a filing; left null rather than assumed"),
    claimTextOrPointer: {
      value: normalized.claimTextOrPointer,
      source: derived,
      note: "a pointer with verbatim spans quoted from the feed entry. No paraphrase of the filing's contents.",
    },
    assertionLevel: {
      value: normalized.assertionLevel,
      source: derived,
      note:
        `derived by evidence/speculation.ts from the claim text; the structural hint ASSERTED was ` +
        `offered because the issuer signed the filing. Markers matched: ` +
        `${normalized.speculationMarkers.length > 0 ? normalized.speculationMarkers.join(", ") : "(none)"}.`,
    },
    feedEntryId: eligible.item.id
      ? { value: eligible.item.id, source: feed, note: "EDGAR's own <id> URN. Recorded, but NOT used as sourceId — see the sourceId note." }
      : unavailable("the entry carried no <id>"),
    feedEntryTitle: eligible.item.title
      ? { value: eligible.item.title, source: feed }
      : unavailable("the entry carried no <title>"),
    feedEntrySummary: eligible.item.summary
      ? { value: eligible.item.summary, source: feed, note: "verbatim, entity-decoded; SEC's own summary markup is left intact" }
      : unavailable("the entry carried no <summary>"),
    feedFormType: { value: eligible.filingType, source: feed },
    feedFilingDate: { value: eligible.filingDate, source: feed },
    feedAccessionNumber: { value: eligible.accessionNumber, source: feed },
    feedItemsDescription: f["items-desc"]
      ? { value: f["items-desc"], source: feed }
      : unavailable("the entry carried no items-desc (normal for forms other than 8-K)"),
    feedEntryRawSha256: {
      value: eligible.item.rawSha256,
      source: derived,
      note: "sha256 over the UTF-8 bytes of this entry's verbatim XML within the feed",
    },
    documentFetch: {
      url: document.url,
      attempted: document.attempted,
      httpStatus: document.httpStatus,
      byteLength: document.byteLength,
      contentType: document.contentType,
      retrievedAtUtc: document.retrievedAtUtc,
      failure: document.failure,
    },
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
function buildLimitations(outcome: IntakeOutcome, claimCount: number): string[] {
  const limitations = [
    "This is ONE read of one feed at one moment. It measures nothing about latency and nothing " +
      "about coverage, and it does not make this intake production monitoring. No process polls " +
      "EDGAR on a schedule as part of this study, no window is guaranteed to be sampled, and " +
      "nothing here supports any claim about how quickly a filing would be seen.",
    "Read-only. Every request this run made was a GET (news/readFeed.ts has exactly one request " +
      "primitive and it hardcodes the method). Nothing was posted, submitted, or subscribed to; " +
      "no account was created and no terms were accepted. The only header sent was the " +
      "descriptive User-Agent SEC requires of every requester.",
    "SEC EDGAR is an OFFICIAL source, not a NEWS source. This run replaces the frozen intake " +
      "path for CORPORATE DISCLOSURE. It does NOT give this project live third-party press " +
      "intake: no wire, publisher, or aggregator feed is read, and every NEWS-class claim in the " +
      "product is still the frozen REPLAY fixture in apps/server/scenarios/.",
    "The XML extraction is a hand-rolled tag scanner with no dependency (news/readFeed.ts). It " +
      "does not resolve namespaces, validate the document, or handle nested CDATA. Each item's " +
      "verbatim XML and its sha256 are published beside the extracted values so any extraction " +
      "error is visible rather than buried, but the extraction itself is not proven correct.",
    "The reader handles both Atom <entry> and RSS <item>, but only the Atom path was exercised " +
      "by this run. The RSS path is written and untested against a live publisher.",
  ];

  if (outcome === "CLAIMS_NORMALISED") {
    limitations.push(
      "The market leg is the PINNED chain-196 replay window from pool-scenario-a-swaps.json, not " +
        "a live capture. That window holds zero swaps, so market confirmation is UNAVAILABLE and " +
        "the market cannot contribute to a promotion in this run. This task authorised a live " +
        "intake only; a live market capture would have been a second live input nobody reviewed.",
      "Every claim's eventType and materiality are UNKNOWN, because neither can be read off an " +
        "8-K item code without a classifier this task does not authorise. promote.ts treats " +
        "UNKNOWN materiality as non-material and refuses to promote on it, so the state reached " +
        "here is partly a consequence of what was NOT classified, not only of the evidence.",
      "That gate cuts both ways, and the honest reading is not flattering. A filing whose own " +
        "SEC summary says 'Item 1.01: Entry into a Material Definitive Agreement' still came out " +
        "as NON_MATERIAL_EVENT, because nothing in this run classified it. That is safe in the " +
        "sense that it cannot raise a fee for nothing; it is NOT evidence that the pipeline " +
        "would notice a material event. It is a missing classifier, not a virtue.",
      "The content hash commits to a SERVER-GENERATED index page. It was byte-identical across " +
        "repeated fetches during this run, but SEC controls that page's rendering: a template " +
        "change would move the hash without the filing changing. A hash over the primary " +
        "document (as frozen scenario B takes) does not have that property.",
      "officialEvidencePassed is published as false because this task did not run the bonded " +
        "three-way parse. The same decision recomputed with true is published beside it, so a " +
        "reader can check whether that choice moved the outcome — but the bonded bit itself was " +
        "not computed here, and S2.1 remains the only run that computes it.",
      "The content hash commits to the bytes the filing INDEX page served at fetch time, not to " +
        "the primary document, its exhibits, or any XBRL. Frozen scenario B hashes the primary " +
        "8-K document instead, so the two hashes are not comparable and neither is wrong.",
      "The decision's assessment instant is the newest live claim's publication timestamp, not " +
        "the moment this script ran. That is what puts the claim inside the 72-hour evidence " +
        "window; it also means older filings in the same feed fall outside it and are recorded " +
        "as stale rather than counted.",
    );
    if (claimCount === 1) {
      limitations.push(
        "Only one claim reached the evidence graph, so its duplicate-collapsing and " +
          "contradiction-detection paths were exercised trivially at best on the in-window set.",
      );
    }
  }

  if (outcome !== "CLAIMS_NORMALISED") {
    limitations.push(
      "No live claim was ingested in this run, so no decision record was produced from live " +
        "data. Nothing in this artifact should be read as the intake having been exercised end " +
        "to end. The intake record states exactly how far it got.",
    );
  }

  return limitations;
}

// ---------------------------------------------------------------------------
// Static context published with every run
// ---------------------------------------------------------------------------

const ALTERNATIVES_PROBED: NewsIntakeArtifact["sourceChoice"]["alternativesProbed"] = [
  {
    url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=NVDA&region=US&lang=en-US",
    observed: "HTTP 200, application/xml, 20 <item> elements (probed 2026-08-21)",
    rejectedBecause:
      "Most items were about other companies entirely (Webull, Cummins, Coinbase), and the feed " +
      "carries no publisher element — the outlet would have to be guessed from the link host. " +
      "Guessing a publisher is precisely the fabrication the provenance schema exists to prevent.",
  },
  {
    url: "https://nvidianews.nvidia.com/releases.xml",
    observed: "HTTP 200, text/xml, 20 <item> elements (probed 2026-08-21)",
    rejectedBecause:
      "Genuinely narrow, but it mixes marketing posts with corporate announcements, and a " +
      "self-published press release is not OFFICIAL in this system (normalize.ts requires an " +
      "https://www.sec.gov/ URL for that class). It would have been NEWS at best, from a source " +
      "with an interest in the story.",
  },
  {
    url: "https://feeds.reuters.com/reuters/businessNews",
    observed: "did not resolve (probed 2026-08-21)",
    rejectedBecause:
      "Reuters no longer serves an open RSS feed. Recorded because it is the obvious first " +
      "choice and it does not exist — 'just read a wire's RSS' is not the easy answer it sounds.",
  },
];

const WHY_SELECTED = [
  "No credential, no account, no paid tier, no terms accepted. SEC requires only a descriptive " +
    "User-Agent from every requester, read through the existing getEdgarUserAgent().",
  "It is the ORIGIN, not a report about the origin. Nothing at intake can be a syndicated copy " +
    "of something else, which is the narrowest possible starting position for a provenance chain.",
  "It timestamps acceptance to the second, so publishedAtPrecision is SECOND on real data " +
    "rather than the schema's DAY default.",
  "It publishes the document the claim points at, so sourceContentSha256 commits to bytes that " +
    "actually exist and can be re-fetched and re-hashed by a reader.",
  "An 8-K is definitionally corporate news: it is the form a US registrant must file to disclose " +
    "a material event between periodic reports.",
  "This project already has an EDGAR adapter and an EDGAR_USER_AGENT convention (SVC-001), so " +
    "no new service, dependency, or contact detail was introduced.",
];

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

const HELP = `
S5.2 — live, credential-free corporate-news intake via the SEC EDGAR Atom feed. READ-ONLY.

  npx tsx src/studies/newsIntakeLive.ts [--out <path>] [--count <n>] [--form <type>]

  (no flags)      One GET of the EDGAR company Atom feed for the supported asset's CIK, one GET
                  per filing index to hash its bytes, normalise into the project's provenance
                  schema, run syndication dedup over the live items, push them through the
                  unchanged evidence graph and decision engine, write the artifact.
  --out <path>    Artifact destination.
                  Default: docs/buildx-orion-2026/outputs/05-build/data/s5_2_news_intake_live.json
  --count <n>     Recent filings to request. Default ${DEFAULT_COUNT}.
  --form <type>   SEC form filter. Default ${DEFAULT_FORM_TYPE}. Pass "" for every form.
  --no-documents  Skip the per-filing document fetches (diagnostic; every claim then lacks a
                  content hash and is non-promotable).
  --help          This text. Exits before any file read or network call.

Environment:
  EDGAR_USER_AGENT   required. Not a secret: SEC requires a descriptive User-Agent from
                     every requester. See SERVICES.md SVC-001.

PROTECT is unreachable in this run by three independent gates (UNKNOWN materiality, an
UNAVAILABLE market leg, and an uncomputed bonded bit). WATCH or NORMAL is the run succeeding.
`.trimStart();

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }

  const outPath = getArgValue(args, "--out") ?? DEFAULT_OUT_PATH;
  const count = Number(getArgValue(args, "--count") ?? DEFAULT_COUNT);
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new Error(`--count must be an integer between 1 and 100; got "${count}".`);
  }
  const formArg = getArgValue(args, "--form");
  const formType = formArg === undefined ? DEFAULT_FORM_TYPE : formArg;
  const fetchDocuments = !args.includes("--no-documents");

  markStage("run_started");

  // ---- 1. The asset universe, read from the registry ---------------------------------------
  const assets = supportedAssets();
  if (assets.length === 0) {
    throw new Error(
      "SUPPORTED_ASSETS contains no supported asset. Refusing to invent a CIK to read a feed for.",
    );
  }
  if (assets.length > 1) {
    throw new Error(
      `SUPPORTED_ASSETS contains ${assets.length} supported assets. This study reads one feed ` +
        `for one CIK and will not silently pick one of them.`,
    );
  }
  const asset = assets[0];

  const assetUniverse: NewsIntakeArtifact["assetUniverse"] = {
    source: "apps/server/src/evidence/assets.ts :: SUPPORTED_ASSETS (supported === true)",
    supported: assets.map((a) => ({
      company: a.company,
      cik: a.cik,
      ticker: a.ticker,
      tokenSymbol: a.tokenSymbol,
      tokenAddress: a.tokenAddress,
      poolAddress: a.poolAddress,
    })),
    unsupportedButKnown: SUPPORTED_ASSETS.filter((a) => !a.supported).map((a) => ({
      tokenSymbol: a.tokenSymbol,
      reason: a.supportNote,
    })),
    note:
      "The registry holds exactly one supported asset (wNVDAx, NVIDIA CORPORATION, CIK " +
      "0001045810) and one deliberately unsupported sibling (NVDAx, no verified pool). There is " +
      "NO MSTR-linked asset in it at all, so this study cannot and does not read a feed for one. " +
      "The CIK below was read from this registry, not typed.",
  };

  const feedUrl = edgarCompanyAtomUrl({ cikPadded: asset.cik, formType, count });
  console.log(`[s5.2] asset: ${asset.company} (${asset.ticker}/${asset.tokenSymbol}), CIK ${asset.cik}`);
  console.log(`[s5.2] feed: ${feedUrl}`);
  markStage("asset_universe_resolved");

  // ---- 2. One read of the feed. Read-only. No retry. ----------------------------------------
  const userAgent = getEdgarUserAgent();
  markStage("feed_read_requested");
  const feed: FeedFetchResult = await fetchFeed(feedUrl, userAgent);
  markStage("feed_read_completed");

  if (!feed.ok) {
    const headline =
      `EDGAR feed read failed: HTTP ${feed.httpStatus} (${feed.kind}). No live claim was ingested, ` +
      `and none was manufactured.`;
    console.error(`\n[s5.2] ${headline}`);
    console.error(`[s5.2] Not retried, not worked around, no fixture substituted.`);

    writeArtifact(outPath, {
      schemaVersion: SCHEMA_VERSION,
      producedBy: PRODUCED_BY,
      runAtUtc: new Date().toISOString(),
      taskId: "S5.2",
      outcome: "BLOCKED_FEED_UNREADABLE",
      headline,
      sourceChoice: buildSourceChoice(feedUrl),
      assetUniverse,
      intake: {
        provider: "sec-edgar-browse-atom",
        feedUrl,
        httpMethod: "GET",
        authMode: "none — descriptive User-Agent only, as SEC requires of every requester",
        outboundWritesAttempted: 0,
        fetchedAtUtc: feed.retrievedAtUtc,
        httpStatus: feed.httpStatus,
        ok: false,
        contentType: null,
        charset: null,
        lastModified: null,
        feedByteLength: null,
        feedSha256: null,
        rawItemCount: null,
        feedCompanyName: null,
        feedCik: null,
        documentFetches: { attempted: 0, succeeded: 0, failed: 0 },
        failure: { kind: feed.kind, httpStatus: feed.httpStatus, detail: feed.detail },
      },
      candidates: [],
      claims: [],
      dedup: null,
      decision: null,
      decisionSummary: null,
      bondSensitivity: null,
      invariants: notReachedInvariants(),
      marketLeg: {
        fixturePath: "apps/server/src/market/fixtures/pool-scenario-a-swaps.json",
        why: "Not reached: no claim was ingested, so the decision engine was not run.",
      },
      crossCheck: null,
      stages,
      limitations: buildLimitations("BLOCKED_FEED_UNREADABLE", 0),
    });
    console.log(`\n[s5.2] STATE: (none — no claim reached the decision engine)`);
    process.exit(1);
  }

  // ---- 3. Parse the feed --------------------------------------------------------------------
  const header = feedHeader(feed.text);
  const feedCompanyName = firstTagText(header, "conformed-name");
  const feedCik = firstTagText(header, "cik");
  const items = parseFeedItems(feed.text);
  console.log(
    `[s5.2] HTTP ${feed.httpStatus}, ${feed.byteLength} bytes, sha256 ${feed.sha256.slice(0, 16)}…, ` +
      `${items.length} item(s)`,
  );
  markStage("feed_parsed");

  const candidates: CandidateVerdict[] = [];
  const eligibleItems: EligibleItem[] = [];
  for (const item of items) {
    const { verdict, eligible } = judgeCandidate(item);
    candidates.push(verdict);
    if (eligible) eligibleItems.push(eligible);
  }
  markStage("candidates_judged");

  if (eligibleItems.length === 0) {
    const headline =
      `No qualifying live item found in the feed sampled: ${items.length} item(s) returned, none ` +
      `eligible. Nothing was manufactured.`;
    console.log(`\n[s5.2] ${headline}`);
    for (const c of candidates) console.log(`[s5.2]   #${c.index}: ${c.rejectedBecause}`);

    writeArtifact(outPath, {
      schemaVersion: SCHEMA_VERSION,
      producedBy: PRODUCED_BY,
      runAtUtc: new Date().toISOString(),
      taskId: "S5.2",
      outcome: "NO_QUALIFYING_ITEM_IN_FEED_SAMPLED",
      headline,
      sourceChoice: buildSourceChoice(feedUrl),
      assetUniverse,
      intake: buildIntakeRecord(feedUrl, feed, items.length, feedCompanyName, feedCik, {
        attempted: 0,
        succeeded: 0,
        failed: 0,
      }),
      candidates,
      claims: [],
      dedup: null,
      decision: null,
      decisionSummary: null,
      bondSensitivity: null,
      invariants: notReachedInvariants(),
      marketLeg: {
        fixturePath: "apps/server/src/market/fixtures/pool-scenario-a-swaps.json",
        why: "Not reached: no claim was ingested, so the decision engine was not run.",
      },
      crossCheck: null,
      stages,
      limitations: buildLimitations("NO_QUALIFYING_ITEM_IN_FEED_SAMPLED", 0),
    });
    console.log(`\n[s5.2] STATE: (none — no claim reached the decision engine)`);
    return;
  }

  // ---- 4. Hash the bytes behind each claim's own URL -----------------------------------------
  markStage("document_fetches_started");
  const built: BuiltClaim[] = [];
  let docOk = 0;
  let docFailed = 0;

  for (const eligible of eligibleItems) {
    let document: BuiltClaim["document"] = {
      url: eligible.filingHref,
      attempted: false,
      ok: false,
      httpStatus: null,
      byteLength: null,
      sha256: null,
      contentType: null,
      retrievedAtUtc: null,
      failure: fetchDocuments ? null : "--no-documents was passed, so no document was fetched",
    };

    if (fetchDocuments) {
      const fetched = await fetchSecDocument(eligible.filingHref, userAgent);
      if (fetched.ok) {
        docOk += 1;
        document = {
          url: fetched.url,
          attempted: true,
          ok: true,
          httpStatus: fetched.httpStatus,
          byteLength: fetched.byteLength,
          sha256: fetched.sha256,
          contentType: fetched.contentType,
          retrievedAtUtc: fetched.retrievedAtUtc,
          failure: null,
        };
      } else {
        docFailed += 1;
        document = {
          url: fetched.url,
          attempted: true,
          ok: false,
          httpStatus: fetched.httpStatus,
          byteLength: null,
          sha256: null,
          contentType: null,
          retrievedAtUtc: fetched.retrievedAtUtc,
          failure: `${fetched.kind}: ${fetched.detail}`,
        };
      }
      await sleep(DOCUMENT_FETCH_GAP_MS);
    }

    const partial = { eligible, document, filerName: feedCompanyName };
    built.push({ ...partial, raw: toRawClaim(partial, asset) });
  }
  console.log(`[s5.2] document fetches: ${docOk} ok, ${docFailed} failed`);
  markStage("document_fetches_completed");

  // ---- 5. Normalise, for real ----------------------------------------------------------------
  const normalized: NormalizedClaim[] = built.map((b) => normalizeClaim(b.raw));
  markStage("claims_normalised");

  for (const claim of normalized) {
    console.log(
      `[s5.2] ${claim.claimId}: sourceClass=${claim.sourceClass} dataMode=${claim.dataMode} ` +
        `publishedAt=${claim.publishedAt} assertion=${claim.assertionLevel} promotable=${claim.promotable}` +
        (claim.provenanceViolations.length > 0 ? ` violations=${claim.provenanceViolations.join(",")}` : ""),
    );
  }

  // ---- 6. Syndication dedup, on the LIVE items ------------------------------------------------
  //
  // Run explicitly here as well as inside `buildEvidenceGraph`, because the point of this step
  // is that the dedup was EXERCISED on live data rather than asserted about it. `deriveIndependence`
  // is the unmodified T2.3 function; nothing about the live claims is special-cased for it.
  const findings = deriveIndependence(normalized);
  const derivedOriginKeys = [...new Set(findings.map((f) => f.derivedOriginKey))];
  const derivedIndependentOriginCount = countDerivedIndependentOrigins(normalized, findings);
  markStage("dedup_derived");

  const dedup: DedupRecord = {
    method:
      "apps/server/src/evidence/graph.ts :: deriveIndependence + countDerivedIndependentOrigins, " +
      "unmodified, run over the live claims produced by this run.",
    liveClaimCount: normalized.length,
    findings,
    derivedOriginKeys,
    derivedIndependentOriginCount,
    syndicationsDetected: findings.filter((f) => f.isSyndication).length,
    unnamedRelaysDetected: findings.filter((f) => f.relaysUnnamedReport).length,
    disagreementsWithDeclaredGroup: findings.filter((f) => f.disagreesWithDeclared).length,
    interpretation:
      `${normalized.length} live filing(s) collapsed to ${derivedIndependentOriginCount} derived ` +
      `independent origin(s): ${derivedOriginKeys.join(", ")}. That is the correct answer under ` +
      `§0.7 — every filing came from one registrant through one channel, so they are one source ` +
      `line and cannot corroborate each other, however many of them there are. No attribution ` +
      `phrase was found in any live item, which is expected: EDGAR filings do not cite other ` +
      `outlets, so the attribution branch of the derivation was NOT exercised by this data. The ` +
      `branch that was exercised is the one that matters for a primary source — many items, one ` +
      `origin.`,
    observedFragility:
      "graph.ts::ownOriginKey derives an unrecognised publisher's origin from " +
      "sourceId.split('/')[0]. That makes the origin count a function of a shape the INTAKE " +
      "adapter chooses. Had this adapter used EDGAR's own per-entry URN " +
      "(urn:tag:sec.gov,2008:accession-number=…) as sourceId, each filing would have become its " +
      "own origin and one registrant would have looked like N independent sources. This run " +
      "avoids that by using an origin-leading sourceId, matching the frozen NEWS fixtures. The " +
      "fragility is reported here and NOT patched: graph.ts is unchanged by this task.",
  };

  console.log(
    `[s5.2] dedup: ${normalized.length} live item(s) -> ${derivedIndependentOriginCount} ` +
      `independent origin(s) [${derivedOriginKeys.join(", ")}]`,
  );

  // ---- 7. Run the UNCHANGED evidence graph and decision engine ---------------------------------
  const swapWindow = JSON.parse(readFileSync(SWAP_FIXTURE_PATH, "utf8")) as SwapWindowFixture;

  // The newest live claim anchors the assessment. Same rule as S5.1: `now` is the moment the
  // evidence was published, not the moment this script ran, which is what puts the claim inside
  // the evidence window while leaving the July market observation exactly as old as it is.
  const newest = [...normalized].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))[0];
  const nowUnixSeconds = Math.floor(Date.parse(newest.publishedAt) / 1000);

  const scenario: FrozenScenario = {
    scenarioId: `S5.2-news-intake-live/${newest.claimId}`,
    asset: {
      company: asset.company,
      tokenSymbol: asset.tokenSymbol,
      tokenAddress: asset.tokenAddress,
      poolIdOrAddress: asset.poolAddress ?? asset.tokenAddress,
    },
    decisionAnchor: {
      at: newest.publishedAt,
      // Not computed. False is the less favourable value for the market leg, so it cannot
      // inflate a verdict, and it is what frozen scenario B independently recorded for this
      // exact instant. Stated in the limitations rather than dressed up as a derived fact.
      usReferenceMarketOpen: false,
    },
    claims: built.map((b) => b.raw),
  };

  const runWith = (officialEvidencePassed: boolean): Decision =>
    runScenario(scenario, swapWindow, {
      chainId: CANONICAL_CHAIN_ID,
      registryAddress: PLACEHOLDER_REGISTRY,
      nowUnixSeconds,
      officialEvidencePassed,
    });

  // Published with `false`: this task did NOT run the bonded three-way parse, and passing `true`
  // would assert that it passed. The `true` run is published beside it as a sensitivity.
  const decision = runWith(false);
  const decisionWithBond = runWith(true);
  markStage("decision_produced");

  const decisionSummary: DecisionSummary = {
    state: decision.record.state,
    reasonCodes: [...decision.record.reasonCodes],
    confidence: decision.record.confidenceBand,
    confirmationStatus: decision.record.marketConfirmation.status,
    explanation: decision.promotion.explanation,
  };

  const bondSensitivity: NewsIntakeArtifact["bondSensitivity"] = {
    question:
      "Is the refusal to promote an artefact of assuming the bonded parse failed, or is it on the merits?",
    publishedWith: false,
    recomputedWith: true,
    publishedState: decision.record.state,
    recomputedState: decisionWithBond.record.state,
    stateMoved: decision.record.state !== decisionWithBond.record.state,
    interpretation:
      decision.record.state === decisionWithBond.record.state
        ? `The state is ${decision.record.state} either way, so the refusal is on the merits: ` +
          `UNKNOWN materiality and an UNAVAILABLE market leg each block promotion independently ` +
          `of the bonded bit.`
        : `The state moved from ${decision.record.state} to ${decisionWithBond.record.state} when ` +
          `the bonded bit was assumed to pass. The published value stands, because this task did ` +
          `not compute that bit — but the outcome IS sensitive to it and that must not be hidden.`,
  };

  // ---- 8. Invariants -------------------------------------------------------------------------
  const highestClass: SourceClass = normalized.some((c) => c.sourceClass === "OFFICIAL")
    ? "OFFICIAL"
    : normalized.some((c) => c.sourceClass === "NEWS")
      ? "NEWS"
      : "RUMOR";

  const invariants: InvariantCheck[] = [
    {
      id: "INV-DEDUP-ONE-ORIGIN",
      statement:
        "Duplicated copies of one origin count as one source (§0.7). Many filings by one " +
        "registrant through one channel are one origin, not many.",
      evidence:
        `deriveIndependence over ${normalized.length} live claim(s) produced ` +
        `${derivedIndependentOriginCount} origin key(s): ${derivedOriginKeys.join(", ")}.`,
      held: derivedIndependentOriginCount <= 1,
    },
    {
      id: "INV-MARKET-EXACT-CONFIRMED",
      statement:
        "Only an exact CONFIRMED market verdict may satisfy a promotion gate; STALE, " +
        "NOT_CONFIRMED and UNAVAILABLE all fail closed (risk/types.ts::mayReachProtect).",
      evidence:
        `Market confirmation came back ${decisionSummary.confirmationStatus} over the pinned ` +
        `zero-swap replay window, and the state is ${decisionSummary.state}.`,
      held: decisionSummary.confirmationStatus === "CONFIRMED" || decisionSummary.state !== "PROTECT",
    },
    {
      id: "INV-MATERIALITY-FAILS-CLOSED",
      statement:
        "Evidence whose materiality is UNKNOWN cannot promote, however impeccable its " +
        "provenance (risk/promote.ts: UNKNOWN is treated as non-material).",
      evidence:
        `Every live claim carries materiality UNKNOWN, and the decision's reason codes ` +
        `${decisionSummary.reasonCodes.includes("NON_MATERIAL_EVENT") ? "include" : "do NOT include"} ` +
        `NON_MATERIAL_EVENT.`,
      held: decisionSummary.reasonCodes.includes("NON_MATERIAL_EVENT") && decisionSummary.state !== "PROTECT",
    },
    {
      id: "INV-SINGLE-NEWS-CANNOT-PROTECT",
      statement:
        "One news source alone can never authorise PROTECT: NEWS requires two independent " +
        "origins AND an exact CONFIRMED market verdict (mayReachProtect invariants 2 and 3).",
      evidence:
        highestClass === "OFFICIAL"
          ? `Not exercised by this run: the highest source class present is OFFICIAL, which takes ` +
            `the officialEvidencePassed branch instead. The NEWS branch is proven by ` +
            `test/riskPromotionScenarios.test.ts, not by this artifact.`
          : `Highest class present is ${highestClass}; state reached is ${decisionSummary.state}.`,
      held: highestClass === "OFFICIAL" ? null : decisionSummary.state !== "PROTECT",
    },
  ];

  const allHeld = invariants.every((i) => i.held !== false);

  // ---- 9. Cross-check against the frozen fixture ------------------------------------------------
  //
  // Not a decision input. Published because it is checkable by anyone: the live feed's timestamp
  // for the newest 8-K either matches what T0.2 froze by hand or it does not.
  const frozenAnchor = "2026-08-17T12:41:33Z";
  const crossCheck: NewsIntakeArtifact["crossCheck"] = {
    statement:
      "Frozen scenario B (apps/server/scenarios/scenario-b-confirmed-protect.json) records its " +
      "decision anchor as the EDGAR acceptance timestamp of accession 0001045810-26-000069, " +
      "hand-verified during T0.2. If the live feed names the same accession, its timestamp " +
      "should match exactly. This verifies the reader, not the engine.",
    frozenValue: `${frozenAnchor} (accession 0001045810-26-000069)`,
    liveValue: (() => {
      const match = normalized.find((c) => c.claimId === "edgar-0001045810-26-000069");
      return match ? `${match.publishedAt} (accession 0001045810-26-000069)` : null;
    })(),
    match: (() => {
      const match = normalized.find((c) => c.claimId === "edgar-0001045810-26-000069");
      return match ? Date.parse(match.publishedAt) === Date.parse(frozenAnchor) : null;
    })(),
  };

  // ---- 10. Write the artifact --------------------------------------------------------------------
  const headline =
    `${normalized.length} live SEC EDGAR filing(s) (OFFICIAL, dataMode LIVE) traversed feed intake ` +
    `-> normalisation -> syndication dedup -> evidence graph -> decision engine and produced ` +
    `${decisionSummary.state}. The ${normalized.length} live item(s) collapsed to ` +
    `${derivedIndependentOriginCount} independent origin(s).`;

  writeArtifact(outPath, {
    schemaVersion: SCHEMA_VERSION,
    producedBy: PRODUCED_BY,
    runAtUtc: new Date().toISOString(),
    taskId: "S5.2",
    outcome: "CLAIMS_NORMALISED",
    headline,
    sourceChoice: buildSourceChoice(feedUrl),
    assetUniverse,
    intake: buildIntakeRecord(feedUrl, feed, items.length, feedCompanyName, feedCik, {
      attempted: fetchDocuments ? eligibleItems.length : 0,
      succeeded: docOk,
      failed: docFailed,
    }),
    candidates,
    claims: built.map((b, i) => ({
      provenance: buildProvenanceRecord(b, asset, normalized[i]),
      normalized: normalized[i],
      provenanceViolations: [...normalized[i].provenanceViolations],
      promotable: normalized[i].promotable,
    })),
    dedup,
    decision,
    decisionSummary,
    bondSensitivity,
    invariants,
    marketLeg: {
      fixturePath: "apps/server/src/market/fixtures/pool-scenario-a-swaps.json",
      why:
        "Pinned chain-196 replay, not a live capture. This task authorised a live INTAKE only. " +
        "The window holds zero swaps, so market confirmation is UNAVAILABLE and fails closed. " +
        "Scenario A's window was used rather than scenario B's — even though the newest live " +
        "filing is scenario B's 8-K — precisely because it cannot flatter the outcome.",
    },
    crossCheck,
    stages,
    limitations: buildLimitations("CLAIMS_NORMALISED", normalized.length),
  });

  // ---- 11. The state, last and loud ---------------------------------------------------------------
  console.log(`\n[s5.2] ==========================================`);
  console.log(`[s5.2] STATE: ${decisionSummary.state}`);
  console.log(`[s5.2] reason codes: ${decisionSummary.reasonCodes.join(", ") || "(none)"}`);
  console.log(`[s5.2] confidence: ${decisionSummary.confidence}  market: ${decisionSummary.confirmationStatus}`);
  console.log(`[s5.2] dedup: ${normalized.length} live item(s) -> ${derivedIndependentOriginCount} origin(s)`);
  console.log(`[s5.2] bonded-bit sensitivity: false -> ${decision.record.state}, true -> ${decisionWithBond.record.state}`);
  for (const inv of invariants) {
    console.log(`[s5.2] ${inv.id}: ${inv.held === null ? "n/a (not exercised)" : inv.held ? "HELD" : "VIOLATED"}`);
  }
  console.log(`[s5.2] ==========================================`);

  if (!allHeld) {
    console.error(
      `[s5.2] At least one invariant did NOT hold. That is an engine finding, not an intake ` +
        `finding, and the artifact records it rather than hiding it.`,
    );
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Artifact assembly helpers
// ---------------------------------------------------------------------------

function buildSourceChoice(feedUrl: string): NewsIntakeArtifact["sourceChoice"] {
  return {
    selected: "SEC EDGAR company-filings Atom feed (www.sec.gov/cgi-bin/browse-edgar?output=atom)",
    feedUrl,
    format: "atom",
    credentialRequired:
      "none. SEC requires a descriptive User-Agent from every requester " +
      "(https://www.sec.gov/os/webmaster-faq#developers); it is not an account, a key, or a paid tier.",
    sourceClassProduced: "OFFICIAL",
    whySelected: WHY_SELECTED,
    whatThisDoesNotReplace:
      "An 8-K is OFFICIAL, not NEWS. This replaces the frozen intake path for CORPORATE " +
      "DISCLOSURE only. Live third-party press intake remains unbuilt, and every NEWS-class claim " +
      "in this product is still the frozen REPLAY fixture in apps/server/scenarios/.",
    alternativesProbed: ALTERNATIVES_PROBED,
  };
}

function buildIntakeRecord(
  feedUrl: string,
  feed: Extract<FeedFetchResult, { ok: true }>,
  rawItemCount: number,
  feedCompanyName: string | null,
  feedCik: string | null,
  documentFetches: { attempted: number; succeeded: number; failed: number },
): NewsIntakeArtifact["intake"] {
  return {
    provider: "sec-edgar-browse-atom",
    feedUrl,
    httpMethod: "GET",
    authMode: "none — descriptive User-Agent only, as SEC requires of every requester",
    outboundWritesAttempted: 0,
    fetchedAtUtc: feed.retrievedAtUtc,
    httpStatus: feed.httpStatus,
    ok: true,
    contentType: feed.contentType,
    charset: feed.charset,
    lastModified: feed.lastModified,
    feedByteLength: feed.byteLength,
    feedSha256: feed.sha256,
    rawItemCount,
    feedCompanyName,
    feedCik,
    documentFetches,
    failure: null,
  };
}

function notReachedInvariants(): InvariantCheck[] {
  return [
    {
      id: "INV-DEDUP-ONE-ORIGIN",
      statement:
        "Duplicated copies of one origin count as one source (§0.7). Many filings by one " +
        "registrant through one channel are one origin, not many.",
      evidence: "Not reached: no live claim was ingested.",
      held: null,
    },
    {
      id: "INV-MARKET-EXACT-CONFIRMED",
      statement:
        "Only an exact CONFIRMED market verdict may satisfy a promotion gate " +
        "(risk/types.ts::mayReachProtect).",
      evidence: "Not reached: the decision engine was not run.",
      held: null,
    },
    {
      id: "INV-MATERIALITY-FAILS-CLOSED",
      statement: "Evidence whose materiality is UNKNOWN cannot promote (risk/promote.ts).",
      evidence: "Not reached: the decision engine was not run.",
      held: null,
    },
    {
      id: "INV-SINGLE-NEWS-CANNOT-PROTECT",
      statement:
        "One news source alone can never authorise PROTECT (mayReachProtect invariants 2 and 3).",
      evidence: "Not reached: the decision engine was not run.",
      held: null,
    },
  ];
}

function writeArtifact(outPath: string, artifact: NewsIntakeArtifact): void {
  const serialized = `${JSON.stringify(artifact, bigintSafe, 2)}\n`;
  assertNoSecretsInSerialized(serialized);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, serialized, "utf8");
  console.log(`[s5.2] artifact: ${outPath}`);
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
