import type { Metadata } from "next";
import Link from "next/link";
import { IntegrationPaths } from "./_components/integration-paths";

export const metadata: Metadata = {
  title: "Developers · Tinjau",
  description: "Understand how pool operators, protocols, evidence adapters, and observers can use Tinjau today and after final deployment.",
};

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-paper text-coal">
      <section className="border-b border-black px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[1fr_0.55fr] lg:items-end">
          <div><h1 className="max-w-4xl text-balance font-display text-5xl font-bold tracking-display sm:text-7xl">Use the boundary, not a black box.</h1><p className="mt-6 max-w-2xl text-lg leading-relaxed text-coal-muted">Choose your role. Every step states whether it is implemented, historical, or still waiting on the final deployment.</p></div>
          <div className="border-t border-black pt-5 text-sm leading-relaxed text-coal-muted"><p>Tinjau's public API and final contract integration are not presented as ready before they exist.</p><div className="mt-5 flex flex-wrap gap-4"><Link href="/demo" className="inline-flex min-h-11 items-center border border-black bg-black px-4 font-data text-[10px] font-semibold uppercase tracking-[0.06em] text-white transition-colors duration-150 ease-tinjau hover:bg-signal hover:text-black">Run guided demo</Link><Link href="/proof" className="inline-flex min-h-11 items-center border-b border-black px-1 font-data text-[10px] font-semibold uppercase tracking-[0.06em]">Inspect proof</Link></div></div>
        </div>
      </section>
      <IntegrationPaths />
    </div>
  );
}
