"use client";

export default function DemoError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="demo-shell px-4 py-16 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-2xl border border-protect/60 bg-canvas p-6 sm:p-8">
        <p className="data-label text-protect">Walkthrough unavailable</p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-display">No state was inferred.</h1>
        <p className="mt-4 leading-relaxed text-ink-secondary">The demo could not validate its selected fixture. Retry the trace; Tinjau will not substitute a live or successful result.</p>
        <button type="button" onClick={reset} className="mt-7 min-h-11 border border-signal bg-signal px-4 font-data text-xs font-semibold uppercase tracking-[0.06em] text-black transition-colors duration-100 ease-tinjau hover:bg-white active:translate-y-px">Retry walkthrough</button>
      </section>
    </div>
  );
}
