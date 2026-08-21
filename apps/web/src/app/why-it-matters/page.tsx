import type { Metadata } from "next";
import Link from "next/link";

import { ConcentrationDiagram } from "@/components/diagrams/concentration-diagram";
import { ExposureUnitDiagram } from "@/components/diagrams/exposure-unit-diagram";
import { FilingTypeDiagram } from "@/components/diagrams/filing-type-diagram";
import { Reveal } from "@/components/reveal";
import { EXPOSURE, formatUsdSigned } from "@/lib/product/exposure";

export const metadata: Metadata = {
  title: "Why it matters · Tinjau",
  description:
    "32 real filings measured against 10 real X Layer pools: how often the first trade after a filing costs liquidity providers, and how much of that cost sits in the tail.",
};

/**
 * The only page on this site whose evidence comes from a market we do not own.
 *
 * Every other measurement here runs on a builder-controlled testnet pool. This
 * one is 32 real SEC filings against ten real tokenised-equity pools on X Layer
 * mainnet, which makes it the only thing that can answer "is the problem real"
 * rather than "does the mechanism work".
 *
 * It is therefore also the page most able to mislead, and the guard is
 * structural rather than editorial: §4 is not an appendix. The measured section
 * cannot be read without meeting the sentence that says these pools had no hook
 * attached, because that sentence is the difference between describing a problem
 * and claiming to have solved it.
 */
