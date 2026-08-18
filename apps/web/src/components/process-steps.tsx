const STEPS = [
  {
    code: "01",
    title: "RECEIVE",
    body: "The dock watches SEC EDGAR for every 8-K and Form 4 filed against a tracked ticker, around the clock — including every hour US equity trading is closed.",
  },
  {
    code: "02",
    title: "INSPECT ×3",
    body: "Three independent LLM parses read the same document, blind to each other. Each field — event type, effective date, declared amount, affected token — gets its own agreement count, 0 to 3.",
  },
  {
    code: "03",
    title: "STAMP",
    body: "The result posts to EventStateRegistry bonded in USDT0, carrying the source document's SHA-256 hash and every field's agreement level. Nothing is asserted without its receipt.",
  },
  {
    code: "04",
    title: "RELEASE",
    body: "A challenge window opens. Anyone can dispute a posted field by proving it against the source document and take the bond if they're right. Silence, not trust, is what clears it.",
  },
];

export function ProcessSteps() {
  return (
    <section className="border-t border-dock-line/70">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <h2 className="max-w-2xl font-stencil text-2xl tracking-stencil text-bone sm:text-3xl">
          Every filing is cargo until it clears inspection
        </h2>
        <p className="mt-3 max-w-xl text-sm text-bone-muted">
          This is how the dock runs, every time, from the moment a filing appears on EDGAR.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div key={step.code} className="relative border-t-2 border-kraft pt-4">
              <span className="font-mono text-xs text-kraft">{step.code}</span>
              <h3 className="mt-2 font-stencil text-xl tracking-stencil text-bone">{step.title}</h3>
              <p className="mt-3 text-[13px] leading-relaxed text-bone-muted">{step.body}</p>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute -right-4 top-4 hidden font-mono text-kraft/40 lg:block"
                >
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
