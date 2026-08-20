import type { DemoScenario } from "@/lib/risk/model";

export function TrustBoundary({ scenario }: { scenario: DemoScenario }) {
  return (
    <section className="grid gap-px overflow-hidden rounded-lg border border-edge bg-edge lg:grid-cols-[1fr_1fr_1.2fr]">
      <div className="bg-canvas p-6">
        <p className="data-label text-ink-muted">AI may propose</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
          Entity resolution, event interpretation, duplicate grouping, contradiction detection, and a human explanation.
        </p>
      </div>
      <div className="bg-canvas p-6">
        <p className="data-label text-ink-muted">Policy must decide</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
          Promotion threshold, freshness, confirmation equality, fee ceiling, expiry, cooldown, and deterministic decay.
        </p>
      </div>
      <div className="bg-canvas-soft p-6">
        <p className="data-label text-ink-muted">Fixture disclosure</p>
        <p className="mt-3 break-all font-data text-[10px] leading-relaxed text-ink-secondary">
          SHA-256 {scenario.sourceChecksum}
        </p>
        <p className="mt-2 text-sm text-ink-muted">Frozen source: {scenario.sourceFile}</p>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-ink-secondary">
          {scenario.limitations.map((limitation) => (
            <li key={limitation} className="flex gap-2">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 bg-watch" />
              <span>{limitation}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
