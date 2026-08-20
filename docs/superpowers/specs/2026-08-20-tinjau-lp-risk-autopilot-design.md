# Tinjau LP Risk Autopilot — Product Evolution Design

**Date:** 2026-08-20  
**Status:** Approved product direction; revised after competitive research; implementation plan not yet written  
**Primary user:** Liquidity providers and tokenized-equity pool operators on X Layer

## 1. Summary

Tinjau evolves from a corporate-events oracle into an AI-assisted risk-control network for tokenized-equity liquidity on X Layer.

The existing product remains the trusted evidence layer: it reads SEC EDGAR filings three times, measures per-field agreement, binds the result to the source-document hash, and publishes a bonded, challengeable event on X Layer. The new product layer adds news and rumor monitoring, live X Layer market confirmation, bounded defensive actions through Uniswap v4, and measurable protection records.

The product must not let an unverified rumor directly control a pool. AI may investigate broad and ambiguous evidence, but contracts enforce narrow, pre-authorized limits.

The product position is:

> Tinjau is a corporate-event-aware market discontinuity guard for tokenized-stock liquidity on X Layer. It connects source-grounded evidence, safe rumor handling, OKX/X Layer market confirmation, and bounded pool protection.

## 2. Problem

Tokenized US equities trade continuously on X Layer, while their underlying reference markets, company disclosures, and corporate-action processes do not. LPs can therefore quote stale prices or provide too much liquidity while informed traders react to an earnings release, bankruptcy report, acquisition rumor, regulatory event, or other discontinuous information.

The current Tinjau implementation solves only part of this problem. It can turn an official filing into trusted on-chain state and adjust a builder-owned Uniswap v4 pool, but it does not yet:

- detect risks that appear first in credible news or social rumors;
- combine off-chain evidence with current X Layer price, flow, and exit liquidity;
- show one complete `evidence -> decision -> action -> measured outcome` loop;
- provide a reusable risk state to other X Layer markets;
- demonstrate a clear X Layer-specific growth and distribution path.

## 3. Product Goals

1. Protect LPs from information asymmetry around tokenized-equity events.
2. Make AI essential to evidence resolution, rather than use it as a generic summary layer.
3. Keep all autonomous actions bounded, explainable, reversible, and auditable.
4. Produce measurable evidence that a protection action helped or harmed LPs.
5. Become reusable infrastructure for tokenized-equity markets across X Layer.
6. Build toward Exchange OS without depending on unavailable Exchange OS access for the MVP.

## 4. Non-Goals

- Predicting stock prices or promising profitable trades.
- Allowing a social-media post to trigger an aggressive pool action by itself.
- Giving an LLM unrestricted authority over pool funds or arbitrary contract calls.
- Supporting every tokenized stock, chain, DEX, or news provider in the first release.
- Claiming prevented loss when the counterfactual cannot be reproduced.
- Treating ERC-8004 identity, agent payments, or Exchange OS as more important than a working protection loop.

## 5. Selected Product Strategy

Three possible directions were considered:

1. **News Oracle:** expand filing coverage into news and social media. This improves AI depth but still ends at an alert.
2. **LP Risk Autopilot:** combine evidence and market state, then perform a bounded pool defense. This is the selected MVP direction because it closes the largest product-completeness gap with the existing v4 hook.
3. **X Layer Risk Network:** publish shared risk state for many markets. This is the selected expansion direction after the single-pool loop works.

The implementation order is therefore:

> LP Risk Autopilot first, X Layer Risk Network second, Exchange OS adapter third.

### 5.1 Selected Differentiation Strategy

Three communication strategies were considered:

1. **Feature-led:** present the Evidence Graph, AI agents, dynamic fee, registry, and integrations as separate innovations. This is easy to explain but weak because competitors already have most individual components.
2. **Competitor-led:** explain Tinjau mainly by comparing it with Chainlink, RiskClaw, Hypernative, and other projects. This establishes awareness but lets competitors define the product story.
3. **Proof-led vertical workflow:** show one information event moving through evidence resolution, safe rumor containment, market confirmation, bounded LP action, recovery, and measured outcome. This is the selected strategy.

The third strategy is a product requirement, not only a pitch style. The demo, UI, benchmark, README, and submission copy must all expose the same end-to-end proof.

### 5.2 Competitive Novelty Boundary

Competitive research found that Tinjau must not claim the following components as individually novel:

- **Multi-model corporate-action extraction:** Chainlink and institutional partners have demonstrated AI-based extraction, validation, golden records, and distribution.
- **AI-selected dynamic fees:** RiskClaw, NeuralHook, Sentinel Agent, UniBrain, and other v4 projects already connect market telemetry to bounded fee or liquidity actions.
- **Generic news and sentiment analysis:** RavenPack and other financial-intelligence providers already resolve entities, events, relevance, novelty, sentiment, and impact.
- **Broad automated on-chain response:** Hypernative and Chaos Labs already monitor risk and automate protocol actions or parameter updates.
- **CEX/DEX divergence and fresh-price protection:** existing agents and AMM designs already use cross-venue pricing, volatility, TWAP, or order flow to reduce adverse selection.

Tinjau's defensible claim is the combined vertical workflow:

> A source-grounded corporate event or rumor is mapped to a specific tokenized equity, checked against OKX/X Layer market discontinuity, converted into a bounded LP policy, and evaluated against a reproducible pool-level baseline.

No “first” claim should be made. The accurate statement is that no complete public product with this exact combination was found in the reviewed sources; private, unindexed, or inaccessible projects may exist.

### 5.3 Five Differentiators Tinjau Must Prove

1. **Causal evidence, not only market symptoms.** A volatility hook sees that price moved; Tinjau explains which corporate claim may have caused it and preserves the original source. A verified official event may provide safe lead time before a volatility-only controller reacts.
2. **Safe rumor containment.** A rumor can accelerate investigation and monitoring, but a single rumor cannot directly trigger an aggressive fee or pool action.
3. **Dual confirmation.** Tinjau requires both information evidence and an independently observed market consequence before non-official evidence can activate `PROTECT`.
4. **Tokenized-equity-aware protection.** Decisions include market hours, corporate-action semantics, reference-market discontinuity, token mapping, and executable X Layer exit depth—not only generic token volatility.
5. **Measured protection data.** Every intervention records whether it improved LP markout, fee revenue, or adverse selection versus both a static-fee policy and a volatility-only policy. This event-to-outcome history can become the long-term data advantage.

## 6. Risk-State Model

Tinjau exposes one current state per supported asset and pool.

### `NORMAL`

- No material unresolved evidence.
- Existing baseline fee policy remains active.
- Standard polling frequency is used.

### `WATCH`

- Triggered by an unconfirmed rumor, one credible news report, conflicting evidence, or unusual market behavior without sufficient attribution.
- Increases monitoring frequency and surfaces an LP warning.
- Does not trigger an aggressive fee change or unrestricted trade.
- Automatically expires unless refreshed by new evidence.

### `PROTECT`

- Triggered by a verified official event, or by sufficiently corroborated non-official evidence plus independent market confirmation.
- Allows only pre-authorized actions within hard contract limits.
- Has a maximum duration, cooldown, and deterministic decay back toward `NORMAL`.

### Minimum Promotion Rules

- A social rumor alone can never promote an asset beyond `WATCH`.
- A single news source alone can never activate an aggressive `PROTECT` action.
- An official filing may activate `PROTECT` only after Tinjau's existing parse-agreement and bonded-publication requirements pass.
- Non-official evidence requires at least two independent evidence sources and one market-confirmation signal, such as price divergence, abnormal trade velocity, or worsening executable exit depth.
- Missing, stale, or conflicting market data cannot promote a state to `PROTECT`. If protection is already active, the last valid state follows its original bounded expiry and decay policy rather than being cancelled by missing data.

Exact thresholds will be fixed from replay data in the implementation plan, not selected by the LLM at runtime.

## 7. Architecture

```text
SEC / issuer / xStocks       News providers       Social sources
           \                     |                    /
            +---------- AI Evidence Graph ---------+
                                   |
                 source identity, claims, agreement,
                 contradiction, recency, confidence
                                   |
            OKX index + X Layer DEX trades/liquidity
                                   |
                    Market Confirmation Engine
                                   |
                       NORMAL / WATCH / PROTECT
                                   |
             Bounded Policy + X Layer Risk Registry
                         /                    \
             Uniswap v4 hook           Read-only consumers
                         |
                   Protection Record
```

The architecture preserves two separate trust domains:

- **AI domain:** collect broad evidence, resolve entities, connect claims, detect contradictions, and propose a risk state with a human-readable explanation.
- **Contract domain:** verify signatures, freshness, nonce, supported pool, action type, fee ceiling, maximum duration, cooldown, and deterministic recovery policy.

