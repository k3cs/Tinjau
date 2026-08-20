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

- [ ] **T0.2 — Freeze the demo asset and two scenarios**  
  Depends on: T0.1  
  Owner: external non-frontend AI agent.
  Work: select one supported tokenized equity, one source-linked official event, and one source-linked historical or clearly simulated rumor. Preserve source, timestamp, company/token mapping, and replay window.  
  Acceptance: both scenarios are reproducible from immutable fixtures; the rumor is visibly labeled `RUMOR` and `REPLAY` or `SIMULATED`; no scenario is selected based on its benchmark result.  
  Evidence: pending.

- [x] **T0.3 — Close the news/social service gate**
  Depends on: none
  Stage boundary: Stage 4 service-planning task; provider selection or fallback approval occurs before Checkpoint 2 closes.  
  Work: choose the narrowest permitted intake for the two scenarios. Prefer source-linked public data; if live API access is unavailable, use immutable replay fixtures and record the provider limitation in `SERVICES.md`.  
  Acceptance: SVC-007 and SVC-008 have a decision, provenance rules, readiness test, fallback, cost/access status, and no unapproved credential dependency.  
  Evidence: Dien explicitly approved immutable source-linked replay fixtures on 2026-08-20. SVC-007/SVC-008 select the repository-local replay approach for P0; live provider discovery is deferred and cannot support a live-monitoring claim.

- [ ] **T0.4 — Pre-register the benchmark method**  
  Depends on: T0.2  
  Owner: external non-frontend AI agent.
  Work: freeze replay inputs, timestamps, pool parameters, fee policies, metrics, window, and result-reporting format before running the comparison.  
  Acceptance: method covers static fee, volatility-only, and Tinjau using identical market inputs; includes neutral/rumor behavior and reports full distribution plus tail cases, not only averages.  
  Evidence: pending.

- [ ] **T0.5 — Complete user-facing Tinjau branding**  
  Depends on: T0.1  
  Owner: split — frontend Codex owns `apps/web/**`, metadata, screenshots, and public visual branding; the non-frontend agent owns server/API identifiers and non-UI documentation only.
  Work: remove remaining public AFTERHOURS names from page metadata, headings, links, API output, screenshots, and judge-facing docs while keeping historical records unchanged.  
  Acceptance: repository search finds no unintended public-facing AFTERHOURS label; `tinjau.xyz` renders Tinjau metadata and no broken route.  
  Evidence: pending.

### Phase T1 — Final risk model and bounded on-chain policy

Owner: external non-frontend AI agent for every task in this phase.

- [ ] **T1.1 — Define versioned risk and evidence types**  
  Depends on: T0.1  
  Work: add shared types for `NORMAL`, `WATCH`, `PROTECT`; `OFFICIAL`, `NEWS`, `RUMOR`; reason codes; confidence band; evidence commitment; market-confirmation status; timestamp; expiry; and policy version.  
  Acceptance: server, contract ABI, benchmark, and web app share an explicitly versioned schema or generated equivalents; invalid/unknown values fail safely.  
  Evidence: pending.

- [ ] **T1.2 — Implement deterministic promotion rules**  
  Depends on: T1.1  
  Work: translate the design rules into non-LLM state transitions. Freeze replay-derived thresholds in versioned configuration.  
  Acceptance: rumor-only and single-news inputs cannot reach `PROTECT`; non-official promotion requires at least two independent sources plus fresh market confirmation; stale/conflicting input cannot create a new `PROTECT`.  
  Evidence: pending.

- [ ] **T1.3 — Upgrade the bounded fee policy**  
  Depends on: T1.1, T1.2  
  Work: enforce baseline/max fee, maximum duration, cooldown, nonce/replay protection, supported pool, pause, expiry, and deterministic decay. `WATCH` must not invoke the aggressive fee.  
  Acceptance: the LLM cannot choose arbitrary fee or duration; expired, replayed, incorrectly signed, unsupported, over-ceiling, and invalid-transition requests revert; an active state is not cancelled merely because later market data is missing.  
  Evidence: pending.

- [ ] **T1.4 — Implement the minimal X Layer Risk Registry record**  
  Depends on: T1.1, T1.2  
  Work: migrate or replace the existing registry so another contract/app can read asset, pool, state, reason, evidence commitment, confidence band, timestamps, expiry, and policy version.  
  Acceptance: writes are authorized and idempotent; reads require no dashboard trust; history/evidence is not deleted by pause or recovery; ABI and example read are documented.  
  Evidence: pending.

