import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, FONT, dataText, opLabel } from "./theme";
import { PACE } from "./timing";

/**
 * The pieces every beat repeats. Kept in one file so the twelve beats cannot drift
 * apart: a rule is one weight everywhere, a label is one size everywhere, and the
 * header and footer sit on the same baselines in every shot.
 */

export const MARGIN = 80;
export const W = 1920;
export const H = 1080;
export const CONTENT = W - MARGIN * 2;

/**
 * The clock a beat animates on. Every beat reads this instead of `useCurrentFrame`, so
 * one constant in `timing.ts` stretches all twelve at once and no beat can drift out of
 * step with the others. Springs stay springs — they receive the paced frame and take
 * `PACE` times longer to settle, which is the intent.
 */
export const useBeatFrame = () => useCurrentFrame() / PACE;

export const rise = (frame: number, at: number, span = 12) =>
  interpolate(frame, [at, at + span], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const OpLabel: React.FC<{ children: React.ReactNode; color?: string }> = ({
  children,
  color = C.muted,
}) => <div style={{ ...opLabel, color }}>{children}</div>;

export const Rule: React.FC<{
  x: number;
  y: number;
  w?: number;
  h?: number;
  color?: string;
}> = ({ x, y, w = 1, h = 1, color = C.rule }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: color }} />
);

/** Every beat opens the same way: a name on the left, the run's own facts beside it. */
export const Header: React.FC<{ label: string; detail?: string; right?: React.ReactNode }> = ({
  label,
  detail,
  right,
}) => (
  <>
    <div
      style={{
        position: "absolute",
        left: MARGIN,
        right: MARGIN,
        top: 56,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <OpLabel color={C.paper}>{label}</OpLabel>
        {detail ? <div style={{ ...dataText }}>{detail}</div> : null}
      </div>
      {right}
    </div>
    <Rule x={MARGIN} y={96} w={CONTENT} />
  </>
);

/** The disclosure line. Never smaller than 15px, never dimmer than `C.dim`. */
export const Disclosure: React.FC<{ children: React.ReactNode; opacity?: number }> = ({
  children,
  opacity = 1,
}) => (
  <div
    style={{
      position: "absolute",
      left: MARGIN,
      right: MARGIN,
      bottom: 130,
      opacity,
      fontFamily: FONT.body,
      fontSize: 15,
      fontWeight: 400,
      lineHeight: 1.45,
      color: C.dim,
    }}
  >
    {children}
  </div>
);

/**
 * The line a beat is remembered for. One per shot, never two.
 * `top` is where the rule above it sits; the sentence starts 30px below.
 */
export const Verdict: React.FC<{
  top: number;
  show: number;
  label?: string;
  children: React.ReactNode;
  size?: number;
}> = ({ top, show, label, children, size = 38 }) => (
  <>
    <Rule x={MARGIN} y={top} w={CONTENT} />
    {label ? (
      <div style={{ position: "absolute", left: MARGIN, top: top + 14, opacity: show }}>
        <OpLabel color={C.dim}>{label}</OpLabel>
      </div>
    ) : null}
    <div
      style={{
        position: "absolute",
        left: MARGIN,
        right: MARGIN,
        top: top + (label ? 40 : 30),
        opacity: show,
        transform: `translateY(${(1 - show) * 8}px)`,
        fontFamily: FONT.display,
        fontSize: size,
        fontWeight: 600,
        letterSpacing: "-0.015em",
        lineHeight: 1.15,
        color: C.paper,
      }}
    >
      {children}
    </div>
  </>
);

/**
 * The label a constructed shot must carry, at the same visual weight as the state it
 * qualifies. `t6-5-demo-manifest.json` requires it in those words, and presenting a
 * constructed PROTECT as a replayed one is named there as the single most misleading
 * thing this project could publish.
 */
export const ConstructedMark: React.FC<{ show: number }> = ({ show }) => (
  <div
    style={{
      opacity: show,
      border: `2px solid ${C.watch}`,
      padding: "8px 16px",
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
    }}
  >
    <div style={{ width: 12, height: 12, background: C.watch }} />
    <div
      style={{
        fontFamily: FONT.display,
        fontSize: 26,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        color: C.watch,
      }}
    >
      CONSTRUCTED
    </div>
  </div>
);
