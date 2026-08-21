/**
 * Frozen promotion thresholds (task T1.2).
 *
 * Tracker §0.7: "thresholds are frozen in versioned configuration from replay work, not
 * chosen by an LLM at runtime". This file is that configuration. Nothing here may be read
 * from an environment variable, a model output, or a request parameter — a threshold that
 * can move at runtime is not a threshold, it is a suggestion.
 *
 * CHANGE DISCIPLINE: bump `POLICY_VERSION` on any change, and re-run the whole benchmark.
 * T0.4 §6.3 makes this binding: "if a threshold is changed after any result is seen, every
 * prior result is void and the benchmark is re-run and re-labelled."
 */

/** Stamped into every assessment so a reader knows which rules produced it. */
export const POLICY_VERSION = "tinjau.policy/1.0.0";

export interface PromotionConfig {
  readonly policyVersion: string;
  /** How far back evidence may be published and still count. Matches T0.2's frozen windows. */
  readonly evidenceWindowSec: number;
  /** How long a WATCH survives without new evidence before lapsing to NORMAL. */
  readonly watchExpirySec: number;
  /** Maximum age of a market observation that may still satisfy a promotion gate. */
  readonly marketFreshnessSec: number;
  /** Independent origins required before non-official evidence may reach PROTECT. */
  readonly minIndependentSourcesForNonOfficialProtect: number;
  /** Hard ceiling on one PROTECT interval. */
  readonly maxProtectDurationSec: number;
  /** Minimum gap between the end of one PROTECT and the start of the next. */
  readonly cooldownSec: number;
}

export const FROZEN_PROMOTION_CONFIG: PromotionConfig = Object.freeze({
  policyVersion: POLICY_VERSION,

  // 72 hours — the same evidence window every T0.2 scenario was frozen against. Chosen there
  // for provenance reasons before any market data was scored, and reused here unchanged so
  // the engine and the fixtures cannot disagree about what "recent" means.
  evidenceWindowSec: 72 * 3600,

  // A WATCH is an invitation to keep looking, not a standing alarm. If nothing refreshes it
  // within a day it lapses, so a stale scare cannot sit on an asset indefinitely.
  watchExpirySec: 24 * 3600,

  // 15 minutes. Market confirmation is a claim about what is happening *now*; an observation
  // older than this describes a different market. Deliberately much shorter than the evidence
  // window, because prices move on a different timescale than disclosures.
  marketFreshnessSec: 15 * 60,

  // Two, straight from the §0.7 invariant. Not a tunable.
  minIndependentSourcesForNonOfficialProtect: 2,

  // Mirrors the deployed hook's widen + decay envelope (3600 + 18000), so the deterministic
  // engine can never authorise a protection longer than the contract will actually honour.
  maxProtectDurationSec: 3600 + 18000,

  // One full widen period. Prevents an oscillating signal from re-arming protection the
  // moment it decays, which would turn a bounded action into a permanent one.
  cooldownSec: 3600,
});
