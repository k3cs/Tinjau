# Tinjau — a corporate-event-aware market discontinuity guard for tokenized-stock liquidity on X Layer

Tinjau turns source-grounded evidence about a company into a safe risk state, independently checks
what the X Layer market is actually doing, permits only a bounded and temporary pool response,
recovers deterministically, and then measures whether the response helped.

**This README states the measured result, including the part that failed.** The economic claim did
not survive the benchmark, and nothing below is written to work around that.

- Product narrative and constraints: [`PRODUCT.md`](./PRODUCT.md)
- Execution plan, ownership, and the full deviations log:
  [`docs/buildx-orion-2026/outputs/04-planning/tinjau-lp-risk-autopilot-task-tracker.md`](./docs/buildx-orion-2026/outputs/04-planning/tinjau-lp-risk-autopilot-task-tracker.md)
- Claim audit and competitor matrix:
  [`docs/buildx-orion-2026/outputs/05-build/t6-4-claims-and-competitive-position.md`](./docs/buildx-orion-2026/outputs/05-build/t6-4-claims-and-competitive-position.md)

---

## 1. The problem

Tokenized US equities trade on-chain continuously. The things that determine what they are worth
do not.

- The US reference market closes; the token keeps trading.
- Corporate filings arrive asynchronously, often outside regular hours.
- NAV and reference-price updates can lag.
- On-chain liquidity for these assets is thin. In the pool measured here, only
  **0.53–2.29 wNVDAx (roughly $120–$517)** is provably quotable within one tick range.

An informed trader can act on a disclosure before an LP's static pool policy adapts. A pure alert
may arrive too late to matter. But handing an AI unrestricted authority over fees or funds simply
replaces one risk with a worse one.

## 2. What already exists, and why it is not enough on its own

Every individual component here has prior art. Tinjau does not claim to have invented any of them.

| Layer | Prior art found in review | What it does not do |
|---|---|---|
| Corporate-action extraction | **Chainlink** and 24 institutions: multi-model validation, golden records, attestation, cross-chain distribution | Not aimed at governing pool risk or proving an LP outcome |
| News / event intelligence | **RavenPack** and similar: 22k+ sources, entity and event taxonomies, relevance, novelty, sentiment | Off-chain; no on-chain policy, no LP action |
| AI or telemetry-driven v4 fee control | **RiskClaw**, **NeuralHook**, **Sentinel Agent**, **UniBrain**, **AnchorHookV4** | Reacts to price, volatility, tick range or CEX/DEX divergence — no exogenous cause, no corporate-event semantics |
| Automated on-chain risk response | **Hypernative**, **Chaos Labs** risk oracles | Live and broad, but general protocol risk rather than information discontinuity on tokenized equities |
| AMM designs for adverse selection | volatility fees, TWAP guards, flow-aware fees, **Arrakis HOT** | More mature on LVR; still telemetry-driven, with no notion of *why* the price moved |
| RWA position protection | **Argus** (Mantle RWA prototype) | Protects individual positions; does not carry challengeable corporate evidence into pool microstructure |

**The safe positioning sentence, and the only one this project uses:**

> No complete public product with the exact reviewed combination of source-grounded
> tokenized-equity evidence, rumor containment, OKX/X Layer confirmation, bounded LP action,
> deterministic recovery, and measured three-policy outcome was found.

"Not found" means not found in the public documentation reviewed on 2026-08-20. It is not proof
that no such system exists privately. Full matrix and sources:
[`docs/buildx-orion-2026/outputs/03-product/tinjau-competitive-landscape-deep-research.html`](./docs/buildx-orion-2026/outputs/03-product/tinjau-competitive-landscape-deep-research.html).

## 3. What Tinjau adds

Five mechanisms, which are only meaningful combined. Each is observable in the artifacts.

**1. Causal evidence, not only telemetry.** The original corporate claim is preserved — source
URL, publisher, publication time, event type, and a sha256 over the primary document — so the
record explains *why* the asset may be unsafe rather than reacting after volatility appears.
Evidence: `apps/server/src/evidence/`, `apps/server/scenarios/`.

