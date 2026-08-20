const policies = [
  { name: "Static fee", input: "Frozen base fee", detail: "Market and evidence blind" },
  {
    name: "Volatility-only",
    input: "Market telemetry",
    detail: "No filing, news, rumor, or event semantics",
  },
  {
    name: "Tinjau",
    input: "Same market input + evidence path",
    detail: "Still bounded by the same dynamic-policy envelope",
  },
] as const;

export default function ComparePage() {
  return (
    <div className="circuit-field min-h-[calc(100vh-8rem)]">
      <section className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-5 rounded-lg border border-edge bg-canvas p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="max-w-3xl text-balance font-display text-4xl font-semibold leading-tight tracking-display text-ink sm:text-5xl">
              Same input. Three policies. No predetermined winner.
            </h1>
            <p className="mt-4 max-w-[70ch] leading-relaxed text-ink-secondary">
              The comparison surface is structurally ready, but the validated benchmark payload has
              not been handed off. Tinjau will not turn missing results into zeros or claims.
            </p>
          </div>
          <span className="inline-flex min-h-11 shrink-0 items-center self-start rounded border border-watch/50 bg-watch/10 px-3 font-data text-[11px] font-medium uppercase tracking-[0.06em] text-watch lg:self-auto">
            Benchmark handoff pending
          </span>
        </div>

        <section className="mt-5 overflow-hidden rounded-lg border border-edge bg-canvas">
          <div className="grid divide-y divide-edge sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            {[
              ["Scenario", "—"],
              ["Replay window", "—"],
              ["Method version", "—"],
              ["Result basis", "—"],
            ].map(([label, value]) => (
              <div key={label} className="px-4 py-4">
                <p className="data-label text-ink-muted">{label}</p>
                <p className="mt-1 font-data text-sm text-ink-secondary">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid border-t border-edge lg:grid-cols-3">
            {policies.map((policy, index) => (
              <article
                key={policy.name}
                className={`min-h-[330px] p-6 sm:p-8 ${index < policies.length - 1 ? "border-b border-edge lg:border-b-0 lg:border-r" : ""}`}
              >
                <h2 className="font-display text-2xl font-semibold tracking-display text-ink">
                  {policy.name}
                </h2>
                <p className="mt-7 font-data text-sm text-ink-secondary">{policy.input}</p>
                <p className="mt-2 min-h-12 text-sm leading-relaxed text-ink-muted">{policy.detail}</p>

                <dl className="mt-9 divide-y divide-edge border-y border-edge font-data text-xs">
                  {["Fee revenue", "LP markout", "Adverse selection", "Action latency"].map(
                    (metric) => (
                      <div key={metric} className="flex items-center justify-between gap-3 py-3">
                        <dt className="text-ink-muted">{metric}</dt>
                        <dd className="text-ink-secondary">Unavailable</dd>
                      </div>
                    ),
                  )}
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-5 grid gap-px overflow-hidden rounded-lg border border-edge bg-edge md:grid-cols-[1fr_1.2fr]">
          <div className="bg-canvas-soft p-6 sm:p-8">
            <p className="data-label text-ink-muted">Claim gate</p>
            <p className="mt-4 font-display text-3xl font-semibold tracking-display text-ink">Closed</p>
            <p className="mt-3 leading-relaxed text-ink-secondary">
              Loss avoided, superior performance, and policy winner claims are unavailable until the
              validated proof record explicitly permits them.
            </p>
          </div>
          <div className="bg-canvas p-6 sm:p-8">
            <h2 className="font-display text-2xl font-semibold tracking-display text-ink">
              What the final payload must prove
            </h2>
            <ul className="mt-5 grid gap-3 text-sm text-ink-secondary sm:grid-cols-2">
              {[
                "Identical trades and timestamps",
                "Identical liquidity and replay window",
                "Units and counterfactual basis",
                "Neutral and false-rumor cases",
                "Full distribution and tail outcomes",
                "Explicit limitations and claim eligibility",
              ].map((item) => (
                <li key={item} className="flex gap-3 border-t border-edge pt-3">
                  <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 bg-signal" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </section>
    </div>
  );
}
