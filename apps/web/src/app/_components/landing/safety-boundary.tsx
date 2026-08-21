import { AuthorityDiagram } from "@/components/diagrams/authority-diagram";

/**
 * The authority boundary.
 *
 * The old version of this section put its claim in 56-point display type on a
 * full-bleed lime field, then explained it in three definition-list entries and
 * a pull quote. The diagram makes the same argument in a form that can be
 * checked by looking at it, so the type came down and the copy went.
 */
export function SafetyBoundary() {
  return (
    <section className="section-rule bg-canvas" aria-labelledby="safety-title">
      <div className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.62fr_1.38fr] lg:items-center">
          <div>
            <p className="data-label text-signal">The boundary</p>
            <h2
              id="safety-title"
              className="mt-4 max-w-[15ch] font-display text-section-sm text-ink lg:text-section-lg"
            >
              The model never gets the keys.
            </h2>
            <p className="mt-5 max-w-[38ch] text-body-md text-ink-muted">
              It can read, group and argue. It cannot raise a fee, extend one, or decide when
              protection ends.
            </p>
          </div>
          <AuthorityDiagram />
        </div>
      </div>
    </section>
  );
}
