import { ActionLifecycle } from "@/app/_components/action-lifecycle";
import { ProtectionEnvelope } from "@/app/_components/protection-envelope";
import { CapabilityBadge } from "@/components/capability-badge";
import { getCapability } from "@/lib/product/capabilities";
import type { DemoScenario } from "@/lib/risk/model";

export function ActionSurface({ scenario, recovery }: { scenario: DemoScenario; recovery: boolean }) {
  const hook = getCapability("fee-hook");
  const publisher = getCapability("x-publisher");
  const rumor = scenario.slug === "rumor-watch";
  return (
    <section className="border border-edge bg-canvas" aria-labelledby="action-title">
      <div className="grid lg:grid-cols-2">
        <div className="border-b border-edge lg:border-b-0 lg:border-r"><ProtectionEnvelope action={scenario.record.action} /></div>
        <div className="p-6 sm:p-8">
          <p className="data-label text-ink-muted">{recovery ? "Recovery path" : "Action and communication"}</p>
          <h2 id="action-title" className="mt-3 font-display text-3xl font-semibold tracking-display">{rumor ? "Nothing aggressive is allowed." : recovery ? "Decay is deterministic—not an AI judgment." : "The target action remains bounded and unclaimed."}</h2>
          <div className="mt-6 border-t border-edge">
            <div className="border-b border-edge py-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">Fee hook</p><CapabilityBadge maturity={hook.maturity} /></div>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{rumor ? "WATCH keeps the base fee. No historical or target hook path may be invoked." : "Historical AfterhoursFeeHook evidence proves the configured band and decay; final Tinjau integration is pending."}</p>
            </div>
            <div className="border-b border-edge py-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">X Publisher</p><CapabilityBadge maturity={publisher.maturity} /></div>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{rumor ? "SUPPRESSED — no public message should convert an unconfirmed rumor into apparent fact." : "PENDING — a source-linked, expiry-aware alert requires final risk-pipeline integration."}</p>
            </div>
            <div className="py-4">
              <p className="font-data text-[10px] font-semibold uppercase tracking-[0.06em] text-watch">Current action status · {scenario.record.action.status}</p>
              <p className="mt-2 text-sm text-ink-muted">No transaction hash or readback is present. The UI therefore cannot display APPLIED.</p>
            </div>
          </div>
        </div>
      </div>
      <ActionLifecycle action={scenario.record.action} />
    </section>
  );
}
