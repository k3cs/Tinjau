"use client";

import { useEffect, useRef } from "react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { CapabilityBadge } from "@/components/capability-badge";
import { DataModeLabel } from "@/components/data-mode-label";
import type { MissionModal } from "@/lib/demo/mission-types";
import { getCapability } from "@/lib/product/capabilities";

export function StateExplanationModal({ modal, onClose }: { modal: MissionModal; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const capability = getCapability(modal.capabilityId);

  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement;
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button, [href], [tabindex]:not([tabindex='-1'])"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); returnFocusRef.current?.focus(); };
  }, [onClose]);

  return (
    <LazyMotion features={domAnimation}>
      <m.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 py-8" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.18 }}>
        <m.div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="state-modal-title" aria-describedby="state-modal-cause" className="max-h-full w-full max-w-2xl overflow-y-auto border border-edge-strong bg-canvas text-ink" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.23, 1, 0.32, 1] }}>
          <div className="flex items-start justify-between gap-6 border-b border-edge px-5 py-5 sm:px-6">
            <div><div className="flex flex-wrap gap-2"><CapabilityBadge maturity={capability.maturity} /><DataModeLabel mode={modal.dataMode} /></div><h2 id="state-modal-title" className="mt-5 font-display text-3xl font-bold tracking-display">{modal.title}</h2>{modal.previousState && modal.nextState && <p className="mt-3 font-data text-xs text-ink-muted">{modal.previousState} → {modal.nextState}</p>}</div>
            <button ref={closeRef} type="button" onClick={onClose} className="inline-flex min-h-11 min-w-11 items-center justify-center border border-edge text-ink-secondary transition-colors duration-150 ease-tinjau hover:border-white hover:text-ink" aria-label="Close state explanation">
              <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" /></svg>
            </button>
          </div>
          <div className="grid sm:grid-cols-2">
            <ModalField label="Cause" value={modal.cause} id="state-modal-cause" />
            <ModalField label="Supporting evidence" value={modal.evidence} />
            <ModalField label="Active guardrail" value={modal.guardrail} />
            <ModalField label="Allowed now" value={modal.allowed} />
            <ModalField label="Prohibited now" value={modal.prohibited} wide />
          </div>
          <div className="border-t border-edge px-5 py-4 sm:px-6"><button type="button" onClick={onClose} className="inline-flex min-h-11 w-full items-center justify-center bg-signal px-5 font-data text-[11px] font-semibold uppercase tracking-[0.06em] text-black transition-colors duration-150 ease-tinjau hover:bg-signal-soft">Return to mission</button></div>
        </m.div>
      </m.div>
    </LazyMotion>
  );
}

function ModalField({ label, value, wide = false, id }: { label: string; value: string; wide?: boolean; id?: string }) {
  return <section className={`border-b border-edge px-5 py-5 sm:px-6 ${wide ? "sm:col-span-2" : "sm:border-r sm:even:border-r-0"}`}><h3 className="font-data text-[10px] uppercase tracking-[0.06em] text-ink-muted">{label}</h3><p id={id} className="mt-2 text-sm leading-relaxed text-ink-secondary">{value}</p></section>;
}
