import { ActionLifecycle } from "@/app/_components/action-lifecycle";
import { EvidenceCircuit } from "@/app/_components/evidence-circuit";
import { MarketConfirmation } from "@/app/_components/market-confirmation";
import { ProtectionEnvelope } from "@/app/_components/protection-envelope";
import { RiskCommandBar } from "@/app/_components/risk-command-bar";
import { RiskStateCore } from "@/app/_components/risk-state-core";
import { ScenarioSwitcher } from "@/app/_components/scenario-switcher";
import { ScenarioTransition } from "@/app/_components/scenario-transition";
import { TrustBoundary } from "@/app/_components/trust-boundary";
import { DEMO_SCENARIOS, getDemoScenario } from "@/lib/risk/demo-fixtures";

type HomePageProps = {
  searchParams: Promise<{ scenario?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const scenario = getDemoScenario(params.scenario);
  const { record } = scenario;

  return (
    <div className="circuit-field min-h-[calc(100vh-8rem)]">
      <section className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="font-data text-xs font-medium uppercase tracking-[0.07em] text-signal">
              Tinjau risk command center
            </p>
            <h2 className="mt-2 max-w-3xl text-balance font-display text-3xl font-semibold leading-tight tracking-display text-ink sm:text-4xl">
              Follow evidence to the boundary of action.
            </h2>
            <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-ink-secondary">
              {scenario.role}. Every claim keeps its provenance and mode; unavailable market data blocks a new PROTECT.
            </p>
          </div>
          <ScenarioSwitcher scenarios={DEMO_SCENARIOS} selected={scenario.slug} />
        </div>

        <p className="sr-only" role="status" aria-live="polite">
          {scenario.shortLabel} selected. Current risk state {record.state}. Action {record.action.status}.
        </p>

        <div className="mt-5">
          <RiskCommandBar scenario={scenario} />
        </div>

        <ScenarioTransition scenario={scenario.slug}>
          <div className="mt-5 overflow-hidden rounded-lg border border-edge bg-canvas">
            <div className="grid xl:grid-cols-12">
              <div className="xl:col-span-6">
                <RiskStateCore scenario={scenario} />
              </div>
              <div className="xl:col-span-3">
                <MarketConfirmation confirmation={record.marketConfirmation} />
              </div>
              <div className="xl:col-span-3">
                <ProtectionEnvelope action={record.action} />
              </div>
            </div>

            <EvidenceCircuit evidence={record.evidence} />
            <ActionLifecycle action={record.action} />
          </div>

          <div className="mt-5">
            <TrustBoundary scenario={scenario} />
          </div>
        </ScenarioTransition>
      </section>
    </div>
  );
}
