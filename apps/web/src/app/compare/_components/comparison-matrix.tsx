import { COMPARISON_METRICS, COMPARISON_POLICIES } from "@/lib/comparison/preregistration";

export function ComparisonMatrix({ noEconomics }: { noEconomics: boolean }) {
  const value = noEconomics ? "No economic row" : "Pending handoff";

  return (
    <section className="rounded-lg border border-edge bg-canvas p-5 sm:p-6">
      <h2 className="font-display text-2xl font-semibold tracking-display text-ink">Exact-value matrix</h2>
      <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-ink-secondary">
        This matrix will carry the validated values and basis markers. Missing results remain text, never zero.
      </p>

      <div className="mt-6 hidden overflow-hidden rounded-md border border-edge lg:block">
        <table className="w-full border-collapse text-left">
          <thead className="bg-canvas-soft font-data text-[10px] uppercase tracking-[0.06em] text-ink-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Metric</th>
              {COMPARISON_POLICIES.map((policy) => (
                <th key={policy.id} scope="col" className="border-l border-edge px-4 py-3 font-medium">{policy.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="font-data text-[11px]">
            {COMPARISON_METRICS.map((metric) => (
              <tr key={metric.label} className="border-t border-edge">
                <th scope="row" className="px-4 py-3 font-medium text-ink-secondary">
                  {metric.label}
                  <span className="mt-1 block text-[9px] font-normal text-ink-muted">{metric.unit} · {metric.basis}</span>
                </th>
                {COMPARISON_POLICIES.map((policy) => (
                  <td key={policy.id} className="border-l border-edge px-4 py-3 text-ink-muted">{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 space-y-3 lg:hidden">
        {COMPARISON_METRICS.map((metric) => (
          <section key={metric.label} className="rounded-md border border-edge bg-canvas-soft p-4">
            <h3 className="font-data text-xs font-medium text-ink-secondary">{metric.label}</h3>
            <p className="mt-1 font-data text-[9px] text-ink-muted">{metric.unit} · {metric.basis}</p>
            <dl className="mt-3 divide-y divide-edge font-data text-[11px]">
              {COMPARISON_POLICIES.map((policy) => (
                <div key={policy.id} className="flex justify-between gap-3 py-2">
                  <dt className="text-ink-muted">{policy.name}</dt>
                  <dd className="text-right text-ink-secondary">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </section>
  );
}
