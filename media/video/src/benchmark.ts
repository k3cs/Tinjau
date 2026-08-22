/**
 * Scene 3 — "the simpler alternatives" — transcribed from
 * `docs/buildx-orion-2026/outputs/05-build/three-policy-benchmark.json` and the scene-3
 * block of `t6-5-three-scene-demo.md`, on 2026-08-22.
 *
 * The beat shows ONE scenario: `D-neutral-normal`, the benchmark's neutral control. It
 * is a routine insider Form 4, pre-registered `NORMAL` with
 * `mustHoldRegardlessOfMarketData: true`. Nothing about it warranted a fee change.
 *
 * WHY THE CONTROL AND NOT THE SHOWCASE. The benchmark cannot name an economic winner:
 * all 27 comparable cells flip sign between the two metric bases, and `canClaimLossAvoided`
 * is `false`. What it can determine is behavioural — whether a policy fired, when, and on
 * what. On the control, the volatility-only baseline fires at every threshold in the grid
 * and Tinjau fires at none. That finding arrives from the control rather than the
 * showcase, which is exactly what makes it credible, so the beat leads with it and never
 * claims an economic result.
 *
 * THE EPISODE TIMES ARE REAL. Every interval below is `policyBehaviour.episodes` from the
 * benchmark file, unix seconds, unmodified. Nothing here is drawn to look convincing.
 */

/**
 * The replay window, derived from the episodes rather than assumed.
 *
 * `protectionDurationSec` is documented as "clipped to the replay window", and all three
 * volatility rows clip to the same instant: k=5 triggers at 1786588870 and runs 1920s,
 * k=3 triggers at 1786576090 and runs 14700s, and both land on 1786590790. With the
 * scenario's 25,200s span that fixes the start at 1786565590.
 */
export const WINDOW = { start: 1_786_565_590, end: 1_786_590_790, spanSec: 25_200 } as const;

/**
 * The Form 4's acceptance, the instant every latency in the file is measured from.
 * Cross-checks three ways: k=2 fires 3000s before it, k=3 6900s after, k=5 19680s after,
 * and all three arithmetic give the same anchor.
 */
export const ANCHOR = 1_786_569_190;

export interface Episode {
  from: number;
  to: number;
}

export interface Lane {
  id: string;
  policy: string;
  /** The one parameter that distinguishes this row from its siblings. */
  setting: string;
  family: "volatility" | "tinjau";
  /** `policyBehaviour.episodes`, clipped to the window exactly as the file clips them. */
  episodes: Episode[];
  /** `policyBehaviour.maxFeeReachedPips` */
  maxFeePips: number;
  /** What the row did, in the file's own words, shortened. */
  behaviour: string;
  /** `policyBehaviour.falsePositive.label` */
  verdict: "FALSE POSITIVE" | "TRUE NEGATIVE";
}

export const LANES: Lane[] = [
  {
    id: "vol-2",
    policy: "Volatility only",
    setting: "fires at 2× normal",
    family: "volatility",
    episodes: [
      { from: 1_786_566_190, to: 1_786_587_790 },
      { from: 1_786_588_570, to: WINDOW.end },
    ],
    maxFeePips: 20_000,
    behaviour: "Twice, for 6h 37m in total",
    verdict: "FALSE POSITIVE",
  },
  {
    id: "vol-3",
    policy: "Volatility only",
    setting: "fires at 3× normal",
    family: "volatility",
    episodes: [{ from: 1_786_576_090, to: WINDOW.end }],
    maxFeePips: 20_000,
    behaviour: "Once, for 4h 5m",
    verdict: "FALSE POSITIVE",
  },
  {
    id: "vol-5",
    policy: "Volatility only",
    setting: "fires at 5× normal",
    family: "volatility",
    episodes: [{ from: 1_786_588_870, to: WINDOW.end }],
    maxFeePips: 20_000,
    behaviour: "Once, for 32m",
    verdict: "FALSE POSITIVE",
  },
  {
    id: "tinjau-150",
    policy: "Tinjau",
    setting: "acts from a 1.50% fall",
    family: "tinjau",
    episodes: [],
    maxFeePips: 500,
    behaviour: "Never. Fee held at 0.05%",
    verdict: "TRUE NEGATIVE",
  },
  {
    id: "tinjau-200",
    policy: "Tinjau",
    setting: "acts from a 2.00% fall",
    family: "tinjau",
    episodes: [],
    maxFeePips: 500,
    behaviour: "Never. Fee held at 0.05%",
    verdict: "TRUE NEGATIVE",
  },
  {
    id: "tinjau-300",
    policy: "Tinjau",
    setting: "acts from a 3.00% fall",
    family: "tinjau",
    episodes: [],
    maxFeePips: 500,
    behaviour: "Never. Fee held at 0.05%",
    verdict: "TRUE NEGATIVE",
  },
];

