import { BlindWindowDiagram } from "@/components/diagrams/blind-window-diagram";

/**
 * The problem, in a drawing and eighteen words.
 *
 * This section used to be a four-row timeline table with a sentence of prose in
 * every row. The rows were describing a shape, so the shape replaced them.
 */
export function BlindWindow() {
  return (
    <section className="section-rule bg-canvas" aria-labelledby="blind-window-title">
      <div className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.62fr_1.38fr] lg:items-center">
          <div>
            <p className="data-label text-ink-faint">The blind window</p>
            <h2
              id="blind-window-title"
              className="mt-4 max-w-[16ch] font-display text-section-sm text-ink lg:text-section-lg"
            >
              The pool sees the trade. Not the reason for it.
            </h2>
            <p className="mt-5 max-w-[42ch] text-body-md text-ink-muted">
              A tokenised stock trades all night. The company announcement that explains the move
              arrives whenever it arrives, and the pool has no way to read it.
            </p>
          </div>
          <BlindWindowDiagram />
        </div>
      </div>
    </section>
  );
}
