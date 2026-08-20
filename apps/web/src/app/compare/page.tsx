import { ScenarioTransition } from "@/app/_components/scenario-transition";
import { ComparisonMatrix } from "@/app/compare/_components/comparison-matrix";
import { ComparisonScenarioSwitcher } from "@/app/compare/_components/comparison-scenario-switcher";
import { InputIdentityRibbon } from "@/app/compare/_components/input-identity-ribbon";
import { PolicyColumn } from "@/app/compare/_components/policy-column";
import { ResultClaimGate } from "@/app/compare/_components/result-claim-gate";
import {
  COMPARISON_POLICIES,
  COMPARISON_SCENARIOS,
  getComparisonScenario,
} from "@/lib/comparison/preregistration";

type ComparePageProps = {
  searchParams: Promise<{ scenario?: string }>;
};

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;
  const scenario = getComparisonScenario(params.scenario);

  return (
    <div className="circuit-field min-h-[calc(100vh-8rem)]">
      <section className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-5 rounded-lg border border-edge bg-canvas p-6 sm:p-8 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="font-data text-xs font-medium uppercase tracking-[0.07em] text-signal">
              Pre-registered policy benchmark
            </p>
            <h1 className="mt-2 max-w-4xl text-balance font-display text-4xl font-semibold leading-tight tracking-display text-ink sm:text-5xl">
              Same input. Three policies. No predetermined winner.
            </h1>
            <p className="mt-4 max-w-[72ch] leading-relaxed text-ink-secondary">
              The method and event set were frozen before results. The final benchmark payload is not present, so every outcome remains pending or explicitly null.
            </p>
          </div>
          <span className="inline-flex min-h-11 shrink-0 items-center self-start rounded border border-watch/50 bg-watch/10 px-3 font-data text-[11px] font-medium uppercase tracking-[0.06em] text-watch xl:self-auto">
            Result handoff pending
          </span>
        </div>

        <div className="mt-5">
          <ComparisonScenarioSwitcher scenarios={COMPARISON_SCENARIOS} selected={scenario.slug} />
        </div>

        <p className="sr-only" role="status" aria-live="polite">
          {scenario.shortLabel} selected. {scenario.observedSwaps} observed swaps. Economic row {scenario.carriesEconomicRow ? "required" : "not available"}.
        </p>

        <ScenarioTransition scenario={scenario.slug}>
          <div className="mt-5">
            <InputIdentityRibbon scenario={scenario} />
          </div>

          {!scenario.carriesEconomicRow && (
            <section className="mt-5 border-l-2 border-watch bg-watch/10 px-5 py-4">
              <p className="font-data text-xs font-semibold uppercase tracking-[0.06em] text-watch">No economic row by design</p>
              <p className="mt-2 max-w-[80ch] text-sm leading-relaxed text-ink-secondary">
                Scene A contains zero observed swaps in its frozen replay window. All three policies therefore show null economics; widening the window or substituting zeros would change the pre-registered test.
              </p>
            </section>
          )}

          <section className="mt-5 grid gap-px overflow-hidden rounded-lg border border-edge bg-edge lg:grid-cols-3" aria-label="Equal policy comparison">
            {COMPARISON_POLICIES.map((policy) => (
              <PolicyColumn key={policy.id} policy={policy} noEconomics={!scenario.carriesEconomicRow} />
            ))}
          </section>

          <div className="mt-5">
            <ComparisonMatrix noEconomics={!scenario.carriesEconomicRow} />
          </div>

          <div className="mt-5">
            <ResultClaimGate />
          </div>
        </ScenarioTransition>
      </section>
    </div>
  );
}
