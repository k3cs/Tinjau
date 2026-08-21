const rules = [
  ["AI", "Parses, resolves, groups, explains, and proposes."],
  ["Policy", "Checks evidence class, independence, freshness, and confirmation."],
  ["Contracts", "Enforce fee ceiling, duration, replay protection, expiry, and decay."],
] as const;

export function SafetyBoundary() {
  return (
    <section className="section-rule bg-signal text-black" aria-labelledby="safety-title">
      <div className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <p className="font-data text-[10px] font-semibold uppercase tracking-[0.08em]">The authority boundary</p>
        <h2 id="safety-title" className="mt-4 max-w-5xl font-display text-4xl font-bold leading-tight tracking-display sm:text-6xl">AI proposes. Policy decides. Contracts constrain.</h2>
        <dl className="mt-12 grid border-y border-black lg:grid-cols-3">
          {rules.map(([term, detail], index) => (
            <div key={term} className={`py-6 lg:px-6 ${index > 0 ? "border-t border-black lg:border-l lg:border-t-0" : ""}`}>
              <dt className="font-data text-xs font-semibold uppercase tracking-[0.06em]">{term}</dt>
              <dd className="mt-3 max-w-[42ch] text-sm leading-6">{detail}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 max-w-4xl border-l-2 border-black pl-5 text-lg font-semibold leading-7">Rumor-only evidence cannot authorize PROTECT. WATCH cannot invoke the aggressive fee. Protection expires without an LLM deciding when to stop.</p>
      </div>
    </section>
  );
}
