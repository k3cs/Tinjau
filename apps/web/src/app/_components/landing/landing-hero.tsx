import Link from "next/link";
import { SystemSchematic } from "./system-schematic";

export function LandingHero() {
  return (
    <section id="product" className="paper-grid border-b border-black/20">
      <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-[1440px] gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(34rem,1.1fr)] lg:items-center lg:px-8 lg:py-20">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-data text-[10px] font-semibold uppercase tracking-[0.08em] text-coal-muted">
            <span className="border border-black/30 bg-paper-bright px-2 py-1">Hackathon MVP</span>
            <span>Replay-backed</span>
            <span aria-hidden>·</span>
            <span>X Layer testnet path</span>
          </div>
          <h1 className="mt-8 text-balance font-display text-5xl font-bold leading-[0.95] tracking-display sm:text-6xl xl:text-7xl">
            Tokenized-stock liquidity should not react blind.
          </h1>
          <p className="mt-7 max-w-[62ch] text-lg leading-8 text-coal-muted">
            Tinjau turns source-grounded evidence and independent market context into a deterministic risk state—then lets policy and contracts bound what can happen to an LP pool.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/demo"
              className="inline-flex min-h-12 items-center justify-center border border-black bg-black px-5 font-data text-xs font-semibold uppercase tracking-[0.06em] text-white transition-colors duration-100 ease-tinjau hover:bg-signal hover:text-black active:translate-y-px"
            >
              Start the 3-scene demo <span aria-hidden className="ml-3">↗</span>
            </Link>
            <Link
              href="/#system"
              className="inline-flex min-h-12 items-center justify-center border border-black bg-transparent px-5 font-data text-xs font-semibold uppercase tracking-[0.06em] transition-colors duration-100 ease-tinjau hover:bg-paper-bright active:translate-y-px"
            >
              Inspect the system <span aria-hidden className="ml-3">↓</span>
            </Link>
          </div>
          <dl className="mt-12 grid grid-cols-3 border-y border-black/20 py-4 font-data text-[10px] uppercase tracking-[0.06em]">
            <div>
              <dt className="text-coal-muted">Risk states</dt>
              <dd className="mt-1 font-semibold text-coal">Normal · Watch · Protect</dd>
            </div>
            <div className="border-l border-black/20 pl-4">
              <dt className="text-coal-muted">AI authority</dt>
              <dd className="mt-1 font-semibold text-coal">Propose only</dd>
            </div>
            <div className="border-l border-black/20 pl-4">
              <dt className="text-coal-muted">Action</dt>
              <dd className="mt-1 font-semibold text-coal">Bounded + expiring</dd>
            </div>
          </dl>
        </div>
        <SystemSchematic />
      </div>
    </section>
  );
}
