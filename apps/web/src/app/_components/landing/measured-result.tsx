import Link from "next/link";

import { RestraintDiagram } from "@/components/diagrams/restraint-diagram";
import { signFlipCount } from "@/lib/handoff/comparison";

/**
 * The measured result, on the landing page, stated the way it came out.
 *
 * This section exists because the benchmark did not go Tinjau's way, and the
 * likeliest place for that to get quietly dropped is the marketing surface. The
 * claim that survives is behavioural (restraint on a control event) and it is
 * the one led with here, now as a drawing built from the benchmark's own rows.
 * The economic result is stated as indeterminate, which is what it is.
 *
 * The struck-through phrase stays. Shortening the copy around it does not make
 * the sentence safer to leave out.
 */
export function MeasuredResult() {
  const { flipped, comparable } = signFlipCount();

  return (
    <section className="section-rule bg-canvas-sunken" aria-labelledby="measured-result">
      <div className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="data-label text-ink-faint">The measured result</p>
          <h2
            id="measured-result"
            className="mt-4 font-display text-section-sm text-ink lg:text-section-lg"
          >
            It declined to act. Twice.
          </h2>
          <p className="mt-5 max-w-[50ch] text-body-md text-ink-secondary">
            A policy watching only the price cannot tell a real event from a boring one. It raised
            the fee on a filing that meant nothing. Tinjau did not.
          </p>
        </div>

        <div className="mt-10">
          <RestraintDiagram scenarioId="D-neutral-normal" />
        </div>

        <div className="mt-8 grid gap-px border border-edge bg-edge lg:grid-cols-3">
          <div className="bg-canvas p-6">
            <p className="data-label text-normal">What held up</p>
            <p className="mt-3 font-display text-heading-sm text-ink">Restraint</p>
            <p className="mt-2 text-body-sm text-ink-muted">
              A price-only policy raised its fee on a routine filing at every setting tested.
              Tinjau refused it.
            </p>
          </div>

          <div className="bg-canvas p-6">
            <p className="data-label text-watch-soft">What did not</p>
            <p className="mt-3 font-display text-heading-sm text-ink">The economics</p>
            <p className="mt-2 text-body-sm text-ink-muted">
              Change how the money is counted and the answer flips: all {flipped} of {comparable}
              comparisons reverse. Both ways of counting are published, and we pick neither.
            </p>
          </div>

          <div className="bg-canvas p-6">
            <p className="data-label text-signal">What we will not say</p>
            {/*
              The phrase is struck through rather than merely captioned. In
              display type a skim, or a cropped screenshot, reads a heading as
              a claim no matter what the label above it says. The strike and
              the screen-reader prefix travel with the words themselves.
            */}
            <p className="mt-3 font-display text-heading-sm text-ink-disabled">
              <span className="sr-only">We do not claim: </span>
              <del className="decoration-protect decoration-2">Tinjau reduces LP loss</del>
            </p>
            <p className="mt-2 text-body-sm text-ink-muted">
              Its fee never left the base rate on these replays, so it draws with doing nothing. A
              draw is not a win.
            </p>
            <Link
              href="/proof"
              className="mt-4 inline-flex min-h-10 items-center font-body text-body-sm text-signal underline underline-offset-4"
            >
              See all 72 cells
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
