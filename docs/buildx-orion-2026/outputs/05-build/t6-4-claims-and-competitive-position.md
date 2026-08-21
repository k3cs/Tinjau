# T6.4 — Claims, competitive position, and the pitch narrative

- Date: 2026-08-21
- Task: T6.4 (align README, docs, pitch, and competitor matrix)
- Governed by: tracker §0.5 (the five differentiators), §0.19 (competitive and claim boundary),
  §1 "Claim gate"
- Prior-art source: [`../03-product/tinjau-competitive-landscape-deep-research.html`](../03-product/tinjau-competitive-landscape-deep-research.html)
  (reviewed 2026-08-20)
- Companion artifacts: [`../../../../README.md`](../../../../README.md), [`../../../../PRODUCT.md`](../../../../PRODUCT.md)

This document exists so that a judge can check every sentence the project says about itself against
a file they can open. It is ordered `problem → alternatives → Tinjau addition → proof → X Layer
ecosystem value`, and it ends with the list of claims that are deliberately absent.

---

## 1. Problem

Tokenized US equities trade on-chain continuously while the things that determine their value do
not: the US reference market closes, filings arrive asynchronously, NAV and reference updates lag,
and on-chain liquidity is thin. An informed trader can act on a disclosure before a static pool
policy adapts; a pure alert can arrive too late; and an AI with unrestricted authority over fees or
funds is a worse risk than the one it was hired to manage.

Measured, in this repository, on the asset actually used:

| Fact | Value | Artifact |
|---|---|---|
| provably quotable within one tick range | **0.53–2.29 wNVDAx (~$120–$517)** across four windows | `apps/server/src/market/poolTelemetry.ts` measurements; tracker §8 T3.2 `[constraint]` |
| the pool has existed since | block `65946484`, 2026-07-22 — weeks, not years | `t0-2-frozen-scenarios.md` §2.1 |
| the neutral control moved **more** than the material event | D 241 bps vs B 235 bps | tracker §8 T3.2 `[finding]` |

That last row is the argument for the whole product and it was recorded *before* the confirmation
thresholds were written: **price data alone cannot distinguish a material corporate event from a
routine one.**

## 2. Alternatives — what already exists

Every component of this design has prior art. None of the following is presented as new.

| # | Prior art | What it occupies | Where Tinjau differs |
|---|---|---|---|
| 1 | **Chainlink** corporate-actions work with 24 institutions | multi-model corporate-action extraction, golden records, attestation, ISO 20022, cross-chain distribution | Far stronger on standardisation and distribution. Not aimed at governing pool risk or proving an LP outcome. |
| 2 | **RavenPack** and similar news/event intelligence | 22k+ sources, entity/event taxonomies, relevance, novelty, sentiment, impact analytics | An Evidence Graph is not a moat. Tinjau differs on open provenance, on-chain policy, and a measured pool outcome. |
| 3 | **RiskClaw** (0G) | AI → policy → v4 fee/deposit guard, signed policy, bounded jumps, compute/storage roots | The closest mechanism competitor. Differs on exogenous corporate evidence, tokenized-equity semantics, the rumour gate, and OKX/X Layer data. |
| 4 | **NeuralHook** | TEE-signed inference, 2-of-3 agent consensus, fee + rebalance + insurance | More complete on verifiable inference. Knows nothing about *why* a price moved. |
| 5 | **Sentinel Agent** | Binance-vs-DEX divergence, volatility, depth → fee/range policy | CEX/DEX divergence is not a differentiator. Tinjau's addition is linking divergence to a traceable corporate cause. |
| 6 | **UniBrain** | deterministic scoring, authenticated callbacks, nonce/replay controls, fee/range state | Simpler and more deterministic. No off-chain information layer, no RWA specialisation. |
| 7 | **AnchorHookV4** | fully deterministic TWAP-vs-oracle fee and trade-size limits | The easier-to-trust substitute. Tinjau must justify that unstructured evidence genuinely needs AI. |
| 8 | **Hypernative** | live enterprise monitoring, AI detection, automated pause/unwind across 75+ chains | The largest commercial threat: configurable toward this use case. Tinjau's ground is open, source-linked, pool-native design. |
| 9 | **Chaos Labs** risk oracles | risk models, manipulation detection, circuit breakers, protocol-parameter automation | Shows risk-oracle + parameter automation is not new. Tinjau narrows to information discontinuity. |
| 10 | **Argus** (Mantle RWA prototype) | calendar events, basis/liquidity/gap/velocity, EIP-712 policy, on-chain trigger re-derivation, ERC-8004 record | Closest domain competitor. Protects individual positions; Tinjau protects pool microstructure and carries challengeable corporate evidence. |
| 11 | Existing AMM designs | volatility fees, TWAP guards, flow-aware fees, cross-venue divergence, **Arrakis HOT** | More mature on LVR generally. Tinjau makes no general LVR-superiority claim. |

