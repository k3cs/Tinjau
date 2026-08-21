import Link from "next/link";

import { PolicySightDiagram } from "@/components/diagrams/policy-sight-diagram";
import { RestraintDiagram } from "@/components/diagrams/restraint-diagram";
import { SignFlipDiagram } from "@/components/diagrams/sign-flip-diagram";
import { HANDOFF_DIR, HANDOFF_GENERATED, repoUrl } from "@/lib/handoff/artifacts";
import { COMPARISON_DOC, signFlipCount } from "@/lib/handoff/comparison";

import { ClaimGate } from "./claim-gate";
import { ComparisonGrid } from "./comparison-grid";

const POLICY_ORDER = ["STATIC", "VOLATILITY_ONLY", "TINJAU"] as const;

const POLICY_NAME: Record<string, string> = {
  STATIC: "Do nothing",
  VOLATILITY_ONLY: "Price only",
  TINJAU: "Tinjau",
};

/**
 * The benchmark, moved onto the page that owns "what is finished and what does
 * it do for me".
 *
 * It had its own tab, which split the completeness argument in half: a judge
 * reading /proof saw deployments and capabilities and had to go elsewhere to
 * find out whether any of it worked. Worse, a result this unflattering sitting
 * on a separate page reads as something to be sought out. Here it is in the
 * middle of the evidence, which is where a failed pre-registered claim belongs.
 *
 * The finding that does not survive is drawn first and drawn rather than argued:
 * 27 lines, all of them crossing the middle. A reader who looks at that picture
 * cannot come away thinking a winner was found, which is more than three
 * paragraphs of hedging ever achieved.
 */
export function Benchmark() {
  const { flipped, comparable } = signFlipCount();
  const interpretation = COMPARISON_DOC.interpretation;

  return (
    <>
      <section
        className="border-t border-edge px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
        aria-labelledby="benchmark-title"
      >
        <div className="mx-auto max-w-[1440px]">
          <div className="max-w-2xl">
            <p className="data-label text-ink-faint">The measured result</p>
            <h2
              id="benchmark-title"
              className="mt-4 font-display text-section-sm text-ink lg:text-section-lg"
            >
              No winner. We are publishing that.
            </h2>
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
                Every one of the {comparable} comparisons flips sides, all {flipped} of them.
                Quoting one of the two numbers would be choosing a winner by choosing how to add
                up, so both are published and neither is chosen.
              </p>
              <details className="group mt-6 border-t border-edge pt-5">
                <summary className="cursor-pointer list-none text-body-sm text-signal underline underline-offset-4">
                  The benchmark&rsquo;s exact wording
                </summary>
                <p className="mt-3 text-body-sm text-ink-secondary">{interpretation.text}</p>
              </details>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-edge px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
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

      <section className="border-t border-edge px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
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

      <section className="border-t border-edge px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <ComparisonGrid />
        </div>
      </section>

      <section className="border-t border-edge px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <ClaimGate />
        </div>
      </section>

      <section className="border-t border-edge px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
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
              <a
                href={repoUrl(COMPARISON_DOC.eventSelection.document)}
                target="_blank"
                rel="noreferrer"
                className="text-signal underline underline-offset-4"
              >
                {COMPARISON_DOC.eventSelection.document}
              </a>
            </p>
          </div>

          <p className="mt-10 font-data text-[11px] text-ink-faint">
            Source:{" "}
            <a
              href={repoUrl(`${HANDOFF_DIR}/three-policy-comparison.json`)}
              target="_blank"
              rel="noreferrer"
              className="text-signal underline underline-offset-4"
            >
              three-policy-comparison.json
            </a>{" "}
            · regenerated {HANDOFF_GENERATED}.{" "}
            <Link href="/risk" className="underline underline-offset-4">
              See the risk records these policies were run against
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
