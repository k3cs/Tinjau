import { COMPARISON_METRICS, type PreregisteredPolicy } from "@/lib/comparison/preregistration";

export function PolicyColumn({ policy, noEconomics }: { policy: PreregisteredPolicy; noEconomics: boolean }) {
  return (
    <article className="bg-canvas p-5 sm:p-6">
      <div className="min-h-44">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-semibold tracking-display text-ink">{policy.name}</h2>
          {policy.id === "TINJAU" && (
            <span className="rounded border border-signal/50 bg-signal/10 px-2 py-1 font-data text-[10px] text-signal">
              Event-aware
            </span>
          )}
        </div>
        <p className="mt-5 font-data text-xs text-ink-secondary">{policy.input}</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{policy.evidenceAccess}</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{policy.behavior}</p>
        {policy.variants.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {policy.variants.map((variant) => (
              <span key={variant} className="rounded border border-edge-strong px-2 py-1 font-data text-[10px] text-ink-secondary">
                {variant}
              </span>
            ))}
          </div>
        )}
      </div>

      <dl className="mt-6 divide-y divide-edge border-y border-edge">
        {COMPARISON_METRICS.map((metric) => (
          <div key={metric.label} className="flex items-start justify-between gap-3 py-3">
            <dt>
              <span className="block font-data text-[11px] text-ink-muted">{metric.label}</span>
              <span className="mt-1 block font-data text-[9px] text-ink-muted/80">{metric.unit}</span>
            </dt>
            <dd className="text-right font-data text-[11px] text-ink-secondary">
              {noEconomics ? "No economic row" : "Pending handoff"}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
