import { DiagramFigure, LABEL } from "./figure";
import { behaviourFor } from "@/lib/handoff/comparison";

const POLICY_LABEL: Record<string, string> = {
  STATIC: "Do nothing",
  VOLATILITY_ONLY: "Price only",
  TINJAU: "Tinjau",
};

/**
 * Scenario names, in the reader's terms rather than the fixture's.
 *
 * `preRegisteredState` and `role` come from the frozen record and are stated
 * here as the reason each scenario is in the set, because "Tinjau declined"
 * means two different things on a routine filing and on a genuinely ambiguous
 * one, and a reader who cannot tell them apart learns nothing from either.
 */
const SCENARIO: Record<string, { name: string; what: string }> = {
  "C-two-origins-hard-case": {
    name: "The ambiguous one",
    what: "Two apparent origins, on the boundary of the corroboration rule.",
  },
  "D-neutral-normal": {
    name: "The neutral control",
    what: "A routine insider filing. Nothing material happened.",
  },
};

/**
 * The one claim that survived the benchmark, drawn from the benchmark's own rows.
 *
 * This used to render a single scenario under a headline that said "twice",
 * which left a reader counting one. It renders both, because both are real: a
 * price-only policy fired on the neutral control AND on the ambiguous case, at
 * every trigger setting in the frozen grid, and Tinjau declined both. That is a
 * behavioural result, and behaviour is the half of this benchmark that does not
 * depend on which arithmetic convention you pick.
 *
 * The two policies are drawn on separate lanes rather than sharing a column axis
 * because they do not share one: the price-only grid is a volatility multiple
 * (k) and Tinjau's is a drawdown threshold in basis points. Forcing them onto
 * one axis would imply a comparison between settings that does not exist.
 *
 * Every mark is read from the benchmark artifact. Nothing is arranged for
 * effect: if a Tinjau row ever came back fired, a mark would change here without
 * anyone editing this file.
 */
export function RestraintDiagram({ scenarioIds }: { scenarioIds: string[] }) {
  const policies = ["VOLATILITY_ONLY", "TINJAU"];
  const markX = (i: number) => 300 + i * 106;

  // A lane's topmost mark is its setting label at y-22, so the first lane has to
  // start far enough below the scenario subtitle at blockTop+39 for the two not
  // to overlap. At +50 they did: "PRICE ONLY" printed straight through it.
  const blockTop = (i: number) => 96 + i * 210;
  const laneY = (block: number, lane: number) => blockTop(block) + 78 + lane * 76;

  const height = laneY(scenarioIds.length - 1, 1) + 32 + 44;

  const described = scenarioIds
    .map((id) => {
      const rows = behaviourFor(id).filter((row) => row.policyId !== "STATIC");
      const fired = rows.filter((row) => row.policyId === "VOLATILITY_ONLY" && row.fired).length;
      const meta = SCENARIO[id];
      return `${meta?.name ?? id}: a price-only policy fired at ${fired} of ${
        rows.filter((r) => r.policyId === "VOLATILITY_ONLY").length
      } trigger settings; Tinjau fired at none.`;
    })
    .join(" ");

  return (
    <DiagramFigure
      title="On two price moves with no qualifying cause, a price-only policy acts and Tinjau does not"
      description={`Two blocks, one per scenario. ${described} Each block shows the price-only policy on its own lane with its volatility-multiple settings, and Tinjau on a second lane with its drawdown-threshold settings.`}
      status={{
        kind: "MEASURED",
        text: "Both frozen scenarios, at every trigger setting in the grid. Behaviour, not profit.",
      }}
      viewBox={`0 0 660 ${height}`}
    >
      <text x="0" y="26" className={`${LABEL} fill-ink-faint`}>
        Two price moves, neither with a cause worth acting on
      </text>
      <text x="0" y="52" className="font-body text-[14px] font-medium fill-ink">
        One policy acted on both. The other declined both.
      </text>
      <text x="0" y="72" className="font-body text-[11px] fill-ink-faint">
        Each mark is one sensitivity setting we tested. The two policies use different grids.
      </text>

      {scenarioIds.map((scenarioId, block) => {
        const rows = behaviourFor(scenarioId).filter((row) => row.policyId !== "STATIC");
        const meta = SCENARIO[scenarioId];
        const top = blockTop(block);

        return (
          <g key={scenarioId}>
            <line x1="0" y1={top} x2="660" y2={top} className="stroke-edge" strokeWidth="1" />
            <text x="0" y={top + 22} className="font-body text-[14px] font-medium fill-ink">
              {meta?.name ?? scenarioId}
            </text>
            <text x="0" y={top + 39} className="font-body text-[11px] fill-ink-faint">
              {meta?.what ?? ""}
            </text>

            {policies.map((policyId, lane) => {
              const laneRows = rows.filter((row) => row.policyId === policyId);
              const y = laneY(block, lane);
              const anyFired = laneRows.some((row) => row.fired);
              return (
                <g
                  key={policyId}
                  className="animate-fade-right"
                  style={{ animationDelay: `${block * 220 + lane * 140}ms` }}
                >
                  <text x="0" y={y - 4} className={`${LABEL} fill-ink-faint`}>
                    {POLICY_LABEL[policyId] ?? policyId}
                  </text>
                  <text x="0" y={y + 15} className="font-body text-[14px] font-medium fill-ink">
                    {anyFired ? "Raised the fee" : "Left it alone"}
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
          </g>
        );
      })}

      <text x="0" y={height - 10} className="font-body text-[13px] fill-ink-muted">
        Holding still is the result. It is not a demonstration that the pool was protected.
      </text>
    </DiagramFigure>
  );
}
