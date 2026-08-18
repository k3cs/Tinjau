import Link from "next/link";
import { HeroManifest } from "@/components/hero-manifest";
import { ProcessSteps } from "@/components/process-steps";
import { EvidenceStrip } from "@/components/evidence-strip";
import { CoveragePanel } from "@/components/coverage-panel";

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-dock-line/70">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 45% at 15% 0%, rgba(194,135,42,0.18), transparent 60%), repeating-linear-gradient(180deg, rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.35) 1px, transparent 1px, transparent 64px)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-8">
          <div>
            <h1 className="max-w-xl font-stencil text-4xl leading-[1.05] tracking-stencil text-bone sm:text-5xl lg:text-6xl">
              Every filing held, inspected, and stamped before it&apos;s a fact.
            </h1>
            <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-bone-muted sm:text-base">
              Tokenised US equities trade around the clock, but the SEC filings that move them land
              almost entirely — <span className="text-bone">~97% of last year&apos;s 8-Ks</span> from
              the ten underlyings this tracks — while the US market is closed. AFTERHOURS holds every
              one as bonded cargo — three independent parses, a per-field agreement count, a
              challenge window — and releases it on-chain instead of asserting it.
            </p>
            <p className="mt-3 max-w-lg font-mono text-[11px] leading-relaxed text-bone-muted">
              ~97% is stated at that precision, not a false-precision decimal: 171 8-Ks in the
              trailing year, and an independent recount puts 166–168 of them inside closed-market
              hours depending on how DST and holidays are handled — no published minute-by-minute
              classifier exists yet for this figure.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/holdings"
                className="border border-kraft bg-kraft px-5 py-3 text-center font-mono text-[13px] font-bold uppercase tracking-[0.08em] text-kraft-line transition-colors hover:bg-kraft-light"
              >
                Look up an address →
              </Link>
              <Link
                href="/calendar"
                className="border border-dock-line bg-dock-raised px-5 py-3 text-center font-mono text-[13px] uppercase tracking-[0.08em] text-bone transition-colors hover:border-kraft/60 hover:text-kraft-light"
              >
                See what&apos;s scheduled next
              </Link>
            </div>
            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.08em] text-bone-muted">
              No wallet · no signature · no gas — this is a read, not a transaction.
            </p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <HeroManifest />
          </div>
        </div>
      </section>

      <ProcessSteps />
      <EvidenceStrip />
      <CoveragePanel />

      <section className="border-t border-dock-line/70">
        <div className="mx-auto max-w-6xl px-5 py-16 text-center sm:px-8 sm:py-20">
          <h2 className="mx-auto max-w-xl font-stencil text-2xl tracking-stencil text-bone sm:text-3xl">
            Your holdings have a paper trail. Go read it.
          </h2>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/holdings"
              className="border border-kraft bg-kraft px-6 py-3 font-mono text-[13px] font-bold uppercase tracking-[0.08em] text-kraft-line transition-colors hover:bg-kraft-light"
            >
              Open the holder digest →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
