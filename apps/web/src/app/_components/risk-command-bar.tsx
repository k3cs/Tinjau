import { DataModeLabel } from "@/components/data-mode-label";
import { shortHex } from "@/lib/risk/format";
import type { DemoScenario } from "@/lib/risk/model";

export function RiskCommandBar({ scenario }: { scenario: DemoScenario }) {
  const { record } = scenario;
  const modes = Array.from(new Set([record.dataMode, ...record.evidence.map((claim) => claim.dataMode)]));

  return (
    <section aria-label="Assessment context" className="control-surface overflow-hidden">
      <div className="grid divide-y divide-edge sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-[1fr_1fr_1.2fr_1.5fr]">
        <div className="px-4 py-3">
          <p className="data-label text-ink-muted">Reference asset</p>
          <p className="mt-1 font-data text-sm text-ink-secondary">{record.tokenSymbol}</p>
        </div>
        <div className="px-4 py-3">
          <p className="data-label text-ink-muted">Pool</p>
          <p className="mt-1 font-data text-sm text-ink-secondary" title={record.poolIdOrAddress}>
            {shortHex(record.poolIdOrAddress)}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="data-label text-ink-muted">Assessment</p>
          <p className="mt-1 font-data text-sm text-ink-secondary">{record.assessmentId}</p>
        </div>
        <div className="px-4 py-3">
          <p className="data-label text-ink-muted">Modes present</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {modes.map((mode) => (
              <DataModeLabel key={mode} mode={mode} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
