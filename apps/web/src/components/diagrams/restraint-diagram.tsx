import { DiagramFigure, LABEL } from "./figure";
import { behaviourFor } from "@/lib/handoff/comparison";

const POLICY_LABEL: Record<string, string> = {
  STATIC: "Do nothing",
  VOLATILITY_ONLY: "Price only",
  TINJAU: "Tinjau",
};

/**
 * The one claim that survived the benchmark, drawn from the benchmark's own rows.
 *
 * The neutral control is a routine filing: nothing happened that a pool should
 * react to. A policy that sees only price fires on it at every trigger setting
 * tested. Tinjau does not fire at any setting. That is a behavioural result and
 * behaviour is the half of this benchmark that does not depend on which
 * arithmetic convention you pick, which is why it is the half being drawn.
 *
 * Every mark is read from `three-policy-comparison.json`. Nothing is arranged
 * for effect: if a Tinjau row ever came back fired, a red mark would appear here
 * without anyone editing this file.
 */
export function RestraintDiagram({ scenarioId }: { scenarioId: string }) {
  const rows = behaviourFor(scenarioId).filter((row) => row.policyId !== "STATIC");
  const policies = ["VOLATILITY_ONLY", "TINJAU"];

  // Lane 0 used to sit at y=74, which put its setting label (y-22) at 52 and
  // straight through the header sentence at y=46. The lanes start below the
  // header block now, and the caption sits below the last lane's mark labels.
  const laneY = (i: number) => 104 + i * 86;
  const markX = (i: number) => 300 + i * 106;

  return (
    <DiagramFigure
      title="On a routine filing, a price-only policy acts and Tinjau does not"
      description={rows
        .map(
          (row) =>
            `${POLICY_LABEL[row.policyId] ?? row.policyId} at ${row.setting}: ${
              row.fired ? `fired ${row.triggerCount} time(s)` : "did not fire"
            }.`,
        )
        .join(" ")}
      status={{
        kind: "MEASURED",
        text: "The neutral control, at every trigger setting in the frozen grid. Behaviour, not profit.",
      }}
      viewBox="0 0 660 268"
    >
      <text x="0" y="26" className={`${LABEL} fill-ink-faint`}>
        The event
      </text>
      <text x="0" y="46" className="font-body text-[14px] font-medium fill-ink">
        A routine filing. Price moved. Nothing happened.
      </text>
      {/* A first-time reader has no idea what K=2 or 150 BPS is. One line, so
          the marks below read as settings rather than as measurements. */}
      <text x="0" y="66" className="font-body text-[11px] fill-ink-faint">
        Each mark below is one sensitivity setting we tested. Every setting, same answer.
      </text>

      {policies.map((policyId, lane) => {
        const laneRows = rows.filter((row) => row.policyId === policyId);
        const y = laneY(lane);
        const anyFired = laneRows.some((row) => row.fired);
        return (
          <g key={policyId} className="animate-fade-right" style={{ animationDelay: `${lane * 180 + 200}ms` }}>
            <text x="0" y={y - 16} className={`${LABEL} fill-ink-faint`}>
              {POLICY_LABEL[policyId] ?? policyId}
            </text>
            <text x="0" y={y + 8} className="font-body text-[15px] font-medium fill-ink">
              {anyFired ? "Raised the fee" : "Left it alone"}
            </text>
            <text x="0" y={y + 26} className="font-body text-[11px] fill-ink-faint">
              {anyFired ? "on a filing that changed nothing" : "no filing worth reacting to"}
            </text>
            <line
              x1="252"
              y1={y}
              x2="640"
              y2={y}
              className={anyFired ? "stroke-watch/30" : "stroke-edge"}
              strokeWidth="1"
            />
            {laneRows.map((row, i) => (
              <g key={row.setting}>
                <text
                  x={markX(i)}
                  y={y - 22}
                  textAnchor="middle"
                  className={`${LABEL} fill-ink-faint`}
                >
                  {row.setting}
                </text>
                {row.fired ? (
                  <>
                    <circle cx={markX(i)} cy={y} r="13" className="fill-watch/15 stroke-watch" strokeWidth="1.5" />
                    {/* An exclamation stroke, so the state is not colour alone. */}
                    <line
                      x1={markX(i)}
                      y1={y - 6}
                      x2={markX(i)}
                      y2={y + 1}
                      className="stroke-watch-soft"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <circle cx={markX(i)} cy={y + 6} r="1.6" className="fill-watch-soft" />
                    <text
                      x={markX(i)}
                      y={y + 32}
                      textAnchor="middle"
                      className={`${LABEL} fill-watch-soft`}
                    >
                      Fired
                    </text>
                  </>
                ) : (
                  <>
                    <circle cx={markX(i)} cy={y} r="13" className="fill-transparent stroke-edge-strong" strokeWidth="1.5" />
                    <line
                      x1={markX(i) - 6}
                      y1={y}
                      x2={markX(i) + 6}
                      y2={y}
                      className="stroke-signal"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <text
                      x={markX(i)}
                      y={y + 32}
                      textAnchor="middle"
                      className={`${LABEL} fill-ink-faint`}
                    >
                      Declined
                    </text>
                  </>
                )}
              </g>
            ))}
          </g>
        );
      })}

      <text x="0" y="260" className="font-body text-[13px] fill-ink-muted">
        Holding still is the result. It is not a demonstration that the pool was protected.
      </text>
    </DiagramFigure>
  );
}