**2. Rumor containment.** A rumor can raise attention and move an asset to `WATCH`, but rumor-only
evidence can never authorize the aggressive fee path. Duplicated syndications of one origin count
as one source. A source line that materially revised its own quantitative claim inside the evidence
window may support `WATCH` but may not count toward independent corroboration — a rule frozen
*before* the market data for that window was scored, and load-bearing: a test proves that removing
it flips scenario C to `PROTECT`. Evidence: `apps/server/src/risk/promote.ts`,
`apps/server/test/riskPromotion*.test.ts`, `contracts/test/`.

**3. Independent market confirmation.** Non-official evidence needs corroboration *and* a fresh
market signal. The confirmation engine (`tinjau.confirm/2.0.0`) combines drawdown, persistence,
trade velocity, basis, executable exit depth, market-hours context and freshness, and **anti-wick
persistence is a necessary condition** — velocity or basis may corroborate a persistent price
dislocation but can never substitute for one. Evidence: `apps/server/src/market/`,
`docs/.../04-planning/t3-3-confirmation-method.md`, `t3-4-degraded-cases.md`.

**4. Tokenized-equity awareness.** Company/token mapping, corporate-event semantics, materiality,
US market hours, reference-market basis, pool flow, and executable X Layer exit depth are separate
inputs, not one volatility score. Materiality is its own axis: an impeccably-sourced filing that
reports no corporate action is not a reason to raise LP fees, and the neutral control proves it.

**5. Measured outcome, published whichever way it goes.** The same replay input is scored under a
static-fee policy, a volatility-only policy, and Tinjau, against a method frozen before any result
existed. **The result is in §5 and it is not favourable.**

### The safety boundary

AI parses ambiguous language, resolves entities, groups duplicates, detects contradictions, and
*proposes* structured evidence. Deterministic code and the contract validate the asset, the
state-transition rules, the signature, the nonce, freshness, expiry, the fee ceiling, the maximum
duration, the cooldown, and the recovery. The contract can reject an AI proposal, and it can only
ever lower a proposed fee — never raise it. A compromised assessor cannot express a fee on the
persisted path at all: `requestedFee` is signed and bound into the EIP-712 hash but is never
written into `RiskRecord`, which has no fee field.

## 4. Proof — what was actually run

### 4.1 The three-scene demo, offline, in about a second

One command per scene. Each prints the state, the reason codes, the fee the pool actually
charged, the transaction hashes, and the things that scene may **not** be used to claim.

```bash
node demo/tinjau-demo.mjs scene1     # rumour containment  → WATCH, fee stays at 500
node demo/tinjau-demo.mjs scene2     # bounded protection  → PROTECT (CONSTRUCTED market leg)
node demo/tinjau-demo.mjs scene3     # static vs volatility-only vs Tinjau
node demo/tinjau-demo.mjs all        # all three
```

Node 18+ and nothing else. No `npm install`, no credentials, no RPC — and that is checkable
rather than promised: before any scene code runs, `fetch`, `net`, `tls`, `dgram`, `dns`, `http`
and `https` are replaced with functions that throw. This is the fallback path when there is no
network at a venue.

```bash
node demo/tinjau-demo.mjs seal-selftest   # tries all five and fails if any escapes
```

Every fact the scenes print is read out of a committed artifact and pinned by sha256 in
[`t6-5-demo-manifest.json`](./docs/buildx-orion-2026/outputs/05-build/t6-5-demo-manifest.json),
which is the single factual manifest for the demo. `node demo/tinjau-demo.mjs check` re-derives
it and fails if it has drifted from the evidence.

Two live checks, both read-only and neither needing a credential:

```bash
node demo/tinjau-demo.mjs chain-verify    # bytecode at every published address, one pinned block
node tools/risk-reader/tinjau-risk-read.mjs \
  --rpc-url https://testrpc.xlayer.tech --chain-id 1952 \
  --registry 0x1a1e17306f789f5Ec7012B1E2CB866DeDB61E2b1 \
  --asset    0xf07A9D89848bc694c7154Fda4cce707Eb409F903 \
  --pool-id  0x3b3942b682bd59383474974127140a3f0b0c2dff946b8164341c4812985a4a8c
```

Expect 3–60 s each: the public X Layer RPC is slow and its latency varies widely between runs.
`chain-verify` reads every address from
[`deployed-addresses.json`](./docs/buildx-orion-2026/outputs/05-build/frontend-handoff/deployed-addresses.json)
at run time, so it stays correct when that list changes; the three values written out above are
copied from it for convenience and **must be re-copied after T7.2 finalises the list**. They are
**T4.2 working addresses, not final**.