AI flexibility must never imply unlimited execution authority.

## 8. Core Components

### 8.1 Official Evidence Adapter

Reuses the current SEC EDGAR ingestion, three independent parses, per-field agreement, exact source hash, bond, and challenge mechanism. It later adds issuer and xStocks corporate-action records where access is available.

### 8.2 News and Rumor Intake

Normalizes articles and social posts into claims containing source, author, timestamp, affected company, affected token, event type, and original URL. It must preserve provenance and must never convert speculation into a factual event merely by rewriting it.

### 8.3 AI Evidence Graph

Groups claims about the same underlying event and records:

- which sources make each claim;
- whether sources are independent;
- which claims support or contradict one another;
- whether an official document confirms the claim;
- which X Layer tokens and pools may be affected;
- why the resulting confidence changed.

AI is necessary here because claims can be ambiguous, contradictory, duplicated, or expressed before a formal disclosure exists. However, the graph alone is not the product moat. A deterministic rules engine maps the structured graph and market signals to the three permitted risk states, and the complete evidence-to-outcome loop creates the differentiation.

### 8.4 Market Confirmation Engine

Uses OKX Onchain OS and direct X Layer reads to calculate manipulation-resistant confirmation signals:

- X Layer DEX price versus an OKX index/reference price;
- abnormal volume and trade velocity;
- pool liquidity and executable exit depth;
- price basis and short-window drawdown;
- market-hours and event-calendar context.

No single price spike is sufficient. Short-lived wick confirmation and data-freshness checks are required.

### 8.5 Bounded Adaptive Fee

The first automatic action is a temporary Uniswap v4 dynamic-fee adjustment on a Tinjau-controlled pool. The policy contract defines the baseline fee, maximum fee, maximum protection duration, cooldown, and decay curve.

`WATCH` changes observation and communication, not the aggressive fee. `PROTECT` may raise the fee only within the policy envelope. The LLM cannot select an arbitrary fee or duration.

### 8.6 X Layer Risk Registry

Publishes a compact reusable record containing asset, pool, state, reason code, evidence commitment, confidence band, timestamp, expiry, and policy version. Other X Layer applications can consume this record without trusting Tinjau's dashboard.

The registry is a public-good integration surface, not proof that every consumer must share the same policy. Consumers remain free to map the risk state to their own bounded action.

### 8.7 Proof of Protection

Every completed `PROTECT` period records:

- triggering evidence and market state;
- policy and action applied;
- actual protected-pool outcome;
- replayed outcomes under the previous static-fee policy and a volatility-only dynamic-fee policy;
- fees earned, adverse selection, and LP markout;
- false-positive or false-negative label when measurable.

The UI must distinguish observed facts from replayed counterfactuals. “Loss avoided” is shown only when the replay method and data are available. If Tinjau does not outperform the volatility-only baseline on the selected event set, the product must report that result rather than claim event awareness created additional protection.

## 9. Third-Party Integration Strategy

### MVP Integrations

1. **SEC EDGAR:** authoritative disclosure source and existing trusted-evidence path.
2. **OKX Onchain OS Market API:** token price, index price, trades, candles, liquidity, and later portfolio/holder signals.
3. **Uniswap v4 on X Layer:** bounded action and measurable LP outcome layer.
4. **One financial-news feed plus direct issuer feeds:** credible pre-filing and non-filing information.
5. **One social source:** rumor discovery only; never sole execution authority.

### Partnership-Level Integration

**xStocks/Payward** should provide asset definitions and corporate-action semantics. SEC explains what happened to the company; the issuer explains how that event changes the token representation. If no stable public issuer interface is available, Tinjau must label the integration as a partnership target rather than simulate it.

### Later Integrations

- **OKX Agentic Wallet:** execute a pre-authorized LP-management action with protected signing and zero-gas support on X Layer where applicable.
- **OKX x402/API payments:** sell Tinjau risk evaluations per call and let the agent purchase premium evidence only when uncertainty justifies the cost.
- **Nansen, Chainalysis, Pyth, or other X Layer ecosystem partners:** add flow, security, or oracle signals only after concrete asset and network coverage is verified.

Adding provider logos without a tested data path is explicitly out of scope.

## 10. X Layer-Specific Differentiation

The Solidity contracts remain technically portable because X Layer is EVM-compatible. Tinjau's defensibility must therefore come from an ecosystem-native operating loop rather than a false claim of code exclusivity.