export default function WhyItMattersPage() {
  const { headline, scope, concentration, byForm } = EXPOSURE;
  const [material, routine] = byForm;
  const ratio = Math.round(Math.abs(material.medianUsd) / Math.abs(routine.medianUsd));

  return (
    <div className="bg-canvas text-ink">
      <section className="border-b border-edge px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-[1440px]">
          <p className="data-label text-ink-faint">Why it matters</p>
          <h1 className="mt-4 max-w-[19ch] text-balance font-display text-section-sm text-ink lg:text-section-lg">
            The pool is the last to know.
          </h1>
          <p className="mt-6 max-w-[54ch] text-body-md text-ink-secondary">
            We measured it rather than asserting it. {headline.eventCount} real filings, against{" "}
            {scope.pools} real pools holding tokenised US stocks on {scope.chain}, and the first
            trade that landed after each one.
          </p>
        </div>
      </section>

      <section className="section-rule">
        <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-heading-lg text-ink">
              It goes against the pool far more often than not.
            </h2>
          </div>
          <div className="mt-8">
            <ExposureUnitDiagram />
          </div>
        </div>
      </section>

      <section className="section-rule bg-canvas-sunken">
        <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="data-label text-signal">The reason this product exists</p>
            <h2 className="mt-4 font-display text-heading-lg text-ink">
              Which document arrived changes the price of being wrong.
            </h2>
            <p className="mt-4 max-w-[54ch] text-body-md text-ink-muted">
              At the moment of the trade, a routine insider filing and a material announcement look
              identical on a price chart. They do not cost the same.
            </p>
          </div>
          <div className="mt-8">
            <FilingTypeDiagram />
          </div>
          <p className="mt-6 max-w-[62ch] text-body-sm text-ink-muted">
            That gap of roughly {ratio} times is what a policy watching only price is blind to, and
            it is the whole argument for reading the document.{" "}
            <Link href="/risk" className="text-signal underline underline-offset-4">
              How Tinjau reads it
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="section-rule">
        <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="data-label text-watch-soft">Where the risk actually lives</p>
            <h2 className="mt-4 font-display text-heading-lg text-ink">
              Harmless on average. The average is not what you experience.
            </h2>
          </div>
          <div className="mt-8">
            <ConcentrationDiagram />
          </div>

          <div className="mt-10 grid gap-px border border-edge bg-edge lg:grid-cols-3">
            <div className="bg-canvas p-6">
              <p className="data-label text-ink-faint">Median event</p>
              <p className="mt-3 font-data text-heading-md tabular text-ink">
                {formatUsdSigned(headline.medianUsd)}
              </p>
              <p className="mt-2 text-body-sm text-ink-muted">
                Two ten-thousandths of a basis point of pool TVL. Immaterial, and we say so.
              </p>
            </div>
            <div className="bg-canvas p-6">
              <p className="data-label text-ink-faint">Worst single event</p>
              <p className="mt-3 font-data text-heading-md tabular text-watch-soft">
                {formatUsdSigned(headline.worstUsd)}
              </p>
              <p className="mt-2 text-body-sm text-ink-muted">
                On a first trade about ten times the usual size. The cost scales with the trade,
                not with the headline.
              </p>
            </div>
            <div className="bg-canvas p-6">
              <p className="data-label text-ink-faint">Why that matters later</p>
              <p className="mt-3 font-display text-heading-sm text-ink">Depth moves the number</p>
              <p className="mt-2 text-body-sm text-ink-muted">
                These pools are thin, so the damage is cents. The mechanism does not change as
                they get deeper. The amount does.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-rule bg-canvas-sunken">
        <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-heading-lg text-ink">
                What this measurement does not say
              </h2>
              <p className="mt-2 max-w-[52ch] text-body-md text-ink-muted">
                This is the honest half, and it is on the same page as the numbers rather than
                behind a link.
              </p>
              <ul className="mt-6 space-y-4">
                {EXPOSURE.limitations.map((limitation) => (
                  <li key={limitation} className="flex gap-3 text-body-sm text-ink-muted">
                    <span aria-hidden className="mt-2.5 h-px w-4 shrink-0 bg-watch" />
                    {limitation}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="font-display text-heading-lg text-ink">
                Sentences these numbers do not support
              </h2>
              <p className="mt-2 text-body-sm text-ink-muted">
                Written down so they cannot drift back into a pitch.
              </p>
              <ul className="mt-6 space-y-2.5">
                {EXPOSURE.prohibited.map((claim) => (
                  <li
                    key={claim}
                    className="flex gap-3 rounded-lg border border-protect/40 bg-protect/[0.06] p-3 text-body-sm text-ink"
                  >
                    <span aria-hidden className="font-data text-protect-soft">
                      &#10005;
                    </span>
                    <span>&ldquo;{claim}&rdquo;</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 rounded-xl border-2 border-watch bg-watch/[0.07] p-5">
                <p className="data-label text-watch-soft">Read this before quoting anything above</p>
                <p className="mt-3 text-body-sm text-ink-secondary">
                  These {scope.pools} pools are third-party and had{" "}
                  <span className="font-medium text-ink">no Tinjau hook attached</span>. Nothing
                  here measures what Tinjau prevented. Our own benchmark, on our own pool, found
                  that Tinjau{" "}
                  <Link href="/proof" className="text-signal underline underline-offset-4">
                    ties a do-nothing policy
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-rule">
        <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="data-label text-signal">Who this is for</p>
            <h2 className="mt-4 font-display text-heading-lg text-ink">
              The record is a public object, not a subscription.
            </h2>
            <p className="mt-4 max-w-[54ch] text-body-md text-ink-muted">
              The risk state lives on chain. Anyone can read it without asking us, without our
              dashboard, and without a key.
            </p>
          </div>

          <div className="mt-8 grid gap-px border border-edge bg-edge md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                who: "Liquidity providers",
                now: "See why a pool's fee moved, and when it returns to normal.",
              },
              {
                who: "Pool operators",
                now: "Let a capped, expiring fee be the only automated action on the pool.",
              },
              {
                who: "Wallets and dashboards",
                now: "Read the state and render your own warning. Reference reader ships in the repo.",
              },
              {
                who: "Other venues",
                now: "The same record can inform a different policy. Adapters are roadmap, and labelled roadmap.",
              },
            ].map((row, index) => (
              <Reveal key={row.who} delay={index * 0.04} className="bg-canvas">
                <div className="p-6">
                  <p className="font-display text-heading-sm text-ink">{row.who}</p>
                  <p className="mt-2 text-body-sm text-ink-muted">{row.now}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <p className="mt-8 text-body-sm text-ink-muted">
            {concentration.note}{" "}
            <Link href="/developers" className="text-signal underline underline-offset-4">
              Read the record yourself
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