Both commands answer the stale-read problem in §6 rather than ignoring it: `chain-verify` reads
the height twice, reports it if it goes backwards, and pins every call to one block.

### 4.2 Enforcement, on a public testnet

X Layer Testnet (chain 1952), **builder-controlled** pool with freely-mintable mock tokens. Every
fee below is decoded from PoolManager's own `Swap` event — what the pool charged, not what a view
function returned.

| Scene | State | Fees actually charged |
|---|---|---|
| A — rumour containment | `WATCH` | **500** |
| B — protect → decay → recover → cooldown | `PROTECT` | **20,000 → 9,470 → 500 → 500** |
| F — action refused by a guardian pause | `PROTECT` (refused) | **500** |

Protection ended with no keeper and no transaction; only time passed. Immediate re-arming was
refused on chain by the contract (`CooldownActive`). The failed action in scene F is recorded as
failed and claims no benefit.

**Scene B's market leg is CONSTRUCTED** — see §5. Addresses are **T4.2 working addresses, not
final**; T7.2 owns the authoritative list. Transaction hashes and decoded events:
[`docs/.../05-build/t4-demo-manifest-xlayer-testnet.json`](./docs/buildx-orion-2026/outputs/05-build/t4-demo-manifest-xlayer-testnet.json).

### 4.3 A risk record any stranger can read

`tools/risk-reader/` reads the registry over ordinary JSON-RPC with zero npm dependencies, its own
hand-transcribed ABI, and no import from this project's server code. It prints stored and effective
state **separately** and reconciles them, so an expired `PROTECT` renders as
`*** DIVERGE — stored PROTECT, effective NORMAL ***` rather than as a live protection. Degraded
paths refuse rather than guess, each with its own exit code. Proven by a real run against local
Anvil: 59 passed / 0 failed, and against the deployed X Layer Testnet registry with the command in
§4.1.

It is a **reference consumer, built by Tinjau**. It is not evidence of external adoption.

### 4.4 The three-policy benchmark

Method frozen 2026-08-20, before any policy was implemented and before any outcome was computed
([`t0-4-benchmark-preregistration.md`](./docs/buildx-orion-2026/outputs/04-planning/t0-4-benchmark-preregistration.md)).
Four scenarios frozen from one real NVDA timeline, including a false-rumour case and a neutral
control, selected without inspecting any price path. All three policies score an identical replay
input, verified by a sha256 fingerprint on every row.

Reproduce (after one `pnpm install` in `apps/server`, see §8):

```bash
cd apps/server
npx tsx src/benchmark/emit.ts             # rewrites three-policy-benchmark.json byte-identically
npx tsx --test 'test/benchmark*.test.ts'  # 81 tests
```

Determinism is the point, so check it rather than take it: hash the output, run the emitter
again, hash it again. The two must match.

```bash
shasum -a 256 docs/buildx-orion-2026/outputs/05-build/three-policy-benchmark.json
```

## 5. The result, including the part that failed

**Tinjau never promotes to `PROTECT` on any of the four frozen replay scenarios, at any threshold
in the sensitivity grid.** Its fee stays at the base fee throughout every window, so its replayed
economics are **identical to the do-nothing static policy, not better than it**.
**`canClaimLossAvoided` is `false`** — "beats" means strictly greater, and a tie is not a win.

**On markout, the benchmark cannot determine which policy did better.** All 27 comparable cells
flip from `TINJAU_BEATS` to `TINJAU_LOSES` between the pre-registered metric and a post-hoc
consistent-fee-basis metric, on identical trades. Neither basis is clean: the first debits a
counterfactual fee it never credits, mechanically penalising any fee-raising policy; the second
credits counterfactual fee revenue assuming zero flow elasticity, mechanically rewarding one. The
benchmark brackets the answer and **the bracket spans the sign**. Both bases are published; the
post-hoc one is structurally excluded from the claim gate.

**The showcase event does not confirm.** Scenario B — a real 8-K with a bonded, hash-pinned primary
document — resolves to `WATCH` on canonical mainnet data, because its 235 bps drawdown retains only
13% after five minutes. The pool dipped and bounced. Measuring drawdown post-anchor only, the
correction that would have *favoured* it, gives 101 bps — half the floor. It gets weaker, not
stronger, so the verdict stands unrescued.

