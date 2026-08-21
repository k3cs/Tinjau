import { CapabilityBadge } from "@/components/capability-badge";
import { getCapability } from "@/lib/product/capabilities";
import { formatUtc, shortHex } from "@/lib/risk/format";
import type { DemoScenario } from "@/lib/risk/model";

export function ProofPanel({ scenario }: { scenario: DemoScenario }) {
  const registry = getCapability("risk-registry");
  return (
    <section className="grid border border-edge lg:grid-cols-[0.82fr_1.18fr]" aria-labelledby="record-title">
      <div className="border-b border-edge bg-canvas-soft p-6 lg:border-b-0 lg:border-r lg:p-8">
        <div className="flex flex-wrap items-center gap-2"><CapabilityBadge maturity={registry.maturity} /><span className="font-data text-[10px] text-ink-muted">LOCAL CONTRACT</span></div>
        <h2 id="record-title" className="mt-4 font-display text-3xl font-semibold tracking-display">Versioned risk record.</h2>
        <p className="mt-4 text-sm leading-relaxed text-ink-secondary">The record shape is stable and contract-tested. The final registry is not deployed, so this walkthrough shows a validated fixture—not a transaction readback.</p>
      </div>
      <dl className="divide-y divide-edge bg-canvas font-data text-xs">
        {[
          ["Assessment", scenario.record.assessmentId],
          ["Schema", scenario.record.schemaVersion],
          ["State", scenario.record.state],
          ["Evidence commitment", shortHex(scenario.record.evidenceCommitment)],
          ["Assessed", formatUtc(scenario.record.assessedAt)],
          ["Expires", formatUtc(scenario.record.expiresAt)],
          ["Transaction", scenario.record.action.txHash ?? "Not available — no final deployment"],
        ].map(([label, value]) => <div key={label} className="grid gap-2 px-5 py-4 sm:grid-cols-[11rem_1fr]"><dt className="text-ink-muted">{label}</dt><dd className="break-all text-ink-secondary">{value}</dd></div>)}
      </dl>
    </section>
  );
}
