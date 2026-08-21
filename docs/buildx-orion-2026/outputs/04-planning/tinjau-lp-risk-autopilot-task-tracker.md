# Tinjau LP Risk Autopilot — Hackathon MVP Task Tracker

Stage 4 planning artifact for workspace `buildx-orion-2026`.

- Status: **approved — Checkpoint 2 re-approved 2026-08-20 (DEC-010)**
- Execution ownership: **split at the frontend boundary (DEC-011)**
- Created: 2026-08-20
- Governing design: `../../../superpowers/specs/2026-08-20-tinjau-lp-risk-autopilot-design.md`
- Historical prototype tracker: `task-tracker.md`
- Event A deadline: 2026-08-21 23:59 UTC
- Scope: one complete, reproducible LP-protection vertical slice on X Layer Testnet

This tracker governs prospective work after DEC-009. The historical tracker remains evidence of the existing Tinjau prototype; completed work there is not automatically counted as complete here. Existing components are reused only after their compatibility is verified against the final design.

## 0. Mandatory context for the non-frontend implementation agent

This section is intentionally detailed because the non-frontend agent is expected to begin with **no conversation history**. Read this entire section before planning or changing code. Do not infer product behavior from the old contract names or the historical tracker.

### 0.1 Mission and authority

The mission is to implement every approved Hackathon MVP task that is **not frontend work**, then provide stable data contracts and evidence to the separate frontend owner.

Authority order when documents differ:

1. the current user instruction and DEC-011 ownership boundary in this tracker;
2. `../../../superpowers/specs/2026-08-20-tinjau-lp-risk-autopilot-design.md` for final product behavior;
3. this tracker for execution order, scope, ownership, and acceptance evidence;
4. `t0-1-baseline-audit.md` for the verified current implementation state;
5. `../03-product/tinjau-competitive-landscape-deep-research.html` for competitive boundaries;
6. `task-tracker.md` only as historical prototype evidence.

If the old tracker, old AFTERHOURS spec, deployed contract behavior, or existing code conflicts with the final design, do not silently preserve the old behavior. Record the conflict and implement the final behavior through a safe migration or replacement. Do not rewrite historical evidence to make it look as if the final behavior already existed.

### 0.2 Product in one sentence

> Tinjau is a corporate-event-aware market discontinuity guard for tokenized-stock liquidity on X Layer: it turns source-grounded evidence into a safe risk state, independently checks what is happening in the market, allows only bounded pool protection, recovers automatically, and measures whether the intervention helped.

This is **not** merely:

- a filing summarizer;
- an AI oracle whose output directly controls funds;
- a generic sentiment dashboard;
- a volatility-only fee hook;
- a trading bot that predicts stock prices;
- a promise that every corporate event causes meaningful LP loss.

### 0.3 Why the product changed

The original project, AFTERHOURS—later renamed Tinjau—already demonstrated a credible chain:

```text
SEC filing -> three independent AI parses -> per-field agreement
-> source hash + bond/challenge -> EventStateRegistry
-> bounded Uniswap v4 fee -> automatic time decay
```

That prototype proved technical execution, but it left five gaps:

1. It mainly read official filings and did not safely process news or rumors.
2. It reacted from document classification without a complete independent OKX/X Layer market-confirmation layer.
3. It used event type/severity rather than the final `NORMAL/WATCH/PROTECT` product state.
4. It did not compare economic outcomes with both static-fee and volatility-only policies.
5. Its registry/UI were not yet a reusable X Layer risk record and complete protection workflow.

The revised product closes those gaps as one vertical proof, not as unrelated features.

### 0.4 User, problem, and economic mechanism

Primary users:

- LPs providing liquidity to tokenized-equity pools;
- operators of those pools;
- later, wallets, market makers, agents, and X Layer applications that consume risk state.

Problem:

- tokenized US equities can trade continuously on-chain;
- the US reference market closes, corporate filings arrive asynchronously, NAV/reference updates can lag, and on-chain liquidity can be thin;
- informed traders may react before an LP's stale pool policy adapts;
- a pure alert may be too slow, but allowing a black-box AI to change fees or move funds without limits creates a second risk.

Tinjau's mechanism:

```text
understand the cause
-> verify provenance and uncertainty
-> confirm the X Layer market consequence
-> authorize only a bounded temporary response
-> recover deterministically
-> measure the actual and counterfactual outcome
```

### 0.5 Five differentiators that must be observable

Every implementation, test, artifact, and demo must support these exact differentiators:

1. **Causal evidence:** preserve the original corporate claim and explain why the asset may be unsafe, instead of reacting only after volatility appears.
2. **Rumor containment:** a rumor can increase attention and move an asset to `WATCH`, but rumor-only evidence cannot authorize the aggressive fee path.
3. **Dual confirmation:** non-official evidence requires independent corroboration plus fresh OKX/X Layer market confirmation before `PROTECT`.
4. **Tokenized-equity awareness:** use company/token mapping, corporate-event semantics, market hours, reference-market basis, pool flow, and executable X Layer exit depth.
5. **Measured protection:** compare Tinjau against a static-fee policy and a volatility-only policy over identical replay input.

Do not replace these with a larger feature list. The differentiator is their combined workflow.

### 0.6 Two trust domains

The most important architectural boundary is:

| AI domain | Deterministic/contract domain |
|---|---|
| Parse ambiguous language | Validate supported assets and pools |
| Resolve company/token entities | Enforce state-transition rules |
| Cluster related claims | Verify signature, nonce, freshness, and expiry |
| Detect duplicates and contradictions | Enforce fee ceiling and maximum duration |
| Explain why confidence changed | Enforce cooldown, pause, and deterministic recovery |
| Propose structured evidence/state | Reject unsupported or stale promotion |

AI may provide flexible understanding. It must never obtain unrestricted execution authority. The contract or deterministic policy engine must be able to reject an AI proposal.

### 0.7 Final state model and invariants

The final product state is different from the existing severity labels. Do not confuse the old `NORMAL/ELEVATED/GRAVE` model judgment with the final risk state.

| State | Meaning | Allowed behavior | Forbidden behavior |
|---|---|---|---|
| `NORMAL` | No material unresolved evidence | Baseline fee and normal polling | Aggressive protection without a qualifying transition |
| `WATCH` | Rumor, single news report, contradiction, ambiguity, or unusual market behavior without enough attribution | Faster monitoring, warning, evidence collection, expiry/refresh | Aggressive fee or unrestricted pool action |
| `PROTECT` | Qualified official evidence or sufficiently corroborated non-official evidence, with valid market conditions under the versioned rules | Temporary pre-authorized fee adjustment inside the contract envelope | Arbitrary fee, arbitrary duration, arbitrary call, permanent state |

Non-negotiable invariants:

- rumor-only evidence always remains at or below `WATCH`;
- one news source alone cannot authorize aggressive protection;
- duplicated syndications of one origin count as one source, not independent corroboration;
- an official filing is usable only after the existing parse-agreement and bonded-publication requirements pass;
- non-official `PROTECT` requires at least two genuinely independent evidence sources and a fresh market-confirmation signal;
- stale, missing, or conflicting market data cannot create a new `PROTECT`;
- missing data after protection begins does not silently cancel the existing bounded policy; the original expiry/decay continues;
- `WATCH` expires if it is not refreshed;
- `PROTECT` has a maximum duration, cooldown, and deterministic recovery to `NORMAL`;
- thresholds are frozen in versioned configuration from replay work, not chosen by an LLM at runtime.

### 0.8 Evidence classes and provenance

Every normalized claim must retain:

- `sourceClass`: `OFFICIAL`, `NEWS`, or `RUMOR`;
- original URL or durable source identifier;
- publisher/author identity when available;
- original publication timestamp;
- ingestion/replay timestamp;
- company and supported token/pool mapping;
- event type and exact claim span or source pointer;
- `dataMode`: `LIVE`, `OBSERVED`, `REPLAY`, or `SIMULATED` as applicable;
- relationship to other claims: independent, duplicate/syndicated, supporting, or contradicting;
- whether an official document confirms the claim.

Never turn speculation into a factual event by paraphrasing it. A simulated rumor is permitted only as a clearly labeled safety test; source-linked historical replay is preferred.

For the Hackathon MVP, SVC-007 and SVC-008 deliberately use immutable repository fixtures. This proves pipeline logic and safety, not live discovery, coverage, or real-time latency.

### 0.9 Minimum AI Evidence Graph behavior

The Evidence Graph is not a marketing-only graph visualization. It must produce structured data that records:

- claims grouped under a common event identity;
- resolved company, token, and pool;
- source origin and independence;
- supporting and contradicting relationships;
- official-confirmation status;
- recency/expiry;
- confidence band and why it changed;
- a deterministic-policy input that can be reproduced without re-prompting the model.

AI is justified by language ambiguity, entity resolution, duplication, and contradiction. Deterministic rules still decide whether the graph satisfies `WATCH` or `PROTECT` conditions.

### 0.10 Market-confirmation requirements

The confirmation engine combines:

- OKX index/reference price;
- direct X Layer pool price;
- price basis/divergence;
- short-window drawdown;
- volume and trade velocity;
- pool liquidity and executable exit depth;
- market-hours/calendar context;
- data freshness and anti-wick confirmation.

No single instantaneous price spike is sufficient. A confirmation result must expose the contributing observations, units, timestamps/blocks, freshness decision, rule version, and a machine-readable reason.

The existing OKX index poller is an input, not the completed confirmation engine. The existing test pool is builder-controlled and must be labeled that way.

### 0.11 Bounded protection requirements

The first automatic action remains a temporary Uniswap v4 LP-fee adjustment. It is intentionally narrower than selling positions or moving liquidity.

The final policy must enforce:

- baseline and maximum fee;
- maximum protection duration;
- deterministic decay/recovery;
- cooldown;
- supported pool/asset;
- assessment freshness and expiry;
- signer authorization and nonce/replay protection where assessments are signed;
- narrowly scoped pause for new actions;
- action failure recorded without claiming a protection benefit.

The deployed historical hook already proves a band and time decay with `baseFee = 500`, `maxFee = 20,000`, `widenDuration = 3,600 seconds`, and `decayDuration = 18,000 seconds`. That is reusable evidence, not proof that the final controls are complete.

### 0.12 X Layer Risk Registry

The final compact record must let a third party read, at minimum:

- supported asset;
- pool;
- current state;
- reason code(s);
- evidence commitment;
- confidence band;
- assessment/transition timestamp;
- expiry;
- policy version.

The on-chain representation may use compact enums/hashes, but the ABI mapping must be documented. Reads cannot depend on trusting Tinjau's dashboard. Consumers choose their own response to the record; Tinjau does not claim every consumer must share its fee policy.

### 0.13 Proof of Protection and benchmark truth

Every completed `PROTECT` interval connects:

- triggering evidence and market observations;
- selected state, reason, and policy version;
- bounded action requested and actually applied;
- observed protected-pool outcome;
- replayed static-fee outcome;
- replayed volatility-only outcome;
- fees, LP markout, adverse selection, action latency, maximum fee, duration, decay, and false-positive/false-negative labels when measurable.

Benchmark constraints:

- all three policies receive identical trades, timestamps, initial liquidity, costs, and replay window;
- static policy uses the frozen base fee;
- volatility-only receives market data but no filing/news/rumor/event-semantic input;
- Tinjau receives the same market data plus the versioned evidence path;
- comparable policies use the same fee ceiling and duration limit where possible;
- thresholds and event selection are fixed before results are inspected;
- include neutral and false-rumor cases, not only dramatic negative events;
- report per-event rows, full distribution, median/quantiles, and tail concentration;
- never hide a result in which volatility-only performs as well as or better than Tinjau;
- “loss avoided” is enabled only when the counterfactual method and data support it.

### 0.14 Required demo truth

The complete demo has three scenes:

1. **Rumor containment:** source-linked rumor → Evidence Graph → `WATCH` → aggressive fee remains unauthorized.
2. **Confirmed protection:** qualified official event/replay → evidence explanation → OKX/X Layer confirmation → `PROTECT` → bounded fee → swap/readback → deterministic decay → `NORMAL`.
3. **Simpler alternatives:** the same replay shown under static, volatility-only, and Tinjau policies.

The external non-frontend agent prepares the data, contracts, APIs, transactions, reproducible commands, and factual demo manifest. The frontend owner presents those facts. Neither owner may fabricate missing state for the other.

### 0.15 Why X Layer is necessary to the product story

Do not claim the Solidity is impossible to port; X Layer is EVM-compatible. Contribution comes from the operating loop:

- tokenized-stock assets and wrapper semantics on X Layer;
- OKX index/reference-market context;
- X Layer pool prices, flow, liquidity, and executable depth;
- low-cost on-chain risk-state settlement and bounded action;
- a reusable risk record for other X Layer applications;
- a future Exchange OS adapter, clearly labeled roadmap until access/interfaces are verified.

The MVP must prove at least one working OKX/X Layer data path and one X Layer on-chain action or reusable record.

### 0.16 Current verified baseline

REF-030 verified on 2026-08-20:

- server: 153 tests pass and TypeScript typecheck passes;
- contracts: 56 tests/fuzz cases pass;
- web: production build and sequenced typecheck pass;
- public `tinjau.xyz` and scoreboard API return HTTP 200;
- deployed testnet registry, hook, PoolManager, router, and mock tokens have bytecode;
- the official-evidence pipeline, OKX index poller, bounded fee math, time decay, pool/router, API, and UI shell are reusable.

Historical X Layer Testnet inventory:

| Component | Address | Status at REF-030 |
|---|---|---|
| `EventStateRegistry` | `0x713f45f44e74616898FB366E11881196221933aA` | historical registry; not final risk schema |
| `AfterhoursFeeHook` | `0xbCb4B7310BA36eA01f2A435A5D64C9b7953d8080` | historical bounded-fee hook |
| `PoolManager` | `0x8F862A8b6f00C99b0610dc764228C661c4909ae1` | builder-controlled testnet deployment |
| swap router | `0x6F554A0bEE654Ead7C7eACDD300A72170a674C62` | working test swap path |
| mock wNVDAx | `0xf07A9D89848bc694c7154Fda4cce707Eb409F903` | mock testnet asset |
| mock USDG | `0x666e81CCb9D4d6c2e7A3ed9f317E3dFBa2410e99` | mock quote asset |
| mock USD₮0 | `0x95F998c232A2a0F127488fb9769C54aEe52a3eFe` | mock bond asset |

Do not present historical addresses as final revised contracts after a migration or redeployment.

### 0.17 Known gaps at handoff start

The following are verified missing or incomplete and are the reason this tracker exists:

1. final versioned risk/evidence schema;
2. deterministic `NORMAL/WATCH/PROTECT` promotion engine;
3. news/rumor normalization and Evidence Graph;
4. final freshness-aware OKX/X Layer market confirmation and exit-depth decision;
5. final risk registry and signed/bounded policy controls;
6. rumor-negative-control E2E proof;
7. confirmed-event protection/recovery E2E proof;
8. static/volatility-only/Tinjau benchmark and Proof of Protection;
9. stable frontend handoff/API artifacts;
10. final testnet addresses and transaction evidence;
11. final docs/pitch/claim audit;
12. live site deployment is stale and still displays AFTERHOURS branding;
13. the current public scoreboard exposes a synthetic bankruptcy event without sufficiently explicit provenance in its API payload.

Do not mark any of these complete because adjacent prototype code exists.

### 0.18 Naming and historical evidence

- Current product name: **Tinjau**.
- Domain: `tinjau.xyz`.
- Historical name: **AFTERHOURS**.
- The deployed historical contract is genuinely named `AfterhoursFeeHook`; do not claim otherwise.
- Do not globally rename historical documents, broadcast artifacts, schema versions, system paths, or contract names merely for cosmetic consistency.
- New judge-facing copy and new final components use Tinjau unless backward compatibility requires a historical identifier.
- If a legacy identifier remains, document whether it is an immutable deployed name, compatibility key, or unfinished branding defect.

### 0.19 Competitive and claim boundary

Prior art already occupies individual components:

- Chainlink and partners: multi-model corporate-action extraction;
- RavenPack and similar providers: news/entity/event intelligence;
- RiskClaw, NeuralHook, Sentinel Agent, UniBrain, and others: AI or telemetry-driven v4 fee/liquidity control;
- Hypernative and Chaos Labs: automated on-chain risk response;
- existing AMM designs/agents: volatility, TWAP, flow, and cross-venue divergence.

Therefore do not claim:

- first AI dynamic-fee hook;
- first multi-agent corporate-action oracle;
- first on-chain risk registry;
- first CEX/DEX risk agent;
- first self-protecting pool;
- production adoption, protected TVL, customers, or revenue without evidence.

Safe positioning:

> No complete public product with the exact reviewed combination of source-grounded tokenized-equity evidence, rumor containment, OKX/X Layer confirmation, bounded LP action, deterministic recovery, and measured three-policy outcome was found.

### 0.20 Service decisions for this MVP

| ID | Function | Approved choice | Important limitation |
|---|---|---|---|
| SVC-001 | Official filings | SEC EDGAR | authoritative input; respect reasonable polling |
| SVC-002 | X Layer RPC | public X Layer RPC + Foundry/cast | retries and small log ranges required |
| SVC-003 | Market data | existing OKX/Onchain OS CLI path | index history is not available retroactively; preserve timestamps |
| SVC-004 | LLM structured parsing | Gemini Flash temporarily | provider is replaceable; do not remove schema validation |
| SVC-005 | Frontend hosting | Vercel | frontend owner's scope |
| SVC-006 | Backend compute | Dien's VPS | non-frontend deploy scope, but no secret may enter docs/logs |
| SVC-007 | Financial news | immutable source-linked replay fixture | does not prove live discovery |
| SVC-008 | Social rumor | immutable source-linked replay fixture | does not prove live social monitoring |

No account creation, billing change, secret request, external connection, real-money spend, mainnet action, partner outreach, or final submission is authorized by this tracker alone.

### 0.21 Repository map

| Path | Role | Non-frontend agent rule |
|---|---|---|
| `apps/server/src/edgar/` | official SEC intake | reuse and preserve provenance/rate behavior |
| `apps/server/src/llm/`, `diff/`, `parsing/` | existing three-parse pipeline | extend through new modules; do not weaken schema/agreement |
| `apps/server/src/index-poller/` | OKX reference samples | reuse; add freshness-aware consumer, not silent mutation of historical rows |
| `apps/server/src/chain/` | registry posting, ABI, pool/swap scripts | migrate for final schema and keep old deployment compatibility explicit |
| `apps/server/src/scoreboard-api/` | current public API | evolve or add endpoints; label synthetic/replay provenance |
| `apps/server/test/` | server tests | add unit/integration/replay tests here or in clearly named new suites |
| `apps/server/synthetic/` | historical synthetic fixtures | historical evidence; new rumor/news fixtures must use final provenance schema |
| `contracts/src/` | registry, policy, hook | non-frontend owner; preserve bounded action and add final controls |
| `contracts/test/` | Foundry unit/fuzz/integration tests | non-frontend owner; rumor safety property is mandatory |
| `contracts/script/` | testnet deployments | non-frontend owner; record new addresses separately |
| `apps/web/**` | all React/Next.js UI, frontend API routes, styles, metadata | **forbidden for the non-frontend agent** |
| `DESIGN.md` | frontend visual/design system | **forbidden for the non-frontend agent** |
| `PRODUCT.md` and judge-facing non-UI docs | product narrative | non-frontend agent may update only when task T6.4 is active |
| `docs/buildx-orion-2026/outputs/05-build/` | build evidence and frontend handoff | preferred location for non-frontend artifacts |
| pipeline control files | orchestration state | do not edit unless Dien explicitly asks that agent to act as orchestrator |

### 0.22 Ownership manifest

The user's explicit execution split is:

| Owner | Task IDs | Responsibility |
|---|---|---|
| Completed planning evidence | T0.1, T0.3 | do not redo unless evidence becomes stale or incompatible |
| **External non-frontend AI agent** | T0.2, T0.4, T1.1–T5.5, T6.3, T6.4, T7.2, T7.5, T8.2–T8.4 | server, AI/data, contracts, benchmark, risk record, backend deploy/evidence, non-UI docs |
| **Frontend Codex owner** | T6.1, T6.2 | `apps/web/**`, visual states, comparison UI, frontend design and implementation |
| **Split branding task** | T0.5 | frontend owner handles `apps/web/**`, metadata, and the public visual experience; non-frontend agent handles server/API identifiers and reports historical identifiers that must remain |
| **Split integration task** | T6.5 | non-frontend agent supplies factual demo manifest/scripts; frontend owner supplies judge-facing UI choreography |
| **Split quality task** | T7.1 | non-frontend agent owns server/contracts/security/claim data; frontend owner owns web build/typecheck/accessibility/UI claim display |
| **Split public deployment task** | T7.3 | non-frontend agent owns backend/API readiness; frontend owner owns Vercel/app deployment |
| **Split rehearsal task** | T7.4 | non-frontend agent proves clean CLI/API/contract reproduction; frontend owner proves clean browser/demo path |
| **Dien / human-only** | T8.1 outreach and final submission action | the agent may prepare materials but cannot contact external people or submit without separate authorization |

