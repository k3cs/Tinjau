import React from "react";
import { AbsoluteFill, interpolate, spring, useVideoConfig } from "remotion";
import { C, FIGURE, FONT, dataText, opLabel, tabular } from "./theme";
import { useBeatFrame } from "./kit";
import {
  BUS_Y,
  CARD_PAD,
  DECISION,
  DIVIDER_X,
  LEDGER_Y,
  MARGIN,
  ON_CHAIN,
  ORIGIN,
  ORIGIN_ENTRY_FRACTIONS,
  ORIGIN_GROUPS,
  RIGHT_TEXT,
  SYNDICATIONS,
  UNRECOGNISED,
  feePercent,
  shortHash,
  type Claim,
} from "./data";

/**
 * Beat 04 — "Five claims, one usable source".
 *
 * Five claims fill the screen looking like five confirmations of a $250bn story. By
 * the end there is one origin the system will count and the pool's fee has not moved.
 * THREE different rules produce that, and the frame keeps them apart, because
 * collapsing them into one story would misdescribe the system:
 *
 *   - Two outlets name the Journal in their own copy, so they fold into it.
 *   - One outlet relays a report it never names, so its origin cannot be recognised.
 *   - One claim was written by this project as a safety test, so it can corroborate
 *     nothing at all.
 *
 * The second of those was wrong in the first cut — DataCenterDynamics was drawn as a
 * third syndication with a connector into the Journal, an edge the evidence graph
 * explicitly does not contain. See the header of `data.ts` for the full correction.
 *
 * COMPOSITION rules, all from review:
 *
 *   - The readout panel is drawn from frame 1 with `—` placeholders and its figures
 *     resolve in place, so nothing reflows and no region is ever dead black.
 *   - One baseline for the claims, one size for peer figures, one geometry (orthogonal
 *     elbows, never curves).
 *   - One left edge per column: text under a card aligns to that card's text.
 *   - Typography per `theme.ts` — nothing thin, translucent, or widely tracked.
 *   - No unexplained abbreviation. Every outlet is written out in full.
 */

const PHASE = {
  ingestStart: 0,
  ingestStagger: 9,
  scanStart: 52,
  scanEnd: 116,
  collapseStart: 122,
  collapseStagger: 16,
  collapseDraw: 44,
  /** The two unrecognised claims are ruled out only after the collapse has resolved. */
  excludeAt: 204,
  ledgerAt: 216,
  countAt: 222,
  decideAt: 258,
  verdictAt: 302,
} as const;

const FIELD = { left: MARGIN, right: 1860 };

/** Vertical anchors for the readout panel, kept here so the band stays rigid. */
const PANEL = { rule: 620, top: 620, bottom: 782, verdictRule: 800, verdictTop: 818 };

/** The fee meter, in pips, mapped onto a fixed pixel run. */
const METER_W = 520;
const meterX = (pips: number) =>
  ((pips - DECISION.feeChargedPips) / (DECISION.maxFeePips - DECISION.feeChargedPips)) * METER_W;

/**
 * Down from the card, across the bus, down into the origin. Orthogonal, because the
 * rest of the frame is.
 */
function connectorPath(sat: Claim, index: number): string {
  const sx = sat.x + sat.w / 2;
  const sy = sat.y + sat.h;
  const ex = ORIGIN.x + ORIGIN.w * ORIGIN_ENTRY_FRACTIONS[index];
  return `M ${sx} ${sy} L ${sx} ${BUS_Y} L ${ex} ${BUS_Y} L ${ex} ${ORIGIN.y}`;
}

function scanReachesX(x: number): number {
  const t = (x - FIELD.left) / (FIELD.right - FIELD.left);
  return PHASE.scanStart + t * (PHASE.scanEnd - PHASE.scanStart);
}

const rise = (frame: number, at: number, span = 12) =>
  interpolate(frame, [at, at + span], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const OpLabel: React.FC<{ children: React.ReactNode; color?: string }> = ({
  children,
  color = C.muted,
}) => <div style={{ ...opLabel, color }}>{children}</div>;

/** A rule drawn as a rule, at the one weight brand.md allows. */
const Rule: React.FC<{ x: number; y: number; w?: number; h?: number; color?: string }> = ({
  x,
  y,
  w = 1,
  h = 1,
  color = C.rule,
}) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: color }} />
);

