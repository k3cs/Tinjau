import { NextResponse } from "next/server";

import { HANDOFF_DIR, HANDOFF_GENERATED } from "@/lib/handoff/artifacts";
import { SCENARIOS } from "@/lib/handoff/scenarios";

/**
 * Public read of the risk records this build is based on.
 *
 * This endpoint exists to replace a live payload that was actively misleading:
 * it served an event labelled "8-K: bankruptcy_or_restructuring" for NVDAx
 * with no source field at all, so it asserted a fabricated corporate event
 * about a real company to anything that read it. That document was written by
 * this project for a pipeline test.
 *
 * Every entry here therefore carries `provenance` (source class, data mode,
 * whether it was simulated, and a sentence a human can read), and the envelope
 * says up front that this is replayed fixture data rather than a live feed.
 * A consumer that ignores `provenance` still cannot mistake this for live
 * output, because `dataMode` is on every record and on every claim inside it.
 */
export const dynamic = "force-static";

export function GET() {
  const entries = SCENARIOS.map((scenario) => {
    const { record } = scenario;
    return {
      scenarioId: scenario.scenarioId,
      asset: {
        symbol: record.tokenSymbol,
        address: record.assetAddress,
        pool: record.poolIdOrAddress,
      },
      state: record.state,
      reasonCodes: record.reasonCodes,
      humanExplanation: record.humanExplanation,
      confidenceBand: record.confidenceBand,
      assessedAt: record.assessedAt,
      expiresAt: record.expiresAt,
      policyVersion: record.policyVersion,
      evidenceCommitment: record.evidenceCommitment,
      action: {
        authorized: record.action.authorized,
        status: record.action.status,
        baseFeePips: record.action.baseFee,
        maxFeePips: record.action.maxFee,
        requestedFeePips: record.action.requestedFee,
        appliedFeePips: record.action.appliedFee,
      },
      marketConfirmation: {
        status: record.marketConfirmation.status,
        // Nullable on purpose: null means nothing was observed, which is not
        // the same as a missing value and must not be defaulted to a timestamp.
        observedAt: record.marketConfirmation.observedAt,
        okxLeg: "UNAVAILABLE",
        okxLegReason:
          "No committed OKX index data covers this anchor; index history is not available retroactively. This is not dual-venue confirmation.",
      },
      provenance: {
        sourceClass: classify(scenario.record.evidence.map((claim) => claim.sourceClass)),
        dataMode: record.dataMode,
        isSimulated: record.evidence.some((claim) => claim.dataMode === "SIMULATED"),
        marketLeg: scenario.provenance.marketLeg,
        evidenceOrigin: scenario.provenance.evidence,
        label: describe(scenario.provenance.marketLeg, record.dataMode),
        sourceUrls: record.evidence.map((claim) => claim.sourceUrl),
      },
      limitations: scenario.limitations,
    };
  });

  return NextResponse.json(
    {
      _READ_THIS_FIRST:
        "REPLAYED FIXTURE DATA, NOT A LIVE FEED. These records come from frozen scenarios published in the repository. One evidence claim is SIMULATED (written by this project as a safety test) and one scenario's market leg is CONSTRUCTED. Neither supports any claim about live monitoring, market outcomes, or reduced LP loss.",
      schemaVersion: "tinjau.scoreboard/2.0.0",
      dataMode: "REPLAY",
      generatedFrom: `${HANDOFF_DIR} (regenerated ${HANDOFF_GENERATED})`,
      canClaimLossAvoided: false,
      canClaimLossAvoidedReason:
        "Tinjau ties the static do-nothing policy rather than beating it. See /proof.",
      entries,
    },
    {
      headers: {
        "cache-control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
        "access-control-allow-origin": "*",
      },
    },
  );
}

function classify(classes: string[]): string {
  if (classes.includes("OFFICIAL")) return "OFFICIAL";
  if (classes.includes("NEWS")) return "NEWS";
  return "RUMOR";
}

function describe(marketLeg: string, dataMode: string): string {
  if (marketLeg === "CONSTRUCTED") {
    return "Real replayed filing evidence paired with a constructed price path on a builder-controlled testnet pool. The canonical mainnet replay of the same evidence resolves to WATCH.";
  }
  if (dataMode === "SIMULATED") {
    return "Replayed source-linked news alongside one social claim fabricated by this project as a safety test.";
  }
  return "Replayed source-linked evidence over a frozen market window.";
}