/**
 * The mechanism the control exposes, from §6.3 of `three-policy-benchmark.md`: T3.2
 * measured D's largest fall at 241 bps, ABOVE the 235 bps of scenario B's material
 * announcement. A policy reading price alone has nothing to separate them by.
 */
export const DRAWDOWN = {
  routineBps: 241,
  materialBps: 235,
  routineLabel: "Routine Form 4 (this control)",
  materialLabel: "Material announcement (scenario B)",
} as const;

/**
 * The economic result, printed in full because it refuses to pick a side. All three
 * lines are from `claimGate` and the scene-3 output; `canClaimLossAvoided` is `false`.
 */
export const ECONOMICS = [
  { against: "vs volatility only, pre-registered basis", cells: 27, outcome: "TINJAU BEATS" },
  { against: "vs volatility only, post-hoc basis", cells: 27, outcome: "TINJAU LOSES" },
  { against: "vs static fee, both bases", cells: 27, outcome: "TINJAU TIES" },
] as const;

export const BENCHMARK = {
  scenarioId: "D-neutral-normal",
  description: "A routine insider Form 4. Pre-registered NORMAL before any policy ran.",
  swapCount: 367,
  scenarioCount: 4,
  cellCount: 72,
  /** `claimGate.value` */
  canClaimLossAvoided: false,
} as const;

export const feePercent = (pips: number) => `${(pips / 10_000).toFixed(2)}%`;

/* ------------------------------------------------------------------ *
 * Beat 08 — the two events, on one axis.
 *
 * From §6.3 of `three-policy-benchmark.md`: T3.2 measured scenario D's maximum
 * drawdown at 241 bps, ABOVE scenario B's 235 bps. D is a routine insider Form 4
 * pre-registered NORMAL; B is the $105bn 8-K. The finding is that they are
 * indistinguishable by size, so the two values are plotted on ONE shared axis where
 * near-coincidence reads as near-coincidence. Two bars from zero would differ by a
 * few pixels and the graphic would need its caption to mean anything.
 * ------------------------------------------------------------------ */

export const EVENTS = {
  axisMaxBps: 300,
  material: {
    label: "The $105 billion announcement",
    detail: "Official 8-K · 17 August",
    bps: 235,
  },
  routine: {
    label: "A routine insider filing",
    detail: "Form 4 · 12 August · pre-registered NORMAL",
    bps: 241,
  },
  gapBps: 241 - 235,
} as const;

/** What each policy did with that routine filing. `maxFeeReachedPips` on scenario D. */
export const CONSEQUENCE = [
  { policy: "A policy watching price", feePips: 20_000, acted: true, note: "Fired at every threshold" },
  { policy: "Tinjau", feePips: 500, acted: false, note: "Did not act at any threshold" },
] as const;

/* ------------------------------------------------------------------ *
 * Beat 09 — the two pre-registered tests.
 * ------------------------------------------------------------------ */

/** `claimGate` in `three-policy-benchmark.json`. The gate its own authors closed. */
export const TEST_ONE = {
  name: "Does it save money?",
  frozenAt: "2026-08-20",
  outcome: "FAILED",
  rows: [
    { basis: "Scored the way we pre-registered", cells: 27, result: "TINJAU BEATS" },
    { basis: "Scored the other defensible way", cells: 27, result: "TINJAU LOSES" },
  ],
  note: "The sign flips with the metric. Both bases are published.",
} as const;

/**
 * S3.2, `s3-2-paired-pool-result.md`. Two builder-controlled testnet pools take the
 * same replayed trades; one enforces a Tinjau PROTECT, the other has no hook.
 *
 * The band is stated first because the frozen pre-registration requires the band to be
 * stated first whichever way it lands — and the document is explicit that the result
 * still does NOT license "Tinjau reduces LP loss".
 */
export const TEST_TWO = {
  name: "With the hook, and without it",
  frozenAt: "2026-08-20",
  ranAt: "2026-08-21",
  outcome: "CONFIRMS",
  marginBps: 195.38,
  marks: "Sign holds under all three marks · control run read exactly zero",
  prohibited: "Still does not license the sentence “Tinjau reduces LP loss”.",
  attempts: "Third execution. The first two are void, and both are published in full.",
  conditional: "Conditional on a PROTECT already being in force. It cannot say whether Tinjau protects at the right times.",
} as const;
