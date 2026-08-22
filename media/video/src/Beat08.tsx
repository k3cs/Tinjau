import React from "react";
import { AbsoluteFill, interpolate, spring, useVideoConfig } from "remotion";
import { C, FONT, dataText, opLabel, tabular } from "./theme";
import { useBeatFrame } from "./kit";
import { CONSEQUENCE, EVENTS, feePercent } from "./benchmark";

/**
 * Beat 08 — "The boring one moved it more". 10s, act three of The Tinjau Cut.
 *
 * Two corporate events three weeks apart on the same pool. A routine insider Form 4
 * moved the price 241 bps. A $105bn 8-K moved it 235 bps. The routine one moved it
 * MORE, which is the surprise, and the mechanism §6.3 of the benchmark names: market
 * data alone cannot distinguish a material event from a routine one.
 *
 * FORM. Both values go on ONE shared axis, not two bars from zero.
 *
 * Two bars from a zero baseline would differ by a dozen pixels, and a graphic whose
 * finding only appears once you have read the caption has failed — a near-identical
 * pair of bars was rejected on exactly this ground once already. On a shared axis the
 * near-coincidence IS the reading: the eye sees two marks almost on top of each other,
 * which is precisely what the sentence says. The drama comes from the second mark
 * travelling past the first, not from a difference in length.
 *
 * COLOUR. No categorical palette is introduced. The two marks wear the text token,
 * because they are the same measure on the same axis and are directly labelled; the
 * only colours are `brand.md`'s reserved ones used for their reserved meaning — the
 * watch orange on the policy that raised a fee, the lime on the one that did not.
 */

const PHASE = {
  axisAt: 8,
  materialAt: 46,
  routineAt: 100,
  routineTravel: 40,
  gapAt: 156,
  consequenceAt: 196,
  consequenceStagger: 18,
  lineAt: 250,
} as const;

const MARGIN = 80;
const AXIS = { x: 200, w: 1520, y: 372 };

const rise = (frame: number, at: number, span = 12) =>
  interpolate(frame, [at, at + span], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const toX = (bps: number) => AXIS.x + (bps / EVENTS.axisMaxBps) * AXIS.w;

const OpLabel: React.FC<{ children: React.ReactNode; color?: string }> = ({
  children,
  color = C.muted,
}) => <div style={{ ...opLabel, color }}>{children}</div>;

const Rule: React.FC<{ x: number; y: number; w?: number; h?: number; color?: string }> = ({
  x,
  y,
  w = 1,
  h = 1,
  color = C.rule,
}) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: color }} />
);

/** One event's mark on the shared axis, with its label kept clear of the other's. */
const EventMark: React.FC<{
  bps: number;
  label: string;
  detail: string;
  side: "above" | "below";
  x: number;
  progress: number;
}> = ({ bps, label, detail, side, x, progress }) => {
  const above = side === "above";
  return (
    <div style={{ opacity: progress > 0 ? 1 : 0 }}>
      <div
        style={{
          position: "absolute",
          left: x - 2,
          top: above ? AXIS.y - 44 : AXIS.y + 2,
          width: 4,
          height: 44,
          background: C.paper,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          width: x - 18,
          top: above ? AXIS.y - 128 : AXIS.y + 58,
          textAlign: "right",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "flex-end",
            gap: 12,
          }}
        >
          <div
            style={{
              fontFamily: FONT.display,
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: "-0.015em",
              color: C.paper,
            }}
          >
            {label}
          </div>
          <div style={{ ...tabular, fontSize: 40, fontWeight: 500, color: C.paper, lineHeight: 1 }}>
            {bps}
          </div>
          <div style={{ ...dataText, fontSize: 17, color: C.muted }}>bps</div>
        </div>
        <div
          style={{
            fontFamily: FONT.body,
            fontSize: 16,
            color: C.dim,
            marginTop: 6,
          }}
        >
          {detail}
        </div>
      </div>
    </div>
  );
};

