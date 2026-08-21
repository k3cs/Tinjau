import { DiagramFigure, LABEL } from "@/components/diagrams/figure";

/**
 * The three states, defined once, before the page starts using them.
 *
 * `NORMAL`, `WATCH` and `PROTECT` are the vocabulary of every panel below and
 * of the on-chain record itself, and nothing on this page ever said what they
 * mean in ordinary words. A reader who has not met them reads the whole console
 * as codes. Three steps, one plain sentence each, and the one this scenario
 * actually reached is marked, so the legend and the answer are the same object.
 *
 * Only the reached state is filled. There is no implied progression here: a
 * scenario does not climb through these, it lands on one.
 */
const STEPS = [
  {
    state: "NORMAL",
    plain: "Do nothing",
    detail: "Nothing unresolved. Baseline fee.",
    tone: { fill: "fill-normal/15 stroke-normal", text: "fill-normal" },
  },
  {
    state: "WATCH",
    plain: "Watch closely",
    detail: "Something is unclear. Fee unchanged.",
    tone: { fill: "fill-watch/15 stroke-watch", text: "fill-watch-soft" },
  },
  {
    state: "PROTECT",
    plain: "Raise the fee",
    detail: "Capped, temporary, on a timer.",
    tone: { fill: "fill-protect/15 stroke-protect", text: "fill-protect" },
  },
] as const;

const COLUMN_X = [110, 330, 550] as const;

export function StateLadder({ state }: { state: string }) {
  const reachedIndex = STEPS.findIndex((step) => step.state === state);

  return (
    <DiagramFigure
      title={`Three possible states. This scenario reached ${state}.`}
      description={`Three states side by side. Normal means do nothing and keep the baseline fee. Watch means something is unclear, and the fee is unchanged. Protect means the fee may rise, capped and temporary, on a timer. The state this scenario reached is ${state}, marked as reached.`}
      status={{ kind: "RULE", text: "The three states a record can hold. One of them is reached, never all three." }}
      viewBox="0 0 660 134"
    >
      <line x1="110" y1="44" x2="550" y2="44" className="stroke-edge" strokeWidth="1" />

      {STEPS.map((step, i) => {
        const x = COLUMN_X[i];
        const isReached = i === reachedIndex;
        return (
          <g key={step.state} className="animate-fade-up" style={{ animationDelay: `${i * 90}ms` }}>
            <circle
              cx={x}
              cy="44"
              r="15"
              className={isReached ? step.tone.fill : "fill-canvas stroke-edge-strong"}
              strokeWidth={isReached ? 2 : 1.25}
            />
            {isReached ? <circle cx={x} cy="44" r="5" className={step.tone.text.replace("fill-", "fill-")} /> : null}

            <text
              x={x}
              y="82"
              textAnchor="middle"
              className={`font-data text-[13px] tracking-[0.06em] ${
                isReached ? step.tone.text : "fill-ink-muted"
              }`}
            >
              {step.state}
            </text>
            <text
              x={x}
              y="102"
              textAnchor="middle"
              className={`font-body text-[13px] font-medium ${isReached ? "fill-ink" : "fill-ink-secondary"}`}
            >
              {step.plain}
            </text>
            <text
              x={x}
              y="120"
              textAnchor="middle"
              className="font-body text-[11px] fill-ink-faint"
            >
              {step.detail}
            </text>
            {isReached ? (
              <text x={x} y="18" textAnchor="middle" className={`${LABEL} fill-ink`}>
                Reached
              </text>
            ) : null}
          </g>
        );
      })}
    </DiagramFigure>
  );
}
