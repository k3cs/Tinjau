/**
 * The evidence shown in beat 04, transcribed from the frozen scenario in
 * `docs/buildx-orion-2026/outputs/05-build/frontend-handoff/scenario-rumor-watch.json`
 * (scenario id `A-rumor-watch`) and the scene-1 block of
 * `docs/buildx-orion-2026/outputs/05-build/t6-5-demo-manifest.json`.
 *
 * Re-transcribed on 2026-08-22 against the finished codebase. The first pass had the
 * mechanism wrong in a way that mattered, so the corrections are recorded here rather
 * than quietly applied:
 *
 *   1. DataCenterDynamics is NOT a syndication of the Journal. The graph gives it
 *      `isSyndication: false`, `derivedOriginKey: "unrecognised:datacenterdynamics.com"`
 *      and `relaysUnnamedReport: true` — its headline ends "- report", so it relays an
 *      unnamed report and its origin cannot be recognised at all. The earlier version
 *      drew a lime connector from it into the Journal, inventing exactly the kind of
 *      edge the header of this file warns against.
 *   2. TWO claims are syndications, not three. `confidenceFactors[0]` states it
 *      literally: "2 claim(s) attribute their reporting to another outlet".
 *   3. The decision time is `2026-07-28T02:33:00Z` (`record.assessedAt`). The earlier
 *      `2026-07-27T20:33Z` is The Next Web's publication time, not a decision anchor.
 *   4. The social claim's text was invented. The real fixture text is in
 *      `apps/server/scenarios/sources/simulated-rumor-2026-07-27-social.json`.
 *
 * So the five claims resolve into THREE derived origin keys, only one of which is
 * usable:
 *
 *   - `wsj` — three claims: the Journal itself plus CNBC and The Next Web, both of
 *     which name the Journal in their own copy. This is the one usable origin.
 *   - `unrecognised:datacenterdynamics.com` — one claim, relaying an unnamed report.
 *   - `unrecognised:simulated:` — one claim, written by this project as a safety test.
 *
 * Which is why the scenario records five claims, `independentOriginCount: 1` and
 * `usableOriginCount: 1`.
 *
 * GEOMETRY. Every box sits on one grid and the four ingested claims share a single
 * baseline. The frame is split down the middle: the origin group collapses on the
 * left, the two unrecognised claims sit on the right.
 */

export type SourceClass = "NEWS" | "RUMOR";

