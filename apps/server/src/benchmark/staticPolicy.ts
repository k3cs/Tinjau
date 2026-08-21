/**
 * The static-fee baseline (task T5.1), specified by T0.4 §6.1.
 *
 * Fee is the frozen base fee for every swap in every window. No state, no triggers, no inputs
 * beyond the shared replay input.
 *
 * This is also the benchmark's sanity check. `STATIC` is the pool's actual live behaviour, so its
 * replayed fee revenue must reconcile with what the pool really charged — if this row does not
 * line up with the observed pool, the whole replay is mis-specified and no other row can be
 * trusted either. `test/benchmarkMarkout.test.ts` performs that reconciliation against P2.4's
 * independently produced measurements.
 *
 * The fee is read from the shared replay input rather than written as a literal here, so `STATIC`
 * and the fee-raising policies provably start from the same number.
 */

import type { FeeRatePipsAt } from "./markout.js";
import type { ReplayInput } from "./replayInput.js";

export const STATIC_POLICY_ID = "STATIC" as const;
export const STATIC_METHOD_VERSION = "tinjau.benchmark-static/1.0.0";

export interface StaticResult {
  policyId: typeof STATIC_POLICY_ID;
  methodVersion: typeof STATIC_METHOD_VERSION;
  feePips: number;
  /** Always empty. Present so every policy result has the same shape. */
  episodes: [];
  statusReason: string;
}

export function evaluateStatic(input: ReplayInput): StaticResult {
  return {
    policyId: STATIC_POLICY_ID,
    methodVersion: STATIC_METHOD_VERSION,
    feePips: input.envelope.baseFeePips,
    episodes: [],
    statusReason:
      `Constant ${input.envelope.baseFeePips} pips for every swap. This equals the live pool fee ` +
      `at the frozen venue, so this row doubles as the reconciliation check on the replay itself.`,
  };
}

export function staticFeeSchedule(result: StaticResult): FeeRatePipsAt {
  return () => result.feePips;
}
