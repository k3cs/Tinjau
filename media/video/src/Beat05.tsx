import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT, dataText, tabular } from "./theme";
import { CONTENT, Disclosure, Header, MARGIN, OpLabel, Rule, Verdict, rise, useBeatFrame } from "./kit";

/**
 * Beat 05 — "The model never touches the money". 9s, act two.
 *
 * REWRITTEN AGAINST THE CODEBASE, not against the storyboard. The storyboard's version
 * of this beat — and beat 04's corner mark — credited the model with grouping the five
 * claims. It did not do that. `README.md` §9.10 is explicit: *"Speculation detection and
 * independence derivation are curated heuristics, not models."* S2.2 asked a model the
 * same three questions on the same input and published both answers side by side, and
 * says in its own words that *"the deterministic promotion engine remains the decider
 * and the model's output is not wired into it."*
 *
 * So the left column lists the one thing a model genuinely does on the path that
 * reaches the chain: the three-way parse of scenario B's real 8-K whose agreement
 * report supplies reason bit 18, posted in tx `0x7edfb15d…` at block 38,875,116. That
 * is a smaller claim than the storyboard made and it is the true one.
 */

const DOES = [
  "Parses the filing three times, independently",
  "Reports where the three parses agree, and where they do not",
  "Supplies one evidence bit to the decision engine",
] as const;

const CANNOT = [
  "Set the fee",
  "Choose a threshold",
  "Authorise anything",
  "Write to the chain",
] as const;

const PHASE = { doesAt: 12, cannotAt: 74, rowStagger: 16, proofAt: 168, verdictAt: 206 } as const;

const Column: React.FC<{
  x: number;
  label: string;
  accent: string;
  rows: readonly string[];
  startAt: number;
  frame: number;
}> = ({ x, label, accent, rows, startAt, frame }) => (
  <div style={{ position: "absolute", left: x, top: 176, width: 800 }}>
    <OpLabel color={accent}>{label}</OpLabel>
    <div style={{ marginTop: 22 }}>
      {rows.map((r, i) => {
        const show = rise(frame, startAt + i * PHASE.rowStagger, 14);
        return (
          <div
            key={r}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 18,
              padding: "18px 0",
              borderBottom: `1px solid ${C.rule}`,
              opacity: show,
              transform: `translateY(${(1 - show) * 8}px)`,
            }}
          >
            <div style={{ width: 20, height: 3, background: accent, marginTop: 14, flexShrink: 0 }} />
            <div
              style={{
                fontFamily: FONT.display,
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "-0.015em",
                lineHeight: 1.25,
                color: C.paper,
              }}
            >
              {r}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export const Beat05: React.FC = () => {
  const frame = useBeatFrame();
  const proof = rise(frame, PHASE.proofAt, 14);
  const verdict = rise(frame, PHASE.verdictAt, 14);

  return (
    <AbsoluteFill style={{ background: C.carbon, fontFamily: FONT.body }}>
      <Header label="What the model is allowed to do" detail="and what it is structurally unable to do" />

      <Rule x={960} y={176} h={440} color={C.edge} />

      <Column x={MARGIN} label="It does this" accent={C.signal} rows={DOES} startAt={PHASE.doesAt} frame={frame} />
      <Column
        x={1040}
        label="It can never do this"
        accent={C.watch}
        rows={CANNOT}
        startAt={PHASE.cannotAt}
        frame={frame}
      />

      {/* the one evidence bit it supplies, and where that landed */}
      <Rule x={MARGIN} y={664} w={CONTENT} color={C.edge} />
      <div style={{ position: "absolute", left: MARGIN, top: 698, opacity: proof }}>
        <OpLabel>The bit it supplied, posted on chain</OpLabel>
        <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 18 }}>
          <div style={{ ...tabular, fontSize: 46, fontWeight: 500, color: C.paper, lineHeight: 1 }}>
            3 of 3
          </div>
          <div style={{ ...dataText, fontSize: 17, color: C.muted }}>
            PARSES AGREED ON BOTH KEY FIELDS · REASON BIT 18 SET AND COMPUTED
          </div>
        </div>
        <div style={{ ...dataText, fontSize: 15, color: C.dim, marginTop: 14 }}>
          X Layer Testnet 1952 · tx 0x7edfb15d0a…c4fdd507 · block 38,875,116 · state WATCH, unchanged
        </div>
      </div>

      <Verdict top={856} show={verdict} size={36}>
        The contract decides. The model hands it one bit and stands back.
      </Verdict>

      <Disclosure>
        Grouping the five claims was done by curated heuristics, not by a model. A model was asked the
        same questions separately and both answers were published, including where they disagree.
      </Disclosure>
    </AbsoluteFill>
  );
};
