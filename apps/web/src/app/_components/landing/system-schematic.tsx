"use client";

import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { CapabilityBadge } from "@/components/capability-badge";
import { DataModeLabel } from "@/components/data-mode-label";
import { SYSTEM_NODES } from "@/lib/product/system";

/* ─────────────────────────────────────────────────────────
 * SYSTEM PATH STORYBOARD
 *
 *    0ms   complete schematic is readable and interactive
 *  120ms   structural path resolves
 *  260ms   active evidence path draws source → policy
 *  420ms   constrained outputs receive the signal
 * ───────────────────────────────────────────────────────── */
const TIMING = { frame: 0.12, path: 0.26, output: 0.42 } as const;

export function SystemSchematic() {
  const reduceMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation}>
      <section className="relative border border-black bg-paper-bright" aria-labelledby="system-schematic-title">
        <div className="flex items-center justify-between border-b border-black/20 px-4 py-3">
          <div>
            <p className="font-data text-[10px] font-semibold uppercase tracking-[0.08em] text-coal-muted">System trace</p>
            <h2 id="system-schematic-title" className="mt-1 font-display text-base font-semibold tracking-display">
              Evidence to bounded action
            </h2>
          </div>
          <span className="font-data text-[10px] text-coal-muted">wNVDAx / USDG</span>
        </div>

        <ol className="relative" aria-label="Tinjau system stages">
          <m.span
            aria-hidden
            className="absolute bottom-6 left-[2.05rem] top-6 w-px origin-top bg-black"
            initial={reduceMotion ? false : { scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={reduceMotion ? { duration: 0 } : { duration: TIMING.output, ease: [0.23, 1, 0.32, 1] }}
          />
          {SYSTEM_NODES.map((node, index) => (
            <li key={node.index} className="relative grid grid-cols-[4.25rem_1fr] border-b border-black/15 last:border-b-0">
              <div className="relative flex items-start justify-center pt-5">
                <m.span
                  aria-hidden
                  className={`relative z-10 h-3 w-3 border border-black ${index < 3 ? "bg-signal" : "bg-paper-bright"}`}
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.1, delay: TIMING.path + index * 0.035 }}
                />
              </div>
              <div className="min-w-0 border-l border-black/15 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-data text-[10px] text-coal-muted">{node.index} · {node.input}</p>
                    <p className="mt-1 text-sm font-semibold">{node.capability.name}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <CapabilityBadge maturity={node.capability.maturity} onLight />
                    {node.capability.dataMode && <DataModeLabel mode={node.capability.dataMode} onLight />}
                  </div>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-coal-muted">Output: {node.output}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </LazyMotion>
  );
}