- [ ] **T1.5 — Add contract unit, property, and fuzz coverage**  
  Depends on: T1.3, T1.4  
  Work: test state transitions and every enforcement boundary.  
  Acceptance: a property test proves any input set whose only information evidence is `RUMOR` cannot reach the aggressive action path; fee/duration/cooldown/expiry/nonce/signature/pause boundaries pass; `forge test` is green.  
  Evidence: pending.

### Phase T2 — Minimum AI Evidence Graph

Owner: external non-frontend AI agent for every task in this phase.

- [ ] **T2.1 — Normalize official, news, and rumor claims**  
  Depends on: T0.3, T1.1  
  Work: preserve original URL/source ID, author/publisher, timestamp, company, token, event type, verbatim claim span or source pointer, source class, and replay/live label.  
  Acceptance: speculation is not rewritten as fact; missing provenance produces an invalid or non-promotable claim; official ingestion preserves existing hash/agreement/bond behavior.  
  Evidence: pending.

- [ ] **T2.2 — Build claim clustering and entity/token resolution**  
  Depends on: T2.1  
  Work: use AI to group differently worded claims about one event and map company → token → pool, with deterministic validation of supported mappings.  
  Acceptance: both frozen scenarios resolve to the intended asset/pool; unsupported or ambiguous mappings stop at `WATCH`/manual review and never authorize an action.  
  Evidence: pending.

- [ ] **T2.3 — Add source independence, contradiction, and recency**  
  Depends on: T2.2  
  Work: distinguish duplicated reporting from independent evidence, expose supporting/contradicting claims, and expire old evidence.  
  Acceptance: two copies of the same origin do not count as two sources; contradiction is visible and caps promotion unless deterministic rules are independently satisfied; every confidence change has a machine-readable explanation.  
  Evidence: pending.

- [ ] **T2.4 — Create a small labeled AI evaluation set**  
  Depends on: T2.3  
  Work: label the official event, rumor, duplicates, contradiction, entity/token mapping, and at least one neutral claim.  
  Acceptance: evaluation reports extraction, clustering, entity resolution, independence, contradiction, rumor-to-`WATCH`, and unsupported-`PROTECT`; target unsupported-`PROTECT` rate is zero.  
  Evidence: pending.

### Phase T3 — OKX/X Layer market confirmation

Owner: external non-frontend AI agent for every task in this phase.

- [ ] **T3.1 — Harden the OKX reference-price adapter**  
  Depends on: T0.2  
  Work: reuse the existing OKX index poller and add timestamp, freshness, asset mapping, retry, and explicit unavailable state.  
  Acceptance: the frozen asset produces deterministic timestamped samples; stale/missing data is not treated as confirmation; failures are observable.  
  Evidence: pending.

- [ ] **T3.2 — Add direct X Layer pool telemetry and executable exit depth**  
  Depends on: T0.2  
  Work: read pool price, liquidity, trades/velocity, short-window drawdown, and executable quote/depth for the builder-controlled test pool or a labeled historical source.  
  Acceptance: every metric has block/time provenance and units; builder-controlled liquidity is labeled; RPC retry/range limits are handled.  
  Evidence: pending.

- [ ] **T3.3 — Implement the market-confirmation engine**  
  Depends on: T3.1, T3.2, T1.2  
  Work: derive basis, velocity, drawdown, exit-depth change, market-hours context, freshness, and anti-wick confirmation.  
  Acceptance: no single short-lived price spike is sufficient; confirmation reason and contributing values are reproducible; missing/stale data blocks new `PROTECT`.  
  Evidence: pending.

- [ ] **T3.4 — Test manipulation and degraded-data cases**  
  Depends on: T3.3  
  Work: cover wick, stale OKX sample, delayed RPC, thin test liquidity, missing route, and conflicting signals.  
  Acceptance: every degraded case produces `unavailable`, `WATCH`, or continued bounded expiry as specified—never unsupported promotion.  
  Evidence: pending.

### Phase T4 — Integrate evidence, state, contract, and recovery

Owner: external non-frontend AI agent for every task in this phase.

- [ ] **T4.1 — Build the decision orchestrator**  
  Depends on: T1.2, T2.3, T3.3  
  Work: combine the structured Evidence Graph and market confirmation into a signed, explainable assessment.  
  Acceptance: output contains inputs, rule version, state, reason, confidence band, expiry, proposed bounded action, and explanation; retrying the same event is idempotent.  
  Evidence: pending.