export interface Claim {
  id: string;
  outlet: string;
  /** Shortened from the verbatim text in the scenario file, never paraphrased. */
  fragment: string;
  sourceClass: SourceClass;
  /** The line the card prints once the graph has classified it. */
  attribution: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/* ------------------------------------------------------------------ *
 * Grid. 1920 × 1080, 80px margins, split at the centre line.
 * ------------------------------------------------------------------ */

export const MARGIN = 80;
export const GUTTER = 32;

/** Every card's inner inset. Exported because text outside a card has to match it. */
export const CARD_PAD = 22;

/** Where the divider between the two mechanisms sits. */
export const DIVIDER_X = 960;

const LEFT = { x: MARGIN, w: 820 };
const RIGHT = { x: 1020, w: 820 };

export const CARD_W = Math.round((LEFT.w - GUTTER) / 2); // 394
export const CARD_H = 200;
export const ROW_Y = 168;

/** The horizontal bus the two connectors turn onto before entering the origin. */
export const BUS_Y = 392;

export const ORIGIN_ENTRY_FRACTIONS = [0.3, 0.7];

/**
 * The one text column the whole right field aligns to. The card bleeds `CARD_PAD` past
 * it on both sides, so the card's own text and every block beneath it share one left
 * edge.
 */
export const RIGHT_TEXT = { x: RIGHT.x + CARD_PAD, w: RIGHT.w - CARD_PAD * 2 };

/** Where the origin ledger starts. Sized so it clears the readout panel at 704. */
export const LEDGER_Y = 372;

/** The two claims that name the Journal in their own copy. */
export const SYNDICATIONS: Claim[] = [
  {
    id: "claim-a-002",
    outlet: "CNBC",
    fragment: "Nvidia and OpenAI in talks for up to $250 billion backstop to fund AI infrastructure plans",
    sourceClass: "NEWS",
    attribution: "NAMES THE WALL STREET JOURNAL",
    x: LEFT.x,
    y: ROW_Y,
    w: CARD_W,
    h: CARD_H,
  },
  {
    id: "claim-a-003",
    outlet: "The Next Web",
    fragment:
      "Nvidia is in talks to provide roughly $250 billion in financing guarantees for OpenAI, the Wall Street Journal reported on Sunday",
    sourceClass: "NEWS",
    attribution: "NAMES THE WALL STREET JOURNAL",
    x: LEFT.x + CARD_W + GUTTER,
    y: ROW_Y,
    w: CARD_W,
    h: CARD_H,
  },
];

/** The one story the two above are both naming. Centred under them. */
export const ORIGIN: Claim = {
  id: "claim-a-004",
  outlet: "The Wall Street Journal",
  fragment: "Nvidia is in talks to provide roughly $250 billion in financing guarantees for OpenAI",
  sourceClass: "NEWS",
  attribution: "ORIGINAL REPORT · NAMED BY TWO",
  x: LEFT.x + Math.round((LEFT.w - 620) / 2), // 180
  y: 424,
  w: 620,
  h: 175,
};

/**
 * The two claims whose origin the graph could not recognise. They fail for different
 * reasons and the frame keeps those reasons separate.
 */
export const UNRECOGNISED: Claim[] = [
  {
    id: "claim-a-005",
    outlet: "DataCenterDynamics",
    // The trailing "- report" is the whole reason this claim cannot be traced, so it
    // stays in the fragment. Dropping it, as the first version did, removed the
    // evidence for the card's own verdict.
    fragment:
      "Nvidia considers $250bn backstop for OpenAI's planned 10GW Ohio data center — report",
    sourceClass: "NEWS",
    attribution: "RELAYS A REPORT IT DOES NOT NAME",
    x: RIGHT.x,
    y: ROW_Y,
    w: CARD_W,
    h: CARD_H,
  },
  {
    id: "claim-a-001",
    outlet: "Social post",
    fragment:
      "hearing NVDA is on the hook for a quarter trillion of OpenAI datacenter debt guarantees. nothing signed, nobody confirming",
    sourceClass: "RUMOR",
    attribution: "SIMULATED · WRITTEN AS A SAFETY TEST",
    x: RIGHT.x + CARD_W + GUTTER,
    y: ROW_Y,
    w: CARD_W,
    h: CARD_H,
  },
];

/**
 * The origin ledger — the scenario's `independence` block stated plainly.
 *
 * The raw grouping keys are `wsj`, `unrecognised:datacenterdynamics.com` and
 * `unrecognised:simulated:`. They are NOT shown: an abbreviation a viewer has to
 * decode is a failure of the frame, not a shorthand.
 */
export const ORIGIN_GROUPS = [
  {
    name: "The Wall Street Journal",
    detail: "3 claims, including its own report",
    verdict: "COUNTS ONCE",
    usable: true,
  },
  {
    name: "DataCenterDynamics",
    detail: "Names no source it can be traced to",
    verdict: "NOT COUNTED",
    usable: false,
  },
  {
    name: "Social post",
    detail: "Simulated, written by this project",
    verdict: "NOT COUNTED",
    usable: false,
  },
] as const;

/**
 * The decision, straight out of the scenario file and the demo manifest. Fee figures
 * are Uniswap v4 pips (hundredths of a bip): 500 = 0.05%, 7000 = 0.70%, 20000 = 2.00%.
 */
export const DECISION = {
  /** `record.assessedAt`. NOT the 20:33 publication time of The Next Web. */
  decidedAt: "2026-07-28T02:33Z",
  claimCount: 5,
  /** `evidenceGraph.usableOriginCount` */
  usableOrigins: 1,
  /** `record.state` */
  state: "WATCH",
  /** `record.confidenceBand` */
  confidence: "LOW",
  /** `action.baseFee`, and `feeChargedByThePool` in the demo manifest. */
  feeChargedPips: 500,
  /** `derived.policyTargetFee` — the most a LOW-confidence reading may ever ask for. */
  confidenceCapPips: 7000,
  /** `action.maxFee` — the contract's hard ceiling. */
  maxFeePips: 20000,
} as const;

/** `onChain` in the scenario file, cross-checked against `t7-2-authoritative-addresses.json`. */
export const ON_CHAIN = {
  networkLabel: "X Layer Testnet",
  chainId: 1952,
  assessmentTx: "0x025ca92d8d477af734d3e7ce0e7465bf3afc0b1d511acf4fc184c5add1178671",
  swapTx: "0xb801240c05b3477f6e2505ba51ee9b14e71fbc5527fbc6b0b15e142a8409cf4e",
  swapBlock: 38_825_930,
} as const;

/** Shorten a hash for display without ever implying it is the whole value. */
export const shortHash = (h: string) => `${h.slice(0, 10)}…${h.slice(-8)}`;

export const feePercent = (pips: number) => `${(pips / 10_000).toFixed(2)}%`;
