/**
 * Why this chain, in four lines instead of four paragraphs.
 *
 * Each reason is now a short noun phrase plus one clause. The longer versions
 * said the same things with more hedging words, and the hedges were not the
 * qualifications that matter (those live on `/roadmap` and `/proof`, where they
 * are attached to the specific capability they qualify).
 */
const reasons = [
  ["Reference price", "OKX index samples arrive with a source and a timestamp."],
  ["Pool reality", "X Layer telemetry measures the pool itself, not a proxy."],
  ["Cheap enforcement", "An expiring record and a bounded fee both fit on chain."],
  ["Readable by others", "Another contract can read the record. Wider adapters are roadmap."],
] as const;

export function WhyXLayer() {
  return (
    <section id="why-x-layer" className="section-rule bg-canvas" aria-labelledby="x-layer-title">
      <div className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.62fr_1.38fr]">
          <div>
            <p className="data-label text-ink-faint">Why X Layer</p>
            <h2
              id="x-layer-title"
              className="mt-4 max-w-[16ch] font-display text-section-sm text-ink lg:text-section-lg"
            >
              The market and the pool, on one chain.
            </h2>
          </div>
          <ol className="border-t border-edge">
            {reasons.map(([term, detail], index) => (
              <li
                key={term}
                className="grid gap-2 border-b border-edge py-5 sm:grid-cols-[3rem_0.7fr_1.3fr] sm:gap-4"
              >
                <span className="font-data text-[11px] text-ink-faint">0{index + 1}</span>
                <h3 className="text-body-sm font-semibold text-ink">{term}</h3>
                <p className="text-body-sm text-ink-muted">{detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
