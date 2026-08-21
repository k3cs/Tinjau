"use client";

import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";

import { reasonMeaning, type ReasonEffect } from "@/lib/risk/reason-codes";
import { staggerTransition } from "@/lib/ui/motion";
import type { RiskRecordView } from "@/lib/risk/model";

const EFFECT_TONE: Record<ReasonEffect, string> = {
  SUPPORTS: "border-l-normal",
  RESTRAINS: "border-l-watch",
  NEUTRAL: "border-l-edge-strong",
};

const EFFECT_LABEL: Record<ReasonEffect, string> = {
  SUPPORTS: "Argues for acting",
  RESTRAINS: "Holds the state down",
  NEUTRAL: "Recorded fact",
};

/**
 * Why the state is what it is, code by code, in plain language.
 *
 * Codes that *held the state down* are shown at the same weight as codes that
 * argued for acting. A `WATCH` is mostly explained by its restraints, so hiding
 * them would make the state unexplainable, which is exactly the failure this
 * screen exists to prevent.
 */
export function ReasonLedger({ record }: { record: RiskRecordView }) {
  const reduced = useReducedMotion();

  // Market-leg codes live on the confirmation object; record-level codes on the
  // record. Merged for reading, de-duplicated, order preserved.
  const codes = Array.from(
    new Set([...record.reasonCodes, ...record.marketConfirmation.reasonCodes]),
  );

  return (
    <LazyMotion features={domAnimation} strict>
      <section aria-labelledby="reason-ledger">
        <h2 id="reason-ledger" className="font-display text-heading-sm text-ink">
          Why this state
        </h2>
        <p className="mt-1 text-body-sm text-ink-muted">
          Every rule the engine recorded, including the ones that refused.
        </p>

        <ul className="mt-5 space-y-2">
          {codes.map((code, index) => {
            const meaning = reasonMeaning(code);
            return (
              <m.li
                key={code}
                initial={reduced ? false : { opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={reduced ? { duration: 0 } : staggerTransition(index, 0.035)}
                className={`rounded-lg border border-edge border-l-2 bg-canvas-sunken p-4 ${EFFECT_TONE[meaning.effect]}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-body text-body-sm font-medium text-ink">{meaning.title}</p>
                  <p className="data-label text-ink-faint">
                    {meaning.leg} · {EFFECT_LABEL[meaning.effect]}
                  </p>
                </div>
                <p className="mt-1.5 text-body-sm text-ink-muted">{meaning.plain}</p>
                {meaning.caveat ? (
                  <p className="mt-2.5 rounded border-l-2 border-watch bg-watch/[0.08] px-3 py-2 text-body-sm text-ink-secondary">
                    <span className="data-label text-watch">Assumed, not computed</span>
                    <span className="mt-1 block">{meaning.caveat}</span>
                  </p>
                ) : null}
                <p className="mt-2 font-data text-[10px] uppercase tracking-[0.06em] text-ink-faint">
                  {code}
                </p>
              </m.li>
            );
          })}
        </ul>
      </section>
    </LazyMotion>
  );
}
