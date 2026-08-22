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
 *
 * The paired-pool section added below is the opposite kind of evidence: pools we
 * deployed, tokens we can mint, a trigger we wrote by hand. It sits after the
 * guard rather than beside the exposure numbers, so a reader reaches it having
 * already been told that nothing above it involved a Tinjau hook, and it
 * restates its own conditions instead of inheriting the page's.
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

      {/*
        S3.2, published here because its own pre-registration required the
        result to land on this surface at the weight a positive one would have
        received, whichever way it landed. It landed positive, which is the case
        where that rule is easiest to obey and least meaningful, so the ratio is
        given a tile of its own next to the number rather than a footnote.
      */}
      <section className="section-rule">
        <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="data-label text-protect-soft">
              Our pool, our trigger, testnet, mock tokens
            </p>
            <h2 className="mt-4 font-display text-heading-lg text-ink">
              When the fee does move, it does what the arithmetic says it must.
            </h2>
            <p className="mt-4 max-w-[56ch] text-body-md text-ink-muted">
              Registered in advance, then run once. Two X Layer Testnet pools we deployed
              ourselves, holding mock tokens we can mint at will, replayed the same 120 recorded
              swaps. One had the hook attached and was holding a PROTECT we constructed by hand.
              The other had no hook. None of the {scope.pools} real pools above is involved in
              this, and the two measurements cannot be added together.
            </p>
            <p className="mt-4 max-w-[56ch] text-body-md text-ink-muted">
              The pre-registered outcome band came out <span className="font-data">CONFIRMS</span>,
              meaning the gap cleared half the fee difference and the control read zero. It is
              stated here first because the pre-registration required the band stated first
              whichever way it landed, and it is worth very little on its own. The tile beside it
              is the part that decides how much.
            </p>
          </div>

          <div className="mt-8 grid gap-px border border-edge bg-edge lg:grid-cols-3">
            <div className="bg-canvas p-6">
              <p className="data-label text-ink-faint">The measured gap</p>
              <p className="mt-3 font-data text-heading-md tabular text-ink">195.38 bps</p>
              <p className="mt-2 text-body-sm text-ink-muted">
                More of the flow&rsquo;s notional retained in the protected pool, under the
                pre-registered primary mark. All three marks are published together (195.38,
                158.22, 194.62 bps) and the sign held under each. The paired control run, both
                pools charging the same fee, differed by exactly zero in base units.
              </p>
            </div>
            <div className="bg-canvas p-6">
              <p className="data-label text-watch-soft">Read this before that number</p>
              <p className="mt-3 font-data text-heading-md tabular text-watch-soft">100.195%</p>
              <p className="mt-2 text-body-sm text-ink-muted">
                The same gap, as a share of what the fee difference alone must produce. Under a
                fixed list of trades a higher fee necessarily leaves the position holding more.
                This is a conformance test of the fee mechanism, written down as the expected
                outcome before the run, not a discovery.
              </p>
            </div>
            <div className="bg-canvas p-6">
              <p className="data-label text-protect-soft">What it does not establish</p>
              <p className="mt-3 font-display text-heading-sm text-ink">
                Whether it acts at the right time
              </p>
              <p className="mt-2 text-body-sm text-ink-muted">
                The PROTECT in that run was constructed, not earned. On the canonical replay the
                same event resolves to WATCH, and the frozen scenario set is close to a census of
                what this pool can measure, so there is no wider population of events in which to
                look for one that would promote.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-10 lg:grid-cols-2">
            <div>
              <h3 className="font-display text-heading-sm text-ink">
                Conditions the number does not survive without
              </h3>
              <ul className="mt-6 space-y-4">
                {[
                  "Both pools are builder-controlled and hold freely-mintable mock tokens with no value. Neither is a market: no external liquidity, no external participant, no price discovery.",
                  "Zero flow elasticity is assumed. The identical trade list was replayed under a 40x fee difference, and in a real market a 2% fee deters much of the flow a 0.05% fee attracts. The net direction of that bias is unmeasured.",
                  "195.38 bps is an upper bound on a full protection episode, not a typical figure. Only 364 s of the 3,600 s plateau was exercised, so the decay curve, which is most of a real episode, contributed nothing.",
                  "One event, one hour, 120 swaps, one asset, one pool. It ran on a different pool and a different chain from the three-policy benchmark, so the two may not be combined into one figure.",
                ].map((condition) => (
                  <li key={condition} className="flex gap-3 text-body-sm text-ink-muted">
                    <span aria-hidden className="mt-2.5 h-px w-4 shrink-0 bg-watch" />
                    {condition}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-display text-heading-sm text-ink">
                Three runs. Two were void, and both are published.
              </h3>
              <p className="mt-4 max-w-[52ch] text-body-sm text-ink-muted">
                The first run printed the same passing band at 49,804 bps, which is 255 times the
                largest gap this fee can produce. Three of its four withdrawals had never read
                back. The cause was the one already on our limitations list (this chain&rsquo;s RPC
                answering from a node that had not yet seen the burn) rather than a fault in the
                logic. It was caught, voided, and kept in full rather than deleted. The second run
                turned the same staleness into a loud refusal and stopped without reporting a
                number. The run that produced the figure above pins every reading to a block, and
                records that the naive read still returned zero while it did so.
              </p>

              <div className="mt-8 rounded-xl border-2 border-watch bg-watch/[0.07] p-5">
                <p className="data-label text-watch-soft">Read this before quoting the number</p>
                <p className="mt-3 text-body-sm text-ink-secondary">
                  The gap is the fee arithmetic arriving where it was predicted to arrive, on a
                  pool we control, under a trigger we wrote. It is{" "}
                  <span className="font-medium text-ink">not</span> a measurement of harm
                  prevented, and it opens no new sentence about LP outcomes:{" "}
                  <span className="font-data">canClaimLossAvoided</span> stays{" "}
                  <span className="font-medium text-ink">false</span> and every claim ruled out
                  above stays ruled out.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-rule bg-canvas-sunken">
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
