"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-canvas px-4 py-16 text-ink sm:px-6 lg:px-8">
      <section className="mx-auto max-w-2xl border border-edge bg-canvas-sunken p-6 sm:p-8">
        <p className="data-label text-ink-muted">Product page unavailable</p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-display">
          The page did not infer a fallback claim.
        </h1>
        <p className="mt-4 leading-relaxed text-ink-muted">
          Tinjau could not render this surface. Retry the page; the error does not imply a risk state or completed action.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-7 min-h-11 border border-signal bg-signal px-4 font-data text-xs font-semibold uppercase tracking-[0.06em] text-ink transition-colors duration-100 ease-tinjau hover:bg-signal hover:text-black active:translate-y-px"
        >
          Retry page
        </button>
      </section>
    </div>
  );
}
