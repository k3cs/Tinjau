import { DiagramFigure, LABEL } from "./figure";
import { EXPOSURE, EXPOSURE_EVENTS_SORTED, formatUsdSigned } from "@/lib/product/exposure";

/**
 * One dot per filing, so the sample size cannot be hidden by a percentage.
 *
 * "78% of filings left the LP on the wrong side" is a true sentence that reads
 * like a population statistic. It is 25 out of 32. Drawing all 32 marks says the
 * proportion and the smallness of n in the same glance, which a bar labelled 78%
 * actively conceals.
 *
 * Loss and gain are encoded as filled against hollow, not as two hues. The
 * obvious choice was the site's red and green, and the palette validator rejects
 * that pair outright: their deuteranopia separation is dE 4.7, far below the
 * floor, so a red/green reader would see one undifferentiated field of dots.
 * Filled against hollow survives any colour vision, greyscale, and print.
 */
export function ExposureUnitDiagram() {
  const events = EXPOSURE_EVENTS_SORTED;
  const { lossCount, gainCount } = EXPOSURE.headline;

  const dotY = 92;
  const startX = 22;
  const step = 20;
  const lastLossX = startX + (lossCount - 1) * step;
  const firstGainX = startX + lossCount * step;
  const endX = startX + (events.length - 1) * step;
  const worst = events[0];

  return (
    <DiagramFigure
      title={`${lossCount} of ${events.length} filings left liquidity providers on the wrong side of the first trade`}
      description={`A strip of ${events.length} dots, one for each filing measured, ordered worst first. ${lossCount} are filled, marking the filings where liquidity providers lost money on the first trade after the filing. ${gainCount} are hollow, marking the ones where they gained. The worst single event cost ${formatUsdSigned(worst.lpUsd)} on a ${worst.ticker} ${worst.form}.`}
      status={{
        kind: "MEASURED",
        text: `${events.length} real filings against ${EXPOSURE.scope.pools} real X Layer pools, measured ${EXPOSURE.measuredOn}. No Tinjau hook was attached to any of them.`,
      }}
      viewBox="0 0 660 186"
    >
      <text x="0" y="16" className={`${LABEL} fill-ink-faint`}>
        One dot is one filing
      </text>

      {/* The worst event, called out where the eye lands first. */}
      <text x={startX - 4} y="44" className="font-body text-[12px] fill-watch-soft">
        {`Worst: ${worst.ticker} ${worst.form}, ${formatUsdSigned(worst.lpUsd)}`}
      </text>
      <path
        d={`M${startX} 54 V${dotY - 14}`}
        className="stroke-watch/60"
        strokeWidth="1"
        strokeDasharray="3 3"
      />

      {events.map((event, i) => {
        const cx = startX + i * step;
        const lost = event.lpUsd < 0;
        return (
          <g key={`${event.ticker}-${event.form}-${i}`}>
            {/* Native tooltip: no JavaScript, works in a server component. */}
            <title>{`${event.ticker} ${event.form}: ${formatUsdSigned(event.lpUsd)} on a ${formatUsdSigned(event.notionalUsd)} trade`}</title>
            <circle
              cx={cx}
              cy={dotY}
              r="7.5"
              className={
                lost ? "fill-watch stroke-watch" : "fill-transparent stroke-edge-strong"
              }
              strokeWidth="1.5"
            />
          </g>
        );
      })}

      {/* Brackets, so the split is countable rather than asserted. */}
      <path
        d={`M${startX - 9} ${dotY + 20} v6 H${lastLossX + 9} v-6`}
        fill="none"
        className="stroke-watch/70"
        strokeWidth="1.25"
      />
      <text x={(startX + lastLossX) / 2} y={dotY + 44} textAnchor="middle" className="font-body text-[13px] font-medium fill-ink">
        {`${lossCount} lost money`}
      </text>

      <path
        d={`M${firstGainX - 9} ${dotY + 20} v6 H${endX + 9} v-6`}
        fill="none"
        className="stroke-edge-strong"
        strokeWidth="1.25"
      />
      <text x={(firstGainX + endX) / 2} y={dotY + 44} textAnchor="middle" className="font-body text-[13px] fill-ink-muted">
        {`${gainCount} gained`}
      </text>

      <text x="0" y="180" className="font-body text-[11px] fill-ink-faint">
        Measured on third-party pools. This is the size of the problem, not a result Tinjau produced.
      </text>
    </DiagramFigure>
  );
}
