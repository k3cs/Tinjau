/**
 * Deterministic promotion engine (task T1.2).
 *
 * This module decides `NORMAL` / `WATCH` / `PROTECT`. It contains no model call, no network
 * call, no clock read, and no randomness: every input arrives as an argument and the same
 * input always produces the same output. That is what makes the AI/contract trust boundary
 * in tracker §0.6 real — AI may shape the evidence graph, but the transition itself is a
 * pure function anyone can re-run and audit.
 *
 * The §0.7 invariants this file is responsible for:
 *
 *   1. rumour-only evidence never exceeds WATCH, whatever the market says;
 *   2. one news origin alone never authorises PROTECT, however many outlets reprinted it;
 *   3. duplicated syndications of one origin count once;
 *   4. non-official PROTECT needs >= 2 independent origins AND fresh market confirmation;
 *   5. stale, missing, or conflicting market data can never CREATE a new PROTECT;
 *   6. missing data does NOT cancel an already-active PROTECT — it runs its bounded course;
 *   7. WATCH expires if it is not refreshed.
 *
 * Invariant 6 is the one that is easy to get backwards. "Fail closed" means refusing to
 * *start* protection without evidence; it does not mean tearing down protection that is
 * already running because a data feed hiccuped. Cancelling early would hand an attacker a
 * way to disable the pool's defence by degrading one input.
 */

import {
  REASON_BITS,
  encodeReasonCodes,
  mayReachProtect,
  type ConfidenceBand,
  type ConfirmationStatus,
  type ReasonCode,
  type RiskState,
  type SourceClass,
} from "./types.js";
import { FROZEN_PROMOTION_CONFIG, type PromotionConfig } from "./promotionConfig.js";

export interface EvidenceClaim {
  claimId: string;
  sourceClass: SourceClass;
  /** Syndicated copies of one origin share this. Counting these is how independence is counted. */
  independenceGroup: string;
  relation: "ORIGIN" | "SUPPORTS" | "CONTRADICTS" | "DUPLICATE";
  /** Epoch seconds. */
  publishedAt: number;
  /** Whether an official document confirms this claim. */
  officialConfirmation: boolean;
  /**
   * Whether the underlying event is material to LP risk at all.
   *
   * Provenance and materiality are separate axes and must stay separate. A Section 16
   * insider Form 4 is a genuine SEC filing — impeccable provenance — that reports no
   * corporate action affecting obligations, solvency, or listing status. Treating
   * "official" as "worth protecting against" would raise LP fees on routine paperwork.
   *
   * Omitted means `UNKNOWN`, which is treated as not promotable. An event nobody has
   * classified is not an event we act on.
   */
  materiality?: "MATERIAL" | "NON_MATERIAL" | "UNKNOWN";
  /**
   * True when this source line has materially revised its own quantitative claim inside the
   * evidence window. See `SELF_REVISION_RULE` below for why this matters.
   */
  selfRevised?: boolean;
  /**
   * Whether this claim may add to the independent-origin count. Defaults to true.
   *
   * Several distinct facts can disqualify a claim from corroborating, and they are NOT the
   * same thing as self-revision:
   *   - the source line revised its own figure          -> `selfRevised`
   *   - the claim disclaimed its own independence       -> a headline ending "- report"
   *   - the claim's provenance is incomplete            -> `promotable === false`
   *
   * T2.4's evaluation found that without this field the last two had nowhere to go, so a
   * caller had to overload `selfRevised` to express them. Worse, a caller that did NOT
   * overload it let evidence which had explicitly disclaimed its own independence count as a
   * full independent origin — and that flipped a WATCH into a PROTECT. The field exists so
   * each fact travels under its own name and none of them can be silently dropped.
   */
  contributesIndependentOrigin?: boolean;
}

export interface MarketConfirmationInput {
  status: ConfirmationStatus;
  /** Epoch seconds when the observation was taken. */
  observedAt: number;
}

