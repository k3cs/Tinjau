import { DiagramFigure, LABEL } from "./figure";

/**
 * What Tinjau reads from X Layer, and what it put there.
 *
 * "Built on X Layer" is a sentence every project in this category writes and it
 * carries no information. This splits the claim into the two directions that can
 * actually be checked: four things read off the chain, four things deployed onto
 * it with addresses anyone can call. The chain is the band in the middle because
 * both directions cross it, which is the actual argument for choosing one chain
 * rather than bridging a reference price to a pool somewhere else.
 */
const READS = [
  "Pool price and liquidity",
  "Swap events, per trade",
  "Executable exit depth",
  "Block time, as the clock",
];

const WRITES = [
  "TinjauRiskRegistry",
  "TinjauFeeHook (Uniswap v4)",
  "The bounded fee, per swap",
  "An expiring risk record",
];

export function XLayerFootprintDiagram() {
  const rowY = (i: number) => 78 + i * 34;
  const leftEdge = 236;
  const rightEdge = 424;

  return (
    <DiagramFigure
      title="Four things read off X Layer, four things deployed onto it"
      description="A vertical band in the centre represents X Layer. On the left, four inputs Tinjau reads from the chain: pool price and liquidity, swap events per trade, executable exit depth, and block time used as the clock. On the right, four things Tinjau deployed onto the chain: the risk registry, the Uniswap v4 fee hook, the bounded fee charged per swap, and an expiring risk record."
      status={{
        kind: "RULE",
        text: "Both directions are addressable. Every contract on the right has a published address and bytecode on chain.",
      }}
      viewBox="0 0 660 240"
    >
      <text x="0" y="20" className={`${LABEL} fill-ink-faint`}>
        Reads from the chain
      </text>
      <text x="660" y="20" textAnchor="end" className={`${LABEL} fill-signal`}>
        Deployed onto the chain
      </text>

      {/* The chain itself. */}
      <rect
        x={leftEdge + 12}
        y="42"
        width={rightEdge - leftEdge - 24}
        height="176"
        rx="8"
        className="fill-surface stroke-edge-strong"
        strokeWidth="1.5"
      />
      <text
        x={(leftEdge + rightEdge) / 2}
        y="70"
        textAnchor="middle"
        className="font-display text-[15px] font-medium fill-ink"
      >
        X Layer
      </text>
      <text
        x={(leftEdge + rightEdge) / 2}
        y="200"
        textAnchor="middle"
        className={`${LABEL} fill-ink-faint`}
      >
        chain 1952
      </text>

      {READS.map((label, i) => {
        const y = rowY(i);
        return (
          <g key={label} className="animate-fade-right" style={{ animationDelay: `${i * 70}ms` }}>
            <text x="0" y={y + 4} className="font-body text-[12px] fill-ink-secondary">
              {label}
            </text>
            <path
              d={`M${leftEdge - 8} ${y} H${leftEdge + 6}`}
              className="stroke-edge-strong"
              strokeWidth="1.5"
              markerEnd="url(#tinjau-foot-in)"
            />
          </g>
        );
      })}

      {WRITES.map((label, i) => {
        const y = rowY(i);
        return (
          <g key={label} className="animate-fade-right" style={{ animationDelay: `${300 + i * 70}ms` }}>
            <path
              d={`M${rightEdge - 6} ${y} H${rightEdge + 8}`}
              className="stroke-signal"
              strokeWidth="1.5"
              markerEnd="url(#tinjau-foot-out)"
            />
            <text x="660" y={y + 4} textAnchor="end" className="font-body text-[12px] fill-ink">
              {label}
            </text>
          </g>
        );
      })}

      <defs>
        <marker id="tinjau-foot-in" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" className="fill-edge-strong" />
        </marker>
        <marker id="tinjau-foot-out" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" className="fill-signal" />
        </marker>
      </defs>
    </DiagramFigure>
  );
}
