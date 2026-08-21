import exposureJson from "../../../../../docs/buildx-orion-2026/outputs/05-build/market-exposure.json";

/**
 * The one study on this site measured on a market that is not ours.
 *
 * Everything else here runs on builder-controlled testnet pools with mock
 * tokens. This does not: it is 32 real SEC filings measured against ten real
 * tokenised-equity pools on X Layer mainnet, and it is the only evidence the
 * project has that the problem it addresses is a real one rather than a
 * plausible one.
 *
 * It is also the easiest thing on this site to overclaim with, so the
 * limitations are part of the type rather than a footnote somebody can drop.
 * Two of them decide how this may be written about at all:
 *
 *   - the pools have **no Tinjau hook attached**, so this measures the problem
 *     and says nothing whatever about what Tinjau prevented;
 *   - at the median event the cost is **immaterial** against pool TVL. The
 *     dollar total is carried by a few large first trades. Leading with the
 *     total and omitting that would be a lie by emphasis.
 */
export interface ExposureEvent {
  ticker: string;
  form: string;
  lpUsd: number;
  notionalUsd: number;
}

export interface ExposureDoc {
  schemaVersion: string;
  measuredOn: string;
  horizon: string;
  scope: {
    events: number;
    pools: number;
    chain: string;
    poolsAreThirdParty: boolean;
    hookAttached: boolean;
    note: string;
  };
  headline: {
    eventCount: number;
    lossCount: number;
    gainCount: number;
    lossShare: number;
    medianUsd: number;
    medianBpsOfNotional: number;
    totalUsd: number;
    worstUsd: number;
  };
  byForm: Array<{ form: string; plain: string; n: number; medianUsd: number }>;
  concentration: {
    events: ExposureEvent[];
    shareOfTotal: number;
    note: string;
  };
  events: ExposureEvent[];
  limitations: string[];
  prohibited: string[];
}

export const EXPOSURE = exposureJson as unknown as ExposureDoc;

/** Worst first, so a strip of dots reads as a distribution rather than a list. */
export const EXPOSURE_EVENTS_SORTED: ExposureEvent[] = [...EXPOSURE.events].sort(
  (a, b) => a.lpUsd - b.lpUsd,
);

/**
 * Cents-scale figures with a leading minus, formatted once. Everything on this
 * page is a cost, so the sign is never dropped for tidiness.
 */
export function formatUsdSigned(value: number): string {
  const sign = value < 0 ? "-" : "+";
  const abs = Math.abs(value);
  return `${sign}$${abs < 1 ? abs.toFixed(2) : abs.toFixed(2)}`;
}
