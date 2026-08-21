import type { CSSProperties } from "react";

import { DiagramFigure, LABEL } from "./figure";
import type { RecoveryStep } from "@/lib/handoff/scenarios";

const PLOT = { x0: 78, x1: 636, y0: 34, y1: 186 };

function pips(value: number): string {
  return `${(value / 10_000).toFixed(2)}%`;
}

/**
 * The bounded action and its recovery, as one shape.
 *
 * Two things are drawn on the same axes and they are not the same kind of thing,
 * so they do not share a treatment. The **line** is the rule: a hold at the
 * ceiling for `widenDuration`, then a straight deterministic decay to the base
 * fee, computed here from the envelope the contract enforces. The **dots** are
 * the three fees actually charged on chain, read from the handoff. If the rule
 * and the measurement ever disagreed, the picture would show it rather than
 * average them.
 *
 * The caption carries the constructed-inputs caveat because the picture is the
 * part that gets screenshotted.
 */
export function FeeLifecycleDiagram({
  envelope,
  measured,
  caveat,
}: {
  envelope: Record<string, number | boolean>;
  measured: RecoveryStep[];
  caveat: string;
}) {
  const baseFee = Number(envelope.baseFee);
  const maxFee = Number(envelope.maxFee);
  const widen = Number(envelope.widenDuration);
  const total = Number(envelope.maxProtectDuration);

  const start = measured[0]?.atUnixSeconds ?? 0;
  const points = measured.map((step) => ({
    t: step.atUnixSeconds - start,
    fee: step.appliedFee,
    label: step.label,
  }));

  const span = Math.max(total, ...points.map((p) => p.t)) * 1.06;
  const x = (t: number) => PLOT.x0 + (t / span) * (PLOT.x1 - PLOT.x0);
  const y = (fee: number) => PLOT.y1 - (fee / maxFee) * (PLOT.y1 - PLOT.y0);

  // The rule: charge the ceiling for `widen`, then fall to base by `total`.
  const rule = `M${x(0)} ${y(maxFee)} H${x(widen)} L${x(total)} ${y(baseFee)} H${PLOT.x1}`;

  const drawn = (length: number, delayMs: number): CSSProperties => ({
    strokeDasharray: length,
    ["--draw-length" as string]: length,
    animationDelay: `${delayMs}ms`,
  });

  return (
    <DiagramFigure
      title="The fee goes up, hits a ceiling, and comes back down by itself"
      description={`The line is the rule the contract enforces: the fee is held at the ${pips(
        maxFee,
      )} ceiling for ${widen} seconds, then falls in a straight line back to the ${pips(
        baseFee,
      )} base fee by ${total} seconds. The dots are the three fees actually charged on chain during the replay, which land on that line. Nothing decides when protection ends: it is a function of time, with no keeper transaction and no model involved.`}
      status={{ kind: "MEASURED", text: caveat }}
      viewBox="0 0 660 234"
    >
      {/* Ceiling and base, as reference rules rather than plotted data. */}
      <line
        x1={PLOT.x0}
        y1={y(maxFee)}
        x2={PLOT.x1}
        y2={y(maxFee)}
        className="stroke-protect/40"
        strokeWidth="1"
        strokeDasharray="4 5"
      />
      <text x="0" y={y(maxFee) + 4} className={`${LABEL} fill-protect-soft`}>
        {pips(maxFee)} cap
      </text>
      <line
        x1={PLOT.x0}
        y1={y(baseFee)}
        x2={PLOT.x1}
        y2={y(baseFee)}
        className="stroke-edge"
        strokeWidth="1"
      />
      <text x="0" y={y(baseFee) + 4} className={`${LABEL} fill-ink-faint`}>
        {pips(baseFee)} base
      </text>

      {/* The rule. */}
      <path
        d={rule}
        fill="none"
        className="animate-draw-slow stroke-signal"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={drawn(900, 120)}
      />

      {/* The measurements. A ring in the surface colour keeps each dot readable
          where it sits on the line. */}
      {points.map((point, i) => (
        <g
          key={point.label}
          className="animate-fade-up"
          style={{ animationDelay: `${700 + i * 160}ms` }}
        >
          <circle cx={x(point.t)} cy={y(point.fee)} r="6.5" className="fill-canvas-sunken" />
          <circle cx={x(point.t)} cy={y(point.fee)} r="4.5" className="fill-ink" />
          <text
            x={x(point.t)}
            y={y(point.fee) - 14}
            textAnchor={i === points.length - 1 ? "end" : "start"}
            className="font-data text-[12px] tabular fill-ink"
          >
            {pips(point.fee)}
          </text>
          <text
            x={x(point.t)}
            y={PLOT.y1 + 20}
            textAnchor={i === points.length - 1 ? "end" : "start"}
            className={`${LABEL} fill-ink-faint`}
          >
            {point.t}s
          </text>
        </g>
      ))}

      {/* What each stretch of the line means. */}
      <g className="animate-fade-up" style={{ animationDelay: "1200ms" }}>
        {/* Offset past the "2.00%" value label, which sits at the same x and 2px away. */}
        <text x={x(0) + 62} y={PLOT.y0 - 12} className={`${LABEL} fill-ink-muted`}>
          Held at the cap
        </text>
        <text x={x(widen) + 12} y={PLOT.y0 + 44} className={`${LABEL} fill-ink-muted`}>
          Comes back down by itself
        </text>
        <text x={PLOT.x1} y={PLOT.y1 + 44} textAnchor="end" className={`${LABEL} fill-ink-faint`}>
          No keeper. No model. Just the clock.
        </text>
      </g>
    </DiagramFigure>
  );
}
