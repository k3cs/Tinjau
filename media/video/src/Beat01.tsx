import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { C, FONT, dataText, tabular } from "./theme";
import { CONTENT, Disclosure, Header, MARGIN, OpLabel, Rule, Verdict, rise, useBeatFrame } from "./kit";

/**
 * Beat 01 — "The pool doesn't sleep". 8s, act one. No product yet.
 *
 * The clock and the trade counter are not decoration. They run over the frozen replay
 * window of scenario D on the real chain-196 wNVDAx/USDG pool: 25,200 seconds and
 * **367 swaps, measured, with zero RPC range errors**. So the shot's only two moving
 * numbers are the pool's own, and the beat asks nothing to be taken on trust.
 */

const WINDOW_SEC = 25_200;
const SWAPS = 367;

const PHASE = { poolAt: 10, runFrom: 40, runTo: 190, labelsAt: 96, verdictAt: 196 } as const;

const clock = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export const Beat01: React.FC = () => {
  const frame = useBeatFrame();

  const pool = rise(frame, PHASE.poolAt, 16);
  const run = interpolate(frame, [PHASE.runFrom, PHASE.runTo], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const labels = rise(frame, PHASE.labelsAt, 16);
  const verdict = rise(frame, PHASE.verdictAt, 14);

  return (
    <AbsoluteFill style={{ background: C.carbon, fontFamily: FONT.body }}>
      <Header label="A pool that is open all night" detail="wNVDAx / USDG · X Layer · chain 196" />

      {/* the pool itself, named rather than drawn as a metaphor */}
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          top: 190,
          width: 640,
          border: `1px solid ${C.edge}`,
          background: C.elevated,
          padding: "26px 28px",
          opacity: pool,
          transform: `translateY(${(1 - pool) * 12}px)`,
        }}
      >
        <OpLabel>Tokenised Nvidia shares</OpLabel>
        <div
          style={{
            fontFamily: FONT.display,
            fontSize: 46,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: C.paper,
            marginTop: 16,
          }}
        >
          wNVDAx / USDG
        </div>
        <div style={{ ...dataText, fontSize: 16, color: C.muted, marginTop: 14 }}>
          FEE 0.05% · THIRD-PARTY LIQUIDITY, NOT OURS
        </div>
      </div>

      {/* the two states, side by side, one of them flat on purpose */}
      <div style={{ position: "absolute", left: 840, top: 190, width: 1000, opacity: labels }}>
        <div style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 20 }}>
          <OpLabel>You</OpLabel>
          <div
            style={{
              fontFamily: FONT.display,
              fontSize: 40,
              fontWeight: 600,
              letterSpacing: "-0.015em",
              color: C.dim,
              marginTop: 12,
            }}
          >
            Asleep
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 20, marginTop: 34 }}>
          <OpLabel>The pool</OpLabel>
          <div
            style={{
              fontFamily: FONT.display,
              fontSize: 40,
              fontWeight: 600,
              letterSpacing: "-0.015em",
              color: C.signal,
              marginTop: 12,
            }}
          >
            Open, and taking trades
          </div>
        </div>
      </div>

      {/* the pool's own two numbers, running */}
      <Rule x={MARGIN} y={560} w={CONTENT} color={C.edge} />
      <div style={{ position: "absolute", left: MARGIN, top: 596 }}>
        <OpLabel>Seven hours of that pool</OpLabel>
        <div style={{ ...tabular, fontSize: 96, fontWeight: 500, color: C.paper, lineHeight: 1, marginTop: 20 }}>
          {clock(run * WINDOW_SEC)}
        </div>
      </div>
      <div style={{ position: "absolute", left: 840, top: 596 }}>
        <OpLabel>Trades it took while you slept</OpLabel>
        <div style={{ ...tabular, fontSize: 96, fontWeight: 500, color: C.paper, lineHeight: 1, marginTop: 20 }}>
          {Math.round(run * SWAPS)}
        </div>
      </div>

      <Verdict top={790} show={verdict}>
        Your money is awake even when you are not.
      </Verdict>

      <Disclosure>
        Measured on a frozen replay window of a real third-party X Layer pool: 25,200 seconds, 367
        swaps, zero RPC range errors.
      </Disclosure>
    </AbsoluteFill>
  );
};
