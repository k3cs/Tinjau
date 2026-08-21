import type { Metadata } from "next";
import Link from "next/link";

import { PolicySightDiagram } from "@/components/diagrams/policy-sight-diagram";
import { RestraintDiagram } from "@/components/diagrams/restraint-diagram";
import { SignFlipDiagram } from "@/components/diagrams/sign-flip-diagram";
import { HANDOFF_DIR, HANDOFF_GENERATED } from "@/lib/handoff/artifacts";
import { COMPARISON_DOC, signFlipCount } from "@/lib/handoff/comparison";

import { ClaimGate } from "./_components/claim-gate";
import { ComparisonGrid } from "./_components/comparison-grid";

export const metadata: Metadata = {
  title: "Three-policy comparison · Tinjau",
  description:
    "Static, volatility-only and Tinjau over identical replayed trades. The economic result is indeterminate; the behavioural one is not.",
};

const POLICY_ORDER = ["STATIC", "VOLATILITY_ONLY", "TINJAU"] as const;

const POLICY_NAME: Record<string, string> = {
  STATIC: "Do nothing",
  VOLATILITY_ONLY: "Price only",
  TINJAU: "Tinjau",
};

/**
 * The benchmark page, led by the two drawings that carry its two findings.
 *
 * The finding that does not survive is drawn first, and it is drawn rather than
 * argued: 27 lines, all of them crossing the middle. A reader who looks at that
 * picture cannot come away thinking a winner was found, which is more than three
 * paragraphs of hedging ever achieved.
 */
