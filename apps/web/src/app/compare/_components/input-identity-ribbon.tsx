import { DataModeLabel } from "@/components/data-mode-label";
import { formatUtc } from "@/lib/risk/format";
import type { PreregisteredScenario } from "@/lib/comparison/preregistration";

export function InputIdentityRibbon({ scenario }: { scenario: PreregisteredScenario }) {
  const fields = [
    ["Anchor", formatUtc(scenario.anchorAt)],
    ["Replay blocks", `${scenario.fromBlock}–${scenario.toBlock}`],
    ["Observed swaps", scenario.observedSwaps.toLocaleString("en-US")],
    ["Economic row", scenario.carriesEconomicRow ? "Required" : "Null by pre-registration"],
  ] as const;

  return (
    <section aria-label="Shared comparison input" className="overflow-hidden rounded-lg border border-edge bg-canvas">
      <div className="flex flex-col gap-3 border-b border-edge bg-canvas-soft px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="data-label text-ink-muted">Input identity proof</p>
          <p className="mt-1 text-sm text-ink-secondary">All three policies receive the same trades, timestamps, window, and starting state.</p>
        </div>
        <div className="flex items-center gap-2">
          <DataModeLabel mode="OBSERVED" />
          <DataModeLabel mode="REPLAY" />
        </div>
      </div>
      <dl className="grid divide-y divide-edge sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
        {fields.map(([label, value]) => (
          <div key={label} className="px-4 py-3">
            <dt className="data-label text-ink-muted">{label}</dt>
            <dd className="mt-1 font-data text-xs text-ink-secondary">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