export interface PromotionInput {
  claims: readonly EvidenceClaim[];
  marketConfirmation: MarketConfirmationInput;
  /** Epoch seconds. Passed in, never read from a clock, so results are reproducible. */
  now: number;
  /** The state currently recorded for this asset, and when its protection began. */
  currentState: RiskState;
  currentProtectStartedAt?: number;
  /** When the most recent PROTECT ended, for cooldown. */
  lastProtectEndedAt?: number;
  /**
   * The deterministic company -> token -> pool resolution, passed through verbatim.
   *
   * Previously this arrived as two booleans (`assetSupported`, `entityResolved`), which forced
   * every caller to flatten four distinct outcomes onto two bits — and the record then
   * misdescribed why it had refused. Taking the outcome itself lets the reason code say what
   * actually happened, which is what §0.12 means by a record that explains itself.
   */
  resolutionOutcome: "RESOLVED" | "AMBIGUOUS" | "UNSUPPORTED_ASSET" | "UNKNOWN_COMPANY";
  /** Whether the bonded parse-agreement path passed. Only meaningful for OFFICIAL evidence. */
  officialEvidencePassed: boolean;
  config?: PromotionConfig;
}

export interface PromotionResult {
  state: RiskState;
  reasonCodes: ReasonCode[];
  /** The on-chain uint32 bitmask form of `reasonCodes`. */
  reasonBits: number;
  confidenceBand: ConfidenceBand;
  /** Epoch seconds. */
  expiresAt: number;
  policyVersion: string;
  /** Plain-language sentence explaining the decision. Never the basis for any logic. */
  explanation: string;
  /** Diagnostics, so a reviewer can see what the engine counted without re-deriving it. */
  independentSourceCount: number;
  highestSourceClass: SourceClass | null;
  aggressiveFeeAuthorized: boolean;
}

/**
 * THE SELF-REVISION RULE — decided by T1.2, frozen before any market data was scored.
 *
 * T0.2 §5 left this open: does a source line that revised its own headline figure count as
 * self-contradicting, and does that cap promotion even when a second independent origin
 * agrees on the direction of the story?
 *
 * Decision: a source line that has materially revised its own quantitative claim inside the
 * evidence window MAY still support a WATCH, but MAY NOT be counted toward the two
 * independent sources that non-official PROTECT requires.
 *
 * The reasoning is about what the two-source rule is *for*. It exists to establish that a
 * fact is corroborated. A source that has demonstrably been wrong about the magnitude of
 * that very fact within the window has not established the fact — it has established that
 * the number is still moving. Acting on an unsettled number is precisely the case the
 * bounded-action discipline is meant to prevent.
 *
 * Two properties keep this from being a result-driven rule:
 *
 *   - It is threshold-free. There is no ratio to tune, so it cannot be fitted to a scenario.
 *     Any material self-revision disqualifies, full stop.
 *   - It is strictly conservative. It can only ever block promotion, never enable it, so it
 *     cannot be used to manufacture a favourable benchmark result.
 *
 * It also generalises to the common pattern in breaking financial news, where an early
 * figure is corrected within days. That is exactly when a pool should wait for the filing.
 */
const SELF_REVISION_RULE = "self-revised source lines cannot count toward independent corroboration";

function highestClassOf(claims: readonly EvidenceClaim[]): SourceClass | null {
  let best: SourceClass | null = null;
  for (const c of claims) {
    if (c.sourceClass === "OFFICIAL") return "OFFICIAL";
    if (c.sourceClass === "NEWS") best = "NEWS";
    else if (c.sourceClass === "RUMOR" && best === null) best = "RUMOR";
  }
  return best;
}

/**
 * Counts genuinely independent origins.
 *
 * Two rules do the work here, and both are §0.7 invariants rather than heuristics:
 *   - claims are grouped by `independenceGroup`, so five outlets reprinting one wire story
 *     count once;
 *   - a group is disqualified if ANY claim in it is self-revised.
 *
 * That second rule is deliberately group-wide. A revision is a property of the SOURCE LINE,
 * not of one article: `independenceGroup` is exactly that line, and the syndications inside
 * it are reprints of the same reporting. Letting a wire copy of a revised story count while
 * the revised original does not would restore the corroboration the rule exists to withhold.
 */
