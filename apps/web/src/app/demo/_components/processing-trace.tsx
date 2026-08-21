import type { DemoScenario } from "@/lib/risk/model";

const steps = [
  ["Normalize", "Preserve wording, speculation markers, and timestamp precision."],
  ["Resolve", "Map NVIDIA to the supported wNVDAx pool asset; near-miss tokens fail closed."],
  ["Cluster", "Group claims by event without counting one claim twice."],
  ["Relate", "Derive origin, supports, contradicts, duplicate, stale, and self-revision factors."],
] as const;

export function ProcessingTrace({ scenario, active }: { scenario: DemoScenario; active: "understand" | "relate" }) {
  const groupCount = new Set(scenario.record.evidence.map((claim) => claim.independenceGroup)).size;
  return (
    <section className="border border-edge bg-canvas" aria-labelledby="processing-title">
      <div className="grid border-b border-edge lg:grid-cols-[0.75fr_1.25fr]">
        <div className="border-b border-edge p-6 lg:border-b-0 lg:border-r lg:p-8">
          <p className="data-label text-ink-muted">AI processing trace</p>
          <h2 id="processing-title" className="mt-3 font-display text-3xl font-semibold tracking-display">Claims become an inspectable graph.</h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-secondary">The model-shaped layer can propose structure. Deterministic validation rejects missing claims, duplicate assignment, cross-company groups, and unsupported assets.</p>
        </div>
        <ol className="grid sm:grid-cols-2">
          {steps.map(([title, detail], index) => {
            const selected = active === "understand" ? index < 3 : index === 3;
            return (
              <li key={title} className={`border-b border-edge p-5 sm:border-l ${selected ? "bg-signal text-black" : "bg-canvas-soft text-ink"}`}>
                <p className="font-data text-[10px] font-semibold uppercase tracking-[0.06em]">0{index + 1} · {title}</p>
                <p className={`mt-3 text-sm leading-relaxed ${selected ? "text-black/75" : "text-ink-muted"}`}>{detail}</p>
              </li>
            );
          })}
        </ol>
      </div>
      <dl className="grid divide-y divide-edge sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-4"><dt className="data-label text-ink-muted">Claims retained</dt><dd className="mt-2 font-data text-xl text-ink">{scenario.record.evidence.length}</dd></div>
        <div className="p-4"><dt className="data-label text-ink-muted">Usable origin groups</dt><dd className="mt-2 font-data text-xl text-ink">{groupCount}</dd></div>
        <div className="p-4"><dt className="data-label text-ink-muted">Target asset</dt><dd className="mt-2 font-data text-xl text-ink">{scenario.record.tokenSymbol}</dd></div>
      </dl>
    </section>
  );
}
