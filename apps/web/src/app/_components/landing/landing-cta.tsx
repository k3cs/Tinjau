import Link from "next/link";

export function LandingCta() {
  return (
    <section className="border-t border-edge bg-canvas text-ink">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="data-label text-signal">Two scenarios, one boundary</p>
          <h2 className="mt-4 font-display text-section-sm lg:text-section-lg">
            Watch it refuse to act.
          </h2>
          <p className="mt-4 max-w-[44ch] text-body-md text-ink-muted">
            One screen: the evidence, the market check, the rule that refused, and the fee the pool
            kept charging anyway.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
          <Link href="/risk" className="btn-primary">
            How it decides
            <span aria-hidden>&rarr;</span>
          </Link>
          <Link href="/demo" className="btn-secondary">
            Guided walkthrough
          </Link>
        </div>
      </div>
    </section>
  );
}