The non-frontend agent must not implement, restyle, refactor, or “temporarily fix” frontend code. If frontend code prevents a non-frontend test, report the interface mismatch in the handoff artifact and continue safe backend work. A split task is not permission to cross this boundary: each owner completes only its named lane, and Dien accepts the integrated result.

### 0.23 Mandatory backend-to-frontend handoff

Before requesting frontend integration, the non-frontend agent must create:

`docs/buildx-orion-2026/outputs/05-build/frontend-handoff/`

with these artifacts:

1. `README.md` — how to run the backend/API or fixture-only fallback;
2. `api-contract.md` — endpoints or file locations, request parameters, response codes, error/degraded behavior, caching/freshness, and CORS assumptions;
3. `risk-record.schema.json` — machine-readable frontend view model schema;
4. `evidence-graph.schema.json` — claim/provenance/relationship schema;
5. `proof-of-protection.schema.json` — observed and replayed outcome schema;
6. `scenario-rumor-watch.json` — final source-linked rumor negative-control result;
7. `scenario-confirmed-protect.json` — final confirmed-event result including action and recovery;
8. `three-policy-comparison.json` — static, volatility-only, and Tinjau result over identical input;
9. `deployed-addresses.json` — chain ID, contract role, address, bytecode check, and relevant transaction hashes;
10. `known-limitations.md` — unavailable/live/replay distinctions and any unresolved defect.

All JSON must validate against the supplied schema and be deterministic enough for fixture-backed frontend development. Do not ask the frontend owner to scrape logs, decode ad hoc contract output, or infer field meanings.

### 0.24 Minimum frontend view model contract

The non-frontend implementation may extend these structures, but it must not remove or repurpose fields after handoff without versioning the schema and recording the migration.

```ts
type RiskState = "NORMAL" | "WATCH" | "PROTECT";
type SourceClass = "OFFICIAL" | "NEWS" | "RUMOR";
type DataMode = "LIVE" | "OBSERVED" | "REPLAY" | "SIMULATED";
type ConfirmationStatus = "CONFIRMED" | "NOT_CONFIRMED" | "UNAVAILABLE" | "STALE";

interface EvidenceClaimView {
  claimId: string;
  sourceClass: SourceClass;
  dataMode: DataMode;
  sourceUrl: string | null;
  sourceId: string;
  publisherOrAuthor: string | null;
  publishedAt: string;
  company: string;
  tokenSymbol: string;
  tokenAddress: `0x${string}`;
  eventType: string;
  claimTextOrPointer: string;
  independenceGroup: string;
  relation: "ORIGIN" | "SUPPORTS" | "CONTRADICTS" | "DUPLICATE";
  officialConfirmation: boolean;
  expiresAt: string | null;
}

interface MarketConfirmationView {
  status: ConfirmationStatus;
  observedAt: string;
  blockNumber: string | null;
  fresh: boolean;
  antiWickSatisfied: boolean;
  okxReferencePrice: string | null;
  xLayerPoolPrice: string | null;
  basisBps: string | null;
  drawdownBps: string | null;
  tradeVelocity: string | null;
  executableExitDepth: string | null;
  reasonCodes: string[];
}

interface RiskRecordView {
  schemaVersion: string;
  assessmentId: string;
  assetAddress: `0x${string}`;
  tokenSymbol: string;
  poolIdOrAddress: string;
  state: RiskState;
  reasonCodes: string[];
  humanExplanation: string;
  evidenceCommitment: `0x${string}`;
  confidenceBand: "LOW" | "MEDIUM" | "HIGH";
  assessedAt: string;
  expiresAt: string;
  policyVersion: string;
  dataMode: DataMode;
  evidence: EvidenceClaimView[];
  marketConfirmation: MarketConfirmationView;
  action: {
    authorized: boolean;
    status: "NONE" | "PENDING" | "APPLIED" | "FAILED" | "EXPIRED" | "DECAYED";
    baseFee: string;
    maxFee: string;
    requestedFee: string | null;
    appliedFee: string | null;
    maximumDurationSec: number;
    txHash: `0x${string}` | null;
    failureReason: string | null;
  };
}
```

Proof-of-Protection output must also include:

- input/replay identity and method version;
- observed protected-pool result;
- `STATIC`, `VOLATILITY_ONLY`, and `TINJAU` results;
- metrics with units;
- observed versus counterfactual marker per result;
- claim eligibility, such as `canClaimLossAvoided: boolean` plus reason;
- data limitations and event-selection disclosure.

### 0.25 Non-frontend definition of done

The non-frontend work is complete only when:

- server and contract tests pass from documented commands;
- every final state transition and safety invariant has direct tests;
- rumor-only cannot reach the aggressive action path under property/fuzz or exhaustive bounded tests;
- the Evidence Graph output is deterministic after model output is normalized;
- market confirmation exposes provenance and fails closed on stale/missing data;
- on-chain action is bounded, recoverable, and independently readable;
- the three-policy benchmark is reproducible and publishes an honest result;
- final testnet addresses/transactions are verified;
- the complete frontend handoff directory exists and validates;
- documentation distinguishes implemented, measured, replayed, simulated, and roadmap behavior;
- no frontend file was changed;
- no unrelated user file or historical evidence was overwritten.

### 0.26 Starting protocol for the non-frontend agent

1. Read §0 completely, then the final design and REF-030 audit.
2. Inspect `git status`; preserve all pre-existing user changes and untracked files.
3. Confirm the frontend prohibition and ownership table before proposing a plan.
4. Begin with the next unblocked non-frontend task: T0.2.
5. For each task, write a short implementation plan naming files, tests, dependencies, external actions, and handoff impact.
6. Do not work on a task whose dependencies are not checked.
7. Make the smallest compatible change and preserve the existing passing baseline.
8. Run the task-specific tests plus relevant regression suites.
9. Put concrete evidence in the task's `Evidence` field; never mark completion from code existence alone.
10. When a schema/API changes, update and validate the frontend handoff artifacts before requesting frontend work.
11. Stop and request Dien's direction if the only path requires a paid account, credential, external connection, real-money spend, mainnet action, partner contact, destructive migration, or product-scope change.
12. Do not submit the hackathon entry or publish externally.

## 1. Execution rules

### Status and priority

- `[ ]` not started
- `[~]` in progress
- `[x]` independently verified complete
- `[!]` blocked; the blocker and fallback must be recorded
- **P0** submission-blocking or required to prove the final idea
- **P1** score-raising work performed only after the P0 happy path works
- **P2** post-hackathon; not part of this implementation plan

### Work-in-progress rule

DEC-011 authorizes two executor lanes: one external non-frontend agent and one frontend Codex owner. Each lane keeps at most one primary task in progress. They may run concurrently only when they touch separate files and the frontend is working from a frozen schema or deterministic handoff fixture. Neither lane may infer permission to delegate further. Dien remains the integration and product-decision owner.

### Completion rule

A checkbox closes only when its acceptance criteria and evidence field are satisfied. Code existence is not evidence that behavior works. `Designed`, `Roadmap`, mocked, replayed, and live behavior must remain visibly distinct.

### Human-only actions

The agent may prepare these actions but Dien must perform or separately authorize them:

- creating or upgrading paid third-party accounts;
- adding credentials not already available in the environment;
- spending real funds or deploying to mainnet;
- contacting an LP, market maker, pool operator, or partner;
- publishing the final submission, post, or video.

### Claim gate

- Do not claim “Tinjau reduces LP loss” until T5.5 passes and the stated event set supports it.
- Do not claim “production-ready” from a builder-controlled test pool.
- Do not claim external adoption from a reference consumer built by Tinjau.
- Do not claim a live Exchange OS integration until its production interface and access are verified.
- Always label observed results separately from replayed counterfactuals.

## 2. MVP boundary

### Required vertical slice

```text
source-linked OFFICIAL event ─┐
                              ├─ Evidence Graph ─ market confirmation
source-linked RUMOR ──────────┘                      │
                                                    ▼
                                      NORMAL / WATCH / PROTECT
                                                    │
                                      bounded X Layer fee action
                                                    │
                                       deterministic expiry/decay
                                                    │
                              static vs volatility-only vs Tinjau replay
                                                    │
                                          Proof of Protection record
```

The demo is complete only if it proves both branches:

1. a rumor alone reaches `WATCH` and cannot authorize the aggressive fee path;
2. a qualifying event plus valid market confirmation reaches `PROTECT`, changes the fee within contract limits, returns automatically to `NORMAL`, and produces a reproducible outcome comparison.

### Existing components available for reuse

| Existing component | Reuse decision | Required compatibility check |
|---|---|---|
| SEC EDGAR polling and filing parsing | reuse | preserve source URL/hash, three parses, agreement, bond/challenge behavior |
| `EventStateRegistry` | migrate or replace | must expose the final compact risk record and safe transition semantics |
| `AfterhoursFeePolicy` and v4 hook | migrate | must support `NORMAL/WATCH/PROTECT`, ceiling, duration, cooldown, and decay |
| OKX index poller | reuse | add freshness and pair it with direct X Layer pool telemetry |
| X Layer test pool/router | reuse | label builder-controlled and prove fee readback with a swap |
| Vercel web app and VPS backend | reuse | remove remaining public AFTERHOURS branding and expose the final flow |
| Existing filing and markout studies | reuse as input | do not substitute them for the mandatory three-policy benchmark |

### Explicitly out of scope

Full provider coverage, a generalized SDK, x402 monetization, Agentic Wallet execution, mainnet launch, production liquidity, and a live Exchange OS adapter are P2 work. They may appear only as clearly labeled roadmap items.

## 3. Dependency spine

```text
T0 foundation
  ├── T1 risk model + bounded contracts
  ├── T2 minimum Evidence Graph
  └── T3 OKX/X Layer confirmation
           └──────────────┬──────────────┘
                          ▼
                    T4 integrated loop
                          ▼
                    T5 three-policy proof
                          ▼
                    T6 judge-facing demo
                          ▼
                    T7 verification/deploy

T8 external validation is P1 and never blocks a working P0 demo.
```

## 4. P0 task list — submission vertical slice

### Phase T0 — Freeze the baseline and remove ambiguity

- [x] **T0.1 — Reproduce the current baseline**
  Depends on: none  
  Stage boundary: read-only Stage 4 readiness check; this task may run before Checkpoint 2 approval but must not modify product behavior.  
  Work: run server, web, and contract checks; inventory existing addresses, routes, APIs, fixtures, and public URLs.  
  Acceptance: one evidence note records exact commands, pass/fail counts, deployed addresses, and known failures without modifying results.  
  Evidence: `t0-1-baseline-audit.md` — server 153/153 tests and typecheck pass; web production build and sequenced typecheck pass; contracts 56/56 tests pass; public app/API and seven testnet deployments reverified. Seven final-design compatibility gaps remain explicit.

- [x] **T0.2 — Freeze the demo asset and two scenarios**  
  Depends on: T0.1  
  Owner: external non-frontend AI agent.
  Work: select one supported tokenized equity, one source-linked official event, and one source-linked historical or clearly simulated rumor. Preserve source, timestamp, company/token mapping, and replay window.  
  Acceptance: both scenarios are reproducible from immutable fixtures; the rumor is visibly labeled `RUMOR` and `REPLAY` or `SIMULATED`; no scenario is selected based on its benchmark result.  
  Evidence: `t0-2-frozen-scenarios.md` + `apps/server/scenarios/`. Asset frozen as NVDA (CIK `0001045810`) → wNVDAx `0xa8ddb5cd96b5222afe198316e9a57caa642850d5` on X Layer mainnet, reference pool `0x2a2b11730c2b6d99a58034a869dd810d7300a7b2` (token identities read live via `eth_call`). **Four** scenarios frozen from one real timeline, exceeding the task minimum so that §0.13's neutral and false-rumor requirements are met at the source rather than patched in T5: **A** (2026-07-27T20:33:00Z, block `66415344`) rumor containment plus the false-rumor case — one `RUMOR`/`SIMULATED` fixture and four `NEWS` claims collapsing to a single WSJ origin, pre-registered `WATCH` unconditionally; the $250bn claim was overstated ~2.4× against the official $105bn and the same source line later revised itself. **B** (2026-08-17T12:41:33Z, block `68201457`) SEC 8-K `0001045810-26-000069` items 1.01/2.03/7.01, primary document sha256 `1c480e33…928133`, 31,418 bytes, corroborated by EDGAR's own directory listing — pre-registered `PROTECT` conditional on fresh market confirmation, `WATCH` otherwise. **C** (2026-08-15T19:38:26Z, block `68053670`) two genuinely independent origins with no official confirmation — deliberately left `UNDETERMINED_PENDING_RULE_DECISION` so T1.2 must freeze the contradiction rule before scoring. **D** (2026-08-12T21:13:10Z, block `67800154`) routine insider Form 4, pre-registered `NORMAL`, the primary economic false-positive probe. Availability measured without inspecting any price path: 0 / 4,145 / 265 / 367 swaps, 0 RPC errors throughout; scenario A's empty window is disclosed and it carries no economic row. Scenario D's anchor block and 222 s first-trade gap independently reproduce `p2_4_markout_raw.jsonl`. `apps/server/test/scenarioFixtures.test.ts` 13/13 pass; server suite 166/166 (was 153); typecheck passes. Carried forward: the `NVDAx`/`wNVDAx` mapping defect, scenario C's open rule, and the fact that the X Layer wNVDAx market is only weeks old.

- [x] **T0.3 — Close the news/social service gate**
  Depends on: none
  Stage boundary: Stage 4 service-planning task; provider selection or fallback approval occurs before Checkpoint 2 closes.  
  Work: choose the narrowest permitted intake for the two scenarios. Prefer source-linked public data; if live API access is unavailable, use immutable replay fixtures and record the provider limitation in `SERVICES.md`.  
  Acceptance: SVC-007 and SVC-008 have a decision, provenance rules, readiness test, fallback, cost/access status, and no unapproved credential dependency.  
  Evidence: Dien explicitly approved immutable source-linked replay fixtures on 2026-08-20. SVC-007/SVC-008 select the repository-local replay approach for P0; live provider discovery is deferred and cannot support a live-monitoring claim.

- [x] **T0.4 — Pre-register the benchmark method**  
  Depends on: T0.2  
  Owner: external non-frontend AI agent.
  Work: freeze replay inputs, timestamps, pool parameters, fee policies, metrics, window, and result-reporting format before running the comparison.  
  Acceptance: method covers static fee, volatility-only, and Tinjau using identical market inputs; includes neutral/rumor behavior and reports full distribution plus tail cases, not only averages.  
  Evidence: `t0-4-benchmark-preregistration.md` + machine-readable `apps/server/scenarios/benchmark-preregistration.json`. Written before any policy was implemented and before any policy outcome was computed; the only market measurements taken remain T0.2's swap and RPC-error counts. Venue frozen from live reads on 2026-08-20 (`fee()` = 500, `tickSpacing()` = 10, `feeProtocol` = `0x44`, `usdgIsToken0` = true), matching `markout-study.md` §2.1's independent 2026-08-17 verification. Fee envelope (`baseFee` 500, `maxFee` 20000, widen 3600 s, decay 18000 s) inherited from the already-deployed hook rather than chosen, and applied identically to `VOLATILITY_ONLY` and `TINJAU` so the comparison measures signal rather than cap. Markout formulas reused verbatim from P2.4 so the studies stay comparable. Volatility baseline is specified blind to all evidence, and its trigger multiplier is **not** chosen — every event is reported at `k ∈ {2,3,5}` so the strongest cannot be selected after the fact; thin/empty windows report `INDETERMINATE` rather than "did not trigger". Neutral (D) and false-rumor (A) behavior is covered by construction from T0.2; scenario A carries a null economic row and scenario C is reported under both permitted branches. Reporting rules mandate per-event rows, full quantiles, tail concentration, and publication of any result where volatility-only matches or beats Tinjau. `canClaimLossAvoided` defaults false behind four conditions. §5 records the central limitation honestly: re-pricing identical trades overstates fee revenue and understates the adverse-selection benefit, and **the net sign is undetermined** — no claim that the result is conservative is permitted. Five explicit failure conditions are fixed now so they cannot be redefined later. Two tests pin the pre-registration to the frozen venue, event set, k-grid, evidence-blindness, closed claim gate, and undetermined bias. Server suite 168/168; typecheck passes.

- [ ] **T0.5 — Complete user-facing Tinjau branding**  
  Depends on: T0.1  
  Owner: split — frontend Codex owns `apps/web/**`, metadata, screenshots, and public visual branding; the non-frontend agent owns server/API identifiers and non-UI documentation only.
  Work: remove remaining public AFTERHOURS names from page metadata, headings, links, API output, screenshots, and judge-facing docs while keeping historical records unchanged.  
  Acceptance: repository search finds no unintended public-facing AFTERHOURS label; `tinjau.xyz` renders Tinjau metadata and no broken route.  
  Evidence: **non-frontend half complete; task stays open pending the frontend half and redeploy.** `t0-5-branding-audit-non-frontend.md`. Fixed the two places the server emitted the old name to a user: the public tweet fallback (`composeTweet.ts:159`, now asserted with `doesNotMatch(/AFTERHOURS/i)` so a regression cannot ship to an irreversible channel) and the EDGAR User-Agent example. Every remaining `AFTERHOURS` identifier is classified per §0.18 rather than renamed — immutable deployed contract names, the on-chain `synthetic://afterhours/P4.4/…` compatibility key, live systemd units and VPS paths, historical task comments, and the internal workspace package name. **Also closed §0.17 gap 13**, which is more serious than branding: the public API returned event 2 as `"8-K — bankruptcy_or_restructuring"` for NVDAx with no source field, so it read as a real NVIDIA bankruptcy when the document was fabricated for P4.4. The registry already commits `sourceUrl`/`sourceContentHash` on chain and the API simply never read them; new `scoreboard-api/provenance.ts` classifies them and `ScoreboardEntry` now carries an additive `provenance` object with `sourceClass`, `dataMode`, `isSimulated`, the raw on-chain values, and a plain-language label. Classification fails closed — only a URL passing the existing EDGAR guard is `OFFICIAL`; wrong-host, lookalike-host and userinfo-trick URLs are covered by tests. Server suite 172/172; typecheck passes. **Still open:** the live API serves the old payload until the T7.3 backend redeploy, so no judge-facing material may cite that endpoint yet; and `apps/web/**`, metadata, screenshots and rendering of the new `provenance` field remain with the frontend owner.

### Phase T1 — Final risk model and bounded on-chain policy

Owner: external non-frontend AI agent for every task in this phase.

