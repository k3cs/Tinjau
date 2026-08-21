import Link from "next/link";

import { PipelineDiagram } from "@/components/diagrams/pipeline-diagram";

/**
 * The hero states the problem, then shows the machine.
 *
 * The previous version spent a 46-word paragraph describing a sequence, next to
 * a six-row table describing the same sequence again. Both are gone. The rail
 * carries the sequence, and the words that remain say the one thing a drawing
 * cannot: what this is and what it is not.
 */
export function LandingHero() {
  return (
    <section id="product" className="border-b border-edge">
      <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="data-label rounded border border-edge-strong px-2 py-1 text-ink-muted">
            Hackathon MVP
          </span>
          <span className="data-label text-ink-faint">Replayed data</span>
          <span className="data-label text-ink-faint">X Layer testnet</span>
        </div>

        <h1 className="mt-8 max-w-[18ch] text-balance font-display text-hero-sm text-ink sm:text-hero-md xl:text-hero-lg">
          Someone always reads the news first.
        </h1>

        <p className="mt-7 max-w-[50ch] text-body-md text-ink-secondary">
          A tokenised stock trades on-chain at all hours. The pool trading it keeps offering
          yesterday&rsquo;s price until somebody updates it, and whoever read the announcement
          first takes the difference.
        </p>

        <p className="mt-4 max-w-[50ch] text-body-md text-ink-secondary">
          Tinjau reads that announcement, checks whether the market actually agrees, and lets the
          contract raise the pool&rsquo;s trading fee for a short, capped time.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link href="/risk" className="btn-primary">
            See a decision
            <span aria-hidden>&rarr;</span>
          </Link>
          <Link href="/proof" className="btn-secondary">
            Read the comparison
          </Link>
        </div>

        <div className="mt-14">
          <PipelineDiagram />
        </div>
      </div>
    </section>
  );
}
