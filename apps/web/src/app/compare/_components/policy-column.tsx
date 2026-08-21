import { type PreregisteredPolicy } from "@/lib/comparison/preregistration";
import { behaviourFor, orUnavailable } from "@/lib/handoff/results";

export function PolicyColumn({
  policy,
  scenarioId,
}: {
  policy: PreregisteredPolicy;
  scenarioId: string;
}) {
  // One row per grid point this policy was run at, so a reader cannot see a
  // single threshold that happened to look good.
  const rows = behaviourFor(scenarioId).filter((row) => row.policyId === policy.id);
  return (
    <article className="bg-canvas p-5 sm:p-6">
      <div className="min-h-44">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-semibold tracking-display text-ink">{policy.name}</h2>
          {policy.id === "TINJAU" && (
            <span className="rounded border border-signal/50 bg-signal/10 px-2 py-1 font-data text-[10px] text-signal">
              Event-aware
            </span>
          )}
        </div>
        <p className="mt-5 font-data text-xs text-ink-secondary">{policy.input}</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{policy.evidenceAccess}</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{policy.behavior}</p>
        {policy.variants.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {policy.variants.map((variant) => (
              <span key={variant} className="rounded border border-edge-strong px-2 py-1 font-data text-[10px] text-ink-secondary">
                {variant}
              </span>
            ))}
          </div>
        )}
      </div>

      <dl className="mt-6 divide-y divide-edge border-y border-edge">
        {rows.map((row) => (
          <div key={`${row.policyId}-${row.variant}`} className="py-3">
            <dt className="flex items-baseline justify-between gap-3">
              <span className="font-data text-[11px] text-ink-muted">
                {row.variant || "single configuration"}
              </span>
              <span
                className={`font-data text-[11px] ${
                  row.triggerCount > 0 ? "text-watch-soft" : "text-ink-secondary"
                }`}
              >
                {row.triggerCount === 0 ? "did not fire" : `fired ${row.triggerCount}×`}
              </span>
            </dt>
            <dd className="mt-1 font-data text-[10px] text-ink-faint">
              max fee {orUnavailable(row.maxFeePips, "pips")} · held for{" "}
              {orUnavailable(row.protectionDurationSec, "s")}
            </dd>
          </div>
        ))}
      </dl>

    </article>
  );
}
