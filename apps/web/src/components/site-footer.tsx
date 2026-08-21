import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-edge bg-canvas text-ink">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end lg:px-8">
        <div>
          <p className="font-display text-xl font-semibold tracking-display">Tinjau</p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
            AI organizes evidence. Deterministic policy authorizes state. Contracts constrain action.
          </p>
        </div>
        <div className="font-data text-[10px] uppercase leading-relaxed tracking-[0.06em] text-ink-muted lg:text-right">
          <nav aria-label="Footer navigation" className="mb-4 flex flex-wrap gap-x-5 gap-y-2 lg:justify-end">
            <Link href="/demo" className="text-ink-secondary hover:text-white">Demo</Link>
            <Link href="/developers" className="text-ink-secondary hover:text-white">Developers</Link>
            <Link href="/proof" className="text-ink-secondary hover:text-white">Proof</Link>
          </nav>
          <p>Hackathon MVP · replay-backed</p>
          <p className="mt-1">X Layer testnet path · no production-liquidity claim</p>
        </div>
      </div>
    </footer>
  );
}
