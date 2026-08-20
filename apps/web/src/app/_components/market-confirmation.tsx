import { UnavailableValue } from "@/components/unavailable-value";
import { formatUtc, humanizeCode } from "@/lib/risk/format";
import type { MarketConfirmationView } from "@/lib/risk/model";

const statusTone = {
  CONFIRMED: "text-normal",
  NOT_CONFIRMED: "text-watch",
  UNAVAILABLE: "text-ink-muted",
  STALE: "text-protect",
} as const;

export function MarketConfirmation({ confirmation }: { confirmation: MarketConfirmationView }) {
  const values = [
    ["OKX reference", confirmation.okxReferencePrice],
    ["X Layer pool", confirmation.xLayerPoolPrice],
    ["Basis", confirmation.basisBps === null ? null : `${confirmation.basisBps} bps`],
    ["Drawdown", confirmation.drawdownBps === null ? null : `${confirmation.drawdownBps} bps`],
    ["Trade velocity", confirmation.tradeVelocity],
    ["Exit depth", confirmation.executableExitDepth],
  ] as const;

  return (
    <section className="border-b border-edge p-6 sm:p-8 xl:border-r xl:p-10">
      <p className="data-label text-ink-muted">OKX / X Layer confirmation</p>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <h2 className={`font-display text-3xl font-semibold tracking-display ${statusTone[confirmation.status]}`}>
          {confirmation.status.replace("_", " ")}
        </h2>
        <span className="rounded border border-edge-strong px-2 py-1 font-data text-[10px] text-ink-muted">
          {confirmation.fresh ? "Fresh" : "Not fresh"}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
        {confirmation.status === "UNAVAILABLE"
          ? "The final confirmation payload is absent. This means Tinjau could not evaluate the market gate; it does not mean the market was checked and quiet."
          : "Independent market telemetry is evaluated separately from evidence provenance."}
      </p>

      <dl className="mt-6 divide-y divide-edge border-y border-edge font-data text-xs">
        {values.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-ink-muted">{label}</dt>
            <dd className="text-right text-ink-secondary">
              {value === null ? <UnavailableValue label="—" /> : value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 grid gap-2 font-data text-[11px] sm:grid-cols-2">
        <p className="rounded border border-edge bg-canvas-soft p-3 text-ink-muted">
          Anti-wick <span className="block pt-1 text-ink-secondary">{confirmation.antiWickSatisfied ? "Passed" : "Not passed"}</span>
        </p>
        <p className="rounded border border-edge bg-canvas-soft p-3 text-ink-muted">
          Block <span className="block pt-1 text-ink-secondary">{confirmation.blockNumber ?? "—"}</span>
        </p>
      </div>
      <p className="mt-4 font-data text-[10px] leading-relaxed text-ink-muted">
        Observed {formatUtc(confirmation.observedAt)} · {confirmation.reasonCodes.map(humanizeCode).join(" · ")}
      </p>
    </section>
  );
}
