import Link from "next/link";

import { behaviourFor, orUnavailable, type BehaviourRow } from "@/lib/handoff/results";

const FP_TONE: Record<string, string> = {
  FALSE_POSITIVE: "text-protect-soft",
  TRUE_NEGATIVE: "text-normal-soft",
  NO_ECONOMIC_ROW: "text-ink-faint",
};

/**
 * What each policy actually did on this scenario.
 *
 * This used to be a placeholder grid reading "Pending handoff" in every cell.
 * The benchmark has since run, and leaving it as a placeholder would have read
 * as "results are still coming" (the flattering reading, given how they came
 * out. These are the measured values, `null` included.
 *
 * Only behaviour is shown here. The economics flip sign between the two metric
 * bases, so they are never shown as a single number; `/compare` carries both.
 */
export function ComparisonMatrix({ scenarioId }: { scenarioId: string }) {
  const rows = behaviourFor(scenarioId);

  return (
    <section className="rounded-lg border border-edge bg-canvas p-5 sm:p-6">
      <h2 className="font-display text-heading-md text-ink">What each policy did</h2>
      <p className="mt-2 max-w-[70ch] text-body-sm text-ink-muted">
        Measured behaviour over identical trades. Unavailable values stay text, never zero. The
        profit-and-loss comparison is not shown as a single number because it reverses direction
        between the two metric bases:{" "}
        <Link href="/compare" className="text-signal underline">
          both are published side by side
        </Link>
        .
      </p>

      <div
        className="mt-6 overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Policy behaviour; scroll horizontally on narrow screens"
      >
        <table className="w-full min-w-[46rem] border-collapse text-left">
          <thead className="font-data text-[10px] uppercase tracking-[0.06em] text-ink-muted">
            <tr className="border-b border-edge">
              <th scope="col" className="py-3 pr-4 font-medium">Policy</th>
              <th scope="col" className="py-3 pr-4 font-medium">Fired</th>
              <th scope="col" className="py-3 pr-4 font-medium">Max fee</th>
              <th scope="col" className="py-3 pr-4 font-medium">Latency</th>
              <th scope="col" className="py-3 pr-4 font-medium">Duration</th>
              <th scope="col" className="py-3 font-medium">Warranted?</th>
            </tr>
          </thead>
          <tbody className="font-data text-[11px]">
            {rows.map((row) => (
              <Row key={`${row.policyId}-${row.variant}`} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Row({ row }: { row: BehaviourRow }) {
  return (
    <tr className="border-b border-edge align-top">
      <th scope="row" className="py-3 pr-4 font-medium text-ink-secondary">
        {row.policyName}
        {row.variant ? (
          <span className="mt-1 block text-[10px] font-normal text-ink-faint">{row.variant}</span>
        ) : null}
      </th>
      <td className="py-3 pr-4 text-ink-secondary tabular">
        {row.triggerCount === 0 ? "No" : `${row.triggerCount}×`}
      </td>
      <td className="py-3 pr-4 text-ink-secondary tabular">
        {orUnavailable(row.maxFeePips, "pips")}
      </td>
      <td className="py-3 pr-4 text-ink-secondary tabular">
        {orUnavailable(row.actionLatencySec, "s")}
      </td>
      <td className="py-3 pr-4 text-ink-secondary tabular">
        {orUnavailable(row.protectionDurationSec, "s")}
      </td>
      <td className={`py-3 ${FP_TONE[row.falsePositive] ?? "text-ink-muted"}`}>
        {row.falsePositive === "FALSE_POSITIVE"
          ? "No (acted anyway)"
          : row.falsePositive === "TRUE_NEGATIVE"
            ? "Correctly held"
            : "No economic row"}
      </td>
    </tr>
  );
}
