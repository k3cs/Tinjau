import { DataModeLabel } from "@/components/data-mode-label";
import { StatusMark } from "@/components/status-mark";
import { formatUtc, humanizeCode } from "@/lib/risk/format";
import type { DemoScenario } from "@/lib/risk/model";

const stateTone = {
  NORMAL: "text-normal",
  WATCH: "text-watch",
  PROTECT: "text-protect",
} as const;

export function RiskStateCore({ scenario }: { scenario: DemoScenario }) {
  const { record } = scenario;
  const authorized = record.action.authorized;

  return (
    <section className="h-full border-b border-edge p-6 sm:p-8 xl:border-b-0 xl:border-r xl:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="data-label text-ink-muted">Deterministic risk state</p>
        <div className="flex items-center gap-2">
          <DataModeLabel mode={record.dataMode} />
          <span className="rounded border border-edge-strong px-2 py-1 font-data text-[10px] text-ink-muted">
            {record.confidenceBand} confidence
          </span>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-4">
        <StatusMark state={record.state} className="h-4 w-4" />
        <h1
          className={`font-display text-[clamp(4.2rem,9vw,8rem)] font-semibold leading-[0.82] tracking-display ${stateTone[record.state]}`}
        >
          {record.state}
        </h1>
      </div>

      <p className="mt-8 max-w-[68ch] text-base leading-relaxed text-ink-secondary">
        {record.humanExplanation}
      </p>

      <div
        className={`mt-6 border-l-2 px-4 py-3 ${authorized ? "border-protect bg-protect/10" : "border-signal bg-signal/10"}`}
      >
        <p className="font-data text-xs font-semibold uppercase tracking-[0.06em] text-ink">
          {authorized ? "Bounded fee authorized" : "Aggressive fee not authorized"}
        </p>
        <p className="mt-1 text-sm text-ink-secondary">
          {authorized
            ? "Only the versioned envelope may execute."
            : "Evidence can raise attention without granting action authority."}
        </p>
      </div>

      <dl className="mt-7 grid gap-px overflow-hidden rounded-md border border-edge bg-edge sm:grid-cols-2">
        <div className="bg-canvas-soft p-3">
          <dt className="data-label text-ink-muted">Assessed</dt>
          <dd className="mt-1 font-data text-xs text-ink-secondary">{formatUtc(record.assessedAt)}</dd>
        </div>
        <div className="bg-canvas-soft p-3">
          <dt className="data-label text-ink-muted">Expires</dt>
          <dd className="mt-1 font-data text-xs text-ink-secondary">{formatUtc(record.expiresAt)}</dd>
        </div>
      </dl>

      <div className="mt-7">
        <p className="data-label text-ink-muted">Reason codes</p>
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Reasons for current state">
          {record.reasonCodes.map((reason) => (
            <li
              key={reason}
              className="rounded border border-edge-strong bg-canvas-soft px-2.5 py-1.5 font-data text-[10px] text-ink-secondary"
            >
              {humanizeCode(reason)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
