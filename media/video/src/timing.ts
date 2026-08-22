/**
 * The film's clock. One source for how long every beat runs and how fast it moves,
 * so `Root.tsx`, `Film.tsx` and `subtitles.ts` can never disagree about the timeline.
 *
 * The first cut ran at the storyboard's own 1:59. That was enough time to WATCH each
 * beat and not enough to READ one — several frames carry a ledger, a readout panel and
 * a disclosure, and a viewer needs to finish the picture before the next shot arrives.
 *
 * Two separate dials do that, and they are separate on purpose:
 *
 *   PACE stretches the motion inside a beat. At 1.4 every entrance, sweep and spring
 *   takes 40% longer. It is NOT set higher than that, because the review of the first
 *   cut said the speed itself was fine; this is breathing room, not slow motion.
 *
 *   The durations below then run 1.6× the storyboard's, so what is left over after the
 *   motion finishes is a still hold of 3–6 seconds on the completed frame. That hold is
 *   the actual reading time, and it is where most of the added length goes.
 *
 * Total 5,712 frames = 3:10.4 at 30fps, inside the 3:30 ceiling.
 */

/** How much longer every animation inside a beat takes. 1 = the original cut. */
export const PACE = 1.4;

export const FPS = 30;

export interface Shot {
  id: string;
  /** Storyboard duration in frames, at 30fps. */
  storyboard: number;
  frames: number;
}

const STRETCH = 1.6;
const shot = (id: string, storyboard: number): Shot => ({
  id,
  storyboard,
  frames: Math.round(storyboard * STRETCH),
});

export const SHOTS: Shot[] = [
  shot("Beat01", 240),
  shot("Beat02", 270),
  shot("Beat03", 150),
  shot("Beat04", 360),
  shot("Beat05", 270),
  shot("Beat06", 240),
  shot("Beat07", 360),
  shot("Beat08", 300),
  shot("Beat09", 450),
  shot("Beat10", 360),
  shot("Beat11", 360),
  shot("Beat12", 210),
];

export const FILM_FRAMES = SHOTS.reduce((n, s) => n + s.frames, 0);

/** Absolute start frame of each beat, in the same order as `SHOTS`. */
export const BEAT_STARTS = SHOTS.reduce<number[]>((acc, s, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + SHOTS[i - 1].frames);
  return acc;
}, []);
