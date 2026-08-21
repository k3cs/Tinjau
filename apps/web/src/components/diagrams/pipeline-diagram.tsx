import type { CSSProperties } from "react";

import { DiagramFigure, LABEL } from "./figure";
import { SYSTEM_NODES } from "@/lib/product/system";

/**
 * The whole path, end to end, as one rail.
 *
 * This replaced a six-row table that spent about ninety words restating what a
 * left-to-right arrow already says. What the table could not show, and the rail
 * can, is that the two halves are different kinds of thing: everything before
 * the gate is judgement and everything after it is arithmetic. The rail changes
 * from a dashed stroke to a solid one at that exact point.
 *
 * Node names and their outputs come from `SYSTEM_NODES`, so this stays in step
 * with the capability list rather than duplicating it.
 */
const GATE_INDEX = 3; // Confirmation is the last step before the contract acts.

export function PipelineDiagram() {
  const nodes = SYSTEM_NODES;
  const x = (i: number) => 46 + i * ((596 - 46) / (nodes.length - 1));
  const railY = 86;

  const drawn = (length: number, delayMs: number): CSSProperties => ({
    strokeDasharray: length,
    ["--draw-length" as string]: length,
    animationDelay: `${delayMs}ms`,
  });

  return (
    <DiagramFigure
      title="From a source document to a fee the contract will let go of"
      description={nodes
        .map((node, i) => `${i + 1}. ${node.capability.name}, producing ${node.output}.`)
        .join(" ")}
      status={{ kind: "RULE", text: "The path every scenario on this site takes. Same order, every time." }}
      viewBox="0 0 660 150"
      className="bg-canvas"
    >
      {/* Judgement half: dashed, because this is where the model works. */}
      <path
        d={`M${x(0)} ${railY} H${x(GATE_INDEX)}`}
        className="animate-draw stroke-edge-strong"
        strokeWidth="2"
        strokeLinecap="round"
        style={{ ...drawn(340, 80), strokeDasharray: "6 5" }}
      />
      {/* Arithmetic half: solid, because nothing here is a judgement call. */}
      <path
        d={`M${x(GATE_INDEX)} ${railY} H${x(nodes.length - 1)}`}
        className="animate-draw stroke-signal"
        strokeWidth="2"
        strokeLinecap="round"
        style={drawn(340, 460)}
      />

      <text x={x(0)} y="30" className={`${LABEL} fill-ink-faint`}>
        The model reads
      </text>
      <text x={x(nodes.length - 1)} y="30" textAnchor="end" className={`${LABEL} fill-signal`}>
        The contract acts
      </text>
      <line
        x1={x(GATE_INDEX)}
        y1="40"
        x2={x(GATE_INDEX)}
        y2="132"
        className="stroke-edge"
        strokeWidth="1"
        strokeDasharray="3 4"
      />

      {nodes.map((node, i) => (
        <g key={node.index} className="animate-fade-up" style={{ animationDelay: `${180 + i * 90}ms` }}>
          <circle
            cx={x(i)}
            cy={railY}
            r="7"
            className={i <= GATE_INDEX ? "fill-canvas stroke-edge-strong" : "fill-signal stroke-signal"}
            strokeWidth="2"
          />
          <text x={x(i)} y={railY - 20} textAnchor="middle" className={`${LABEL} fill-ink-faint`}>
            {node.index}
          </text>
          <text
            x={x(i)}
            y={railY + 28}
            textAnchor="middle"
            className="font-body text-[14px] font-medium fill-ink"
          >
            {node.short}
          </text>
          <text x={x(i)} y={railY + 46} textAnchor="middle" className={`${LABEL} fill-ink-faint`}>
            {node.shortOutput}
          </text>
        </g>
      ))}
    </DiagramFigure>
  );
}
