const reasons = [
  ["Reference context", "OKX market samples provide a separate reference input with explicit source and ingestion time."],
  ["Pool reality", "X Layer telemetry measures price, flow, liquidity, drawdown, velocity, and bounded exit depth."],
  ["Cheap settlement", "An expiring risk record and bounded action can be read and enforced onchain without dashboard trust."],
  ["Reusable proof", "Another contract or application can consume the registry record; wider Exchange OS adapters remain roadmap."],
] as const;

export function WhyXLayer() {
  return (
    <section id="why-x-layer" className="section-rule bg-paper" aria-labelledby="x-layer-title">
      <div className="mx-auto max-w-[1440px] px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="font-data text-[10px] font-semibold uppercase tracking-[0.08em] text-coal-muted">Why X Layer</p>
            <h2 id="x-layer-title" className="mt-4 font-display text-4xl font-bold leading-tight tracking-display sm:text-5xl">The reference market and the pool belong in the same risk story.</h2>
          </div>
          <ol className="border-t border-black">
            {reasons.map(([term, detail], index) => (
              <li key={term} className="grid gap-3 border-b border-black/20 py-6 sm:grid-cols-[3rem_0.7fr_1.3fr]">
                <span className="font-data text-xs text-coal-muted">0{index + 1}</span>
                <h3 className="text-sm font-semibold">{term}</h3>
                <p className="text-sm leading-relaxed text-coal-muted">{detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
