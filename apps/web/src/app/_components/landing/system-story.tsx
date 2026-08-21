import Link from "next/link";
import { CapabilityBadge } from "@/components/capability-badge";
import { DataModeLabel } from "@/components/data-mode-label";
import { PRODUCT_CAPABILITIES } from "@/lib/product/capabilities";

const primaryPath = PRODUCT_CAPABILITIES.filter((item) => !["exchange-os", "policy-benchmark"].includes(item.id));

export function SystemStory() {
  return (
    <section id="system" className="section-rule bg-canvas text-ink" aria-labelledby="system-story-title">
      <div className="mx-auto max-w-[1440px] px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="font-data text-[10px] font-semibold uppercase tracking-[0.08em] text-signal">One event · every surface</p>
            <h2 id="system-story-title" className="mt-4 font-display text-4xl font-bold leading-tight tracking-display sm:text-5xl">Not a website simulation. A trace of the whole system.</h2>
          </div>
          <p className="max-w-[68ch] text-base leading-7 text-ink-muted lg:justify-self-end">Source intake, AI processing, deterministic authorization, OKX/X Layer context, registry state, pool action, X communication, and recovery stay in one causal record.</p>
        </div>

        <ol className="mt-14 border-t border-edge">
          {primaryPath.map((capability, index) => (
            <li key={capability.id} className="grid gap-4 border-b border-edge py-5 lg:grid-cols-[4rem_0.7fr_1.1fr_0.8fr] lg:items-start">
              <span className="font-data text-xs text-ink-muted">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <p className="text-sm font-semibold text-ink">{capability.name}</p>
                <p className="mt-1 font-data text-[10px] text-ink-muted">{capability.stage}</p>
              </div>
              <p className="text-sm leading-relaxed text-ink-muted">{capability.summary}</p>
              <div className="flex flex-wrap gap-1.5 lg:justify-end">
                <CapabilityBadge maturity={capability.maturity} />
                {capability.dataMode && <DataModeLabel mode={capability.dataMode} />}
              </div>
            </li>
          ))}
        </ol>
        <Link href="/demo" className="mt-10 inline-flex min-h-12 items-center border border-signal bg-signal px-5 font-data text-xs font-semibold uppercase tracking-[0.06em] text-black transition-colors duration-100 ease-tinjau hover:bg-white active:translate-y-px">Run the system trace <span aria-hidden className="ml-3">↗</span></Link>
      </div>
    </section>
  );
}