function countIndependentSources(claims: readonly EvidenceClaim[]): number {
  const groups = new Map<string, { usable: boolean; disqualified: boolean }>();
  for (const c of claims) {
    if (c.sourceClass === "RUMOR") continue; // rumours never corroborate
    const entry = groups.get(c.independenceGroup) ?? { usable: false, disqualified: false };

    // Group-wide, because a revision belongs to the SOURCE LINE rather than to one article.
    if (c.selfRevised) entry.disqualified = true;

    // Per-claim, because a single relayed headline does not taint an origin's other reporting.
    // A claim that cannot contribute simply does not count itself.
    if (c.contributesIndependentOrigin !== false) entry.usable = true;

    groups.set(c.independenceGroup, entry);
  }
  let count = 0;
  for (const entry of groups.values()) if (entry.usable && !entry.disqualified) count += 1;
  return count;
}

function confidenceFor(
  state: RiskState,
  highestClass: SourceClass | null,
  independentSources: number,
  contradicted: boolean,
): ConfidenceBand {
  if (state === "NORMAL") return "LOW";
  if (contradicted) return "LOW";
  if (highestClass === "OFFICIAL") return state === "PROTECT" ? "HIGH" : "MEDIUM";
  if (independentSources >= 2) return "MEDIUM";
  return "LOW";
}