export default function ComparePage() {
  const { flipped, comparable } = signFlipCount();
  const interpretation = COMPARISON_DOC.interpretation;

  return (
    <div className="bg-canvas text-ink">
      <section className="mx-auto max-w-[1440px] px-4 pb-12 pt-14 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="data-label text-ink-faint">Three-policy comparison</p>
          <h1 className="mt-4 font-display text-section-sm text-ink lg:text-section-lg">
            No winner. We are publishing that.
          </h1>
          <p className="mt-5 max-w-[54ch] text-body-md text-ink-secondary">
            We ran three fee policies over the same replayed trades to see which left the pool
            better off. Change nothing but the way the fee is counted, and the winner swaps.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
          <SignFlipDiagram />
          <div className="rounded-xl border border-edge bg-canvas-sunken p-6">
            <p className="data-label text-watch-soft">What it cannot determine</p>
            <p className="mt-3 font-display text-heading-md text-ink">
              Which policy earned the LP more.
            </p>
            <p className="mt-3 text-body-sm text-ink-muted">
              Every one of the {comparable} comparisons flips sides, all {flipped} of them. Quoting
              one of the two numbers would be choosing a winner by choosing how to add up, so both
              are published and neither is chosen.
            </p>
            {/* The benchmark's own wording is precise and full of its internal
                vocabulary (TINJAU_BEATS, AMD-002, "basis"). It is the record, so
                it is not paraphrased away, but it is no longer the first thing a
                new reader hits: the plain reading is above, and this sits under
                a disclosure for anyone checking the exact claim. */}
            <details className="group mt-6 border-t border-edge pt-5">
              <summary className="cursor-pointer list-none text-body-sm text-signal underline underline-offset-4">
                The benchmark&rsquo;s exact wording
              </summary>
              <p className="mt-3 text-body-sm text-ink-secondary">{interpretation.text}</p>
            </details>
          </div>
        </div>
      </section>

      <section className="section-rule">
        <div className="mx-auto max-w-[1440px] px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="data-label text-signal">What it can determine</p>
            <h2 className="mt-4 font-display text-heading-lg text-ink">
              Which one acted when nothing had actually happened.
            </h2>
            <p className="mt-4 max-w-[54ch] text-body-md text-ink-muted">
              {interpretation.defensibleClaim}
            </p>
          </div>
          <div className="mt-8">
            <RestraintDiagram scenarioId="D-neutral-normal" />
          </div>
        </div>
      </section>

      <section className="section-rule">
        <div className="mx-auto max-w-[1440px] px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="font-display text-heading-lg text-ink">Identical input, by construction</h2>
          <p className="mt-2 max-w-[58ch] text-body-md text-ink-muted">
            All three policies replay the same trades at the same timestamps. The only thing that
            changes between them is how much of the world each one is allowed to look at.
          </p>

          <div className="mt-8">
            <PolicySightDiagram />
          </div>

          <div className="mt-8 grid gap-px border border-edge bg-edge lg:grid-cols-3">
            {POLICY_ORDER.map((id) => {
              const policy = COMPARISON_DOC.method.policies[id];
              return (
                <div key={id} className="bg-canvas-sunken p-6">
                  <p className="data-label text-ink-faint">{id.replaceAll("_", " ")}</p>
                  <p className="mt-2 font-display text-heading-sm text-ink">{POLICY_NAME[id]}</p>
                  <p className="mt-3 text-body-sm text-ink-muted">{policy.description}</p>
                  <p className="mt-4 font-data text-[11px] text-ink-faint">{policy.methodVersion}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {COMPARISON_DOC.method.amendments.map((amendment) => (
              <div key={amendment.id} className="panel p-5">
                <p className="data-label text-ink-faint">{amendment.id}</p>
                <p className="mt-2 text-body-sm text-ink">{amendment.summary}</p>
                <p className="mt-3 text-body-sm text-ink-muted">{amendment.direction}</p>
                <p className="mt-3 text-body-sm text-ink-muted">
                  <span className="font-medium text-ink">Effect on the claim gate:</span>{" "}
                  {amendment.claimGateEffect}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-rule">
        <div className="mx-auto max-w-[1440px] px-4 py-14 sm:px-6 lg:px-8">
          <ComparisonGrid />
        </div>
      </section>

      <section className="section-rule">
        <div className="mx-auto max-w-[1440px] px-4 py-14 sm:px-6 lg:px-8">
          <ClaimGate />
        </div>
      </section>

      <section className="section-rule">
        <div className="mx-auto max-w-[1440px] px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-heading-lg text-ink">
                Findings, including the awkward ones
              </h2>
              <ul className="mt-6 space-y-4">
                {COMPARISON_DOC.headlineFindings.map((finding) => (
                  <li key={finding} className="flex gap-3 text-body-sm text-ink-secondary">
                    <span aria-hidden className="mt-2.5 h-px w-4 shrink-0 bg-edge-strong" />
                    {finding}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="font-display text-heading-lg text-ink">
                Sentences this result does not support
              </h2>
              <p className="mt-2 text-body-sm text-ink-muted">
                Written down so they cannot drift back into a pitch.
              </p>
              <ul className="mt-6 space-y-2.5">
                {COMPARISON_DOC.interpretation.prohibited.map((claim) => (
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
            </div>
          </div>

          <div className="mt-12">
            <h2 className="font-display text-heading-lg text-ink">Data limitations</h2>
            <ul className="mt-6 space-y-4">
              {COMPARISON_DOC.dataLimitations.map((limitation) => (
                <li key={limitation} className="flex gap-3 text-body-sm text-ink-muted">
                  <span aria-hidden className="mt-2.5 h-px w-4 shrink-0 bg-watch" />
                  {limitation}
                </li>
              ))}
            </ul>
          </div>

          <div className="panel mt-12 p-6">
            <p className="data-label text-ink-faint">How the events were chosen</p>
            <p className="mt-3 max-w-[80ch] text-body-sm text-ink-muted">
              {COMPARISON_DOC.eventSelection.disclosure}
            </p>
            <p className="mt-4 font-data text-[11px] text-ink-faint">
              {COMPARISON_DOC.eventSelection.document}
            </p>
          </div>

          <p className="mt-10 font-data text-[11px] text-ink-faint">
            Source: {HANDOFF_DIR}/three-policy-comparison.json · regenerated {HANDOFF_GENERATED}.{" "}
            <Link href="/risk" className="underline underline-offset-4">
              See the risk records these policies were run against
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
