import type { Metadata } from "next";
import { CapabilityBadge } from "@/components/capability-badge";
import { DataModeLabel } from "@/components/data-mode-label";
import { deploymentExplorerUrl } from "@/lib/product/deployments";
import { PROOF_SUMMARY, getBuildCommit } from "@/lib/product/proof";

export const metadata: Metadata = {
  title: "Proof of Work — Tinjau",
  description: "Verify Tinjau testnet deployments, implementation maturity, and build evidence.",
};

export default function ProofPage() {
  const buildCommit = getBuildCommit();
  return (
    <main className="min-h-screen bg-paper text-coal">
      <section className="border-b border-black px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[1fr_0.55fr] lg:items-end">
          <div>
            <h1 className="max-w-4xl text-balance font-display text-5xl font-bold tracking-display sm:text-7xl">{PROOF_SUMMARY.title}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-coal-muted">{PROOF_SUMMARY.subtitle}</p>
          </div>
          <dl className="border-t border-black font-data text-xs">
            <div className="flex justify-between gap-6 border-b border-black/20 py-3"><dt>Network</dt><dd>{PROOF_SUMMARY.network.name}</dd></div>
            <div className="flex justify-between gap-6 border-b border-black/20 py-3"><dt>Chain ID</dt><dd>{PROOF_SUMMARY.network.chainId}</dd></div>
            <div className="flex justify-between gap-6 border-b border-black/20 py-3"><dt>Verified baseline</dt><dd>{PROOF_SUMMARY.network.verifiedAt.slice(0, 10)}</dd></div>
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28" aria-labelledby="deployment-ledger-title">
        <div className="grid gap-8 lg:grid-cols-[0.45fr_1fr]">
          <div>
            <h2 id="deployment-ledger-title" className="font-display text-4xl font-bold tracking-display">Deployment ledger</h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-coal-muted">Historical testnet proof and final Tinjau readiness are separate. An address is evidence only for the artifact actually deployed there.</p>
          </div>
          <div className="border-t border-black">
            {PROOF_SUMMARY.deployments.map((deployment) => {
              const href = deploymentExplorerUrl(deployment);
              return (
                <article key={deployment.id} className="grid gap-4 border-b border-black/20 py-5 md:grid-cols-[0.7fr_1fr_auto]">
                  <div>
                    <h3 className="font-semibold">{deployment.name}</h3>
                    <p className="mt-1 font-data text-[10px] uppercase tracking-[0.06em] text-coal-muted">{deployment.ownership.replaceAll("_", " ")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-coal-muted">{deployment.role}</p>
                    <p className="mt-2 break-all font-data text-[11px]">{deployment.address ?? "No final address — deployment pending"}</p>
                    <p className="mt-2 text-xs leading-relaxed text-coal-muted">{deployment.limitation}</p>
                  </div>
                  <div className="flex items-start gap-3 md:justify-end">
                    <CapabilityBadge maturity={deployment.maturity} onLight />
                    {href && <a href={href} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-2 border-b border-black font-data text-[10px] font-semibold uppercase tracking-[0.06em]">Explorer<svg aria-hidden viewBox="0 0 16 16" className="h-3 w-3" fill="none"><path d="M6 3h7v7M13 3L4 12" stroke="currentColor" strokeWidth="1.5" /></svg></a>}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-black bg-paper-bright px-4 py-20 sm:px-6 lg:px-8 lg:py-28" aria-labelledby="capability-proof-title">
        <div className="mx-auto grid max-w-[1440px] gap-8 lg:grid-cols-[0.45fr_1fr]">
          <div><h2 id="capability-proof-title" className="font-display text-4xl font-bold tracking-display">Capability evidence</h2><p className="mt-4 max-w-md text-sm leading-relaxed text-coal-muted">Maturity says whether the path exists. Data mode says what kind of material proves it. The two axes never substitute for each other.</p></div>
          <div className="border-t border-black">
            {PROOF_SUMMARY.capabilities.map((capability) => (
              <article key={capability.id} id={`capability-${capability.id}`} className="scroll-mt-24 border-b border-black/20 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-data text-[10px] text-coal-muted">{capability.stage}</p><h3 className="mt-1 font-semibold">{capability.name}</h3></div><div className="flex flex-wrap gap-2"><CapabilityBadge maturity={capability.maturity} onLight />{capability.dataMode && <DataModeLabel mode={capability.dataMode} onLight />}</div></div>
                <p className="mt-4 text-sm leading-relaxed text-coal-muted">{capability.evidence}</p>
                <p className="mt-2 text-xs leading-relaxed text-coal-muted">Limit: {capability.limitation}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-black bg-black px-4 py-16 text-white sm:px-6 lg:px-8" aria-labelledby="build-evidence-title">
        <div className="mx-auto grid max-w-[1440px] gap-8 lg:grid-cols-[0.45fr_1fr]">
          <h2 id="build-evidence-title" className="font-display text-3xl font-bold tracking-display">Build evidence</h2>
          <div className="border-t border-edge font-data text-xs">
            <div className="flex flex-col gap-2 border-b border-edge py-4 sm:flex-row sm:justify-between"><span className="text-ink-muted">Commit</span><span className="break-all">{buildCommit ?? "Unavailable outside an identified Vercel build"}</span></div>
            {PROOF_SUMMARY.services.map((service) => <div key={service.id} className="grid gap-2 border-b border-edge py-4 sm:grid-cols-[0.4fr_0.6fr]"><span>{service.name}</span><span className="text-ink-muted">{service.evidence}. {service.limitation}</span></div>)}
          </div>
        </div>
      </section>
    </main>
  );
}
