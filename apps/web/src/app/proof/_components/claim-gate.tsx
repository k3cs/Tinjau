import { COMPARISON_DOC } from "@/lib/handoff/comparison";

const MARK: Record<string, { glyph: string; label: string; tone: string }> = {
  true: { glyph: "✓", label: "Passed", tone: "text-normal-soft" },
  false: { glyph: "✕", label: "Failed", tone: "text-protect-soft" },
  null: { glyph: "–", label: "Not evaluable", tone: "text-ink-faint" },
};

/**
 * The claim gate, rendered as it resolved: closed.
 *
 * `canClaimLossAvoided` is false, so no surface in this product may say Tinjau
 * reduces LP loss. Showing the individual conditions matters more than showing
 * the boolean. The gate failed on one specific condition, and a reader who can
 * see which one can judge whether the gate was honest.
 */
export function ClaimGate() {
  const gate = COMPARISON_DOC.claimEligibility;

  return (
    <section aria-labelledby="claim-gate">
      <h2 id="claim-gate" className="scroll-mt-28 font-display text-heading-lg text-ink">
        The claim gate
      </h2>
      <p className="mt-2 max-w-3xl text-body-md text-ink-muted">
        Four conditions were fixed before the benchmark ran. All four had to hold before this
        project could claim it reduced LP loss.
      </p>

      <div className="mt-6 rounded-xl border-2 border-protect/50 bg-canvas-sunken p-6 text-ink">
        <p className="data-label text-signal">Result</p>
        <p className="mt-2 font-display text-heading-md">
          <span className="font-data">{gate.field}</span> ={" "}
          <span className="text-watch">false</span>
        </p>
        <p className="mt-3 max-w-3xl text-body-sm text-ink-muted">
          Tinjau ties the do-nothing policy rather than beating it, and &ldquo;beats&rdquo; means
          strictly greater. A tie is not a win. No page here claims a reduction in LP loss,
          because the measurement does not support one.
        </p>
      </div>

      <ol className="mt-6 space-y-3">
        {gate.conditions.map((condition, index) => {
          const mark = MARK[String(condition.passed)];
          return (
            <li key={condition.id} className="panel p-5">
              <div className="flex gap-4">
                <span
                  aria-hidden
                  className={`mt-0.5 font-data text-body-md ${mark.tone}`}
                >
                  {mark.glyph}
                </span>
                <div className="min-w-0">
                  <p className="font-body text-body-sm font-medium text-ink">
                    <span className="text-ink-faint">{index + 1}. </span>
                    {condition.text}
                  </p>
                  <p className="mt-1 font-data text-[10px] uppercase tracking-[0.06em] text-ink-faint">
                    <span className="sr-only">Status: </span>
                    {mark.label}
                  </p>
                  <p className="mt-2 text-body-sm text-ink-muted">{condition.detail}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-6 rounded-xl border border-edge bg-surface p-5 text-body-sm text-ink-muted">
        {gate.amd002Excluded}
      </p>
    </section>
  );
}