**The one positioning sentence this project uses, verbatim:**

> No complete public product with the exact reviewed combination of source-grounded
> tokenized-equity evidence, rumor containment, OKX/X Layer confirmation, bounded LP action,
> deterministic recovery, and measured three-policy outcome was found.

"Not found" means not found in the public documentation reviewed on 2026-08-20. It is not evidence
that no such system exists privately.

## 3. Tinjau's addition — the five differentiators, each with its artifact

§0.5 fixes these five. They are only meaningful combined; a longer feature list would not replace
them.

### 3.1 Causal evidence rather than telemetry alone

The original corporate claim is preserved and travels with the decision: source class, source URL
or durable identifier, publisher, publication time, ingestion/replay time, company and token
mapping, event type, the exact claim span, the relationship to other claims, and a sha256 over the
primary document where one is retrievable.

- Artifact: `apps/server/src/evidence/normalize.ts`, `apps/server/scenarios/scenario-*.json`
- Check: scenario B's 8-K, accession `0001045810-26-000069`, primary document sha256
  `1c480e3320f3171e6ac1979a50eecb123d4150637c7b769444d16faf97928133`, 31,418 bytes, corroborated by
  EDGAR's own directory listing
- Honest limit: two frozen claims are paywalled WSJ originals with no retrievable URL. They are
  displayed as non-promotable rather than hidden, because they are part of why the state is what
  it is.

### 3.2 Rumor containment

Rumor-only evidence cannot authorize the aggressive fee path, one news source cannot either, and
duplicated syndications of one origin count as one source.

- Artifact: `apps/server/src/risk/promote.ts`; `apps/server/test/riskPromotion*.test.ts`;
  contract-side property in `contracts/test/`
- Load-bearing, not decorative: the self-revision rule (a source line that materially revised its
  own quantitative claim inside the window may support `WATCH` but may not corroborate) was frozen
  **before** the market data for that window was scored, and a test proves that removing it flips
  scenario C from `WATCH` to `PROTECT`.
- Also load-bearing: `contributesIndependentOrigin`. On a two-origin set where one origin is an
  unattributed relay, wiring the Evidence Graph through gives `WATCH`; omitting it gives
  **`PROTECT`**. Evidence that explicitly disclaimed its own independence was authorising a fee
  change until T2.4 closed it.
- Honest limit: the rumour fixture itself is `SIMULATED` (`sourceUrl: null`, `simulated://`
  identifier, hash-pinned by test). Containment is provable; live social discovery is not.

### 3.3 Independent market confirmation

- Artifact: `apps/server/src/market/confirm.ts`, rule version `tinjau.confirm/2.0.0`;
  `t3-3-confirmation-method.md`, `t3-4-degraded-cases.md`
- **Anti-wick persistence is a necessary condition for any `CONFIRMED`.** Before T3.4 it was not:
  velocity bypassed the gate, so a completely flat price with only a trading burst could confirm —
  the cheapest attack in the stack, no capital at risk. That hole was found, published as blocking,
  and closed; the rule version was bumped **major** because the fix is two-sided.
- Persistence is the **median retention across the whole hold interval**, not a reading at one
  instant. The single-instant version could be fabricated with one trade timed 300 s after the
  trough.
- Disclosed cost: an attacker holding the price down for more than half the hold interval still
  passes. "Manipulation-proof" is not a claim this earns.
- **The OKX leg is `UNAVAILABLE` for all four frozen scenarios.** No committed OKX index data
  covers any anchor and index history is not retroactively available. **No artifact may claim dual
  OKX/X Layer confirmation for a replayed scenario.** A test fails if the data is ever backfilled,
  so the limitation cannot silently stop being true.

### 3.4 Tokenized-equity awareness

- Artifact: `apps/server/src/evidence/assets.ts`, `apps/server/src/market/poolTelemetry.ts`,
  `apps/server/src/risk/types.ts`
- Materiality is its own axis. Without it, scenario D — a routine insider Form 4 with
  `sourceClass: OFFICIAL` — would have reached `PROTECT` given a confirmed market. Conflating
  provenance with materiality is a real product error, and the neutral control caught it.
- Executable exit depth is flagged `isLowerBound: true` on every result, because liquidity changes
  only at *initialized* ticks and a swap log does not reveal them. It under-states depth and
  therefore **over-states** risk.
