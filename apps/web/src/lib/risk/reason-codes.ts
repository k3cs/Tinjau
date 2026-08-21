import type { ReasonCode } from "./model";

/**
 * Plain-language reading of every reason code, plus which leg of the decision
 * emitted it and whether it pushed the state up or held it down.
 *
 * A judge should not have to decode `PERSISTENCE_UNOBSERVED` from its spelling.
 * Two pairs in particular are easy to conflate and are worded here to keep them
 * apart, because conflating either one would overstate what the system knows:
 *
 *  - `MARKET_DATA_UNAVAILABLE` (could not look) vs `MARKET_NOT_CONFIRMED`
 *    (looked, saw nothing that qualified);
 *  - `ANTI_WICK_FAILED` (it moved back) vs `PERSISTENCE_UNOBSERVED`
 *    (not enough data to tell whether it moved back).
 */
export type ReasonLeg = "EVIDENCE" | "MARKET" | "LIFECYCLE";

/** Whether the code supports promotion, blocks it, or only records a fact. */
export type ReasonEffect = "SUPPORTS" | "RESTRAINS" | "NEUTRAL";

export interface ReasonMeaning {
  /** Short label used in place of the raw SCREAMING_CASE. */
  title: string;
  /** One sentence a non-specialist can act on. */
  plain: string;
  leg: ReasonLeg;
  effect: ReasonEffect;
}