export function promote(input: PromotionInput): PromotionResult {
  const config = input.config ?? FROZEN_PROMOTION_CONFIG;
  const reasons = new Set<ReasonCode>();

  // ---- 1. Discard evidence outside the recency window -----------------------------------
  const fresh = input.claims.filter(
    (c) => input.now - c.publishedAt <= config.evidenceWindowSec && c.publishedAt <= input.now,
  );
  if (fresh.length < input.claims.length) reasons.add("STALE_EVIDENCE");

  // ---- 2. Deterministic gates that precede any evidence reasoning ------------------------
  // Anything short of a clean resolution can never authorise an action, because we cannot say
  // which pool the action would even apply to. Each outcome records its own reason, so the
  // refusal explains itself rather than pointing at a pool that was never the problem.
  const hardBlocked = input.resolutionOutcome !== "RESOLVED";
  switch (input.resolutionOutcome) {
    case "UNSUPPORTED_ASSET":
      reasons.add("UNSUPPORTED_ASSET");
      break;
    case "AMBIGUOUS":
      reasons.add("AMBIGUOUS_ENTITY");
      break;
    case "UNKNOWN_COMPANY":
      reasons.add("UNKNOWN_COMPANY");
      break;
  }

  // Materiality gate. Evidence that describes no LP-relevant corporate action cannot promote
  // at all, however impeccable its provenance. `UNKNOWN` is treated as non-material, so an
  // unclassified event fails closed rather than inheriting the trust of its source.
  const material = fresh.filter((c) => c.materiality === "MATERIAL");
  const hasNonMaterialOnly = fresh.length > 0 && material.length === 0;
  if (hasNonMaterialOnly) reasons.add("NON_MATERIAL_EVENT");

  const highestClass = highestClassOf(fresh);
  const independentSources = countIndependentSources(material);
  const contradicted = fresh.some((c) => c.relation === "CONTRADICTS");
  const hasDuplicates = fresh.some((c) => c.relation === "DUPLICATE");
  const hasSelfRevised = fresh.some((c) => c.selfRevised);

  if (contradicted) reasons.add("CONTRADICTED");
  if (hasDuplicates) reasons.add("DUPLICATE_SYNDICATION");
  if (highestClass === "RUMOR") reasons.add("RUMOR_ONLY");
  if (highestClass === "OFFICIAL" && input.officialEvidencePassed) {
    reasons.add("OFFICIAL_FILING");
    reasons.add("BONDED_EVIDENCE_PASSED");
  }
  if (!fresh.some((c) => c.officialConfirmation)) reasons.add("NO_OFFICIAL_CONFIRMATION");

  // ---- 3. Market confirmation, with freshness applied here rather than trusted -----------
  const marketAge = input.now - input.marketConfirmation.observedAt;
  const marketIsFresh =
    marketAge >= 0 && marketAge <= config.marketFreshnessSec;

  // A CONFIRMED observation that is too old is downgraded to STALE. Freshness is decided
  // here, not accepted from the caller, so a stale sample cannot be relabelled upstream.
  let effectiveStatus: ConfirmationStatus = input.marketConfirmation.status;
  if (effectiveStatus === "CONFIRMED" && !marketIsFresh) effectiveStatus = "STALE";

  switch (effectiveStatus) {
    case "CONFIRMED":
      reasons.add("MARKET_CONFIRMED");
      break;
    case "NOT_CONFIRMED":
      reasons.add("MARKET_NOT_CONFIRMED");
      break;
    case "STALE":
      reasons.add("MARKET_DATA_STALE");
      break;
    case "UNAVAILABLE":
      reasons.add("MARKET_DATA_UNAVAILABLE");
      break;
  }

  // ---- 4. Cooldown ----------------------------------------------------------------------
  const inCooldown =
    input.lastProtectEndedAt !== undefined &&
    input.now - input.lastProtectEndedAt < config.cooldownSec;
  if (inCooldown) reasons.add("COOLDOWN_ACTIVE");

  // ---- 5. Invariant 6: an active PROTECT runs its bounded course --------------------------
  // Checked BEFORE any new promotion decision. Degraded market data must not be able to
  // cancel a protection that is already running, or degrading one feed becomes an attack
  // that disables the pool's defence.
  if (input.currentState === "PROTECT" && input.currentProtectStartedAt !== undefined) {
    const elapsed = input.now - input.currentProtectStartedAt;
    if (elapsed < config.maxProtectDurationSec) {
      const expiresAt = input.currentProtectStartedAt + config.maxProtectDurationSec;
      return finish(
        "PROTECT",
        reasons,
        confidenceFor("PROTECT", highestClass, independentSources, contradicted),
        expiresAt,
        config,
        independentSources,
        highestClass,
        "An existing bounded protection is still inside its maximum duration, so it continues " +
          "on its original expiry and decay schedule regardless of current data availability.",
      );
    }
    reasons.add("EXPIRED");
    reasons.add("DECAYED_TO_BASELINE");
  }

  // ---- 6. Can this evidence reach PROTECT at all? ------------------------------------------
  // Single predicate, shared with the contract, rather than a rule re-derived here.
  const eligible =
    !hardBlocked &&
    !inCooldown &&
    !hasNonMaterialOnly &&
    highestClass !== null &&
    mayReachProtect({
      highestClass,
      independentSources,
      confirmation: effectiveStatus,
      officialEvidencePassed: input.officialEvidencePassed,
    });

  if (eligible && !contradicted) {
    if (highestClass === "NEWS") reasons.add("TWO_INDEPENDENT_SOURCES");
    return finish(
      "PROTECT",
      reasons,
      confidenceFor("PROTECT", highestClass, independentSources, contradicted),
      input.now + config.maxProtectDurationSec,
      config,
      independentSources,
      highestClass,
      explainProtect(highestClass, independentSources),
    );
  }

  // ---- 7. Otherwise: WATCH if there is anything to watch, else NORMAL ---------------------
  if (fresh.length === 0) {
    return finish(
      "NORMAL",
      reasons,
      "LOW",
      input.now + config.watchExpirySec,
      config,
      independentSources,
      highestClass,
      "No unexpired evidence for this asset.",
    );
  }

  // Non-material evidence does not even warrant a WATCH. Routine filings arrive constantly;
  // if each one raised monitoring, WATCH would be the permanent state and would stop meaning
  // anything. The filing stays in the record, it just does not move the risk state.
  if (hasNonMaterialOnly) {
    return finish(
      "NORMAL",
      reasons,
      "LOW",
      input.now + config.watchExpirySec,
      config,
      independentSources,
      highestClass,
      "The only evidence in window reports no corporate action affecting obligations, solvency, " +
        "or listing status, so the risk state is unchanged. Official provenance does not by " +
        "itself make an event material.",
    );
  }

  // Anything short of the PROTECT bar, but with live evidence present, is a WATCH. Record
  // which specific bar was missed so the record explains itself.
  if (highestClass !== "RUMOR" && independentSources < config.minIndependentSourcesForNonOfficialProtect) {
    reasons.add("SINGLE_SOURCE");
  }

  return finish(
    "WATCH",
    reasons,
    confidenceFor("WATCH", highestClass, independentSources, contradicted),
    input.now + config.watchExpirySec,
    config,
    independentSources,
    highestClass,
    explainWatch(highestClass, independentSources, effectiveStatus, contradicted, hasSelfRevised, hardBlocked),
  );
}

