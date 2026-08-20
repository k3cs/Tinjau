import Link from "next/link";
import type { DemoScenario } from "@/lib/risk/model";

export function ScenarioSwitcher({ scenarios, selected }: { scenarios: DemoScenario[]; selected: string }) {
  return (
    <nav aria-label="Demo scenarios" className="flex flex-col gap-2 sm:flex-row">
      {scenarios.map((scenario) => {
        const active = scenario.slug === selected;
        return (
          <Link
            key={scenario.slug}
            href={`/?scenario=${scenario.slug}`}
            aria-current={active ? "page" : undefined}
            className={`group flex min-h-12 flex-1 items-center justify-between gap-4 rounded-md border px-4 transition-colors sm:min-w-64 ${
              active
                ? "border-signal bg-signal text-black"
                : "border-edge bg-canvas text-ink-secondary hover:border-edge-strong hover:bg-canvas-soft hover:text-ink"
            }`}
          >
            <span>
              <span className="block font-data text-[10px] font-semibold uppercase tracking-[0.07em] opacity-70">
                {scenario.shortLabel}
              </span>
              <span className="mt-0.5 block text-left text-sm font-medium">{scenario.title}</span>
            </span>
            <span
              aria-hidden
              className={`h-2 w-2 shrink-0 rounded-full ${active ? "bg-black" : "bg-edge-strong group-hover:bg-signal"}`}
            />
          </Link>
        );
      })}
    </nav>
  );
}
