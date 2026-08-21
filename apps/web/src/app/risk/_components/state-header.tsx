import { DataModeLabel } from "@/components/data-mode-label";
import { formatUtc } from "@/lib/risk/format";
import type { ScenarioView } from "@/lib/handoff/scenarios";

const STATE_TONE = {
  NORMAL: "border-normal text-normal",
  WATCH: "border-watch text-watch",
  PROTECT: "border-protect text-protect",
} as const;

const STATE_MEANING = {
  NORMAL: "Baseline fee. Nothing unresolved.",
  WATCH: "Watching, and the protective fee stays blocked.",
  PROTECT: "Bounded protective fee is authorised, on a fixed clock.",
} as const;

/**
 * The answer, first: what state, what it means, and how much of this is real.
 *
 * Data mode sits at the same size as the state because a `PROTECT` on
 * constructed inputs and a `PROTECT` on live inputs are different claims, and
 * the difference has to be legible without reading further.
 */
export function StateHeader({ scenario }: { scenario: ScenarioView }) {
  const { record } = scenario;

  return (
    <header className="border-b border-edge pb-8">
      <p className="data-label text-ink-faint">{scenario.scenarioId}</p>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-3">
        <span
          className={`rounded-lg border-2 px-4 py-1.5 font-display text-heading-lg font-semibold tracking-[-0.02em] ${STATE_TONE[record.state]}`}
        >
          {record.state}
        </span>
        <DataModeLabel mode={record.dataMode} />
        {/*
          Record-level `dataMode` is derived from the evidence only, so on the
          constructed scenario it reads REPLAY and cannot express that the
          market leg was built. `provenance.marketLeg` carries that, and it has
          to sit here rather than further down the page.
        */}
        <span
          className={`inline-flex min-h-6 items-center rounded border px-2 font-data text-[10px] font-semibold tracking-[0.06em] ${
            scenario.provenance.marketLeg === "CONSTRUCTED"
              ? "border-watch bg-watch/10 text-watch"
              : "border-edge-strong text-ink-muted"
          }`}
        >
          MARKET LEG {scenario.provenance.marketLeg}
        </span>
        <span className="font-data text-[11px] uppercase tracking-[0.06em] text-ink-faint">
          Confidence {record.confidenceBand}
        </span>
      </div>

      <p className="mt-4 font-display text-heading-md text-ink">
        {STATE_MEANING[record.state]}
      </p>
      <p className="mt-3 max-w-2xl text-body-sm text-ink-muted">{record.humanExplanation}</p>
      {/*
        The explanation above is the published record's own sentence, reproduced
        without edit, and on the official scenarios it says the bonded-evidence
        checks passed. That phrasing reads as a check the engine ran. It was an
        input. The record is evidence and is not rewritten to be flattering, so
        the correction is attached here instead, at the same place a reader meets
        the claim rather than further down the page.
      */}
      {record.reasonCodes.includes("BONDED_EVIDENCE_PASSED") ? (
        <p className="mt-3 max-w-2xl border-l-2 border-watch pl-3 text-body-sm text-ink-secondary">
          <span className="font-medium text-ink">One correction to that sentence.</span> The
          bonded-evidence condition was an assumed input on this scenario, not a live parse
          result. Nothing here measured it.
        </p>
      ) : null}

      <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Asset">
          {record.tokenSymbol}
          <span className="text-ink-faint"> · {record.evidence[0]?.company ?? "Unknown"}</span>
        </Fact>
        <Fact label="Assessed">{formatUtc(record.assessedAt)}</Fact>
        <Fact label="Expires">{formatUtc(record.expiresAt)}</Fact>
        <Fact label="Policy">{record.policyVersion}</Fact>
      </dl>
    </header>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="data-label text-ink-faint">{label}</dt>
      <dd className="mt-1 font-data text-[12px] leading-5 text-ink-secondary tabular">{children}</dd>
    </div>
  );
}
