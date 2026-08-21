import type { CriticalCaveat } from "@/lib/handoff/scenarios";
import { reasonMeaning } from "@/lib/risk/reason-codes";

/**
 * The block that stops a constructed interval being read as a result.
 *
 * The handoff carries `criticalCaveat.uiRequirement`: any surface showing this
 * PROTECT must label it constructed at the same visual weight as the state
 * itself. So this renders inline and unmissable, not a tooltip, not a
 * footnote, not behind a disclosure.
 */
export function ConstructedCaveat({ caveat }: { caveat: CriticalCaveat }) {
  return (
    <section
      aria-labelledby="constructed-caveat"
      className="rounded-xl border-2 border-watch bg-watch/[0.08] p-6"
    >
      <p className="data-label text-watch">Constructed market inputs</p>
      <h2
        id="constructed-caveat"
        className="mt-3 font-display text-heading-md font-semibold text-ink"
      >
        {caveat.headline}
      </h2>
      <p className="mt-3 max-w-3xl text-body-sm leading-relaxed text-ink-secondary">
        {caveat.text}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-edge bg-canvas p-4">
          <p className="data-label text-ink-faint">Canonical mainnet replay</p>
          <p className="mt-2 font-display text-heading-sm text-watch">
            {caveat.canonicalReplayState}
          </p>
          <p className="mt-1 font-data text-[11px] text-ink-muted">
            Market leg {caveat.canonicalReplayConfirmation}
          </p>
        </div>
        <div className="rounded-lg border border-edge bg-canvas p-4">
          <p className="data-label text-ink-faint">What the construction changed</p>
          <ul className="mt-2 space-y-1.5">
            {caveat.reasonCodeDiff.onlyInCanonical.map((code) => (
              <li key={code} className="font-data text-[11px] text-ink-muted">
                <span aria-hidden>−</span>{" "}
                <span className="sr-only">Removed: </span>
                {reasonMeaning(code).title}
              </li>
            ))}
            {caveat.reasonCodeDiff.onlyInConstructed.map((code) => (
              <li key={code} className="font-data text-[11px] text-signal">
                <span aria-hidden>+</span>{" "}
                <span className="sr-only">Added: </span>
                {reasonMeaning(code).title}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