X Layer is not presented as merely the deployment chain. It supplies the tokenized-stock assets, OKX reference-market context, on-chain liquidity, low-cost policy settlement, and future Exchange OS distribution that make the complete protection loop useful. Another chain could copy the contracts, but it would still need to rebuild these data, asset, liquidity, and distribution relationships.

### 10.1 X Layer Market Discontinuity Guard

Tinjau combines four resources that coexist naturally in the OKX/X Layer stack:

- xStocks deposited and withdrawn on X Layer;
- OKX's continuously traded tokenized-stock markets and reference/index data;
- X Layer DEX pools and one-second, low-cost settlement;
- Uniswap liquidity and Tinjau risk state on the same chain.

The resulting signal measures not only “bad news” but the discontinuity between off-chain information, OKX reference pricing, and executable X Layer liquidity.

### 10.2 X Layer Risk Feed Paid on X Layer

Tinjau exposes a machine-readable risk endpoint for wallets, pools, market makers, and agents. Paid requests can settle through OKX's x402-compatible API payment flow using supported stablecoins on X Layer. This creates an ecosystem-aligned revenue path and an auditable usage trail.

The free tier exposes delayed or coarse states; the paid tier may expose low-latency evidence, pool-specific confirmation, and historical risk records. Pricing is outside the MVP.

### 10.3 Exchange OS Risk-Control Adapter

Exchange OS is the long-term X Layer-native extension. Tinjau should become an event-risk adapter for markets built on Exchange OS:

- X Layer EVM anchors the evidence commitment, policy, and governance.
- Exchange OS/TradeZone venues consume the risk state for their configurable risk controls.
- One corporate event may inform spot, perpetual, and outcome markets using shared infrastructure.

This is more chain-specific than a v4 hook because Exchange OS is an X Layer market primitive. However, open-market deployment is being released in phases, so the MVP must show an adapter interface and architecture only—not claim a live integration until builder access and APIs are confirmed.

## 11. End-to-End Demo

The primary demo must prove differentiation rather than tour features. It contains three connected scenes.

### Scene A — Safe Rumor Handling

1. Tinjau ingests a clearly labeled historical or simulated rumor with its original source.
2. The Evidence Graph identifies the company, token, claim, source independence, contradiction, and confidence.
3. The asset changes from `NORMAL` to `WATCH`.
4. The UI and contract policy show that no aggressive fee action is authorized.

### Scene B — Confirmed Event Protection

1. Tinjau ingests a real official filing or a clearly labeled historical replay.
2. The Evidence Graph displays the source claims, agreement, contradiction, and provenance.
3. OKX/X Layer data confirms whether the pool is already reacting.
4. Tinjau changes the asset from `NORMAL` to `PROTECT`.
5. The policy contract proves that the requested fee and duration are within bounds.
6. The v4 pool executes the adjusted fee.
7. The system returns to `NORMAL` through deterministic decay.
8. Proof of Protection records the intervention and outcome.

### Scene C — Proof Against Simpler Alternatives

The same market replay is run through three policies:

1. a static-fee pool;
2. a volatility-only dynamic-fee controller;
3. Tinjau's event-aware controller.

The result compares LP markout, fee revenue, adverse selection, action latency, protection duration, and false-positive cost. This comparison is mandatory because “AI + dynamic fee” is already a crowded category. Tinjau wins the claim only when causal event awareness adds measurable value beyond generic volatility detection.

The demo should make the core difference understandable within the first 30 seconds:

> Other risk hooks react after the market becomes volatile. Tinjau can understand why a tokenized stock may become unsafe, contain uncertain rumors, confirm the effect on X Layer, and prove whether its bounded response helped the LP.

### 11.1 Submission Communication System

Every public artifact must use the same narrative hierarchy:

1. **Problem:** 24/7 tokenized-stock pools can quote stale risk while the underlying company and reference market move discontinuously.
2. **Existing alternatives:** corporate-action processors explain official events; market-risk hooks react to price or liquidity symptoms; monitoring platforms automate broad responses.
3. **Tinjau's addition:** one causal, rumor-safe, market-confirmed, bounded, and measurable LP protection loop on X Layer.
4. **Proof:** a real or clearly labeled replay shows `evidence -> state -> bounded action -> recovery -> outcome`, beside a volatility-only baseline.
5. **Ecosystem value:** the resulting X Layer risk state is reusable by other pools, wallets, agents, and future Exchange OS markets.

Artifact-specific requirements:

