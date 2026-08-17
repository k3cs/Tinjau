> **SUPERSEDED 2026-08-16 — THIS DOCUMENT'S CENTRAL FINDING IS WRONG.**
> xStocks *are* live on X Layer. NVDAx verified on-chain at `0xc845b2894dbddd03858fd2d643b4ef725fe0849d`
> (chain 196, `name="NVIDIA xStock"`, 1,627 holders, $478,411 DEX liquidity), alongside ten more
> tokenised equities totalling ~$3.8M liquidity and ~$68M market cap.
> The error: DeFiLlama classifies *protocols*, so tokens held in DEX pools show no "RWA protocol",
> and xstocks.com's supported-chain list is marketing copy that lags deployment. Absence of a label
> was read as absence of the thing. Corrected in `u1-u5-verification.md` §U0.
> Kept unedited below as the record of the mistake.

# X Layer RWA Reality Check

- Date: 2026-08-16
- Question: is any RWA asset live on X Layer today, or is the RWA push announcement-only? This decides whether EXITPROOF has a native probe target.
- Answer: **announcement-only.** No RWA asset is live on X Layer as of 2026-08-16.

## Evidence

**E1 — xStocks does not support X Layer.** `[Fakta]` xstocks.com lists its supported chains as Ethereum, Solana, BNB Smart Chain, Mantle, TON, and Ink, followed by "More Coming Soon". X Layer is not among them. `[Fakta]` DeFiLlama records xStocks TVL on Solana and Arbitrum only.

**E2 — the X Layer / xStocks relationship is a stated intention, not a deployment.** `[Fakta]` OKX's founder posted *"Looking forward to seeing xStocks on X Layer, bringing tokenized equities and RWA assets into the ecosystem."* Forward-looking by its own wording.

**E3 — the Hamilton Lane fund behind STBL is not on X Layer.** `[Fakta]` DeFiLlama places the Hamilton Lane Senior Credit Opportunities Securitize Fund on Polygon and Ethereum. `[Fakta]` No protocol named STBL appears in DeFiLlama's protocol set at all. The February 2026 announcement described a launch that has not shown up in public on-chain data.

**E4 — X Layer's live DeFi contains no RWA protocol.** `[Fakta]` Chain TVL is **$115.8M**. Protocols with more than $1k TVL, top of list: Aave V3 $79.1M, Uniswap V3 $23.5M, PotatoSwap V2 $5.9M, Curve $3.3M, DyorSwap $1.6M, Uniswap V2 $0.67M, Uniswap V4 $0.49M, plus ~25 smaller DEXs, two more lending markets, and bridges. `[Fakta]` Not one RWA protocol appears in the 32 entries.

**E5 — the large OKX number on X Layer is exchange custody, not DeFi.** `[Fakta]` DeFiLlama attributes $2.95B on X Layer to "OKX [CEX]". `[Inferensi]` That is exchange reserves, not assets a probe wallet could hold or redeem. OKX's July 2026 tokenized-stock product trades inside the exchange against USDT; that is not a self-custodied on-chain token with a public exit path.

**E6 — no xStocks liquidity on X Layer.** `[Fakta]` A DEX aggregator search for XAAPL returns one pair, on Solana, and it is an unrelated meme token. No X Layer pair exists.

## What this changes

`[Fakta]` **Fable's closing argument is wrong.** It claimed *"every probe is a real X Layer transaction, which is exactly the onchain-data and ecosystem-contribution evidence Event A scores."* There is nothing on X Layer to probe.

`[Inferensi]` My own earlier correction was directionally right but understated. I said probes would be cross-chain because the major treasuries live elsewhere. The stronger statement is that **X Layer currently has no RWA subject matter at all**, so an RWA verification product deployed there would score the assets of other chains.

`[Inferensi]` This does not kill the direction. It forks it, and the fork is a real decision rather than a detail.

## The fork

**Path A — EXITPROOF-RWA.** Contest the 50,000 USDT AI-RWA Liquidity Grant. Probe subjects are cross-chain (deny-list tokens such as USDY are directly probeable; allowlist tokens such as BUIDL and OUSG can only be measured on secondary-market exit, which is liquidity and must never be called backing). X Layer holds the registry, the score, the bonded challenge, and the reference consumer contract.

`[Inferensi]` The honest pitch is *"the verification layer arriving ahead of the assets OKX has publicly committed to bring"* — which is a genuine ecosystem contribution to a chain whose organizer announced an RWA strategy in February and has not shipped it. `[Inferensi]` It must never be pitched as verifying X Layer RWAs, because there are none.

**Path B — EXITPROOF-native.** Same mechanism, aimed at what is actually on X Layer today: $79.1M in Aave V3, $23.5M in Uniswap V3, Curve, and three lending markets. "Can you actually get out, at what size, at what slippage, under what conditions" is equally unanswered for a lending position or a concentrated LP position, and equally unpublished.

`[Inferensi]` Every probe would then be a real X Layer transaction — the thing Fable claimed but could not have. Real subject matter today, stronger "onchain data" evidence, genuine ecosystem contribution to X Layer's actual DeFi. The cost is leaving the AI-RWA grant and competing in the general 30k/15k/5k pool.

## Open items closed and opened

- Closed: no native X Layer probe target exists.
- Opened: Path A versus Path B is now a Checkpoint 1 decision, not an implementation detail.
- Still open: cost of a meaningful probe cycle, and which deny-list RWA tokens permit small-size redemption.
