const RECORDS = [
  {
    code: "P2.2 — REACTION LATENCY",
    n: "n = 46 filings",
    headline: "4.6 min",
    sub: "median gap, filing acceptance → first on-chain trade",
    detail: "30% of filings (14/46) saw no trade at all inside the ±60 minute window.",
  },
  {
    code: "P2.4 — MARKOUT",
    n: "n = 32 events",
    headline: "$0.0614",
    sub: "median realised LP loss per trade, 60 minutes out",
    detail: "Net of the 25% protocol fee; the reported window is the trade that already happened, not a simulation.",
  },
];

export function EvidenceStrip() {
  return (
    <section className="border-t border-dock-line/70 bg-dock-raised/30">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <h2 className="max-w-2xl font-stencil text-2xl tracking-stencil text-bone sm:text-3xl">
          What stale pools actually cost, measured, not modeled
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-bone-muted">
          Two measurement studies, method fixed and pre-registered before either ran, reported as
          they came out.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {RECORDS.map((r) => (
            <div key={r.code} className="border border-dock-line bg-dock p-6">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-bone-muted">
                <span>{r.code}</span>
                <span>{r.n}</span>
              </div>
              <p className="tabular mt-4 font-mono text-4xl font-bold text-bone sm:text-5xl">{r.headline}</p>
              <p className="mt-2 text-sm text-bone-muted">{r.sub}</p>
              <p className="mt-4 border-t border-dock-line pt-3 text-[12px] leading-relaxed text-bone-muted">
                {r.detail}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-2xl text-[12px] leading-relaxed text-bone-muted">
          Both studies ran against X Layer&apos;s live reference USDG pools. Full method and raw per-event
          data are in the repository&apos;s <code className="text-tracking">reaction-latency-study.md</code> and{" "}
          <code className="text-tracking">markout-study.md</code> — nothing here is rounded up from a smaller
          number.
        </p>
      </div>
    </section>
  );
}