export const Beat08: React.FC = () => {
  const frame = useBeatFrame();
  const { fps } = useVideoConfig();

  const axis = rise(frame, PHASE.axisAt, 18);
  const material = rise(frame, PHASE.materialAt, 12);
  const gap = rise(frame, PHASE.gapAt, 14);
  const line = rise(frame, PHASE.lineAt, 14);

  const materialX = toX(EVENTS.material.bps);

  // The second mark starts where the first one stopped and travels past it. The whole
  // point of the beat is that it does not stop there.
  const travel = spring({
    frame: frame - PHASE.routineAt,
    fps,
    durationInFrames: PHASE.routineTravel,
    config: { damping: 200 },
  });
  const routineVisible = frame >= PHASE.routineAt;
  const routineX = interpolate(travel, [0, 1], [toX(0), toX(EVENTS.routine.bps)]);

  return (
    <AbsoluteFill style={{ background: C.carbon, fontFamily: FONT.body }}>
      {/* ---------- header ---------- */}
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
          <OpLabel color={C.paper}>How far the price fell</OpLabel>
          <div style={{ ...dataText }}>two events · same pool · three weeks apart</div>
        </div>
      </div>
      <Rule x={MARGIN} y={96} w={1920 - MARGIN * 2} />

      {/* ---------- the shared axis ---------- */}
      <div style={{ opacity: axis }}>
        <Rule x={AXIS.x} y={AXIS.y} w={AXIS.w * axis} h={2} color={C.edge} />
        {[0, 50, 100, 150, 200, 250, 300].map((b) => (
          <React.Fragment key={b}>
            <Rule x={toX(b)} y={AXIS.y + 2} h={8} color={C.edge} />
            <div
              style={{
                position: "absolute",
                left: toX(b),
                top: AXIS.y + 16,
                transform: "translateX(-50%)",
                ...dataText,
                fontSize: 13,
                color: C.dim,
              }}
            >
              {b}
            </div>
          </React.Fragment>
        ))}
        <div
          style={{
            position: "absolute",
            left: AXIS.x + AXIS.w + 20,
            top: AXIS.y - 9,
            ...dataText,
            fontSize: 15,
            color: C.muted,
          }}
        >
          bps
        </div>
      </div>

      {material > 0 ? (
        <EventMark
          bps={EVENTS.material.bps}
          label={EVENTS.material.label}
          detail={EVENTS.material.detail}
          side="above"
          x={materialX}
          progress={material}
        />
      ) : null}

      {routineVisible ? (
        <EventMark
          bps={EVENTS.routine.bps}
          label={EVENTS.routine.label}
          detail={EVENTS.routine.detail}
          side="below"
          x={routineX}
          progress={1}
        />
      ) : null}

      {/* ---------- the gap, stated because it is small ---------- */}
      <div style={{ opacity: gap }}>
        <Rule x={materialX} y={AXIS.y - 62} w={toX(EVENTS.routine.bps) - materialX} h={1} color={C.signal} />
        <div
          style={{
            position: "absolute",
            left: toX(EVENTS.routine.bps) + 16,
            top: AXIS.y - 74,
            ...dataText,
            fontSize: 15,
            color: C.signal,
            whiteSpace: "nowrap",
          }}
        >
          {EVENTS.gapBps} BPS APART
        </div>
      </div>

      {/* ---------- what each policy did with the routine one ---------- */}
      <Rule x={MARGIN} y={606} w={1920 - MARGIN * 2} color={C.edge} />
      {CONSEQUENCE.map((c, i) => {
        const show = rise(frame, PHASE.consequenceAt + i * PHASE.consequenceStagger, 14);
        const accent = c.acted ? C.watch : C.signal;
        return (
          <div
            key={c.policy}
            style={{
              position: "absolute",
              left: MARGIN + i * 900,
              top: 640,
              width: 820,
              opacity: show,
              transform: `translateY(${(1 - show) * 10}px)`,
            }}
          >
            <OpLabel>{c.policy}</OpLabel>
            <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 20 }}>
              <div style={{ ...tabular, fontSize: 68, fontWeight: 500, lineHeight: 1, color: accent }}>
                {feePercent(c.feePips)}
              </div>
              <div style={{ ...dataText, fontSize: 15, color: accent }}>{c.note.toUpperCase()}</div>
            </div>
          </div>
        );
      })}

      {/* ---------- the finding ---------- */}
      <Rule x={MARGIN} y={836} w={1920 - MARGIN * 2} />
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          right: MARGIN,
          top: 866,
          opacity: line,
          transform: `translateY(${(1 - line) * 8}px)`,
        }}
      >
        <div
          style={{
            fontFamily: FONT.display,
            fontSize: 38,
            fontWeight: 600,
            letterSpacing: "-0.015em",
            lineHeight: 1.15,
            color: C.paper,
          }}
        >
          The routine one moved it more. Price alone cannot tell them apart.
        </div>
      </div>

      {/* ---------- the disclosure ---------- */}
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          right: MARGIN,
          bottom: 130,
          fontFamily: FONT.body,
          fontSize: 15,
          color: C.dim,
        }}
      >
        Maximum drawdown measured on the frozen X Layer mainnet replay windows. We searched for anyone
        else doing this and published what we found.
      </div>
    </AbsoluteFill>
  );
};