- [ ] **T4.2 — Connect poster, registry, policy, and hook**  
  Depends on: T1.3, T1.4, T4.1  
  Work: post the assessment, verify readback, let the hook consume the policy, and execute a swap showing the effective fee.  
  Acceptance: registry state and pool fee agree; failed action remains visible and cannot claim protection benefit; transaction hashes and decoded events are recorded.  
  Evidence: pending.

- [ ] **T4.3 — Implement automatic expiry and deterministic recovery**  
  Depends on: T4.2  
  Work: demonstrate `PROTECT` fee decay and state recovery without an LLM deciding when to stop.  
  Acceptance: time advancement or scheduled execution returns the policy to baseline within the configured maximum; history remains readable; cooldown prevents immediate unsafe re-entry.  
  Evidence: pending.

- [ ] **T4.4 — Prove the rumor negative-control path end to end**  
  Depends on: T2.4, T4.2  
  Work: run the frozen rumor through intake, Evidence Graph, decision engine, registry, and hook.  
  Acceptance: UI/API/registry show `WATCH`; aggressive fee remains unauthorized; test and transaction/read evidence are stored; the result is not presented as official fact.  
  Evidence: pending.

- [ ] **T4.5 — Prove the confirmed-event path end to end**  
  Depends on: T2.4, T3.4, T4.3  
  Work: run the frozen official event or clearly labeled replay through the full flow.  
  Acceptance: evidence → confirmation → `PROTECT` → bounded fee → swap/readback → decay → `NORMAL` completes from one reproducible command or demo control, with failure-safe output.  
  Evidence: pending.

### Phase T5 — Three-policy benchmark and Proof of Protection

Owner: external non-frontend AI agent for every task in this phase.

- [ ] **T5.1 — Implement the static-fee baseline**  
  Depends on: T0.4  
  Acceptance: replay uses the frozen base fee and the same trades, liquidity, timestamps, costs, and initial state as the other policies.  
  Evidence: pending.

- [ ] **T5.2 — Implement the volatility-only baseline**  
  Depends on: T0.4  
  Work: define a generic price/volatility controller that receives no filing, news, rumor, or event-type input.  
  Acceptance: thresholds and fee bounds are documented and fixed before results; it uses the same maximum fee/duration constraints as Tinjau where comparable.  
  Evidence: pending.

- [ ] **T5.3 — Implement the event-aware replay runner**  
  Depends on: T4.5, T5.1, T5.2  
  Acceptance: one command runs all three policies over identical input and emits versioned machine-readable results; seeded/same-input reruns are deterministic.  
  Evidence: pending.

- [ ] **T5.4 — Calculate policy outcomes without hiding tails**  
  Depends on: T5.3  
  Work: calculate LP markout, fee revenue, adverse selection, action latency, maximum fee, protection duration, decay time, false-positive cost, and relevant false-negative labels.  
  Acceptance: output includes per-event rows, full distribution, median/quantiles, and tail cases; neutral and rumor scenarios are present; units and counterfactual assumptions are explicit.  
  Evidence: pending.

- [ ] **T5.5 — Publish the Proof of Protection record and claim result**  
  Depends on: T5.4  
  Work: connect trigger evidence, observed market state, applied policy/action, actual test-pool outcome, and both replay baselines.  
  Acceptance: observed and replayed fields are visually and structurally separate; “loss avoided” appears only when calculable; if Tinjau does not beat volatility-only, the result says so and the loss-reduction claim remains disabled.  
  Evidence: pending.

### Phase T6 — Judge-facing product, docs, and narrative

- [ ] **T6.1 — Build the risk-state and evidence UI**  
  Depends on: T4.4, T4.5  
  Owner: frontend Codex. The non-frontend agent supplies only the validated handoff schemas and scenario data.
  Work: show `OFFICIAL/NEWS/RUMOR`, `NORMAL/WATCH/PROTECT`, source provenance, contradictions, market confirmation, policy ceiling, expiry/decay, and action status.  
  Acceptance: a judge can explain why the state changed and what AI is forbidden to do from one screen; live, observed, replayed, and simulated data are unmistakably labeled.  
  Evidence: pending.

- [ ] **T6.2 — Add the three-policy comparison UI**  
  Depends on: T5.5  
  Owner: frontend Codex. The non-frontend agent supplies only the validated comparison schema and data.
  Acceptance: static, volatility-only, and Tinjau results appear side by side with the same inputs and metrics; no unsupported winner language is hard-coded.  
  Evidence: pending.

