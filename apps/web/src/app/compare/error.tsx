"use client";

export default function ComparisonError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="circuit-field min-h-[calc(100vh-8rem)] px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-2xl rounded-lg border border-protect/50 bg-canvas p-6 sm:p-8">
        <p className="data-label text-protect">Comparison unavailable</p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-display text-ink">No result was inferred.</h1>
        <p className="mt-4 leading-relaxed text-ink-secondary">
          The comparison failed to render. Tinjau does not preserve a previous winner or replace missing values with zeros.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-7 min-h-11 rounded-md bg-signal px-4 font-data text-xs font-semibold uppercase tracking-[0.06em] text-black transition-colors hover:bg-white"
        >
          Retry comparison
        </button>
      </section>
    </div>
  );
}
