import { Reveal } from "@/components/reveal";
import { ROADMAP, ROADMAP_HORIZON_LABEL, type RoadmapHorizon } from "@/lib/product/roadmap";

/**
 * The roadmap as a gated rail rather than a timeline.
 *
 * A timeline needs dates and this roadmap deliberately has none: `RoadmapItem`
 * carries no date, no percentage and no progress field, because nothing here is
 * part-way through. What it does carry is `blockedBy`, a condition. So the rail
 * is drawn as a sequence of gates, and each gate is the thing that has to become
 * true before anything behind it can move. That is the honest shape of this
 * data, and it is also the more useful one: a reader learns what stands in the
 * way, which a date would have hidden.
 *
 * The rail is solid up to the point where shipped work ends, then dashed for the
 * whole remainder. Nothing below the first gate is ever drawn solid.
 */

const HORIZONS: RoadmapHorizon[] = ["NEXT", "LATER", "REQUIRES_ACCESS"];

/** What each gate is waiting on, in plain words, one line each. */
const GATE_CONDITION: Record<RoadmapHorizon, string> = {
  NEXT: "Waiting on the MVP holding up under review",
  LATER: "Waiting on someone outside this project wanting it",
  REQUIRES_ACCESS: "Waiting on access and interfaces we do not have",
};

function GateMarker({ horizon }: { horizon: RoadmapHorizon }) {
  return (
    <div className="relative grid grid-cols-[28px_1fr] gap-x-4 sm:grid-cols-[36px_1fr] sm:gap-x-5">
      <div className="relative flex justify-center">
        {/* The gate bar sits across the rail, so the rail visibly cannot be
            followed past it without the condition being met. */}
        <span aria-hidden className="absolute left-1/2 top-1/2 h-0.5 w-7 -translate-x-1/2 -translate-y-1/2 bg-watch sm:w-9" />
      </div>
      <div className="py-5">
        <p className="data-label text-watch-soft">{ROADMAP_HORIZON_LABEL[horizon]}</p>
        <p className="mt-1.5 text-body-sm text-ink-muted">{GATE_CONDITION[horizon]}</p>
      </div>
    </div>
  );
}

export function RoadmapRail({ builtCount }: { builtCount: number }) {
  return (
    // Capped: a "Blocked by" sentence set across a 1,400px column is one long
    // line and stops being readable, which defeats the point of surfacing it.
    <div className="mt-10 max-w-4xl">
      {/* Where the shipped work ends. The only solid node on this rail. */}
      <div className="grid grid-cols-[28px_1fr] gap-x-4 sm:grid-cols-[36px_1fr] sm:gap-x-5">
        <div className="relative flex justify-center">
          <span aria-hidden className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-signal" />
          <span
            aria-hidden
            className="relative mt-1.5 h-3 w-3 rounded-full bg-signal ring-4 ring-canvas-sunken"
          />
        </div>
        <div className="pb-6">
          <p className="font-display text-heading-sm text-ink">Everything above this line</p>
          <p className="mt-1.5 text-body-sm text-ink-muted">
            {builtCount} capabilities that run today, each with a test or an artifact behind it.
            The rail turns dashed here and stays dashed.
          </p>
        </div>
      </div>

      {HORIZONS.map((horizon) => {
        const items = ROADMAP.filter((item) => item.horizon === horizon);
        if (items.length === 0) return null;

        return (
          <div key={horizon} className="relative">
            {/* One dashed rail behind the whole horizon block, drawn with a
                border rather than repeated per row so it never breaks between
                items. */}
            <span
              aria-hidden
              className="absolute left-[13.5px] top-0 h-full border-l border-dashed border-edge-strong sm:left-[17.5px]"
            />
            <GateMarker horizon={horizon} />

            <ul className="space-y-3">
              {items.map((item, index) => (
                <li
                  key={item.id}
                  className="grid grid-cols-[28px_1fr] gap-x-4 sm:grid-cols-[36px_1fr] sm:gap-x-5"
                >
                  <div className="relative flex justify-center">
                    {/* Hollow, because nothing here is shipped. */}
                    <span
                      aria-hidden
                      className="relative mt-6 h-2.5 w-2.5 rounded-full border border-edge-strong bg-canvas-sunken"
                    />
                  </div>
                  <Reveal delay={index * 0.04}>
                    <div className="rounded-lg border border-edge bg-canvas p-4 sm:p-5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <h4 className="font-display text-heading-sm text-ink">{item.title}</h4>
                        <span className="data-label rounded border border-maturity-roadmap px-1.5 py-0.5 text-ink-faint">
                          Not built
                        </span>
                      </div>
                      <p className="mt-2.5 max-w-[62ch] text-body-sm text-ink-secondary">
                        {item.intent}
                      </p>
                      <p className="mt-3 flex gap-2 border-t border-edge pt-3 text-body-sm text-ink-muted">
                        {/* A closed padlock, so the gating reads before the
                            sentence does. Decorative: the label carries it. */}
                        <svg
                          aria-hidden
                          viewBox="0 0 16 16"
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-none stroke-watch-soft"
                          strokeWidth="1.4"
                        >
                          <rect x="3" y="7" width="10" height="7" rx="1.5" />
                          <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
                        </svg>
                        <span>
                          <span className="text-watch-soft">Blocked by: </span>
                          {item.blockedBy}
                        </span>
                      </p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
