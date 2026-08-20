# Tinjau — Independent Evaluation Brief for X Layer Build X AI Season

**As of:** 2026-08-20  
**Former project name:** AFTERHOURS  
**Purpose:** provide a fact-separated description of the final Tinjau idea and its current implementation state for independent hackathon evaluation.  
**This document does not assign scores, recommend a verdict, or assume that planned features will ship.**

## 1. Status labels used in this document

| Label | Meaning |
|---|---|
| **Implemented** | Present in the repository or deployed system and checked directly. |
| **Measured** | Supported by a recorded study with a stated sample and method. |
| **Designed** | Included in the approved product specification but not yet implemented. |
| **Roadmap** | Explicitly excluded from the hackathon MVP. |
| **Unverified** | No sufficient evidence is available in the reviewed repository or public sources. |

Evaluators should not count a **Designed** or **Roadmap** component as completed product functionality.

## 2. Hackathon context

The [official Build X AI Season page](https://web3.okx.com/xlayer/build-x-series) states:

- event period: 2026-08-07 through 2026-08-21 at 23:59 UTC;
- projects must incorporate AI and deploy on X Layer Testnet during the hackathon, followed by a later X Layer Mainnet launch;
- a dedicated active X account, a submission post mentioning `@XLayerOfficial`, and the designated submission form are participation requirements;
- the AI-RWA Liquidity Grant is 50,000 USDT;
- judging criteria are application of AI, innovation, product completeness, user value, integration with X Layer, growth potential, and contribution to the X Layer ecosystem.

Current eligibility evidence in this repository establishes an X Layer Testnet deployment. Mainnet deployment, the final submission post, and form submission are not established by this document.

## 3. Final idea

### 3.1 One-sentence description

Tinjau is designed as a corporate-event-aware market-discontinuity guard for tokenized-stock liquidity on X Layer: it links source-grounded corporate information to current market conditions, applies a bounded pool-protection policy, and records the resulting LP outcome.

### 3.2 Primary user

The selected primary user is an LP or operator of a tokenized-equity liquidity pool on X Layer. Individual token holders may consume warnings, but they are not the primary MVP user.

### 3.3 Problem being addressed

OKX states that its Unified Tokenized Stocks trade 24/7, including outside US market hours, when pricing uses the last close plus a market estimate. OKX also states that these assets support deposits and withdrawals on X Layer and Solana and are powered by the xStocks framework. This creates a time-domain difference between continuous token trading and the operating hours or publication timing of the underlying reference market, company disclosures, and corporate actions. Source: [OKX Unified Tokenized Stocks announcement](https://www.okx.com/en-gb/help/okx-to-list-unified-tokenized-stocks-xibm-xhood-and-more-for-spot-trading).

The product hypothesis is that an LP may quote stale risk during an earnings release, acquisition, bankruptcy report, regulatory event, issuer action, or pre-confirmation report. The existence and material size of preventable LP loss must be evaluated from measurements rather than assumed; the repository measurements are reported in Section 9.

### 3.4 Intended product boundary

Tinjau is not designed to:

- predict stock prices or promise profitable trades;
- let one social-media post directly authorize an aggressive pool action;
- give an LLM arbitrary contract-call or fund-transfer authority;
- claim prevented loss without a reproducible counterfactual;
- support every tokenized stock, DEX, chain, news provider, or action type in the hackathon MVP.

## 4. Proposed end-to-end mechanism

```text
Official filings / issuer data     Financial news     Social reports
                 \                      |                 /
                  +-------- AI evidence processing ------+
                                      |
                  provenance, claims, agreement,
                  contradiction, recency, confidence
                                      |
                   OKX reference data + X Layer DEX state
                                      |
                          market-confirmation rules
                                      |
                         NORMAL / WATCH / PROTECT
                                      |
              bounded policy + on-chain X Layer risk record
                         /                         \
              Uniswap v4 pool action        read-only consumers
                         |
                 measured protection record
```

The proposed loop contains six stages:

1. **Evidence intake:** ingest official disclosures, financial news, and social reports while retaining the original source and timestamp.
2. **AI evidence processing:** extract claims, resolve company and token identities, group related claims, identify contradictions, and estimate whether sources are independent.
3. **Market confirmation:** compare the evidence with OKX reference data and X Layer price, volume, trade velocity, liquidity, basis, and executable exit depth.
4. **Risk-state decision:** map structured evidence and market signals into one of three allowed states through deterministic rules.
5. **Bounded action:** permit only a pre-authorized temporary fee action with a ceiling, expiry, cooldown, and deterministic decay.
6. **Outcome record:** compare the observed or replayed result with simpler policies and label which values are observations versus counterfactuals.

## 5. Risk-state and promotion rules

### `NORMAL`

- No material unresolved evidence under the configured policy.
- The baseline fee policy remains active.

### `WATCH`

- May be triggered by one rumor, one news report, conflicting evidence, or unusual market behavior without sufficient attribution.
- Increases monitoring and displays a warning.
- Does not authorize the proposed aggressive fee action.
- Expires unless refreshed by new evidence.

### `PROTECT`

- May be triggered by an official event that passes the existing parse-agreement and bonded-publication rules.
- Non-official evidence requires at least two independent sources plus one independent market-confirmation signal.
- Allows only a bounded action defined in contract policy.
- Returns toward `NORMAL` through a maximum duration, cooldown, and deterministic decay.

Additional designed rules:

- one social rumor cannot promote an asset beyond `WATCH`;
- one news source cannot independently activate `PROTECT`;
- stale or conflicting market data cannot create a new non-official `PROTECT` transition;
- exact thresholds are to be fixed from replay data, not selected by the LLM at runtime.

These three states and promotion rules are **Designed**, not implemented in the current repository. The current implementation uses filing grades named `NORMAL`, `ELEVATED`, and `GRAVE`, which are not the same state machine.

## 6. Role and authority of AI

### 6.1 Implemented AI role

The current pipeline:

1. fetches SEC EDGAR filings;
2. strips the filing HTML;
3. performs three independent Gemini-family parses;
4. compares results per field;
5. requires agreement on key fields before marking a result ready to post;
6. produces a separate, explicitly unbonded severity grade;
7. maps the structured result into an on-chain event record.

### 6.2 Designed AI extension

The final idea adds AI processing for news and social reports where wording, duplication, attribution, entity identity, source independence, and contradiction cannot be handled by a fixed document parser alone. The output is a structured evidence graph and explanation, not arbitrary transaction calldata.

### 6.3 Execution authority

The designed trust boundary is:

- AI proposes structured evidence and a risk assessment;
- deterministic code applies promotion thresholds;
- contracts enforce supported pools, signatures, nonces, freshness, fee ceilings, duration, cooldown, expiry, and recovery.

An LLM is not intended to choose an unrestricted fee, duration, destination, or arbitrary action.

## 7. X Layer and third-party integration map

| Component | Intended role | Status as of 2026-08-20 |
|---|---|---|
| SEC EDGAR | Authoritative corporate-disclosure source | **Implemented** for selected filings. |
| Gemini-family models | Three-way extraction and severity grading | **Implemented**; evaluation caveats are in Section 9. |
| X Layer Testnet | Event registry, hook, pool, and swap execution | **Implemented** using project-deployed infrastructure and mock pool assets. |
| Uniswap v4 | Temporary dynamic-fee action | **Implemented** on a builder-owned X Layer Testnet PoolManager; not deployed against production liquidity. |
| OKX Onchain OS index data | Reference-price polling and proposed market confirmation | Index polling for two instruments is **Implemented**; the final multi-signal promotion engine is **Designed**. OKX documents index-price, market-price, trades, candles, and liquidity-related endpoints. |
| Financial-news provider | Pre-filing and non-filing evidence | **Designed**; provider not fixed in the implementation. |
| Social source | Rumor discovery only | **Designed**; provider not fixed in the implementation. |
| xStocks/Payward | Asset mapping and corporate-action semantics | **Unverified partnership target**; no partnership or dedicated integration is claimed. |
| X Layer Risk Registry/API | Reusable asset and pool risk state | **Designed**. The current deployed contract is an event-state registry, not the final reusable risk registry. |
| OKX x402 payments | Pay-per-call risk API | **Roadmap**. OKX documents x402 and subscription payments in USDG or USDT on X Layer for its Market API. |
| OKX Agentic Wallet | Pre-authorized LP-management execution | **Roadmap**. |
| Exchange OS adapter | Share evidence with spot, perpetual, or outcome-market controls | **Roadmap**; no live integration is claimed. OKX states that Exchange OS rollout is staged and broader open-market deployment is scheduled for Q3 2026. |

Official ecosystem references:

- [X Layer and Exchange OS](https://web3.okx.com/xlayer)
- [Exchange OS introduction](https://web3.okx.com/learn/exchange-os)
- [OKX Onchain OS Market API fees and endpoints](https://web3.okx.com/onchainos/dev-docs/market/market-api-fee)
- [Uniswap on X Layer](https://blog.uniswap.org/uniswap-is-now-live-on-x-layer)

The Solidity logic is EVM-portable. The design does not claim that another EVM chain is technically unable to reproduce the contracts. The X Layer-specific dependency is the proposed combination of X Layer xStocks, OKX reference data, X Layer liquidity and settlement, an X Layer risk record, and a possible future Exchange OS consumer.

## 8. Current implementation evidence

### 8.1 Local verification on 2026-08-20

- Server tests: **153 passed, 0 failed**.
- Foundry contract tests: **56 passed, 0 failed**.
- Server TypeScript check: passed.
- Web TypeScript check: passed when run after generated Next.js types were present.
- Web production build: passed; routes include `/`, `/holdings`, `/calendar`, `/scoreboard`, and `/api/scoreboard`.

These tests cover the existing filing-to-registry and dynamic-fee prototype. They do not cover the unimplemented final Evidence Graph, rumor state machine, market-confirmation engine, final risk registry, or three-policy benchmark.

### 8.2 X Layer Testnet deployment

Network: X Layer Testnet, chain ID 1952.

| Contract or asset | Address | Evidence scope |
|---|---|---|
| EventStateRegistry | `0x713f45f44e74616898FB366E11881196221933aA` | Stores bonded structured events and challenge state. |
| Builder-owned PoolManager | `0x8F862A8b6f00C99b0610dc764228C661c4909ae1` | Testnet v4 infrastructure; not the canonical mainnet deployment. |
| Dynamic-fee hook | `0xbCb4B7310BA36eA01f2A435A5D64C9b7953d8080` | Reads the event registry and applies bounded dynamic fees. The deployed bytecode retains the former `AfterhoursFeeHook` contract name. |
| Mock wNVDAx | `0xf07A9D89848bc694c7154Fda4cce707Eb409F903` | Freely minted test asset; not production wNVDAx. |
| Mock USDG | `0x666e81CCb9D4d6c2e7A3ed9f317E3dFBa2410e99` | Freely minted test asset; not production USDG. |
| Swap router | `0x6F554A0bEE654Ead7C7eACDD300A72170a674C62` | Used for the testnet swap demonstration. |

Recorded on-chain examples:

- one real MSTR 8-K was fetched from SEC EDGAR, parsed three times, bonded with mock collateral, posted as event ID 1, and read back;
- one explicitly synthetic NVDA bankruptcy document was parsed and posted as event ID 2;
- the synthetic event changed the previewed and emitted swap fee from a 500 baseline to 16,490, within a configured 20,000 maximum;
- the current fee mechanism reacts to filed event fields and severity. It does not yet use news, rumor handling, or the proposed market-confirmation rules.

### 8.3 Public frontend

- `https://tinjau.xyz` returned HTTP 200 on 2026-08-20.
- `https://tinjau.xyz/api/scoreboard` returned two records: the synthetic NVDA event with a measured `reacted` state and the real MSTR event with `no_poller_coverage`.
- The served HTML still contained instances of the former `AFTERHOURS` branding when checked on 2026-08-20.

No mainnet pool, production positions, external LP deposits, protected TVL, paying users, revenue, or third-party risk-feed consumer is established by the reviewed evidence.

## 9. Existing measurements and their limitations

### 9.1 Filing parse study

Sample: 30 filings, 90 parse attempts.

| Measure | Recorded result |
|---|---:|
| Affected-token accuracy | 90/90 attempts |
| Effective-date inclusion, all attempts | 85/90 attempts |
| Effective-date inclusion, meaningful subset | 25/30 attempts |
| Event type, item-code weak-label subset | 15/16 filings |
| Key-field unanimity | 28/30 filings |
| `readyToPost` | 28/30 filings |
| Declared-amount inter-model agreement | 15/30 filings |

Limitations:

- the 30 rows were collected across five Gemini-family models because of per-model free-tier quotas, not one production model;
- affected-token accuracy is a low-complexity check because the ticker is present in the prompt;
- the human-adjudicated accuracy tier was not completed;
- agreement between models is not equivalent to factual correctness.

Source: [parse-accuracy study](../05-build/parse-accuracy-study.md).

### 9.2 Filing-to-pool reaction latency

Sample: 46 SEC filings across nine underlyings.

- 14/46 filings had no trade within the stated ±60-minute window;
- among events with a qualifying trade, the pooled median gap was 274 seconds, or 4.6 minutes;
- the result measures when a pool traded after a filing, not how quickly Tinjau itself can ingest and process the filing;
- per-ticker results varied substantially and the sample was not uniform across tickers.

Source: [reaction-latency study](../05-build/reaction-latency-study.md).

### 9.3 First-trade LP markout

Sample: 32 events with a qualifying first trade.

| 60-minute measure | Recorded result |
|---|---:|
| Median net LP markout | -$0.0614 |
| Mean net LP markout | -$2.5874 |
| Sum | -$82.80 |
| Loss outcomes | 25/32 events |
| Median as first-trade notional | -9.5 bps |
| Median as event-time pool TVL | -0.002 bps |

Two events accounted for 76% of the aggregate dollar loss. In the named USDG/wNVDAx reference pool, the two 60-minute results were -$0.1306 and +$0.0112.

Limitations:

- the later price is the same pool's later quote, not an external fair-value oracle;
- the study does not prove that a filing caused the trade or that the trader was informed;
- the study does not measure what the Tinjau hook would have prevented;
- results are aggregate pool markout, not per-LP outcomes;
- the median effect is small relative to pool TVL, while the dollar sum is concentrated in a small number of tail events;
- there is no statistical significance claim or annualized loss estimate.

Source: [markout study](../05-build/markout-study.md).

## 10. Hackathon MVP described by the final design

The final hackathon submission scope is one narrow vertical slice:

1. one source-linked official event;
2. one news or rumor example with retained provenance;
3. an explainable transition through `NORMAL`, `WATCH`, or `PROTECT`;
4. evidence that a rumor alone remains at `WATCH`;
5. one OKX/X Layer market-confirmation path;
6. one bounded v4 fee action;
7. automatic expiry or decay back toward the baseline policy;
8. one minimal reusable X Layer risk record or read interface;
9. one outcome comparison across a static-fee policy, a volatility-only dynamic-fee policy, and Tinjau's event-aware policy.

Broad source coverage, a general SDK, x402 monetization, Agentic Wallet execution, external pool integration, mainnet production liquidity, and Exchange OS integration are outside this MVP definition.

## 11. Intended demo evidence

The designed demonstration has three scenes:

### Scene A — rumor containment

A labeled rumor is ingested, its provenance and contradictions are displayed, the state becomes `WATCH`, and no aggressive fee action is authorized.

### Scene B — confirmed event protection

An official event or labeled historical replay moves through evidence processing, market context, `PROTECT`, a bounded on-chain fee action, deterministic recovery, and an outcome record.

### Scene C — comparison with simpler controls

The same market replay is evaluated under:

1. a static-fee pool;
2. a volatility-only dynamic-fee controller;
3. the Tinjau event-aware controller.

The specified outputs are LP markout, fee revenue, adverse selection, action latency, protection duration, and false-positive cost. No result from this three-policy comparison exists yet in the reviewed repository.

## 12. Public competitive reference set

The following table reports overlap visible in reviewed public sources. It is not an exhaustive market census, and absence from a reviewed page is not proof that a capability does not exist privately.

| Project or category | Publicly described capability | Overlap with Tinjau | Difference visible in reviewed public material |
|---|---|---|---|
| [Chainlink corporate-actions initiative](https://chain.link/resources/establishing-unified-standard-asset-servicing) | Multiple AI models, validation, attestation, standardized corporate-action records, and institutional distribution | Corporate-event extraction and agreement | The reviewed material focuses on asset-servicing data and standardized records; it does not describe an X Layer LP fee-control and outcome-measurement loop. |
| [RiskClaw](https://ethglobal.com/showcase/riskclaw-ip3a9) | Pool metrics, TEE-verified LLM risk output, policy registry, and v4 `ALLOW`/fee-penalty/`BLOCK` action | AI risk assessment, bounded policy, v4 hook | The reviewed material uses pool telemetry; it does not describe source-grounded corporate events, tokenized-equity lifecycle semantics, or rumor containment. |
| [NeuralHook](https://ethglobal.com/showcase/neuralhook-8gxzp) | Multi-agent consensus, signed inference, dynamic fees, rebalancing, and IL-related controls | Multi-agent assessment and automated LP action | The reviewed material centers on price, tick, momentum, and IL signals rather than corporate claims and source provenance. |
| [Sentinel Agent](https://ethglobal.com/showcase/sentinel-agent-eu2d3) | CEX/DEX spread, volatility, liquidity depth, bounded policy, fee/range actions, and agent registry | Cross-venue market confirmation and bounded LP action | The reviewed material does not describe corporate-document or rumor evidence for tokenized equities. |
| [Argus](https://github.com/Madhav-Gupta-28/Argus) | RWA and tokenized-equity risk signals, EIP-712 bounded execution, independent on-chain trigger re-derivation, and reputation records | Same broad RWA risk domain and bounded autonomous protection | The reviewed repository describes position-level actions on Mantle; it does not describe Tinjau's proposed pool-level corporate-evidence graph and three-policy LP benchmark. |
| [Hypernative automated response](https://www.hypernative.io/product/onchain-monitoring-automated-response) | Cross-chain on-chain/off-chain monitoring, AI/ML detection, and automated response | Broad monitoring and automated mitigation | It is a general commercial monitoring platform; the reviewed page does not present the same public X Layer tokenized-stock LP workflow. |
| [Chaos Labs Risk Oracles](https://chaoslabs.xyz/posts/risk-oracles-one-step-beyond-price-oracles) | Real-time volatility and liquidity feeds used to update protocol parameters | Risk signals and parameter automation | The reviewed material does not center on corporate news provenance or rumor-state policy for X Layer tokenized stocks. |
| [RavenPack News Analytics](https://www.ravenpack.com/products/news-analytics) | Entity and event detection, relevance, novelty, sentiment, impact, and broad news/social coverage | News and event intelligence | It supplies financial intelligence rather than on-chain pool enforcement and X Layer outcome records. |
| [Arrakis HOT AMM](https://docs.arrakis.finance/text/modules/hotAmm/whitepaper.html) | Fresh pricing, dynamic fees, and RFQ mechanisms intended to reduce LVR | LP adverse-selection mitigation | It uses market microstructure rather than corporate-event evidence. |

Observed boundary from this reference set:

- multi-model corporate-action extraction is not unique to Tinjau;
- AI-controlled dynamic fees are not unique to Tinjau;
- financial-news analysis is not unique to Tinjau;
- CEX/DEX divergence and automated response are not unique to Tinjau;
- no complete public product combining all proposed Tinjau stages was found in the reviewed sources, but this is not a “first” claim and is subject to incomplete indexing and inaccessible projects.

Supporting source map: [competitive-landscape deep research](../03-product/tinjau-competitive-landscape-deep-research.html).

## 13. Proposed differentiators to evaluate, not assumed conclusions

The final design asks evaluators to test whether the following combination creates material differentiation:

1. **Causal evidence:** links a market-risk assessment to an original corporate filing, news claim, or rumor rather than only observing price symptoms.
2. **Rumor containment:** permits uncertain information to increase monitoring without directly granting aggressive execution authority.
3. **Dual confirmation for non-official evidence:** requires independent information sources and an independent market signal.
4. **Tokenized-equity context:** includes market hours, corporate-action semantics, issuer/token mapping, cross-venue basis, and executable X Layer depth.
5. **Bounded pool action:** contracts restrict the fee, duration, supported pool, cooldown, expiry, and recovery path.
6. **Outcome comparison:** measures the event-aware policy against static-fee and volatility-only alternatives.
7. **Reusable X Layer record:** exposes the resulting state to other pools, wallets, market makers, or agents rather than keeping it inside one dashboard.

Only item 5 has a deployed partial predecessor in the current prototype. Items 1 and 4 are partially represented by the existing SEC and OKX index paths. Items 2, 3, 6, and 7 remain to be implemented in their final form.

## 14. Unresolved factual questions and risks

An independent evaluation should account for the following unresolved items:

- whether event-aware protection outperforms a volatility-only controller on neutral events, false rumors, and tail events;
- whether the measured LP loss is large enough to justify higher fees or operational complexity, given the small median relative to TVL;
- false-positive cost when a report accepted by the configured source policy does not lead to a material market move;
- false-negative behavior during discontinuous moves, stale APIs, missing news, or delayed issuer data;
- manipulation resistance of X Layer pool signals and dependence on OKX/reference-data availability;
- how source independence and credibility are defined and evaluated;
- issuer-specific corporate-action treatment for tokenized stocks;
- legal, geographic, and product-access restrictions around tokenized equities;
- whether external LPs, pool operators, wallets, or market makers will consume the risk record;
- how the product reaches meaningful liquidity when the current v4 pool is builder-owned and uses mock testnet assets;
- mainnet contract addresses, production routes, protected TVL, customers, revenue, and partnerships;
- availability and interface stability of future Exchange OS integration.

## 15. Claims that are not established by current evidence

The following statements should not be treated as facts without additional evidence:

- Tinjau is the first AI dynamic-fee hook, multi-agent corporate-action oracle, CEX/DEX risk agent, on-chain risk registry, or self-protecting pool;
- Tinjau currently reduces LP loss;
- Tinjau is production-ready or protects existing production liquidity;
- the Evidence Graph alone is a proprietary or unique technical primitive;
- Tinjau has production users, protected TVL, revenue, fundraising, formal xStocks/OKX/Uniswap partnerships, or an Exchange OS integration;
- the contracts are technically exclusive to X Layer;
- every filing or rumor creates material LP harm;
- the existing synthetic testnet result demonstrates performance under real liquidity or real news conditions.

## 16. Instructions for an independent evaluator

Evaluate the idea against the seven official criteria in Section 2. For each criterion:

1. separate **Implemented/Measured** evidence from **Designed/Roadmap** scope;
2. cite the specific repository artifact or external source supporting each factual statement;
3. label judgments, forecasts, and causal interpretations as inference;
4. consider both supporting and disconfirming evidence;
5. do not infer uniqueness from the absence of a competitor in the reviewed source set;
6. do not count the builder-owned testnet pool as external adoption or production liquidity;
7. report which missing evidence would most materially change the evaluation.

Primary internal references:

- [final product design](../../../superpowers/specs/2026-08-20-tinjau-lp-risk-autopilot-design.md)
- [task tracker and implementation evidence](../04-planning/task-tracker.md)
- [parse-accuracy study](../05-build/parse-accuracy-study.md)
- [reaction-latency study](../05-build/reaction-latency-study.md)
- [markout study](../05-build/markout-study.md)
- [competitive-landscape research](../03-product/tinjau-competitive-landscape-deep-research.html)
