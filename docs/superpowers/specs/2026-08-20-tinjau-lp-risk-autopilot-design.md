# Tinjau LP Risk Autopilot — Product Evolution Design

**Date:** 2026-08-20  
**Status:** Approved product direction; implementation plan not yet written  
**Primary user:** Liquidity providers and tokenized-equity pool operators on X Layer

## 1. Summary

Tinjau evolves from a corporate-events oracle into an AI-assisted risk-control network for tokenized-equity liquidity on X Layer.

The existing product remains the trusted evidence layer: it reads SEC EDGAR filings three times, measures per-field agreement, binds the result to the source-document hash, and publishes a bonded, challengeable event on X Layer. The new product layer adds news and rumor monitoring, live X Layer market confirmation, bounded defensive actions through Uniswap v4, and measurable protection records.

The product must not let an unverified rumor directly control a pool. AI may investigate broad and ambiguous evidence, but contracts enforce narrow, pre-authorized limits.

The long-term position is:

> AI risk-control infrastructure for tokenized-stock markets on X Layer, detecting corporate events, news, rumors, and cross-venue market discontinuities before LPs absorb the loss.

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

This is the primary AI contribution. A deterministic rules engine then maps the structured graph and market signals to the three permitted risk states.

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
- replayed baseline outcome under the previous fee policy;
- fees earned, adverse selection, and LP markout;
- false-positive or false-negative label when measurable.

The UI must distinguish observed facts from replayed counterfactuals. “Loss avoided” is shown only when the replay method and data are available.

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

The primary demo tells one story:

1. Tinjau ingests a real official filing or a clearly labeled historical replay.
2. The Evidence Graph displays the source claims, agreement, contradiction, and provenance.
3. OKX/X Layer data confirms whether the pool is already reacting.
4. Tinjau changes the asset from `NORMAL` to `PROTECT`.
5. The policy contract proves that the requested fee and duration are within bounds.
6. The v4 pool executes the adjusted fee.
7. The system returns to `NORMAL` through deterministic decay.
8. Proof of Protection compares the protected outcome with the baseline replay.

A second short demo shows a rumor producing only `WATCH`, proving that the system refuses unsafe autonomy.

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

- Replay every supported historical event under baseline and protected policies.
- Measure LP markout, fee revenue, adverse selection, maximum fee, protection duration, and time to decay.
- Include neutral events and false rumors, not only dramatic negative examples.

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
6. one rumor example safely contained at `WATCH`.

## 14. Delivery Phases

### Phase 1 — Close the Existing Product Gaps

- Create the single end-to-end protection demo.
- Add risk-state explanations and bounded policy visibility.
- Add replay comparison and Proof of Protection.
- Preserve all existing bonded-source and challenge behavior.

### Phase 2 — Add Real AI Risk Intelligence

- Build news/social adapters and the Evidence Graph.
- Add source credibility, independence, contradiction, and recency handling.
- Add OKX/X Layer market confirmation and executable exit-depth measurement.
- Demonstrate that a rumor alone remains `WATCH`.

### Phase 3 — Become X Layer Infrastructure

- Generalize the X Layer Risk Registry and pool-consumer interface.
- Publish a small SDK and machine-readable risk endpoint.
- Add x402-based usage monetization and, if valuable, Agentic Wallet execution.
- Integrate one external X Layer pool or market consumer.

### Phase 4 — Exchange OS Expansion

- Confirm builder access and production interfaces.
- Implement and test an Exchange OS risk-control adapter.
- Extend risk state from a v4 pool to spot, perpetual, or outcome venues where appropriate.
- Keep each venue's action policy isolated even when evidence is shared.

### Implementation-Plan Boundary

This roadmap contains several independently deliverable subsystems and must not become one oversized implementation plan. After the written design is approved, the first implementation plan covers **Phase 1 only**: the end-to-end bounded protection loop and its measurable outcome. News and rumor intelligence, the shared X Layer registry/SDK, monetization, and Exchange OS each receive a separate design review or implementation plan after the preceding phase has working evidence.

## 15. Product Boundaries and Honest Claims

- Tinjau is an autonomous risk-control product only when a complete bounded action can be shown; otherwise it is an assisted oracle.
- X Layer contribution comes from shared risk infrastructure, xStocks/OKX market discontinuity detection, X Layer settlement, and future Exchange OS integration—not from claiming the EVM code is unportable.
- The existing measured median LP markout is small, while tail events are larger. Marketing and evaluation must report the full distribution and must not imply that every filing creates material loss.
- The initial v4 demo uses a builder-controlled pool because current meaningful xStock liquidity is primarily elsewhere. It must be labeled accordingly.
- Exchange OS integration remains roadmap scope until the necessary production interfaces and access are verified.

## 16. Primary External References

- X Layer and Exchange OS: <https://web3.okx.com/xlayer>
- Exchange OS introduction: <https://web3.okx.com/learn/exchange-os>
- OKX Onchain OS Market API: <https://web3.okx.com/onchainos/dev-docs/market/market-api-fee>
- OKX Agentic Wallet and Wallet API: <https://web3.okx.com/onchainos/dev-docs/wallet/product-and-service>
- OKX Unified Tokenized Stocks: <https://www.okx.com/en-gb/help/okx-to-list-unified-tokenized-stocks-xibm-xhood-and-more-for-spot-trading>
- Uniswap on X Layer: <https://blog.uniswap.org/uniswap-is-now-live-on-x-layer>
