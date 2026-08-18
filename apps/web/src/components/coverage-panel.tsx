import { TRACKED_TOKENS, NOT_YET_TRACKED_TICKERS } from "@/lib/chain/tokenAddresses";

export function CoveragePanel() {
  return (
    <section className="border-t border-dock-line/70">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <h2 className="max-w-2xl font-stencil text-2xl tracking-stencil text-bone sm:text-3xl">
          Two tickers cleared for inspection, eight queued
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-bone-muted">
          The poller only watches what it&apos;s configured to watch. Here&apos;s the honest state of coverage
          today — a queued ticker returns &quot;not yet tracked,&quot; never a silent empty result.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          {TRACKED_TOKENS.map((t) => (
            <span
              key={t.symbol}
              className="flex items-center gap-2 border border-clearance/50 bg-clearance-soft px-3 py-1.5 font-mono text-[12px] text-clearance"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-clearance" />
              {t.symbol} — live
            </span>
          ))}
          {NOT_YET_TRACKED_TICKERS.map((ticker) => (
            <span
              key={ticker}
              className="flex items-center gap-2 border border-hold/40 bg-hold-soft px-3 py-1.5 font-mono text-[12px] text-hold"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-hold" />
              {ticker}x — queued
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
