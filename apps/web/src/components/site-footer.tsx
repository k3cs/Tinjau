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
          <p>Hackathon MVP · replay-backed</p>
          <p className="mt-1">X Layer testnet path · no production-liquidity claim</p>
        </div>
      </div>
    </footer>
  );
}
