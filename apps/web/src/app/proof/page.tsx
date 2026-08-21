import type { Metadata } from "next";
import { CapabilityBadge } from "@/components/capability-badge";
import { DataModeLabel } from "@/components/data-mode-label";
import {
  BYTECODE_CHECK,
  DEPLOYED_NETWORK,
  DEPLOYED_STACKS,
  DEPLOYED_STATUS_TEXT,
  explorerUrl,
} from "@/lib/handoff/deployments";
import { PROOF_SUMMARY, getBuildCommit } from "@/lib/product/proof";

export const metadata: Metadata = {
  title: "Proof of work · Tinjau",
  description: "Verify Tinjau testnet deployments, implementation maturity, and build evidence.",
};

export default function ProofPage() {
  const buildCommit = getBuildCommit();
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <section className="border-b border-edge px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[1fr_0.55fr] lg:items-end">
          <div>
            <p className="data-label text-ink-faint">Proof of work</p>
            <h1 className="mt-4 max-w-[18ch] text-balance font-display text-section-sm text-ink lg:text-section-lg">{PROOF_SUMMARY.title}</h1>
            <p className="mt-5 max-w-[48ch] text-body-md text-ink-secondary">{PROOF_SUMMARY.subtitle}</p>
          </div>
          <dl className="border-t border-edge font-data text-xs">
            <div className="flex justify-between gap-6 border-b border-edge py-3"><dt>Network</dt><dd>{PROOF_SUMMARY.network.name}</dd></div>
            <div className="flex justify-between gap-6 border-b border-edge py-3"><dt>Chain ID</dt><dd>{PROOF_SUMMARY.network.chainId}</dd></div>
            <div className="flex justify-between gap-6 border-b border-edge py-3"><dt>Verified baseline</dt><dd>{PROOF_SUMMARY.network.verifiedAt.slice(0, 10)}</dd></div>
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28" aria-labelledby="deployment-ledger-title">
        <div className="grid gap-8 lg:grid-cols-[0.45fr_1fr]">
          <div>
            <h2 id="deployment-ledger-title" className="font-display text-section-sm text-ink">
              Deployment ledger
            </h2>
            <p className="mt-4 max-w-[44ch] text-body-sm text-ink-muted">
              Read from <span className="font-data">deployed-addresses.json</span>, not retyped.
              Every address below has bytecode on chain, checked with{" "}
              <span className="font-data">{BYTECODE_CHECK.method}</span> at block{" "}
              <span className="font-data tabular">
                {BYTECODE_CHECK.atBlockNumber.toLocaleString()}
              </span>
              .
            </p>
            <p className="mt-5 rounded-lg border-2 border-watch bg-watch/[0.07] p-4 text-body-sm text-ink">
              {DEPLOYED_STATUS_TEXT}
            </p>
            <p className="mt-4 rounded-lg border border-edge bg-surface p-4 text-body-sm text-ink-muted">
              {DEPLOYED_NETWORK.rpcWarning}
            </p>
          </div>

          <div>
            {DEPLOYED_STACKS.map((stack) => (
              <div key={stack.stackId} className="mb-10 border-t border-edge">
                <div className="flex flex-wrap items-baseline justify-between gap-2 py-4">
                  <h3 className="font-display text-heading-sm text-ink">{stack.label}</h3>
                  <p className="data-label text-ink-faint">
                    {stack.isDemoEnvelope
                      ? "60× compressed demo envelope"
                      : "Production envelope"}{" "}
                    · base {stack.envelope.baseFee as number} → cap{" "}
                    {stack.envelope.maxFee as number} pips
                  </p>
                </div>
                {stack.contracts.map((contract) => (
                  <article
                    key={`${stack.stackId}-${contract.address}`}
                    className="grid gap-4 border-t border-edge py-5 md:grid-cols-[0.7fr_1fr_auto]"
                  >
                    <div>
                      <h4 className="font-body text-body-sm font-medium text-ink">
                        {contract.role}
                      </h4>
                      <p className="data-label mt-1 text-ink-faint">
                        {contract.isBuilderControlled ? "Builder-controlled" : "Third-party"}
                      </p>
                    </div>
                    <div>
                      <p className="break-all font-data text-[11px] text-ink">
                        {contract.address}
                      </p>
                      {contract.note ? (
                        <p className="mt-2 text-body-xs text-ink-muted">{contract.note}</p>
                      ) : null}
                    </div>
                    <div className="flex items-start gap-3 md:justify-end">
                      <span className="data-label whitespace-nowrap text-normal-soft">
                        {contract.hasBytecode
                          ? `${contract.codeSize.toLocaleString()} bytes`
                          : "No bytecode"}
                      </span>
                      <a
                        href={explorerUrl(contract.address)}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex min-h-10 items-center border-b border-edge font-data text-[10px] font-semibold uppercase tracking-[0.06em]"
                      >
                        Explorer
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-edge bg-canvas-sunken px-4 py-20 sm:px-6 lg:px-8 lg:py-28" aria-labelledby="capability-proof-title">
        <div className="mx-auto grid max-w-[1440px] gap-8 lg:grid-cols-[0.45fr_1fr]">
          <div><h2 id="capability-proof-title" className="font-display text-section-sm text-ink">Capability evidence</h2><p className="mt-4 max-w-[40ch] text-body-sm text-ink-muted">Maturity says whether the path exists. Data mode says what proves it. Neither substitutes for the other.</p></div>
          <div className="border-t border-edge">
            {PROOF_SUMMARY.capabilities.map((capability) => (
              <article key={capability.id} id={`capability-${capability.id}`} className="scroll-mt-24 border-b border-edge py-5">
                <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-data text-[10px] text-ink-muted">{capability.stage}</p><h3 className="mt-1 font-semibold">{capability.name}</h3></div><div className="flex flex-wrap gap-2"><CapabilityBadge maturity={capability.maturity} />{capability.dataMode && <DataModeLabel mode={capability.dataMode} />}</div></div>
                <p className="mt-4 text-sm leading-relaxed text-ink-muted">{capability.evidence}</p>
                <p className="mt-2 text-xs leading-relaxed text-ink-muted">Limit: {capability.limitation}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-edge bg-canvas-sunken px-4 py-16 text-ink sm:px-6 lg:px-8" aria-labelledby="build-evidence-title">
        <div className="mx-auto grid max-w-[1440px] gap-8 lg:grid-cols-[0.45fr_1fr]">
          <h2 id="build-evidence-title" className="font-display text-heading-lg text-ink">Build evidence</h2>
          <div className="border-t border-edge font-data text-xs">
            <div className="flex flex-col gap-2 border-b border-edge py-4 sm:flex-row sm:justify-between"><span className="text-ink-muted">Commit</span><span className="break-all">{buildCommit ?? "Unavailable outside an identified Vercel build"}</span></div>
            {PROOF_SUMMARY.services.map((service) => <div key={service.id} className="grid gap-2 border-b border-edge py-4 sm:grid-cols-[0.4fr_0.6fr]"><span>{service.name}</span><span className="text-ink-muted">{service.evidence}. {service.limitation}</span></div>)}
          </div>
        </div>
      </section>
    </div>
  );
}
