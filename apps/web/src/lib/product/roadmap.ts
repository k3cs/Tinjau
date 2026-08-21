/**
 * Work that does not exist yet.
 *
 * Every item here is explicitly out of scope for this build (tracker §2
 * "Explicitly out of scope" and §5/§6), and §0.19 forbids presenting any of it
 * as shipped. So the type has no "progress" field, no percentage, and no date.
 * there is nothing to be part-way through. Each item instead records what would
 * have to become true first, which is the honest version of a timeline.
 */
export type RoadmapHorizon = "NEXT" | "LATER" | "REQUIRES_ACCESS";

export interface RoadmapItem {
  id: string;
  title: string;
  /** What it would do, in the conditional. Never the present tense. */
  intent: string;
  /** The condition that gates it. */
  blockedBy: string;
  horizon: RoadmapHorizon;
}

export const ROADMAP_HORIZON_LABEL: Record<RoadmapHorizon, string> = {
  NEXT: "Next, if the MVP holds up",
  LATER: "Later",
  REQUIRES_ACCESS: "Needs access we do not have",
};

export const ROADMAP: RoadmapItem[] = [
  {
    id: "live-news",
    title: "Live news and social discovery",
    intent:
      "Would replace the frozen replay fixtures with continuous intake, so a claim could be assessed as it appears rather than after the fact.",
    blockedBy:
      "No live provider is authorised for this MVP. Every claim in the product today is replayed or, in one case, written by us. Nothing here supports a latency or coverage claim.",
    horizon: "NEXT",
  },
  {
    id: "okx-index-live",
    title: "Live OKX index leg",
    intent:
      "Would let confirmation rest on two venues instead of one, which is what the design assumes.",
    blockedBy:
      "Index history is not available retroactively, so the OKX leg is UNAVAILABLE on every frozen scenario. Until a live feed runs alongside the pool leg, there is no dual-venue confirmation to show.",
    horizon: "NEXT",
  },
  {
    id: "signed-orchestration",
    title: "Signed end-to-end orchestration",
    intent:
      "Would post assessments from a production assessor key with an independent lifecycle, rather than a key derived from the poster.",
    blockedBy:
      "The current assessor key is derived from the poster key, which is acceptable on testnet and not in production. A derived key shares the fate of its parent.",
    horizon: "NEXT",
  },
  {
    id: "third-party-consumers",
    title: "Other applications reading the record",
    intent:
      "Would let wallets, market makers and agents read the risk record and choose their own response to it.",
    blockedBy:
      "A reference consumer exists and was built by us, which proves the record is readable without our dashboard. It is not adoption, and this project claims none.",
    horizon: "LATER",
  },
  {
    id: "sdk",
    title: "A general SDK",
    intent: "Would package the risk record and its decoders for someone else's codebase.",
    blockedBy: "Out of scope for the MVP. Nothing has been designed or written.",
    horizon: "LATER",
  },
  {
    id: "mainnet",
    title: "Mainnet deployment and real liquidity",
    intent:
      "Would move the registry, hook and pool off a builder-controlled testnet onto a market that is not ours.",
    blockedBy:
      "Every pool in this build is builder-controlled with freely-mintable mock tokens. Real liquidity needs an audit, a production envelope watched end to end, and a decision that is not an agent's to make.",
    horizon: "LATER",
  },
  {
    id: "exchange-os",
    title: "Exchange OS adapter",
    intent:
      "Would distribute the risk record through the wider OKX ecosystem and, eventually, act through it.",
    blockedBy:
      "Its production interface and access have not been verified. No integration exists, and none is claimed.",
    horizon: "REQUIRES_ACCESS",
  },
  {
    id: "x402",
    title: "Metered access to the risk feed",
    intent: "Would let a consumer pay per read rather than run its own pipeline.",
    blockedBy:
      "There is no evidence anyone wants to buy this yet. Building a market before finding one is how a product acquires a feature nobody uses.",
    horizon: "REQUIRES_ACCESS",
  },
];
