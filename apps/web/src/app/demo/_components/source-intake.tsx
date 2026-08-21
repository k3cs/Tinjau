import { DataModeLabel } from "@/components/data-mode-label";
import { ExternalEvidenceLink } from "@/components/external-evidence-link";
import { formatUtc } from "@/lib/risk/format";
import type { DemoScenario } from "@/lib/risk/model";

export function SourceIntake({ scenario, focus }: { scenario: DemoScenario; focus: "listen" | "retrieve" }) {
  const first = scenario.record.evidence[0];
  const isRumor = first.sourceClass === "RUMOR";
  return (
    <section className="grid border border-edge lg:grid-cols-[0.78fr_1.22fr]" aria-labelledby="source-intake-title">
      <div className="border-b border-edge bg-canvas-soft p-6 lg:border-b-0 lg:border-r lg:p-8">
        <p className="data-label text-ink-muted">{focus === "listen" ? "Potential evidence" : "Retrieval record"}</p>
        <h2 id="source-intake-title" className="mt-3 font-display text-3xl font-semibold tracking-display text-ink">{isRumor ? "X-shaped rumor enters." : "Official filing enters."}</h2>
        <p className="mt-4 text-sm leading-relaxed text-ink-secondary">{isRumor ? "The input is a safety-test fixture, not a captured public post and not evidence of live X coverage." : "The frozen SEC source is canonical and content-pinned. Replay preserves its original source time."}</p>
        <div className="mt-6 flex flex-wrap gap-2"><DataModeLabel mode={first.dataMode} /><span className="inline-flex min-h-6 items-center border border-edge-strong px-2 font-data text-[10px] font-semibold tracking-[0.06em] text-ink-secondary">{first.sourceClass}</span></div>
      </div>
      <dl className="divide-y divide-edge bg-canvas font-data text-xs">
        {[
          ["Source", first.publisherOrAuthor ?? "No public author — simulated fixture"],
          ["Canonical identity", first.sourceId],
          ["Source time", formatUtc(first.publishedAt)],
          ["Asset resolution", `${first.company} → ${first.tokenSymbol}`],
          ["Claim", first.claimTextOrPointer],
        ].map(([label, value]) => (
          <div key={label} className="grid gap-2 px-5 py-4 sm:grid-cols-[9rem_1fr]">
            <dt className="text-ink-muted">{label}</dt>
            <dd className="break-words text-ink-secondary">{value}</dd>
          </div>
        ))}
        <div className="px-5 py-4"><ExternalEvidenceLink href={first.sourceUrl} /></div>
      </dl>
    </section>
  );
}
