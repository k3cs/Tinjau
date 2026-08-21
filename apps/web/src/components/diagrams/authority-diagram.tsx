import { DiagramFigure, LABEL } from "./figure";

/**
 * The authority boundary, drawn as a circuit instead of asserted as a slogan.
 *
 * "AI proposes, the contract decides" is the sentence every project in this
 * category writes, and a sentence cannot show that the refused path is a real
 * path. Here it is: two arrows leave the gate, one reaches the pool and one is
 * stopped by a bar it cannot cross. The AI box is dashed and the contract box is
 * solid, which is the same distinction a second time, in weight.
 *
 * No numbers. The envelope constants belong on `/risk`, where they are read from
 * the handoff along with the note saying which envelope they came from.
 */
export function AuthorityDiagram() {
  return (
    <DiagramFigure
      title="The model proposes. The contract decides."
      description="A proposal leaves a dashed box labelled Model and enters a gate labelled Rules, which checks who said it, how many genuinely independent sources there are, whether the evidence is still fresh, and whether the market agrees. Two arrows leave the gate. One reaches a solid box labelled Contract, which holds a fee ceiling, a maximum duration, a cooldown, and an automatic return to the base fee. The other arrow is stopped by a bar before it reaches anything, marked refused. The model is never on the far side of the gate."
      status={{ kind: "RULE", text: "How authority is split. Enforced in the contract, not in the copy." }}
      viewBox="0 0 660 262"
    >
      {/* The proposer. Dashed, because nothing it says is binding on its own. */}
      <g className="animate-fade-right" style={{ animationDelay: "80ms" }}>
        <rect
          x="1"
          y="86"
          width="146"
          height="76"
          rx="8"
          fill="none"
          className="stroke-edge-strong"
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />
        <text x="18" y="114" className={`${LABEL} fill-ink-faint`}>
          Model
        </text>
        <text x="18" y="136" className="font-body text-[15px] font-medium fill-ink">
          Proposes
        </text>
      </g>

      <path
        d="M147 124 H232"
        className="animate-fade-right stroke-signal"
        strokeWidth="2"
        markerEnd="url(#tinjau-arrow-signal)"
        style={{ animationDelay: "260ms" }}
      />

      {/* The gate. Four checks, named, because "policy" alone means nothing. */}
      <g className="animate-fade-up" style={{ animationDelay: "380ms" }}>
        <rect
          x="240"
          y="40"
          width="164"
          height="168"
          rx="8"
          className="fill-surface stroke-edge"
          strokeWidth="1.5"
        />
        <text x="258" y="68" className={`${LABEL} fill-signal`}>
          Rules
        </text>
        <text x="258" y="92" className="font-body text-[15px] font-medium fill-ink">
          Decide
        </text>
        {["Who said it", "How many sources", "Still fresh", "Market agrees"].map(
          (check, i) => (
            <g key={check}>
              <line
                x1="258"
                y1={116 + i * 22}
                x2="266"
                y2={116 + i * 22}
                className="stroke-signal"
                strokeWidth="1.5"
              />
              <text x="274" y={120 + i * 22} className="font-body text-[12px] fill-ink-muted">
                {check}
              </text>
            </g>
          ),
        )}
      </g>

      {/* Allowed: reaches the pool. */}
      <path
        d="M404 88 H492"
        className="animate-fade-right stroke-signal"
        strokeWidth="2"
        markerEnd="url(#tinjau-arrow-signal)"
        style={{ animationDelay: "620ms" }}
      />
      <text x="416" y="78" className={`${LABEL} fill-signal`}>
        Allowed
      </text>

      {/* Refused: a real path, stopped by a real bar. */}
      <g className="animate-stop-short" style={{ animationDelay: "760ms" }}>
        <path d="M404 168 H466" className="stroke-protect" strokeWidth="2" />
        <line x1="472" y1="146" x2="472" y2="190" className="stroke-protect" strokeWidth="5" />
        <text x="416" y="158" className={`${LABEL} fill-protect-soft`}>
          Refused
        </text>
        <text x="404" y="206" className="font-body text-[12px] fill-ink-muted">
          Rumour only, one origin, stale,
        </text>
        <text x="404" y="224" className="font-body text-[12px] fill-ink-muted">
          or the market disagrees.
        </text>
      </g>

      {/* The enforcer. Solid, and holding four limits nothing upstream can move. */}
      <g className="animate-fade-up" style={{ animationDelay: "880ms" }}>
        <rect
          x="500"
          y="40"
          width="158"
          height="104"
          rx="8"
          className="fill-canvas stroke-signal"
          strokeWidth="1.5"
        />
        <text x="518" y="68" className={`${LABEL} fill-signal`}>
          Contract
        </text>
        <text x="518" y="92" className="font-body text-[15px] font-medium fill-ink">
          Holds the limits
        </text>
        <text x="518" y="114" className="font-body text-[12px] fill-ink-muted">
          One fee. A ceiling.
        </text>
        <text x="518" y="132" className="font-body text-[12px] fill-ink-muted">
          A clock it cannot reset.
        </text>
      </g>

      <defs>
        <marker
          id="tinjau-arrow-signal"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0 0 L10 5 L0 10 z" className="fill-signal" />
        </marker>
      </defs>
    </DiagramFigure>
  );
}
