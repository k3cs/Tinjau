import Link from "next/link";
import type { PreregisteredScenario } from "@/lib/comparison/preregistration";

export function ComparisonScenarioSwitcher({
  scenarios,
  selected,
}: {
  scenarios: PreregisteredScenario[];
  selected: string;
}) {
  return (
    <nav aria-label="Comparison scenarios" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {scenarios.map((scenario) => {
        const active = scenario.slug === selected;
        return (
          <Link
            key={scenario.slug}
            href={`/compare?scenario=${scenario.slug}`}
            aria-current={active ? "page" : undefined}
            className={`min-h-14 rounded-md border px-4 py-3 transition-colors ${
              active
                ? "border-signal bg-signal text-black"
                : "border-edge bg-canvas text-ink-secondary hover:border-edge-strong hover:bg-canvas-soft hover:text-ink"
            }`}
          >
            <span className="block font-data text-[10px] font-semibold uppercase tracking-[0.07em] opacity-70">
              {scenario.shortLabel}
            </span>
            <span className="mt-1 block text-sm font-medium">{scenario.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
