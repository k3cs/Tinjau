import { DiagramFigure, LABEL } from "./figure";

/**
 * Class strings are written out per rung rather than interpolated. Tailwind
 * generates CSS by reading these files as text, so `fill-${tone}/15` produces a
 * class that exists in the DOM and nowhere in the stylesheet.
 */
const LADDER = [
  {
    state: "PROTECT",
    plain: "Raise the fee",
    y: 56,
    fill: "fill-protect/15 stroke-protect",
    text: "fill-protect",
  },
  {
    state: "WATCH",
    plain: "Watch closely",
    y: 152,
    fill: "fill-watch/15 stroke-watch",
    text: "fill-watch-soft",
  },
  {
    state: "NORMAL",
    plain: "Do nothing",
    y: 232,
    fill: "fill-normal/15 stroke-normal",
    text: "fill-normal",
  },
] as const;

/**
 * A masthead and the story it is carrying are two different facts, and the
 * second one is what makes this drawing work. "CNBC, reporting a Wall Street
 * Journal story" is one string in the record but two lines here: who published
 * it, and whose story it actually is. Drawn as one line it overflowed its box
 * and collided with the funnel label; drawn as two it also happens to show the
 * reader why five boxes collapse to one origin, which the single line never did.
 */
function splitAttribution(label: string): { outlet: string; via: string | null } {
  const comma = label.indexOf(",");
  if (comma === -1) return { outlet: label, via: null };
  return { outlet: label.slice(0, comma), via: label.slice(comma + 1).trim() };
}

/**
 * Rumour containment, drawn as a funnel and a ceiling.
 *
 * Two mechanisms, one picture. On the left, five reports collapse into the
 * number of origins that actually survive the duplicate and syndication checks,
 * because reprints of one story are one source no matter how many mastheads
 * carry it. On the right, the state ladder, with a bar the collapsed evidence
 * cannot pass.
 *
 * `usableOrigins` and `state` are passed in from the scenario record rather than
 * written here, so this drawing cannot say something the record does not.
 */
