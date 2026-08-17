# EXITPROOF — independent judging scorecards

- **[Fact — date basis]** Assessment date: 2026-08-16. The X Layer deadline is 2026-08-21 23:59 UTC; the official page therefore leaves less than six calendar days. Source: [X Layer AI Season page](https://web3.okx.com/xlayer/build-x-series).
- **[Inference — scoring basis]** Scores estimate the most plausible submission a solo builder can deliver by each deadline from the state in the brief—not a hypothetical fully mature EXITPROOF.
- **[Inference — weighting]** I use an equal-weight arithmetic mean because neither organizer publishes criterion weights. This is my assumption, not an organizer rule.
- **[Fact — verification boundary]** X Layer's dates, prizes, requirements, seven Terms criteria, and four Liquidity Grant criteria were re-verified on the live official page. Chaos Labs, Pharos, DefiLlama, and xStocks claims used below were also re-verified against their first-party pages. Orion's client-rendered official page could not be independently read through the web index; Orion-specific rules and the two-entry snapshot are therefore sourced to the workspace's dated capture, [HACKATHON.md](../../HACKATHON.md), and remain less strongly verified than the X Layer rules.

## Bottom line

- **[Inference — Hackathon A]** Likely score: **22/35 (3.14/5)**. EXITPROOF is an unusually direct AI-RWA/X Layer fit, but it is not presently a complete product and its AI is secondary to the deterministic measurement. My placement estimate is **outside the overall top three, roughly 4th–10th if the narrow MVP ships**, with **low confidence** because no entrant count or competitor-quality distribution is available.
- **[Inference — A Liquidity Grant]** Likely score: **12/20 (3.0/5)**. It is plausibly assigned to AI-RWA and is thematically competitive, but I would currently place it **behind a polished, adopted AI-RWA product**; estimate **runner-up range rather than winner**, with **low confidence** because the AI-RWA field is not published.
- **[Inference — Hackathon B]** Likely score: **8/15 (2.67/5)**. If a five-minute vertical slice is live, the most plausible result is **one of the four honourable mentions (4th–7th)**; if it remains documentation plus screenshots, it likely misses all seven prizes. Confidence is **very low** because the present two-entry field is an early snapshot with about 17 days to grow.

## 1. Hackathon A — X Layer AI Season

### Official seven-criterion scorecard

| Official criterion | Score | Evidence-bound justification |
|---|---:|---|
| Application of AI | **3/5** | **[Fact — brief §1]** The model reconciles issuer statements with observed behavior, cites the source passage, and is explicitly barred from producing measurements. **[Inference — criterion fit]** This is a defensible, hallucination-resistant use of AI, but the indispensable value—the quote ladder and routing ceiling—still works without it, so AI reads as an explanatory layer rather than the core invention. |
| Innovation | **3/5** | **[Fact — §4b, re-verified]** Pharos already scores redemption routes and DEX exit liquidity, including executable capacity; Chaos Labs already measures maximum sell size within a price-impact bound. Sources: [Pharos methodology](https://pharos.watch/methodology/), [Chaos Labs Aave assessment](https://governance.aave.com/t/arfc-onboard-usdai-susdai-to-aave-v3-arbitrum-instance/23260/7). **[Inference — criterion fit]** Tokenized equities, closed-market monitoring, real router quotes, X Layer, and a contract-readable curve form a novel bundle, but they do not make the underlying method novel enough for 4/5. |
| Product completeness | **2/5** | **[Fact — §4c]** The starting point is an empty TypeScript monorepo, with no site, project X account, community link, funded wallet, or deployment. **[Inference — criterion fit]** A one-asset vertical slice is plausible in the remaining time, but eleven assets, repeat sampling, issuer-policy extraction, an agent interface, a web view, and two chain deployments are not credibly complete from this state. |
| User value | **3/5** | **[Fact — §4a, re-verified]** Chaos Labs uses the same max-size-within-impact measurement in an Aave risk decision, and xStocks says most users obtain liquidity through secondary markets. Sources: [Chaos Labs](https://governance.aave.com/t/arfc-onboard-usdai-susdai-to-aave-v3-arbitrum-instance/23260/7), [xStocks FAQ](https://docs.xstocks.fi/docs/frequently-asked-questions). **[Fact — §4b]** No X Layer protocol has agreed to consume EXITPROOF, and Aave's X Layer market has no tokenized-equity reserve. **[Inference — criterion fit]** The problem is real, but value on this target chain is demonstrated by analogy and measurement, not by a user or integration. |
| Integration with X Layer | **4/5** | **[Fact — §1 and §4a]** The target assets and router measurement are native to X Layer, and the output is designed as a contract-readable X Layer object; the NVDAx route was already queried against deployed contracts. **[Fact — §4c]** No EXITPROOF contract is deployed yet. **[Inference — criterion fit]** X Layer is structural rather than decorative, but the missing testnet/mainnet artifact prevents 5/5. |
| Growth potential | **3/5** | **[Fact — §1]** The design can extend from eleven xStocks to X Layer DeFi positions. **[Fact — §4b, re-verified]** DefiLlama's token-liquidity product is currently disabled, while Pharos maintains a substantial scoring system with repeated updates. Sources: [DefiLlama liquidity](https://defillama.com/liquidity), [Pharos methodology](https://pharos.watch/methodology/). **[Inference — criterion fit]** Expansion is plausible, but data freshness, route churn, sampling cost, and lack of a buyer make scalable growth unproven. |
| Contribution to the X Layer ecosystem | **4/5** | **[Fact — §4a/§4b]** The proposed object covers X Layer-native tokenized equities, while the supplied competitor review found no equivalent contract-readable exit-depth curve and no current xStock collateral market. **[Inference — criterion fit]** A composable risk primitive could improve wallets, agents, vaults, and future lending listings, but with no current consumer it is prospective ecosystem infrastructure, not demonstrated contribution. |
| **Equal-weight total** | **22/35** | **[Inference]** The native ecosystem fit is stronger than the current product and AI implementation. |

### Liquidity Grant scorecard

| Published criterion | Score | Evidence-bound justification |
|---|---:|---|
| Product quality | **2/5** | **[Fact — §4b/§4c]** The only measurements cited were Sunday snapshots; the 500-share result varied from -7.72% to about -1.3%, and no product exists yet. **[Inference]** Timestamped repeat sampling, route provenance, failure handling, and a working interface are quality prerequisites, not polish. |
| Innovation | **3/5** | **[Fact — §4b]** Pharos, CryptoRank, Chaos Labs, and the L3 prize winner occupy adjacent or overlapping territory. **[Inference]** The X Layer/DEX/tokenized-equity/contract-readable combination differentiates the product, but the score should not erase those precedents. |
| User value | **3/5** | **[Fact — §4a/§4b]** Professional risk teams buy or produce this measurement, but no target-chain customer has requested it. **[Inference]** A dramatic NVDAx headline-to-executable gap makes the value legible, while the absence of a user caps the score. |
| Contribution to the ecosystem | **4/5** | **[Fact — official rules]** The grant is specifically for the best AI-RWA project and must fund project growth and further X Layer ecosystem development. Source: [official page](https://web3.okx.com/xlayer/build-x-series). **[Inference]** EXITPROOF supplies an RWA risk primitive to other X Layer contracts, an unusually literal fit, though no downstream use is live. |
| **Equal-weight total** | **12/20** | **[Inference]** Strong theme fit does not compensate for present product-quality risk. |

### Mandatory participation gates

**[Fact — official rules]** Failure of any one gate makes the entry ineligible. Source: [official page](https://web3.okx.com/xlayer/build-x-series).

| Gate | Current status | What makes it pass or fail |
|---|---|---|
| AI in product design and deployed on X Layer | **Not yet satisfied** | **[Fact — §1/§4c]** AI and X Layer are in the design, but no EXITPROOF deployment exists. **[Inference]** It fails if the LLM is only described, or if the shipped product is not on X Layer. |
| Testnet during hackathon, then mainnet | **Not yet satisfied** | **[Fact — §4c]** Neither deployment exists. **[Inference]** Missing either required deployment, or deploying testnet only after the hackathon, creates an eligibility failure. |
| Dedicated, active X account | **Not satisfied** | **[Fact — §4c]** No project X account exists. **[Inference]** A personal account or a newly created but inactive shell is risky against the literal dedicated-and-active requirement. |
| Official X submission post mentioning `@XLayerOfficial` | **Not satisfied** | **[Fact — §4c]** There is no project account or post. **[Inference]** A post from the wrong account or without the mention fails the stated gate. |
| Google Form by 2026-08-21 23:59 UTC | **Not satisfied until submission** | **[Fact — official rules]** The form and deadline are mandatory. **[Inference]** A late, incomplete, or unsubmitted form fails regardless of score. |

- **[Inference — eligibility conclusion]** EXITPROOF does **not currently satisfy all five requirements**; it is an eligible concept, not yet an eligible entry.
- **[Inference — track assignment]** A judge would plausibly assign it to **AI-RWA** because its subject is tokenized equities, its measurement is liquidity/exit capacity, and its AI compares issuer claims with observed behavior. **[Fact — brief §2]** The submission form has no track selector, so this remains organizer classification rather than builder control.
- **[Inference — placement]** Assuming the one-asset vertical slice, both deployments, account/post, and form all ship, my estimate is **4th–10th overall**, not top three; **confidence: low**. The largest downside driver is completeness, while the strongest upside is exact AI-RWA/X Layer fit.

## 2. Hackathon B — Orion Builder Hackathon

| Official criterion | Score | Evidence-bound justification |
|---|---:|---|
| Usefulness | **3/5** | **[Fact — §4a]** The same measurement informs real lending-risk parameters, and the observed NVDAx routing ceiling makes the user problem concrete. **[Fact — §4b]** No target-chain customer or committed consumer exists. **[Inference]** Useful to a risk analyst or large holder, but not yet proven useful as a repeatable standalone agent. |
| Execution | **2/5** | **[Fact — §4c]** There is an empty monorepo, no runnable website, no social/community endpoints, no funded submission wallet, and no deployment. **[Inference]** The live quote experiment proves technical feasibility, but a judge scores the artifact they can run, not the feasibility note. |
| Originality | **3/5** | **[Fact — §4b]** Pharos implements the closest architecture, CryptoRank covers executable tokenized-equity liquidity on CEXs, L3 already won for continuous exit-risk scoring, and Phylax is adjacent on X Layer. **[Inference]** The exact DEX quote curve plus issuer-policy reconciliation and onchain output is distinct, but originality is recombination rather than a new method. |
| **Equal-weight total** | **8/15** | **[Inference]** The idea is more original and useful than its present execution. |

### Automated vetting

- **[Fact — Orion capture]** The two current entries scored 86 and 72 and both separate deterministic figures from LLM-directed investigation and prose. Source: [HACKATHON.md](../../HACKATHON.md) and brief §3.
- **[Inference — likely rewards]** Vetting would likely reward a public repository, a working endpoint, deterministic quote outputs, exact block/timestamp/router/route provenance, source-linked issuer passages, explicit separation of model prose from numeric computation, and a reproducible example.
- **[Inference — likely penalties]** It would likely penalize an empty or thin repository, no live endpoint, a model that merely summarizes a fixed report, unsupported claims of novelty, one-off unstable figures, missing failure handling, and mandatory links that do not resolve.
- **[Inference — score implication]** Comparable architecture alone does not justify predicting 72–86; EXITPROOF must expose the tool calls and runnable evidence that those entries describe. Without that, its auto-score could reasonably fall below both.

### Five-minute run test

- **[Fact — current state]** A judge cannot meaningfully run EXITPROOF in five minutes today because there is no product URL or runnable repository.
- **[Inference — minimum viable judging path]** A judge should be able to open one page, select the preloaded `NVDAx -> USD₮0` case, enter or accept `250 / 500 / 750` shares, and see within one run: timestamp and block, quote outputs, impact at each rung, `no route` at the ceiling, repeated-sample dispersion, the cited issuer-policy passage, and the X Layer object plus explorer link.
- **[Inference — reliability design]** A recorded, provenance-complete reference run should appear immediately with a separate “refresh live” action; otherwise a transient router failure or market change can turn a five-minute demo into a blank screen.
- **[Inference — placement]** If that path exists, I estimate **4th–7th (honourable mention)**; if it does not, **outside all seven prizes**. **Confidence: very low**, because **[Fact — brief §3]** two entries is only the 2026-08-16 snapshot and the field remains open until September 2.

## 3. Cross-cutting judgment

### 3.1 Weakest single criterion

- **[Inference]** The weakest criterion is **Hackathon A product completeness (2/5)**, narrowly worse in consequence than Orion execution because incompleteness also threatens A's hard eligibility gates.
- **[Inference — highest-leverage change]** Ship one production-shaped vertical slice: one asset and one route, repeat-sampled and provenance-stamped, written to the same contract interface on X Layer testnet and mainnet, visible in a one-click web demo. This single scope cut would raise A completeness most and simultaneously improve X Layer integration and Orion execution.

### 3.2 Where the rubrics pull apart

- **[Fact — rubrics]** A explicitly rewards X Layer integration, growth, and ecosystem contribution; B explicitly scores usefulness, execution, and originality, with judges trying runnable artifacts. Sources: [X Layer official page](https://web3.okx.com/xlayer/build-x-series) and the [Orion rules capture](../../HACKATHON.md).
- **[Inference]** A pulls EXITPROOF toward a composable onchain primitive and breadth across ecosystem assets; B pulls it toward a narrow, instantly runnable agent experience. Breadth helps A's ecosystem story but increases the chance of an incomplete or slow B demo.
- **[Inference — priority]** Favor **A for the next ~5.7 days**, because its deadline arrives first and its criteria uniquely reward the X Layer primitive. Build the narrow vertical slice rather than the eleven-asset roadmap; then use Orion's extra time for robustness, agent interaction, documentation, and demo polish.

### 3.3 Strongest case that it scores poorly at both

- **[Fact — evidence chain]** The numerical core is a known technique used by Chaos Labs and approximated by Pharos; an adjacent X Layer agent already mentions liquidity/execution risk; no X Layer protocol has agreed to consume the result; the headline measurement produced a large outlier; all samples were taken during the deliberately worst Sunday window; DefiLlama's disabled product signals maintenance burden; and the build currently lacks code, deployments, funding, accounts, and interfaces.
- **[Inference — adverse judge reading]** A skeptical judge can reasonably see a familiar liquidity-analysis method wrapped in a thin LLM explanation, supported by a cherry-picked off-hours sample, with no customer and no finished product. That reading depresses A's AI, innovation, completeness, user value, and growth scores and B's usefulness, execution, and originality simultaneously. It is a substantive failure case, not a ceremonial counterargument.

### 3.4 One checkable fact that would change the scores

- **[Fact condition]** A public URL that completes the full `NVDAx -> USD₮0` run in under five minutes and links to a successful EXITPROOF mainnet contract write is binary and independently checkable.
- **[Inference — score change]** If that fact becomes true with a public repository and provenance fields, I would raise **A product completeness from 2 to 4**, **A X Layer integration from 4 to 5**, **Liquidity Grant product quality from 2 to 4**, and **B execution from 2 to 4**. I would then move A from likely 4th–10th to plausible top-three contention and B from honourable-mention range to plausible top three; confidence would remain limited by unknown competitors.

## 4. Framing audit

- **[Inference — upward-leading material]** Section 4a is constructed to support a high score: it sequences paid professional demand, a dramatic asset-specific gap, structural recurrence, missing oracle coverage, an offline free substitute, a zero-match corpus result, and live feasibility.
- **[Inference — downward-leading material]** Section 4b is constructed to support a low score: it sequences a direct architectural precedent, asset-class coverage, a prior prize winner, no local customer, measurement instability, adverse sampling conditions, concept crowding, an adjacent agent, and maintenance difficulty.
- **[Inference — net assessment]** The two sections are balanced in volume, but not fully neutral in emphasis: §4a makes the exact bundle look empty while §4b shows that nearly every component is occupied. Section 4c separately leads strongly toward low completeness and execution. The scores above treat the bundle as differentiated but the method as non-novel, which is why innovation/originality remain 3/5 rather than 4–5.

## 5. Source note

- **[Fact]** The official X Layer page also contains a non-Terms disclaimer saying the organizer may consider onchain data, code quality, innovation, and market potential, while Terms clause 4 lists the seven criteria scored above and states that conflicting hackathon materials yield to the Terms. Source: [X Layer official page](https://web3.okx.com/xlayer/build-x-series).
- **[Inference]** Per the brief's ground rule, I did not add the disclaimer items as scoring rows or silently fold them into the seven official criteria.
