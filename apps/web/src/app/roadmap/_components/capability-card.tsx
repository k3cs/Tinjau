"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";

import { CapabilityBadge } from "@/components/capability-badge";
import type { ProductCapability } from "@/lib/product/capabilities";
import { EASE_OUT } from "@/lib/ui/motion";

/**
 * A capability, with the thing that backs it available on demand.
 *
 * The section heading above this grid says every entry has a test or an
 * artifact behind it. That was previously an assertion a reader had to take on
 * trust: `evidence` and `stage` were in the data and nothing rendered them. So
 * the card discloses them, and the claim becomes checkable on the page that
 * makes it.
 *
 * Disclosure rather than always-open because the grid's job is the built /
 * not-built line, and eleven evidence strings compete with it. The summary and
 * the limitation stay visible unconditionally: the limitation is the honest
 * half and must never be the half behind a click.
 */
export function CapabilityCard({ capability }: { capability: ProductCapability }) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const panelId = useId();

  return (
    <article className="flex h-full flex-col p-6">
      <div className="flex flex-wrap items-center gap-2">
        <CapabilityBadge maturity={capability.maturity} />
        {capability.dataMode ? (
          <span className="data-label text-ink-faint">{capability.dataMode}</span>
        ) : null}
      </div>

      <h3 className="mt-3 font-display text-heading-sm text-ink">{capability.name}</h3>
      <p className="mt-2 text-body-sm text-ink-muted">{capability.summary}</p>
      <p className="mt-4 border-t border-edge pt-3 text-body-xs text-ink-faint">
        {capability.limitation}
      </p>

      <div className="mt-4 flex-1" />

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={panelId}
        className="-mx-2 inline-flex min-h-10 items-center gap-2 self-start rounded px-2 font-body text-body-xs font-medium text-ink-secondary transition-colors duration-150 ease-tinjau hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      >
        <m.span
          aria-hidden
          animate={{ rotate: open ? 90 : 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.2, ease: EASE_OUT }}
          className="inline-block font-data leading-none"
        >
          &rsaquo;
        </m.span>
        {open ? "Hide what backs this" : "What backs this"}
      </button>

      <LazyMotion features={domAnimation} strict>
        <AnimatePresence initial={false}>
          {open ? (
            <m.div
              id={panelId}
              key="panel"
              initial={reduced ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={reduced ? { duration: 0 } : { duration: 0.26, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <dl className="mt-3 border-t border-edge pt-3 text-body-xs">
                <dt className="data-label text-ink-faint">Stage</dt>
                <dd className="mt-1 font-data text-ink-secondary">{capability.stage}</dd>
                <dt className="data-label mt-3 text-ink-faint">Evidence</dt>
                <dd className="mt-1 font-data text-ink-secondary">{capability.evidence}</dd>
              </dl>
              {capability.href ? (
                <Link
                  href={capability.href}
                  className="mt-3 inline-flex min-h-10 items-center font-body text-body-xs font-medium text-ink underline underline-offset-2 hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2"
                >
                  See it on {capability.href}
                </Link>
              ) : null}
            </m.div>
          ) : null}
        </AnimatePresence>
      </LazyMotion>
    </article>
  );
}
