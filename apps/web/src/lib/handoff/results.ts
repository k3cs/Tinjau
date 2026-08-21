import { COMPARISON } from "./artifacts";
import { cellPair, type CellPair } from "./comparison";

/**
 * Per-policy behaviour for one frozen scenario, read from the published
 * benchmark.
 *
 * "Behaviour" is deliberately separate from economics. The benchmark can say
 * *what each policy did* (whether it fired, when, how high it went, and
 * whether the event warranted it), and that answer does not depend on which
 * metric basis you pick. The economics do, which is why they are reported as a
 * pair everywhere in this app rather than as a number.
 */
export type PolicyId = "STATIC" | "VOLATILITY_ONLY" | "TINJAU";

export interface BehaviourRow {
  policyId: PolicyId;
  policyName: string;
  /** The grid point this row was run at, e.g. "k = 3". Empty for STATIC. */
  variant: string;
  status: string;
  statusReason: string;
  triggerCount: number;
  maxFeePips: number | null;
  actionLatencySec: number | null;
  protectionDurationSec: number | null;
  timeToDecaySec: number | null;
  falsePositive: string;
  falsePositiveReason: string;
}

const POLICY_NAME: Record<PolicyId, string> = {
  STATIC: "Static fee",
  VOLATILITY_ONLY: "Volatility-only",
  TINJAU: "Tinjau",
};

/** Demo route slugs → the scenario ids used throughout the handoff. */
export const SLUG_TO_SCENARIO_ID: Record<string, string> = {
  "false-rumor": "A-rumor-watch",
  "confirmed-event": "B-confirmed-protect",
  "hard-case": "C-two-origins-hard-case",
  neutral: "D-neutral-normal",
};

function variantLabel(parameters: Record<string, number>): string {
  if (parameters.k !== undefined) return `k = ${parameters.k}`;
  if (parameters.minDrawdownBps !== undefined) return `${parameters.minDrawdownBps} bps`;
  return "";
}

export function behaviourFor(scenarioId: string): BehaviourRow[] {
  const results = COMPARISON.results as unknown as Array<{
    scenarioId: string;
    policyId: PolicyId;
    parameters: Record<string, number>;
    behaviour: {
      status: string;
      statusReason: string;
      triggerCount: number;
      maxFeeReachedPips: { value: number | null };
      actionLatencySec: { value: number | null };
      protectionDurationSec: { value: number | null };
      timeToDecaySec: { value: number | null };
      falsePositive: { label: string; reason: string };
    };
  }>;

  return results
    .filter((result) => result.scenarioId === scenarioId)
    .map((result) => ({
      policyId: result.policyId,
      policyName: POLICY_NAME[result.policyId],
      variant: variantLabel(result.parameters),
      status: result.behaviour.status,
      statusReason: result.behaviour.statusReason,
      triggerCount: result.behaviour.triggerCount,
      maxFeePips: result.behaviour.maxFeeReachedPips.value,
      actionLatencySec: result.behaviour.actionLatencySec.value,
      protectionDurationSec: result.behaviour.protectionDurationSec.value,
      timeToDecaySec: result.behaviour.timeToDecaySec.value,
      falsePositive: result.behaviour.falsePositive.label,
      falsePositiveReason: result.behaviour.falsePositive.reason,
    }));
}

/** Markout for one scenario at the mid grid point, carrying both bases. */
export function markoutFor(scenarioId: string): CellPair {
  return cellPair(scenarioId, 3, 200);
}

/** `null` means unavailable. It is never rendered as zero. */
export function orUnavailable(value: number | null, unit: string): string {
  return value === null ? "Not available" : `${value.toLocaleString()} ${unit}`;
}
