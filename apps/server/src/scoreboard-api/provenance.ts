/**
 * Provenance classification for publicly served registry events (task T0.5).
 *
 * The public scoreboard API used to return only `eventTypeLabel`, so event 2 —
 * "8-K — bankruptcy_or_restructuring" against NVDAx — read as though NVIDIA had filed for
 * bankruptcy. It had not. That event was posted from `apps/server/synthetic/`, a document
 * the AFTERHOURS team fabricated for task P4.4's end-to-end injection test. T0.1 recorded
 * this as compatibility gap 13 and tracker §0.17 item 13 lists it as a known defect.
 *
 * The registry already commits `sourceUrl` and `sourceContentHash` on chain, so nothing had
 * to be invented to fix this: the API was simply not reading fields that were already there
 * and already verifiable by a third party. This module turns those two on-chain values into
 * a classification the API can publish alongside every event.
 *
 * Classification is deliberately CLOSED: anything that is not a verified EDGAR URL and not
 * the known synthetic scheme is reported as `UNKNOWN`, never quietly treated as official.
 * A future scheme must be added here on purpose.
 */

import { isRealSecFilingSourceUrl } from "../xbot/sourceUrlGuard.js";

/** Matches tracker §0.24's `SourceClass`, plus a closed fallback. */
export type EventSourceClass = "OFFICIAL" | "SIMULATED" | "UNKNOWN";

/** Matches tracker §0.24's `DataMode`, plus a closed fallback. */
export type EventDataMode = "OBSERVED" | "SIMULATED" | "UNKNOWN";

/** The synthetic scheme committed on chain by task P4.4. Immutable: it is part of the
 * source-hash provenance of already-posted events, so it is a compatibility key, not a
 * branding defect. See `apps/server/synthetic/README.md`. */
const SYNTHETIC_SCHEME = "synthetic://";

export interface EventProvenance {
  sourceClass: EventSourceClass;
  dataMode: EventDataMode;
  /** True for anything a reader must not take as a real corporate event. */
  isSimulated: boolean;
  /** The exact on-chain `sourceUrl`, unmodified, so a reader can check it themselves. */
  sourceUrl: string;
  /** The exact on-chain `sourceContentHash`, so the bytes behind the claim are verifiable. */
  sourceContentHash: string;
  /** Plain-language warning for any consumer that renders this event. */
  label: string;
}

export function classifyEventProvenance(
  sourceUrl: string,
  sourceContentHash: string,
): EventProvenance {
  const base = { sourceUrl: sourceUrl ?? "", sourceContentHash: sourceContentHash ?? "" };

  if (isRealSecFilingSourceUrl(sourceUrl)) {
    return {
      ...base,
      sourceClass: "OFFICIAL",
      dataMode: "OBSERVED",
      isSimulated: false,
      label: "Official SEC EDGAR filing. Open the source URL to verify.",
    };
  }

  if (typeof sourceUrl === "string" && sourceUrl.startsWith(SYNTHETIC_SCHEME)) {
    return {
      ...base,
      sourceClass: "SIMULATED",
      dataMode: "SIMULATED",
      isSimulated: true,
      label:
        "SIMULATED — this document was fabricated by the Tinjau team to test the pipeline. " +
        "It is not an SEC filing and it describes no real corporate event.",
    };
  }

  // Closed fallback. An unrecognised scheme is a defect to investigate, not an event to
  // present as official.
  return {
    ...base,
    sourceClass: "UNKNOWN",
    dataMode: "UNKNOWN",
    isSimulated: true,
    label:
      "UNKNOWN PROVENANCE — this event's source URL matches neither SEC EDGAR nor a known " +
      "test scheme. Treat it as unverified.",
  };
}
