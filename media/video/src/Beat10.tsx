import React from "react";
import { AbsoluteFill, spring, useVideoConfig } from "remotion";
import { C, FONT, dataText, tabular } from "./theme";
import { CONTENT, Disclosure, Header, MARGIN, OpLabel, Rule, Verdict, rise, useBeatFrame } from "./kit";

/**
 * Beat 10 — "A different contract reads it". 12s, act four.
 *
 * The record on chain is the point at which this stops being one team's product. A
 * second contract — `contracts/src/examples/ExampleRiskConsumer.sol` — reads
 * `effectiveState` and decides for itself. It copies two files and compiles; the
 * registry's write functions are not even in the interface it declares, so a consumer
 * that cannot name `postAssessment` cannot call it.
 *
 * THE SUPER IS NOT OPTIONAL. `INTEGRATION.md` opens with it and the storyboard makes it
 * a hard rule: this example was written by Tinjau. It proves the integration is cheap.
 * It does not prove anyone wants it, and README §10 lists "external adoption inferred
 * from a reference consumer this project built itself" among the claims never made.
 */

const COUNTERS = [
  { n: "0", label: "PERMISSIONS TO ASK FOR" },
  { n: "0", label: "API KEYS" },
  { n: "0", label: "SERVERS OF OURS IN THE PATH" },
] as const;

const PHASE = { registryAt: 10, traceAt: 62, consumerAt: 92, callAt: 140, countersAt: 196, counterStagger: 20, verdictAt: 280 } as const;

export const Beat10: React.FC = () => {
  const frame = useBeatFrame();
  const { fps } = useVideoConfig();

  const registry = rise(frame, PHASE.registryAt, 16);
  const trace = rise(frame, PHASE.traceAt, 24);
  const consumer = spring({ frame: frame - PHASE.consumerAt, fps, config: { damping: 200 } });
  const call = rise(frame, PHASE.callAt, 16);
  const verdict = rise(frame, PHASE.verdictAt, 14);

  return (
    <AbsoluteFill style={{ background: C.carbon, fontFamily: FONT.body }}>
      <Header label="Where it stops being ours" detail="X Layer Testnet · chain 1952" />

      {/* the record, alone */}
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          top: 190,
          width: 640,
          border: `1px solid ${C.signal}`,
          background: C.elevated,
          padding: "26px 28px",
          opacity: registry,
        }}
      >
        <OpLabel color={C.signal}>The record on chain</OpLabel>
        <div
          style={{
            fontFamily: FONT.display,
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: C.paper,
            marginTop: 16,
          }}
        >
          TinjauRiskRegistry
        </div>
        <div style={{ ...dataText, fontSize: 15, color: C.muted, marginTop: 14 }}>
          0x60062389a7AB08F0030FC06Adf9CE0C180537317
        </div>
      </div>

      {/* the trace out of it, into something that is not ours */}
      <svg style={{ position: "absolute", inset: 0 }} width={1920} height={1080} fill="none">
        <path
          d={`M ${MARGIN + 640} 290 L ${MARGIN + 740} 290 L ${MARGIN + 740} 290 L 1000 290`}
          stroke={C.signal}
          strokeWidth={2}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - trace}
        />
      </svg>

      {/* a contract that is not part of the product */}
      <div
        style={{
          position: "absolute",
          left: 1000,
          top: 190,
          width: 840,
          border: `1px dashed ${C.proof}`,
          padding: "26px 28px",
          opacity: consumer,
          transform: `translateY(${(1 - consumer) * 12}px)`,
        }}
      >
        <OpLabel color={C.proof}>Somebody else&rsquo;s contract</OpLabel>
        <div
          style={{
            fontFamily: FONT.display,
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: C.paper,
            marginTop: 16,
          }}
        >
          ExampleRiskConsumer
        </div>
        <div
          style={{
            ...dataText,
            fontSize: 17,
            color: C.paper,
            marginTop: 18,
            opacity: call,
            background: C.elevated,
            padding: "12px 14px",
          }}
        >
          effectiveState(asset, poolId)
          <br />
          <span style={{ color: C.muted }}>→ (state, fee, endsAt)</span>
        </div>
        <div style={{ fontFamily: FONT.body, fontSize: 17, color: C.body, marginTop: 16, opacity: call }}>
          Two files copied in. It decides on its own terms.
        </div>
      </div>

      {/* what it needed from us */}
      <Rule x={MARGIN} y={560} w={CONTENT} color={C.edge} />
      {COUNTERS.map((c, i) => {
        const show = rise(frame, PHASE.countersAt + i * PHASE.counterStagger, 14);
        return (
          <div
            key={c.label}
            style={{
              position: "absolute",
              left: MARGIN + i * 600,
              top: 600,
              width: 560,
              opacity: show,
              transform: `translateY(${(1 - show) * 10}px)`,
            }}
          >
            <div style={{ ...tabular, fontSize: 92, fontWeight: 500, color: C.signal, lineHeight: 1 }}>
              {c.n}
            </div>
            <div style={{ ...dataText, fontSize: 15, color: C.muted, marginTop: 14 }}>{c.label}</div>
          </div>
        );
      })}

      <Verdict top={784} show={verdict} size={36}>
        No permission, no key, nothing of ours anywhere in the path.
      </Verdict>

      <Disclosure>
        We wrote this example ourselves. It shows the integration is small — it does not show that
        anyone has adopted it. Nobody outside this project is known to consume the registry.
      </Disclosure>
    </AbsoluteFill>
  );
};
