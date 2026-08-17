# EXITPROOF — Use Cases and Competitive Landscape

- Date: 2026-08-16
- Scope: what the product is actually for in the real world, and everyone already doing something adjacent
- Method: primary sources, first-party documentation, and live on-chain measurement. Negative results are recorded as negative results.

## PART 0 — A correction to my own measurement, first

`[Fakta]` Three readings of NVDAx → USD₮0 on X Layer, taken roughly an hour apart:

| Reading | 500 shares | Impact |
|---|---|---|
| 1 | $103,890.89 | −7.72% |
| 2 | $111,118.75 | −1.28% |
| 3 | $111,118.41 | −1.30% |

`[Inferensi]` Reading 1 was an outlier — a worse route or a transient pool state. Readings 2 and 3 agree. **The −7.72% figure I put in the summary PDF is not reproducible and must not be used.**

`[Fakta]` The reproducible picture: 250 shares sell at −0.72%, 500 shares at −1.30%, and **750 shares returns no route at all**. Published DEX liquidity is $478,411; the hard routing ceiling is around $111,000.

`[Fakta]` **2026-08-16 is a Sunday.** Every measurement in this workspace was taken while the US equity market was closed.

`[Inferensi]` That matters twice. It caps how much any single reading should be claimed. And it is itself the product's argument — see §1.2.

## PART 1 — Real-world use cases

Ordered by strength of evidence, not by attractiveness.

### 1.1 Setting lending-market collateral parameters — **evidenced, in production**

`[Fakta]` Chaos Labs, assessing USDai/sUSDai for Aave V3 Arbitrum, published: *"Current sell side liquidity conditions, **measured as the maximum size that can be swapped within 5% price impact**, are as follows: USDai: ~$5M to USDC (down from $30M); sUSDai: ~$4.5M to USDC (down from $35M)"*, plus *"In scenarios of large scale or rapid withdrawals, the protocol may still face constraints in meeting redemption demand."*

`[Fakta]` The resulting recommendation: 55M supply cap, 45M borrow cap, 20% reserve factor, **no collateral or borrowing enabled initially**, and E-Mode restrictions.

`[Fakta]` LlamaRisk *"developed a methodology to determine suitable debt ceilings for markets, accounting for **global liquidity depth of the collateral**, borrower behaviors, and leverage across major DeFi platforms."*

`[Fakta]` Gauntlet *"maintains models for market liquidity and slippage that simulate the impact on price based on order book depth and slippage curves, accounting for both immediate price impact and subsequent price drift to determine liquidation outcomes."*

`[Inferensi]` This is the strongest use case and it is not speculative: three separate risk firms compute this metric, and the output decides whether real capital is lent against an asset. The contraction from $30M to $5M is exactly what a continuous monitor would have caught early.

### 1.2 Tokenised equities during the ~two-thirds of the week the underlying market is closed — **structurally evidenced, and specific to this asset class**

`[Fakta]` *"Tokenized equities trade 24/7 while the underlying market is closed **roughly two-thirds of the week**, so on-chain prices drift from the last official close; liquidity is fragmented across programs and venues... that don't share order flow."*

`[Fakta]` *"When the real market is closed, token spreads tend to widen and price discovery becomes thinner, since **fewer participants are actively arbitraging** the token against the underlying share. Market makers struggle to hedge positions effectively when underlying reference markets remain closed."*

`[Fakta]` *"liquidity for tokenized versions of these stocks **evaporates during weekends and overnight periods**"*, and *"Monday price gaps are possible."*

`[Fakta]` AltStreet measured spreads between programs referencing the same share ranging **0.07% to 0.92%** on a single fixing date.

`[Inferensi]` So exit depth for xStocks is not a static property — it collapses and recovers on a schedule tied to a market on a different continent, and nobody publishes the curve. A holder who checks a dashboard on Saturday sees a liquidity number produced under Friday's conditions. **This is the sharpest use case available, it is unique to tokenised equities, and it is measurable with the method already tested.**

### 1.3 Knowing whether you can exit a lending position — **evidenced by failure**

`[Fakta]` Stream Finance xUSD collapse, November 2025, ~$285M. *"Stream suspended all deposits and withdrawals, effectively freezing $160 million in user funds."* With redemptions paused, *"xUSD only traded on decentralized exchanges"* and *"total liquidity across these venues was likely only a few million dollars at most."*

`[Fakta]` *"Some [lending markets] reached 100% utilization rates with borrow rates spiking to 88%, meaning **lenders literally could not withdraw their funds** — every dollar was lent out."*

`[Fakta]` Observable warnings existed days ahead: backing of $170M against $530M borrowed (4.1× leverage), 18% stablecoin yield against Aave's 4–5%, and circular collateralisation visible on-chain.

