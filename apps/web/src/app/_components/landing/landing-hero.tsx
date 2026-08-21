import Link from "next/link";

import { SystemSchematic } from "./system-schematic";

export function LandingHero() {
  return (
    <section id="product" className="border-b border-edge-light">
      <div className="mx-auto grid max-w-[1440px] gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(32rem,1.05fr)] lg:items-center lg:px-8 lg:py-24">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="data-label rounded border border-coal px-2 py-1 text-coal">
              Hackathon MVP
            </span>
            <span className="data-label text-coal-faint">Replayed data</span>
            <span className="data-label text-coal-faint">X Layer testnet</span>
          </div>

          <h1 className="mt-8 text-balance font-display text-hero-sm text-coal sm:text-hero-md xl:text-hero-lg">
            Tokenized-stock liquidity should not react blind.
          </h1>

          <p className="mt-8 max-w-[56ch] text-body-md text-coal-soft">
            A stock token keeps trading after the market closes and after the news breaks. Tinjau
            reads the filing behind a move, checks the pool independently, and lets the contract
            decide what the pool is allowed to do about it.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/risk" className="btn-primary bg-coal text-paper-bright hover:bg-signal hover:text-black">
              See a decision
              <span aria-hidden>→</span>
            </Link>
            <Link href="/compare" className="btn-secondary text-coal">
              Read the comparison
            </Link>
          </div>

          <dl className="mt-12 grid gap-x-6 gap-y-5 border-y border-edge-light py-5 sm:grid-cols-3">
            <div>
              <dt className="data-label text-coal-faint">States</dt>
              <dd className="mt-1.5 font-data text-[13px] text-coal">Normal · Watch · Protect</dd>
            </div>
            <div className="sm:border-l sm:border-edge-light sm:pl-6">
              <dt className="data-label text-coal-faint">What the AI may do</dt>
              <dd className="mt-1.5 font-data text-[13px] text-coal">Propose. Nothing else.</dd>
            </div>
            <div className="sm:border-l sm:border-edge-light sm:pl-6">
              <dt className="data-label text-coal-faint">What the pool may do</dt>
              <dd className="mt-1.5 font-data text-[13px] text-coal">
                Raise one fee, on a fixed clock
              </dd>
            </div>
          </dl>
        </div>

        <SystemSchematic />
      </div>
    </section>
  );
}
