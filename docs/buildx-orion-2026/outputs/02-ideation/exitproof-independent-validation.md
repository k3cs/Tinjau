# Independent Validation — EXITPROOF

**Fact — validation date:** 2026-08-16. **Inference — verdict:** **MODIFY**, with **0.82** confidence.

## Executive conclusion

- **Fact — checked demand evidence:** Aave risk discussions explicitly use market depth and slippage to set collateral parameters, and a 2026 Aave assessment says redemption-liquidity concerns contributed to an earlier recommendation against listing USDai/sUSDai. Sources: [Gauntlet asset-listing framework](https://governance.aave.com/t/arc-gauntlet-asset-listing-framework-market-risk-and-community-consensus-check/9277), [Chaos Labs USDai/sUSDai assessment](https://governance.aave.com/t/arfc-onboard-usdai-susdai-to-aave-v3-arbitrum-instance/23260/7).
- **Inference — one phrase:** The underlying problem is real because collateral protocols make parameter and listing decisions from exit and redemption evidence.
- **Fact — checked demand limit:** No source checked shows an X Layer protocol requesting EXITPROOF, agreeing to consume its registry, or specifying a score schema.
- **Inference — one phrase:** “Risk analysis is purchased” is supported; “this score will be integrated” is not.
- **Fact — checked substitution evidence:** Pharos already publishes stablecoin scores with a dedicated Exit pillar, reviewed redemption routes, executable-capacity fields, DEX context, eligibility, delay, confidence, and a public API. Sources: [Pharos methodology](https://pharos.watch/methodology/), [Pharos API reference](https://pharos.watch/docs/api-reference/).
- **Fact — checked substitution evidence:** Birdeye documents a position-independent exit-liquidity API, and live X Layer agents Phylax and Sentinel advertise xStocks liquidity/execution checks and position-sized real exit cost respectively. Sources: [Birdeye Exit Liquidity API](https://bds-support.birdeye.so/hc/en-us/articles/47859371294233-Exit-Liquidity-Understanding-and-Implementing-Birdeye-s-Exit-Liquidity-API); reproduce the agent results with `onchainos agent search --query xStocks` and `onchainos agent search --query 'portfolio risk'` using CLI v4.4.2.
- **Inference — one phrase:** EXITPROOF's public-state score, API, MCP surface, and contract-readable risk-object pattern are not novel enough to carry the project.
- **Fact — checked novelty limit:** None of the 242 corpus rows checked describes scheduled real issuer-redemption probes that publish latency, realized size, and failure receipts.
- **Inference — one phrase:** The executed-probe layer is the clearest differentiation, but corpus absence is not proof of global novelty.
- **Fact — checked feasibility conflict:** xStocks documentation now says direct redemption requires issuer onboarding, KYC/AML, wallet whitelisting, a **$5,000 minimum**, and normally operates 24/5. Sources: [xStocks issuance and redemption](https://docs.xstocks.fi/docs/issuance-and-redemption), [xStocks FAQ](https://docs.xstocks.fi/docs/frequently-asked-questions).
- **Inference — one phrase:** The distinct layer cannot credibly be built or demonstrated by one unfunded builder before August 21.
- **Inference — verdict:** Do not build EXITPROOF as a universal score, probe network, reconciliation engine, registry, and bonded challenge market. Build a narrow **X Layer xStock Exit Certificate** that reports position-sized executable DEX evidence and cited issuer-policy facts without claiming to prove backing redemption or stress capacity.

## Validation scorecard

| Dimension | Result | Claim type and basis |
|---|---:|---|
| Demand evidence | Moderate — 2/3 | **Fact:** Aave decisions use liquidity and redemption analysis; **Inference:** no demand is shown for this exact product. |
| Competition | Crowded components; sparse exact bundle | **Fact:** Pharos, Birdeye, Chainlink PoR, Particula, Phylax, and Sentinel cover major components; **Inference:** scheduled executed probes remain differentiated. |
| Technical feasibility | Full scope not feasible by Aug 21 | **Fact:** mandatory mainnet deployment is due August 21; **Inference:** issuer access and calibrated scoring require weeks or months. |
| Narrow MVP | 4–6 days | **Inference:** one asset family, quote curves, citations, API/MCP, and a minimal registry can fit if deployment funding and accounts are ready. |
| Founder fit | 2/3 | **Fact:** the brief reports a Uniswap v4 hook prize; **Inference:** that supports DEX work but not issuer onboarding, RWA legal analysis, or oracle governance. |
| MVP speed | 1/3 | **Inference:** the full mechanism is several products, and the source tree has no implementation. |
| Distribution clarity | 1/3 | **Fact:** no integration or design partner is named. |
| Market pull | 2/3 | **Fact:** adjacent risk work affects protocol decisions and has downstream use; **Inference:** pull for EXITPROOF remains untested. |
| Revenue path | 1/3 | **Fact:** no buyer, price, budget, or contract is shown. |
| Overall | **7/15 — pivot/modify** | **Inference:** below the skill's 8/15 go threshold. |

## 1. Is the problem real?

- **Fact — checked:** Gauntlet's Aave listing framework records community questions including how much liquidity an asset needs, what initial parameters it should have, and how to protect the protocol from insolvency. Source: [Aave/Gauntlet framework](https://governance.aave.com/t/arc-gauntlet-asset-listing-framework-market-risk-and-community-consensus-check/9277).
- **Fact — checked:** Chaos Labs' 2026 USDai/sUSDai review says an earlier recommendation against listing was driven partly by redemption-liquidity risk, and the later conditional support followed changes including a liquidity buffer and utilization constraint. Source: [Aave USDai/sUSDai review](https://governance.aave.com/t/arfc-onboard-usdai-susdai-to-aave-v3-arbitrum-instance/23260/7).
- **Fact — checked:** Aave's current risk-provider proposal describes dedicated RWA simulation for settlement friction and redemption-buffer depletion, plus real-time risk dashboards. Source: [LlamaRisk renewal proposal](https://governance.aave.com/t/arfc-renew-llamarisk-as-risk-service-provider-epoch-4/24446).
- **Fact — checked:** Yeelds displays Pharos stablecoin safety as a distinct third-party risk signal on a live vault page. Source: [Yeelds vault risk page](https://www.yeelds.ai/pool/2e53bb82-f13f-4157-a3bf-b1a91b94b6a4).
- **Inference — one phrase:** These are concrete users and workflows for exit-risk information, not merely proof that information is missing.
- **Fact — checked:** No checked source identifies an X Layer lending market currently waiting for an xStock exit score.
- **Fact — checked:** Direct `getReservesList()` against Aave V3 Pool `0xE3F3...f116` on X Layer returned nine assets and none of the eleven xStock addresses in the brief. Reproduce with `cast call 0xE3F3Caefdd7180F884c01E57f65Df979Af84f116 'getReservesList()(address[])' --rpc-url https://rpc.xlayer.tech`.
- **Inference — one phrase:** The broad problem is real, but the claimed first customer on the target chain is hypothetical.

**Inference — rubric score:** Demand is **2/3 (moderate)**.

- **Inference — rubric application:** There is at least one strong signal because redemption risk changed a real listing recommendation, plus several adjacent product and integration signals.
- **Inference — rubric limit:** There is no signed design partner, requested integration, manual workaround from an X Layer user, or willingness-to-pay evidence for EXITPROOF itself.

## 2. Does the mechanism address the problem?

### Exit liquidity

- **Fact — checked:** Birdeye defines exit liquidity as the value that can be sold before crossing a material slippage threshold; it distinguishes that from headline pool liquidity. Source: [Birdeye documentation](https://bds-support.birdeye.so/hc/en-us/articles/47859371294233-Exit-Liquidity-Understanding-and-Implementing-Birdeye-s-Exit-Liquidity-API).
- **Inference — one phrase:** Raw pool depth normalized by market cap or supply does not answer what a specific holder can sell at a specified slippage.
- **Inference — one phrase:** An exit measurement must be a notional-by-notional route curve with block number, timestamp, route, output asset, market-hours state, fees, price impact, and executable minimum output.
- **Fact — checked:** The X Layer Aave reserve list contains no xStock token.
- **Inference — one phrase:** Aave's available stablecoin liquidity is not an xStock exit route and should not be blended into an xStock score.
- **Inference — conclusion:** The public-state layer addresses exit liquidity only after replacing generic ratios with position-sized route simulation or quotes.

### Backing redemption

- **Fact — checked:** xStocks now publishes that retail users may redeem directly subject to KYC and a $5,000 minimum; issuer issuance/redemption normally runs 24/5, and only whitelisted wallets can use the infrastructure. Source: [xStocks FAQ](https://docs.xstocks.fi/docs/frequently-asked-questions), [issuance and redemption guide](https://docs.xstocks.fi/docs/issuance-and-redemption).
- **Fact — checked:** xStocks publishes proof-of-reserves access, and Chainlink lists xStocks/Backed among Proof of Reserve integrations. Sources: [xStocks documentation](https://docs.xstocks.fi/docs), [Chainlink Proof of Reserve](https://chain.link/proof-of-reserve).
- **Fact — checked:** Direct Ethereum calls to USDY InstantManager returned `minimumRedemptionUSD() = 1e18`, `redeemPaused() = false`, and `subscribePaused() = false` at validation time. Reproduce against `https://ethereum-rpc.publicnode.com` at `0xa42613C243b67BF6194Ac327795b926B4b491f15`.
- **Inference — one phrase:** A successful small redemption proves operational access for one eligible identity at one moment; it does not prove aggregate capacity, equal access for other identities, or backing solvency.
- **Inference — one phrase:** A published rate limit is a ceiling, not a guarantee that funds, operations, banks, and compliance will complete the redemption at that size.
- **Inference — conclusion:** EXITPROOF can test small-notional operational redeemability for enrolled users; it cannot establish that backing exists or that stress-scale redemption will succeed.

### Plain answer

- **Inference:** The mechanism can solve a narrower exit-execution problem.
- **Inference:** It only partially solves redemption accessibility.
- **Inference:** It does not solve backing verification, reserve sufficiency, or system-wide run capacity.

## 3. Does it need AI, and does it need a chain?

### AI

- **Fact — design inspection:** All numeric measurements in the brief are deterministic, and the model is assigned only document reading and prose reconciliation.
- **Inference — one phrase:** The measurement product works without AI.
- **Inference — one phrase:** AI is useful for maintaining cited policy extraction across changing, unstructured issuer documents and support transcripts, but it is not necessary to compute exit capacity.
- **Inference — conclusion:** AI is a workflow accelerator and hackathon-eligibility feature, not the core technical necessity.

### Chain

- **Fact — design inspection:** RPC reads, route quotes, issuer documents, APIs, and signed receipts can all exist without deploying a new contract.
- **Fact — checked:** X Layer's event requires AI in the product and deployments to both X Layer testnet and mainnet. Source: [Build X AI Season](https://web3.okx.com/xlayer/build-x-series).
- **Inference — one phrase:** A chain becomes product-necessary only when a contract consumes a fresh, provenance-bound result to change an action such as a cap, collateral factor, or trade limit.
- **Fact — checked:** No consumer integration is shown.
- **Inference — conclusion:** The chain is ornamental for the current human/API use case and potentially necessary for a demonstrated contract consumer.

## 4. Novelty against the 242-row corpus and live agents

### Corpus verification

- **Fact — checked:** The spreadsheet was downloaded as raw CSV and parsed as **242 rows, 51 columns, and 57 distinct hackathons**; SHA-256 `f29245f60edae1829c74635c33b617501dc220c9e5b75a53cbeb59bbdfe694f8` matches the workspace copy. Source: [winners spreadsheet](https://docs.google.com/spreadsheets/d/1jPAQFjKaBbjoBe5cj_z-1dR8WD9-apNOT68CtFYeVfQ).
- **Fact — checked:** A narrow `\brwa\b|real.world asset` scan across the twelve analytical text fields returned 16 rows.
- **Fact — checked:** A `proof.?of.?reserve|backing attestation` scan returned one row, **Anyware**, because its target users include engineers building proof-of-reserves systems; Anyware itself is a cross-chain state-proof project.
- **Fact — correction:** The brief identifies the single proof-of-reserve match as Eliver, but the current raw row matching the stated pattern is Anyware; Eliver is hardware-signed logistics telemetry.
- **Inference — one phrase:** The brief's single-hit statistic does not establish one backing-verification project and illustrates the fragility of keyword counts.
- **Fact — checked:** Five rows matched `redeem|redemption|exit capacity|exit liquidity`: DobDex, Bundl, xStream, Cocoa Monster, and SnowBall.
- **Fact — checked:** Manual review of all five found no scheduled real issuer-redemption testing.
- **Fact — checked:** Manual review of the 16 narrow-RWA rows found structuring, DEX, lending, baskets, credit, telemetry, and compliance projects, but no project that empirically verifies an issuer's underlying backing.

### What is genuinely absent from the checked corpus

- **Fact — checked corpus only:** No row combines scheduled issuer redemptions, signed latency/failure receipts, public policy reconciliation, and a contract-readable publication.
- **Fact — checked corpus only:** No row reports repeated real redemption probes across notional sizes.
- **Inference — caution:** Those mechanisms are absent from this corpus, not proven absent from the market.

### What merely appears absent or is already live elsewhere

- **Fact — corpus analogue:** Cronos Shield turns deterministic risk output into a signed, on-chain-verifiable object for transaction gating.
- **Fact — corpus analogue:** The Wallet Shift uses health probes to separate registered services from callable ones.
- **Fact — corpus analogue:** MotivaTON repeatedly polls third-party evidence to release escrow.
- **Inference — one phrase:** EXITPROOF recombines precedented patterns even if the exact bundle is not in the corpus.
- **Fact — live direct substitute:** Pharos scores DEX and direct-redemption exit paths and publishes them through an API. Source: [Pharos methodology](https://pharos.watch/methodology/).
- **Fact — live adjacent substitute:** Particula publishes continuously monitored, rules-based asset-backed token ratings using on-chain and issuer data. Source: [Particula methodology](https://particula.io/risk-ratings).
- **Fact — live backing substitute:** Chainlink Proof of Reserve publishes contract-consumable reserve verification, and xStocks documents a public proof-of-reserves portal. Sources: [Chainlink PoR](https://chain.link/proof-of-reserve), [xStocks FAQ](https://docs.xstocks.fi/docs/frequently-asked-questions).
- **Fact — live X Layer competitors:** OnchainOS search returned Phylax (#6127) for xStocks/RWA liquidity and execution preflight, and Sentinel (#3597) for position-sized exit cost; both results showed no recorded `soldCount` value at validation time.
- **Inference — conclusion:** Novelty is **low for scoring/API/on-chain publication, moderate for xStocks-specific cited evidence, and potentially high for permissioned executed probes**.

### Solana-specific check required by the validation skill

- **Fact — checked:** Search found live Solana token-risk and slippage products, including a Jupiter slippage-ladder service and Pharos coverage of Solana stablecoins, but no checked Solana product matching the complete scheduled issuer-probe mechanism. Sources: [Solana DeFi Intelligence listing](https://www.x402scan.com/server/08b01f29-c058-403e-972a-d9b740a66fe8), [Pharos USDv profile](https://pharos.watch/stablecoin/usdv-solomon/).
- **Inference — one phrase:** Solana confirms that quote-based exit analysis is commoditizing; it does not eliminate the possible probe-layer differentiation.

## 5. Does it create a market with no demonstrated demand?

- **Fact — design inspection:** The full design requires issuers willing to authorize probes, funded probe wallets, score consumers, bonded challengers, challenge adjudication, and contracts willing to act on the score.
- **Fact — checked:** No issuer permission, probe-wallet funding, consumer integration, challenger, bond size, dispute rule, or adjudicator is provided.
- **Inference — one phrase:** The design assumes three unproven second-order markets into existence: issuer-approved testing, score consumption, and bonded score disputes.
- **Fact — checked:** Existing demand evidence is strongest for raw facts and bespoke risk assessments, not for a universal scalar score.
- **Inference — one phrase:** The score and challenge market are product expansion before the evidence object has a user.

## 6. Feasibility for one person by 2026-08-21 and 2026-09-02

- **Fact — checked:** Build X closes August 21, 2026 at 23:59 UTC and requires testnet followed by mainnet deployment plus an active dedicated X account and submission post. Source: [official event page](https://web3.okx.com/xlayer/build-x-series).
- **Fact — checked:** Orion's public bundle states August 12–September 2, a roughly $10 ETH ignition fee, Base wallet registration, and an optional but strongly recommended demo.
- **Fact — local inspection:** `contracts/` is empty; each `apps/*` directory contains only `node_modules`; there is no root `package.json` or application source.
- **Fact — not independently reproducible:** The brief reports that the intended wallet is unfunded but supplies no address, so that claim could not be rechecked.
- **Inference — one phrase:** Fewer than six days remain for a source-less implementation plus mainnet/social operations.

| Scope element | By Aug 21 | By Sep 2 | Claim type and reason |
|---|---|---|---|
| X Layer chain reads and token metadata | Reachable | Reachable | **Fact:** RPC and contracts respond; **Inference:** straightforward TypeScript work. |
| One xStock position-sized DEX quote curve | Reachable with route discovery | Reachable with validation/history | **Inference:** feasible if a liquid route and quoter are identified early. |
| Minimal web/API/MCP over shared handlers | Reachable | Reachable | **Inference:** narrow data shape, not a general platform. |
| Minimal registry storing a snapshot hash and metadata | Reachable if funded | Reachable | **Inference:** small Solidity surface; deployment funding remains operational. |
| Cited issuer-policy extraction | One issuer only | Several issuers | **Inference:** AI can structure documents, with deterministic citations retained. |
| Real small DEX swap | Possible if funded | Likely | **Inference:** requires token inventory, OKB, and accepting market loss. |
| Real xStocks issuer redemption | Not credible | Uncertain | **Fact:** KYC, whitelisting, 24/5, and $5,000 minimum; **Inference:** timing and capital are blockers. |
| Scheduled probe history | No | Thin at best | **Inference:** elapsed time and repeated capital cycles are irreducible. |
| Calibrated universal score | No | No | **Inference:** no ground truth, backtest, or consumer utility function. |
| Bonded challenge market | No | No | **Inference:** dispute semantics, security, and participants are undefined. |
| Real lending-market integration | No evidence | Uncertain | **Fact:** no design partner; **Inference:** cannot be scheduled as internal engineering work. |

- **Inference — feasibility conclusion:** A credible evidence demo is reachable; the mechanism in §1 is not.

## 7. Strongest case against building it

- **Fact — checked:** Pharos already implements the closest product thesis for stablecoins, Birdeye exposes exit liquidity, Chainlink/xStocks expose backing data, Particula rates tokenized assets, and X Layer agents already advertise position-sized exit risk.
- **Inference — one phrase:** Four of EXITPROOF's five visible surfaces are substitute assembly rather than invention.
- **Fact — checked:** The distinctive issuer-probe layer requires KYC, whitelisting, $5,000 minimum xStocks redemption, capital, time, and issuer cooperation.
- **Inference — one phrase:** The moat is the one component the builder cannot demo.
- **Inference — one phrase:** Cooperative issuers can self-select into testing and recognize probe wallets, so probe coverage may reward cooperative optics rather than measure the riskiest assets.
- **Inference — one phrase:** Small scheduled probes measure liveness at the probe size, not stress capacity, and can create false confidence if promoted into a universal score.
- **Inference — one phrase:** Combining jurisdiction, identity eligibility, market hours, issuer limits, DEX curves, latency, and reserve facts into one scalar destroys decision-relevant detail.
- **Inference — one phrase:** A contract-readable wrong score has a larger blast radius than an API report because downstream automation can liquidate, reject, or cap assets mechanically.
- **Fact — checked:** No downstream protocol has agreed to own that automation risk.
- **Inference — strongest countercase:** EXITPROOF risks becoming polished risk theater: authoritative-looking output without representative probes, validated calibration, or a consumer who can define what “good” means.

## 8. Verdict

### MODIFY

- **Inference — smallest change that fixes the largest weakness:** Remove the universal score, bonded challenge market, and backing-redemption claim from the hackathon MVP; publish a **position-specific Exit Certificate** instead.
- **Inference — proposed certificate:** For one X Layer xStock and a user-supplied notional, return the best executable route, quoted output, price impact, min-out, block, timestamp, market-hours state, route provenance, and cited primary-redemption policy facts.
- **Inference — AI's bounded role:** Use the model to extract issuer-policy passages and explain discrepancies; never let it generate capacity numbers or eligibility claims.
- **Inference — chain's bounded role:** Store a content hash plus asset, notional, block, timestamp, and expiry on X Layer; demonstrate one consumer contract that rejects stale or over-slippage certificates.
- **Inference — positioning:** “Can this agent exit this position now, and what evidence supports the answer?” is more precise and defensible than “this asset has score 83.”
- **Inference — deferred work:** Treat issuer probes as a post-hackathon experiment gated on onboarding, capital, consent, and a preregistered methodology.

### Integration-first assessment

- **Fact — checked:** X Layer is EVM-compatible and has Uniswap deployments; the proposed publication logic is novel but small.
- **Inference — one phrase:** Integrate existing pool quoters, RPCs, issuer APIs, xStocks proof-of-reserves, and document sources rather than building routing, reserve verification, or a custom oracle network.
- **Inference — one phrase:** Build only the narrow certificate registry and consumer adapter because those are the composability demonstration.
- **Fact — scope note:** The Solana protocol catalog required by the validation skill is not technically relevant to this X Layer build.

## 9. What would change the verdict?

- **Fact criterion:** A named X Layer lending protocol, vault, or agent signs off on a concrete certificate schema and commits to a test integration.
- **Inference effect:** That would upgrade demand from adjacent to product-specific and make the chain necessary.
- **Fact criterion:** The builder completes issuer onboarding and produces successful xStocks redemption receipts at two materially different notionals, with the exact X Layer-to-issuer path documented.
- **Inference effect:** That would make the distinct probe layer feasible and test whether latency/cost changes with size.
- **Fact criterion:** A comparison shows that Pharos, Birdeye, Sentinel, and Phylax do not cover the selected X Layer xStock route or required position-sized evidence fields.
- **Inference effect:** That would establish a concrete coverage wedge rather than corpus-only novelty.
- **Fact criterion:** A preregistered score model predicts an observable outcome—failed exit, realized slippage, or latency—on held-out incidents better than raw route features.
- **Inference effect:** That would justify a score; without it, publish facts.
- **Fact criterion:** Testnet and mainnet OKB, Base ETH for Orion's fee, token inventory for a real swap, and the dedicated X account are ready before core coding ends.
- **Inference effect:** That would reduce operational disqualification risk but would not validate demand.

## Brief-audit: leading structure and factual corrections

- **Fact — checked:** The official Build X page currently contains the seven criteria in Terms clause 4, but its FAQ/disclaimer also says the organizer will consider on-chain data, code quality, innovation, and market potential. Source: [official event page](https://web3.okx.com/xlayer/build-x-series).
- **Inference — one phrase:** The brief's claim that the seven are “these seven and no others” is too strong.
- **Fact — checked:** The current event page has 14 numbered terms, not the 12 stated in the brief.
- **Fact — checked:** xStocks' current documentation resolves the policy-level part of the brief's redemption unknown: retail redemption is published as KYC-gated with a $5,000 minimum.
- **Fact — checked:** Whether an X Layer-held xStock can complete the exact issuer path without an intermediate supported-chain transfer remains unproven by the checked sources.
- **Fact — checked:** The corpus's single proof-of-reserve keyword match is Anyware under the stated search fields and pattern, not Eliver.
- **Inference — one phrase:** The brief leads toward a novelty conclusion by emphasizing sparse corpus keywords and curated analogies while omitting live market substitutes such as Pharos, Birdeye, Chainlink PoR, and xStocks' own redemption documentation.
- **Inference — balancing note:** The brief also exposes unknowns, the empty build state, permission requirements, and the absence of integrations, which materially support a negative verdict.

## Reproduction log

```bash
curl -sL "https://docs.google.com/spreadsheets/d/1jPAQFjKaBbjoBe5cj_z-1dR8WD9-apNOT68CtFYeVfQ/gviz/tq?tqx=out:csv&sheet=web3%20hackathon%20winners" -o winners.csv
python3 -c "import csv;r=list(csv.DictReader(open('winners.csv')));print(len(r),'rows',len(r[0]),'cols',len(set(x['Hackathon'] for x in r)),'distinct hackathons')"
cast chain-id --rpc-url https://rpc.xlayer.tech
cast chain-id --rpc-url https://testrpc.xlayer.tech/terigon
cast codesize 0xc845b2894dbddd03858fd2d643b4ef725fe0849d --rpc-url https://rpc.xlayer.tech
cast call 0xE3F3Caefdd7180F884c01E57f65Df979Af84f116 'getReservesList()(address[])' --rpc-url https://rpc.xlayer.tech
cast call 0xa42613C243b67BF6194Ac327795b926B4b491f15 'minimumRedemptionUSD()(uint256)' --rpc-url https://ethereum-rpc.publicnode.com
cast call 0xa42613C243b67BF6194Ac327795b926B4b491f15 'redeemPaused()(bool)' --rpc-url https://ethereum-rpc.publicnode.com
onchainos agent search --query xStocks
onchainos agent search --query 'portfolio risk'
```
