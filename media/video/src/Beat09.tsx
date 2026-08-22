import React from "react";
import { AbsoluteFill, interpolate, spring, useVideoConfig } from "remotion";
import { C, FONT, dataText, opLabel, tabular } from "./theme";
import { useBeatFrame } from "./kit";
import { TEST_ONE, TEST_TWO } from "./benchmark";

/**
 * Beat 09 — "Two tests, written before they were run". 15s, act three.
 *
 * Both tests were frozen in writing before any result existed, and both are published
 * whichever way they landed. The first FAILED its own gate. The second returned
 * CONFIRMS and still does not license the sentence its author would most like to say.
 *
 * COMPOSITION. The two tests are SEQUENTIAL, never on screen together at full weight.
 * The first fills the frame, then collapses to a one-line strip when the second
 * arrives. That is the fix for the beat this replaces, which put a six-lane chart, a
 * three-cell panel and two full-width sentences on screen at once and gave the eye no
 * place to start.
 *
 * COLOUR. Deliberately almost monochrome. Neither outcome gets a celebratory or an
 * alarming colour: a failed gate stated calmly is more credible than a red stamp, and
 * painting CONFIRMS lime would imply a win the document explicitly withholds. Lime
 * appears only on the dates, which are the load-bearing fact — these were written
 * first.
 */

const PHASE = {
  oneAt: 6,
  outcomeOneAt: 46,
  rowsAt: 76,
  rowStagger: 22,
  noteAt: 136,
  collapseAt: 196,
  twoAt: 214,
  poolsAt: 250,
  resultAt: 292,
  prohibitedAt: 332,
  attemptsAt: 368,
} as const;

const MARGIN = 80;
const STRIP_Y = 132;
const BODY_Y = 210;

const rise = (frame: number, at: number, span = 12) =>
  interpolate(frame, [at, at + span], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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

/** The outcome word, on a plate. Neutral border on purpose — see the colour note above. */
const Outcome: React.FC<{ word: string; size?: number; show: number }> = ({ word, size = 62, show }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      border: `2px solid ${C.edge}`,
      padding: "10px 26px",
      opacity: show,
      transform: `translateY(${(1 - show) * 10}px)`,
    }}
  >
    <div
      style={{
        fontFamily: FONT.display,
        fontSize: size,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        lineHeight: 1,
        color: C.paper,
      }}
    >
      {word}
    </div>
  </div>
);