**What the benchmark can determine is behavioural, and this is what Tinjau claims.** The
volatility-only baseline fires on the **neutral control** — a routine insider Form 4, pre-registered
`NORMAL` — at every `k` in {2, 3, 5}. That is a false positive at every point in the grid. Tinjau
declines the same window **twice**: once on materiality, once on persistence. It arrives from the
control rather than from the showcase, which is what makes it credible.

The claim this project makes, in one sentence:

> Tinjau declined to act on two large price moves because neither had a qualifying cause, and one
> of them a volatility-only policy would have traded on.

**That is a finding about restraint. It is not a demonstration of protection**, and no artifact
here presents it as one.

Full numbers, all 72 comparison cells, distributions and tail concentration:
[`three-policy-benchmark.md`](./docs/buildx-orion-2026/outputs/05-build/three-policy-benchmark.md) /
[`.json`](./docs/buildx-orion-2026/outputs/05-build/three-policy-benchmark.json).
Proof of Protection record:
[`t5-5-proof-of-protection.md`](./docs/buildx-orion-2026/outputs/05-build/t5-5-proof-of-protection.md) /
[`proof-of-protection.json`](./docs/buildx-orion-2026/outputs/05-build/proof-of-protection.json).

## 6. Why X Layer

The Solidity is portable; X Layer is EVM-compatible and this project does not pretend otherwise.
The contribution is the operating loop, which is specific to this environment:

- tokenized-stock assets and wrapper semantics live on X Layer (wNVDAx, `0xa8ddb5…50d5`, chain 196);
- OKX index and reference-market context is the natural second confirmation leg;
- X Layer pool prices, flow, liquidity and executable exit depth are the market evidence;
- low-cost settlement makes an on-chain risk record and a bounded action affordable per event;
- the record is readable by any pool, wallet, market maker, or agent, not only by this dashboard;
- an Exchange OS adapter is **roadmap**, not built, until its production interface and access are
  verified.

One measured X Layer-specific finding worth carrying: **the public RPC serves stale reads.** A
confirmed `postAssessment` whose own event decoded to `PROTECT` was immediately followed by
`currentRecord()` returning the previous `WATCH` record, with measured convergence lag of
**2,519–2,746 ms** per write. For a risk registry that is the dangerous direction — a naive
consumer can read `NORMAL` while a `PROTECT` is live. Consumers must pin reads to a block or follow
`AssessmentPosted` rather than polling. A local devnet could never have surfaced this.

## 7. Repository map

| Path | What is in it |
|---|---|
| `apps/server/src/evidence/` | claim normalization, Evidence Graph, entity/asset resolution |
| `apps/server/src/market/` | OKX reference, X Layer pool telemetry, confirmation engine |
| `apps/server/src/risk/` | deterministic `NORMAL/WATCH/PROTECT` promotion, cross-language reason codes |
| `apps/server/src/decision/` | decision orchestrator, EIP-712 signing, scenario runner |
| `apps/server/src/benchmark/` | static, volatility-only, and Tinjau replay arms; markout; emitter |
| `apps/server/src/chain/` | the on-chain harness: post, read back, swap, decode, scene runner |
| `apps/server/scenarios/` | the four immutable frozen scenarios and the frozen benchmark method |
| `contracts/src/Tinjau*.sol` | risk types, bounded fee policy, registry, v4 fee hook |
| `contracts/src/Afterhours*.sol` | **historical** deployed prototype, kept unrenamed as evidence |
| `demo/tinjau-demo.mjs` | the three-scene demo driver — offline, zero dependencies |
| `tools/risk-reader/` | dependency-free reference consumer for the risk record |
| `apps/web/` | the public application (frontend lane) |
| `docs/buildx-orion-2026/outputs/` | planning, method, and build evidence |

## 8. Running it

### 8.1 What you need, and what each step needs it for

| Step | Needs | Time |
|---|---|---|
| the three-scene demo, the risk reader, the handoff validator | **Node 18+**, nothing else | seconds |
| server tests, typecheck, benchmark | Node 18+ and **pnpm**, plus one `pnpm install` | ~35 s total |
| contract tests, the reference-consumer end-to-end run | **Foundry** (`forge`, `anvil`, `cast`) | ~40 s first build, then seconds |
| the live read-only checks | internet, no credentials | 3–60 s each, RPC-dependent |
| regenerating the on-chain evidence | funded X Layer Testnet keys — **builder only** | minutes |

