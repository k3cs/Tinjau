import { EvidenceCircuit } from "@/app/_components/evidence-circuit";
import { MarketConfirmation } from "@/app/_components/market-confirmation";
import { RiskCommandBar } from "@/app/_components/risk-command-bar";
import { RiskStateCore } from "@/app/_components/risk-state-core";
import { ScenarioTransition } from "@/app/_components/scenario-transition";
import { TrustBoundary } from "@/app/_components/trust-boundary";
import { getScene, getStage, type DemoSceneId } from "@/lib/demo/walkthrough";
import { getDemoScenario } from "@/lib/risk/demo-fixtures";
import { ActionSurface } from "./action-surface";
import { ComparisonScene } from "./comparison-scene";
import { DemoSceneNav } from "./demo-scene-nav";
import { DemoStageRail } from "./demo-stage-rail";
import { EventTape } from "./event-tape";
import { ProcessingTrace } from "./processing-trace";
import { ProofPanel } from "./proof-panel";
import { SourceIntake } from "./source-intake";
import { SystemOverview } from "./system-overview";

export function DemoExperience({ sceneParam, stageParam, caseId }: { sceneParam?: string; stageParam?: string; caseId?: string }) {
  const scene = getScene(sceneParam);
  const stage = getStage(stageParam);
  const scenario = scene === "comparison" ? undefined : getDemoScenario(scene === "confirmed" ? "confirmed-event" : "rumor-watch");

  return (
    <div className="demo-shell circuit-field">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <SystemOverview scene={scene} scenario={scenario} />
        <div className="mt-5"><DemoSceneNav selected={scene} /></div>

        {scene === "comparison" ? (
          <div className="mt-5"><ScenarioTransition scenario={`comparison-${caseId ?? "default"}`}><ComparisonScene caseId={caseId} /></ScenarioTransition></div>
        ) : scenario ? (
          <>
            <div className="mt-5"><DemoStageRail scene={scene} stage={stage} /></div>
            <div className="mt-5"><RiskCommandBar scenario={scenario} /></div>
            <ScenarioTransition scenario={`${scene}-${stage}`}>
              <div className="mt-5 space-y-5">
                {(stage === "listen" || stage === "retrieve") && <SourceIntake scenario={scenario} focus={stage} />}
                {(stage === "understand" || stage === "relate") && (
                  <><ProcessingTrace scenario={scenario} active={stage} />{stage === "relate" && <EvidenceCircuit evidence={scenario.record.evidence} />}</>
                )}
                {stage === "decide" && (
                  <><div className="border border-edge"><RiskStateCore scenario={scenario} /></div><TrustBoundary scenario={scenario} /></>
                )}
                {stage === "confirm" && (
                  <div className="grid border border-edge lg:grid-cols-[1fr_1fr]"><RiskStateCore scenario={scenario} /><MarketConfirmation confirmation={scenario.record.marketConfirmation} /></div>
                )}
                {stage === "record" && <ProofPanel scenario={scenario} />}
                {(stage === "act" || stage === "recover") && <ActionSurface scenario={scenario} recovery={stage === "recover"} />}
                <EventTape scene={scene as Exclude<DemoSceneId, "comparison">} />
              </div>
            </ScenarioTransition>
          </>
        ) : null}
      </div>
    </div>
  );
}
