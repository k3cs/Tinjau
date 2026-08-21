import { DiagramFigure, LABEL } from "./figure";

/**
 * "Exists, but not finished", drawn as a wiring gap rather than a progress bar.
 *
 * A progress bar would be the wrong picture twice over. It implies a percentage
 * nobody measured, and it implies these parts are half-built, which they are
 * not: they are whole pieces that are not connected to the loop. So the loop is
 * drawn solid and complete, the pieces are drawn solid and complete, and what is
 * missing is the line between them. The gap is the subject of the drawing.
 *
 * The roadmap type deliberately has no progress field (see `roadmap.ts`), and
 * this drawing is the visual form of that same decision.
 *
 * The two pieces sit at the ends of the loop rather than above and below it.
 * That is not a style choice: it is where they actually belong (the listener is
 * an input to the front, the publisher an output from the back), and stacking
 * them vertically ran their connectors straight through the loop's own node
 * labels.
 */
const SPINE = [
  { x: 214, label: "Read" },
  { x: 296, label: "Decide" },
  { x: 378, label: "Record" },
  { x: 452, label: "Act" },
] as const;

const SPINE_Y = 100;
const BOX_Y = 77;
const BOX_H = 46;

export function WiringGapDiagram() {
  return (
    <DiagramFigure
      title="Two finished pieces, not yet connected to the loop"
      description="In the middle, a solid line represents the loop that runs today, with four nodes: read, decide, record, act. At the left sits a solid box, X Listener, which would feed claims into the front of the loop. At the right sits another, X Publisher, which would announce the state from the back of it. Each is joined to the loop by a dashed line broken by a bar marked not wired. The pieces are complete; the connection is what is missing."
      status={{
        kind: "ILLUSTRATION",
        text: "Which parts are connected. Not a measure of how far along anything is.",
      }}
      viewBox="0 0 660 200"
    >
      {/* The loop that runs today. Solid, unbroken, and labelled as such. */}
      <text x="331" y="58" textAnchor="middle" className={`${LABEL} fill-signal`}>
        Runs today
      </text>
      <line x1="196" y1={SPINE_Y} x2="466" y2={SPINE_Y} className="stroke-signal" strokeWidth="2.5" />
      {SPINE.map((node, i) => (
        <g key={node.label} className="animate-fade-up" style={{ animationDelay: `${i * 70}ms` }}>
          <circle cx={node.x} cy={SPINE_Y} r="7" className="fill-signal stroke-canvas" strokeWidth="2" />
          <text
            x={node.x}
            y={SPINE_Y + 26}
            textAnchor="middle"
            className="font-body text-[12px] fill-ink-secondary"
          >
            {node.label}
          </text>
        </g>
      ))}

      {/* The two detached pieces, each with the break drawn between it and the
          loop. `barX` is the break; the dashed runs stop either side of it. */}
      {[
        {
          id: "listener",
          name: "X Listener",
          role: "Would feed claims in",
          boxX: 0,
          boxW: 140,
          barX: 175,
          from: 140,
          to: 196,
        },
        {
          id: "publisher",
          name: "X Publisher",
          role: "Would announce the state",
          boxX: 522,
          boxW: 138,
          barX: 493,
          from: 466,
          to: 522,
        },
      ].map((piece, i) => (
        <g key={piece.id} className="animate-fade-up" style={{ animationDelay: `${360 + i * 140}ms` }}>
          <rect
            x={piece.boxX}
            y={BOX_Y}
            width={piece.boxW}
            height={BOX_H}
            rx="6"
            className="fill-surface stroke-edge-strong"
            strokeWidth="1.5"
          />
          <text x={piece.boxX + 14} y={BOX_Y + 20} className="font-body text-[13px] font-medium fill-ink">
            {piece.name}
          </text>
          <text x={piece.boxX + 14} y={BOX_Y + 36} className="font-body text-[11px] fill-ink-faint">
            {piece.role}
          </text>

          {/* The unfinished connection, in two dashed runs with nothing joining
              them. */}
          <line
            x1={piece.from}
            y1={SPINE_Y}
            x2={piece.barX - 7}
            y2={SPINE_Y}
            className="stroke-edge-strong"
            strokeWidth="1.5"
            strokeDasharray="4 5"
          />
          <line
            x1={piece.barX + 7}
            y1={SPINE_Y}
            x2={piece.to}
            y2={SPINE_Y}
            className="stroke-edge-strong"
            strokeWidth="1.5"
            strokeDasharray="4 5"
          />
          <line
            x1={piece.barX}
            y1={SPINE_Y - 10}
            x2={piece.barX}
            y2={SPINE_Y + 10}
            className="stroke-watch"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <text
            x={piece.barX}
            y={SPINE_Y + 50}
            textAnchor="middle"
            className={`${LABEL} fill-watch-soft`}
          >
            Not wired
          </text>
        </g>
      ))}
    </DiagramFigure>
  );
}
