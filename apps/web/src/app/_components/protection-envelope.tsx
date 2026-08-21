import { UnavailableValue } from "@/components/unavailable-value";
import { formatDuration, formatFee } from "@/lib/risk/format";
import type { RiskActionView } from "@/lib/risk/model";

export function ProtectionEnvelope({ action }: { action: RiskActionView }) {
  const base = Number(action.baseFee);
  const max = Number(action.maxFee);
  const applied = action.appliedFee === null ? null : Number(action.appliedFee);
  const position =
    applied !== null && Number.isFinite(base) && Number.isFinite(max) && max > base
      ? Math.min(100, Math.max(0, ((applied - base) / (max - base)) * 100))
      : 0;

  return (
    <section className="p-6 sm:p-8 xl:p-10">
      <p className="data-label text-ink-muted">Protection envelope</p>
      <div className="mt-6 grid grid-cols-2 gap-5">
        <div>
          <p className="font-display text-3xl font-semibold tracking-display text-ink">
            {formatFee(action.baseFee)}
          </p>
          <p className="mt-1 font-data text-[11px] text-ink-muted">Baseline · {action.baseFee}</p>
        </div>
        <div>
          <p className="font-display text-3xl font-semibold tracking-display text-protect">
            {formatFee(action.maxFee)}
          </p>
          <p className="mt-1 font-data text-[11px] text-ink-muted">Maximum · {action.maxFee}</p>
        </div>
      </div>

      <div className="mt-7" aria-label="Fee range from baseline to maximum">
        <div className="relative h-2 bg-edge">
          <span className="absolute inset-y-0 left-0 bg-signal" style={{ width: `${position}%` }} />
          {applied !== null && (
            <span
              aria-hidden
              className="absolute top-1/2 h-4 w-1 -translate-y-1/2 bg-ink"
              style={{ left: `calc(${position}% - 2px)` }}
            />
          )}
        </div>
        <div className="mt-2 flex justify-between font-data text-[10px] text-ink-muted">
          <span>Base</span>
          <span>Hard ceiling</span>
        </div>
      </div>

      <dl className="mt-6 divide-y divide-edge border-y border-edge font-data text-xs">
        <div className="flex items-center justify-between gap-4 py-2.5">
          <dt className="text-ink-muted">Requested</dt>
          <dd className="text-ink-secondary">
            {action.requestedFee === null ? <UnavailableValue label="Not requested" /> : formatFee(action.requestedFee)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-2.5">
          <dt className="text-ink-muted">Applied</dt>
          <dd className="text-ink-secondary">
            {action.appliedFee === null ? <UnavailableValue label="Not applied" /> : formatFee(action.appliedFee)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-2.5">
          <dt className="text-ink-muted">Maximum duration</dt>
          <dd className="text-ink-secondary">{formatDuration(action.maximumDurationSec)}</dd>
        </div>
      </dl>
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">
        Frozen bounds define what could be allowed; they do not prove that protection was delivered.
      </p>
    </section>
  );
}
