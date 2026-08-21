"use client";

import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { EASE_OUT } from "@/lib/ui/motion";

/**
 * Reveals a block once, as the reader scrolls to it.
 *
 * Deliberately small: a short rise and fade, no scale, no blur, no perpetual
 * motion. Under `prefers-reduced-motion` the element is rendered plainly with
 * no wrapper animation at all, so nothing is left mid-transition.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        className={className}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-64px" }}
        transition={{ duration: 0.45, ease: EASE_OUT, delay }}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
