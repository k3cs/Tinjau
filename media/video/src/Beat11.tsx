import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { C, FONT, dataText, tabular } from "./theme";
import { CONTENT, Disclosure, Header, MARGIN, OpLabel, Rule, Verdict, rise, useBeatFrame } from "./kit";

/**
 * Beat 11 — "The fault we found and handed back". 12s, act four.
 *
 * The only moment in two minutes where the project is useful to somebody who will never
 * use the product. `s6-2-xlayer-rpc-read-consistency.md`: X Layer's public testnet RPC
 * is load-balanced across nodes at different block heights, so a read issued right after
 * a confirmed write can be answered by a node that does not have the write yet and
 * returns the PREVIOUS value — well-formed, plausible, and stale.
 *
 * Measured 2026-08-21: the reads caught up after **2,519–2,746 ms**. The note is explicit
 * that the measuring loop polled at one-second intervals, so those are UPPER BOUNDS, not
 * the true lag, and the beat says so rather than quoting the number bare.
 */

const STEPS = [
  { at: 20, n: "1", text: "Send a transaction that changes the state", tone: "normal" },
  { at: 66, n: "2", text: "Wait for the receipt. status 0x1. It is on chain", tone: "normal" },
  { at: 112, n: "3", text: "Immediately read the same state at block “latest”", tone: "normal" },
  { at: 158, n: "4", text: "Get the OLD value back", tone: "wrong" },
] as const;

const PHASE = { waitAt: 214, waitTo: 286, causeAt: 250, verdictAt: 296 } as const;

export const Beat11: React.FC = () => {
  const frame = useBeatFrame();

  const wait = interpolate(frame, [PHASE.waitAt, PHASE.waitTo], [0, 2746], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const waitIn = rise(frame, PHASE.waitAt, 12);
  const cause = rise(frame, PHASE.causeAt, 16);
  const verdict = rise(frame, PHASE.verdictAt, 14);

  return (
    <AbsoluteFill style={{ background: C.carbon, fontFamily: FONT.body }}>
      <Header
        label="A fault in the network we built on"
        detail="testrpc.xlayer.tech · chain 1952 · measured 2026-08-21"
      />

      {/* the four steps, exactly as the note lists them */}
      <div style={{ position: "absolute", left: MARGIN, top: 176, width: 1080 }}>
        {STEPS.map((s) => {
          const show = rise(frame, s.at, 14);
          const wrong = s.tone === "wrong";
          return (
            <div
              key={s.n}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 24,
                padding: "22px 0",
                borderBottom: `1px solid ${C.rule}`,
                opacity: show,
                transform: `translateY(${(1 - show) * 8}px)`,
              }}
            >
              <div
                style={{
                  ...tabular,
                  fontSize: 22,
                  fontWeight: 500,
                  color: wrong ? C.watch : C.dim,
                  width: 30,
                  flexShrink: 0,
                  paddingTop: 6,
                }}
              >
                {s.n}
              </div>
              <div
                style={{
                  fontFamily: FONT.display,
                  fontSize: 30,
                  fontWeight: 600,
                  letterSpacing: "-0.015em",
                  lineHeight: 1.25,
                  color: wrong ? C.watch : C.paper,
                }}
              >
                {s.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* how long it took to agree with itself */}
      <div style={{ position: "absolute", left: 1300, top: 200, width: 540, opacity: waitIn }}>
        <OpLabel>How long until the read caught up</OpLabel>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 20 }}>
          <div style={{ ...tabular, fontSize: 88, fontWeight: 500, color: C.paper, lineHeight: 1 }}>
            {Math.round(wait).toLocaleString("en-US")}
          </div>
          <div style={{ ...dataText, fontSize: 22, color: C.muted }}>ms</div>
        </div>
        <div style={{ ...dataText, fontSize: 15, color: C.dim, marginTop: 16 }}>
          RANGE 2,519–2,746 MS · UPPER BOUNDS
        </div>
        <div style={{ fontFamily: FONT.body, fontSize: 17, lineHeight: 1.45, color: C.body, marginTop: 14 }}>
          The loop that measured it polled once a second, so the true lag is shorter than these
          figures. We published the bound, not a guess.
        </div>
      </div>

      {/* why, said plainly */}
      <Rule x={MARGIN} y={604} w={CONTENT} color={C.edge} />
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          top: 638,
          width: 1500,
          opacity: cause,
          fontFamily: FONT.body,
          fontSize: 23,
          lineHeight: 1.5,
          color: C.body,
        }}
      >
        Nothing reverted and nothing is wrong with the transaction. The public endpoint is
        load-balanced across nodes that are not all at the same block height, and one of them
        answered.
      </div>

      <Verdict top={760} show={verdict} size={36}>
        We measured it, wrote down how to reproduce it, and handed it back.
      </Verdict>

      <Disclosure>
        The write-up and the reproduction script need no credentials and no checkout of anything.
        Anyone building on X Layer can run it without using Tinjau at all.
      </Disclosure>
    </AbsoluteFill>
  );
};
