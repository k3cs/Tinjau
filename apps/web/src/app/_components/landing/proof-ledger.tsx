import Link from "next/link";
import { CapabilityBadge } from "@/components/capability-badge";
import { DataModeLabel } from "@/components/data-mode-label";
import { PRODUCT_CAPABILITIES } from "@/lib/product/capabilities";
import { XLAYER_TESTNET_PROOF } from "@/lib/product/deployments";

export function ProofLedger() {
  return (
    <section className="section-rule bg-paper-bright" aria-labelledby="proof-ledger-title">
      <div className="mx-auto max-w-[1440px] px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-data text-[10px] font-semibold uppercase tracking-[0.08em] text-coal-muted">Proof ledger</p>
            <h2 id="proof-ledger-title" className="mt-4 font-display text-4xl font-bold tracking-display sm:text-5xl">What exists. What does not. One ledger.</h2>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-coal-muted">Maturity describes the capability. Data mode describes the material shown. Neither is inferred from animation.</p>
        </div>

        <div className="mt-10 grid border-y border-black bg-black text-white md:grid-cols-[1fr_1fr_auto]">
          <div className="border-b border-edge px-5 py-4 md:border-b-0 md:border-r">
            <p className="font-data text-[10px] uppercase tracking-[0.06em] text-ink-muted">Verified network</p>
            <p className="mt-2 font-semibold">{XLAYER_TESTNET_PROOF.name} · chain {XLAYER_TESTNET_PROOF.chainId}</p>
          </div>
          <div className="border-b border-edge px-5 py-4 md:border-b-0 md:border-r">
            <p className="font-data text-[10px] uppercase tracking-[0.06em] text-ink-muted">Truth boundary</p>
            <p className="mt-2 text-sm text-ink-secondary">Historical prototype deployed. Final Tinjau integration pending.</p>
          </div>
          <Link href="/proof" className="inline-flex min-h-16 items-center justify-center bg-signal px-6 font-data text-[10px] font-semibold uppercase tracking-[0.06em] text-black transition-colors duration-150 ease-tinjau hover:bg-white">Open Proof ↗</Link>
        </div>

        <div className="mt-12 border-t border-black">
          {PRODUCT_CAPABILITIES.map((capability) => (
            <article key={capability.id} className="grid gap-4 border-b border-black/20 py-5 lg:grid-cols-[0.65fr_1fr_0.8fr]">
              <div>
                <p className="font-data text-[10px] text-coal-muted">{capability.stage}</p>
                <h3 className="mt-1 text-sm font-semibold">{capability.name}</h3>
              </div>
              <div>
                <p className="text-sm leading-relaxed text-coal-muted">{capability.evidence}</p>
                <p className="mt-2 text-xs leading-relaxed text-coal-muted">Limit: {capability.limitation}</p>
              </div>
              <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                <CapabilityBadge maturity={capability.maturity} onLight />
                {capability.dataMode && <DataModeLabel mode={capability.dataMode} onLight />}
                {capability.href && <Link href={capability.href} className="inline-flex min-h-8 items-center border-b border-black font-data text-[10px] font-semibold uppercase tracking-[0.06em]">Inspect ↗</Link>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