export function ContainmentDiagram({
  sources,
  usableOrigins,
  state,
}: {
  sources: Array<{ label: string; sourceClass: string }>;
  usableOrigins: number;
  state: string;
}) {
  const reachedIndex = LADDER.findIndex((rung) => rung.state === state);
  const reached = LADDER[reachedIndex] ?? LADDER[1];
  const blocked = LADDER[Math.max(0, reachedIndex - 1)];

  const rowY = (i: number) => 44 + i * 46;
  const boxWidth = 246;
  const funnelX = 322;
  const funnelY = rowY(2);
  const ladderX = 412;
  const ladderWidth = 248;

  // The ceiling sits in the gap between the blocked rung's box and the reached
  // rung's box, so neither the bar nor its caption can land on top of a label.
  const barY = (blocked.y + 20 + (reached.y - 20)) / 2;

  return (
    <DiagramFigure
      title={`${sources.length} reports, ${usableOrigins} origin, capped at ${state}`}
      description={`On the left, ${sources.length} separate reports of the same story, each showing which outlet published it and whose story it is carrying. Lines from each converge on a single node labelled ${usableOrigins} origin, because reprints and syndications of one story count once. On the right, a three-rung ladder: do nothing, watch closely, raise the fee. The path climbs to ${state} and stops at a solid bar below ${blocked.state}, which rumour-only evidence cannot cross.`}
      status={{ kind: "RULE", text: "The rule, applied to the negative-control scenario as recorded." }}
      viewBox="0 0 660 282"
    >
      <text x="0" y="14" className={`${LABEL} fill-ink-faint`}>
        What arrived
      </text>

      {sources.map((source, i) => {
        const { outlet, via } = splitAttribution(source.label);
        const y = rowY(i);
        const isRumour = source.sourceClass === "RUMOR";
        return (
          <g key={source.label} className="animate-fade-right" style={{ animationDelay: `${i * 70}ms` }}>
            <rect
              x="0"
              y={y - 19}
              width={boxWidth}
              height="38"
              rx="4"
              className={isRumour ? "fill-watch/10 stroke-watch/50" : "fill-surface stroke-edge"}
              strokeWidth="1"
            />
            <text
              x="12"
              y={via ? y - 3 : y + 4}
              className="font-body text-[12px] fill-ink-secondary"
            >
              {outlet}
            </text>
            {via ? (
              <text x="12" y={y + 11} className="font-data text-[10px] tracking-[0.04em] fill-ink-faint">
                {via}
              </text>
            ) : null}
            <path
              d={`M${boxWidth} ${y} C ${boxWidth + 42} ${y}, ${funnelX - 60} ${funnelY}, ${funnelX - 22} ${funnelY}`}
              fill="none"
              className={isRumour ? "stroke-watch/60" : "stroke-edge-strong"}
              strokeWidth="1.25"
            />
          </g>
        );
      })}

      {/* The collapse. */}
      <g className="animate-fade-up" style={{ animationDelay: "480ms" }}>
        <text x={funnelX} y={funnelY - 40} textAnchor="middle" className={`${LABEL} fill-ink-faint`}>
          One story
        </text>
        <circle cx={funnelX} cy={funnelY} r="21" className="fill-canvas stroke-signal" strokeWidth="1.5" />
        <text
          x={funnelX}
          y={funnelY + 6}
          textAnchor="middle"
          className="font-data text-[16px] tabular fill-signal"
        >
          {usableOrigins}
        </text>
        <text x={funnelX} y={funnelY + 42} textAnchor="middle" className={`${LABEL} fill-ink-muted`}>
          origin
        </text>
      </g>

      {/* The ladder. Each rung carries the plain reading beside the state name,
          because PROTECT and WATCH mean nothing to a first-time reader. */}
      {LADDER.map((rung, i) => {
        const isReached = rung.state === reached.state;
        const isAbove = i < reachedIndex;
        return (
          <g key={rung.state} className="animate-fade-up" style={{ animationDelay: `${620 + i * 90}ms` }}>
            <rect
              x={ladderX}
              y={rung.y - 20}
              width={ladderWidth}
              height="40"
              rx="4"
              className={isReached ? rung.fill : "fill-transparent stroke-edge"}
              strokeWidth={isReached ? 1.75 : 1}
              strokeDasharray={isAbove ? "4 5" : undefined}
            />
            <text
              x={ladderX + 16}
              y={rung.y - 1}
              className={`font-data text-[13px] tracking-[0.06em] ${
                isReached ? rung.text : isAbove ? "fill-ink-disabled" : "fill-ink-muted"
              }`}
            >
              {rung.state}
            </text>
            <text
              x={ladderX + 16}
              y={rung.y + 13}
              className={`font-body text-[11px] ${isAbove ? "fill-ink-disabled" : "fill-ink-faint"}`}
            >
              {rung.plain}
            </text>
            {isReached ? (
              <text
                x={ladderX + ladderWidth - 16}
                y={rung.y + 5}
                textAnchor="end"
                className={`${LABEL} fill-ink`}
              >
                Reached
              </text>
            ) : null}
          </g>
        );
      })}

      {/* The bar. This is the containment. It sits in the gap between the two
          rung boxes, and its caption sits above it in that same gap. */}
      <g className="animate-fade-up" style={{ animationDelay: "980ms" }}>
        <text
          x={ladderX + ladderWidth}
          y={barY - 9}
          textAnchor="end"
          className={`${LABEL} fill-protect-soft`}
        >
          A rumour cannot cross this
        </text>
        <line
          x1={ladderX}
          y1={barY}
          x2={ladderX + ladderWidth}
          y2={barY}
          className="stroke-protect"
          strokeWidth="4"
        />
      </g>

      {/* The climb. */}
      <path
        d={`M${funnelX + 25} ${funnelY} H${ladderX - 34} V${reached.y} H${ladderX - 6}`}
        fill="none"
        className="animate-fade-right stroke-signal"
        strokeWidth="2"
        style={{ animationDelay: "820ms" }}
      />
    </DiagramFigure>
  );
}
