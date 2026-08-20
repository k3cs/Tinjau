"use client";

import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { scenarioTransition } from "@/lib/ui/motion";

export function ScenarioTransition({ scenario, children }: { scenario: string; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={scenario}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
          transition={reduceMotion ? { duration: 0 } : scenarioTransition}
        >
          {children}
        </m.div>
      </AnimatePresence>
    </LazyMotion>
  );
}
