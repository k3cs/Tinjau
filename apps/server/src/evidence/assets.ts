/**
 * Supported-asset registry: company -> token -> pool (task T2.2).
 *
 * This file closes the mapping defect T0.2 §2.2 recorded. The short version of that defect:
 * the system had one notion of "the NVDA token" and the chain has two.
 *
 *   - `NVDAx`  `0xc845b2…0849d` — "NVIDIA xStock", the unwrapped token.
 *   - `wNVDAx` `0xa8ddb5…50d5`  — "Wrapped NVIDIA xStock", the token that is actually in the
 *     USDG reference pool and the one the OKX index poller samples.
 *
 * `apps/server/src/chain/tokenAddresses.ts` maps the symbol `NVDAx` to `0xc845b2…`, which is
 * correct FOR THAT SYMBOL. The defect was never a wrong address; it was treating "the ticker
 * we track" and "the token our pool trades" as the same thing. They are different tokens, and
 * an action keyed to the wrong one would apply to a pool nobody is protecting.
 *
 * The rule this file establishes: a claim about a COMPANY resolves to a supported ASSET only
 * when that asset has a verified pool. `NVDAx` is listed and deliberately marked
 * unsupported — recording it as absent would lose the fact that it exists and is easy to
 * confuse with the supported one.
 *
 * Every address and decimal below was read live from `https://rpc.xlayer.tech` on 2026-08-20
 * via `symbol()`, `name()`, `decimals()`, `token0()` and `token1()`. None is transcribed from
 * another document.
 */

export interface SupportedAsset {
  /** Company name exactly as filed with the SEC. */
  company: string;
  cik: string;
  ticker: string;
  tokenSymbol: string;
  tokenAddress: `0x${string}`;
  tokenName: string;
  decimals: number;
  chainId: number;
  /** The pool an action would apply to. `null` means no action can be authorised for it. */
  poolAddress: `0x${string}` | null;
  quoteSymbol: string | null;
  /** Whether the OKX index poller produces a reference price for this exact address. */
  hasIndexFeed: boolean;
  /**
   * Whether this asset may carry a risk state that authorises an action.
   *
   * False is not "we forgot to add it". It means the asset is known, is easy to confuse with
   * a supported one, and must resolve to a refusal rather than to silence.
   */
  supported: boolean;
  /** Why it is or is not supported, in plain language, for the record. */
  supportNote: string;
}

export const SUPPORTED_ASSETS: readonly SupportedAsset[] = Object.freeze([
  {
    company: "NVIDIA CORPORATION",
    cik: "0001045810",
    ticker: "NVDA",
    tokenSymbol: "wNVDAx",
    tokenAddress: "0xa8ddb5cd96b5222afe198316e9a57caa642850d5",
    tokenName: "Wrapped NVIDIA xStock",
    decimals: 18,
    chainId: 196,
    poolAddress: "0x2a2b11730c2b6d99a58034a869dd810d7300a7b2",
    quoteSymbol: "USDG",
    hasIndexFeed: true,
    supported: true,
    supportNote:
      "The token in the USDG reference pool and the one the OKX index poller samples. This is " +
      "the only NVDA-linked asset on X Layer with both an observable market and a reference price.",
  },
  {
    company: "NVIDIA CORPORATION",
    cik: "0001045810",
    ticker: "NVDA",
    tokenSymbol: "NVDAx",
    tokenAddress: "0xc845b2894dbddd03858fd2d643b4ef725fe0849d",
    tokenName: "NVIDIA xStock",
    decimals: 18,
    chainId: 196,
    poolAddress: null,
    quoteSymbol: null,
    hasIndexFeed: false,
    supported: false,
    supportNote:
      "The unwrapped sibling of wNVDAx. Listed deliberately rather than omitted: it is the " +
      "address `tokenAddresses.ts` maps the symbol NVDAx to, so anything resolving a claim by " +
      "ticker alone can land here. It has no verified pool and no index feed, so no action can " +
      "be authorised against it. See the T0.2 §2.2 mapping defect.",
  },
] as const);

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

export type ResolutionOutcome =
  /** Exactly one supported asset. An action may be authorised. */
  | "RESOLVED"
  /** The company is known, but more than one candidate token matched. */
  | "AMBIGUOUS"
  /** A candidate matched but it has no verified pool. */
  | "UNSUPPORTED_ASSET"
  /** Nothing matched. */
  | "UNKNOWN_COMPANY";

export interface Resolution {
  outcome: ResolutionOutcome;
  /** The single supported asset, when and only when `outcome === "RESOLVED"`. */
  asset: SupportedAsset | null;
  /** Everything that matched, including unsupported candidates, so the call is checkable. */
  candidates: SupportedAsset[];
  /** Plain-language explanation, for the risk record's human explanation. */
  explanation: string;
  /**
   * Derived. True only for `RESOLVED`. Every action path must gate on this rather than
   * re-deriving the rule from `outcome`.
   */
  mayAuthorizeAction: boolean;
}