- **Demo:** show the decision boundary and baseline comparison; do not spend most of the video on dashboards or architecture diagrams.
- **README/documentation:** include “what already exists,” “what Tinjau adds,” source provenance, safety rules, contract limits, deployed evidence, and reproducible benchmark steps.
- **Pitch/submission copy:** lead with the LP problem and verified outcome, then explain AI and X Layer as necessary parts of the solution.
- **UI:** visibly distinguish `OFFICIAL`, `NEWS`, and `RUMOR`; show why the state changed, which market signal confirmed it, what action ceiling applies, and whether the measured result is observed or replayed.
- **Architecture diagram:** emphasize the two trust domains—AI proposes structured evidence and contracts enforce bounded policy.

## 12. Failure Handling

- **LLM unavailable:** official ingestion retries; the last valid risk state remains until expiry; no unsupported promotion occurs.
- **Sources disagree:** Evidence Graph records the contradiction and caps the state at `WATCH` unless promotion rules are independently satisfied.
- **Stale OKX or pool data:** market confirmation becomes unavailable, no new `PROTECT` transition is allowed, and any already-active protection follows its existing bounded expiry and decay policy.
- **Duplicate event:** source hash and event identity make ingestion idempotent.
- **Compromised poster:** signatures, nonces, expiry, supported pools, and policy ceilings restrict actions; bonded official claims remain challengeable.
- **Contract or transaction failure:** the event remains visible, action status is marked failed, and no protection benefit is claimed.
- **False positive:** fee decays automatically; the record remains in the performance history.
- **Emergency:** a narrowly scoped pause disables new protection actions without deleting evidence history.

## 13. Measurement and Testing

### AI Evaluation

- Event extraction accuracy against labeled official filings.
- Claim clustering and company/token entity resolution.
- Source-independence classification.
- Contradiction detection.
- Rumor-to-`WATCH` safety rate.
- Unsupported-`PROTECT` rate, whose target is zero in the evaluation set.

### Market and Policy Evaluation

- Replay every supported historical event under a static-fee baseline, a volatility-only dynamic-fee baseline, and the Tinjau event-aware policy.
- Measure LP markout, fee revenue, adverse selection, maximum fee, protection duration, and time to decay.
- Include neutral events and false rumors, not only dramatic negative examples.
- Report the full distribution and tail cases; do not use only an average or a hand-picked winning event.

### Contract Evaluation

- Reject expired, replayed, unsupported, or incorrectly signed assessments.
- Enforce fee ceilings, duration limits, cooldowns, and valid state transitions.
- Fuzz risk-state and policy boundaries.
- Verify that rumor-only input cannot reach the aggressive action path.

### End-to-End Acceptance Criteria

The MVP is complete only when it demonstrates:

1. one source-linked event;
2. one explainable risk-state transition;
3. one bounded on-chain pool action;
4. one automatic recovery;
5. one reproducible outcome comparison;
6. one rumor example safely contained at `WATCH`;
7. one side-by-side result against a volatility-only dynamic-fee policy;
8. one concise competitor matrix showing occupied components and Tinjau's combined vertical workflow.

## 14. Delivery Phases

### Hackathon MVP — One Narrow Vertical Slice

- Create the single end-to-end protection demo.
- Add risk-state explanations and bounded policy visibility.
- Add replay comparison against static-fee and volatility-only policies and publish Proof of Protection.
- Preserve all existing bonded-source and challenge behavior.
- Build the minimum news/social adapters and Evidence Graph needed for one rumor and one confirmed-event scenario.
- Add source credibility, independence, contradiction, and recency handling.
- Add OKX/X Layer market confirmation and executable exit-depth measurement.
- Demonstrate that a rumor alone remains `WATCH`.
- Publish a minimal X Layer Risk Registry record or read-only interface that another application can consume.

### Post-Hackathon Phase 1 — Expand AI Risk Intelligence

- Add more news/social providers and supported event types.
- Improve source credibility, entity resolution, contradiction, and recency models using labeled evaluations.
- Expand the historical benchmark beyond the narrow submission scenario.

### Post-Hackathon Phase 2 — Become X Layer Infrastructure

- Generalize the X Layer Risk Registry and pool-consumer interface.
- Publish a small SDK and machine-readable risk endpoint.
- Add x402-based usage monetization and, if valuable, Agentic Wallet execution.
- Integrate one external X Layer pool or market consumer.

### Post-Hackathon Phase 3 — Exchange OS Expansion

