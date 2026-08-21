import { ComparisonMatrix } from "@/app/compare/_components/comparison-matrix";
import { ComparisonScenarioSwitcher } from "@/app/compare/_components/comparison-scenario-switcher";
import { InputIdentityRibbon } from "@/app/compare/_components/input-identity-ribbon";
import { PolicyColumn } from "@/app/compare/_components/policy-column";
import { ResultClaimGate } from "@/app/compare/_components/result-claim-gate";
import { COMPARISON_POLICIES, COMPARISON_SCENARIOS, getComparisonScenario } from "@/lib/comparison/preregistration";
import { EventTape } from "./event-tape";

export function ComparisonScene({ caseId }: { caseId?: string }) {
  const scenario = getComparisonScenario(caseId);
  return (
    <div className="space-y-5">
      <ComparisonScenarioSwitcher scenarios={COMPARISON_SCENARIOS} selected={scenario.slug} baseHref="/demo?scene=comparison" />
      <InputIdentityRibbon scenario={scenario} />
      {!scenario.carriesEconomicRow && (
        <section className="border-l-2 border-watch bg-watch/10 px-5 py-4">
          <p className="font-data text-xs font-semibold uppercase tracking-[0.06em] text-watch">No economic row by design</p>
          <p className="mt-2 max-w-[80ch] text-sm leading-relaxed text-ink-secondary">Scene A contains zero observed swaps in its frozen replay window. Substituting zeros would change the preregistered test.</p>
        </section>
      )}
      <section className="grid gap-px overflow-hidden border border-edge bg-edge lg:grid-cols-3" aria-label="Equal policy comparison">
        {COMPARISON_POLICIES.map((policy) => <PolicyColumn key={policy.id} policy={policy} noEconomics={!scenario.carriesEconomicRow} />)}
      </section>
      <ComparisonMatrix noEconomics={!scenario.carriesEconomicRow} />
      <ResultClaimGate />
      <EventTape scene="comparison" />
    </div>
  );
}
