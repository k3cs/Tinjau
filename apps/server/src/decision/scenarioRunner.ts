/**
 * Runs a frozen T0.2 scenario end to end through the real pipeline (task T4.1).
 *
 * Every stage is the production module, not a stub:
 *
 *   scenario JSON -> `normalizeClaims` (T2.1)
 *                 -> `buildEvidenceGraph` (T2.3)
 *                 -> `resolveAsset` (T2.2)
 *                 -> `confirmMarket` over the captured swap window (T3.3)
 *                 -> `decide` (T4.1)
 *
 * Takes already-parsed JSON rather than paths, so it performs no file or network I/O of its own
 * and the caller decides what to feed it. `now` is the scenario's own decision anchor: the
 * assessment is made at the moment the evidence landed, not at the moment the test runs.
 */

import { normalizeClaims, type RawClaimInput } from "../evidence/normalize.js";
import { buildEvidenceGraph } from "../evidence/graph.js";
import { resolveAsset } from "../evidence/assets.js";
import { confirmMarket, buildConfirmationInput } from "../market/confirm.js";
import { blockToUnixSeconds, type SwapWindowFixture } from "../market/poolTelemetry.js";
import { FROZEN_PROMOTION_CONFIG } from "../risk/promotionConfig.js";
import { decide, type Decision } from "./orchestrate.js";

/** The subset of a frozen scenario file this runner reads. */
export interface FrozenScenario {
  scenarioId: string;
  asset: {
    company: string;
    tokenSymbol: string;
    tokenAddress: string;
    poolIdOrAddress: string;
  };
  decisionAnchor: { at: string; usReferenceMarketOpen?: boolean };
  claims: RawClaimInput[];
}

export interface RunScenarioOptions {
  /** Chain the assessment is destined for. X Layer mainnet is 196. */
  chainId?: number;
  /** Registry the signature is bound to. A placeholder is fine for an unposted assessment. */
  registryAddress?: `0x${string}`;
  /**
   * Whether the bonded parse-agreement path passed for this scenario's OFFICIAL evidence.
   *
   * Still an INPUT rather than a computation — see the T1.x limitation in tracker §8. Defaults
   * to true so an OFFICIAL scenario is evaluated on its most favourable bonded assumption, and
   * a refusal is therefore never an artefact of assuming the bond failed.
   */
  officialEvidencePassed?: boolean;
  /**
   * Assessment instant. Defaults to the END of the market replay window.
   *
   * WHY THE WINDOW END AND NOT THE ANCHOR. `promote` re-judges the market observation's age
   * against `now` with a 900 s freshness bound. Assessing at the anchor would date every
   * observation in the window into the future or far past it, so the market leg would be thrown
   * out on timing before its verdict was even considered — and a refusal produced that way says
   * nothing about the market. Assessing at the window end makes the last observation 0 s old,
   * which gives the market leg its most favourable possible timing. Every scenario below still
   * declines to promote, and that is the point: the refusal is on the merits.
   *
   * No claim's in-window status changes between the two instants (verified in
   * `test/decisionScenarios.test.ts`), so this choice does not quietly drop evidence.
   */
  nowUnixSeconds?: number;
  /** Assess using only data available up to this instant. Defaults to the window end. */
  evaluateAtUnixSeconds?: number;
  current?: Parameters<typeof decide>[0]["current"];
  requestedFeeProposal?: number | null;
}

const PLACEHOLDER_REGISTRY = "0x00000000000000000000000000000000000000c1" as const;

export function runScenario(
  scenario: FrozenScenario,
  swapWindow: SwapWindowFixture,
  options: RunScenarioOptions = {},
): Decision {
  const anchor = Math.floor(Date.parse(scenario.decisionAnchor.at) / 1000);
  const windowEnd = blockToUnixSeconds(swapWindow.toBlock);
  const now = options.nowUnixSeconds ?? windowEnd;

  const claims = normalizeClaims(scenario.claims);
  const graph = buildEvidenceGraph(claims, now, FROZEN_PROMOTION_CONFIG.evidenceWindowSec);
  const resolution = resolveAsset(
    scenario.asset.company,
    scenario.asset.tokenSymbol,
    scenario.asset.tokenAddress,
  );

  const confirmationInput = buildConfirmationInput(swapWindow, {
    anchorUnixSeconds: anchor,
    // The market engine judges freshness against the last observation in the window, so it is
    // evaluated at the window end. The promotion engine then re-judges that same observation's
    // age against `now`, which is what stops a replayed window from looking fresh at assessment
    // time. Both bounds are applied; neither is skipped.
    nowUnixSeconds: windowEnd,
    evaluateAtUnixSeconds: options.evaluateAtUnixSeconds,
    okx: null,
    usReferenceMarketOpen: scenario.decisionAnchor.usReferenceMarketOpen ?? false,
  });
  const confirmation = confirmMarket(confirmationInput);

  return decide({
    eventKey: `tinjau.scenario/${scenario.scenarioId}`,
    now,
    claims,
    graph,
    resolution,
    confirmation,
    confirmationInput,
    officialEvidencePassed: options.officialEvidencePassed ?? true,
    current: options.current,
    chainId: options.chainId ?? 196,
    registryAddress: options.registryAddress ?? PLACEHOLDER_REGISTRY,
    requestedFeeProposal: options.requestedFeeProposal ?? null,
  });
}
