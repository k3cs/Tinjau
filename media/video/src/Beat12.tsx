import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT, dataText, tabular } from "./theme";
import { CONTENT, Header, MARGIN, OpLabel, Rule, rise, useBeatFrame } from "./kit";

/**
 * Beat 12 — "The edges, then the address". 7s. The last shot.
 *
 * The edges are listed before the address on purpose: the film's whole claim to being
 * believed rests on having said the limits out loud rather than answering for them
 * later.
 *
 * The storyboard's super here said `"the feeds are replayed" has left this list`. That
 * is narrowed. `s5-2-live-news-intake.md` is explicit that an 8-K is `OFFICIAL`, not
 * `NEWS`, and that the live path *"does not give this project live third-party press"* —
 * and `known-limitations.md` still carries the SIMULATED social claim. So live SEC
 * filings are wired in, and press and social are not.
 */

const EDGES = [
  "Our pool is ours",
  "The tokens are test tokens",
  "Nobody outside uses this yet",
] as const;

const PHASE = { edgesAt: 8, edgeStagger: 22, cardAt: 96, addressAt: 122, commandAt: 148 } as const;

export const Beat12: React.FC = () => {
  const frame = useBeatFrame();

  const card = rise(frame, PHASE.cardAt, 16);
  const address = rise(frame, PHASE.addressAt, 14);
  const command = rise(frame, PHASE.commandAt, 14);

  return (
    <AbsoluteFill style={{ background: C.carbon, fontFamily: FONT.body }}>
      <Header label="The edges" detail="every limit is on the site, in full" />

      <div style={{ position: "absolute", left: MARGIN, top: 168, width: CONTENT }}>
        {EDGES.map((e, i) => {
          const show = rise(frame, PHASE.edgesAt + i * PHASE.edgeStagger, 14);
          return (
            <div
              key={e}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 22,
                padding: "20px 0",
                borderBottom: `1px solid ${C.rule}`,
                opacity: show,
                transform: `translateY(${(1 - show) * 8}px)`,
              }}
            >
              <div style={{ width: 22, height: 3, background: C.dim, flexShrink: 0 }} />
              <div
                style={{
                  fontFamily: FONT.display,
                  fontSize: 38,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: C.paper,
                }}
              >
                {e}
              </div>
            </div>
          );
        })}
        <div
          style={{
            fontFamily: FONT.body,
            fontSize: 18,
            lineHeight: 1.5,
            color: C.dim,
            marginTop: 22,
            opacity: rise(frame, PHASE.edgesAt + 3 * PHASE.edgeStagger, 14),
            maxWidth: 1400,
          }}
        >
          Live SEC filings are wired in. Third-party press is still replayed, and the one social claim
          is still ours.
        </div>
      </div>

      {/* the end card */}
      <Rule x={MARGIN} y={624} w={CONTENT} color={C.edge} />
      <div style={{ position: "absolute", left: MARGIN, top: 664, opacity: card }}>
        <div
          style={{
            fontFamily: FONT.display,
            fontSize: 96,
            fontWeight: 600,
            letterSpacing: "-0.035em",
            lineHeight: 1,
            color: C.paper,
          }}
        >
          tinjau.xyz
        </div>
      </div>

      <div style={{ position: "absolute", left: MARGIN, top: 800, opacity: address }}>
        <OpLabel>Read the record yourself</OpLabel>
        <div style={{ ...dataText, fontSize: 17, color: C.muted, marginTop: 14 }}>
          0x60062389a7AB08F0030FC06Adf9CE0C180537317 · X Layer Testnet · chain 1952
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: MARGIN,
          top: 874,
          opacity: command,
          background: C.elevated,
          border: `1px solid ${C.edge}`,
          padding: "14px 18px",
          ...dataText,
          fontSize: 17,
          color: C.signal,
        }}
      >
        node tools/risk-reader/tinjau-risk-read.mjs --chain-id 1952
      </div>

      <div
        style={{
          position: "absolute",
          right: MARGIN,
          top: 878,
          textAlign: "right",
          opacity: command,
        }}
      >
        <div style={{ ...tabular, fontSize: 34, fontWeight: 500, color: C.dim, lineHeight: 1 }}>594</div>
        <div style={{ ...dataText, fontSize: 13, color: C.dim, marginTop: 8 }}>SERVER TESTS</div>
      </div>
    </AbsoluteFill>
  );
};