- [ ] **T6.3 — Add a reusable risk-record read example**  
  Depends on: T1.4  
  Owner: external non-frontend AI agent; implement outside `apps/web/**`.
  Work: create a small separate read-only consumer or documented script that reads the registry without using the dashboard backend.  
  Acceptance: clean-environment command returns and decodes the current record; artifact is labeled “reference consumer,” not external adoption.  
  Evidence: pending.

- [ ] **T6.4 — Align README, docs, pitch, and competitor matrix**  
  Depends on: T5.5, T6.1, T6.3  
  Owner: external non-frontend AI agent for non-UI documents; frontend Codex supplies final UI screenshots and confirms displayed claims.
  Work: use the narrative `problem → alternatives → Tinjau addition → proof → X Layer ecosystem value`; cite prior art and explain the five differentiators.  
  Acceptance: artifacts include what already exists, what Tinjau adds, provenance, safety rules, contract bounds, testnet evidence, benchmark reproduction, limitations, and safe claims; prohibited “first” claims are absent.  
  Evidence: pending.

- [ ] **T6.5 — Assemble the three-scene demo**  
  Depends on: T6.2, T6.4  
  Owner: split — non-frontend agent owns scenario orchestration, factual manifest, reproducible scripts, API/contract evidence, and fixture fallback; frontend Codex owns browser choreography and visual presentation.
  Work: Scene A rumor containment; Scene B confirmed bounded protection and recovery; Scene C side-by-side policies.  
  Acceptance: differentiation is understandable within 30 seconds; full walkthrough is reproducible; architecture emphasizes AI proposal versus contract enforcement; fallback recording works without live third-party services.  
  Evidence: pending.

### Phase T7 — Final verification and X Layer deployment

- [ ] **T7.1 — Run the complete quality and security gate**  
  Depends on: T6.5  
  Owner: split — non-frontend agent runs server/contracts/security/data/claim checks; frontend Codex runs web build/typecheck/accessibility and verifies UI claims.
  Work: server/web typecheck, unit/integration tests, contract tests/fuzz, secret scan, clean setup, failure-path checks, and claim audit.  
  Acceptance: all required checks pass or each remaining defect is explicitly disclosed; no credential is committed; rumor safety and bounded-policy properties pass.  
  Evidence: pending.

- [ ] **T7.2 — Deploy the final contracts to X Layer Testnet**  
  Depends on: T7.1  
  Owner: external non-frontend AI agent, subject to the existing no-mainnet/no-real-spend guardrail.
  Work: deploy/upgrade the final registry/policy/hook/test pool as required and run both demo paths.  
  Acceptance: bytecode exists at every published address; explorer/RPC readback succeeds; decoded `WATCH`, `PROTECT`, fee action, and recovery evidence are recorded; builder-controlled pool is labeled.  
  Evidence: pending.

- [ ] **T7.3 — Deploy and verify the public app/API**  
  Depends on: T7.2  
  Owner: split — non-frontend agent owns backend/API readiness and evidence; frontend Codex owns Vercel/public web deployment and browser verification.
  Acceptance: public URLs return successfully, display final Tinjau branding, use final addresses, expose graceful degraded behavior, and do not imply production liquidity or adoption.  
  Evidence: pending.

- [ ] **T7.4 — Rehearse from a clean judge path**  
  Depends on: T7.3  
  Owner: split — non-frontend agent owns clean CLI/API/contract reproduction; frontend Codex owns the clean browser path and presentation timing.
  Work: follow README from a clean environment/browser and time the demo.  
  Acceptance: repository setup, benchmark, registry read, public UI, source links, and transaction evidence work without private context; all required hackathon fields have a prepared value.  
  Evidence: pending.

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
| Source-linked official event | T4.5 | pending |
| Explainable risk transition | T4.4, T4.5 | pending |
| Rumor safely contained at `WATCH` | T1.5, T4.4 | pending |
| OKX/X Layer market confirmation | T3.3, T3.4 | pending |
| Bounded on-chain pool action | T4.2 | pending |
| Automatic deterministic recovery | T4.3 | pending |
| Static-fee baseline | T5.1 | pending |
| Volatility-only baseline | T5.2 | pending |
| Reproducible three-policy outcome | T5.5 | pending |
| Reusable X Layer risk record/read | T1.4, T6.3 | pending |
| Competitor/differentiation matrix | T6.4 | pending |
| Public app + testnet proof | T7.2, T7.3 | pending |
| Clean submission evidence | T7.4, T7.5 | pending |

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