function explainProtect(highestClass: SourceClass, independentSources: number): string {
  return highestClass === "OFFICIAL"
    ? "A qualifying official filing passed the bonded-evidence checks and the market independently " +
        "corroborated the move within the freshness bound, so a bounded fee action is authorised."
    : `${independentSources} independent non-official sources agree and the market independently ` +
        "corroborated the move within the freshness bound, so a bounded fee action is authorised.";
}

function explainWatch(
  highestClass: SourceClass | null,
  independentSources: number,
  status: ConfirmationStatus,
  contradicted: boolean,
  hasSelfRevised: boolean,
  hardBlocked: boolean,
): string {
  if (hardBlocked) {
    return "Monitoring raised, but the asset or its company-to-pool mapping is not resolved, so no " +
      "action can be authorised against a specific pool.";
  }
  if (highestClass === "RUMOR") {
    return "Rumour-only evidence raises monitoring but can never authorise the aggressive fee path, " +
      "however the market behaves.";
  }
  if (contradicted) {
    return "Sources conflict on a material field, so promotion is capped until an official document " +
      "settles the disagreement.";
  }
  if (hasSelfRevised && independentSources < 2) {
    return `Monitoring raised. A source line materially revised its own figure inside the evidence ` +
      `window, and ${SELF_REVISION_RULE}, leaving too few independent origins to authorise an action.`;
  }
  if (independentSources < 2) {
    return "Only one independent origin reported this. Additional outlets carrying the same story " +
      "are syndications of that origin, not corroboration.";
  }
  if (status !== "CONFIRMED") {
    return `Evidence would otherwise qualify, but market confirmation is ${status.toLowerCase().replace("_", " ")}, ` +
      "and a new protection is never started without a fresh, independent market observation.";
  }
  return "Monitoring raised; the conditions for a bounded action are not all met.";
}

function finish(
  state: RiskState,
  reasons: Set<ReasonCode>,
  confidenceBand: ConfidenceBand,
  expiresAt: number,
  config: PromotionConfig,
  independentSourceCount: number,
  highestSourceClass: SourceClass | null,
  explanation: string,
): PromotionResult {
  const reasonCodes = [...reasons].sort();
  return {
    state,
    reasonCodes,
    reasonBits: encodeReasonCodes(reasonCodes),
    confidenceBand,
    expiresAt,
    policyVersion: config.policyVersion,
    explanation,
    independentSourceCount,
    highestSourceClass,
    // The one field a consumer is most likely to misread. It is derived, never passed in,
    // and it is false for every state except PROTECT — by construction, not by convention.
    aggressiveFeeAuthorized: state === "PROTECT",
  };
}

export { SELF_REVISION_RULE, REASON_BITS };
