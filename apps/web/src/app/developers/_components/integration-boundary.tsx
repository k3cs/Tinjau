import Link from "next/link";
import { CapabilityBadge } from "@/components/capability-badge";
import type { IntegrationStep } from "@/lib/product/integrations";

export function IntegrationBoundary({ step, index }: { step: IntegrationStep; index: number }) {
  return (
    <li className="border-b border-black/20 py-5 last:border-b-0">
      <div className="grid gap-4 sm:grid-cols-[3rem_1fr_auto]">
        <span className="font-data text-[10px] text-coal-muted">{String(index).padStart(2, "0")}</span>
        <div><h3 className="text-sm font-semibold">{step.title}</h3><p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-coal-muted">{step.description}</p>{step.example && <div className="mt-4 border border-black bg-black text-white"><p className="border-b border-edge px-4 py-2 font-data text-[9px] uppercase tracking-[0.06em] text-ink-muted">{step.exampleLabel}</p><pre className="overflow-x-auto p-4 font-data text-[11px] leading-relaxed"><code>{step.example}</code></pre></div>}<Link href={`/proof#capability-${step.proofCapabilityId}`} className="mt-3 inline-flex min-h-8 items-center border-b border-black font-data text-[10px] font-semibold uppercase tracking-[0.05em]">View supporting proof</Link></div>
        <div><CapabilityBadge maturity={step.maturity} onLight /></div>
      </div>
    </li>
  );
}
