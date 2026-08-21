import Link from "next/link";

import { Reveal } from "@/components/reveal";
import { COMPARISON_DOC, signFlipCount } from "@/lib/handoff/comparison";

/**
 * The measured result, on the landing page, stated the way it came out.
 *
 * This section exists because the benchmark did not go Tinjau's way, and the
 * likeliest place for that to get quietly dropped is the marketing surface. The
 * claim that survives is behavioural (restraint on a control event) and it is
 * the one led with here. The economic result is stated as indeterminate, which
 * is what it is.
 */
export function MeasuredResult() {
  const { flipped, comparable } = signFlipCount();

  return (
    <section className="section-rule bg-paper-bright" aria-labelledby="measured-result">
      <div className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-3xl">
          <p className="data-label text-coal-faint">The measured result</p>
          <h2
            id="measured-result"
            className="mt-4 font-display text-section-sm text-coal lg:text-section-lg"
          >
            It declined to act, twice.
          </h2>
          <p className="mt-6 max-w-[62ch] text-body-md text-coal-soft">
            {COMPARISON_DOC.interpretation.defensibleClaim}
          </p>
        </div>

        <div className="mt-12 grid gap-px border border-coal bg-coal lg:grid-cols-3">
          <Reveal className="bg-paper-bright">
            <div className="h-full p-7">
              <p className="data-label text-normal-deep">What held up</p>
              <p className="mt-3 font-display text-heading-md text-coal">
                Restraint on a control event
              </p>
              <p className="mt-3 text-body-sm text-coal-muted">
                A routine insider filing moved the price. A volatility-only policy raised its fee
                on it at every trigger setting tested. Tinjau refused it twice, once because the
                event was not material, once because the move could not be shown to hold.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.05} className="bg-paper-bright">
            <div className="h-full p-7">
              <p className="data-label text-watch-deep">What did not</p>
              <p className="mt-3 font-display text-heading-md text-coal">
                The economic comparison
              </p>
              <p className="mt-3 text-body-sm text-coal-muted">
                {flipped} of {comparable} comparable cells reverse direction depending on which
                arithmetic convention is used, on identical trades. The benchmark cannot say which
                policy earned the LP more, and we are not going to pick one.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="bg-coal text-paper-bright">
            <div className="h-full p-7">
              <p className="data-label text-signal">What we will not say</p>
              {/*
                The phrase is struck through rather than merely captioned. In
                display type a skim, or a cropped screenshot, reads a heading as
                a claim no matter what the label above it says. The strike and
                the screen-reader prefix travel with the words themselves.
              */}
              <p className="mt-3 font-display text-heading-md text-ink-faint">
                <span className="sr-only">We do not claim: </span>
                <del className="decoration-protect decoration-2">Tinjau reduces LP loss</del>
              </p>
              <p className="mt-3 text-body-sm text-ink-muted">
                Its fee stayed at the base rate through every window, so its replayed economics are
                identical to doing nothing (a tie, not a win). The claim gate stayed shut and every
                page here respects that.
              </p>
              <Link
                href="/compare"
                className="mt-5 inline-flex min-h-10 items-center font-body text-body-sm text-signal underline"
              >
                See all 72 cells
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
