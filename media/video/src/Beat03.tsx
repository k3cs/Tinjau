import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT, dataText, tabular } from "./theme";
import { CONTENT, Disclosure, Header, MARGIN, OpLabel, Rule, Verdict, rise, useBeatFrame } from "./kit";

/**
 * Beat 03 — "Two ways to get it wrong". 5s, act one, the last shot before the product.
 *
 * Two failures, side by side, neither of them Tinjau. The viewer should finish this
 * beat holding a question, which beat 04 then answers.
 *
 * Both numbers are the frozen envelope's own: 500 pips base, 20,000 pips cap.
 */

const PHASE = { leftAt: 8, rightAt: 44, verdictAt: 84 } as const;

const Failure: React.FC<{
  x: number;
  show: number;
  label: string;
  headline: string;
  fee: string;
  feeColor: string;
  cost: string;
}> = ({ x, show, label, headline, fee, feeColor, cost }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: 176,
      width: 840,
      opacity: show,
      transform: `translateY(${(1 - show) * 12}px)`,
    }}
  >
    <OpLabel color={C.dim}>{label}</OpLabel>
    <div
      style={{
        fontFamily: FONT.display,
        fontSize: 46,
        fontWeight: 600,
        letterSpacing: "-0.02em",
        lineHeight: 1.1,
        color: C.paper,
        marginTop: 18,
      }}
    >
      {headline}
    </div>
    <div style={{ ...tabular, fontSize: 92, fontWeight: 500, color: feeColor, lineHeight: 1, marginTop: 48 }}>
      {fee}
    </div>
    <div
      style={{
        fontFamily: FONT.body,
        fontSize: 21,
        lineHeight: 1.45,
        color: C.body,
        marginTop: 26,
        maxWidth: 760,
      }}
    >
      {cost}
    </div>
  </div>
);

export const Beat03: React.FC = () => {
  const frame = useBeatFrame();
  const left = rise(frame, PHASE.leftAt, 14);
  const right = rise(frame, PHASE.rightAt, 14);
  const verdict = rise(frame, PHASE.verdictAt, 14);

  return (
    <AbsoluteFill style={{ background: C.carbon, fontFamily: FONT.body }}>
      <Header label="Two ways for a pool to get this wrong" detail="neither of them is a system that reads" />

      <Rule x={960} y={176} h={560} />

      <Failure
        x={MARGIN}
        show={left}
        label="Ignore it"
        headline="The fee stays where it was"
        fee="0.05%"
        feeColor={C.paper}
        cost="Someone who read the report before you did takes the pool's inventory at yesterday's price."
      />

      <Failure
        x={1040}
        show={right}
        label="Believe it"
        headline="The fee jumps to the cap"
        fee="2.00%"
        feeColor={C.watch}
        cost="Everyone who trades pays forty times more, because of a report nobody has confirmed."
      />

      <Verdict top={790} show={verdict}>
        A pool can get this wrong twice over.
      </Verdict>

      <Disclosure>
        0.05% and 2.00% are the deployed envelope's own base fee and hard cap: 500 and 20,000 pips.
      </Disclosure>
    </AbsoluteFill>
  );
};
