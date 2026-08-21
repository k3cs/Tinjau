import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "@/components/reveal";
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
  STATIC: "Static fee",
  VOLATILITY_ONLY: "Volatility-only",
  TINJAU: "Tinjau",
};

export default function ComparePage() {
  const { flipped, comparable } = signFlipCount();
  const interpretation = COMPARISON_DOC.interpretation;

  return (
    <div className="bg-paper text-coal">
      <section className="mx-auto max-w-[1440px] px-4 pb-16 pt-14 sm:px-6 lg:px-8">
        <div className="max-w-4xl">
          <p className="data-label text-coal-faint">Three-policy comparison</p>
          <h1 className="mt-4 font-display text-section-sm text-coal lg:text-section-lg">
            The economics came out indeterminate. We are publishing that.
          </h1>
          <p className="mt-6 max-w-3xl text-body-md text-coal-soft">
            Static, volatility-only and Tinjau were run over the same replayed trades, at the same
            timestamps, with the same liquidity, the same fee ceiling and the same decay curve.
            On profit and loss the benchmark cannot say which policy did better. On behaviour it
            can.
          </p>
        </div>

        <div className="mt-12 grid gap-px border border-coal bg-coal md:grid-cols-2">
          <div className="bg-paper-bright p-7">
            <p className="data-label text-watch-deep">What it cannot determine</p>
            <p className="mt-3 font-display text-heading-md text-coal">
              Which policy earned the LP more.
            </p>
            <p className="mt-3 text-body-sm text-coal-muted">
              All {flipped} of {comparable} comparable cells reverse direction between the two
              metric bases, on identical inputs. Quoting either number alone would be choosing a
              winner by choosing an arithmetic convention.
            </p>
          </div>
          <div className="bg-coal p-7 text-paper-bright">
            <p className="data-label text-signal">What it can determine</p>
            <p className="mt-3 font-display text-heading-md">
              Which policy acted on something that did not warrant it.
            </p>
            <p className="mt-3 text-body-sm text-ink-muted">
              {interpretation.defensibleClaim}
            </p>
          </div>
        </div>

        <Reveal className="mt-10">
          <p className="max-w-3xl border-l-2 border-coal pl-5 text-body-md text-coal-soft">
            {interpretation.text}
          </p>
        </Reveal>
      </section>

      <section className="section-rule">
        <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-heading-lg text-coal">Identical input, by construction</h2>
          <p className="mt-2 max-w-3xl text-body-md text-coal-muted">
            The volatility baseline cannot reach any filing, headline, rumour or event type. That
            is enforced by its input type, not by convention.
          </p>

          <div className="mt-8 grid gap-px border border-edge-light bg-edge-light lg:grid-cols-3">
            {POLICY_ORDER.map((id) => {
              const policy = COMPARISON_DOC.method.policies[id];
              return (
                <div key={id} className="bg-paper-bright p-6">
                  <p className="data-label text-coal-faint">{id.replaceAll("_", " ")}</p>
                  <p className="mt-2 font-display text-heading-sm text-coal">{POLICY_NAME[id]}</p>
                  <p className="mt-3 text-body-sm text-coal-muted">{policy.description}</p>
                  <p className="mt-4 font-data text-[11px] text-coal-faint">
                    {policy.methodVersion}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {COMPARISON_DOC.method.amendments.map((amendment) => (
              <div key={amendment.id} className="panel p-5">
                <p className="data-label text-coal-faint">{amendment.id}</p>
                <p className="mt-2 text-body-sm text-coal">{amendment.summary}</p>
                <p className="mt-3 text-body-sm text-coal-muted">{amendment.direction}</p>
                <p className="mt-3 text-body-sm text-coal-muted">
                  <span className="font-medium text-coal">Effect on the claim gate:</span>{" "}
                  {amendment.claimGateEffect}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-rule">
        <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
          <ComparisonGrid />
        </div>
      </section>

      <section className="section-rule">
        <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
          <ClaimGate />
        </div>
      </section>

      <section className="section-rule">
        <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-heading-lg text-coal">
                Findings, including the awkward ones
              </h2>
              <ul className="mt-6 space-y-4">
                {COMPARISON_DOC.headlineFindings.map((finding) => (
                  <li key={finding} className="flex gap-3 text-body-sm text-coal-soft">
                    <span aria-hidden className="mt-2.5 h-px w-4 shrink-0 bg-coal" />
                    {finding}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="font-display text-heading-lg text-coal">
                Sentences this result does not support
              </h2>
              <p className="mt-2 text-body-sm text-coal-muted">
                Written down so they cannot drift back into a pitch.
              </p>
              <ul className="mt-6 space-y-2.5">
                {COMPARISON_DOC.interpretation.prohibited.map((claim) => (
                  <li
                    key={claim}
                    className="flex gap-3 rounded-lg border border-protect/40 bg-protect/[0.05] p-3 text-body-sm text-coal"
                  >
                    <span aria-hidden className="font-data text-protect-deep">
                      ✕
                    </span>
                    <span>&ldquo;{claim}&rdquo;</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-14">
            <h2 className="font-display text-heading-lg text-coal">Data limitations</h2>
            <ul className="mt-6 space-y-4">
              {COMPARISON_DOC.dataLimitations.map((limitation) => (
                <li key={limitation} className="flex gap-3 text-body-sm text-coal-muted">
                  <span aria-hidden className="mt-2.5 h-px w-4 shrink-0 bg-watch" />
                  {limitation}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-14 panel p-6">
            <p className="data-label text-coal-faint">How the events were chosen</p>
            <p className="mt-3 max-w-3xl text-body-sm text-coal-muted">
              {COMPARISON_DOC.eventSelection.disclosure}
            </p>
            <p className="mt-4 font-data text-[11px] text-coal-faint">
              {COMPARISON_DOC.eventSelection.document}
            </p>
          </div>

          <p className="mt-10 font-data text-[11px] text-coal-faint">
            Source: {HANDOFF_DIR}/three-policy-comparison.json · regenerated {HANDOFF_GENERATED}.{" "}
            <Link href="/risk" className="underline">
              See the risk records these policies were run against
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