- Open defect, disclosed: `tokenAddresses.ts` maps `NVDAx.mainnet` to an unwrapped token while the
  reference pool and the OKX index poller both use `wNVDAx`. Two different tokens. Frozen scenarios
  use `wNVDAx` throughout; the mapping may not authorise an action until this is resolved.

### 3.5 Measured protection

- Artifact: `three-policy-benchmark.{md,json}`, `t0-4-benchmark-preregistration.md`,
  `t5-1-t5-2-baselines.md`, `proof-of-protection.{json,schema.json}`,
  `t5-5-proof-of-protection.md`
- The method was frozen before any policy was implemented and before any outcome was computed.
- The volatility baseline's evidence-blindness is enforced by the **type system**: its input type
  is branded with a module-private `unique symbol`, and attaching a full evidence payload leaves
  the output byte-identical.
- The trigger multiplier `k` is never chosen — every event is reported at `k ∈ {2,3,5}`. Tinjau's
  own `minDrawdownBps` is likewise reported at 150/200/300 (AMD-001, recorded before any result
  existed).
- **The result is published as-is, and it is not favourable. See §4.2.**

## 4. Proof

### 4.1 What was proven

| Claim | Backing artifact | Status |
|---|---|---|
| A signed assessment reached a deployed registry, a v4 hook read it, and the **pool charged 20,000 pips** | `t4-demo-manifest-xlayer-testnet.json`, tx `0x2e313c44…3f787`, fee decoded from PoolManager's `Swap` event | observed, chain 1952, **builder-controlled pool** |
| The fee decayed and **recovered to 500 with no keeper and no transaction** | same manifest, txs `0x93ae1e24…7bab` (9,470) and `0xcf229e22…4c0` (500) | observed, **demo envelope (60/300/360 s)** |
| Immediate re-arming is refused on chain | `CooldownActive(1787284659, 60)` in the manifest | observed |
| A **failed action is recorded as failed and claims no benefit** | scene F: guardian pause → `ProtectionPaused`, measured fee afterwards 500 | observed |
| Production timings (3,600 / 18,000 / 21,600 s) behave identically | `forge test` **137/137**; local Anvil run charges 20,000 → 10,250 → 500 → 500 | tested, not on chain 1952 |
| The risk record is readable by a stranger with only the chain and the ABI | `tools/risk-reader/`, `bash tools/risk-reader/test/anvil-e2e.sh` → **59 passed / 0 failed** | proven on local Anvil; **reference consumer, built by Tinjau** |
| Rumour-only input never reaches the aggressive path | `riskPromotion*.test.ts`; contract-side property test | proven in both languages |
| Volatility-only fires a **false positive on the neutral control at every `k`** | `three-policy-benchmark.json` `headlineFindings`; pinned by test | measured |
| Tinjau declines the same window twice, on materiality and on persistence | `three-policy-benchmark.md` §4.3 | measured |

### 4.2 What failed, stated plainly

**The economic claim failed.**

- Tinjau **never promotes to `PROTECT`** on any of the four frozen replay scenarios, at any
  threshold in the AMD-001 grid. Its fee stays at base throughout, so its replayed economics are
  **identical to `STATIC`, not better**.
- **`canClaimLossAvoided` is `false`.** "Beats" means strictly greater; a tie is not a win.
- **The comparison's sign is decided by the metric, not the data.** All 27 comparable cells flip
  from `TINJAU_BEATS` to `TINJAU_LOSES` between the pre-registered basis and AMD-002's post-hoc
  basis, on identical trades. Neither basis is clean. **On markout the benchmark cannot determine
  which policy did better** — it brackets the answer and the bracket spans the sign.
- **The showcase event does not confirm.** Scenario B resolves to `WATCH`; the pool dipped and
  bounced, retaining 13% after five minutes. The method was tested against the correction that
  would have favoured it and B got *weaker* (101 bps, half the floor).
- **The only observed `PROTECT` interval has a constructed market leg** on a builder-controlled
  pool. It demonstrates enforcement, not benefit.

**The claim that survives:**

> Tinjau declined to act on two large price moves because neither had a qualifying cause, and one
> of them a volatility-only policy would have traded on.

A finding about **restraint**, arriving from the control rather than from the showcase. That
provenance is what makes it credible rather than curated.

## 5. X Layer ecosystem value

The Solidity is portable and this project does not claim otherwise. The contribution is the
operating loop.

