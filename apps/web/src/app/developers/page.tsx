import type { Metadata } from "next";
import Link from "next/link";

import { PipelineDiagram } from "@/components/diagrams/pipeline-diagram";

import { IntegrationPaths } from "./_components/integration-paths";

export const metadata: Metadata = {
  title: "Developers · Tinjau",
  description:
    "Commands a pool operator, protocol, evidence adapter or dashboard builder can run against the deployed Tinjau registry today, and the two limits that travel with them.",
};

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <section className="border-b border-edge px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.6fr] lg:items-end">
            <div>
              <p className="data-label text-ink-faint">Developers</p>
              <h1 className="mt-4 max-w-[16ch] text-balance font-display text-section-sm text-ink lg:text-section-lg">
                Use the boundary, not a black box.
              </h1>
              <p className="mt-5 max-w-[48ch] text-body-md text-ink-secondary">
                Pick your role. Most steps are a command you can run right now against the public
                testnet, with no key. The ones that are not say so, and say why.
              </p>
            </div>
            <div className="border-t border-edge pt-5">
              <p className="text-body-sm text-ink-muted">
                The registry, the hook and the public API are deployed and readable. The pools
                behind them are builder-controlled test liquidity, and every record they serve is
                a replay. Both facts travel with every address on this page.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/demo" className="btn-primary">
                  Run the guided demo
                </Link>
                <Link href="/proof" className="btn-secondary">
                  Inspect the proof
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <PipelineDiagram />
          </div>
        </div>
      </section>
      <IntegrationPaths />
    </div>
  );
}
