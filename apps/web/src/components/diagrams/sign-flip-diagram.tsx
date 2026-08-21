import { DiagramFigure, LABEL } from "./figure";
import { comparablePairs, type CellPair } from "@/lib/handoff/comparison";
import type { CellVerdict } from "@/lib/handoff/artifacts";

/**
 * Band centres. These were 56/116/176 in a 232-unit box, which left the 27-line
 * fan only about 14 units of vertical room and rendered it as one solid blob:
 * the caption promised 27 lines and the picture showed a ribbon. The box is
 * taller now and the fan spreads across it, so the lines can be seen as lines.
 */
const BAND: Record<CellVerdict, number> = {
  TINJAU_BEATS: 74,
  TINJAU_TIES: 158,
  TINJAU_LOSES: 242,
  NOT_COMPARABLE: 158,
};

const LEFT = 196;
const RIGHT = 470;

function band(pair: CellPair, basis: "PRE_REGISTERED" | "AMD_002_CONSISTENT"): number {
  return BAND[pair.byBasis[basis]?.vsVolatilityOnly ?? "NOT_COMPARABLE"];
}

/**
 * Why this benchmark declares no winner, in one shape.
 *
 * Each line is one grid point. Its left end is where the pre-registered metric
 * puts Tinjau; its right end is where the post-hoc consistent-fee metric puts
 * it. Same trades, same triggers, same fee schedule: only the arithmetic
 * convention changes between the two ends.
 *
 * Every line crosses the middle. That crossing is the finding, and it is the
 * reason no number from either side is quoted alone anywhere on this site. The
 * lines are one series in one hue, because they are one population, not two
 * categories: what varies is the geometry, not the colour.
 */
export function SignFlipDiagram() {
  const pairs = comparablePairs();
  const spread = 58;

  return (
    <DiagramFigure
      title={`All ${pairs.length} comparable cells reverse when the arithmetic changes`}
      description={`A slope chart with ${pairs.length} lines. Each line connects one grid point's verdict under the pre-registered metric on the left to the same grid point's verdict under the post-hoc AMD-002 metric on the right. Every line starts in the band marked "Tinjau ahead" and ends in the band marked "Tinjau behind", crossing the middle. The inputs are identical on both sides; only the fee-accounting convention differs.`}
      status={{
        kind: "MEASURED",
        text: "Both bases published. Neither is clean, and they are biased in opposite directions.",
      }}
      viewBox="0 0 660 302"
    >
      {/* The bands, as reference zones rather than plotted data. */}
      <line x1={LEFT - 40} y1={BAND.TINJAU_TIES} x2={RIGHT + 40} y2={BAND.TINJAU_TIES} className="stroke-edge" strokeWidth="1" strokeDasharray="4 5" />
      <text x="0" y={BAND.TINJAU_BEATS + 4} className={`${LABEL} fill-ink-muted`}>
        Tinjau ahead
      </text>
      <text x="0" y={BAND.TINJAU_LOSES + 4} className={`${LABEL} fill-ink-muted`}>
        Tinjau behind
      </text>

      {pairs.map((pair, i) => {
        const offset = (i / Math.max(1, pairs.length - 1) - 0.5) * spread;
        const y1 = band(pair, "PRE_REGISTERED") + offset;
        const y2 = band(pair, "AMD_002_CONSISTENT") + offset;
        return (
          <g
            key={`${pair.scenarioId}-${pair.k}-${pair.minDrawdownBps}`}
            className="animate-fade-up"
            style={{ animationDelay: `${120 + i * 22}ms` }}
          >
            <path
              d={`M${LEFT} ${y1} C${LEFT + 90} ${y1}, ${RIGHT - 90} ${y2}, ${RIGHT} ${y2}`}
              fill="none"
              className="stroke-confirm-soft/70"
              strokeWidth="1"
            />
            {/* A terminator at each end, so one line can be followed out of the
                fan and counted rather than merging into its neighbours. */}
            <circle cx={LEFT} cy={y1} r="1.7" className="fill-confirm-soft" />
            <circle cx={RIGHT} cy={y2} r="1.7" className="fill-confirm-soft" />
          </g>
        );
      })}

      {/* The two ends, named. */}
      <line x1={LEFT} y1="34" x2={LEFT} y2="278" className="stroke-edge-strong" strokeWidth="1.5" />
      <line x1={RIGHT} y1="34" x2={RIGHT} y2="278" className="stroke-edge-strong" strokeWidth="1.5" />
      <text x={LEFT} y="24" textAnchor="middle" className={`${LABEL} fill-ink`}>
        Pre-registered
      </text>
      <text x={RIGHT} y="24" textAnchor="middle" className={`${LABEL} fill-ink`}>
        Post-hoc
      </text>
      <text x={LEFT} y="296" textAnchor="middle" className={`${LABEL} fill-ink-faint`}>
        Frozen before results
      </text>
      <text x={RIGHT} y="296" textAnchor="middle" className={`${LABEL} fill-ink-faint`}>
        Written after
      </text>

      <text x={RIGHT + 30} y={BAND.TINJAU_TIES - 10} className="font-body text-[13px] fill-ink">
        {pairs.length} lines.
      </text>
      <text x={RIGHT + 30} y={BAND.TINJAU_TIES + 10} className="font-body text-[13px] fill-ink-muted">
        All of them cross.
      </text>
    </DiagramFigure>
  );
}
