# AFTERHOURS — Independent Validation

## 1. Event A — X Layer Build X Series, AI Season

**Fact — source:** Event A publishes seven unweighted criteria in clause 4 of its [official terms](https://web3.okx.com/xlayer/build-x-series); the scores below are evidence-weighted inferences as of 2026-08-16, not forecasts that assume every planned component ships.

| Criterion | Score | One-sentence justification |
|---|---:|---|
| Application of AI | **4/5 — Inference** | **Fact — source: [brief §5](afterhours-validation-prompt.md):** the model grades unscheduled-event materiality and severity, and its signed state directly changes swap fees; **Inference:** that is a substantive control-loop role, but the unmeasured classifier error rate and single-signer path prevent a 5. |
| Innovation | **3/5 — Inference** | **Fact — sources: [brief §6](afterhours-validation-prompt.md), [Uniswap dynamic-fee documentation](https://developers.uniswap.org/docs/protocols/v4/concepts/dynamic-fees):** adjacent winning hooks already alter pricing or fees under risk, and Uniswap explicitly lists event-driven fees as a v4 use case; **Inference:** corporate-event semantics for tokenised equities is a differentiated combination, not a new primitive. |
| Product completeness | **2/5 — Inference** | **Fact — sources: [brief §§2, 4–5](afterhours-validation-prompt.md), [official Event A requirements](https://web3.okx.com/xlayer/build-x-series):** the repository is empty, the wallet is unfunded, the required accounts do not exist, mainnet launch is mandatory, and the proposed ingestion surface spans several source classes; **Inference:** the end-to-end vertical slice is coherent but presently too incomplete to score above 2. |
| User value | **3/5 — Inference** | **Fact — sources: [AMM loss-versus-rebalancing paper](https://arxiv.org/abs/2208.06046), [brief §§5 and 7](afterhours-validation-prompt.md):** stale-price adverse selection is a documented LP cost, but no realised overnight-gap loss, LP demand, or migration commitment has been measured for X Layer xStock pools; **Inference:** the value proposition is plausible but locally unvalidated. |
| Integration with X Layer | **4/5 — Inference** | **Fact — source: [brief §§3 and 5](afterhours-validation-prompt.md):** the proposal uses X Layer xStocks, its live Uniswap v4 deployment, a chain registry, a hooked pool, and both required networks; **Inference:** this is deep, chain-native integration, though its protected liquidity must be newly created unless an incumbent v4 pool is found. |
| Growth potential | **2/5 — Inference** | **Fact — source: [brief §§3, 5, and 7](afterhours-validation-prompt.md):** eleven equities offer an expansion path, but the MVP covers one pool, the external feed is undecided, and no existing LP has agreed to migrate; **Inference:** growth depends on unproven liquidity acquisition and distribution. |
| Contribution to the X Layer ecosystem | **3/5 — Inference** | **Fact — sources: [brief §5](afterhours-validation-prompt.md), [Uniswap hook documentation](https://developers.uniswap.org/docs/protocols/v4/concepts/hooks):** the registry and hooked pool could add an RWA-specific risk primitive, while Uniswap notes that creating a hook does not itself cause liquidity to be routed to it; **Inference:** contribution is credible but modest until the state feed is reusable or the pool attracts real liquidity. |

## 2. Event B — Orion Builder Hackathon

**Fact — source:** Event B uses 0–10 scores for usefulness, execution, and originality, and says judges try runnable entries on the [official Orion page](https://orionagents.org/hackathon); the scores below use the proposal and present build state in [brief §§4–7](afterhours-validation-prompt.md).

| Criterion | Score | One-sentence justification |
|---|---:|---|
| Usefulness | **6/10 — Inference** | **Fact — sources: [brief §§5 and 7](afterhours-validation-prompt.md), [AMM loss-versus-rebalancing paper](https://arxiv.org/abs/2208.06046):** the agent changes an executable market control in response to a documented class of LP loss, but X Layer-specific harm and user demand are unmeasured; **Inference:** the tool is more useful than a read-only analyst, yet not proven necessary for its target pool. |
| Execution | **5/10 — Inference** | **Fact — source: [brief §§4–5](afterhours-validation-prompt.md):** the demo has a clear filing-to-classification-to-transaction loop and the builder has relevant v4-hook experience, but there is no implementation, deployment funding, account setup, or live multi-source ingestion yet; **Inference:** the plan is demonstrable but the current execution evidence is only halfway to a judge-runnable entry. |
| Originality | **7/10 — Inference** | **Fact — sources: [brief §6](afterhours-validation-prompt.md), [Uniswap dynamic-fee documentation](https://developers.uniswap.org/docs/protocols/v4/concepts/dynamic-fees):** risk-sensitive hooks and event-driven dynamic fees already exist as patterns, while the supplied record contains no project coupling AI-graded corporate disclosures to xStock swap fees; **Inference:** the exact control loop is distinctive, but it is a strong recombination rather than a wholly original mechanism. |

## 3. Most likely reason a judge would score it lower

**Inference:** The single most likely lower-score rationale is that AFTERHOURS protects a self-seeded demonstration pool from a hypothesised X Layer loss rather than protecting existing liquidity from a measured loss; **Fact — sources: [brief §7](afterhours-validation-prompt.md), [Uniswap hook documentation](https://developers.uniswap.org/docs/protocols/v4/concepts/hooks):** no realised overnight-gap loss, incumbent v4 xStock pool, or LP migration commitment is shown, and attaching a hook does not automatically attract routed liquidity.

## 4. Credibility of the 5.7-day scope

**Inference — not credible as written:** The contracts and one synthetic end-to-end demo are credible for this builder, but production-shaped polling across SEC filings, exchange halts, issuer releases, and news feeds plus two-network deployment, liquidity seeding, a status page, accounts, and submission operations is not; **Fact — sources: [brief §§2, 4–5](afterhours-validation-prompt.md), [official Event A requirements](https://web3.okx.com/xlayer/build-x-series):** the builder has relevant hook experience, but starts from an empty repository, unfunded wallet, and no project account while testnet-then-mainnet deployment is mandatory.

**Inference — required cuts:**

- Cut live ingestion to SEC EDGAR for NVDA only; represent halts, issuer releases, and general news with labelled replay fixtures until after Event A.
- Exclude the separate public-attestation-feed workstream; expose the already-public registry state and one read endpoint instead.
- Keep the size cap, second pool, dashboards, MCP, x402, ERC-8004, and autonomous multi-source scheduling out of Event A.
- Treat the testnet and mainnet registry, hook, one minimally seeded pool, one historical replay, and the two judge-injected cases as the entire Event A build.

**Fact — non-cuttable eligibility work, source: [official Event A requirements](https://web3.okx.com/xlayer/build-x-series):** testnet followed by mainnet launch, a dedicated active X account, the tagged submission post, and the Google Form remain mandatory.

## 5. Verdict

### Submit with changes

- **Inference:** Reframe the claim as “a working prototype for newly bootstrapped xStock liquidity” and do not claim protection of current X Layer LPs until a live pool and realised loss are measured.
- **Inference:** Fund the deployer and source the two seed assets immediately, create the project X account immediately, and treat failure to complete either item on day one as a stop condition for Event A; **Fact — sources: [brief §§2 and 7](afterhours-validation-prompt.md), [official Event A requirements](https://web3.okx.com/xlayer/build-x-series):** mainnet launch and the project-account submission flow are eligibility gates, and the wallet is currently unfunded.
- **Inference:** Bound model authority to a versioned enum, maximum fee, expiry, duplicate-event guard, authorised signer, and emergency pause, and make stale or malformed updates visibly fail without granting the model arbitrary contract input.
- **Inference:** Label and publish a small historical NVDA evaluation set before submission, report false positives and false negatives, and show the exact prompt/model version so the AI score rests on evidence rather than a synthetic happy path; **Fact — source: [brief §7](afterhours-validation-prompt.md):** no classifier error rate is currently quantified.
- **Inference:** Make the judge demo one click from a public page and show the source item, model output, registry transaction, risk-state expiry, quoted fee, and swap transaction for both material and non-material cases; **Fact — source: [official Orion page](https://orionagents.org/hackathon):** Orion judges try what they can run.
- **Inference:** Verify the existing xStock venue before making migration claims and measure at least one historical or replayed overnight event against observed pool depth; **Fact — source: [brief §7](afterhours-validation-prompt.md):** the current venue, v4-pool presence, realised losses, and migration willingness remain open questions.
- **Inference — integration-first:** Reuse X Layer's v4 contracts, EDGAR, and the existing monorepo structure, and build only the narrow registry, hook, ingestion adapter, and demo surface needed for the causal loop.

