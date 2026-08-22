import React from "react";
import { AbsoluteFill, interpolate, spring, useVideoConfig } from "remotion";
import { C, FONT, dataText, tabular } from "./theme";
import { CONTENT, ConstructedMark, Disclosure, Header, MARGIN, OpLabel, Rule, Verdict, rise, useBeatFrame } from "./kit";

/**
 * Beat 07 — "It acts briefly, then puts itself back". 12s, act two. The riskiest shot
 * in the film, and the one with the hardest rules on it.
 *
 * `t6-5-demo-manifest.json`, scene 2, `constructed.uiRequirement`:
 *
 *   "Any surface showing this PROTECT must label it constructed, in the same visual
 *    weight as the state itself. Presenting it as a replayed outcome would be the
 *    single most misleading thing this project could publish."
 *
 * So CONSTRUCTED sits beside PROTECT at the same size, from the frame PROTECT appears,
 * and the canonical replay of the same event — `WATCH` — sits next to it for the whole
 * beat. Tinjau reaches PROTECT on none of the four frozen replay scenarios; what is
 * constructed is the market leg, not the judgement about it, and the reason-code diff
 * against the canonical run touches only market-leg codes.
 *
 * THE TIMINGS ARE DELIBERATELY ABSENT. These four fees ran on the 60×-COMPRESSED demo
 * envelope, because X Layer Testnet exposes no `evm_increaseTime` and the production
 * envelope's 21,600 s recovery cannot be watched live. Putting these fee numbers on
 * screen beside the production seconds would be the one genuinely misleading frame
 * available, so no seconds appear here at all — only the shape, and the label naming
 * the compression.
 */

/** `facts.feeCurveChargedByThePool` — decoded from PoolManager's own Swap events. */
const CURVE = [20_000, 9_470, 500, 500] as const;

const PHASE = {
  protectAt: 14,
  curveAt: 76,
  curveStagger: 34,
  recoveryAt: 224,
  verdictAt: 274,
} as const;

const PLOT = { x: MARGIN, y: 340, w: 1180, h: 250 };

/** 9,470 pips is 0.947%. Rounding it to two places would hide a measured digit. */
const pct = (pips: number) => `${(pips / 10_000).toFixed(pips % 100 === 0 ? 2 : 3)}%`;
const feeY = (pips: number) => PLOT.y + PLOT.h - (pips / 20_000) * PLOT.h;
const stepX = (i: number) => PLOT.x + (i / (CURVE.length - 1)) * PLOT.w;

export const Beat07: React.FC = () => {
  const frame = useBeatFrame();
  const { fps } = useVideoConfig();

  const protect = spring({ frame: frame - PHASE.protectAt, fps, config: { damping: 200 } });
  const recovery = rise(frame, PHASE.recoveryAt, 16);
  const verdict = rise(frame, PHASE.verdictAt, 14);

  const shown = CURVE.map((_, i) => rise(frame, PHASE.curveAt + i * PHASE.curveStagger, 22));

  return (
    <AbsoluteFill style={{ background: C.carbon, fontFamily: FONT.body }}>
      <Header label="When the evidence does hold up" detail="scenario B · the market leg is constructed" />

      {/* the state and its label, at one weight, side by side, from the same frame */}
      <div style={{ position: "absolute", left: MARGIN, top: 148, display: "flex", alignItems: "center", gap: 20, opacity: protect }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 16,
            border: `2px solid ${C.protect}`,
            padding: "8px 18px",
          }}
        >
          <div style={{ width: 12, height: 12, background: C.protect }} />
          <div
            style={{
              fontFamily: FONT.display,
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: C.protect,
            }}
          >
            PROTECT
          </div>
        </div>
        <ConstructedMark show={1} />
        <div style={{ ...dataText, fontSize: 16, color: C.muted, marginLeft: 10 }}>
          CANONICAL REPLAY OF THE SAME EVENT: WATCH
        </div>
      </div>

      {/* the fee the pool actually charged, four swaps in a row */}
      <div style={{ position: "absolute", left: MARGIN, top: 252 }}>
        <OpLabel>What the pool charged, read from its own swap events</OpLabel>
      </div>

      <svg style={{ position: "absolute", inset: 0 }} width={1920} height={1080} fill="none">
        <line x1={PLOT.x} y1={PLOT.y + PLOT.h} x2={PLOT.x + PLOT.w} y2={PLOT.y + PLOT.h} stroke={C.edge} strokeWidth={2} />
        {CURVE.slice(0, -1).map((pips, i) => {
          const p = shown[i + 1];
          if (p <= 0) return null;
          const x0 = stepX(i);
          const y0 = feeY(pips);
          const x1 = interpolate(p, [0, 1], [x0, stepX(i + 1)]);
          const y1 = interpolate(p, [0, 1], [y0, feeY(CURVE[i + 1])]);
          return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={C.protect} strokeWidth={3} />;
        })}
      </svg>

      {CURVE.map((pips, i) => (
        <div key={i} style={{ opacity: shown[i] }}>
          <div
            style={{
              position: "absolute",
              left: stepX(i) - 6,
              top: feeY(pips) - 6,
              width: 12,
              height: 12,
              background: C.protect,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: stepX(i) - 70,
              top: feeY(pips) - 48,
              width: 140,
              textAlign: "center",
              ...tabular,
              fontSize: 26,
              fontWeight: 500,
              color: i === 0 ? C.protect : C.paper,
            }}
          >
            {pct(pips)}
          </div>
          <div
            style={{
              position: "absolute",
              left: stepX(i) - 70,
              top: PLOT.y + PLOT.h + 14,
              width: 140,
              textAlign: "center",
              ...dataText,
              fontSize: 13,
              color: C.dim,
            }}
          >
            SWAP {i + 1}
          </div>
        </div>
      ))}

      {/* the part that has no transaction in it */}
      <div style={{ position: "absolute", left: 1340, top: 340, width: 500, opacity: recovery }}>
        <OpLabel color={C.signal}>How it came back down</OpLabel>
        <div
          style={{
            fontFamily: FONT.display,
            fontSize: 40,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            color: C.paper,
            marginTop: 20,
          }}
        >
          No transaction at all
        </div>
        <div style={{ fontFamily: FONT.body, fontSize: 18, lineHeight: 1.45, color: C.body, marginTop: 18 }}>
          Nobody switched it off and no keeper was paid. The fee is a function of time, so it
          unwinds itself. Re-arming was refused while the cooldown was still running.
        </div>
      </div>

      <Verdict top={676} show={verdict} size={36}>
        Protection that expires on its own cannot be left on by accident.
      </Verdict>

      <Disclosure>
        The market leg of this scenario is CONSTRUCTED — Tinjau reaches PROTECT on none of the four
        frozen replays, and the canonical replay of this same event is WATCH. The four fees are
        decoded from PoolManager&rsquo;s own Swap events on a builder-controlled X Layer Testnet pool,
        running the 60×-compressed demo envelope, because the testnet exposes no way to fast-forward
        time.
      </Disclosure>
    </AbsoluteFill>
  );
};