Nothing in the first three rows touches the network or needs a credential.

### 8.2 The commands

```bash
# 1. the demo, with the network sealed shut. Start here.
node demo/tinjau-demo.mjs all

# 2. server: pipeline, evidence, market, risk, decision, benchmark, chain harness
cd apps/server && pnpm install && pnpm test && pnpm typecheck

# 3. the benchmark, rewritten byte-identically from committed fixtures
cd apps/server && npx tsx src/benchmark/emit.ts

# 4. the frontend handoff artifacts, validated against their published schemas
node docs/buildx-orion-2026/outputs/05-build/frontend-handoff/tools/validate.mjs

# 5. contracts — see 8.3 first if this directory is not present
cd contracts && forge test

# 6. the reference consumer, against a local Anvil it starts itself
bash tools/risk-reader/test/anvil-e2e.sh
```

Steps 1–4 need no network access, no credentials and no deploy. Every input to the benchmark and
to the Proof of Protection record is a committed fixture.

### 8.3 The contracts are a separate Foundry repository

`contracts/` is deliberately excluded from this repository's history (see the root `.gitignore`):
Foundry manages `lib/` as git submodules of the contracts repo, and nesting that inside this one
was rejected. It therefore ships as its own repository, and the link belongs here — if this
sentence still has no link beside it, that repository has not been published yet and steps 5 and 6
cannot be run from a clone of this one.

That means **steps 5 and 6 above require the contracts repository to be checked out at
`contracts/` alongside `apps/`**, and its dependencies installed:

```bash
cd contracts && forge install && forge build
```

Steps 1–4 do not depend on it. If `contracts/` is missing, everything except the contract tests
and the Anvil end-to-end run still works, because the demo and the benchmark read committed
evidence rather than re-executing the chain.

### 8.4 What a judge can verify without any of the above

The three demo scenes (§4.1), the bytecode check and the registry read are enough to confirm the
state machine, the fee actually charged, the recorded transactions, and the published claim
boundary. Everything else is reproduction of work already recorded.

## 9. Limitations — read before quoting anything above

1. **Nothing here is production.** The testnet pool is builder-controlled with valueless mock
   tokens. Published addresses are T4.2 working addresses, not final.
2. **The observed `PROTECT` has a constructed market leg.** The evidence is real; the price path
   is not. The canonical replay of the same event resolves to `WATCH`.
3. **No dual OKX/X Layer confirmation for any replayed scenario.** No committed OKX index data
   covers any of the four anchors, so the OKX leg is `UNAVAILABLE` for all of them, and the X Layer
   pool leg carries confirmation alone.
4. **Executable exit depth is a lower bound**, and the pool is extraordinarily thin. Exit-depth
   figures are not representative of a liquid market.
5. **The rumour fixture is `SIMULATED`**, not a real post. Containment is provable; live social
   discovery, coverage and latency are not.
6. **News and social intake use immutable replay fixtures** (SVC-007 / SVC-008). This proves
   pipeline logic and safety, not live discovery, coverage, or real-time latency.
7. **The benchmark re-prices identical observed trades** under different fee schedules. Fee revenue
   is overstated for fee-raising policies and adverse selection understated; the net sign is
   undetermined. These results may not be described as conservative.
8. **Three economic scenarios, one asset, one pool, a market weeks old.** Nothing here generalises
   to tokenized equities as a class.
9. **The public `tinjau.xyz/api/scoreboard` is stale** and serves an unlabelled synthetic test
   filing. The provenance fix exists in code and is tested but is not deployed. Do not cite or
   screenshot that endpoint.
10. **Speculation detection and independence derivation are curated heuristics**, not models. Both
    are deployed only in the direction where being wrong is conservative.

## 10. Claims this project does not make

Prior art occupies every individual component (§2), so none of the following is claimed anywhere in
this repository: first AI dynamic-fee hook; first multi-agent corporate-action oracle; first
on-chain risk registry; first CEX/DEX risk agent; first self-protecting pool; production adoption,
protected TVL, customers, or revenue; a live Exchange OS integration; "production-ready" from a
builder-controlled test pool; external adoption inferred from a reference consumer this project
built itself.

Names such as `AfterhoursFeeHook` are genuine deployed identifiers from the historical prototype
and are kept unchanged, because renaming them would falsify provenance.
