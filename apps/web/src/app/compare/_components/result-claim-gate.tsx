export function ResultClaimGate() {
  return (
    <section className="grid gap-px overflow-hidden rounded-lg border border-edge bg-edge lg:grid-cols-[0.8fr_1.2fr]">
      <div className="bg-canvas-soft p-6 sm:p-8">
        <p className="data-label text-ink-muted">Claim gate</p>
        <div className="mt-4 flex items-center gap-3">
          <span aria-hidden className="h-3 w-3 rotate-45 bg-protect" />
          <p className="font-display text-3xl font-semibold tracking-display text-ink">Closed</p>
        </div>
        <p className="mt-3 leading-relaxed text-ink-secondary">
          <span className="font-data text-sm">canClaimLossAvoided</span> is unavailable until every policy row validates. No winner can be named from this shell.
        </p>
      </div>
      <div className="bg-canvas p-6 sm:p-8">
        <h2 className="font-display text-2xl font-semibold tracking-display text-ink">Counterfactual limitation</h2>
        <p className="mt-3 leading-relaxed text-ink-secondary">
          The benchmark re-prices the same observed swaps under different fees. Real traders could change behavior when fees change, so fee revenue and adverse-selection effects must remain separate.
        </p>
        <p className="mt-4 font-data text-[11px] leading-relaxed text-ink-muted">
          Sample: three economic scenarios · one asset · one pool · full result distribution required
        </p>
      </div>
    </section>
  );
}
