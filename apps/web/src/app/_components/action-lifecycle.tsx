import { formatDuration, shortHex } from "@/lib/risk/format";
import type { RiskActionView } from "@/lib/risk/model";

const lifecycle = ["PENDING", "APPLIED", "EXPIRED", "DECAYED"] as const;

export function ActionLifecycle({ action }: { action: RiskActionView }) {
  const currentIndex = lifecycle.indexOf(action.status as (typeof lifecycle)[number]);

  return (
    <section className="border-t border-edge p-6 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="data-label text-ink-muted">Action lifecycle</p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-display text-ink">
            {action.status === "NONE" ? "No action requested" : action.status}
          </h2>
        </div>
        <p className="font-data text-[11px] text-ink-muted">
          Maximum bounded course · {formatDuration(action.maximumDurationSec)}
        </p>
      </div>

      <ol className="mt-6 grid gap-px overflow-hidden rounded-md border border-edge bg-edge sm:grid-cols-4">
        {lifecycle.map((step, index) => {
          const reached = currentIndex >= index;
          return (
            <li key={step} className="bg-canvas px-4 py-4">
              <div className="flex items-center gap-2">
                <span aria-hidden className={`h-2 w-2 rounded-full ${reached ? "bg-signal" : "bg-edge-strong"}`} />
                <span className={`font-data text-[11px] ${reached ? "text-ink" : "text-ink-muted"}`}>{step}</span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-data text-[11px] text-ink-muted">
        <span>Authorized: {action.authorized ? "Yes" : "No"}</span>
        <span>Transaction: {action.txHash ? shortHex(action.txHash) : "None"}</span>
        {action.failureReason && <span className="text-protect">Failure: {action.failureReason}</span>}
      </div>
    </section>
  );
}