export const REASON_MEANINGS: Record<ReasonCode, ReasonMeaning> = {
  RUMOR_ONLY: {
    title: "Rumour only",
    plain: "The only claim behind this is an unattributed rumour, which can raise attention but can never authorise the protective fee.",
    leg: "EVIDENCE",
    effect: "RESTRAINS",
  },
  SINGLE_SOURCE: {
    title: "Single source",
    plain: "Everything traces back to one origin. One report is not corroboration, however many outlets carried it.",
    leg: "EVIDENCE",
    effect: "RESTRAINS",
  },
  DUPLICATE_SYNDICATION: {
    title: "Syndicated copies",
    plain: "Several outlets republished one origin. They are counted once, not once each.",
    leg: "EVIDENCE",
    effect: "RESTRAINS",
  },
  CONTRADICTED: {
    title: "Contradicted",
    plain: "Another claim in the set says the opposite, so the event is not settled.",
    leg: "EVIDENCE",
    effect: "RESTRAINS",
  },
  STALE_EVIDENCE: {
    title: "Stale evidence",
    plain: "The claim is older than the window the policy will act on.",
    leg: "EVIDENCE",
    effect: "RESTRAINS",
  },
  NO_OFFICIAL_CONFIRMATION: {
    title: "No official filing",
    plain: "No filing from the company confirms this, so the stricter non-official rules apply.",
    leg: "EVIDENCE",
    effect: "RESTRAINS",
  },
  UNSUPPORTED_ASSET: {
    title: "Unsupported asset",
    plain: "The token or pool is not on the supported list, so no action is possible.",
    leg: "EVIDENCE",
    effect: "RESTRAINS",
  },
  AMBIGUOUS_ENTITY: {
    title: "Ambiguous company",
    plain: "The claim could refer to more than one company, so it cannot be mapped to a token.",
    leg: "EVIDENCE",
    effect: "RESTRAINS",
  },
  UNKNOWN_COMPANY: {
    title: "Unknown company",
    plain: "No company in the supported set matches the claim.",
    leg: "EVIDENCE",
    effect: "RESTRAINS",
  },
  MARKET_CONFIRMED: {
    title: "Market confirmed",
    plain: "The pool actually moved the way a real event would move it, and the move held.",
    leg: "MARKET",
    effect: "SUPPORTS",
  },
  MARKET_NOT_CONFIRMED: {
    title: "Market did not confirm",
    plain: "We looked at the market and it did not show a qualifying move. This is a finding, not a gap.",
    leg: "MARKET",
    effect: "RESTRAINS",
  },
  MARKET_DATA_STALE: {
    title: "Market data stale",
    plain: "The most recent market reading is too old to act on.",
    leg: "MARKET",
    effect: "RESTRAINS",
  },
  MARKET_DATA_UNAVAILABLE: {
    title: "Could not observe the market",
    plain: "There was nothing to read, no usable data at all. Different from looking and seeing nothing.",
    leg: "MARKET",
    effect: "RESTRAINS",
  },
  ANTI_WICK_FAILED: {
    title: "Move did not hold",
    plain: "The price dipped and came back. A spike that retraces is not a dislocation.",
    leg: "MARKET",
    effect: "RESTRAINS",
  },
  THIN_EXIT_DEPTH: {
    title: "Thin exit depth",
    plain: "Too little liquidity is quotable near the price to measure an exit reliably.",
    leg: "MARKET",
    effect: "RESTRAINS",
  },
  REFERENCE_MARKET_CLOSED: {
    title: "Reference market closed",
    plain: "The US listing was closed at this moment, so the reference price is not current.",
    leg: "MARKET",
    effect: "NEUTRAL",
  },
  INSUFFICIENT_SAMPLE: {
    title: "Too few observations",
    plain: "There were real readings, but not enough of them to clear the engine's minimum sample.",
    leg: "MARKET",
    effect: "RESTRAINS",
  },
  PERSISTENCE_UNOBSERVED: {
    title: "Could not tell if it held",
    plain: "Not enough data to judge whether the move persisted. Not the same as knowing it retraced.",
    leg: "MARKET",
    effect: "RESTRAINS",
  },
  OFFICIAL_FILING: {
    title: "Official filing",
    plain: "A filing from the company itself supports this claim.",
    leg: "EVIDENCE",
    effect: "SUPPORTS",
  },
  TWO_INDEPENDENT_SOURCES: {
    title: "Two independent origins",
    plain: "Two genuinely separate origins reported this, not one origin twice.",
    leg: "EVIDENCE",
    effect: "SUPPORTS",
  },
  BONDED_EVIDENCE_PASSED: {
    title: "Bonded evidence passed",
    plain: "The filing cleared the existing parse-agreement and bond/challenge checks.",
    leg: "EVIDENCE",
    effect: "SUPPORTS",
  },
  NON_MATERIAL_EVENT: {
    title: "Not material",
    plain: "The event type is routine and does not warrant protection on its own.",
    leg: "EVIDENCE",
    effect: "RESTRAINS",
  },
  EXPIRED: {
    title: "Expired",
    plain: "The assessment aged out. Protection ends by the clock, not by anyone's decision.",
    leg: "LIFECYCLE",
    effect: "NEUTRAL",
  },
  DECAYED_TO_BASELINE: {
    title: "Decayed to baseline",
    plain: "The fee has returned to its normal level along the fixed curve.",
    leg: "LIFECYCLE",
    effect: "NEUTRAL",
  },
  COOLDOWN_ACTIVE: {
    title: "Cooldown active",
    plain: "A protection ran recently, so the contract refuses another one until the cooldown ends.",
    leg: "LIFECYCLE",
    effect: "RESTRAINS",
  },
  PAUSED: {
    title: "Paused",
    plain: "The guardian has paused new protections. Existing ones keep their original clock.",
    leg: "LIFECYCLE",
    effect: "RESTRAINS",
  },
  ACTION_FAILED: {
    title: "Action failed",
    plain: "The on-chain action did not go through. A failed action claims no protection benefit.",
    leg: "LIFECYCLE",
    effect: "NEUTRAL",
  },
};

export function reasonMeaning(code: string): ReasonMeaning {
  return (
    REASON_MEANINGS[code as ReasonCode] ?? {
      title: code,
      plain: "This code is newer than the interface. It is shown unresolved rather than dropped.",
      leg: "LIFECYCLE",
      effect: "NEUTRAL",
    }
  );
}
