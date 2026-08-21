import Link from "next/link";

import { EXPOSURE, formatUsdSigned } from "@/lib/product/exposure";

/**
 * The landing page's only measured claim about the outside world.
 *
 * Everything else on this page describes a mechanism. This says the mechanism is
 * answering something that actually happens, and it is the one number on the
 * landing page taken from a market we do not control.
 *
 * The third tile is not padding. Leading with "78% of filings cost the LP money"
 * and stopping there would be true and misleading, because the median event is
 * immaterial. The disclosure travels in the same row as the finding, at the same
 * size, or this section is doing the thing the rest of the site refuses to do.
 */
export function WhyItMattersTeaser() {
  const { headline, scope, byForm } = EXPOSURE;
  const [material, routine] = byForm;
  const ratio = Math.round(Math.abs(material.medianUsd) / Math.abs(routine.medianUsd));

  return (
    <section className="section-rule bg-canvas" aria-labelledby="why-it-matters-title">
      <div className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.62fr_1.38fr] lg:items-end">
          <div>
            <p className="data-label text-ink-faint">Why it matters</p>
            <h2
              id="why-it-matters-title"
              className="mt-4 max-w-[17ch] font-display text-section-sm text-ink lg:text-section-lg"
            >
              We measured the problem before building for it.
            </h2>
            <p className="mt-5 max-w-[40ch] text-body-md text-ink-muted">
              {headline.eventCount} real filings, {scope.pools} real pools holding tokenised
              stocks on X Layer.
            </p>
            <Link
              href="/why-it-matters"
              className="mt-6 inline-flex min-h-10 items-center gap-2 text-body-md text-signal underline underline-offset-4"
            >
              See the measurement
              <span aria-hidden>&rarr;</span>
            </Link>
          </div>

          <dl className="grid gap-px border border-edge bg-edge sm:grid-cols-3">
            <div className="bg-canvas p-6">
              <dt className="data-label text-ink-faint">Went against the pool</dt>
              <dd className="mt-3 font-data text-heading-lg tabular text-ink">
                {headline.lossCount}
                <span className="text-ink-faint">/{headline.eventCount}</span>
              </dd>
              <p className="mt-2 text-body-sm text-ink-muted">
                filings where the first trade afterwards cost the pool.
              </p>
            </div>

            <div className="bg-canvas p-6">
              <dt className="data-label text-ink-faint">Material vs routine</dt>
              <dd className="mt-3 font-data text-heading-lg tabular text-watch-soft">{ratio}x</dd>
              <p className="mt-2 text-body-sm text-ink-muted">
                more costly, on filings a price-only policy cannot tell apart.
              </p>
            </div>

            <div className="bg-canvas p-6">
              <dt className="data-label text-ink-faint">And the honest half</dt>
              <dd className="mt-3 font-data text-heading-lg tabular text-ink-muted">
                {formatUsdSigned(headline.medianUsd)}
              </dd>
              <p className="mt-2 text-body-sm text-ink-muted">
                median event. Immaterial at this depth. The risk is in the tail.
              </p>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
