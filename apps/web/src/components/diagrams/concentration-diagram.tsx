import { DiagramFigure, LABEL } from "./figure";
import { EXPOSURE, formatUsdSigned } from "@/lib/product/exposure";

/**
 * Where the damage actually sits, and why the median is the wrong number to
 * quote on its own.
 *
 * The median event costs six cents, which sounds like nothing and is nothing.
 * Two events out of thirty-two carry three quarters of the entire dollar total,
 * and both are driven by first trades roughly ten times the usual size. That is
 * the shape of a tail risk: harmless on average, and the average is not what an
 * LP experiences on the day it happens.
 *
 * It is also the honest form of the growth argument. The cost scales with the
 * size of the trade that arrives first, so the number that matters is not what
 * these pools lost at their current depth.
 */
export function ConcentrationDiagram() {
  const { concentration, headline } = EXPOSURE;
  const share = concentration.shareOfTotal;
  const namedCount = concentration.events.length;
  const otherCount = headline.eventCount - namedCount;

  const barY = 74;
  const barH = 40;
  const full = 660;
  const gap = 3;
  const w1 = Math.round(full * share) - gap;
  const w2 = full - w1 - gap;

  return (
    <DiagramFigure
      title={`${namedCount} of ${headline.eventCount} events carry ${Math.round(share * 100)}% of the total cost`}
      description={`A single horizontal bar split in two. The larger segment, ${Math.round(share * 100)} percent of the total dollar cost, comes from just ${namedCount} of the ${headline.eventCount} events. The smaller segment is the remaining ${otherCount} events combined. Both large events were driven by first trades roughly ten times the usual size.`}
      status={{
        kind: "MEASURED",
        text: "The median event is immaterial against pool TVL. The total is not a per-event effect.",
      }}
      viewBox="0 0 660 196"
    >
      <text x="0" y="18" className={`${LABEL} fill-ink-faint`}>
        Share of the total cost across all {headline.eventCount} events
      </text>
      <text x="0" y="46" className="font-body text-[14px] font-medium fill-ink">
        Almost all of it came from two days.
      </text>

      <rect x="0" y={barY} width={w1} height={barH} rx="4" className="fill-watch/80 stroke-watch" strokeWidth="1" />
      <rect
        x={w1 + gap}
        y={barY}
        width={w2}
        height={barH}
        rx="4"
        className="fill-surface stroke-edge-strong"
        strokeWidth="1"
      />

      <text x="14" y={barY + 26} className="font-data text-[15px] tabular fill-canvas">
        {`${Math.round(share * 100)}%`}
      </text>

      <text x="0" y={barY + barH + 26} className="font-body text-[13px] font-medium fill-ink">
        {`${namedCount} events`}
      </text>
      <text x="0" y={barY + barH + 44} className="font-body text-[11px] fill-ink-faint">
        {concentration.events
          .map((event) => `${event.ticker} ${event.form} ${formatUsdSigned(event.lpUsd)}`)
          .join("   ·   ")}
      </text>

      <text
        x={full}
        y={barY + barH + 26}
        textAnchor="end"
        className="font-body text-[13px] fill-ink-muted"
      >
        {`the other ${otherCount}`}
      </text>

      <text x="0" y="190" className="font-body text-[11px] fill-ink-faint">
        Both were first trades roughly ten times the usual size, not unusually large price moves.
      </text>
    </DiagramFigure>
  );
}
