import type { CSSProperties } from "react";

import { DiagramFigure, LABEL } from "./figure";

/** Sets both the dash length and the custom property the `draw` keyframe reads. */
function drawn(length: number, delayMs: number): CSSProperties {
  return {
    strokeDasharray: length,
    ["--draw-length" as string]: length,
    animationDelay: `${delayMs}ms`,
  };
}

/**
 * The problem, drawn once instead of explained in four paragraphs.
 *
 * One shared time axis carries three tracks: what is public, what the price
 * does, and what the pool charges while it happens. The gap between the second
 * and the third is the whole product thesis, and it is a shape rather than a
 * sentence.
 *
 * Deliberately unnumbered. The shape is real; the magnitudes are not measured,
 * and the figure says so on its own caption rather than trusting the section
 * copy to keep saying it.
 */
export function BlindWindowDiagram() {
  return (
    <DiagramFigure
      title="A stock token keeps trading after the news and before the pool reacts"
      description="Three tracks share one time axis. On the top track a disclosure becomes public. On the middle track the price of the tokenized stock falls shortly after. On the bottom track the pool's fee stays flat at its base rate the whole time, so trades land against liquidity that has not been repriced. The shaded region between the disclosure and the end of the axis is the window this product is about."
      status={{
        kind: "ILLUSTRATION",
        text: "The shape of the problem. No number here is measured.",
      }}
      viewBox="0 0 660 244"
    >
      {/* Shaded window: from the disclosure to the end of the axis. */}
      <rect
        x="266"
        y="16"
        width="374"
        height="176"
        className="animate-fade-up fill-watch/[0.07]"
        style={{ animationDelay: "500ms" }}
      />
      <line
        x1="266"
        y1="16"
        x2="266"
        y2="192"
        className="animate-fade-up stroke-watch"
        strokeWidth="1.5"
        strokeDasharray="3 4"
        style={{ animationDelay: "400ms" }}
      />

      {/* Track 1: the disclosure. */}
      <text x="0" y="26" className={`${LABEL} fill-ink-faint`}>
        Public
      </text>
      <line x1="100" y1="38" x2="640" y2="38" className="stroke-edge" strokeWidth="1" />
      <g className="animate-fade-up" style={{ animationDelay: "400ms" }}>
        <rect x="260" y="32" width="12" height="12" className="fill-watch" />
        <text x="280" y="30" className={`${LABEL} fill-watch-soft`}>
          Filing lands
        </text>
      </g>

      {/* Track 2: the price of the stock token. */}
      <text x="0" y="96" className={`${LABEL} fill-ink-faint`}>
        Price
      </text>
      <path
        d="M100 80 H266 C300 80 300 140 340 142 C400 145 520 138 640 140"
        fill="none"
        className="animate-draw-slow stroke-ink"
        strokeWidth="2"
        strokeLinecap="round"
        style={drawn(600, 150)}
      />
      <g className="animate-fade-up" style={{ animationDelay: "900ms" }}>
        <text x="352" y="168" className={`${LABEL} fill-ink-muted`}>
          It reprices in seconds
        </text>
      </g>

      {/* Track 3: what the pool charges. */}
      <text x="0" y="200" className={`${LABEL} fill-ink-faint`}>
        Pool fee
      </text>
      <path
        d="M100 192 H640"
        fill="none"
        className="animate-draw stroke-ink-disabled"
        strokeWidth="2"
        strokeLinecap="round"
        style={drawn(540, 600)}
      />
      <g className="animate-fade-up" style={{ animationDelay: "1100ms" }}>
        <text x="278" y="216" className={`${LABEL} fill-ink-muted`}>
          It does not
        </text>
      </g>

      {/* The axis. */}
      <line x1="100" y1="230" x2="640" y2="230" className="stroke-edge" strokeWidth="1" />
      <text x="100" y="244" className={`${LABEL} fill-ink-faint`}>
        Time
      </text>
      <text x="640" y="244" textAnchor="end" className={`${LABEL} fill-watch-soft`}>
        Someone read it first
      </text>
    </DiagramFigure>
  );
}