function normalizeName(value: string): string {
  return value.trim().toUpperCase().replace(/[.,]/g, "").replace(/\s+/g, " ");
}

/**
 * Resolves a claim's company/token hints to at most one supported asset.
 *
 * Deterministic. AI may propose the company and token strings, but this function decides
 * whether they name something the system will act on — which is the §0.6 split: the model
 * reads language, the deterministic layer validates supported assets and pools.
 *
 * @param company Company name from the claim. Matched case- and punctuation-insensitively.
 * @param tokenSymbol Optional token symbol hint. When present it narrows the candidates;
 * when absent, every token for the company is a candidate.
 * @param tokenAddress Optional address hint. The most precise signal available, and it wins
 * over the symbol when both are present — an address is unambiguous, a symbol is not.
 */
export function resolveAsset(
  company: string,
  tokenSymbol?: string | null,
  tokenAddress?: string | null,
): Resolution {
  const wantCompany = normalizeName(company ?? "");
  const byCompany = SUPPORTED_ASSETS.filter((a) => normalizeName(a.company) === wantCompany);

  if (byCompany.length === 0) {
    return {
      outcome: "UNKNOWN_COMPANY",
      asset: null,
      candidates: [],
      explanation: `No supported asset is registered for "${company}".`,
      mayAuthorizeAction: false,
    };
  }

  let candidates = byCompany;

  // Address is the most precise hint, so it narrows first and alone.
  if (tokenAddress && tokenAddress.trim().length > 0) {
    const want = tokenAddress.trim().toLowerCase();
    candidates = candidates.filter((a) => a.tokenAddress.toLowerCase() === want);
    if (candidates.length === 0) {
      return {
        outcome: "UNKNOWN_COMPANY",
        asset: null,
        candidates: byCompany,
        explanation:
          `Address ${tokenAddress} is not a registered token for ${company}. ` +
          `Registered: ${byCompany.map((a) => `${a.tokenSymbol} ${a.tokenAddress}`).join(", ")}.`,
        mayAuthorizeAction: false,
      };
    }
  } else if (tokenSymbol && tokenSymbol.trim().length > 0) {
    const want = tokenSymbol.trim().toUpperCase();
    const narrowed = candidates.filter((a) => a.tokenSymbol.toUpperCase() === want);
    // An unrecognised symbol must not silently widen back to every token for the company.
    if (narrowed.length === 0) {
      return {
        outcome: "UNKNOWN_COMPANY",
        asset: null,
        candidates: byCompany,
        explanation:
          `Token symbol "${tokenSymbol}" is not registered for ${company}. ` +
          `Registered: ${byCompany.map((a) => a.tokenSymbol).join(", ")}.`,
        mayAuthorizeAction: false,
      };
    }
    candidates = narrowed;
  }

  const supported = candidates.filter((a) => a.supported && a.poolAddress !== null);

  if (supported.length === 1) {
    return {
      outcome: "RESOLVED",
      asset: supported[0],
      candidates,
      explanation:
        `${company} resolves to ${supported[0].tokenSymbol} (${supported[0].tokenAddress}) ` +
        `in pool ${supported[0].poolAddress}.`,
      mayAuthorizeAction: true,
    };
  }

  if (supported.length > 1) {
    return {
      outcome: "AMBIGUOUS",
      asset: null,
      candidates,
      explanation:
        `${company} matches ${supported.length} supported tokens ` +
        `(${supported.map((a) => a.tokenSymbol).join(", ")}). A claim that does not name one ` +
        `cannot authorise an action against a specific pool.`,
      mayAuthorizeAction: false,
    };
  }

  // Candidates exist but none is supported. This is the NVDAx case, and the explanation names
  // the supported sibling so the near-miss is obvious rather than mysterious.
  const sibling = byCompany.find((a) => a.supported);
  return {
    outcome: "UNSUPPORTED_ASSET",
    asset: null,
    candidates,
    explanation:
      `${candidates.map((a) => a.tokenSymbol).join(", ")} has no verified pool, so no action can ` +
      `be authorised against it.` +
      (sibling ? ` The supported token for ${company} is ${sibling.tokenSymbol}.` : ""),
    mayAuthorizeAction: false,
  };
}

/** Lookup by exact address. Returns unsupported assets too, so callers can explain a refusal. */
export function assetByAddress(address: string): SupportedAsset | undefined {
  const want = address.trim().toLowerCase();
  return SUPPORTED_ASSETS.find((a) => a.tokenAddress.toLowerCase() === want);
}

export function isSupportedAddress(address: string): boolean {
  const asset = assetByAddress(address);
  return asset !== undefined && asset.supported && asset.poolAddress !== null;
}
