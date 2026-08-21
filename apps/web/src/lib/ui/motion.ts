/**
 * Motion vocabulary.
 *
 * Motion here explains sequence and state change and nothing else. Every value
 * below is short enough to read as a settle rather than a performance, and no
 * correctness depends on an animation finishing. `useReducedMotion` collapses
 * each of these to an instant cut.
 */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** State change on an existing element. */
export const scenarioTransition = { duration: 0.26, ease: EASE_OUT } as const;

/** New information arriving. */
export const evidenceTransition = { duration: 0.42, ease: EASE_OUT } as const;

/** Section entrance as the reader scrolls to it. */
export const sectionTransition = { duration: 0.5, ease: EASE_OUT } as const;

/** Rows in an ordered list, revealed in reading order. */
export function staggerTransition(index: number, step = 0.05) {
  return { duration: 0.36, ease: EASE_OUT, delay: index * step } as const;
}

export const riseIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
} as const;

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
} as const;
