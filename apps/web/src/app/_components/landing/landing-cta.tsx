import Link from "next/link";

export function LandingCta() {
  return (
    <section className="border-t border-edge bg-canvas text-ink">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-24 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-32">
        <div>
          <p className="font-data text-[10px] font-semibold uppercase tracking-[0.08em] text-signal">Three scenes · one safety boundary</p>
          <h2 className="mt-4 max-w-4xl font-display text-4xl font-bold leading-tight tracking-display sm:text-6xl">See the system make three different decisions.</h2>
        </div>
        <Link href="/demo" className="inline-flex min-h-14 shrink-0 items-center justify-center border border-signal bg-signal px-6 font-data text-xs font-semibold uppercase tracking-[0.06em] text-black transition-colors duration-100 ease-tinjau hover:bg-white active:translate-y-px">Start the demo <span aria-hidden className="ml-3">↗</span></Link>
      </div>
    </section>
  );
}
