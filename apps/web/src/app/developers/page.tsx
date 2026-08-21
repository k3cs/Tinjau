import type { Metadata } from "next";
import Link from "next/link";

import { PipelineDiagram } from "@/components/diagrams/pipeline-diagram";

import { IntegrationPaths } from "./_components/integration-paths";

export const metadata: Metadata = {
  title: "Developers · Tinjau",
  description:
    "How pool operators, protocols, evidence adapters and observers can use Tinjau today, and what is still waiting on the final deployment.",
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
              <p className="mt-5 max-w-[46ch] text-body-md text-ink-secondary">
                Pick your role. Every step says whether it runs today, is historical, or is still
                waiting on the final deployment.
              </p>
            </div>
            <div className="border-t border-edge pt-5">
              <p className="text-body-sm text-ink-muted">
                The public API and the final contract integration are not presented as ready
                before they exist.
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
