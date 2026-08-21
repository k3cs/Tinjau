import { DiagramFigure, LABEL } from "./figure";
import { EXPOSURE, formatUsdSigned } from "@/lib/product/exposure";

/**
 * The finding the whole product rests on, drawn from the market rather than
 * from the design.
 *
 * A policy that only watches price cannot tell a material filing from a routine
 * one, because at the moment of the trade they look alike. This says they do not
 * cost alike: the median material filing costs an order of magnitude more than
 * the median routine one. That gap is the entire reason for reading the document
 * instead of only the chart.
 *
 * One hue, because this is one measure across two groups, not two categories.
 * The routine bar is nearly invisible next to the material one, which is the
 * result rather than a rendering problem, so both carry a direct label.
 */
export function FilingTypeDiagram() {
  const [material, routine] = EXPOSURE.byForm;
  const maxAbs = Math.max(...EXPOSURE.byForm.map((f) => Math.abs(f.medianUsd)));
  const barX = 214;
  const maxW = 344;
  const width = (value: number) => Math.max(3, (Math.abs(value) / maxAbs) * maxW);
  const ratio = Math.abs(material.medianUsd) / Math.abs(routine.medianUsd);

  const ROWS = [
    { ...material, y: 58 },
    { ...routine, y: 132 },
  ];

  return (
    <DiagramFigure
      title="A material filing costs the pool an order of magnitude more than a routine one"
      description={`Two bars showing the median cost to liquidity providers of the first trade after a filing. An 8-K, a material event, has a median of ${formatUsdSigned(material.medianUsd)} across ${material.n} events. A Form 4, a routine insider transaction, has a median of ${formatUsdSigned(routine.medianUsd)} across ${routine.n} events. The material filing costs roughly ${Math.round(ratio)} times more.`}
      status={{
        kind: "MEASURED",
        text: `Median across ${EXPOSURE.headline.eventCount} filings. Both figures are cents-scale on pools this thin; the ratio is the finding, not the amount.`,
      }}
      viewBox="0 0 660 206"
    >
      <text x="0" y="18" className={`${LABEL} fill-ink-faint`}>
        Median cost of the first trade after the filing
      </text>

      {ROWS.map((row) => {
        const w = width(row.medianUsd);
        return (
          <g key={row.form} className="animate-fade-right">
            <text x="0" y={row.y + 6} className="font-body text-[15px] font-medium fill-ink">
              {row.form}
            </text>
            <text x="0" y={row.y + 24} className="font-body text-[11px] fill-ink-faint">
              {row.plain}
            </text>
            <text x="0" y={row.y + 40} className="font-data text-[10px] tracking-[0.06em] fill-ink-disabled">
              {`n = ${row.n}`}
            </text>

            <rect
              x={barX}
              y={row.y - 12}
              width={w}
              height="28"
              rx="4"
              className="fill-watch/80 stroke-watch"
              strokeWidth="1"
            />
            <text
              x={barX + w + 12}
              y={row.y + 7}
              className="font-data text-[14px] tabular fill-ink"
            >
              {formatUsdSigned(row.medianUsd)}
            </text>
          </g>
        );
      })}

      {/* The ratio, which is the part that survives the pools being small. */}
      <text x={barX} y="196" className="font-body text-[12px] fill-ink-muted">
        {`Roughly ${Math.round(ratio)} times the cost, on filings a price-only policy cannot tell apart.`}
      </text>
    </DiagramFigure>
  );
}