type CardRole = "syndication" | "origin" | "unrecognised";

const EvidenceCard: React.FC<{ claim: Claim; index: number; role: CardRole; order: number }> = ({
  claim,
  index,
  role,
  order,
}) => {
  const frame = useBeatFrame();
  const { fps } = useVideoConfig();
  const isOrigin = role === "origin";
  const isUnrecognised = role === "unrecognised";

  const enter = spring({
    frame: frame - (PHASE.ingestStart + order * PHASE.ingestStagger),
    fps,
    config: { damping: 200 },
  });

  // A syndication declares its attribution as the scan rule passes it. The origin and
  // the two unrecognised claims declare once the collapse starts, so for seventy frames
  // two cards point at something the frame has not named yet.
  const attributionAt = isOrigin || isUnrecognised
    ? PHASE.collapseStart
    : scanReachesX(claim.x + claim.w / 2);
  const attribution = rise(frame, attributionAt, 10);

  // A syndication is spent once its connector lands. An unrecognised claim is spent
  // when the exclusion rule strikes it. The origin is never spent.
  const spentAt = isUnrecognised
    ? PHASE.excludeAt + index * 10 + 8
    : PHASE.collapseStart + index * PHASE.collapseStagger + PHASE.collapseDraw;
  const spent = isOrigin ? false : frame >= spentAt + 8;

  const lit = isOrigin && frame >= PHASE.collapseStart + 8;
  const struck = isUnrecognised ? rise(frame, PHASE.excludeAt + index * 10, 14) : 0;

  // State is carried entirely by solid colour swaps. Nothing here is translucent at
  // rest — a semi-transparent glyph over black is the exact look the review rejected.
  const border = isOrigin
    ? lit
      ? C.signal
      : C.edge
    : isUnrecognised && struck > 0.5
      ? C.watch
      : spent
        ? C.edgeSpent
        : C.edge;

  const outletColor = isOrigin && lit ? C.signal : spent ? C.ghost : C.paper;
  const classColor = isUnrecognised ? C.watch : spent ? C.ghost : C.muted;
  const attributionColor = isOrigin
    ? C.signal
    : isUnrecognised
      ? C.watch
      : spent
        ? C.dim
        : C.muted;

  const fragmentStyle: React.CSSProperties = {
    fontFamily: FONT.body,
    fontSize: isOrigin ? 19 : 17,
    fontWeight: 400,
    lineHeight: 1.4,
    color: spent && !isUnrecognised ? C.ghost : C.body,
  };

  return (
    <div
      style={{
        position: "absolute",
        left: claim.x,
        top: claim.y,
        width: claim.w,
        height: claim.h,
        background: spent ? C.spent : C.elevated,
        border: `1px solid ${border}`,
        padding: `20px ${CARD_PAD}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        opacity: enter,
        transform: `translateY(${(1 - enter) * 14}px)`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
        <div
          style={{
            fontFamily: FONT.display,
            fontSize: isOrigin ? 28 : 23,
            fontWeight: 600,
            letterSpacing: "-0.015em",
            lineHeight: 1.1,
            color: outletColor,
          }}
        >
          {claim.outlet}
        </div>
        <div
          style={{
            ...tabular,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.04em",
            padding: "4px 8px",
            border: `1px solid ${isUnrecognised ? C.watch : spent ? C.edgeSpent : C.edge}`,
            color: classColor,
            whiteSpace: "nowrap",
          }}
        >
          {claim.sourceClass}
        </div>
      </div>

      {/*
        The exclusion is drawn through the claim itself rather than across the whole
        card. A card-wide rule at 50% landed on whatever text sat there and read as a
        collision. A single overlaid rule was no better on a three-line claim: it
        struck the middle line and left the rest standing. So the struck copy is a
        real `line-through` on the same text, wiped in left to right with a clip, which
        crosses every line the claim actually occupies.
      */}
      <div style={{ position: "relative", alignSelf: "stretch" }}>
        <div style={fragmentStyle}>{claim.fragment}</div>
        {isUnrecognised && struck > 0 ? (
          <div
            style={{
              ...fragmentStyle,
              position: "absolute",
              inset: 0,
              color: C.ghost,
              textDecoration: "line-through",
              textDecorationColor: C.watch,
              textDecorationThickness: 2,
              clipPath: `inset(0 ${(1 - struck) * 100}% 0 0)`,
            }}
          >
            {claim.fragment}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: attribution }}>
        <div style={{ width: 16, height: 2, background: attributionColor, flexShrink: 0 }} />
        <div
          style={{
            ...tabular,
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.01em",
            color: attributionColor,
          }}
        >
          {claim.attribution}
        </div>
      </div>
    </div>
  );
};

/**
 * One cell of the readout panel. Drawn from frame 1 with its label in place, so the
 * band is composed before it has anything to say and nothing shifts when it does.
 */
const ReadoutCell: React.FC<{ left: number; width: number; label: string; children: React.ReactNode }> = ({
  left,
  width,
  label,
  children,
}) => (
  <div style={{ position: "absolute", left, top: PANEL.top + 18, width }}>
    <OpLabel>{label}</OpLabel>
    <div style={{ marginTop: 22 }}>{children}</div>
  </div>
);

/** The em dash a cell shows before it has a reading. Solid, at figure size. */
const Pending: React.FC = () => (
  <div style={{ ...tabular, fontSize: FIGURE, fontWeight: 500, color: C.edge, lineHeight: 1 }}>—</div>
);

export const Beat04: React.FC = () => {
  const frame = useBeatFrame();
  const { fps } = useVideoConfig();

  const scanX = interpolate(frame, [PHASE.scanStart, PHASE.scanEnd], [FIELD.left, FIELD.right], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scanVisible = frame >= PHASE.scanStart && frame <= PHASE.scanEnd + 5;

  const claimsCounted = Array.from({ length: DECISION.claimCount }).filter(
    (_, i) => frame >= PHASE.ingestStart + i * PHASE.ingestStagger + 4,
  ).length;

  const dividerIn = rise(frame, PHASE.collapseStart - 8, 16);
  const ledger = rise(frame, PHASE.ledgerAt, 14);
  const corrected = rise(frame, PHASE.countAt, 12);
  const decided = spring({ frame: frame - PHASE.decideAt, fps, config: { damping: 200 } });
  const meter = rise(frame, PHASE.decideAt + 12, 32);
  const verdict = rise(frame, PHASE.verdictAt, 14);

  const hasDecided = frame >= PHASE.decideAt;
  const capX = meterX(DECISION.confidenceCapPips);

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
          <OpLabel color={C.paper}>Evidence</OpLabel>
          <div style={{ ...dataText }}>scenario A · decided {DECISION.decidedAt}</div>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <OpLabel>Claims</OpLabel>
          <div style={{ ...tabular, fontSize: 20, fontWeight: 500, color: C.paper, lineHeight: 1 }}>
            {String(claimsCounted).padStart(2, "0")}
          </div>
        </div>
      </div>
      <Rule x={MARGIN} y={96} w={1920 - MARGIN * 2} />

      {/* ---------- the two mechanisms, kept apart by a rule ---------- */}
      <Rule x={DIVIDER_X} y={142} h={490 * dividerIn} />
      <div style={{ position: "absolute", left: RIGHT_TEXT.x, top: 138, opacity: dividerIn }}>
        <OpLabel>Origin could not be recognised</OpLabel>
      </div>

      {/* ---------- connectors, under the cards ---------- */}
      <svg style={{ position: "absolute", inset: 0 }} width={1920} height={1080} viewBox="0 0 1920 1080" fill="none">
        {SYNDICATIONS.map((sat, i) => {
          const start = PHASE.collapseStart + i * PHASE.collapseStagger;
          const p = rise(frame, start, PHASE.collapseDraw);
          if (p <= 0) return null;
          return (
            <path
              key={sat.id}
              d={connectorPath(sat, i)}
              stroke={C.signal}
              strokeWidth={2}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - p}
            />
          );
        })}
      </svg>

      {SYNDICATIONS.map((claim, i) => (
        <EvidenceCard key={claim.id} claim={claim} index={i} order={i} role="syndication" />
      ))}
      {UNRECOGNISED.map((claim, i) => (
        <EvidenceCard key={claim.id} claim={claim} index={i} order={i + 2} role="unrecognised" />
      ))}
      <EvidenceCard claim={ORIGIN} index={0} order={4} role="origin" />

      {/* ---------- origin ledger ---------- */}
      <div
        style={{
          position: "absolute",
          left: RIGHT_TEXT.x,
          top: LEDGER_Y,
          width: RIGHT_TEXT.w,
          opacity: ledger,
        }}
      >
        <OpLabel>Where the claims came from</OpLabel>
        <div style={{ marginTop: 14, borderTop: `1px solid ${C.rule}` }}>
          {ORIGIN_GROUPS.map((g) => (
            <div
              key={g.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
                padding: "11px 0",
                borderBottom: `1px solid ${C.rule}`,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: FONT.display,
                    fontSize: 19,
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.2,
                    color: g.usable ? C.paper : C.dim,
                  }}
                >
                  {g.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT.body,
                    fontSize: 15,
                    fontWeight: 400,
                    lineHeight: 1.3,
                    color: C.dim,
                    marginTop: 4,
                  }}
                >
                  {g.detail}
                </div>
              </div>
              <div
                style={{
                  ...tabular,
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: "0.03em",
                  whiteSpace: "nowrap",
                  color: g.usable ? C.signal : C.watch,
                }}
              >
                {g.verdict}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- the reading pass ---------- */}
      {scanVisible ? (
        <div
          style={{
            position: "absolute",
            left: scanX,
            top: 140,
            width: 2,
            height: 490,
            background: C.signal,
            opacity: interpolate(frame, [PHASE.scanEnd - 7, PHASE.scanEnd + 5], [1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        />
      ) : null}

      {/* ---------- readout panel: drawn from frame 1, filled in place ---------- */}
      <Rule x={MARGIN} y={PANEL.rule} w={1920 - MARGIN * 2} color={C.edge} />
      <Rule x={640} y={PANEL.top} h={PANEL.bottom - PANEL.top} />
      <Rule x={1240} y={PANEL.top} h={PANEL.bottom - PANEL.top} />

      <ReadoutCell left={MARGIN} width={520} label="Claims → usable sources">
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ position: "relative" }}>
            <div
              style={{
                ...tabular,
                fontSize: FIGURE,
                fontWeight: 500,
                lineHeight: 1,
                color: claimsCounted === 0 ? C.edge : corrected > 0 ? C.ghost : C.paper,
              }}
            >
              {/* no reading yet is an em dash, never a zero — zero would be a claim */}
              {claimsCounted === 0 ? "—" : claimsCounted}
            </div>
            <div
              style={{
                position: "absolute",
                left: -6,
                top: "50%",
                height: 3,
                width: corrected * 56,
                background: C.watch,
              }}
            />
          </div>
          <div style={{ ...tabular, fontSize: 30, fontWeight: 500, color: C.dim, opacity: corrected }}>→</div>
          <div
            style={{
              ...tabular,
              fontSize: FIGURE,
              fontWeight: 500,
              lineHeight: 1,
              color: C.signal,
              opacity: corrected,
            }}
          >
            {DECISION.usableOrigins}
          </div>
        </div>
        <div style={{ ...dataText, fontSize: 14, color: C.dim, marginTop: 14, opacity: corrected }}>
          2 named the Journal · 2 could not be traced
        </div>
      </ReadoutCell>

      <ReadoutCell left={680} width={520} label="Risk state">
        {hasDecided ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 16,
              border: `2px solid ${C.watch}`,
              padding: "10px 20px",
              opacity: decided,
              transform: `translateY(${(1 - decided) * 10}px)`,
            }}
          >
            <div style={{ width: 14, height: 14, background: C.watch }} />
            <div
              style={{
                fontFamily: FONT.display,
                fontSize: 46,
                fontWeight: 600,
                color: C.watch,
                letterSpacing: "-0.01em",
                lineHeight: 1,
              }}
            >
              {DECISION.state}
            </div>
          </div>
        ) : (
          <Pending />
        )}
        <div style={{ ...dataText, fontSize: 14, color: C.dim, marginTop: 14, opacity: decided }}>
          Confidence {DECISION.confidence} · one source cannot authorise more
        </div>
      </ReadoutCell>

      <ReadoutCell left={1280} width={560} label="Pool fee">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ ...tabular, fontSize: FIGURE, fontWeight: 500, lineHeight: 1, color: C.paper }}>
            {feePercent(DECISION.feeChargedPips)}
          </div>
          <div
            style={{
              ...tabular,
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "0.04em",
              color: C.signal,
              border: `1px solid ${C.signal}`,
              padding: "5px 9px",
              opacity: decided,
            }}
          >
            UNCHANGED
          </div>
        </div>

        {/*
          The two limits it moved inside and did not use. 0.70% is the most a
          LOW-confidence reading may ever ask for (`derived.policyTargetFee`); 2.00% is
          the contract's hard ceiling (`action.maxFee`).
        */}
        <div style={{ position: "relative", marginTop: 22, width: METER_W, height: 18 }}>
          <div
            style={{ position: "absolute", left: 0, top: 8, height: 2, width: METER_W * meter, background: C.edge }}
          />
          <div style={{ position: "absolute", left: 0, top: 0, width: 4, height: 18, background: C.paper }} />
          <div
            style={{
              position: "absolute",
              left: capX - 1,
              top: 2,
              width: 2,
              height: 14,
              background: C.dim,
              opacity: meter,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: METER_W - 2,
              top: 2,
              width: 2,
              height: 14,
              background: C.dim,
              opacity: meter,
            }}
          />
        </div>
        <div style={{ position: "relative", height: 20, marginTop: 8 }}>
          <div style={{ ...dataText, fontSize: 13, color: C.muted, position: "absolute", left: 0 }}>
            BASE {feePercent(DECISION.feeChargedPips)}
          </div>
          <div
            style={{
              ...dataText,
              fontSize: 13,
              color: C.dim,
              position: "absolute",
              left: capX + 8,
              opacity: meter,
            }}
          >
            MOST IT COULD ASK {feePercent(DECISION.confidenceCapPips)}
          </div>
          <div
            style={{ ...dataText, fontSize: 13, color: C.dim, position: "absolute", right: 0, opacity: meter }}
          >
            MAX {feePercent(DECISION.maxFeePips)}
          </div>
        </div>
      </ReadoutCell>

      {/* ---------- verdict, in the voice brand.md specifies ---------- */}
      <Rule x={MARGIN} y={PANEL.verdictRule} w={1920 - MARGIN * 2} />
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          right: MARGIN,
          top: PANEL.verdictTop,
          opacity: verdict,
          transform: `translateY(${(1 - verdict) * 8}px)`,
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
          Five claims, one usable source. A rumour raises attention. It cannot raise the fee.
        </div>
      </div>

      {/* ---------- what a stranger can check for themselves ---------- */}
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          right: MARGIN,
          bottom: 190,
          ...dataText,
          fontSize: 14,
          color: C.dim,
          opacity: verdict,
        }}
      >
        {ON_CHAIN.networkLabel} · chain {ON_CHAIN.chainId} · assessment {shortHash(ON_CHAIN.assessmentTx)} · swap{" "}
        {shortHash(ON_CHAIN.swapTx)} · block {ON_CHAIN.swapBlock.toLocaleString("en-US")} · fee read from the pool's
        own swap event
      </div>

      {/* ---------- the disclosure, legible rather than buried ---------- */}
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          right: MARGIN,
          bottom: 130,
          fontFamily: FONT.body,
          fontSize: 15,
          fontWeight: 400,
          color: C.dim,
        }}
      >
        Replayed from the sources named. The social claim is simulated, written by this project as a containment
        test. Posted to a builder-controlled pool on X Layer Testnet.
      </div>
    </AbsoluteFill>
  );
};
