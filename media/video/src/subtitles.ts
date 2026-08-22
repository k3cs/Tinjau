import { BEAT_STARTS, FPS, SHOTS } from "./timing";

/**
 * The narration, cued to frames.
 *
 * Wording comes from the storyboard artifact *The Tinjau Cut*, except where `SCRIPT.md`
 * replaced it — beats 04, 05 and 09 carry their corrected lines, because the originals
 * credited the model with work it does not do, said four outlets traced to the Journal
 * when the evidence graph records two, and left beat 09's last line open before the
 * paired-pool test had run.
 *
 * Cues are stored per beat and WEIGHTED BY WORD COUNT, then spread across whatever that
 * beat's duration currently is. Nothing here is a hand-typed timestamp, so changing
 * `timing.ts` re-times the whole track and the burned-in captions and the `.srt` cannot
 * drift apart. A cue can never cross a beat boundary by construction, so a line is never
 * held over the wrong picture.
 *
 * The last cue of each beat runs to the end of the beat, which means it stays up through
 * the still hold — that hold is reading time, and a sentence on screen during it is the
 * point rather than a leftover.
 */

const words = (s: string) => s.trim().split(/\s+/).length;

/** One entry per beat, in `SHOTS` order. */
const LINES: string[][] = [
  // 01 — The pool doesn't sleep
  [
    "Someone put money into a pool holding tokenised Nvidia shares.",
    "Where they live it's the middle of the night. They're asleep.",
    "The pool isn't.",
  ],
  // 02 — The report goes around
  [
    "Then a report: Nvidia in talks for a two hundred and fifty billion dollar deal.",
    "CNBC has it. So do three more outlets.",
    "Five reports in one evening.",
  ],
  // 03 — Two ways to get it wrong
  ["A pool can get this wrong twice over.", "Ignore it, or believe it."],
  // 04 — Five reports, one source (corrected in SCRIPT.md)
  [
    "Tinjau reads the reports themselves.",
    "Two name the Journal in their own words.",
    "One names no source at all. One we wrote ourselves, as a test.",
    "Five claims, one usable source. Pay attention. Change nothing.",
  ],
  // 05 — The model never touches the money (corrected in SCRIPT.md)
  [
    "That call was never the model's to make.",
    "It reads the filing three times and reports where the three readings disagree.",
    "It can't set a fee and it can't authorise anything. The contract does that.",
  ],
  // 06 — Three weeks later, the real number
  [
    "Three weeks later the company files the real thing.",
    "The real number is a hundred and five billion.",
    "The report going round was more than twice too big.",
  ],
  // 07 — It acts briefly, then puts itself back
  [
    "Now the pool may protect itself — but only when the market agrees too,",
    "and that gate refuses far more often than it fires.",
    "The fee goes up, capped at two percent, then winds itself back down.",
    "Nobody has to switch it off.",
  ],
  // 08 — The boring one moved it more
  [
    "Here's what surprised us.",
    "Days earlier, routine paperwork moved the price more than that hundred-billion announcement did.",
    "A system watching only price raised its fee on the boring one. Tinjau didn't.",
  ],
  // 09 — Two tests, written before they were run (corrected in SCRIPT.md)
  [
    "Does it save money?",
    "We wrote down what counts as success before running anything.",
    "The first test failed.",
    "The second ran two identical pools through the same trades — one protected, one not. It confirmed.",
    "It still doesn't let us say Tinjau reduces LP loss.",
  ],
  // 10 — A different contract reads it
  [
    "That record is where this stops being ours.",
    "Here's a different contract reading it and deciding for itself —",
    "no permission, no API key, nothing of ours anywhere in the path.",
  ],
  // 11 — The fault we found and handed back
  [
    "Building on this network, we found a fault in it:",
    "a read can come back seconds behind a write that already happened.",
    "We measured it, wrote down how to reproduce it,",
    "and handed it back.",
  ],
  // 12 — The edges, then the address
  [
    "Our pool is ours, the tokens are test tokens,",
    "and nobody outside uses this yet.",
    "Every limit is on the site.",
  ],
];

export interface Cue {
  /** Absolute frame in the film. */
  from: number;
  to: number;
  text: string;
}

function buildCues(): Cue[] {
  const out: Cue[] = [];
  LINES.forEach((lines, beat) => {
    const start = BEAT_STARTS[beat];
    const span = SHOTS[beat].frames;
    const weights = lines.map(words);
    const total = weights.reduce((a, b) => a + b, 0);
    let cum = 0;
    lines.forEach((text, i) => {
      const from = start + Math.round((span * cum) / total);
      cum += weights[i];
      const to = start + Math.round((span * cum) / total);
      out.push({ from, to, text });
    });
  });
  return out;
}

export const CUES: Cue[] = buildCues();

/** Frames → `HH:MM:SS,mmm`, the SubRip timestamp format. */
const srtTime = (frame: number) => {
  const ms = Math.round((frame / FPS) * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const rem = ms % 1000;
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(h)}:${p(m)}:${p(s)},${p(rem, 3)}`;
};

/** The same cues as a sidecar `.srt`, so the film can also ship with soft subtitles. */
export const toSrt = (cues: Cue[] = CUES): string =>
  cues
    .map((c, i) => `${i + 1}\n${srtTime(c.from)} --> ${srtTime(c.to)}\n${c.text}\n`)
    .join("\n");