`[Inferensi]` The failure mode was not the price being wrong. It was that the exit did not exist at the size people held. A continuously published exit-capacity figure would have made the gap between "position value" and "recoverable value" visible before the freeze.

### 1.4 Liquidation feasibility — **evidenced by mechanism, adjacent**

`[Fakta]` Moonwell, February 2026: *"Liquidators seized collateral by repaying mere pennies on the dollar, wiping out 1,096 cbETH and leaving the protocol with $1.78 million in bad debt."*

`[Fakta]` General mechanism: *"If a liquidatable position isn't addressed quickly, it can become insolvent where seized collateral is worth less than the debt tokens needed to cover bad debt, giving trustless liquidators no incentive to liquidate."*

`[Inferensi]` A liquidator's decision to act is a function of whether the seized collateral can be sold at size. That is the same measurement. Note honestly: the Moonwell loss was caused by an oracle misconfiguration, not thin liquidity, so this use case is supported by mechanism rather than by that specific incident.

### 1.5 Agents about to move capital — **plausible, no demand evidence**

`[Fakta]` Phylax (#6127) is live on X Layer offering *"autonomous portfolio risk checks for xStocks and RWA workflows before agents move capital"*, evaluating *"concentration, approval, liquidity, execution, and policy risk"*. `[Fakta]` Its recorded sold count and feedback rate are both null, and its fee is 0.0.

`[Inferensi]` The shape is right and the potential consumer exists on the correct chain, but zero sales means it is not evidence that anyone pays for this yet.

### 1.6 Treasury and index position sizing — **inferred only**

`[Inferensi]` A DAO treasury or an index that must rebalance faces the same question, and the arithmetic is identical. I found no first-party evidence of anyone requesting this as a product, so it is listed as reasoning, not as a finding.

## PART 2 — Competitors

Everything below was checked this session. Verdicts are about **overlap with EXITPROOF specifically**, not about quality.

### 2.1 Direct — measures executable exit capacity

**Pharos** `pharos.watch` · *closest architectural match*
`[Fakta]` Publishes Safety Scores over *"backing, exit routes, and economic control"*; a **Redemption Backstop score** 0–100 against *"modeled capacity requests of 5% of supply, floored at $100k, capped at $25M"*; a **Liquidity Score** measuring *"how safely a stablecoin can exit through decentralized markets... TVL depth, volume activity, pool quality, durability, and pair diversity"*; DEWS depeg early warning; a systemic stress index.
`[Fakta]` Live site titled *"Stablecoin Analytics Dashboard: Track 404 Coins"* — Core 258, Variants 50, Pegs 30, Chains 113. Text scan of the running page: **zero** hits for X Layer, xStock, equity, stock, RWA, tokenized, OKB.
`[Inferensi]` **Stablecoins only.** Capacity is *modelled* at a fixed 5% of supply; EXITPROOF *quotes* through the deployed router at chosen sizes. Delivery is dashboard, not an on-chain object.

**Chaos Labs** · *same metric, different production model*
`[Fakta]` Computes max-size-within-price-impact by hand for governance. Its oracle product publishes **Price Feeds, Risk Feeds** (borrow and supply caps) and **Proof Feeds** (reserve attestations, backing ratios) on-chain across Ethereum, Avalanche, Base, Polygon, BNB, Arbitrum, Gnosis, Scroll. `[Fakta]` The oracle page does **not** list liquidity depth, market impact, or exit capacity as a published feed.
`[Inferensi]` Produces the number as bespoke analysis, publishes the *conclusion* (caps) on-chain rather than the underlying depth curve. No X Layer, no tokenised equities.

**Gauntlet** · `[Fakta]` slippage curves and market-impact models feeding liquidation simulation; in 2026 pushes AI-driven parameter changes to Aave and Compound via on-chain governance. `[Inferensi]` Internal model, not a published per-asset feed.

**LlamaRisk** · `[Fakta]` debt-ceiling methodology accounting for *"global liquidity depth of the collateral"*. `[Inferensi]` Same: an input to a recommendation, not a product.

**DefiLlama token liquidity page** · *the free DEX-native one, and it is offline*
`[Fakta]` `defillama.com/liquidity` currently returns: *"Token liquidity data is not available on DefiLlama for the time being. We're working on bringing this page back in a future update."*
`[Inferensi]` The most obvious free competitor built this and has taken it down. That is evidence the metric is wanted and that maintaining it is non-trivial — and it means the free slot is currently empty.

### 2.2 Adjacent — same measurement, different venue or asset class

**CryptoRank tokenized-equity study (24 July 2026)** · *closest on asset class*
`[Fakta]` Compares *"spread, displayed depth and slippage from the same market snapshot"* across venues for tokenised equities, explicitly framed around *"executable liquidity"*. Measures *"depth within 25 and 50 basis points on both sides of the order book, at trade sizes of $10,000 and $50,000 during regular trading hours"*. Notes that a spread alone *"does not show how much size remains available behind the best quote."*
`[Inferensi]` This is EXITPROOF's thesis, published, for tokenised equities. But: **CEX order books** (Bitget rTokens, Binance bStocks, Gate gStocks), a one-off human research snapshot, *"during regular trading hours"*, no DEX, nothing on-chain, no continuous feed. §1.2 — the closed-market window — is precisely what it excludes.

**Kaiko** · `[Fakta]` precomputed depth and slippage metrics, order-book snapshots, *"Price Slippage calculates the potential slippage for a market buy order if it were placed at the time the Order Book Snapshot was taken"*, depth aggregated 0–10% from best bid/ask. `[Inferensi]` Institutional, primarily CEX, paid API, off-chain.

**CoinGecko / GeckoTerminal** · `[Fakta]` 2.4M+ on-chain DEX tokens across 120+ networks with depth metrics in a ±2% band. `[Inferensi]` A single band, not a curve to the routing ceiling, and not published per-asset as a risk object.

**rwa.xyz** · `[Fakta]` the reference RWA analytics platform, tracking $1.82B of distributed tokenized stocks and 471K holders as of mid-July 2026. `[Inferensi]` Coverage is market value, holders, flows, yields and metadata. I could not load its live pages this session (the app froze the browser tab), so **whether it publishes executable depth is unverified** and must stay unverified rather than assumed.

### 2.3 Ratings that include liquidity as an input

`[Fakta]` **Credora** — A+ to D scale, 100,000 Monte Carlo simulations per market, probability-of-significant-loss anchored to 1990–2023 default data; delivered by dashboard, API and reports. Its site does not state whether ratings are consumed on-chain. `[Fakta]` **Exponential.fi** — letter grades decomposing chain, protocol, asset and pool risk.
`[Inferensi]` These compress liquidity into a grade. EXITPROOF's output is the opposite: an uncompressed curve. Different products; they are context, not substitutes.

### 2.4 The on-chain question, checked carefully

`[Fakta]` **Chainlink LWBA** (Liquidity-Weighted Bid and Ask) publishes bid and ask *"based on the available liquidity at each price level in the order books"*. The documentation states *"At the moment, only Crypto streams provide LWBA prices"*, and the methodology is order-book based — **CEX, not DEX**.

`[Fakta]` **Chainlink DEX State Price Streams**, built for *"assets that derive most — if not all — of their liquidity from decentralized exchanges"*, use Report Schema V3 in which *"the `bid` and `ask` fields have the same value as the `price` field"* because *"DEX markets rely on continuous liquidity pools rather than traditional order books."* Market-depth metrics are used internally to refine weighting, not published as a depth curve.

`[Inferensi]` **This is the clearest gap found in the entire sweep.** For exactly the assets EXITPROOF targets — DEX-liquidity tokens — the dominant oracle publishes bid = ask = price, i.e. no executable-depth information at all. Caveat: documentation can lag shipped features, so this should be re-checked before being claimed in a submission.

## PART 3 — What survives

`[Inferensi]` The method is not novel. Chaos Labs, Gauntlet, LlamaRisk, Kaiko, Pharos and CryptoRank all measure some version of executable depth. Anyone claiming otherwise has not looked.

What is not currently occupied, on the evidence gathered:

1. **DEX-side executable depth published as a curve**, rather than a single ±2% band or a compressed grade.
2. **Tokenised equities on-chain**, rather than stablecoins (Pharos) or CEX order books (CryptoRank, Kaiko).
3. **The closed-market window** — the ~two-thirds of the week when arbitrage stops and depth is documented to evaporate, which the one comparable equity study explicitly measured only *"during regular trading hours"*.
4. **Readable by a contract**, where Chainlink's DEX streams currently publish bid = ask = price.
5. **X Layer**, which none of the above cover.

`[Inferensi]` That is a real position, and it is narrow. It should be stated as "this specific measurement, on this asset class, in this window, on this chain, in this form" — never as "nobody measures exit risk."

## PART 4 — Honest weaknesses this research surfaced

- `[Inferensi]` The single strongest use case (§1.1) is served today by firms with far more resources, for the assets that matter most. The unserved part is the long tail and the closed-market window.
- `[Fakta]` DefiLlama built the free version and switched it off. `[Inferensi]` Whatever made it hard for them is not obviously easier for one person.
- `[Fakta]` My own headline number moved 6× between two readings an hour apart. `[Inferensi]` Any published figure needs a timestamp, a route record, and repeated sampling, or it is noise presented as insight.
- `[Fakta]` No protocol on X Layer accepts xStocks as collateral — Aave V3 there lists 9 reserves, none of them xStocks. `[Inferensi]` The §1.1 customer does not exist on the target chain.
