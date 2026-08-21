import Link from "next/link";

import { COMPARISON_DOC } from "@/lib/handoff/comparison";

/**
 * The claim gate as it actually resolved.
 *
 * This panel previously said the gate was closed "until every policy row
 * validates", which was true when it was written and became misleading the
 * moment the benchmark ran: it reads as results still pending. The rows all
 * validated. The gate is closed for a different and more important reason
 * (Tinjau tied the do-nothing policy), and that is what it says now.
 */
export function ResultClaimGate() {
  const gate = COMPARISON_DOC.claimEligibility;
  const failed = gate.conditions.find((condition) => condition.passed === false);

  return (
    <section className="grid gap-px overflow-hidden rounded-lg border border-edge bg-edge lg:grid-cols-[0.8fr_1.2fr]">
      <div className="bg-canvas-soft p-6 sm:p-8">
        <p className="data-label text-ink-faint">Claim gate</p>
        <div className="mt-4 flex items-center gap-3">
          <span aria-hidden className="h-3 w-3 rotate-45 bg-protect" />
          <p className="font-display text-heading-lg text-ink">Closed</p>
        </div>
        <p className="mt-3 text-body-sm text-ink-secondary">
          <span className="font-data">{gate.field}</span> is{" "}
          <span className="font-data text-watch-soft">false</span>. The benchmark ran and Tinjau
          tied the static do-nothing policy rather than beating it. A tie is not a win, so no
          surface here claims a reduction in LP loss.
        </p>
        <Link
          href="/compare"
          className="mt-5 inline-flex min-h-10 items-center font-body text-body-sm text-signal underline"
        >
          See the four conditions and all 72 cells
        </Link>
      </div>

      <div className="bg-canvas p-6 sm:p-8">
        <h2 className="font-display text-heading-md text-ink">Why it stayed closed</h2>
        {failed ? (
          <p className="mt-3 text-body-sm text-ink-secondary">{failed.detail}</p>
        ) : null}
        <p className="mt-4 text-body-sm text-ink-muted">
          The benchmark re-prices the same observed swaps under different fees, which assumes no
          trader would have been deterred by a higher one. That overstates fee revenue and
          understates the adverse-selection benefit. The two biases pull opposite ways and the net
          sign is undetermined, so these results may not be described as conservative.
        </p>
      </div>
    </section>
  );
}
