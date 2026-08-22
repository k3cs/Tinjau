import React from "react";
import { AbsoluteFill, spring, useVideoConfig } from "remotion";
import { C, FONT, dataText, tabular } from "./theme";
import { CONTENT, Disclosure, Header, MARGIN, OpLabel, Rule, Verdict, rise, useBeatFrame } from "./kit";

/**
 * Beat 06 — "Three weeks later, the real number". 8s, act two.
 *
 * The rumour said two hundred and fifty billion. Three weeks later NVIDIA filed the
 * 8-K, and the figure in it is quoted verbatim below from `claim-b-001`:
 *
 *   "NVIDIA's aggregate payment obligation is cumulatively capped at $105 billion for
 *    its initial commitment under the Agreements."
 *
 * 250 / 105 = 2.38, so "more than twice too big" is the safe reading and the one the
 * verdict uses. Both dates are the claims' own `publishedAt` values.
 */

const PHASE = { rumourAt: 8, wipeAt: 54, filingAt: 96, ratioAt: 168, verdictAt: 196 } as const;

export const Beat06: React.FC = () => {
  const frame = useBeatFrame();
  const { fps } = useVideoConfig();

  const rumour = rise(frame, PHASE.rumourAt, 14);
  const wipe = rise(frame, PHASE.wipeAt, 26);
  const filing = spring({ frame: frame - PHASE.filingAt, fps, config: { damping: 200 } });
  const struck = rise(frame, PHASE.filingAt + 20, 16);
  const ratio = rise(frame, PHASE.ratioAt, 14);
  const verdict = rise(frame, PHASE.verdictAt, 14);

  return (
    <AbsoluteFill style={{ background: C.carbon, fontFamily: FONT.body }}>
      <Header label="Three weeks later" detail="the company files the real thing" />

      {/* the calendar moving, as a rule that draws between two dates */}
      <div style={{ position: "absolute", left: MARGIN, right: MARGIN, top: 160 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ ...dataText, fontSize: 17, color: C.dim, opacity: rumour }}>
            2026-07-27 · REPORTED
          </div>
          <div style={{ ...dataText, fontSize: 17, color: C.signal, opacity: wipe }}>
            2026-08-17 · FILED
          </div>
        </div>
        <div style={{ position: "relative", height: 2, marginTop: 14, background: C.rule }}>
          <div style={{ position: "absolute", left: 0, top: 0, height: 2, width: `${wipe * 100}%`, background: C.signal }} />
        </div>
      </div>

      {/* what was said */}
      <div style={{ position: "absolute", left: MARGIN, top: 268, width: 800, opacity: rumour }}>
        <OpLabel color={C.dim}>What the reports said</OpLabel>
        <div style={{ position: "relative", display: "inline-block", marginTop: 22 }}>
          <div style={{ ...tabular, fontSize: 104, fontWeight: 500, lineHeight: 1, color: struck > 0.5 ? C.ghost : C.paper }}>
            $250bn
          </div>
          <div
            style={{
              position: "absolute",
              left: -8,
              right: -8,
              top: "52%",
              height: 4,
              background: C.watch,
              transform: `scaleX(${struck})`,
              transformOrigin: "left center",
            }}
          />
        </div>
        <div style={{ fontFamily: FONT.body, fontSize: 19, color: C.dim, marginTop: 20, maxWidth: 700 }}>
          Five reports, one usable source, nothing signed and nobody confirming.
        </div>
      </div>

      {/* what was filed */}
      <div
        style={{
          position: "absolute",
          left: 1000,
          top: 268,
          width: 840,
          opacity: filing,
          transform: `translateY(${(1 - filing) * 14}px)`,
        }}
      >
        <OpLabel color={C.signal}>What the filing says</OpLabel>
        <div style={{ ...tabular, fontSize: 104, fontWeight: 500, lineHeight: 1, color: C.paper, marginTop: 22 }}>
          $105bn
        </div>
        <div
          style={{
            fontFamily: FONT.body,
            fontSize: 19,
            lineHeight: 1.45,
            color: C.body,
            marginTop: 20,
            borderLeft: `2px solid ${C.edge}`,
            paddingLeft: 18,
          }}
        >
          “NVIDIA’s aggregate payment obligation is cumulatively capped at $105 billion for its
          initial commitment under the Agreements.”
        </div>
      </div>

      <Rule x={MARGIN} y={636} w={CONTENT} color={C.edge} />
      <div style={{ position: "absolute", left: MARGIN, top: 670, opacity: ratio }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
          <div style={{ ...tabular, fontSize: 62, fontWeight: 500, color: C.watch, lineHeight: 1 }}>
            2.4×
          </div>
          <div style={{ ...dataText, fontSize: 17, color: C.muted }}>
            WHAT THE REPORTS SAID, OVER WHAT WAS FILED
          </div>
        </div>
      </div>

      <Verdict top={790} show={verdict}>
        The report going round was more than twice too big.
      </Verdict>

      <Disclosure>
        Item 1.01 of NVIDIA&rsquo;s 8-K, accession 0001045810-26-000069, quoted verbatim. Both dates are
        the claims&rsquo; own published timestamps.
      </Disclosure>
    </AbsoluteFill>
  );
};
