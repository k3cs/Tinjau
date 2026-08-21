import { DiagramFigure, LABEL } from "./figure";

/**
 * What each policy is allowed to look at, drawn as a matrix.
 *
 * The sentence this replaces ("the price-only baseline cannot reach a filing, a
 * headline or an event type; its input type will not carry them") is precise and
 * almost nobody reads it twice. The fact underneath it is the whole reason the
 * benchmark is fair: all three policies see the same trades at the same
 * timestamps, and the only thing that differs is how much of the world each one
 * can look at. A two-column matrix says that at a glance.
 *
 * "Cannot reach" is a type-level guarantee in the benchmark, not a convention,
 * so the blocked cells are drawn as a hard slash rather than an empty circle.
 * An empty circle reads as "did not happen to use it".
 */
const COLUMNS = [
  { x: 356, label: "Price and time" },
  { x: 556, label: "Why the price moved" },
] as const;

const ROWS = [
  {
    id: "STATIC",
    name: "Do nothing",
    note: "A fixed fee, whatever happens",
    sees: [false, false],
  },
  {
    id: "VOLATILITY_ONLY",
    name: "Price only",
    note: "Reacts when the price jumps",
    sees: [true, false],
  },
  {
    id: "TINJAU",
    name: "Tinjau",
    note: "Reacts only when both agree",
    sees: [true, true],
  },
] as const;

export function PolicySightDiagram() {
  const rowY = (i: number) => 86 + i * 52;

  return (
    <DiagramFigure
      title="The same trades. Three different amounts of the world."
      description="A matrix with three rows and two columns. The columns are price and time, and why the price moved. Do nothing can see neither. Price only can see price and time, and is blocked from why the price moved. Tinjau can see both. All three policies are replayed over identical trades at identical timestamps."
      status={{
        kind: "RULE",
        text: "What each policy may read. Enforced by the benchmark's input types, not by convention.",
      }}
      viewBox="0 0 660 258"
    >
      <text x="0" y="30" className={`${LABEL} fill-ink-faint`}>
        Each one gets the same trades
      </text>

      {COLUMNS.map((column) => (
        <text
          key={column.label}
          x={column.x}
          y="58"
          textAnchor="middle"
          className={`${LABEL} fill-ink-secondary`}
        >
          {column.label}
        </text>
      ))}

      {ROWS.map((row, i) => {
        const y = rowY(i);
        const isTinjau = row.id === "TINJAU";
        return (
          <g key={row.id} className="animate-fade-right" style={{ animationDelay: `${i * 120}ms` }}>
            <line x1="0" y1={y - 24} x2="660" y2={y - 24} className="stroke-edge" strokeWidth="1" />
            <text
              x="0"
              y={y - 2}
              className={`font-body text-[14px] font-medium ${isTinjau ? "fill-ink" : "fill-ink-secondary"}`}
            >
              {row.name}
            </text>
            <text x="0" y={y + 15} className="font-body text-[11px] fill-ink-faint">
              {row.note}
            </text>

            {COLUMNS.map((column, c) =>
              row.sees[c] ? (
                <g key={column.label}>
                  <circle
                    cx={column.x}
                    cy={y}
                    r="11"
                    className="fill-signal/15 stroke-signal"
                    strokeWidth="1.5"
                  />
                  {/* A tick, so the state is not carried by colour alone. */}
                  <path
                    d={`M${column.x - 5} ${y} l3.5 3.5 L${column.x + 5.5} ${y - 4.5}`}
                    fill="none"
                    className="stroke-signal"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              ) : (
                <g key={column.label}>
                  <circle
                    cx={column.x}
                    cy={y}
                    r="11"
                    className="fill-transparent stroke-edge-strong"
                    strokeWidth="1.5"
                  />
                  <line
                    x1={column.x - 5.5}
                    y1={y + 5.5}
                    x2={column.x + 5.5}
                    y2={y - 5.5}
                    className="stroke-ink-disabled"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </g>
              ),
            )}
          </g>
        );
      })}

      <line x1="0" y1={rowY(2) + 28} x2="660" y2={rowY(2) + 28} className="stroke-edge" strokeWidth="1" />
      <text x="0" y={rowY(2) + 50} className="font-body text-[12px] fill-ink-muted">
        A slash is a wall, not an oversight. The price-only policy could not read a filing if it wanted to.
      </text>
    </DiagramFigure>
  );
}
