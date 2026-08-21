"use client";

import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { useId } from "react";

export interface SegmentOption {
  value: string;
  label: string;
  /** Optional short qualifier shown under the label, e.g. a data mode. */
  hint?: string;
}

/**
 * A tab rail with a single sliding indicator.
 *
 * Real `role="tab"` buttons, so arrow keys and screen readers work without
 * extra handling. The indicator is one shared layout element rather than a
 * per-tab border, which is why the movement reads as "the same marker moved"
 * instead of "one thing vanished and another appeared". Under reduced motion
 * the marker jumps rather than travels.
 */
export function Segmented({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const layoutId = useId();
  const reduced = useReducedMotion();

  return (
    <LazyMotion features={domAnimation} strict>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex flex-wrap gap-1 rounded-xl border border-edge bg-canvas-sunken p-1"
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(option.value)}
              className={`relative min-h-11 flex-1 rounded-lg px-4 py-2 text-left transition-colors duration-150 ease-tinjau ${
                selected ? "text-black" : "text-ink-muted hover:text-ink"
              }`}
            >
              {selected ? (
                <m.span
                  layoutId={layoutId}
                  transition={
                    reduced ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
                  }
                  className="absolute inset-0 rounded-lg bg-signal"
                  aria-hidden
                />
              ) : null}
              <span className="relative block font-body text-body-sm font-medium">
                {option.label}
              </span>
              {option.hint ? (
                <span
                  className={`relative mt-0.5 block font-data text-[10px] uppercase tracking-[0.06em] ${
                    selected ? "text-black/70" : "text-ink-faint"
                  }`}
                >
                  {option.hint}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </LazyMotion>
  );
}
