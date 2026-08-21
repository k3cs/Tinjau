import Link from "next/link";

export function LandingCta() {
  return (
    <section className="border-t border-edge bg-canvas text-ink">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 py-20 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-28">
        <div className="max-w-3xl">
          <p className="data-label text-signal">Two scenarios, one boundary</p>
          <h2 className="mt-4 font-display text-section-sm lg:text-section-lg">
            Watch it refuse to act.
          </h2>
          <p className="mt-5 max-w-[58ch] text-body-md text-ink-muted">
            One screen shows the whole decision: the claims, the market check, the rule that
            refused, and the fee the pool kept charging anyway.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
          <Link href="/risk" className="btn-primary">
            Open the risk state
            <span aria-hidden>→</span>
          </Link>
          <Link href="/demo" className="btn-secondary text-ink hover:bg-white/10">
            Guided walkthrough
          </Link>
        </div>
      </div>
    </section>
  );
}