- Confirm builder access and production interfaces.
- Implement and test an Exchange OS risk-control adapter.
- Extend risk state from a v4 pool to spot, perpetual, or outcome venues where appropriate.
- Keep each venue's action policy isolated even when evidence is shared.

### Implementation-Plan Boundary

The first implementation plan covers the **Hackathon MVP vertical slice only**. It includes one official-event path, one rumor path, one OKX/X Layer confirmation path, one bounded v4 action, automatic recovery, one minimal reusable risk record, and the three-policy benchmark. Broad provider coverage, a full SDK, x402 monetization, Agentic Wallet execution, and Exchange OS remain separate post-hackathon plans.

## 15. Product Boundaries and Honest Claims

- Tinjau is an autonomous risk-control product only when a complete bounded action can be shown; otherwise it is an assisted oracle.
- X Layer contribution comes from shared risk infrastructure, xStocks/OKX market discontinuity detection, X Layer settlement, and future Exchange OS integration—not from claiming the EVM code is unportable.
- The existing measured median LP markout is small, while tail events are larger. Marketing and evaluation must report the full distribution and must not imply that every filing creates material loss.
- The initial v4 demo uses a builder-controlled pool because current meaningful xStock liquidity is primarily elsewhere. It must be labeled accordingly.
- Exchange OS integration remains roadmap scope until the necessary production interfaces and access are verified.
- Tinjau must not claim to be the first AI dynamic-fee hook, first multi-agent corporate-action oracle, first CEX/DEX risk agent, first on-chain risk registry, or first self-protecting pool.
- “AI Evidence Graph” is an internal capability, not a standalone moat. The differentiated asset is the tokenized-equity event-to-policy-to-outcome history.
- Chainlink, RavenPack, OKX, and similar providers may be upstream data or infrastructure partners. Tinjau's role is the X Layer LP policy, enforcement, and measured-outcome layer.

### Approved Claims

- “Corporate-event-aware market discontinuity guard for tokenized-stock liquidity on X Layer.”
- “Rumors accelerate monitoring but cannot directly authorize aggressive pool protection.”
- “For non-official evidence, Tinjau requires independent OKX/X Layer market confirmation before bounded action.”
- “Every protection period is measured against reproducible static-fee and volatility-only baselines.”
- “No complete public product with this exact combination was found in the reviewed sources.”

### Claims Requiring Evidence Before Use

- “Tinjau reduces LP loss” requires a reproducible benchmark result on the stated event set.
- “Real-time” requires measured source-to-state latency.
- “Production-ready” requires deployment against meaningful external liquidity, not only a builder-controlled test pool.
- “X Layer-native” requires at least one working OKX/X Layer data path and one on-chain X Layer action or reusable risk record.

## 16. Primary External References

- Supporting research artifact: [Tinjau Competitive Landscape Deep Research](../../buildx-orion-2026/outputs/03-product/tinjau-competitive-landscape-deep-research.html)

- X Layer and Exchange OS: <https://web3.okx.com/xlayer>
- Exchange OS introduction: <https://web3.okx.com/learn/exchange-os>
- OKX Onchain OS Market API: <https://web3.okx.com/onchainos/dev-docs/market/market-api-fee>
- OKX Agentic Wallet and Wallet API: <https://web3.okx.com/onchainos/dev-docs/wallet/product-and-service>
- OKX Unified Tokenized Stocks: <https://www.okx.com/en-gb/help/okx-to-list-unified-tokenized-stocks-xibm-xhood-and-more-for-spot-trading>
- Uniswap on X Layer: <https://blog.uniswap.org/uniswap-is-now-live-on-x-layer>
- Chainlink corporate-actions initiative: <https://chain.link/resources/establishing-unified-standard-asset-servicing>
- Swift corporate-actions collaboration: <https://www.swift.com/news-events/news/modernising-corporate-actions-through-technology-and-collaboration>
- RiskClaw: <https://ethglobal.com/showcase/riskclaw-ip3a9>
- NeuralHook: <https://ethglobal.com/showcase/neuralhook-8gxzp>
- Hypernative automated response: <https://www.hypernative.io/product/onchain-monitoring-automated-response>
- Chaos Labs Risk Oracles: <https://chaoslabs.xyz/posts/risk-oracles-one-step-beyond-price-oracles>
- RavenPack News Analytics: <https://www.ravenpack.com/products/news-analytics>
- Arrakis HOT AMM: <https://docs.arrakis.finance/text/modules/hotAmm/whitepaper.html>