export const Beat09: React.FC = () => {
  const frame = useBeatFrame();
  const { fps } = useVideoConfig();

  const one = rise(frame, PHASE.oneAt, 14);
  const outcomeOne = spring({ frame: frame - PHASE.outcomeOneAt, fps, config: { damping: 200 } });
  const noteOne = rise(frame, PHASE.noteAt, 14);

  // The first test does not disappear, it demotes. Its verdict stays legible for the
  // rest of the beat, because the second test only means something beside the first.
  const collapse = rise(frame, PHASE.collapseAt, 18);
  const two = rise(frame, PHASE.twoAt, 14);
  const pools = rise(frame, PHASE.poolsAt, 16);
  const result = spring({ frame: frame - PHASE.resultAt, fps, config: { damping: 200 } });
  const prohibited = rise(frame, PHASE.prohibitedAt, 14);
  const attempts = rise(frame, PHASE.attemptsAt, 14);

  return (
    <AbsoluteFill style={{ background: C.carbon, fontFamily: FONT.body }}>
      {/* ---------- header ---------- */}
      <div style={{ position: "absolute", left: MARGIN, right: MARGIN, top: 56 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <OpLabel color={C.paper}>Two tests</OpLabel>
          <div style={{ ...dataText }}>both written down before either was run</div>
        </div>
      </div>
      <Rule x={MARGIN} y={96} w={1920 - MARGIN * 2} />

      {/* ================= TEST ONE, full weight then demoted ================= */}
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          top: interpolate(collapse, [0, 1], [BODY_Y, STRIP_Y]),
          right: MARGIN,
          opacity: one,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <OpLabel color={C.dim}>Test one</OpLabel>
          <div style={{ ...dataText, fontSize: 15, color: C.signal }}>frozen {TEST_ONE.frozenAt}</div>
        </div>
        <div
          style={{
            fontFamily: FONT.display,
            fontSize: interpolate(collapse, [0, 1], [44, 26]),
            fontWeight: 600,
            letterSpacing: "-0.015em",
            color: C.paper,
            marginTop: interpolate(collapse, [0, 1], [16, 8]),
          }}
        >
          {TEST_ONE.name}
        </div>
      </div>

      {/* the verdict, which stays on screen for the whole beat */}
      <div
        style={{
          position: "absolute",
          right: MARGIN,
          top: interpolate(collapse, [0, 1], [BODY_Y + 6, STRIP_Y + 4]),
          opacity: outcomeOne,
        }}
      >
        <Outcome word={TEST_ONE.outcome} size={interpolate(collapse, [0, 1], [62, 34])} show={1} />
      </div>

      {/* the two scoring bases, which is WHY it failed. Gone once test two arrives. */}
      <div style={{ opacity: 1 - collapse }}>
        {TEST_ONE.rows.map((r, i) => {
          const show = rise(frame, PHASE.rowsAt + i * PHASE.rowStagger, 14);
          return (
            <div
              key={r.basis}
              style={{
                position: "absolute",
                left: MARGIN,
                right: MARGIN,
                top: 356 + i * 96,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                borderBottom: `1px solid ${C.rule}`,
                paddingBottom: 18,
                opacity: show,
              }}
            >
              <div style={{ fontFamily: FONT.body, fontSize: 26, color: C.body }}>{r.basis}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                <div style={{ ...tabular, fontSize: 40, fontWeight: 500, color: C.paper, lineHeight: 1 }}>
                  {r.cells}
                </div>
                <div style={{ ...dataText, fontSize: 18, color: C.muted }}>{r.result}</div>
              </div>
            </div>
          );
        })}
        <div
          style={{
            position: "absolute",
            left: MARGIN,
            right: MARGIN,
            top: 588,
            opacity: noteOne,
            fontFamily: FONT.display,
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: "-0.015em",
            color: C.paper,
          }}
        >
          {TEST_ONE.note}
        </div>
      </div>

      {/* ================= TEST TWO ================= */}
      <div style={{ opacity: two }}>
        <Rule x={MARGIN} y={STRIP_Y + 78} w={1920 - MARGIN * 2} color={C.edge} />
        <div style={{ position: "absolute", left: MARGIN, top: STRIP_Y + 112 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <OpLabel color={C.dim}>Test two</OpLabel>
            <div style={{ ...dataText, fontSize: 15, color: C.signal }}>
              frozen {TEST_TWO.frozenAt} · run {TEST_TWO.ranAt}
            </div>
          </div>
          <div
            style={{
              fontFamily: FONT.display,
              fontSize: 44,
              fontWeight: 600,
              letterSpacing: "-0.015em",
              color: C.paper,
              marginTop: 16,
            }}
          >
            {TEST_TWO.name}
          </div>
        </div>
      </div>

      {/* two pools, the same trades through both */}
      <div style={{ opacity: pools }}>
        {[
          { title: "Pool A", sub: "enforcing a Tinjau PROTECT", lit: true },
          { title: "Pool B", sub: "no hook at all", lit: false },
        ].map((p, i) => (
          <div
            key={p.title}
            style={{
              position: "absolute",
              left: MARGIN + i * 440,
              top: 400,
              width: 400,
              height: 150,
              border: `1px solid ${p.lit ? C.signal : C.edge}`,
              background: C.elevated,
              padding: "20px 22px",
            }}
          >
            <div
              style={{
                fontFamily: FONT.display,
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "-0.015em",
                color: p.lit ? C.signal : C.paper,
              }}
            >
              {p.title}
            </div>
            <div style={{ fontFamily: FONT.body, fontSize: 17, color: C.body, marginTop: 10 }}>
              {p.sub}
            </div>
            <div style={{ ...dataText, fontSize: 13, color: C.dim, marginTop: 14 }}>
              THE SAME REPLAYED TRADES
            </div>
          </div>
        ))}

        <div style={{ position: "absolute", left: 1000, top: 400, width: 840 }}>
          <OpLabel>How much more the protected position retained</OpLabel>
          <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 20, opacity: result }}>
            <div style={{ ...tabular, fontSize: 68, fontWeight: 500, lineHeight: 1, color: C.paper }}>
              {TEST_TWO.marginBps}
            </div>
            <div style={{ ...dataText, fontSize: 20, color: C.muted }}>bps</div>
            <div style={{ marginLeft: 14 }}>
              <Outcome word={TEST_TWO.outcome} size={34} show={result} />
            </div>
          </div>
          <div style={{ ...dataText, fontSize: 14, color: C.dim, marginTop: 16, opacity: result }}>
            {TEST_TWO.marks}
          </div>
        </div>
      </div>

      {/* the sentence this result still does not buy */}
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          right: MARGIN,
          top: 690,
          opacity: prohibited,
          transform: `translateY(${(1 - prohibited) * 8}px)`,
        }}
      >
        <Rule x={0} y={0} w={1920 - MARGIN * 2} color={C.edge} />
        <div
          style={{
            fontFamily: FONT.display,
            fontSize: 38,
            fontWeight: 600,
            letterSpacing: "-0.015em",
            lineHeight: 1.2,
            color: C.paper,
            marginTop: 30,
          }}
        >
          {TEST_TWO.prohibited}
        </div>
        <div
          style={{
            fontFamily: FONT.body,
            fontSize: 20,
            lineHeight: 1.45,
            color: C.muted,
            marginTop: 16,
            maxWidth: 1500,
          }}
        >
          {TEST_TWO.conditional}
        </div>
      </div>

      {/* the runs that were thrown away */}
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          right: MARGIN,
          bottom: 130,
          opacity: attempts,
          fontFamily: FONT.body,
          fontSize: 15,
          color: C.dim,
        }}
      >
        {TEST_TWO.attempts} X Layer Testnet, chain 1952, builder-controlled pools. No mainnet action
        was taken or is authorised.
      </div>
    </AbsoluteFill>
  );
};
