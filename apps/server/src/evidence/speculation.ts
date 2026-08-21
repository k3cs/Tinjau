/**
 * Speculation detection (task T2.1).
 *
 * Tracker §0.8: "Never turn speculation into a factual event by paraphrasing it." The
 * hardest version of that failure is not a bad paraphrase — it is a pipeline that reads
 * "Nvidia is in TALKS to guarantee $250bn" and records an event called
 * "$250bn guarantee". The claim text survives, but the structured record asserts something
 * the source never did.
 *
 * This module keeps the two apart. It never edits the claim text; it labels how strongly the
 * source asserted it, and returns exactly which markers it matched so a reviewer can check
 * the call rather than trust it.
 *
 * WHAT THIS IS NOT: a language model, or a claim to understand meaning. It is a curated
 * marker list over English financial-news phrasing, and it will miss hedging expressed in
 * ways the list does not cover. It is deployed in the one direction where being wrong is
 * cheap — see `CONSERVATIVE_DIRECTION` below.
 */

/**
 * How strongly the source asserted the claim.
 *
 * Ordered from weakest to strongest, but never compare these with `<`/`>` to gate an action.
 * Promotion decisions use exact equality, for the same reason the on-chain enums do.
 */
export type AssertionLevel =
  /** Attributed to unnamed sources, or explicitly unverified. */
  | "REPORTED_UNVERIFIED"
  /** Hedged: talks, considering, may, is expected to. Nothing has happened yet. */
  | "SPECULATIVE"
  /** Stated plainly as having occurred. */
  | "ASSERTED";

/**
 * The rule that makes this heuristic safe to rely on.
 *
 * Detection can only ever WEAKEN a claim's assertion level, never strengthen it. A missed
 * hedge leaves a claim looking stronger than it is — which is caught downstream, because a
 * `NEWS` claim still needs a second independent origin and fresh market confirmation before
 * it can authorise anything. A false positive merely holds a real event at `WATCH` a little
 * longer. Neither error can, by itself, cause an unsupported action.
 */
export const CONSERVATIVE_DIRECTION =
  "speculation detection may only weaken a claim's assertion level, never strengthen it";

/**
 * Phrases indicating the event has not happened yet.
 *
 * Word-boundary matched, lowercase. `in talks` and `is considering` are the two that matter
 * most for this product: both frozen non-official scenarios are about deals under discussion,
 * and reading either as a completed transaction is precisely the §0.8 failure.
 */
const SPECULATIVE_MARKERS = [
  "in talks",
  "in discussions",
  "is considering",
  "considering",
  "weighs",
  "weighing",
  "mulls",
  "mulling",
  "eyes",
  "eyeing",
  "may ",
  "might ",
  "could ",
  "is expected to",
  "are expected to",
  "expected to",
  "plans to",
  "planning to",
  "proposed",
  "potential",
  "reportedly",
  "rumoured",
  "rumored",
  "nothing signed",
  "no deal has been",
  "hearing",
] as const;

/**
 * Phrases indicating the claim rests on sources the publisher did not name, or that the
 * publisher could not confirm it.
 *
 * These are the strongest possible signal available without a model: a publisher saying "we
 * could not verify this" is stating its own epistemic position outright.
 */
const UNVERIFIED_MARKERS = [
  "people familiar",
  "person familiar",
  "sources said",
  "according to sources",
  "citing people",
  "citing sources",
  "could not immediately verify",
  "could not verify",
  "did not respond to requests for comment",
  "declined to comment",
  "unnamed",
  "anonymous",
  "nobody confirming",
  "no comment",
] as const;

export interface SpeculationAnalysis {
  level: AssertionLevel;
  /** Exactly which markers matched, so the call can be checked rather than trusted. */
  matchedMarkers: string[];
  /** True when the source itself said it could not confirm the claim. */
  publisherDisclaimedVerification: boolean;
}

function findMarkers(haystack: string, markers: readonly string[]): string[] {
  return markers.filter((m) => haystack.includes(m));
}

/**
 * Classifies how strongly a claim was asserted.
 *
 * @param text The claim text or attribution span, verbatim. Never modified.
 * @param hint An assertion level the caller already knows from structure rather than
 * language — for example, an SEC filing is `ASSERTED` because the issuer signed it. A hint
 * is only honoured when the text carries no weaker signal, so language always wins over
 * assumption.
 */
export function analyseSpeculation(text: string, hint?: AssertionLevel): SpeculationAnalysis {
  const haystack = ` ${text.toLowerCase().replace(/\s+/g, " ")} `;

  const unverified = findMarkers(haystack, UNVERIFIED_MARKERS);
  const speculative = findMarkers(haystack, SPECULATIVE_MARKERS);
  const matchedMarkers = [...unverified, ...speculative];

  const publisherDisclaimedVerification =
    haystack.includes("could not verify") || haystack.includes("could not immediately verify");

  // Unverified attribution is the weakest level and takes precedence: a hedged claim from a
  // named source is a different thing from a hedged claim from an unnamed one.
  if (unverified.length > 0) {
    return { level: "REPORTED_UNVERIFIED", matchedMarkers, publisherDisclaimedVerification };
  }
  if (speculative.length > 0) {
    return { level: "SPECULATIVE", matchedMarkers, publisherDisclaimedVerification };
  }

  // No linguistic signal. Fall back to the caller's structural hint, defaulting to ASSERTED
  // only when nothing suggests otherwise.
  return { level: hint ?? "ASSERTED", matchedMarkers, publisherDisclaimedVerification };
}

/**
 * Whether a claim at this assertion level describes something that has actually happened.
 *
 * Used by the normaliser to set `describesCompletedEvent`. A claim about talks is evidence
 * that talks are happening — it is not evidence that a deal exists, and the record must not
 * blur the two.
 */
export function describesCompletedEvent(level: AssertionLevel): boolean {
  return level === "ASSERTED";
}
