"use client";

import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { CapabilityBadge } from "@/components/capability-badge";
import { DataModeLabel } from "@/components/data-mode-label";
import { ExternalEvidenceLink } from "@/components/external-evidence-link";
import type { MissionDefinition, MissionOutput } from "@/lib/demo/mission-types";
import { getCapability } from "@/lib/product/capabilities";

export function ProgressiveOutput({ mission, revealedOutputIds }: { mission: MissionDefinition; revealedOutputIds: string[] }) {
  const reduceMotion = useReducedMotion();
  const outputs = mission.stages.flatMap((stage) => stage.outputs).filter((output) => revealedOutputIds.includes(output.id));
  const latest = outputs.at(-1);

  return (
    <section className="min-h-[32rem] border border-edge bg-surface" aria-labelledby="system-output-title">
      <div className="flex min-h-14 items-center justify-between border-b border-edge px-4">
        <h2 id="system-output-title" className="font-data text-xs font-semibold uppercase tracking-[0.06em]">System output</h2>
        <span className="font-data text-[10px] text-ink-muted">{outputs.length} revealed</span>
      </div>
      <div aria-live="polite" className="sr-only">{latest ? `${latest.title}: ${latest.summary}` : "No system output yet"}</div>
      {outputs.length === 0 ? (
        <div className="flex min-h-[28rem] items-center justify-center px-6 text-center">
          <div className="max-w-sm">
            <svg aria-hidden viewBox="0 0 48 48" className="mx-auto h-12 w-12 text-edge-strong" fill="none"><path d="M8 13h32v22H8zM14 20h20M14 27h12" stroke="currentColor" strokeWidth="1.5" /></svg>
            <h3 className="mt-5 font-display text-2xl font-semibold tracking-display">Waiting for your decision.</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">Evidence and system records appear here only after the corresponding action completes.</p>
          </div>
        </div>
      ) : (
        <LazyMotion features={domAnimation}>
          <ol className="divide-y divide-edge">
            {outputs.map((output, index) => (
              <m.li key={output.id} initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: [0.23, 1, 0.32, 1] }}>
                <OutputRecord output={output} index={index + 1} />
              </m.li>
            ))}
          </ol>
        </LazyMotion>
      )}
    </section>
  );
}

function OutputRecord({ output, index }: { output: MissionOutput; index: number }) {
  const capability = output.capabilityId ? getCapability(output.capabilityId) : null;
  return (
    <article className="px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4"><span className="font-data text-[10px] text-ink-muted">{String(index).padStart(2, "0")}</span><div><p className="font-data text-[10px] uppercase tracking-[0.06em] text-signal">{output.kind}</p><h3 className="mt-2 text-base font-semibold">{output.title}</h3></div></div>
        <div className="flex flex-wrap gap-2">{capability && <CapabilityBadge maturity={capability.maturity} />}{output.dataMode && <DataModeLabel mode={output.dataMode} />}</div>
      </div>
      <p className="mt-4 max-w-[75ch] text-sm leading-relaxed text-ink-secondary">{output.summary}</p>
      {output.detail && <ul className="mt-4 border-t border-edge pt-3 font-data text-[11px] text-ink-muted">{output.detail.map((item) => <li key={item} className="py-1">— {item}</li>)}</ul>}
      {output.sourceUrl !== undefined && <div className="mt-4"><ExternalEvidenceLink href={output.sourceUrl} /></div>}
    </article>
  );
}
