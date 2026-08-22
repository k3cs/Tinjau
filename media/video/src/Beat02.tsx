import React from "react";
import { AbsoluteFill, spring, useVideoConfig } from "remotion";
import { C, FONT, dataText, tabular } from "./theme";
import { Disclosure, Header, MARGIN, OpLabel, Verdict, rise, useBeatFrame } from "./kit";

/**
 * Beat 02 — "The report goes around". 9s, act one.
 *
 * Five claims land one after another and the screen gets crowded and convincing. That
 * is the whole job: the viewer should feel the weight of five reports BEFORE beat 04
 * takes it apart. Nothing is analysed here and no verdict is offered.
 *
 * The five are the frozen scenario A set, in publication order. The social claim is
 * marked `SIMULATED` from the moment it appears — it is the one claim this project
 * wrote itself, and it never appears unlabelled anywhere.
 */

const CLAIMS = [
  {
    id: "social",
    outlet: "Social post",
    line: "hearing NVDA is on the hook for a quarter trillion of OpenAI datacenter debt guarantees",
    tag: "SIMULATED",
    x: 96,
    y: 210,
    w: 560,
  },
  {
    id: "wsj",
    outlet: "The Wall Street Journal",
    line: "Nvidia is in talks to provide roughly $250 billion in financing guarantees for OpenAI",
    tag: "NEWS",
    x: 700,
    y: 258,
    w: 560,
  },
  {
    id: "cnbc",
    outlet: "CNBC",
    line: "Nvidia and OpenAI in talks for up to $250 billion backstop",
    tag: "NEWS",
    x: 1268,
    y: 210,
    w: 556,
  },
  {
    id: "dcd",
    outlet: "DataCenterDynamics",
    line: "Nvidia considers $250bn backstop for OpenAI's planned 10GW Ohio data center — report",
    tag: "NEWS",
    x: 400,
    y: 440,
    w: 560,
  },
  {
    id: "tnw",
    outlet: "The Next Web",
    line: "Nvidia in talks to provide roughly $250 billion in financing guarantees for OpenAI",
    tag: "NEWS",
    x: 1000,
    y: 488,
    w: 560,
  },
] as const;

const PHASE = { first: 14, stagger: 30, verdictAt: 200 } as const;

export const Beat02: React.FC = () => {
  const frame = useBeatFrame();
  const { fps } = useVideoConfig();

  const landed = CLAIMS.filter((_, i) => frame >= PHASE.first + i * PHASE.stagger + 4).length;
  const verdict = rise(frame, PHASE.verdictAt, 14);

  return (
    <AbsoluteFill style={{ background: C.carbon, fontFamily: FONT.body }}>
      <Header
        label="One evening"
        detail="27 July 2026"
        right={
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <OpLabel>Reports</OpLabel>
            <div style={{ ...tabular, fontSize: 20, fontWeight: 500, color: C.paper, lineHeight: 1 }}>
              {String(landed).padStart(2, "0")}
            </div>
          </div>
        }
      />

      {CLAIMS.map((c, i) => {
        const enter = spring({
          frame: frame - (PHASE.first + i * PHASE.stagger),
          fps,
          config: { damping: 200 },
        });
        const simulated = c.tag === "SIMULATED";
        return (
          <div
            key={c.id}
            style={{
              position: "absolute",
              left: c.x,
              top: c.y,
              width: c.w,
              background: C.elevated,
              border: `1px solid ${simulated ? C.watch : C.edge}`,
              padding: "20px 22px",
              opacity: enter,
              transform: `translateY(${(1 - enter) * 22}px)`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
              <div
                style={{
                  fontFamily: FONT.display,
                  fontSize: 24,
                  fontWeight: 600,
                  letterSpacing: "-0.015em",
                  color: C.paper,
                }}
              >
                {c.outlet}
              </div>
              <div
                style={{
                  ...tabular,
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  padding: "4px 8px",
                  border: `1px solid ${simulated ? C.watch : C.edge}`,
                  color: simulated ? C.watch : C.muted,
                  whiteSpace: "nowrap",
                }}
              >
                {c.tag}
              </div>
            </div>
            <div
              style={{
                fontFamily: FONT.body,
                fontSize: 17,
                lineHeight: 1.4,
                color: C.body,
                marginTop: 14,
              }}
            >
              {c.line}
            </div>
          </div>
        );
      })}

      <Verdict top={720} show={verdict}>
        Five reports in one evening. All of them saying two hundred and fifty billion.
      </Verdict>

      <Disclosure>
        Replayed from the sources named, in publication order. The social claim is simulated, written
        by this project as a containment test.
      </Disclosure>
    </AbsoluteFill>
  );
};
