"use client";

export default function ProofError({ reset }: { reset: () => void }) {
  return <div className="min-h-screen bg-canvas px-4 py-24 text-ink sm:px-6 lg:px-8"><div className="mx-auto max-w-2xl border-t border-edge pt-6"><h1 className="font-display text-4xl font-bold tracking-display">Proof evidence could not load.</h1><p className="mt-4 text-sm leading-relaxed text-ink-muted">No address, transaction, or service status was inferred. Retry to load the verified manifest.</p><button type="button" onClick={reset} className="mt-6 min-h-11 border border-signal bg-signal px-5 font-data text-[10px] font-semibold uppercase tracking-[0.06em] text-ink hover:bg-signal hover:text-black">Retry</button></div></div>;
}