| Element | Why X Layer specifically | Status |
|---|---|---|
| tokenized-stock assets and wrapper semantics | wNVDAx `0xa8ddb5…50d5` on chain 196, with a real third-party reference pool | implemented; the asset-mapping defect above is open |
| OKX index / reference-market context | the natural second confirmation leg for a tokenized US equity | implemented as an input; **`UNAVAILABLE` for all four frozen anchors** |
| pool price, flow, liquidity, executable exit depth | the market evidence the confirmation engine actually scores | implemented; exit depth is a lower bound |
| low-cost on-chain risk settlement and bounded action | a per-event record and fee action are affordable | implemented on testnet; **T4.2 working addresses, not final** |
| a reusable risk record for other X Layer applications | any pool, wallet, market maker or agent can read it without trusting this dashboard | implemented; proven by the reference consumer |
| Exchange OS adapter | a venue-specific policy consuming the shared record | **ROADMAP** — no production interface or access verified |

**One measured X Layer finding worth carrying to anyone building here:** the public RPC is
load-balanced and serves stale reads. A confirmed `postAssessment` whose own event decoded to
`PROTECT` was immediately followed by `currentRecord()` returning the previous `WATCH` record;
measured convergence lag **2,519–2,746 ms** per write. For a risk registry that is the dangerous
direction — a naive consumer can read `NORMAL` while a `PROTECT` is live. Pin reads to a block or
follow `AssessmentPosted`. A local devnet could not have surfaced this, which is the concrete
argument for deploying before claiming.

## 6. Claim → artifact map

Every substantive claim the project makes, and the file that settles it. Anything not on this list
is not claimed.

| Claim | Artifact |
|---|---|
| Bounded fee actually charged on chain | `05-build/t4-demo-manifest-xlayer-testnet.json` |
| Deterministic recovery with no keeper | same manifest, scene B `swap:recovered` |
| Cooldown enforced by the contract | same manifest, `postAssessment:blocked-by-cooldown` |
| Failed action recorded without benefit | same manifest, scene F |
| Production-envelope behaviour | `contracts/test/TinjauFeeHook.t.sol`, `forge test` 137/137 |
| Rumour containment | `apps/server/test/riskPromotion*.test.ts`, `contracts/test/` |
| Evidence provenance and byte commitments | `apps/server/scenarios/*.json`, `t0-2-frozen-scenarios.md` |
| Market confirmation method and its two closed defects | `t3-3-confirmation-method.md`, `t3-4-degraded-cases.md` |
| Benchmark method frozen before results | `t0-4-benchmark-preregistration.md`, `apps/server/scenarios/benchmark-preregistration.json` |
| Benchmark outcome, all 72 cells | `05-build/three-policy-benchmark.{md,json}` |
| `canClaimLossAvoided = false` and why | `three-policy-benchmark.json` `claimGate`; `t5-5-proof-of-protection.md` §6 |
| Proof of Protection, observed vs counterfactual | `05-build/proof-of-protection.json` + its verifier |
| Reusable risk record readable by a stranger | `tools/risk-reader/`, `t6-3-reference-consumer.md` |
| Every known limitation | tracker §8; `05-build/frontend-handoff/known-limitations.md`; README §9 |

## 7. Roadmap — labelled, not implied

Not built, not claimed, and not counted toward any result:

- additional live news and social providers (SVC-007 / SVC-008 currently use replay fixtures);
- a production source-reputation model and a larger labelled dataset;
- a generalized SDK and multi-pool registry consumers;
- an x402 paid low-latency risk feed;
- Agentic Wallet execution;
- **a live Exchange OS venue integration** — documentation and interface mapping only;
- X Layer mainnet launch and meaningful external liquidity;
- any revenue, protected TVL, customer, or autonomous risk-agent switching.

## 8. Claims deliberately absent

Checked against §0.19 and against the claim gate in §1. None of these appears in `README.md`,
`PRODUCT.md`, the Proof of Protection record, or the benchmark documents:

- first AI dynamic-fee hook
- first multi-agent corporate-action oracle
- first on-chain risk registry
- first CEX/DEX risk agent
- first self-protecting pool
- "Evidence Graph is our moat"
- production adoption, protected TVL, customers, or revenue
- "production-ready", or anything implying production liquidity, from a builder-controlled test pool
- external adoption inferred from a reference consumer this project built itself
- a live Exchange OS integration
- "dual OKX/X Layer confirmation" for any replayed scenario
- "Tinjau reduces LP loss"

`proof-of-protection.json` is machine-checked against most of this list: the verifier's INV-9
rejects any string containing a forbidden phrase unless the same string disowns it, and the check
was mutation-tested by inserting "first self-protecting pool" and a dual-OKX claim and confirming
both are caught.

Historical identifiers such as `AfterhoursFeeHook` are genuine deployed contract names and are kept
unchanged. Renaming them for cosmetic consistency would falsify provenance.