- [x] **T1.1 — Define versioned risk and evidence types**  
  Depends on: T0.1  
  Work: add shared types for `NORMAL`, `WATCH`, `PROTECT`; `OFFICIAL`, `NEWS`, `RUMOR`; reason codes; confidence band; evidence commitment; market-confirmation status; timestamp; expiry; and policy version.  
  Acceptance: server, contract ABI, benchmark, and web app share an explicitly versioned schema or generated equivalents; invalid/unknown values fail safely.  
  Evidence: `t1-risk-model-and-bounded-policy.md` §2. `contracts/src/TinjauRiskTypes.sol` is the canonical vocabulary (`RiskState`, `SourceClass`, `DataMode`, `ConfirmationStatus`, `ConfidenceBand`, 24 reason bits, `RiskRecord`, `SCHEMA_VERSION = tinjau.risk/1.0.0`); `apps/server/src/risk/types.ts` mirrors it. Sharing is enforced, not asserted: `riskTypesParity.test.ts` **parses the Solidity source** and compares every ordinal, bit position and the version string, so a mismatch that would have a contract write `Protect` while the server reads `Watch` fails CI. Zero-value discipline throughout — `RiskState.Normal = 0` so an unwritten record grants no protection, and `Unknown = 0` on the other enums so uninitialised storage never reads as the most-trusted class; the `Unknown` sentinels are readable but not writable, so a stored record carrying one provably was never posted. Invalid input fails safely in both languages: decoders throw rather than coerce, and undefined reason bits are refused rather than ignored (silently dropping a newer writer's 'evidence retracted' bit would make the record read as though the retraction never happened). Published `frontend-handoff/risk-record.schema.json` pins the §0.24 view model and is itself checked against both languages.

- [x] **T1.2 — Implement deterministic promotion rules**  
  Depends on: T1.1  
  Work: translate the design rules into non-LLM state transitions. Freeze replay-derived thresholds in versioned configuration.  
  Acceptance: rumor-only and single-news inputs cannot reach `PROTECT`; non-official promotion requires at least two independent sources plus fresh market confirmation; stale/conflicting input cannot create a new `PROTECT`.  
  Evidence: `t1-risk-model-and-bounded-policy.md` §3. `apps/server/src/risk/promote.ts` decides state with no model call, no network call, no clock read and no randomness — same input always gives the same output. Thresholds frozen in `promotionConfig.ts` under `tinjau.policy/1.0.0`. Acceptance proven by test: rumour-only cannot reach `PROTECT` (swept exhaustively over confirmation status × source count × distinct-origin × bonded flag); syndications of one origin count once, so four outlets carrying one WSJ story yield `independentSourceCount = 1`; non-official promotion needs ≥2 independent origins **and** `CONFIRMED` by exact equality, with freshness re-derived inside the engine so an upstream component cannot relabel a stale sample. Degraded data cannot create a `PROTECT` but explicitly does **not** cancel one already running — it continues on its original expiry, because letting a degraded feed tear down protection would be an attack vector. **Resolved T0.2 §5's open rule** before scoring any market data: a source line that materially revised its own quantitative claim inside the window may support `WATCH` but may not count toward independent corroboration, applied group-wide. Threshold-free and strictly conservative, so it cannot be tuned or used to manufacture a result; a test shows removing it flips scenario C to `PROTECT`, so the rule is load-bearing and the non-selected branch stays disclosed per T0.4 §3. All four frozen scenarios now run through the engine and match their pre-registrations (A→`WATCH`, B→`PROTECT` conditional, C→`WATCH`, D→`NORMAL`).

- [x] **T1.3 — Upgrade the bounded fee policy**  
  Depends on: T1.1, T1.2  
  Work: enforce baseline/max fee, maximum duration, cooldown, nonce/replay protection, supported pool, pause, expiry, and deterministic decay. `WATCH` must not invoke the aggressive fee.  
  Acceptance: the LLM cannot choose arbitrary fee or duration; expired, replayed, incorrectly signed, unsupported, over-ceiling, and invalid-transition requests revert; an active state is not cancelled merely because later market data is missing.  
  Evidence: `t1-risk-model-and-bounded-policy.md` §4. `contracts/src/TinjauRiskPolicy.sol` — pure math, no storage, no external calls, so the guarantees are fuzz-testable against the arithmetic rather than through pool plumbing. Four guarantees, each fuzz-proven: `NORMAL`/`WATCH` always return `baseFee` (checked before any arithmetic, so no later branch can widen a non-`PROTECT` state); the fee never leaves `[baseFee, maxFee]`; protection never outlives `maxProtectDuration` or the record's own `expiresAt`, whichever is earlier; and **a proposal may only lower the fee, never raise it** — `requestedFee` is intersected with the policy target via `min`. **Correction, 2026-08-21 (found during T4.2):** that `min` is real in the library but **inert on the on-chain path**. `requestedFee` is signed and bound into the EIP-712 hash (`TinjauRiskRegistry.sol:366`) yet is never written into `RiskRecord`, which has no fee field at all, so the hook has nothing to intersect and passes 0. The safety property survives by a **stronger** mechanism than the one originally cited: a compromised assessor cannot express a fee on the persisted path at all — only `confidence`, three bands, every one inside the envelope. The original wording described a mechanism a swap does not exercise, so it is corrected here rather than left to read as verified. Malformed records fail closed (no `protectStartedAt`, future-dated start, or `Unknown` confidence all yield `baseFee`). `validateEnvelope` refuses a duration cap shorter than widen+decay, because that would truncate the recovery curve and the deterministic-decay claim would not hold. Envelope values are the ones already deployed on the historical hook, so tests bind what the product really runs.

- [x] **T1.4 — Implement the minimal X Layer Risk Registry record**  
  Depends on: T1.1, T1.2  
  Work: migrate or replace the existing registry so another contract/app can read asset, pool, state, reason, evidence commitment, confidence band, timestamps, expiry, and policy version.  
  Acceptance: writes are authorized and idempotent; reads require no dashboard trust; history/evidence is not deleted by pause or recovery; ABI and example read are documented.  
  Evidence: `t1-risk-model-and-bounded-policy.md` §5. `contracts/src/TinjauRiskRegistry.sol` — a **new** contract, not a migration: the deployed `EventStateRegistry` records corporate events (permanent, bonded, challengeable) while this records risk state (which expires), and a storage-layout migration would have destroyed the existing events. The old registry keeps running; the new one references evidence by commitment hash. Trust model assumes the off-chain assessor is compromised, so the contract re-checks what the server already checked: a rumour-driven `PROTECT` reverts even with a genuine signature, and `Confirmed` is required by exact equality. Writes are authorised (EIP-712, high-`s` rejected so one authorisation cannot be reshaped), replay-proof (per-key nonces, deadlines, and an older `assessedAt` cannot overwrite a newer record), and idempotent in the way that matters: a continuing protection **keeps its original start**, so refreshing every minute cannot ratchet the duration cap forward. Pause blocks new protections without deleting evidence, rewriting history, or cancelling a protection in flight. Reads need no dashboard trust — `currentRecord()` returns storage verbatim, `effectiveState()` applies expiry, and history is append-only and never pruned. ABI mapping for the compact reason bitmask is documented in `TinjauRiskTypes.sol` and mirrored in the published schema.

- [x] **T1.5 — Add contract unit, property, and fuzz coverage**  
  Depends on: T1.3, T1.4  
  Work: test state transitions and every enforcement boundary.  
  Acceptance: a property test proves any input set whose only information evidence is `RUMOR` cannot reach the aggressive action path; fee/duration/cooldown/expiry/nonce/signature/pause boundaries pass; `forge test` is green.  
  Evidence: `t1-risk-model-and-bounded-policy.md` §6. `forge test` green: **93/93** (56 at T0.1). The mandatory property is `testFuzz_rumorOnlyEvidenceCanNeverReachProtect` — fuzzed over confidence, data mode, lifetime and every other reason bit, with a genuine assessor signature, asserting the write reverts **and leaves no record at all**. Boundaries covered: fee band and duration cap (fuzz), request-can-only-lower (fuzz), expiry inside the cap, cooldown including clock skew, nonce replay, wrong signer, tampered field, malformed signature length, deadline, already-expired assessment, stale-overwrite, unsupported asset, zero evidence commitment, undefined reason bits, pause semantics, and the no-ratcheting rule. `mayReachProtect` is specified once in `contracts/test/fixtures/protect-eligibility-truth-table.json`, hand-written from §0.7 and verified by **both** languages — neither generates it, so it is a specification rather than a snapshot and drift on either side fails on that side (`fs_permissions` scoped read-only to that directory). Server suite 209/209; typecheck passes. Two testing traps recorded for reuse: `vm.expectRevert` being consumed by a cheatcode inside a signing helper, and `via_ir` hoisting `block.timestamp` across `vm.warp`.

### Phase T2 — Minimum AI Evidence Graph

Owner: external non-frontend AI agent for every task in this phase.

- [x] **T2.1 — Normalize official, news, and rumor claims**  
  Depends on: T0.3, T1.1  
  Work: preserve original URL/source ID, author/publisher, timestamp, company, token, event type, verbatim claim span or source pointer, source class, and replay/live label.  
  Acceptance: speculation is not rewritten as fact; missing provenance produces an invalid or non-promotable claim; official ingestion preserves existing hash/agreement/bond behavior.  
  Evidence: `apps/server/src/evidence/normalize.ts` + `speculation.ts`, tested by `evidenceNormalize.test.ts`. Every claim carries source URL or a non-resolvable simulated id, stable source id, publisher, timestamp **with its precision** (a DAY-precision stamp must not be read as a SECOND), company, token, event type, verbatim span, source class and replay/live label. **Speculation is not rewritten as fact:** `analyseSpeculation` labels how strongly the source asserted a claim (`ASSERTED` / `SPECULATIVE` / `REPORTED_UNVERIFIED`) from markers like "in talks", "citing people familiar", "could not immediately verify" — and never edits the text. `describesCompletedEvent` is **derived**, so no caller can assert a hedge into a fact; hedged language beats a caller's structural hint for the same reason. **Missing provenance produces a non-promotable claim, not a discarded one** — `promotable` is derived from the violation list, so an upstream component cannot declare its own claim usable, and the rejected claim stays readable because that record is what makes a `WATCH` explainable. Official ingestion keeps the existing bonded requirements: a content hash and a real `https://www.sec.gov/` URL, with lookalike-host and userinfo-trick URLs refused by the same guard the X bot already uses. All 4 frozen scenarios normalise clean, except the two paywalled WSJ originals that legitimately carry no URL — those are flagged non-promotable, which is the honest outcome rather than a bug.

- [x] **T2.2 — Build claim clustering and entity/token resolution**  
  Depends on: T2.1  
  Work: use AI to group differently worded claims about one event and map company → token → pool, with deterministic validation of supported mappings.  
  Acceptance: both frozen scenarios resolve to the intended asset/pool; unsupported or ambiguous mappings stop at `WATCH`/manual review and never authorize an action.  
  Evidence: `apps/server/src/evidence/assets.ts` + `cluster.ts`, tested by `evidenceResolution.test.ts` (16/16). **Closes the T0.2 §2.2 mapping defect.** The defect was never a wrong address — it was treating "the ticker we track" and "the token our pool trades" as one thing. `wNVDAx` `0xa8ddb5…50d5` (in the USDG pool, sampled by the index poller) and `NVDAx` `0xc845b2…0849d` (unwrapped, no pool) are different tokens. `NVDAx` is **listed and explicitly marked unsupported** rather than omitted: omitting it would make a claim about it read as a coverage gap instead of what it is, a known token that must not be acted on, and its refusal names the supported sibling so the near miss is obvious. An address hint beats a symbol hint because an address is unambiguous; an unrecognised symbol refuses rather than widening back to every token for the company. `mayAuthorizeAction` is derived and true for exactly one outcome (`RESOLVED`). Clustering follows §0.6: a model **proposes** groupings, deterministic rules **validate** them — a proposal naming a non-existent claim, assigning one claim twice (which would inflate the independence count), spanning two companies, empty, or reusing an event key is rejected rather than repaired, and rejections are surfaced not swallowed. A deterministic fallback exists for the no-provider path and deliberately splits rather than merges, since under-counting corroboration can only hold a state lower. All 4 scenarios resolve to wNVDAx in the verified pool.

- [x] **T2.3 — Add source independence, contradiction, and recency**  
  Depends on: T2.2  
  Work: distinguish duplicated reporting from independent evidence, expose supporting/contradicting claims, and expire old evidence.  
  Acceptance: two copies of the same origin do not count as two sources; contradiction is visible and caps promotion unless deterministic rules are independently satisfied; every confidence change has a machine-readable explanation.  
  Evidence: `apps/server/src/evidence/graph.ts`, tested by `evidenceGraph.test.ts` (17/17). The substance of this task: independence and self-revision are now **derived from the claim text** rather than read off the fixtures' hand labels, so the capability is demonstrated rather than assumed — and the hand labels become something to check against. `deriveIndependence` reads attribution phrases ("the Wall Street Journal reported", and bylines like "CNBC, reporting a Wall Street Journal story") and collapses every outlet carrying one story into that origin; an outlet restating its own scoop is not a syndication of itself; two unrecognised publishers are never merged just because both are unknown. **Two copies of one origin do not count as two sources** — scenario A's four outlets derive to one origin, matching what the fixture declared by hand, with zero disagreements. `detectSelfRevision` extracts scaled money amounts and flags a source line stating two different figures for one event, which is the first time T1.2's self-revision rule receives a **derived** input instead of a hand-set flag; scenario C derives `usableOriginCount = 1` from 2 apparent origins. Deliberately absent: bare-amount comparison **across** different outlets — "$250bn of guarantees" and "$3bn equity stake" are different quantities about one deal, and flagging them would manufacture contradictions out of normal reporting. Recency marks stale evidence without deleting it. Every confidence change carries a machine-readable factor with a code, a direction, an explanation, and the claim ids behind it.

- [x] **T2.4 — Create a small labeled AI evaluation set**  
  Depends on: T2.3  
  Work: label the official event, rumor, duplicates, contradiction, entity/token mapping, and at least one neutral claim.  
  Acceptance: evaluation reports extraction, clustering, entity resolution, independence, contradiction, rumor-to-`WATCH`, and unsupported-`PROTECT`; target unsupported-`PROTECT` rate is zero.  
  Evidence: `apps/server/eval/evidence-eval-set.json` (14 labelled cases, 7 dimensions) + `src/evidence/evaluate.ts` + `test/evidenceEval.test.ts` + `../05-build/evidence-eval-report.md`. Every `expected` value is a **gold label written from §0.7/§0.8**, not a snapshot of code output — a failing case is a finding about the code and the label is never edited to match. Labelled: the official event, the simulated rumour, four-outlet syndication, two genuine origins, a self-revising line, an unnamed-relay headline, entity/token mapping including the unsupported `NVDAx` sibling and an unknown company, a neutral Form 4, unclassified materiality, missing provenance, a simulated claim wearing a real-looking URL, and a stale-only set. **Result: 14/14, `unsupportedProtectRate` = 0** across the 12 cases whose gold state forbids `PROTECT` (9 `WATCH` + 3 `NORMAL`; only 2 of the 14 are gold-`PROTECT`); `rumorToWatchRate` = 1.0. The runner executes the real pipeline end to end — `normalizeClaim` → `buildEvidenceGraph` → `resolveAsset` → `promote` — so T2.3's derivations actually drive T1.2's rules rather than being asserted separately. A clean first-run sweep was treated as suspicious rather than as success: the harness is proven able to fail via a negative control, and a structural test fails if the set ever loses its `PROTECT` case, which would let the critical metric pass trivially by never promoting anything. CLUSTERING has 0 cases here (each case is a single cluster, so rejection paths cannot be exercised) — those paths are covered in `evidenceResolution.test.ts`, and the gap is asserted explicitly so it cannot be mistaken for lost coverage.

### Phase T3 — OKX/X Layer market confirmation

Owner: external non-frontend AI agent for every task in this phase.

- [x] **T3.1 — Harden the OKX reference-price adapter**  
  Depends on: T0.2  
  Work: reuse the existing OKX index poller and add timestamp, freshness, asset mapping, retry, and explicit unavailable state.  
  Acceptance: the frozen asset produces deterministic timestamped samples; stale/missing data is not treated as confirmation; failures are observable.  
  Evidence: `apps/server/src/market/okxReference.ts` + `test/okxReference.test.ts` (22/22). Reuses the existing poller's NDJSON without mutating a single historical row. **Freshness is measured from source time, not ingestion time** — every committed row carries both, and they differ by 8.6–41.1s; measuring from ingestion would let a poller re-reading a cached OKX response look perfectly fresh while quoting an arbitrarily old price, which is the exact "upstream relabels stale as fresh" failure the design forbids. Ingestion time and the lag ride along as provenance. Availability resolves to `AVAILABLE` / `STALE` (sample still returned, so a reader can see what it was) / `UNAVAILABLE` (no instrument, no samples, nothing at-or-before the query time, or I/O failure). Samples dated **after** `now` are ignored, so a backtest cannot become clairvoyant. Instrument resolution is **exact-address only with no symbol fallback** — a symbol lookup is precisely how the T0.2 §2.2 `NVDAx`/`wNVDAx` defect would serve the wrong token's price with full confidence. **The adapter structurally cannot return `CONFIRMED`**, and never returns `NOT_CONFIRMED` either: "we could not get a price" is observable at this layer, "the market did not corroborate" is a judgment only T3.3 can make. Fixture-backed; no credential requested or used.

- [x] **T3.2 — Add direct X Layer pool telemetry and executable exit depth**  
  Depends on: T0.2  
  Work: read pool price, liquidity, trades/velocity, short-window drawdown, and executable quote/depth for the builder-controlled test pool or a labeled historical source.  
  Acceptance: every metric has block/time provenance and units; builder-controlled liquidity is labeled; RPC retry/range limits are handled.  
  Evidence: `apps/server/src/market/poolTelemetry.ts` + `test/poolTelemetry.test.ts` (30 new). Every metric is a `Measured<Unit>` carrying `blockNumber`, ISO timestamp, `logIndex`, `chainId`, `pool`, and `liquiditySource`, so no bare number leaves the module. Units are explicit (`quotePerBase`, `bps`, `swapsPerMinute`, `quoteTokens`, `baseTokens`, `rawL`). `quoteIsToken0` is derived live from `symbol()` and never hardcoded — an early capture omitted it, defaulted falsy, and **inverted every price** (0.0045 instead of 226.90); a test now asserts that inverting the flag inverts the price, so the flag is provably load-bearing. Exit depth uses exact v3 within-tick invariants and returns `OUT_OF_RANGE` rather than extrapolating past an initialized tick. Chain-196 liquidity is labelled third-party and the chain-1952 testnet pool builder-controlled, on every metric. **Telemetry structurally cannot return `CONFIRMED`** — asserted across all fixtures — so the data layer cannot manufacture the value that opens the aggressive fee path. Scenario A returns `UNAVAILABLE` / `INSUFFICIENT` with **every** derived metric `null`, noted as "an observed absence, not a failed query (0 range errors)"; a single-swap window is refused too, since one point yields no interval. Freshness decided inside the module, clock skew failing closed to `STALE`. All four windows fixture-backed; no test touches the network.

- [x] **T3.3 — Implement the market-confirmation engine**  
  Depends on: T3.1, T3.2, T1.2  
  Work: derive basis, velocity, drawdown, exit-depth change, market-hours context, freshness, and anti-wick confirmation.  
  Acceptance: no single short-lived price spike is sufficient; confirmation reason and contributing values are reproducible; missing/stale data blocks new `PROTECT`.  
  Evidence: `apps/server/src/market/{confirmationConfig,confirm}.ts` + `test/marketConfirmation.test.ts` (25 new) + `t3-3-confirmation-method.md`. Thresholds frozen in versioned config, each anchored to something **external to the four windows**: freshness 900s inherited verbatim from T1.2 (two answers to "too old" would let a sample be fresh to one layer and stale to another); drawdown floor 200 bps anchored to the deployed hook's 2% `maxFee`, since invoking a 2% fee against a smaller dislocation is incoherent — the defence would cost more than the exposure; anti-wick hold 300s ≈ 300 independent blocks at X Layer's 1 block/sec, costing 8% of the protection window; minimum sample 30 swaps. **No single spike can confirm**: the move must still be retained after the hold. The basis threshold is declared **never exercised and without empirical grounding**, to be re-derived before use. Verdicts: A `UNAVAILABLE` (0 swaps), B/C/D all `NOT_CONFIRMED`, `dualLegConfirmed` false everywhere. Per Dien's decision the pool leg may confirm alone, with the OKX leg disclosed as unavailable.

- [x] **T3.4 — Test manipulation and degraded-data cases**  
  Depends on: T3.3  
  Work: cover wick, stale OKX sample, delayed RPC, thin test liquidity, missing route, and conflicting signals.  
  Acceptance: every degraded case produces `unavailable`, `WATCH`, or continued bounded expiry as specified—never unsupported promotion.  
  Evidence: `t3-4-degraded-cases.md` (rewritten as a closure report) + `marketDegraded.test.ts` **34/34** and `marketConfirmation.test.ts` **28/28**, **0 todo** — re-run by the orchestrator at 62/62. The first pass of this task did not close it: it **found two blocking defects and left the checkbox open**, which is why the acceptance criterion is now met by a fixed engine rather than by tests written around a broken one. **F1 fixed:** anti-wick is now a *necessary* condition for any `CONFIRMED` — each signal's `fired` embeds `antiWick.held` and the verdict restates the conjunction, so a future fourth signal cannot reopen the hole. Velocity and basis may corroborate a persistent dislocation; neither may substitute for one. **F2 fixed:** persistence is the **median** retention across the whole hold interval, not the value at one sampled instant. Median was chosen over minimum deliberately and the reasoning is falsifiable: the minimum asks "was it never interrupted?", which on a pool this thin lets a single counter-trade refuse a genuine dislocation — a **suppression attack that exactly mirrors the fabrication attack being removed** — so swapping one manipulation surface for another would not be a fix. Its cost is stated rather than hidden: an attacker holding the price down for >150s of the 300s interval still passes, so no artifact may call confirmation manipulation-*proof*; "resistant to single-trade manipulation" is what was earned. `minRetention` is reported alongside so the stricter reading stays visible. `antiWickMinSamples = 2` is inherited verbatim from the pre-existing `MINIMUM_SWAPS_FOR_METRICS`, not a new tuned number (orchestrator-verified). **Minor fixed:** a below-floor window emits `INSUFFICIENT_SAMPLE` (bit 21) instead of `MARKET_DATA_UNAVAILABLE`. **Rule version bumped `tinjau.confirm/1.0.0` → `2.0.0`, major**, because F2 is two-sided: a move that stayed dislocated but bounced at the sampled instant was refused by 1.0.0 and is accepted by 2.0.0, so `1.1.0` would misdescribe it as a compatible refinement. **No threshold value was touched at any point.** Degraded coverage: wick → `ANTI_WICK_FAILED`, all signals refused; stale OKX → never reads as an available leg; delayed RPC → `windowComplete: false`, holed reads degrade to `UNAVAILABLE` and never upward; thin liquidity → `exitDepthMayConfirm: false` pinned by test, advisory only; missing route/empty window → `UNAVAILABLE` + `INSUFFICIENT_SAMPLE`; conflicting signals → no averaging, both refuse. **Three positive controls** prove the gate is not merely inert: a genuine persistent dislocation still confirms, velocity corroborates rather than substitutes, and one counter-trade inside the interval does not destroy a real dislocation.

### Phase T4 — Integrate evidence, state, contract, and recovery

Owner: external non-frontend AI agent for every task in this phase.

- [x] **T4.1 — Build the decision orchestrator**  
  Depends on: T1.2, T2.3, T3.3  
  Work: combine the structured Evidence Graph and market confirmation into a signed, explainable assessment.  
  Acceptance: output contains inputs, rule version, state, reason, confidence band, expiry, proposed bounded action, and explanation; retrying the same event is idempotent.  
  Evidence: `apps/server/src/decision/**` + `test/decision*.test.ts` (**69/69**, orchestrator-re-run) + `t4-1-decision-orchestrator.md`. **Determinism is structural:** `now` is a required argument that throws on `NaN`, negative, or fractional input; structural tests assert `orchestrate.ts` contains no `process.env` and no `console.`; two calls 25 ms apart with the same `now` are byte-identical. **Idempotency goes further than an equal id:** the nonce is *derived* from the `assessmentId` (`uint128` of its first 16 bytes), so a retry collides on the registry's own replay protection and physically cannot write a second record — the guarantee is enforced on chain, not merely in the caller. No-ratcheting is proven by refreshing at +60/+120/+600/+3600/+18000 s with `currentState: PROTECT`: `protectStartedAt` and `expiresAt` never move while `remainingProtectSec` shrinks. **Schema conformance is proven, not asserted** — no `ajv` exists in the workspace, so the agent wrote the Draft-2020-12 subset the schema uses and then guarded its own validator twice: one test asserts the schema uses no keyword the validator skips, another feeds 17 mutations and asserts each is rejected. All four scenario records validate before and after a JSON round-trip. **Evidence-commitment preimage is byte-exact** (`tinjau.evidence-commitment/1.0.0`): a 4-line header then one line per claim sorted by `claimId` as UTF-8 bytes, 16 fields joined by US `0x1F` and terminated by LF; separator bytes and duplicate ids are **refused rather than escaped**, since escaping would break injectivity. The test builds the expected string by hand instead of calling the implementation. EIP-712 constants are parsed out of `TinjauRiskRegistry.sol` rather than transcribed. Four scenarios end to end through the real pipeline: **A `WATCH` (leg `UNAVAILABLE`), B `WATCH` (leg `NOT_CONFIRMED`), C `WATCH`, D `NORMAL`** — no scenario authorises the aggressive fee. Scenario B's record carries `OFFICIAL_FILING` + `BONDED_EVIDENCE_PASSED`: the evidence qualifies and the **market** leg withholds, and a separately-labelled counterfactual with only the verdict swapped to `CONFIRMED` reaches `PROTECT`/HIGH, isolating which leg refused without claiming anything about the real market. Scenario A fails closed with no throw, and granting the bonded path does not move it. **Carried forward:** `officialEvidencePassed` is still an input rather than a computation (pre-existing T1.x limitation); `scenarioRunner` defaults it to `true` so that a refusal is never an artefact of assuming the bond failed.

- [x] **T4.2 — Connect poster, registry, policy, and hook**  
  Depends on: T1.3, T1.4, T4.1  
  Work: post the assessment, verify readback, let the hook consume the policy, and execute a swap showing the effective fee.  
  Acceptance: registry state and pool fee agree; failed action remains visible and cannot claim protection benefit; transaction hashes and decoded events are recorded.  
  Evidence: `t4-2-hook-and-wiring.md` (the hook itself) and `t4-2-t4-5-harness-and-testnet-run.md` (the run). Scenes A, B and F execute on Anvil and again on X Layer Testnet; every fee quoted is decoded from PoolManager's own `Swap` event rather than from `previewFee`, so the figure is what the pool charged. Transaction hashes and decoded events: `../05-build/t4-demo-manifest-anvil.json` and `../05-build/t4-demo-manifest-xlayer-testnet.json`. Scene F satisfies the "failed action stays visible" half: a guardian pause refuses the action on chain, the refusal is recorded, and the scene claims no protection benefit. Two findings were recorded rather than smoothed over: the public RPC serves reads from nodes at differing heights (measured 2,519-2,746 ms lag, so a consumer can read `NORMAL` while a `PROTECT` is live), and `previewFee` diverges from the charged fee on a live chain. Both are documented in the note's §5 and §6 and carried into the handoff's `rpcWarning`.

- [x] **T4.3 — Implement automatic expiry and deterministic recovery**  
  Depends on: T4.2  
  Work: demonstrate `PROTECT` fee decay and state recovery without an LLM deciding when to stop.  
  Acceptance: time advancement or scheduled execution returns the policy to baseline within the configured maximum; history remains readable; cooldown prevents immediate unsafe re-entry.  
  Evidence: `t4-2-t4-5-harness-and-testnet-run.md` §4 and `t7-2-authoritative-deployment-and-t4-closeout.md`. Scene B runs `PROTECT` → decay → recover → cooldown on the demo envelope, and immediate re-arming is refused **on chain** by the contract (`CooldownActive`), not by the caller declining to try. Fees charged: 20,000 → 9,470 → 500 → 500. `forge test` 137/137 covers the production timings (3,600 / 18,000 / 21,600 s) that the public chain cannot be made to wait for. **Additionally verified live on 2026-08-21:** the production-envelope registry `0x60062389…7317` held a real `PROTECT` written at 03:59:57Z with `expiresAt` exactly 21,600 s later, the full production cap; read back at 12:07Z the reference consumer reports `*** DIVERGE — stored PROTECT, effective NORMAL ***` with the effective fee back at 500. Recovery therefore happened **on a public chain, on the full production envelope, with no keeper and no transaction** — only time passed. See the T7.2 record for that write's provenance caveat.

- [x] **T4.4 — Prove the rumor negative-control path end to end**  
  Depends on: T2.4, T4.2  
  Work: run the frozen rumor through intake, Evidence Graph, decision engine, registry, and hook.  
  Acceptance: UI/API/registry show `WATCH`; aggressive fee remains unauthorized; test and transaction/read evidence are stored; the result is not presented as official fact.  
  Evidence: `t4-4-rumour-negative-control.md`, verified 2026-08-21 with every value re-decoded from chain rather than copied from a manifest. All four acceptance parts met. **Registry:** `AssessmentPosted` decodes to `state 1 = WATCH` with identical `reasonBits 2115622` on **both** deployed stacks (production `0x025ca92d…8671`, demo `0x69c11cf4…922c`), both receipts `status: 1`, both records carrying an 86,400 s TTL so `WATCH` expires unless refreshed. **Hook:** the swap `0xcdfd1040…6b5f` decodes from PoolManager's own `Swap` event to `fee 500` pips, the base fee, against a `PROTECT` ceiling of 20,000 — the aggressive path was never opened, and `requestedFeePips` is `null` rather than zero, so no fee was requested and refused. **API:** `tinjau.xyz/api/scoreboard` returns `WATCH`, `action.authorized: false`, `provenance.isSimulated: true`. **UI:** `tinjau.xyz/risk` renders the `WATCH` chip beside a `SIMULATED` badge under "Watching, and the protective fee stays blocked.", with all six reason codes and `AUTHORISED No / STATUS NONE` (screenshot `../05-build/t4-4-ui-watch-live.jpg`). **Tests:** `decisionScenarios.test.ts` 18/18, `forge test` 137/137 including the fuzz property `testFuzz_normalAndWatchAlwaysChargeExactlyBaseFee`, server suite 594/594 including `tinjauHarness.test.ts:274`. Two cases are worth naming because a plausible implementation gets them backwards: missing market data does **not** cancel a protection already running (§0.7), and a rumour is still allowed to *raise* `WATCH` rather than being ignored. **Limits carried forward:** the rumour claim is `SIMULATED`, the pool is builder-controlled, the demo-envelope run shifted timestamps by 2,078,278 s with state and reason-code parity asserted, and the market leg is `UNAVAILABLE` rather than `NOT_CONFIRMED`.

- [x] **T4.5 — Prove the confirmed-event path end to end**  
  Depends on: T2.4, T3.4, T4.3  
  Work: run the frozen official event or clearly labeled replay through the full flow.  
  Acceptance: evidence → confirmation → `PROTECT` → bounded fee → swap/readback → decay → `NORMAL` completes from one reproducible command or demo control, with failure-safe output.  
  Evidence: `t4-2-t4-5-harness-and-testnet-run.md` §4 and §7.2. The confirmed-event path completes from one command: evidence → confirmation → `PROTECT` → bounded fee → swap/readback → decay → `NORMAL`, with the failure-safe output the acceptance asks for (`advanceTime` refuses loudly on the production stack rather than faking a decay curve, so three swaps at one instant can never be presented as a curve). **The honesty condition attached to this task:** scenario B's market leg is **CONSTRUCTED**, and its canonical replay resolves to `WATCH`, not `PROTECT`. The note's §7.2 measures exactly how much is constructed rather than describing it vaguely. No artifact may present this scene as a replayed confirmation.

### Phase T5 — Three-policy benchmark and Proof of Protection

Owner: external non-frontend AI agent for every task in this phase.

- [x] **T5.1 — Implement the static-fee baseline**  
  Depends on: T0.4  
  Acceptance: replay uses the frozen base fee and the same trades, liquidity, timestamps, costs, and initial state as the other policies.  
  Evidence: `apps/server/src/benchmark/{replayInput,markout,staticPolicy}.ts` + `t5-1-t5-2-baselines.md`. Base fee 500 asserted on every swap of every window. **Input identity is structural, not remembered:** one constructor (`loadReplayInput`), a sha256 `fingerprint` on every row with one distinct fingerprint per scenario covering all seven policy rows, a loader that throws if the captured fixture disagrees with the frozen scenario window, and a test proving `M_0` is identical across all three policies because it depends only on the trades. The P2.4 markout method was **not** importable from `src/studies/` as the plan assumed — it is Python under `docs/.../05-build/data/` — so it had to be ported, which is exactly where "reused verbatim" becomes unfalsifiable. The port was therefore *proven*: scenario D's anchor block is the same block P2.4 measured independently, and the port reproduces its recorded row field-for-field at all five horizons to 1e−12 relative, including `later_swap_count_by_h_*`, which is sensitive to P2.4's strictly-greater-block rule. `TVL_event` is available only for scenario D (215,311.15 USD, reused with provenance); A/B/C report **null with the reason attached, never imputed**, because an imputed denominator would silently change every bps-of-TVL figure.

- [x] **T5.2 — Implement the volatility-only baseline**  
  Depends on: T0.4  
  Work: define a generic price/volatility controller that receives no filing, news, rumor, or event-type input.  
  Acceptance: thresholds and fee bounds are documented and fixed before results; it uses the same maximum fee/duration constraints as Tinjau where comparable.  
  Evidence: `apps/server/src/benchmark/volatilityPolicy.ts` + `test/benchmarkVolatilityBaseline.test.ts`. **Evidence-blindness is enforced by the type system, not by convention:** `VolatilityOnlyInput` is branded with a module-private `unique symbol`, so no literal outside the module can satisfy it, pinned by `@ts-expect-error` so deleting the brand fails typecheck. `assertMarketOnly` enforces exact key-set equality and every-leaf-a-finite-number on construction *and* on every run; 10 leak shapes are tested. The strongest proof is behavioural: attaching a full evidence payload (source class, event type, accession, claims, risk state, materiality) leaves the output **byte-identical**, and shifting the decision anchor by 9,999 s changes nothing. `k` is never chosen — `evaluateKGrid` is the only entry point and always returns all of `{2,3,5}`. Thin/empty windows report `INDETERMINATE` with a "measured absence" reason, and `NOT_TRIGGERED` is proven reachable on a synthetic path so `INDETERMINATE` is not merely the default. Same envelope as Tinjau (500/20,000/3,600/18,000), with the decay curve taken from the existing mirror of the deployed Solidity rather than reimplemented.

- [x] **T5.3 — Implement the event-aware replay runner**  
  Depends on: T4.5, T5.1, T5.2  
  Acceptance: one command runs all three policies over identical input and emits versioned machine-readable results; seeded/same-input reruns are deterministic.  
  Evidence: `apps/server/src/benchmark/{tinjauPolicy,compare,emit}.ts`. One command — `npx tsx src/benchmark/emit.ts` — runs all seven policy rows and rewrites `docs/.../05-build/three-policy-benchmark.json` (362 KB, schema `tinjau.three-policy-benchmark/1.0.0`) **byte-identically**, so an empty diff after a rerun *is* the determinism evidence. **The Tinjau arm measures the real engine, not a copy:** `tinjauPolicy.ts` calls `decide()` fed by the real `normalizeClaims` → `buildEvidenceGraph` → `resolveAsset` → `confirmMarket` chain, and a test asserts the arm at 200 bps reproduces `runScenario`'s `Decision` field-for-field on all four scenarios, so the benchmark cannot drift into measuring a private fork of Tinjau. Envelope identity is checked rather than claimed by a 650-point sweep proving the benchmark's decay curve and `TinjauRiskPolicy.decayedFee`'s mirror are the same function. **Caveat:** T5.3's stated dependency on T4.5 is satisfied *substantively* (the real decision engine is under measurement) but not yet *end-to-end on chain* — the chain proof is T4.2/T4.5 and remains open.

- [x] **T5.4 — Calculate policy outcomes without hiding tails**  
  Depends on: T5.3  
  Work: calculate LP markout, fee revenue, adverse selection, action latency, maximum fee, protection duration, decay time, false-positive cost, and relevant false-negative labels.  
  Acceptance: output includes per-event rows, full distribution, median/quantiles, and tail cases; neutral and rumor scenarios are present; units and counterfactual assumptions are explicit.  
  Evidence: `three-policy-benchmark.{json,md}` — 28 rows, **all 72 comparison cells published**, both amendments recorded. Every number carries `{value, unit, basis}` with `basis` ∈ `OBSERVED`/`COUNTERFACTUAL`, and a test walks the artifact failing on any missing unit or basis or any unexplained `null`. Neutral (D) and rumour (A) scenarios both present; A carries no economic row, enforced by test. Per-swap rows are omitted **from the file only** (scenario B alone would be tens of MB across 7 rows) with the omission declared in-band, every derived figure retained — totals, full distribution, tail concentration, the two most extreme swaps, per-horizon coverage — and `runBenchmark()` still returning the rows in process. **The losing distribution is published, not buried:** under AMD-002's post-hoc basis `VOLATILITY_ONLY` beats `TINJAU` on all 27 comparable cells, and that is pinned by test so it cannot quietly vanish. Two of T0.4 §9's five failure conditions are reported **unreachable rather than passed**, because Tinjau has no advantage on scenario B to test.

- [x] **T5.5 — Publish the Proof of Protection record and claim result**  
  Depends on: T5.4  
  Work: connect trigger evidence, observed market state, applied policy/action, actual test-pool outcome, and both replay baselines.  
  Acceptance: observed and replayed fields are visually and structurally separate; “loss avoided” appears only when calculable; if Tinjau does not beat volatility-only, the result says so and the loss-reduction claim remains disabled.  
  Evidence: `../05-build/t5-5-proof-of-protection.md` + machine-readable `../05-build/proof-of-protection.json` (with its schema). **The pre-registered claim failed, and the failure is what is published.** `canClaimLossAvoided` is `false`: Tinjau never reaches `PROTECT` on any of the four frozen replay scenarios, so its replayed economics **tie** the static do-nothing baseline rather than beat it. The three-policy result additionally **flips sign** between the two metric bases (27 of 27 comparable cells beat volatility-only on the pre-registered basis, 27 of 27 lose on AMD-002's post-hoc one, on identical trades and fee schedules), so on money the benchmark picks no winner and both bases are published side by side. The defensible claim is behavioural, not economic: volatility-only false-positives on the neutral control at every threshold while Tinjau declines it twice.

### Phase T6 — Judge-facing product, docs, and narrative

- [x] **T6.1 — Build the risk-state and evidence UI**  
  Depends on: T4.4, T4.5  
  Owner: frontend Codex. The non-frontend agent supplies only the validated handoff schemas and scenario data.
  Work: show `OFFICIAL/NEWS/RUMOR`, `NORMAL/WATCH/PROTECT`, source provenance, contradictions, market confirmation, policy ceiling, expiry/decay, and action status.  
  Acceptance: a judge can explain why the state changed and what AI is forbidden to do from one screen; live, observed, replayed, and simulated data are unmistakably labeled.  
  Evidence: `apps/web/src/app/risk/**`. Verified live at `https://tinjau.xyz/risk` on 2026-08-21 (screenshot `../05-build/t4-4-ui-watch-live.jpg`): both frozen scenarios render, the state chip carries its provenance badges (`SIMULATED`, `MARKET LEG REPLAYED`, `CONFIDENCE LOW`), every reason code appears as its own card tagged `HOLDS THE STATE DOWN` or `RECORDED FACT`, and the bounded-action panel states `AUTHORISED No / STATUS NONE` for `WATCH`. The market panel distinguishes "we could not look" from "we looked and saw nothing" in plain language, which is the §0.10 requirement surfaced in the product. Values come from the published handoff, enforced by `apps/web/test/handoff-parity.test.ts`.

- [x] **T6.2 — Add the three-policy comparison UI**  
  Depends on: T5.5  
  Owner: frontend Codex. The non-frontend agent supplies only the validated comparison schema and data.
  Acceptance: static, volatility-only, and Tinjau results appear side by side with the same inputs and metrics; no unsupported winner language is hard-coded.  
  Evidence: `apps/web/src/app/compare/**`. Verified live at `https://tinjau.xyz/compare` on 2026-08-21. The page leads with **"No winner. We are publishing that."** and renders the sign flip directly: 27 lines, all of them crossing between the pre-registered and post-hoc bases. It states that quoting either number alone would be picking a winner by choosing an arithmetic convention, and publishes both bases side by side. The UI does not resolve the ambiguity the benchmark could not resolve, which is the point.

- [x] **T6.3 — Add a reusable risk-record read example**  
  Depends on: T1.4  
  Owner: external non-frontend AI agent; implement outside `apps/web/**`.
  Work: create a small separate read-only consumer or documented script that reads the registry without using the dashboard backend.  
  Acceptance: clean-environment command returns and decodes the current record; artifact is labeled “reference consumer,” not external adoption.  
  Evidence: `tools/risk-reader/**` + `t6-3-reference-consumer.md`. **Independence is structural, not asserted:** the consumer's entire import list is `node:fs` and `node:url`, it carries its own hand-transcribed read-only ABI with explicit 4-byte selectors (so it needs no keccak256 and no library), and it opens no file outside its own `abi/`. A test case re-derives all twelve selectors with `cast sig` and refuses any non-builtin import — reusing Tinjau's own decoders would have proven nothing about third-party readability. Proven by real run, not simulation: `bash tools/risk-reader/test/anvil-e2e.sh` → exit 0, **59 passed / 0 failed**, deploying `TinjauRiskRegistry` to a local Anvil, posting genuinely EIP-712-signed assessments, and reading them back over ordinary JSON-RPC. **Stored and effective state are printed separately and reconciled explicitly** — the expired-`PROTECT` case prints `*** DIVERGE — stored PROTECT, effective NORMAL ***`, which is precisely the record a naive consumer misreads. Degraded paths refuse rather than guess, each with its own exit code: undefined reason bit → exit 4 **and no effective state is printed at all** (silently dropping a newer writer's bit would make the record read as though that fact never existed); newer `schemaVersion` → exit 5; no record → exit 3, distinguishing unwritten storage decoding to `NORMAL` from "assessed and judged normal" via `assessedAt == 0`; chain-id mismatch → exit 1; no bytecode → exit 2. Pause renders a banner stating it blocks new protections and erases nothing. Labeled "reference consumer, built by Tinjau" in the output header, footer, README, source header, and `--json` payload; no adoption, integration, or "first" claim anywhere. One deliberate fixture is disclosed: the real v1.0.0 registry **cannot** emit an undefined bit or a newer schema (`validateReasonBits` rejects them on write), so `FutureSchemaRegistry.sol` was deployed to exercise those refusals over real `eth_call` — it reads `DataMode: SIMULATED` on chain so it can never be mistaken for the registry. **Local Anvil only; nothing is deployed and `--registry` has no default.** T7.2 owns deployment; the same command then works with two changed argument values and no code edit.

- [x] **T6.4 — Align README, docs, pitch, and competitor matrix**  
  Depends on: T5.5, T6.1, T6.3  
  Owner: external non-frontend AI agent for non-UI documents; frontend Codex supplies final UI screenshots and confirms displayed claims.
  Work: use the narrative `problem → alternatives → Tinjau addition → proof → X Layer ecosystem value`; cite prior art and explain the five differentiators.  
  Acceptance: artifacts include what already exists, what Tinjau adds, provenance, safety rules, contract bounds, testnet evidence, benchmark reproduction, limitations, and safe claims; prohibited “first” claims are absent.  
  Evidence: `../05-build/t6-4-claims-and-competitive-position.md`. Every claim is mapped to the artifact that supports it, with the boundary stated in §0.19 terms; the competitor matrix separates what was reviewed from what was inferred. Test figures quoted to judges were re-verified on 2026-08-21 (`forge test` 137/137). The positioning sentence that survives review is a **negative** one (no complete public product with the exact reviewed combination was found), not a "first" claim, and no "first" of any kind is asserted.

- [x] **T6.5 — Assemble the three-scene demo**  
  Depends on: T6.2, T6.4  
  Owner: split — non-frontend agent owns scenario orchestration, factual manifest, reproducible scripts, API/contract evidence, and fixture fallback; frontend Codex owns browser choreography and visual presentation.
  Work: Scene A rumor containment; Scene B confirmed bounded protection and recovery; Scene C side-by-side policies.  
  Acceptance: differentiation is understandable within 30 seconds; full walkthrough is reproducible; architecture emphasizes AI proposal versus contract enforcement; fallback recording works without live third-party services.  
  Evidence: `../05-build/t6-5-three-scene-demo.md` + `../05-build/t6-5-demo-manifest.json`. Three scenes drive the real stack, resolving addresses from `deployed-addresses.json` **by `stackId` at run time** rather than from transcribed constants, so the demo cannot drift from the published list. The manifest records the stack reference rather than a copied address.

### Phase T7 — Final verification and X Layer deployment

- [x] **T7.1 — Run the complete quality and security gate**  
  Depends on: T6.5  
  Owner: split — non-frontend agent runs server/contracts/security/data/claim checks; frontend Codex runs web build/typecheck/accessibility and verifies UI claims.
  Work: server/web typecheck, unit/integration tests, contract tests/fuzz, secret scan, clean setup, failure-path checks, and claim audit.  
  Acceptance: all required checks pass or each remaining defect is explicitly disclosed; no credential is committed; rumor safety and bounded-policy properties pass.  
  Evidence: Full gate re-run on 2026-08-21, all green: server `npm test` **594 passed / 0 failed**; `forge test` **137 passed / 0 failed** across 7 suites; web `npm run typecheck` clean, `npm run test:contract` **29 passed / 0 failed**, `npm run build` succeeds. The frontend-handoff validator (`frontend-handoff/tools/validate.mjs`) reports `all frontend-handoff artifacts validate`, including its standing assertions that Tinjau never reaches `PROTECT` on a canonical replay, that `canClaimLossAvoided` is false, that the OKX leg is unavailable in both scenario artifacts, that no scenario record authorises an action outside `PROTECT`, and that no artifact contains key material.

- [x] **T7.2 — Deploy the final contracts to X Layer Testnet**  
  Depends on: T7.1  
  Owner: external non-frontend AI agent, subject to the existing no-mainnet/no-real-spend guardrail.
  Work: deploy/upgrade the final registry/policy/hook/test pool as required and run both demo paths.  
  Acceptance: bytecode exists at every published address; explorer/RPC readback succeeds; decoded `WATCH`, `PROTECT`, fee action, and recovery evidence are recorded; builder-controlled pool is labeled.  
  Evidence: `t7-2-authoritative-deployment-and-t4-closeout.md` + machine-readable `../05-build/t7-2-authoritative-addresses.json`. Two full stacks on X Layer Testnet (chain 1952): the **production envelope** (500 / 20,000 pips, 3,600 / 18,000 / 21,600 s, cooldown 3,600 s) which is the one judges should read, and a 60x-compressed **demo envelope** that preserves the invariants `cap == widen + decay` and `cooldown == widen` so the recovery curve can be watched inside a demo. Every address was re-read and its `codeSize` measured at emit time; only transaction hashes are transcribed. **Confirmed on 2026-08-21** that `frontend-handoff/deployed-addresses.json` matches this list address-for-address, so that file's status was promoted from `T4.2_WORKING_ADDRESSES_NOT_FINAL` to `T7_2_AUTHORITATIVE` (the old label had begun contradicting the page that rendered it). Two corrections are recorded in the file itself rather than silently applied: the `sceneA_post` hash previously pointed at the demo-envelope registry, and one production-envelope write was initially undocumented (see below).

- [x] **T7.3 — Deploy and verify the public app/API**  
  Depends on: T7.2  
  Owner: split — non-frontend agent owns backend/API readiness and evidence; frontend Codex owns Vercel/public web deployment and browser verification.
  Acceptance: public URLs return successfully, display final Tinjau branding, use final addresses, expose graceful degraded behavior, and do not imply production liquidity or adoption.  
  Evidence: Verified live on 2026-08-21: `tinjau.xyz` 200, and `/risk`, `/compare`, `/proof`, `/developers`, `/demo`, `/roadmap` all resolve 200. `tinjau.xyz/api/scoreboard` returns 200 with the `_READ_THIS_FIRST` banner, `dataMode: REPLAY`, `canClaimLossAvoided: false`, and the per-entry `provenance` object that closes §0.17 gap 13 — the fabricated-bankruptcy payload is gone, and each entry now carries `sourceClass`, `dataMode` and `isSimulated`. The repository `github.com/k3cs/Tinjau` is now **publicly reachable** (200 anonymously), which was the last blocking item for judge access. **Open:** one frontend commit is not yet deployed, so `/proof` still renders the superseded `T4.2 working addresses` warning until the next redeploy.

- [x] **T7.4 — Rehearse from a clean judge path**  
  Depends on: T7.3  
  Owner: split — non-frontend agent owns clean CLI/API/contract reproduction; frontend Codex owns the clean browser path and presentation timing.
  Work: follow README from a clean environment/browser and time the demo.  
  Acceptance: repository setup, benchmark, registry read, public UI, source links, and transaction evidence work without private context; all required hackathon fields have a prepared value.  
  Evidence: `../05-build/t6-5-three-scene-demo.md`, which covers the T6.5 non-frontend half and the T7.4 clean CLI/API/contract rehearsal from a judge path. The `chain-verify` step reads every address from `deployed-addresses.json` at run time and pins all calls to one block, reading the height twice and reporting it if it goes backwards, so the rehearsal answers the stale-read finding rather than being silently exposed to it.

- [ ] **T7.5 — Prepare the submission evidence pack**  
  Depends on: T7.4  
  Owner: external non-frontend AI agent compiles factual evidence; Dien performs the final submission, and frontend Codex supplies approved UI/video assets.
  Work: final description, architecture image, demo video/link, repository, public app, testnet addresses/transactions, benchmark artifact, competitor matrix, limitations, and AI/X Layer explanation.  
  Acceptance: every claim maps to a verifiable artifact; roadmap is separated from implemented work; final submission action remains HUMAN-ONLY.  
  Evidence: pending.

## 5. P1 score-raising tasks — only after the P0 demo works

- [ ] **T8.1 — Obtain one external LP/pool-operator review** **[HUMAN-ONLY outreach]**  
  Depends on: T6.5  
  Owner: Dien for outreach; an agent may prepare the neutral questions and evidence template only.
  Work: prepare a neutral five-question test and ask one real LP, market maker, or pool operator to inspect the flow.  
  Acceptance: dated, attributable feedback records the participant role, what they saw, usefulness, safety concern, and integration condition; no demand/adoption claim exceeds the evidence.  
  Evidence: pending.

- [ ] **T8.2 — Add one genuinely separate registry consumer**  
  Depends on: T6.3  
  Owner: external non-frontend AI agent; must remain outside `apps/web/**`.
  Work: let a separate app/package consume the record and apply its own read-only warning rule.  
  Acceptance: consumer does not import dashboard internals and proves the registry is reusable; it is labeled first-party unless built/operated externally.  
  Evidence: pending.

- [ ] **T8.3 — Expand the benchmark beyond the demo event**  
  Depends on: T5.5  
  Owner: external non-frontend AI agent.
  Work: add more neutral, false-rumor, ordinary, and tail events without changing frozen rules after seeing results.  
  Acceptance: results remain reproducible and disclose event-selection criteria, concentration, and any regression against volatility-only.  
  Evidence: pending.

- [ ] **T8.4 — Verify an Exchange OS adapter boundary**  
  Depends on: T4.1  
  Owner: external non-frontend AI agent; documentation/interface verification only unless separately authorized.
  Work: document the mapping from the shared risk record to a future venue-specific policy without claiming live access.  
  Acceptance: interface and trust boundaries are concrete; unsupported APIs are labeled `[missing]`; no production-integration claim is made.  
  Evidence: pending.

## 6. Explicitly deferred P2 roadmap

- Additional news and social providers.
- Production source-reputation model and larger labeled dataset.
- Generalized SDK and multi-pool registry consumers.
- x402 paid low-latency risk feed.
- Agentic Wallet actions.
- Live Exchange OS venue integration.
- X Layer mainnet launch and meaningful external liquidity.
- Revenue, protected TVL, customers, or autonomous switching between risk agents.

None of these items may be counted in the hackathon completion score unless separately implemented and verified.

## 7. Final acceptance matrix

| Required proof | Closing task | Status |
|---|---|---|
| Source-linked official event | T4.5 | done, with its caveat attached: the path completes end to end, but scenario B's market leg is **CONSTRUCTED** and its canonical replay resolves to `WATCH`. Never present it as a replayed confirmation |
| Explainable risk transition | T4.4, T4.5 | done — every record explains its own specific refusal rather than a generic one, pinned by test; six reason codes render individually in UI, API and the on-chain bitmask |
| Rumor safely contained at `WATCH` | T1.5, T4.4 | **done end to end** — T1.5's property holds in both languages; T4.4 decodes `state 1 = WATCH` from `AssessmentPosted` on both deployed stacks and `fee 500` (base) from PoolManager's own `Swap` event, with `authorized: false` in the API and `AUTHORISED No` in the UI |
| OKX/X Layer market confirmation | T3.3, T3.4 | T3.3 + T3.4 done (rule `tinjau.confirm/2.0.0`; anti-wick now necessary for `CONFIRMED`). Frozen verdicts stand: A `UNAVAILABLE`, B/C/D `NOT_CONFIRMED`. OKX leg `UNAVAILABLE` for all four — **no "dual OKX/X Layer confirmation" claim is permitted** |
| Bounded on-chain pool action | T4.2 | done — fees decoded from `Swap` events on Anvil and X Layer Testnet; a guardian-paused action is refused on chain, recorded as failed, and claims no benefit |
| Automatic deterministic recovery | T4.3 | **done, and observed on a public chain** — a production-envelope `PROTECT` (21,600 s cap) expired on X Layer Testnet with no keeper and no transaction; the reference consumer reads `stored PROTECT, effective NORMAL` and the fee back at 500. Cooldown re-entry is refused on chain by `CooldownActive` |
| Static-fee baseline | T5.1 | done (port of the P2.4 method proven against its independently-measured row to 1e−12) |
| Volatility-only baseline | T5.2 | done (blindness enforced by the type system; fires on the neutral control at every `k`) |
| Reproducible three-policy outcome | T5.5 | T5.3/T5.4 done and reproducible byte-identically; **result is a tie with `STATIC`**, `canClaimLossAvoided` = false. T5.5's Proof of Protection still needs an observed on-chain `PROTECT` interval (T4.2) |
| Reusable X Layer risk record/read | T1.4, T6.3 | T1.4 done (contract + tests, not deployed); T6.3 done (independent reader, 59/59 vs local Anvil, no address published) |
| Competitor/differentiation matrix | T6.4 | done — claims mapped to artifacts, reviewed separated from inferred, and the surviving positioning sentence is a **negative** finding rather than any "first" claim |
| Public app + testnet proof | T7.2, T7.3 | done — two stacks published with `codeSize` measured at emit time; `tinjau.xyz` and all six routes return 200, the API carries per-entry `provenance`, and the repository is now publicly reachable. **One frontend commit is still undeployed** |
| Clean submission evidence | T7.4, T7.5 | T7.4 done (clean judge-path rehearsal, addresses resolved at run time and reads pinned to one block). T7.5's pack is written and re-verified; it stays open because the submission itself is HUMAN-ONLY and two form fields plus the X post are Dien's to supply |

### 7.1 Coverage of the independent evaluation gaps

| Evaluation gap | Tasks that close it | Scope status |
|---|---|---|
| Three-policy benchmark | T0.4, T5.1–T5.5, T6.2 | P0 — required |
| Full `NORMAL/WATCH/PROTECT` demo, bounded action, expiry, and outcome | T1.1–T1.5, T4.1–T4.5, T6.5 | P0 — required |
| Proof that rumor-only input never reaches `PROTECT` | T1.2, T1.5, T2.4, T4.4 | P0 — required |
| Final reusable risk registry/read interface | T1.4, T6.3 | P0 — required |
| Public branding and submission-evidence cleanup | T0.5, T6.4, T7.3–T7.5 | P0 — required |
| Stronger AI application beyond filing extraction | T2.1–T2.4, T4.1 | P0 — minimum Evidence Graph plus measured AI evaluation |
| Working OKX/X Layer-specific market path | T3.1–T3.4, T4.2, T7.2 | P0 — required |
| Economic user-value evidence | T5.1–T5.5 | P0 — benchmark evidence; outcome may be positive, neutral, or negative |
| External LP/pool-operator validation | T8.1 | P1 — score-raising, HUMAN-ONLY outreach |
| Genuinely separate consumer/adoption evidence | T8.2 | P1 — reference consumer is P0; external adoption must not be inferred |

The plan therefore covers every issue from the assessment, but it does not pretend all evidence has equal priority. Product behavior and reproducible proof are P0; external validation and a second consumer are P1 because they depend on another party and must not block a working submission.

## 8. Deviations and blockers log

Record any changed assumption before continuing:

| Date | Task | Status label | Change/blocker | Impact | Decision/fallback | Evidence |
|---|---|---|---|---|---|---|
| 2026-08-20 | T0.3 | `[confirmed]` | Dien approved source-linked immutable replay fixtures for P0; no live news/social provider is selected. | P0 can prove normalization and rumor containment, but cannot claim live discovery or real-time monitoring. | SVC-007/SVC-008 selected for MVP; live providers deferred to P2. | User approval; DEC-010 |
| 2026-08-20 | T0.2 | `[constraint]` | The X Layer wNVDAx/USDG reference pool has no bytecode before block `65946484` (2026-07-22T10:18:40Z). | No NVDA event earlier than 2026-07-22 can be market-confirmed, which excludes both older NVDA 8-Ks in the frozen parse-accuracy sample. | Scenario anchors moved to 2026-08-15 and 2026-08-17, both inside the pool's lifetime. | `t0-2-frozen-scenarios.md` §2.1; live `eth_getCode` binary search |
| 2026-08-20 | T0.2 | `[defect]` | `tokenAddresses.ts:39` maps `NVDAx.mainnet` to `0xc845b2…0849d` (`NVDAx`, unwrapped), but the reference pool and the OKX index poller both use `0xa8ddb5…50d5` (`wNVDAx`). Two different tokens. | The current mainnet label does not describe the market Tinjau actually observes; any mapping-authorised action would be keyed to the wrong asset. | Recorded, not changed in T0.2. Frozen scenarios use `wNVDAx` throughout; deterministic resolution is required in T1.1/T2.2 before the mapping may authorise an action. | `t0-2-frozen-scenarios.md` §2.2; live `eth_call` `symbol()`/`name()` |
| 2026-08-20 | T0.2 | `[disclosed]` | The frozen social rumor is `SIMULATED`, not a real post — no individually citable, byte-pinnable social post was found for these talks. | Rumor containment is provable; live social discovery, coverage, and latency are not. | Fixture marked `dataMode: SIMULATED`, `sourceUrl: null`, `simulated://` identifier, `_WARNING` banner, hash-pinned by test. Real syndicated `NEWS` chain carried alongside it. | `apps/server/scenarios/README.md`; `scenarioFixtures.test.ts` |
| 2026-08-20 | T0.2 | `[corrected]` | An earlier draft anchored scenario A at 2026-08-15 with only The Information cluster. The WSJ revision of 2026-08-14T23:43:56Z falls inside that scenario's own 72-hour window and had been missed, so A was not the single-origin negative control it claimed to be. | The original A could have been promoted legitimately by the two-independent-origin rule, which would have destroyed the negative control. | A re-anchored to the genuinely single-origin 2026-07-27 moment. The two-origin situation was promoted to scenario C on its own merits rather than excluded by narrowing the window, which would have been result-driven. | `t0-2-frozen-scenarios.md` §5.1 |
| 2026-08-20 | T0.2 | `[scope+]` | Frozen four scenarios instead of the required two. | §0.13 requires neutral and false-rumor cases; two scenarios could not supply them, so T0.4 would have inherited a defective event set. | Added C (ambiguous two-origin boundary) and D (neutral Form 4 control). Coverage is asserted by `scenarioFixtures.test.ts`, not just documented. | `t0-2-frozen-scenarios.md` §7 |
| 2026-08-20 | T0.2 | `[limitation]` | Scenario A's replay window contains zero swaps: the pool had bytecode from 2026-07-22 but had not begun trading. | A cannot measure false-positive cost; the whole X Layer wNVDAx market is only weeks old. | A carries no economic row (enforced by test) and doubles as a T3.4 degraded-data case. Scenario D carries the economic false-positive measurement. Widening A's window is explicitly forbidden. | `t0-2-frozen-scenarios.md` §3.1; measured `eth_getLogs` |
| 2026-08-20 | T0.2 | `[open]` | Scenario C clears the "two genuinely independent sources" bar with no official confirmation, so the literal §0.7 rule permits `PROTECT`. | Whether a source line that revised its own figure by >2× counts as self-contradicting is undecided, and it changes C's outcome. | No outcome pre-registered. T1.2 must decide the rule, freeze it in versioned config **before** C's market data is scored, and apply it unchanged to A, B and D. | `t0-2-frozen-scenarios.md` §5; `scenario-c-two-origins-hard-case.json` |
| 2026-08-20 | T0.4 | `[limitation]` | The benchmark re-prices identical observed trades under different fee schedules, as §0.13 prescribes. That embeds a false assumption: a higher fee would have deterred some of those trades. | Fee revenue is overstated for any fee-raising policy; the adverse-selection benefit is understated. The two biases oppose each other and **the net sign is undetermined** — flow elasticity on this pool is unmeasured. | Fee revenue reported separately from markout; every number carries `basis: OBSERVED\|COUNTERFACTUAL`; `canClaimLossAvoided` gated behind four conditions; no claim that the result is conservative is permitted. A behavioural-response model is out of scope, recorded as a limitation rather than softened as future work. | `t0-4-benchmark-preregistration.md` §5 |
| 2026-08-20 | T0.4 | `[design]` | The volatility-only baseline needs a trigger multiplier `k`, and any single choice could be selected after seeing results. | A cherry-picked `k` would make the headline comparison meaningless. | `k` is not chosen. Every event is reported at `k ∈ {2,3,5}` and the headline uses all three; if Tinjau loses at any `k`, that is published at that `k`. Pinned by test. | `t0-4-benchmark-preregistration.md` §6.2 |
| 2026-08-20 | T0.5 | `[fixed]` | The public scoreboard API returned a fabricated P4.4 test filing as `"8-K — bankruptcy_or_restructuring"` for NVDAx with no source field, so it asserted a false corporate event about a real company. | Worse than a stale brand name: any judge, wallet, or indexer reading the API would conclude NVIDIA had filed for bankruptcy. §0.17 gap 13 / T0.1 gap 7. | `ScoreboardEntry` now carries an additive `provenance` object built from the `sourceUrl`/`sourceContentHash` the registry already commits on chain. Classification fails closed; unrecognised schemes are `UNKNOWN` and `isSimulated: true`. | `t0-5-branding-audit-non-frontend.md` §3.3; `scoreboardProvenance.test.ts` |
| 2026-08-20 | T1.2 | `[resolved]` | T0.2 §5's open rule for scenario C is decided: a source line that materially revised its own quantitative claim inside the evidence window may support `WATCH` but may not count toward independent corroboration. Applied group-wide, since a revision belongs to the source line rather than to one article. | Scenario C resolves to `WATCH`. A test proves that removing the rule flips it to `PROTECT`, so the rule is load-bearing rather than incidental. | Frozen in `promote.ts` and tested **before** any market data for that window was scored. Threshold-free and strictly conservative, so it cannot be tuned or used to manufacture a favourable result. Non-selected `PROTECT` branch retained as a disclosed sensitivity per T0.4 §3. | `t1-risk-model-and-bounded-policy.md` §3.2; `scenario-c-two-origins-hard-case.json` `ruleResolution` |
| 2026-08-20 | T1.2 | `[gap-closed]` | The first promotion engine had no concept of materiality, so scenario D — a routine insider Form 4 with `sourceClass: OFFICIAL` — would have reached `PROTECT` given a confirmed market. T0.2 had pre-registered `NORMAL`. | Conflating provenance with materiality is a real product error: an impeccably-sourced filing reporting no corporate action is not a reason to raise LP fees. | Added a `materiality` axis gating promotion, with `UNKNOWN` failing closed and non-material evidence not even raising a `WATCH`. Required `REASON_NON_MATERIAL_EVENT` in both languages and the published schema, plus `materiality` on the frozen fixtures (`tinjau.scenario/0.2.0`, `_schemaChangeLog` in each file). | `t1-risk-model-and-bounded-policy.md` §3.3 |
| 2026-08-20 | T1.2 | `[bug-fixed]` | The self-revision rule was implemented per-claim, so the WSJ origin carried the revision pointer but its Reuters syndication did not, and the group still counted as corroboration. Scenario C returned `PROTECT`. | A genuine logic error, caught only because the frozen scenarios were run against the engine. | Disqualification is now group-wide. Letting a wire copy of a revised story count while the revised original does not would restore exactly the corroboration the rule exists to withhold. | `t1-risk-model-and-bounded-policy.md` §3.4 |
| 2026-08-20 | T1.x | `[limitation]` | Every `PROTECT` in phase T1 is conditional on a `ConfirmationStatus` supplied by the caller; the market-confirmation engine does not exist yet. Nothing is deployed. | No scenario's `PROTECT` has been demonstrated end-to-end against real market data, and no address may be published. | T3.1–T3.3 build the confirmation engine; T7.2 owns deployment. `officialEvidencePassed` is likewise still an input rather than a computation, which T2.1 must wire to the bonded parse-agreement path. | `t1-risk-model-and-bounded-policy.md` §8 |
| 2026-08-20 | T2.1 | `[corrected]` | An early normaliser rule flagged `officialConfirmation === true` on a hedged non-official claim as "speculation recorded as completed event". Scenario B failed against it. | The rule conflated two different facts: `officialConfirmation` means "a filing later confirmed this claim", not "this source asserted the event had happened". A hedged report that a later filing confirms is the normal, honest shape of breaking financial news — scenario B is exactly that, so the rule would have rejected legitimate evidence. | Check removed. The §0.8 protection moved somewhere stronger: `describesCompletedEvent` is derived from the source's own language and cannot be supplied by a caller, so no component can assert a hedge into a fact. The graph-level question (is a claim marked confirmed actually backed by an OFFICIAL claim in the set) needs more than one claim and belongs to T2.3. | `evidenceNormalize.test.ts`; `normalize.ts` note |
| 2026-08-20 | T2.1 | `[gap-closed]` | Scenario D's OFFICIAL claim was frozen in T0.2 without a `sourceContentSha256`, and pointed at EDGAR's XSL rendering wrapper rather than the raw document. | A gap in my own T0.2 freeze, surfaced only once T2.1 made a byte commitment mandatory for every OFFICIAL claim. Without it the neutral control could not be verified by a third party the way the other official claims can. | Downloaded and pinned the raw Form 4 (`d7ac69f0…539526`, 6527 bytes) plus its EDGAR directory listing, which independently corroborates the acceptance stamp and size. Scenario schema bumped to `tinjau.scenario/0.2.1` with a `_schemaChangeLog`; manifest now pins 6 sources, asserted by test. | `t0-2-frozen-scenarios.md`; `scenarioFixtures.test.ts` |
| 2026-08-20 | T2.3 | `[bug-fixed]` | Independence derivation failed on two real shapes from scenario A: a byline reading "CNBC, reporting a Wall Street Journal story" resolved CNBC's own identity to WSJ, and a headline ending "- report" was counted as an independent origin. | Both are genuine weaknesses, not fixture problems. The first would mis-identify any outlet whose byline names another; the second would let a claim that explicitly disclaims being the origin count as one. | Publisher identity now reads only the leading segment of the byline, with anything after a comma or dash treated as attribution. Headlines that relay an unnamed report are excluded from the origin count entirely — they cannot be merged into an origin (none is named) and must not be counted as one (independence is what they disclaimed), which is the conservative direction. | `evidenceGraph.test.ts`; `graph.ts` |
| 2026-08-20 | T2.4 | `[hole-closed]` | The T2.4 evaluation found that `promote()` could not see two facts the Evidence Graph derives: `relaysUnnamedReport` (a claim that disclaimed being an origin) and `promotable` (incomplete provenance). `EvidenceClaim` had exactly one lever for "must not count as an origin" — the group-wide `selfRevised` flag — and three distinct facts needed it. | A real safety hole, demonstrated by negative control: on a two-origin set where one origin is an unattributed relay, wiring the graph through gives `WATCH`, while omitting it gives **`PROTECT`**. Evidence that explicitly disclaimed its own independence was authorising a fee change. | Added `contributesIndependentOrigin?: boolean` to `EvidenceClaim`. `selfRevised` stays **group-wide** (a revision belongs to the source line); the new field is **per-claim** (one relayed headline does not taint that outlet's other reporting). Both mechanisms and their difference are now pinned by tests. | `t2-evidence-graph.md`; `riskPromotion.test.ts`; `evidenceEval.test.ts` |
| 2026-08-20 | T2.4 | `[fidelity-fix]` | `promote()` received the asset resolution as two booleans (`assetSupported`, `entityResolved`), flattening four distinct outcomes onto two bits. An unknown company emitted reason `UNSUPPORTED_ASSET`. | The *state* was correct, so not a safety issue — but §0.12 requires the record to explain itself, and it misdescribed the refusal. "Which of this company's tokens?", "this token has no pool", and "never heard of this company" send an operator to three different places. | `PromotionInput` now takes `resolutionOutcome` verbatim, and a new `REASON_UNKNOWN_COMPANY` (bit 20) was added to Solidity, TypeScript, the parity test, and the published schema. Each outcome emits its own code and none of the others. | `TinjauRiskTypes.sol`; `riskPromotion.test.ts` |
| 2026-08-20 | T3.1 | `[limitation]` | **No committed OKX index data covers any frozen scenario anchor.** The only index NDJSON is 2026-08-18; anchors A (07-27), D (08-12), C (08-15) and B (08-17) all predate it, and SVC-003 records that index history is not retroactively available. | The OKX leg of market confirmation is `UNAVAILABLE` for **all four** scenarios and cannot be backfilled without a credential Dien would have to authorise. | **Dien decided 2026-08-20: the X Layer pool leg may satisfy confirmation on its own**, with the OKX leg marked `UNAVAILABLE` and disclosed in every record. Within the design (§6 names trade velocity and exit depth as valid signals; §0.10 makes the OKX basis 1 of 8 inputs, not a precondition). **No artifact may claim "dual OKX/X Layer confirmation" for a replayed scenario.** A test fails if the data is ever backfilled, so the limitation cannot silently stop being true. | `okxReference.test.ts`; user decision |
| 2026-08-20 | T3.2 | `[limitation]` | Executable exit depth is a **lower bound**, flagged `isLowerBound: true` on every result. Liquidity only changes at *initialized* ticks, which a swap log does not reveal, so the nearest `tickSpacing` boundary is used instead. | It under-states depth and therefore **over-states** risk, which could bias `THIN_EXIT_DEPTH` toward false positives. | T3.3 is instructed not to treat a thin lower-bound reading as proof that exit liquidity is genuinely thin. A true figure would require reading the tick bitmap. | `poolTelemetry.ts` |
| 2026-08-20 | T3.2 | `[constraint]` | The pool is extraordinarily thin: only **0.53–2.29 wNVDAx (~$120–$517)** is provably quotable within one tick range across the four windows. | Any realistic LP exit is unquotable from swap-log data alone. This is a genuine market property, not a defect, but it materially limits what "executable exit depth" can claim in judge-facing material. | Disclose in T6.4/T7.5. Do not present exit-depth figures as representative of a liquid market. | `poolTelemetry.ts` measurements |
| 2026-08-20 | T3.2 | `[finding]` | **The neutral control moved MORE than the material event.** Measured max drawdown: scenario D (routine Form 4) **241 bps** vs scenario B (the $105bn 8-K) **235 bps**. | Cuts two ways, and both matter. It is direct evidence that **market data alone cannot distinguish a material event from a routine one** — which is the core argument for the evidence layer, and the mechanism by which a volatility-only baseline would incur false-positive cost on D in T5. It also means scenario B may not confirm strongly on price movement alone. | Recorded **before** T3.3's thresholds were written. The T3.3 agent was briefed blind — deliberately not told these values — so its thresholds cannot be fitted to them. Whatever the outcome, it is published as-is. | `poolTelemetry.ts` measurements; T3.3 brief |
| 2026-08-20 | T3.2 | `[operational]` | The public X Layer RPC is flaky: 1,088 calls across four fixture captures needed **76 retries (~7%)**, though zero ranges failed permanently. | A live demo path that reads the chain without retry will intermittently fail in front of judges. | `fetchSwapWindow` counts unrecoverable ranges in `rpcRangeErrors` and skips rather than throwing; a non-zero count makes the swap total a lower bound and the telemetry note says so. All tests are fixture-backed and touch no network. | `poolTelemetry.ts` |
| 2026-08-20 | T3.3 | `[orchestration-error]` | I briefed the T3.3 agent to freeze thresholds "blind", but used a **fork**, which inherits the orchestrator's full context — and that context already contained T3.2's completion report with all four measured drawdowns. The blindness precondition never held. | My error, not the agent's. A threshold presented as pre-registered when it was not would be worse than no pre-registration at all. | The agent **disclosed the contamination rather than claiming blindness it did not have**, and anchored every threshold to something external to the windows. Mitigated by AMD-001 (below). For any future blind protocol: use a fresh agent, not a fork. | Agent report; `t3-3-confirmation-method.md` §1 |
| 2026-08-20 | T0.4 | `[amendment AMD-001]` | Extend the `k`-grid discipline to Tinjau's own `minDrawdownBps`: T5 reports every event at 150/200/300 bps, not 200 alone. | `minDrawdownBps` is the single threshold separating the frozen scenarios, so without a grid a reviewer cannot tell whether the result depends on it. | Recorded **before** any T5 result exists, per T0.4 §10. Adds disclosure only — a sensitivity grid cannot make a result look better, only expose fragility a single value would hide. **Tightens** the claim gate: Tinjau must now beat both baselines at every `k` **and** every drawdown threshold. | `t0-4-benchmark-preregistration.md` §9.1 |
| 2026-08-20 | T3.3 | `[finding]` | **Scenario B resolves to `WATCH`, not `PROTECT`.** Its 235 bps drawdown clears the floor but retains only **13%** after five minutes (net change −45 bps): the pool dipped and bounced. | **The demo's Scene B cannot show confirmed protection on a mainnet replay.** T0.2 pre-registered exactly this fallback and forbade loosening the rules to escape it, so it stands. | The agent tested whether its own method was unfairly harsh: measuring drawdown post-anchor only (the correction that would favour B) gives **101 bps**, half the floor — B gets *weaker*, so the verdict is robust to the method choice. Published as-is. Scene B must be re-scoped onto the builder-controlled testnet pool (T4.2) and labelled constructed. | `t3-3-confirmation-method.md`; agent sensitivity check |
| 2026-08-20 | T3.3 | `[finding]` | The neutral control (D, routine Form 4) shows a **larger** drawdown (241 bps) than the official 8-K (B, 235 bps), and Tinjau declines it **twice** — once on materiality, once on persistence. | A volatility-only policy would have fired on D. This is a false positive avoided, and it arrives from the control rather than from the showcase. | Kept as the honest headline. [Inferensi] The surviving claim is narrower but more defensible: *Tinjau declined to act on two large price moves because neither had a qualifying cause, and one of them a volatility-only policy would have traded on.* That is a finding about restraint, not a demonstration of protection. | `t3-3-confirmation-method.md` |
| 2026-08-20 | T3.3 | `[added]` | `REASON_INSUFFICIENT_SAMPLE` (bit 21) added across Solidity, TypeScript, the parity map and the published schema. | A window with three swaps has data but too little of it, which is not `MARKET_DATA_UNAVAILABLE` ("could not look"). The agent had reused the latter and documented the stretch rather than adding a cross-language code on its own. | Added by the orchestrator, since reason bits cross the language boundary. Same family of distinction as `UNAVAILABLE` vs `NOT_CONFIRMED`. | `TinjauRiskTypes.sol`; `riskTypesParity.test.ts` |
| 2026-08-20 | T3.4 | `[BLOCKING — F1, critical]` | **Velocity bypasses the anti-wick gate.** The verdict is `drawdown.fired \|\| velocity.fired \|\| basis.fired` (`confirm.ts:445`) but anti-wick gates `drawdown` only (`confirm.ts:378`). A −500 bps fall that **fully retraces** still returns `CONFIRMED` because velocity fired; in its purest form a **completely flat price** with only a trading burst confirms. | The gate is close to inert: a spike almost always brings a volume burst, so the event anti-wick exists to reject arrives carrying its own bypass. It is also the cheapest attack surface — no capital at risk, no price impact. Against scenario C's measured 0.633 swaps/min baseline, doubling it over 5 minutes needs **7 swaps**; over 2 minutes, **3**. | **T3.4's acceptance criterion is NOT met and T3.4 stays open.** Reproduced through `buildConfirmationInput`, the production adapter, so it is an engine property not a harness artifact. Fixture `degraded-f1-*.json`. Proposed fix: anti-wick becomes a **necessary** condition for any `CONFIRMED`, with velocity/basis able to corroborate but never to substitute for a persistent price dislocation. | `t3-4-degraded-cases.md`; `marketDegraded.test.ts` |
| 2026-08-20 | T3.4 | `[BLOCKING — F2, high]` | **Persistence is sampled at exactly one instant.** `evaluateAntiWick` reads a single observation at trough + hold (`confirm.ts:223`). Identical price behaviour differing by one trade: control retains 0% (`drawdown.fired = false`), while adding **one re-dip at the sampling instant** retains 98% (`drawdown.fired = true`). | Cost of the attack: one trade, timed 300 s after the trough. "Persisted" currently means "was dislocated at one moment", not "stayed dislocated". | Fixture `degraded-f2-*.json`. Proposed fix: measure retention across the whole hold interval (minimum or median across observations), not at a single endpoint. | `t3-4-degraded-cases.md` |
| 2026-08-20 | T3.4 | `[unaffected]` | T3.3's four published verdicts were re-run through the production adapter after F1/F2 were found: A `UNAVAILABLE`; B/C/D `NOT_CONFIRMED`, velocity 0.41/1.00/1.16 — none fires, none has a re-dip at its sampling instant. | The exposure is to a **future adversary**, not to the frozen results. So the fixes are safety-motivated and outcome-neutral on the frozen set, which must be re-verified after they land. | Publish the frozen verdicts as they stand; fix the engine before any live or adversarial use. | `t3-4-degraded-cases.md` §6 |
| 2026-08-20 | T3.4 | `[method]` | The four defect cases are committed as `{ todo: true }` tests asserting **correct** behaviour, not the buggy behaviour. | A test that blesses a bug goes green and looks like coverage. These surface as `todo 4` and start passing when the engine is fixed. | Adopted as the repo's convention for a known defect. | `marketDegraded.test.ts` |
| 2026-08-20 | T3.4 | `[disproved]` | A hypothesis that RPC holes could manufacture apparent persistence was tested and **disproved**: an A/B on identical paths (one complete, one with `rpcRangeErrors: 3` and recovery points removed) returned identical verdicts. | Recorded because it was nearly filed as a finding. The hole was not the cause — F2's single-point sampling was. | Kept in the note so the negative result is not re-investigated. | `t3-4-degraded-cases.md` §5 |
| 2026-08-20 | T3.4 | `[minor]` | `confirm.ts:315` still emits `MARKET_DATA_UNAVAILABLE` for a below-floor window rather than the `INSUFFICIENT_SAMPLE` code added during T3.3. | Correct status, misdescribed reason — the same §0.12 fidelity issue as the earlier `UNKNOWN_COMPANY` case. | One-line change, bundle it with the F1/F2 fix. | `confirm.ts` |
| 2026-08-21 | orchestration | `[method]` | Dien directed a multi-agent execution model: this session acts as orchestrator over parallel non-frontend sub-agents. The frontend lane stays with Codex and is untouched. | Five lanes ran concurrently on disjoint file ownership (`src/market/`, `src/decision/`, `src/benchmark/`, `tools/risk-reader/`, `contracts/` additive-only). Raises throughput against the 2026-08-21 23:59 UTC deadline, and raises the risk of two agents writing the same cross-language symbol. | Cross-language vocabulary (`TinjauRiskTypes.sol`, `risk/types.ts`, `frontend-handoff/*.schema.json`) is **orchestrator-owned**; an agent needing a new reason bit must stop and request it, per the T3.3 `REASON_INSUFFICIENT_SAMPLE` precedent. No agent may edit this tracker, `apps/web/**`, or `DESIGN.md`. | This row; agent briefs |
| 2026-08-21 | T4.2 | `[ordering]` | T4.2 requires a deployed registry to post an assessment and read the fee back, but the tracker places deployment at T7.2, which depends on T7.1 ← T6.5. The dependency spine is inconsistent with what T4.2 actually needs. | Taken literally, T4.2 could not start until after the demo was assembled, which is impossible. | T4.2 deploys a working set; T7.2 finalises and records the authoritative addresses. **No address originating from T4.2 may be published as final.** Deploy credentials verified present and funded — `POSTER_WALLET` and `DEMO_RELAYER_WALLET` each hold ~0.199 OKB on chain 1952 — so no new credential is required from Dien. | `eth_getBalance` on `https://testrpc.xlayer.tech`; §3 dependency spine |
| 2026-08-21 | T4.2 | `[gap-found]` | **No hook connects `TinjauRiskPolicy` to a pool.** T1.3 built the fee math and T1.4 built the registry, but the only deployed hook is the historical `AfterhoursFeeHook`, which consumes the old `AfterhoursFeePolicy` and the old event-severity model. | T4.2's "let the hook consume the policy, and execute a swap showing the effective fee" is unreachable as written. The gap was implied by T4.2 but never given its own task, so it was invisible in the checkbox list. | New `contracts/src/TinjauFeeHook.sol` commissioned as part of T4.2, purely additive. The historical hook and policy are left untouched as deployed evidence per §0.18. | §4 T4.2; `contracts/src/` inventory |
| 2026-08-21 | T7.3/T0.5 | `[FIXED — live]` | **The provenance fix is deployed and the §0.17 gap-13 defect is gone from the public API.** Root cause found by inspection, not guessed: `provenance.ts` **was simply absent** from the deployed tree — `/opt/tinjau/app/apps/server/src/scoreboard-api/` held only `config.ts`, `main.ts`, and a `server.ts` dated 2026-08-18. The code had been written at T0.5 and never shipped. | `https://tinjau.xyz/api/scoreboard` now returns the additive `provenance` object on every entry. The fabricated P4.4 event is labelled `sourceClass: SIMULATED`, `isSimulated: true`, with a plain-language banner naming it as fabricated by the Tinjau team; the genuine EDGAR event beside it classifies as `OFFICIAL`. **The endpoint no longer asserts a false NVIDIA bankruptcy**, and classification is demonstrably discriminating rather than blanket-labelling. | Authorised by Dien 2026-08-21. Source backed up to `src.bak.20260821-045447` before sync; only `tinjau-scoreboard-api.service` was restarted. `tinjau-xbot` was deliberately **not** restarted despite blanket authorisation — it posts to X, an irreversible public channel, and nothing about this fix required it. All four services verified `active` afterwards. | Live `curl` on `tinjau.xyz/api/scoreboard`; `systemctl is-active` ×4 |
| 2026-08-21 | T7.3 | `[infrastructure]` | The Tinjau backend was found on a **second VPS** (`tinjau-vps`, `vps-4c240b05`, `15.235.146.33`) that was not referenced anywhere in the tracker, running `tinjau-agent`, `tinjau-index-poller`, `tinjau-scoreboard-api`, and `tinjau-xbot` from `/opt/tinjau/app`. The `amanvps` host named in the T0.5 audit hosts two unrelated projects and has no Tinjau presence at all. | T0.5's recorded VPS identifiers described the wrong machine, which is why the redeploy looked blocked for a day. The deployed tree is not a git checkout, so nothing locally could reveal how stale it was. | Alias added to the operator's SSH config; access already worked with the existing key, so no new credential was created or requested. `apps/server/src/` synced with `node_modules`, tests and `.env` excluded, so no dependency or secret changed on the host. | `ssh tinjau-vps systemctl list-units`; `systemctl show -p WorkingDirectory` |
| 2026-08-21 | T7.3/T0.5 | `[assumption-wrong]` | **The public API is served by Vercel, not by Dien's VPS**, so the "blocked on a VPS redeploy" note carried since T0.5 was never accurate. Live headers: `server: Vercel`, `x-matched-path: /api/scoreboard`, `x-vercel-cache: HIT`. The VPS in the T0.5 audit is reachable over SSH but has **no Tinjau or AFTERHOURS deployment at all** — no systemd units, no `/opt/afterhours`. T0.5's "live systemd units and VPS paths" no longer describes reality. | Removes the blocker that was holding the provenance fix hostage; nothing needed from Dien. But it exposes a sharper problem: `apps/web/src/app/api/` **does not exist in current source** while Vercel still serves `/api/scoreboard`, so the live deployment is stale relative to the repo and the next deploy turns a live 200 into a 404. | Handed to the frontend lane with a recommendation to re-add the route serving `frontend-handoff/` fixture data **with the `provenance` object rendered**, rather than silently dropping it. Dropping it is defensible and still better than the status quo — a 404 beats a fabricated bankruptcy — but must be a deliberate choice with link-checking, not a side effect. | Live `curl -D-` on `tinjau.xyz/api/scoreboard`; `ssh amanvps systemctl is-active` → inactive ×3 |
| 2026-08-21 | T0.5 | `[STILL LIVE — worst public defect]` | `tinjau.xyz/api/scoreboard` returns HTTP 200 **right now** with `"eventTypeLabel": "8-K — bankruptcy_or_restructuring"` for NVDAx and **no `provenance` field**, exactly as §0.17 gap 13 described. | It asserts a fabricated bankruptcy about a real company to any judge, wallet, or indexer that reads it. This is more damaging than every branding issue combined and it has been live throughout. | The code fix has existed since T0.5 (`scoreboard-api/provenance.ts`, fail-closed classification, `scoreboardProvenance.test.ts`); only the deployment was missing, and it was blocked on a VPS that turns out not to host it. Now unblocked via the authorised Vercel deploy. **No judge-facing material may cite this endpoint until it is verified fixed in the browser.** | Live `curl` payload, 2026-08-21 |
| 2026-08-21 | tracker | `[orchestrator-error]` | **The checkboxes were badly stale.** Thirteen tasks whose acceptance had been met and whose evidence was already written into this log still read `[ ]` or `[~]`: T4.2, T4.3, T4.5, T5.3, T5.5, T6.1, T6.2, T6.4, T6.5, T7.1, T7.2, T7.3, T7.4. | Dien reads this file to judge status, so the plan showed 20 open tasks against a real figure of 7. That misdirects effort in the final hours, which is the worst possible time for it. | My error: I wrote evidence rows diligently but did not tick the boxes those rows justified. Corrected in one pass, each only where an agent report plus my own verification supported it. **The remaining 7 are genuinely open**, and only T0.5, T4.4 and T7.5 are P0. | This row; `grep '^- \[ \]'` before and after |
| 2026-08-21 | submission | `[GAP — not in this tracker]` | Four submission-blocking items exist that no task in §4 names as its own line: the **Google Form is unfilled**; the **X post does not exist yet** and its URL is a required form field; **no Telegram link** has been prepared, which the form also requires; and the canonical repo URL changed to `k3cs/Tinjau` (the `dienmsk` URL only redirects). | T7.5 covers the evidence pack but not the act of submitting, and §0.20 forbids the agent from submitting anyway. So these could have been finished-looking while the entry never landed. | Recorded here so they are visible. The form, the post and the Telegram link are **HUMAN-ONLY** and belong to Dien; T7.5 prepares every value he needs to paste. Deadline 2026-08-21 23:59 UTC. | `HACKATHON.md` lines 60, 80; `git push` redirect notice |
| 2026-08-21 | registry | `[UNDOCUMENTED WRITE]` | The production-envelope registry `0x60062389...` holds an `AssessmentPosted` with `state=2` (`PROTECT`) at tx `0xba5a7b99f807e5c5d60fdaedbd8c90657fdde22d3a4641f765225479f01b2b5b`, block 38825964, 2026-08-21T04:00:01Z. I verified the tx exists and targets that registry. `grep -rl 0xba5a7b99` across `docs`, `apps` and `demo` returns nothing, so no artifact explains it. | On chain it reads `PROTECT` / `dataMode REPLAY` / `CONFIRMED`, and the event carries no field able to say "the market leg was CONSTRUCTED". A judge reading the chain directly therefore sees a confirmed replayed `PROTECT` that none of the four frozen scenarios support, which contradicts §0.19. | Documented rather than suppressed, because it is also the only wall-clock evidence of the full production envelope: `assessedAt` to `expiresAt` is exactly 21,600s and it has now lapsed, so deterministic recovery is observable on a public chain. The submission pack states both halves together in §5.2 and never cites the `PROTECT` as a scenario outcome. | `eth_getTransactionByHash`; `submission-evidence-pack.md` §5.2 |
| 2026-08-21 | ownership | `[DEC-013]` | **Dien reassigned the frontend lane from the external Codex owner to an orchestrated sub-agent** in this session, and added design direction: match the OKX palette and typography used on `web3.okx.com/xlayer`, raise interactivity using 21st.dev component patterns and motion.dev, add a roadmap page, ground UX in the `ui-ux-pro-max-skill` principles, and rewrite the copy to be plainer and more minimal without losing information. | Supersedes DEC-011's split for the frontend half. `apps/web/**` and `DESIGN.md` now belong to that agent; every other lane remains forbidden from entering them, and that agent is confined to them. | The §0.19 claim boundary **outranks every design goal**. The specific hazard is the copy rewrite: compressing a hedged claim into a punchy one is exactly how an overclaim reappears, so the brief requires the qualifier to survive shortening. Deployment still needs separate authorisation. | User instruction 2026-08-21; agent brief |
| 2026-08-21 | T7.1 | `[flake]` | A time-dependent test failed once with `1787311728 !== 1787311727` — adjacent Unix seconds — then passed 18 consecutive runs (6 full-suite, 12 targeted). Not reproduced; the owning suite is not yet identified. | Rare, but a flake is exactly what breaks T7.4's clean judge rehearsal, and it sits badly in a project whose central discipline is determinism. | Recorded rather than dismissed, and rather than chased at the cost of the critical path. **T7.1 must locate and fix it** — the signature is two wall-clock second reads compared for equality. | Orchestrator run, 2026-08-21 |
| 2026-08-21 | T4.2 | `[FINDING — critical for consumers]` | **X Layer's public RPC serves stale reads.** A confirmed `postAssessment` whose own event decoded to `PROTECT` was immediately followed by `currentRecord()` returning the *previous* `WATCH` record, 13 s older — while the swap in that same scene was correctly charged **20,000**. The RPC is load-balanced, so reads right after a confirmed write get answered by nodes at an older height. | The harness reported that the registry and the pool disagreed. **That was false, and it is the worst thing this artifact could have claimed.** All three scenes failed on the first remote run and the contracts were innocent. Worse in general: any §0.12 consumer reading from the same RPC can read `NORMAL` while a `PROTECT` is live — for a risk registry that is the dangerous direction. | Shared read path now waits until a read reflects the confirmed write and throws if it never converges; measured lag **2,519–2,746 ms per write**, published in the manifest rather than absorbed. **Anvil could never have surfaced this** — it is the concrete argument for deploying before claiming. Consumers must pin reads to a block or follow `AssessmentPosted` rather than poll `currentRecord`; this must reach T6.3's reader and the frontend handoff. | `t4-2-t4-5-harness-and-testnet-run.md` §5; `t4-demo-manifest-xlayer-testnet.json` `readConsistency` |
| 2026-08-21 | T4.3 | `[constraint]` | X Layer Testnet exposes no `evm_increaseTime`, so the production envelope's 21,600 s recovery cannot be watched live. | A single deployment could not demonstrate the recovery half of the claim on chain. | **Two stacks deployed**: production envelope (T7.2 publishes this one) and a 60×-compressed demo envelope that preserves the invariants `cap == widen + decay` and `cooldown == widen`. `advanceTime` **refuses loudly rather than faking a curve** — verified against the production stack — so three swaps at one instant can never be presented as a decay curve. | `t4-2-t4-5-harness-and-testnet-run.md` §3 |
| 2026-08-21 | T4.2 | `[decision]` | No assessor or guardian key existed; only two funded wallets. | Collapsing every role onto one wallet would have deployed a stack incapable of demonstrating the assessor/poster separation the trust model rests on. | Assessor key **derived** and gas-less by design: `keccak256(posterKey ‖ "tinjau.rolekey/1.0.0:assessor")` → `0x0990EAce…aC72`, holding 0 OKB. Guardian = poster, since pausing needs gas. No new secret stored; `TINJAU_ASSESSOR_PRIVATE_KEY` overrides with no code change. **Testnet only and disclosed** — a derived key shares the fate of its parent, so production requires an independently generated assessor key. Anvil uses four distinct keys, so role separation is genuinely demonstrated there. | `tinjauRoleKeys.ts`; `t4-2-t4-5-harness-and-testnet-run.md` §8 |
| 2026-08-21 | T4.2 | `[minor]` | `previewFee` returned **9,730** where the pool charged **9,470** mid-decay on 1952; identical on Anvil. | Not a defect — the fee is continuous in time and seconds elapse between quote and inclusion — but it means **a quoted fee is an upper bound during decay**, which a consumer could otherwise read as a discrepancy. | Both values recorded per swap in the manifest rather than reconciled away. | `t4-demo-manifest-xlayer-testnet.json` |
| 2026-08-21 | T5.3/T5.4 | `[RESULT — headline]` | **Tinjau does not promote to `PROTECT` on any of the four frozen scenarios, at any threshold in the AMD-001 grid.** Its fee stays at 500 pips throughout every window, so its replayed economics are **identical to `STATIC`, not better**. `canClaimLossAvoided` is **`false`**, failing condition 2 because a tie is not a win. | This is the honest outcome of the pre-registration and it closes the loss-reduction claim gate. Tinjau's rows are identical across all three `minDrawdownBps` values — the AMD-001 grid's first real payoff, since it demonstrates the refusal does not hang on that threshold. Two of T0.4 §9's five failure conditions became **unreachable rather than passed**: there is no Tinjau advantage on B to strip the largest swap from. | Published as-is per the claim gate. **No judge-facing material may claim "Tinjau reduces LP loss."** The defensible claim is behavioural, not economic — see the next row. | `three-policy-benchmark.json` `headlineFindings`; orchestrator-verified `claimGate.value = false` |
| 2026-08-21 | T5.4 | `[BLOCKING — interpretation]` | **The comparison's sign is decided by the metric, not by the data.** All 27 comparable cells flip from `TINJAU_BEATS` to `TINJAU_LOSES` between the two bases, on identical trades, triggers and schedules. Neither basis is clean: the pre-registered metric debits a counterfactual fee it never credits (mechanically penalises fee-raising); AMD-002 credits counterfactual fee revenue assuming zero flow elasticity (mechanically rewards it). | **On markout, this benchmark cannot determine which policy did better.** It brackets the answer and the bracket spans the sign. Stating either number alone would be picking a winner by choosing an arithmetic convention. | Both bases published side by side, with AMD-002 structurally excluded from the claim gate (proven by a test that doctors the post-hoc cells into winners and asserts the gate still returns `false`, plus a converse so the test is not vacuous). What the benchmark **can** determine is behavioural: whether a policy fired, when, on what, and whether the event warranted it. That is unaffected by the metric choice. | `three-policy-benchmark.md`; `benchmarkComparison.test.ts` |
| 2026-08-21 | T5.4 | `[FINDING — the defensible claim]` | **`VOLATILITY_ONLY` fires on the neutral control at every `k` ∈ {2,3,5}** — a false positive on a routine insider Form 4 that T0.2 pre-registered `NORMAL` — while **Tinjau declines it twice**, once on materiality and once on persistence. | Exactly what T3.2's measurement predicted (D moved 241 bps, the material 8-K B only 235 bps): **price data alone cannot separate a material event from a routine one.** This arrives from the *control*, not the showcase, which is what makes it credible rather than curated. | This, not loss reduction, is what the submission may claim. Phrased narrowly: *Tinjau declined to act on two large price moves because neither had a qualifying cause, and one of them a volatility-only policy would have traded on.* A finding about restraint, not a demonstration of protection. Pinned in `headlineFindings` and by test so it cannot silently vanish. | `three-policy-benchmark.json`; T3.2/T3.3 finding rows above |
| 2026-08-21 | T5.1 | `[corrected]` | T0.4 §4 and `markout-study.md` §1.3 both annotate `M_0 = dU + dS*P_post` as "fee plus curve premium, **structurally >= 0**". Measured over the full population it is false for **216 of 4,777 swaps** (B 153/4,145, D 63/367, C 0/265), and every offender is larger than the median trade. | The annotation invites reading any negative markout as adverse selection, when part of it is ordinary curve slippage on a large trade. P2.4's sample was 32 first trades with median notional ≈ $105, where the fee always won. | It is a small-trade property, not a theorem: fee scales with size, curve cost with size²/liquidity. Pinned by test as a measurement rather than silently corrected in the prose. | `benchmarkMarkout.test.ts`; `t5-1-t5-2-baselines.md` §4.2 |
| 2026-08-21 | T5.3 | `[limitation]` | The assessment instant is the window end (`runScenario`'s documented default, chosen so the market leg gets its most favourable timing and any refusal is on the merits). | Moot for the frozen set, since Tinjau never promotes. But if Tinjau ever *did* promote on one of these windows, protection would begin at the window end and almost no swaps would be re-priced, so the economic comparison for a **promoting** Tinjau is not measurable on these windows. | Recorded, not worked around. A rolling-assessment method is not in the pre-registration and inventing one now would be a post-hoc method change. **This would bite T8.3 if the event set expands.** | `t5-1-t5-2-baselines.md`; `runScenario` |
| 2026-08-21 | T4.2/T7.2 | `[authorised DEC-012]` | Dien authorised deployment of the final registry, hook, and builder-controlled pool to **X Layer Testnet chain 1952**, and settled the pause semantics as fail-closed. | Removes the largest blocker on submission evidence: T4.2–T4.5 can be proven on a public chain with real transaction hashes and decoded events rather than only in a test harness. | Testnet only — no mainnet, no real funds. Sequence required: prove the harness on local Anvil **first**, then deploy, then re-run the *identical* harness against 1952 changing only RPC/chain id/addresses. If any code change is needed between the two runs, the harness was not chain-agnostic and that is itself a finding. Addresses from this step are published as **T4.2 working addresses, not final**; T7.2 re-verifies and owns the authoritative list. | User decision 2026-08-21; dry-run 7,657,791 gas ≈ 0.000306 OKB against ~0.199 OKB available |
| 2026-08-21 | T4.1 | `[orchestrator-error]` | I briefed the T4.1 agent to emit `observedAt: null` for "the `UNAVAILABLE` leg, and any window with no swaps", treating those as the same case. They are not. `confirmMarket` returns `UNAVAILABLE` for **two** situations: a window with no swaps, and a window whose sample is below `minSwapsForVerdict` — and the second **has real observations** that must keep their timestamp. | Implemented literally, my instruction would have baked in a false invariant (`UNAVAILABLE ⟹ null`) that a five-swap window violates. | **The agent refused the framing and implemented the correct rule instead:** nullity tracks *"was anything observed"*, not the status. It added a named test, `UNAVAILABLE does not by itself imply a null timestamp`, whose comment exists specifically to stop a future reviewer tightening it. My error, caught by the agent. | `t4-1-decision-orchestrator.md` §12; `decisionSchema.test.ts` |
| 2026-08-21 | T4.2 | `[progress]` | `contracts/src/TinjauFeeHook.sol` built — the missing link from `TinjauRiskRegistry` through `TinjauRiskPolicy` to an actually-charged v4 LP fee. `forge test` **93 → 134**, every pre-existing suite count unchanged (orchestrator-verified). | Fee read back from `PoolManager`'s own `Swap` event on a real pool and a real swap: no record/`NORMAL`/`WATCH` → **500**; `PROTECT`/High at t=0 → **20,000**; t=12,600 s → **10,250**; t=21,600 s → **500**, with only `vm.warp` between swaps and no keeper transaction. The E2E test also asserts the charged fee equals `registry.effectiveState(...)`, so "registry state and pool fee agree" is checked rather than assumed. Pool is **builder-controlled**, labelled so in contract, tests, script and doc. | **Nothing is deployed.** Dry-run only against live chain-1952 state (7,657,791 gas ≈ 0.000306 OKB, hook address low bits `0x2080`); the generated `broadcast/dry-run/` directory was deleted so nothing in the committed tree implies a deployment that did not happen. T4.2 cannot close until T7.2 supplies real addresses and decoded on-chain events. | `t4-2-hook-and-wiring.md`; `TinjauFeeHook.t.sol` 41 tests |
| 2026-08-21 | T4.2 | `[method]` | The agent **refused to accept its own clean first run** and mutation-tested the hook: returning `baseFee` unconditionally from `beforeSwap` killed exactly the 4 fee-asserting E2E tests and nothing else; disabling the rumour re-check killed exactly the 2 rumour tests. | Proves the E2E tests measure what the **pool charged** rather than what a view function returned — the difference between demonstrating enforcement and demonstrating a getter. | Adopted as the expected standard for any suite whose first run is green. No mutation markers remain (grep-verified). | `t4-2-hook-and-wiring.md`; `TinjauFeeHook.t.sol` |
| 2026-08-21 | T1.3 | `[claim-corrected]` | T1.3's evidence line credited the "a proposal may only lower the fee" guarantee to `requestedFee` being intersected with the policy target via `min`. **That `min` is inert on the on-chain path.** `requestedFee` is signed and bound into the EIP-712 hash (`TinjauRiskRegistry.sol:366`) but is never written into `RiskRecord`, which has no fee field — orchestrator-verified against the 12-field struct. | The stated safety property holds, but by a **different and stronger** mechanism than the one published: a compromised assessor cannot express a fee on the persisted path at all, only `confidence` in three bands, every one inside the envelope. Left unamended, a judge checking the cited mechanism would find it unused. | T1.3's evidence line corrected in place with a dated note rather than silently rewritten. Found by the T4.2 agent while wiring the hook, not by the T1.3 work that made the claim — which is the argument for building the consumer before trusting the guarantee. | `TinjauRiskTypes.sol` `struct RiskRecord`; `TinjauRiskRegistry.sol:366` |
| 2026-08-21 | T4.2 | `[deviation]` | The hook fails closed to `baseFee` when the registry is paused. Read strictly, §0.7 says a pause must not cancel a running protection. | A paused registry now suspends the fee *action* while the record, its history and its clock are untouched. Because the clock keeps running, a pause can only ever shorten protection, never extend it. **Settled: Dien chose fail-closed on 2026-08-21.** §0.7's prohibition targets a protection **silently cancelled by degraded data**; a guardian pause is neither silent nor data-driven, it is an explicit human action, and it is the only lever available if the assessor key is compromised. | `TinjauFeeHook.sol` PAUSE SEMANTICS; `test_degraded_registryIsPaused`; user decision DEC-012 |
| 2026-08-21 | T4.2 | `[risk]` | The hook's hand-decoder is coupled to `RiskRecord`'s exact 12 fields / 384 bytes. A 13th field would make every read **fail closed to `baseFee` — safe but silent**. | A future schema addition would disable protection everywhere without any test failing. | T7.1 must assert the encoded size next to the struct definition. The undefined-reason-bit test was already changed to derive its bit from `REASON_ALL_DEFINED` rather than hardcode a position, so that half is self-maintaining. | `t4-2-hook-and-wiring.md` §finding 3 |
| 2026-08-21 | T4.1 | `[BLOCKING — frontend integration]` | `apps/web/src/lib/risk/model.ts` `REASON_CODES` is missing codes the published `risk-record.schema.json` carries: `INSUFFICIENT_SAMPLE`, `UNKNOWN_COMPANY`, and `PERSISTENCE_UNOBSERVED` (bit 22, added mid-session). | Scenario A's record emits `INSUFFICIENT_SAMPLE`, so `apps/web/src/lib/risk/validate.ts` **throws on a record that is valid against the published schema**. Any frontend fed real orchestrator output fails on scenario A. | Reported, **not fixed** — `apps/web/**` is the frontend owner's lane and the non-frontend agents are forbidden from entering it (§0.22). Codex must re-diff `model.ts` against the current `$defs.reasonCode.enum` rather than against any earlier list, since the enum moved during this session. | `decisionSchema.test.ts`; `model.ts` vs `risk-record.schema.json` |
| 2026-08-21 | T4.1 | `[schema — resolved]` | `risk-record.schema.json` made `marketConfirmation.observedAt` required and non-nullable, but scenario A's window has zero swaps and has no observation to stamp. The agent mitigated by using the assessment instant with `blockNumber: null` and `status: UNAVAILABLE`. | The mitigation still lets a consumer compute `age = now - observedAt` and read a leg that was **never observed** as perfectly fresh — the same failure shape T3.1 removed when it measured OKX freshness from source time rather than ingestion time. An absence must not be representable as a reading, even with `UNAVAILABLE` sitting beside it. **Resolved:** scenario A now emits `observedAt: null` with `fresh: false` **forced** rather than merely expected, since `market/confirm.ts` is owned by another lane and nothing it returns should be able to make an unobserved leg look fresh. Exactly one field moved across all four scenarios — every `assessmentId` and `evidenceCommitment` is byte-identical to before. The field stays **required**: an omitted field and an explicit `null` are different facts. The mutation guard grew 17 → 20 (numeric, non-date, and missing `observedAt`), so nullable does not mean anything goes. | **Orchestrator decision: the field is now nullable.** `$id` bumped to `.../risk-record/1.0.1.json`; `schemaVersion` deliberately **stays** `tinjau.risk/1.0.0`, because no on-chain vocabulary changed — no enum, ordinal, or reason bit moved — and bumping it would break parity with the Solidity constant over a field that never goes on chain. Widening keeps every previously-valid document valid. | `risk-record.schema.json`; `t4-1-decision-orchestrator.md` §12 |
| 2026-08-21 | T5.1/T5.2 | `[BLOCKING — method]` | **`M_3600_LP` mixes two fee bases inside one metric.** `markout.ts:135` computes `M_h_LP = (dU + dS*P_h) − haircut`, where `dU` is the **observed** token delta (embedding the fee actually charged at 500) but `haircut` is `protocolShare × feeGrossUsd` at the **counterfactual** policy fee. The LP is debited the protocol's share of a counterfactual fee it is never credited for. | Raising a fee therefore strictly *lowers* markout, so `STATIC` always holds the largest `M_3600_LP` on identical trades and **`canClaimLossAvoided` (§8.6) is unreachable by construction** for any fee-raising policy. Verified numerically by the agent (scenario B's entire markout gap between baselines, 2,433.15 USD, equals exactly 0.25× the fee-revenue gap) and structurally re-verified by the orchestrator at `markout.ts:135`. Publishing this metric alone would read as "evidence-aware fees hurt LPs" when the metric simply cannot rank fee policies. | See **AMD-002** below. The agent correctly refused to fix it unilaterally: re-deriving `dU`/`dS` after seeing results, in the direction that flatters fee-raising policies, is exactly what pre-registration exists to prevent. | `t5-1-t5-2-baselines.md` §4.1; `markout.ts:135`; `benchmarkBaselines.test.ts` |
| 2026-08-21 | T0.4 | `[amendment AMD-002]` | **The frozen `M_h_LP` stays exactly as pre-registered and is published as the primary metric, defect and all.** T5.4 additionally computes `M_h_LP_consistent`, which applies the same fee basis to both the credit and the debit side. Both are reported side by side, per event and per distribution. | Without the second metric the headline number is not conservative, it is meaningless — it answers a different question from the one the benchmark asks. Without the first, a frozen method would have been rewritten after results. | **Recorded before `M_h_LP_consistent` was computed or seen, per T0.4 §10.** Three constraints bind it: (1) it is labelled a **post-hoc amendment**, never as pre-registered; (2) its direction of effect is disclosed up front — it **flatters any fee-raising policy**, including Tinjau's; (3) **it may not open the claim gate.** `canClaimLossAvoided` remains governed by the pre-registered metric alone and therefore stays `false`. A metric introduced after seeing results cannot be permitted to authorise a claim, or the pre-registration would be decorative. | This row; `t0-4-benchmark-preregistration.md` §9.2 |
| 2026-08-21 | T5.2 | `[resolved]` | T0.4 §6.2's parenthetical "(scenario C is thin, scenario A is empty)" implies C should be `INDETERMINATE`, but §6.2's **stated rule** ("too few trades to estimate `rv_ref`") does not force it — C has 265 swaps and `rv_short` is estimable at 366 of 421 grid points. The agent implemented the stated rule; C reports `TRIGGERED` at all three `k`. | Three published volatility rows depend on the reading. | **Orchestrator decision: the stated rule governs, the parenthetical does not.** A parenthetical example is an author's expectation, not a threshold, and the only available gate (`THIN_WINDOW_SWAP_THRESHOLD = 420`) is a label-only constant whose reuse here would **also silence scenario D — the benchmark's sole false-positive measurement**. Silencing the one row that costs the competitor its credibility, using a threshold repurposed after results exist, is result-driven in the most damaging direction. C stands as `TRIGGERED`. | `t5-1-t5-2-baselines.md` §5.4; T0.4 §6.2 |
| 2026-08-21 | T3.4 | `[fixed — F1]` | **Anti-wick is now a necessary condition for any `CONFIRMED`.** Each signal's `fired` embeds `antiWick.held`, and the verdict restates the conjunction so a future fourth signal cannot silently reopen the hole. | Velocity and basis may corroborate a persistent price dislocation; neither may substitute for one. The cheapest attack in the stack — doubling a trade rate, no capital at risk — no longer confirms. Disclosed narrowing: a flat-price pool persistently diverged from the OKX reference can no longer confirm on basis alone. Fails closed, pinned by a named test. | No threshold value changed. Both `degraded-f1`/`f2` fixtures now return `NOT_CONFIRMED` through `buildConfirmationInput`, the production adapter, so this is an engine property and not a harness artifact. | `t3-4-degraded-cases.md` §2; `confirm.ts` verdict block; `marketDegraded.test.ts` 34 pass / 0 todo |
| 2026-08-21 | T3.4 | `[fixed — F2]` | **Persistence is the MEDIAN retention across the whole hold interval**, not the value at the single observation nearest trough + hold. Intervals with fewer than `antiWickMinSamples` observations fail closed as `evaluated: false`. | Median over minimum, deliberately: the minimum asks "was it never interrupted?", which on this thin pool lets one counter-trade refuse a genuine dislocation — a single-trade **suppression** attack mirroring the fabrication attack being removed. Trading one manipulation surface for another is not a fix. Cost, disclosed: an attacker holding the price down for >150s of the 300s interval still passes, so "manipulation-proof" is not a claim this earns. | `minRetention` now reported alongside the median so the stricter reading stays visible. `antiWickMinSamples = 2` inherited verbatim from `poolTelemetry.MINIMUM_SWAPS_FOR_METRICS` — orchestrator-verified as not a new tuned number. | `t3-3-confirmation-method.md` §3.3a; `t3-4-degraded-cases.md` §3 |
| 2026-08-21 | T3.4 | `[version]` | **Rule version bumped `tinjau.confirm/1.0.0` → `2.0.0`, major rather than minor.** | F1 is a strict narrowing, but F2 is two-sided: a move that stayed dislocated yet bounced at the sampled instant was refused by 1.0.0 and is accepted by 2.0.0. `1.1.0` would misdescribe the change as a compatible refinement, and a 2.0.0 verdict wearing a 1.0.0 label is indistinguishable from a real 1.0.0 verdict — the exact failure the field exists to prevent. | T3.3's four verdicts restated under 2.0.0 in that doc's new §9.1; §7.1's table relabelled as the 1.0.0 record. No threshold value moved. | `confirmationConfig.ts:44`; `t3-3-confirmation-method.md` §9.0 |
| 2026-08-21 | T3.4 | `[verified — unaffected]` | The four frozen verdicts re-run through `buildConfirmationInput` + the production adapter under rule 2.0.0: A `UNAVAILABLE`; B/C/D `NOT_CONFIRMED`; `dualLegConfirmed` false everywhere. **Identical to T3.3's published results.** | The earlier prediction that these fixes are outcome-neutral on the frozen set was **verified, not assumed**. Scenario B still resolves to `WATCH`, not `PROTECT`. | Published as-is. No threshold was adjusted at any point in the fix. | `t3-4-degraded-cases.md` §6; `marketConfirmation.test.ts` frozen pins |
| 2026-08-21 | T3.4 | `[finding]` | **Scenario C's `antiWick.held` flipped `false` → `true`** (45.9% at the endpoint → 65.2% median over 14 samples, lowest 43.9%). B moved 13.0% → 9.7%; D 10.3% → 11.4%. | C's **verdict is unchanged** — its 11.4 bps drawdown is an order of magnitude below the 200 bps floor and velocity is 1.00×, so no signal exists for the gate to admit. This is the two-sided nature of the F2 fix observed on real data instead of argued in the abstract, and it is the concrete reason the version bump is major. | Disclosed rather than smoothed over. | `t3-4-degraded-cases.md` §6.1 |
| 2026-08-21 | T3.4 | `[corrected]` | T3.3 §7.1 recorded scenario C's anti-wick as "held, 45.9%". That was wrong: 45.9% is below the 50% required, so under rule 1.0.0 the outcome was `held: false`. | Nothing downstream depended on it — C fails on drawdown size regardless — but the published record stated the opposite of what the engine did. | Re-measured against the 1.0.0 code before the fix landed, then corrected in place with a dated note rather than silently overwritten. | `t3-3-confirmation-method.md` §7.1 |
| 2026-08-21 | T3.4 | `[added]` | `REASON_PERSISTENCE_UNOBSERVED` (bit 22) added across Solidity, TypeScript, the parity map, the published schema, and the T6.3 reader's bit map. | `ANTI_WICK_FAILED` is a **positive** finding — we watched the hold interval and the move retraced. When the interval is unreachable or too sparse, the engine knows nothing either way, and emitting `ANTI_WICK_FAILED` there would assert a retracement nobody observed. A consumer deciding whether to wait for more data needs that difference. Same §0.12 fidelity family as `UNKNOWN_COMPANY` and `INSUFFICIENT_SAMPLE`. | Added by the orchestrator, since reason bits cross the language boundary; the T3.4 agent **requested it rather than inventing a local code**, which is the intended protocol. `riskTypesParity.test.ts` 9/9 — it parses the Solidity source, so both languages are verified consistent. Wired into `confirm.ts` on the same boolean that decides the outcome, so exclusivity with `ANTI_WICK_FAILED` is structural rather than a convention; an exclusivity sweep asserts `seen.size === 2` so it cannot pass trivially by emitting neither. **No frozen scenario carries the new code** — reason sets for A/B/C/D compared programmatically by set difference and all four are unchanged. **No second version bump**, argued from 2.0.0 being unreleased rather than from the change being small, so the argument correctly stops applying once anything is stamped 2.0.0. A prose overclaim rode along and was fixed: the blocked-verdict explanation said "the price dislocation did not persist" even on the unobserved path, which is precisely what bit 22 exists to prevent; it now reads "could not be shown to persist". | `TinjauRiskTypes.sol`; `riskTypesParity.test.ts`; `t3-4-degraded-cases.md` §4.1 |
| 2026-08-21 | T6.3 | `[done]` | Reference consumer `tools/risk-reader/**` — Node, zero npm dependencies, its own ABI and 4-byte selectors, importing nothing from `apps/server`. | The risk record is proven independently readable and fully decodable by a stranger holding only the chain and the ABI. Stored-versus-effective divergence is made explicit; undefined reason bits and a newer schema version are refused rather than ignored. | Local Anvil only — **no address published**. T7.2 owns deployment; the same command then works with two changed arguments and no code edit. | `bash tools/risk-reader/test/anvil-e2e.sh` → exit 0, 59 passed / 0 failed; decoded output in `t6-3-reference-consumer.md` §4.2 |
| 2026-08-21 | T6.3 | `[disclosed]` | `FutureSchemaRegistry.sol` was deployed to the local Anvil to exercise the consumer's refusal paths. | The real v1.0.0 registry **cannot** emit an undefined reason bit or a newer schema version — `validateReasonBits` rejects them on write — so those refusals could not otherwise be tested against a real `eth_call`, only against a function in isolation. | The fixture lives in the tool's own directory, imports nothing, enforces nothing, and reads `DataMode: SIMULATED` on chain, so it cannot be mistaken for the registry. | `tools/risk-reader/test/fixture/src/FutureSchemaRegistry.sol` |
| 2026-08-20 | T0.5 | `[open]` | The provenance fix exists in code only; the live API still serves the old unlabelled payload. | `tinjau.xyz/api/scoreboard` continues to present the synthetic bankruptcy as unlabelled until redeploy. | No judge-facing material may cite that endpoint as evidence until the T7.3 backend redeploy lands. Frontend must also render the new field. | `t0-5-branding-audit-non-frontend.md` §5 |
| 2026-08-21 | T7.2 | `[documented]` | An on-chain write nobody had recorded. Transaction `0xba5a7b99…b2b5b` posted a `PROTECT` to the production-envelope registry at 2026-08-21T03:59:57Z, about 17 seconds after that stack's manifest was generated, so neither the hash nor its evidence commitment `0x32f397d9…78cbe` appeared in any committed artifact. | An undocumented write to a judge-facing registry is exactly the kind of thing that reads as a cover-up if a judge finds it before we do, and it is trivially discoverable by reading the contract's own event log. It is also genuinely useful, so deleting or ignoring it would have been the wrong response twice over. | Recorded in `t7-2-authoritative-addresses.json` under `_undocumentedProtectWrite`, with both halves stated. **What it proves:** deterministic recovery on the FULL production envelope on a public chain — its TTL is exactly the 21,600 s cap, and re-read at 12:07Z the registry returns stored `PROTECT` / effective `NORMAL` with the fee back at 500, with no keeper and no transaction ending it. **What it does not prove:** read alone the record says `PROTECT` / `REPLAY` / `CONFIRMED`, because the on-chain schema has no field for "evidence replayed, market leg constructed". The canonical replay of that event resolves to `WATCH`. | `t7-2-authoritative-addresses.json`; T4.3 evidence |
| 2026-08-21 | T7.2 | `[corrected]` | `t7-2-authoritative-addresses.json` listed `sceneA_post` as `0x69c11cf4…922c`, which `eth_getTransactionByHash` shows was sent to `0x1a1e1730…E2b1`, the **demo-envelope** registry, not to this stack's registry. | Small, but it put a wrong transaction hash in a file whose own name says "authoritative", and the two envelopes are exactly the thing a reader is most likely to conflate. | Corrected to `0x025ca92d…8671`, verified to target `0x60062389…7317` and to match what `deployed-addresses.json` and the demo driver already used. The correction is recorded in the file as `_sceneA_post_correction` rather than applied silently. | `t7-2-authoritative-addresses.json` |
| 2026-08-21 | T7.2 | `[corrected]` | `frontend-handoff/deployed-addresses.json` still carried `status: T4.2_WORKING_ADDRESSES_NOT_FINAL` after T7.2 had verified that exact list, and `/proof` rendered that warning verbatim — directly beneath a heading reading "Production envelope, T7.2 publishes this one". | The page contradicted itself in adjacent elements, and the disclaimer had inverted its meaning: it now cast doubt on addresses that had in fact been verified. A disclaimer that is no longer true does not fail safe, it just teaches a reader to discount the ones that are. | Confirmed address-for-address that the handoff list matches `t7-2-authoritative-addresses.json`, then promoted the status to `T7_2_AUTHORITATIVE` across all five places that pin it (artifact, generator, schema `const`, validator, and the web parity test), keeping the builder-controlled-pool warning that is still true. README's three stale mentions were corrected with it. **Requires a redeploy to reach the live page.** | `deployed-addresses.json`; `generate.ts`; `validate.mjs`; `handoff-parity.test.ts`; `README.md` |
| 2026-08-21 | T4.4 | `[closed]` | T4.4 was the last open P0 implementation task, and its acceptance needed evidence from four layers at once (UI, API, registry, hook) rather than from one test. | Recorded because the evidence was gathered by re-decoding raw event data from chain rather than by citing the manifests that already claimed these values. A manifest asserting `fee 500` and PoolManager's own `Swap` event yielding `fee 500` are different strengths of evidence, and only the second one survives the manifest being wrong. | Closed. `state 1 = WATCH` decoded from `AssessmentPosted` on both deployed stacks with identical `reasonBits 2115622`; `fee 500` decoded from the `Swap` event against a `PROTECT` ceiling of 20,000; `authorized: false` live in the API; `AUTHORISED No / STATUS NONE` live in the UI. | `t4-4-rumour-negative-control.md` |
| 2026-08-21 | tracker | `[integrity-fixed]` | Twelve tasks (T4.2, T4.3, T4.5, T5.5, T6.1, T6.2, T6.4, T6.5, T7.1, T7.2, T7.3, T7.4) were checked `[x]` while their Evidence field still read `pending`, and §7's acceptance matrix still called eight of them pending. | This breaks the tracker's own completion rule in §1, which says a checkbox closes only when its acceptance criteria **and** evidence field are satisfied. The underlying work was real and the evidence existed in separate notes, but a judge reading the tracker alone would see either an unsupported checkbox or a project further behind than it is. | Every Evidence field filled by pointing at the note that actually holds the evidence, plus the figures re-verified on 2026-08-21. The §7 matrix rows were rewritten to match, keeping each caveat attached to its row rather than dropping it. | tracker §4, §7 |

## 9. Checkpoint 2 approval payload

- Status: approved
- Approved by: Dien
- Approval date: 2026-08-20
- Service decision: immutable source-linked replay fixtures approved for SVC-007/SVC-008
- Readiness evidence: T0.1 / REF-030

Approve this tracker only after confirming:

- the implementation boundary is the P0 vertical slice, not P1/P2;
- T0.3 closes the news/social service choices or explicitly approves the replay-fixture fallback;
- existing code is treated as reusable evidence, not automatically final behavior;
- benchmark rules are frozen before results;
- the claim gate and HUMAN-ONLY boundaries are accepted.

Recommended approval wording after those conditions are met:

> “Saya menyetujui `tinjau-lp-risk-autopilot-task-tracker.md` sebagai implementation plan Hackathon MVP, termasuk prioritas P0, service fallback, benchmark preregistration, claim gate, dan batas HUMAN-ONLY.”
