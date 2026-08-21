# Tinjau submission evidence pack (T7.5)

- Workspace: `buildx-orion-2026`
- Prepared: 2026-08-21, by the non-frontend agent
- Deadline: **2026-08-21 23:59 UTC**
- Google Form: <https://docs.google.com/forms/d/e/1FAIpQLSfgU_3zcXdxK0GJQxj33QeUWdEcAaYnieVe9p5cFDb2JFQa4Q/viewform>

**Submitting is HUMAN-ONLY.** Nothing in this file has been posted, sent, or submitted. This is a
paste sheet. Dien fills the form.

- Refreshed: **2026-08-21**, after the site restructure. Every route and status below was
  re-checked against the live site at that time, not carried over.

Every command in §5 and §9 was executed on 2026-08-21 and its real output is quoted. Nothing here
is predicted.

---

## 0. Read this before you paste anything

One item is still outstanding and it is on Dien, not on the build.

### 0.1 The GitHub repository is public now (RESOLVED)

`https://github.com/k3cs/Tinjau` returns **HTTP 200 to an anonymous visitor**, verified
2026-08-21. This was the one blocking item in the previous version of this pack, when the
repository was private and a judge clicking the GitHub field would have seen a 404. It is fixed.

### 0.2 The X post is the remaining hard requirement

The submission needs a post from the project X account that **mentions `@XLayerOfficial`**, and
the post URL is a form field. It does not exist yet. A claim-safe draft is in §1.1. The agent may
not post it.

Two form fields also need Dien: **Email** and **Telegram**.

### 0.3 The live registry holds an expired `PROTECT`, and that is fine to show

The production-envelope registry `0x6006...7317` holds a `PROTECT` record written by transaction
`0xba5a7b99f807e5c5d60fdaedbd8c90657fdde22d3a4641f765225479f01b2b5b` (block 38825964,
2026-08-21T04:00:01Z). Its `assessedAt` and `expiresAt` are exactly 21,600 seconds apart and it
has now lapsed by wall clock, so **deterministic recovery on the full production envelope is
observable on a public chain**: the reference reader prints `stored PROTECT, effective NORMAL`
with the fee back at 500, and no keeper transaction ended it.

**The hazard, if a judge reads the raw record:** on chain it says `state PROTECT`, `dataMode
REPLAY`, `marketConfirmation CONFIRMED`. The on-chain schema has no field for "evidence replayed,
market leg constructed", so read alone it looks like a confirmed replay result. **It is not.** The
canonical replay of that event resolves to `WATCH`. This is documented in the deployment record
and stated on `/risk` next to the figure it produced.

---

## 1. Form fields, ready to paste

| Form field | Value |
|---|---|
| Project name | `Tinjau` |
| Description | see §2 (two lengths) |
| Project URL | `https://tinjau.xyz` (verified HTTP 200) |
| GitHub | `https://github.com/k3cs/Tinjau` (verified public, HTTP 200) |
| Email | `[DIEN MUST SUPPLY]` |
| Telegram | `[DIEN MUST SUPPLY]` (a group or a personal handle; the form requires one) |
| X handle | `@tinjauAI` |
| X post URL | `[DIEN MUST SUPPLY]` (the post must exist first, see §1.1) |
| Telegram | `[DIEN MUST SUPPLY]` |

Verified live 2026-08-21, after the restructure:

```
tinjau.xyz            -> 200
tinjau.xyz/api/scoreboard -> 200
x.com/tinjauAI        -> 200
github k3cs/Tinjau    -> 200
```

**All nine public pages resolve.** The site was reorganised around the seven published judging
criteria, so the route list has changed since the previous version of this pack:

| Route | What it is for | Criterion it speaks to |
|---|---|---|
| `/` | The problem, the vocabulary, the honest result | orientation |
| `/why-it-matters` | 32 real filings on 10 real X Layer pools | user value, growth potential |
| `/risk` | What the model does and never does, then two worked cases | application of AI, innovation |
| `/proof` | Deployment ledger, the three-policy benchmark, the claim gate | product completeness |
| `/x-layer` | What is read from the chain, deployed onto it, and given back | integration, ecosystem |
| `/roadmap` | What runs, what is built but unwired, what is not built | product completeness |
| `/faq` | The seven criteria answered, plus the awkward questions | all seven |
| `/developers` | Commands a judge can run against the deployed registry | product completeness |
| `/demo` | Three-scene guided walkthrough | orientation |

`/compare` no longer exists as a page: its benchmark content moved into `/proof` and the old URL
**308-redirects** there, so any link already published still lands correctly.

### 1.1 The X post is a hard requirement and does not exist yet

`HACKATHON.md` line 74 records the rule: the submission needs a post from the project X account
that **mentions `@XLayerOfficial`**, and the post URL is a form field. `[DIEN MUST SUPPLY]`.

Optional draft, claim-safe, for Dien to edit and post himself. The agent may not post it.

> Tinjau is a corporate-event-aware risk guard for tokenized-stock liquidity on X Layer.
>
> It reads the filing behind a price move, checks what the pool actually did, and only then allows
> a capped, temporary fee that expires on a timer. The risk record lives on X Layer Testnet and
> anyone can read it.
>
> We also published the result that went against us: on our four frozen replay scenarios Tinjau
> ties a do-nothing static fee rather than beating it. What it does prove is restraint, a
> volatility-only policy fires a false positive on our neutral control and Tinjau declines it.
>
> Built on @XLayerOfficial. Code and every artifact: github.com/k3cs/Tinjau

---

## 2. Project description, ready to paste

Plain language. No jargon left unexplained. Both versions are consistent with the project's published claim boundary.

### 2.1 Short version (54 words)

> Tinjau is a risk guard for pools holding tokenized US stocks on X Layer. It reads the company
> filing or news behind a price move, checks what the pool itself did, and only then allows a
> capped, temporary fee rise that expires on a timer. Every decision is written on chain, readable
> by anyone.

### 2.2 Long version (166 words)

> Tokenized US stocks trade on-chain around the clock, but the news that decides what they are
> worth arrives in bursts. A liquidity provider can be picked off in the gap.
>
> Tinjau is a risk guard for those pools on X Layer. It reads the primary source behind a price
> move (an SEC filing, a news article, a rumor), keeps the link and a hash of the original
> document, and checks independently whether the pool's own market data agrees. Only then may it
> raise the pool fee, and only inside a fixed ceiling and a fixed clock that returns the fee to
> normal with no keeper and no transaction. A rumor can raise attention but can never authorize the
> aggressive fee.
>
> We measured it against a static fee and a volatility-only fee on frozen replays and published the
> result even though it went against us: Tinjau ties the static policy. What it demonstrably does
> is decline to act when a large price move has no qualifying cause.

### 2.3 The one positioning sentence that is safe to reuse

> No complete public product with the exact reviewed combination of source-grounded
> tokenized-equity evidence, rumor containment, OKX/X Layer confirmation, bounded LP action,
> deterministic recovery, and measured three-policy outcome was found.

"Not found" means not found in the public documentation reviewed on 2026-08-20. It is not evidence
that no such system exists.

---

## 3. Authoritative X Layer Testnet addresses

Source: `docs/buildx-orion-2026/outputs/05-build/t7-2-authoritative-addresses.json`.
Every `codeSize` below was **re-measured live** with `eth_getCode` at block **38849130** on
2026-08-21 and matched the file exactly (§9.3 has the raw output).

- Chain id: **1952** (X Layer Testnet)
- RPC: `https://testrpc.xlayer.tech`
- Explorer: `https://web3.okx.com/explorer/x-layer-testnet`

### 3.1 Which stack judges should read

**Read the production-envelope stack.** It carries the real bounded-action envelope: base fee 500
pips (0.05%), maximum fee 20,000 pips (2%), held fully widened for 3,600 s, then 18,000 s of linear
decay, a hard cap of 21,600 s on any one protection, and a 3,600 s cooldown before protection may
re-arm.

| Role | Address | Bytecode size |
|---|---|---|
| `TinjauRiskRegistry` | `0x60062389a7AB08F0030FC06Adf9CE0C180537317` | 6,337 |
| `TinjauFeeHook` (Uniswap v4 hook) | `0x1092C9fe2dB084F26aa415A0fda14B001A786080` | 6,160 |
| `PoolManager` (Uniswap v4) | `0x8F862A8b6f00C99b0610dc764228C661c4909ae1` | 17,151 |
| swap router (test) | `0xe5823a180BFAcbC24Aa9a744B76f3Dfb8bbECDA9` | 5,035 |
| liquidity router (test) | `0x1324A9A175779D53c65F9A43493CEa302cd54587` | 4,533 |
| MOCK wNVDAx (risk asset) | `0xf07A9D89848bc694c7154Fda4cce707Eb409F903` | 1,737 |
| MOCK USDG (quote asset) | `0x666e81CCb9D4d6c2e7A3ed9f317E3dFBa2410e99` | 1,737 |

Pool id `0x5e9eff19074225e9132eb73dc25cf0e3ff55c3fb31c9b28ab633851d2b54f730`, tick spacing 60.

Source verification for the two Tinjau contracts: verdict `IDENTICAL`, 0 body differences. The two
routers were not compared (they are third-party test routers deployed unchanged from v4-core).

### 3.2 Why a second stack exists

X Layer Testnet exposes no `evm_increaseTime`, the RPC method that fast-forwards a chain's clock.
Without it, the production envelope's 21,600 s (6 hour) recovery cannot be watched inside a demo.
So a second full stack was deployed with the same envelope shape compressed 60x, preserving both
invariants (`cap == widen + decay` and `cooldown == widen`).

Demo envelope: base 500, max 20,000, widen 60 s, decay 300 s, cap 360 s, cooldown 60 s.

| Role | Address | Bytecode size |
|---|---|---|
| `TinjauRiskRegistry` | `0x1a1e17306f789f5Ec7012B1E2CB866DeDB61E2b1` | 6,337 |
| `TinjauFeeHook` | `0xAb448f70fE44fbbF5f41225F7797fcC7e56c2080` | 6,160 |
| `PoolManager` (shared with the production stack) | `0x8F862A8b6f00C99b0610dc764228C661c4909ae1` | 17,151 |
| swap router (test) | `0xE76D6fC0A5235155eEb60FbBA8623465520E19dC` | 5,035 |
| liquidity router (test) | `0xefEC4A304eeaA95581B2018b50472D762eE0833c` | 4,533 |
| MOCK wNVDAx (shared) | `0xf07A9D89848bc694c7154Fda4cce707Eb409F903` | 1,737 |
| MOCK USDG (shared) | `0x666e81CCb9D4d6c2e7A3ed9f317E3dFBa2410e99` | 1,737 |

Pool id `0x3b3942b682bd59383474974127140a3f0b0c2dff946b8164341c4812985a4a8c`.

Any figure shown from this stack must be labelled **demo timings**. The helper that advances time
refuses loudly rather than faking a decay curve, so three swaps at one instant can never be
presented as a recovery.

### 3.3 Both pools are builder-controlled

Both pools are builder-controlled test liquidity in freely-mintable mock tokens that have no value.
They demonstrate that the enforcement path works. **They are not markets, and no number measured on
them is a market result.** The mock wNVDAx stands in for the real chain-196 token
`0xa8ddb5cd96b5222afe198316e9a57caa642850d5`, which this project did not deploy.

### 3.4 The public RPC serves stale reads

Measured convergence lag after a confirmed write: **2,519 to 2,746 ms**. The RPC is load-balanced,
so a read issued right after a write can be answered by a node at an older height, returning the
previous record. For a risk registry that is the dangerous direction (reading `NORMAL` while a
`PROTECT` is live). Consumers should pin reads to a block number or follow the `AssessmentPosted`
event rather than polling `currentRecord`.

---

## 4. Architecture, in words

Six stages. Each one can refuse, and a refusal is recorded with a machine-readable reason.

1. **Evidence intake.** An SEC EDGAR filing, a news article, or a social rumor enters as a claim
   carrying its source URL, publisher, publication time, and a sha256 over the primary document.
   Official filings additionally pass a three-way parse-agreement check before they count.
2. **Evidence Graph.** Claims are normalized, entities resolved, duplicates collapsed. Four outlets
   carrying one wire story count as **one** origin, not four. A source line that materially revised
   its own number inside the window may support attention but may not count as corroboration. A
   headline that says "according to a report" is excluded from the origin count entirely, because
   independence is exactly what it disclaimed.
3. **Asset resolution.** Company to token to pool. Four distinct failure outcomes, each with its own
   reason code, because "which of this company's tokens?", "this token has no pool", and "never
   heard of this company" send an operator to three different places.
4. **Market confirmation.** Rule `tinjau.confirm/2.0.0`. It scores drawdown, persistence, trade
   velocity, basis against the OKX reference index, executable exit depth, US market-hours context,
   and freshness. **Persistence is a necessary condition**: velocity or basis may corroborate a
   lasting price dislocation but can never substitute for one. Persistence is the median retention
   across the whole hold interval, not a single sampled instant.
5. **Risk state.** `NORMAL`, `WATCH`, or `PROTECT`, plus a confidence band and a bit set of reason
   codes. Rumor-only evidence is capped at `WATCH` by construction. Non-material evidence (a
   correctly-sourced filing that reports no corporate action) does not even raise a `WATCH`.
6. **Bounded on-chain action.** The state is signed by an assessor key (EIP-712), relayed by a
   separate poster key that pays gas, and written to `TinjauRiskRegistry` on X Layer Testnet. A
   Uniswap v4 hook reads that record and applies `TinjauRiskPolicy` to the fee the pool charges.
   Expiry and decay are applied at read time, so recovery needs no keeper and no transaction.

```
SEC filing / news / rumor
        |
        v
  Evidence Graph  ---- rumor-only ---> WATCH (aggressive fee stays unauthorized)
        |
        v
  Asset resolution  ---- unresolved ---> refuse, with the specific reason
        |
        v
  Market confirmation (X Layer pool + OKX reference index)
        |                              persistence is necessary, not optional
        v
  NORMAL / WATCH / PROTECT   + confidence band + reason bits
        |
        v
  EIP-712 assessment -> TinjauRiskRegistry (chain 1952)
        |
        v
  TinjauFeeHook -> TinjauRiskPolicy -> the fee PoolManager charges
        |
        v
  expiry and decay applied at read time -> back to base fee, no keeper
```

### The safety boundary, stated once

AI proposes. Deterministic code and the contract dispose. The AI parses ambiguous language,
resolves entities, groups duplicates and proposes structured evidence. Everything that can move
money is validated by code: the asset, the transition rules, the signature, the nonce, freshness,
expiry, the fee ceiling, the maximum duration, the cooldown, and the recovery.

A compromised assessor key **cannot express a fee at all** on the persisted path. `requestedFee` is
signed and bound into the EIP-712 hash but is never written into `RiskRecord`, which has no fee
field. All the assessor can express is a confidence band, and every band sits inside the envelope.

---

## 5. The three-scene demo path

One command per scene. Zero dependencies, no `npm install`, no credentials, Node 18 or newer.
All three were run on 2026-08-21 and the outputs below are real.

During scenes 1 to 3 the network is **sealed**: `fetch`, `net`, `tls`, `dgram`, `dns`, `http` and
`https` are replaced with functions that throw before any scene code runs. A successful run is
therefore proof that no third-party service was contacted.

### Scene 1: a rumor raises attention but cannot raise the fee

```bash
node demo/tinjau-demo.mjs scene1
```

Real output (extract):

```
    scenarioId                   A-rumor-watch
    state                        WATCH
    confidenceBand               LOW
    actionAuthorized             false
    feeChargedByThePool          500
    feeSource                    PoolManager Swap event
    claimCount                   5
    apparentOrigins              1
    usableOrigins                1
    marketConfirmation           UNAVAILABLE
    okxLeg                       UNAVAILABLE
    postAssessment tx            0x025ca92d8d477af734d3e7ce0e7465bf3afc0b1d511acf4fc184c5add1178671
    swap tx                      0xb801240c05b3477f6e2505ba51ee9b14e71fbc5527fbc6b0b15e142a8409cf4e
```

Five claims collapse to one usable origin, there is no official confirmation, and the pool charged
the base fee on a real swap. That last number is decoded from PoolManager's own `Swap` event, so it
is what the pool **charged**, not what a view function said.

Do not say: that the rumor is a real post (it is `SIMULATED`, `sourceUrl: null`), that four outlets
are four sources, or that the unavailable OKX leg is a second confirmation.

### Scene 2: confirmed evidence buys a bounded fee, and the clock takes it back

```bash
node demo/tinjau-demo.mjs scene2
```

The scene prints `*** CONSTRUCTED ***` above the state, by design. Real output (extract):

```
  *** CONSTRUCTED ***
  constructed: the market leg only
  canonical replay of the same event: WATCH

    state                        PROTECT
    confidenceBand               HIGH
    actionAuthorized             true
    requestedFee                 20000
    feeCurveChargedByThePool     [20000,9470,500,500]
    recoveryHadNoTransaction     true
    cooldownRefusedReArming      CooldownActive
    failedActionCase             {"induced":"guardian pause","error":"ProtectionPaused",
                                  "feeAfterFailure":500,"claimsNoBenefit":true}

    swap @1787284279  charged  20000  previewed  20000  0x2e313c44...df787
    swap @1787284497  charged   9470  previewed   9730  0x93ae1e24...e7bab
    swap @1787284653  charged    500  previewed    500  0xcf229e22...546b7c0
    swap @1787284660  charged    500  previewed    500  0xfdb242cb...6eb7ab0
```

What this proves: a signed assessment reached a deployed registry, a v4 hook read it, the pool
charged 20,000 pips, the fee decayed, and it returned to 500 with **no keeper transaction between
the swaps**. Immediate re-arming was refused on chain with `CooldownActive`. A guardian pause made
the action fail, and the failure is recorded as a failure that bought nothing.

What it does not prove: that this event confirmed. **Only the market leg is constructed, and the
canonical replay of the same 8-K resolves to `WATCH`.** These are the compressed demo timings, not
the production envelope. `previewFee` returned 9,730 where the pool charged 9,470 mid-decay, because
the fee is continuous in time and seconds pass between quote and inclusion, so a quoted fee is an
upper bound during decay rather than a promise.

### Scene 3: the same replay under three fee policies

```bash
node demo/tinjau-demo.mjs scene3
```

Real output (extract):

```
    rows                         28
    cells                        72
    comparableCells              27
    claimGate  {"field":"canClaimLossAvoided","value":false,...}
```

The sign flips with the metric. Both bases are published and neither is clean:

```
    vs VOLATILITY_ONLY, pre-registered basis : {"TINJAU_BEATS":27}
    vs VOLATILITY_ONLY, AMD-002 post-hoc     : {"TINJAU_LOSES":27}
    vs STATIC, both bases                    : {"TINJAU_TIES":27}
```

Behaviour on the neutral control (this is the part the demo may claim):

```
      VOLATILITY_ONLY  k=2   TRIGGERED, 2 trigger(s), FALSE_POSITIVE
      VOLATILITY_ONLY  k=3   TRIGGERED, 1 trigger(s), FALSE_POSITIVE
      VOLATILITY_ONLY  k=5   TRIGGERED, 1 trigger(s), FALSE_POSITIVE
      TINJAU  minDrawdownBps=150/200/300   NORMAL, 0 trigger(s), TRUE_NEGATIVE
```

The four label words above (`FALSE_POSITIVE`, `TRUE_NEGATIVE`) are verbatim from the tool; only the
separator before them was changed, to keep this document free of the em dash character.

Read §7 before quoting any of it.

### 5.1 Verify the manifest has not drifted

```bash
node demo/tinjau-demo.mjs check
```

Real output:

```
manifest is byte-identical to what the source artifacts produce now
sha256 be884920d860b0f4c92180670f52ae54400f4e5d77e25d95ae111b7221ee7196
```

Every number the scenes print is read out of a committed artifact, and every artifact is pinned by
sha256 in the manifest. The driver computes no results of its own.

### 5.2 Read the registry live, with no credentials

This is the judge-verifiable path. It needs internet and nothing else.

```bash
node tools/risk-reader/tinjau-risk-read.mjs \
  --rpc-url https://testrpc.xlayer.tech --chain-id 1952 \
  --registry 0x60062389a7AB08F0030FC06Adf9CE0C180537317 \
  --asset 0xf07A9D89848bc694c7154Fda4cce707Eb409F903 \
  --pool-id 0x5e9eff19074225e9132eb73dc25cf0e3ff55c3fb31c9b28ab633851d2b54f730
```

Real output at 2026-08-21T10:20:29Z (extract):

```
  schema version         tinjau.risk/1.0.0
  policy version         tinjau.policy/1.0.0
  base fee 500   max fee 20000
  widen 3600s   decay 18000s   cap 21600s   cooldown 3600s
  history entries        2
```

Stored record, from `currentRecord()`, storage verbatim:

```
  state                  PROTECT  (ordinal 2)
  data mode              REPLAY
  market confirmation    CONFIRMED
  assessed at            2026-08-21T03:59:57Z
  expires at             2026-08-21T09:59:57Z
```

Effective state, from `effectiveState()`, with expiry and the duration cap applied:

```
  state                  NORMAL  (ordinal 0)
  effective fee          500 (0.0500%)  == base fee, no widening in force
```

The tool then prints its own `STORED vs EFFECTIVE` banner announcing that the two diverge (stored
`PROTECT`, effective `NORMAL`).

Two things a judge can take from this, and one they must not.

- The record is independently readable by a stranger holding only the chain and the ABI. The reader
  is a zero-dependency Node script that imports nothing from the server.
- `assessedAt` to `expiresAt` is exactly 21,600 seconds, and the protection has now lapsed by wall
  clock with no transaction to end it. That is deterministic recovery on the **full production
  envelope**, observed on a public chain.
- **Not**: that this `PROTECT` was a confirmed replay result. The on-chain schema has no field for
  "evidence replayed, market leg constructed", so `dataMode: REPLAY` beside `CONFIRMED` overstates
  what happened. The canonical replay of that event resolves to `WATCH`. This write is also not
  recorded in any committed manifest (see §0.2 and §8.2).

The reader also demonstrates the mistake a naive consumer makes: calling `currentRecord()` and
acting on `PROTECT` would apply protection the registry no longer authorizes. Always read
`effectiveState()`.

---

## 6. Claim to artifact map

Every line is spot-checkable. `implemented` means the code path exists and is tested. `measured`
means a number was produced by running it. `replayed` means it ran against an immutable historical
fixture. `simulated` means the input was written by this project. `roadmap` means not built.

### 6.1 On-chain enforcement

| Claim | Label | Proof |
|---|---|---|
| A signed assessment reached a deployed registry and a v4 hook made the pool charge 20,000 pips | measured, on chain 1952 | tx `0x2e313c44…df787`; fee decoded from PoolManager's `Swap` event |
| The fee decayed and returned to 500 with no keeper and no transaction | measured, on chain 1952, demo envelope | txs `0x93ae1e24…e7bab` (9,470) then `0xcf229e22…546b7c0` (500) |
| A full 21,600 s production-envelope protection expired by wall clock | measured, on chain 1952 | tx `0xba5a7b99…1b2b5b`; live `effectiveState()` read in §5.2 |
| Immediate re-arming is refused by the contract | measured | `CooldownActive(1787284659, 60)` in `t4-demo-manifest-xlayer-testnet.json` |
| A failed action is recorded as failed and claims no benefit | measured | scene F: guardian pause, `ProtectionPaused`, measured fee afterwards 500 |
| Production timings behave identically off chain | implemented + tested | `forge test` **137 passed / 0 failed** (verified 2026-08-21) |
| Bytecode exists at every published address | measured | live `eth_getCode` at block 38849130, §9.3 |
| The risk record is readable by a stranger with only the chain and the ABI | implemented | `tools/risk-reader/`; §5.2 above, and `anvil-e2e.sh` 59 passed / 0 failed |

### 6.2 Evidence and risk logic

| Claim | Label | Proof |
|---|---|---|
| Rumor-only input can never reach the aggressive fee path | implemented, proven in both languages | `apps/server/test/riskPromotion*.test.ts`; `contracts/test/` |
| Syndications of one wire story count as one origin | implemented | `apps/server/src/evidence/graph.ts`; `evidenceGraph.test.ts` |
| A self-revising source line may support attention but not corroboration | implemented, load-bearing | `apps/server/src/risk/promote.ts`; a test proves removing the rule flips scenario C to `PROTECT` |
| A correctly-sourced but non-material filing does not even raise a `WATCH` | implemented | materiality axis in `promote.ts`; reason `REASON_NON_MATERIAL_EVENT` |
| Persistence is necessary for any `CONFIRMED`, and is a median over the hold interval | implemented | rule `tinjau.confirm/2.0.0`; `t3-4-degraded-cases.md`; `marketDegraded.test.ts` |
| A compromised assessor cannot express a fee on the persisted path | implemented | `RiskRecord` has no fee field; `TinjauRiskRegistry.sol:366` |
| The whole server pipeline passes | measured | `pnpm test` in `apps/server`: **594 tests, 594 pass, 0 fail** (verified 2026-08-21) |

### 6.3 The measured comparison

| Claim | Label | Proof |
|---|---|---|
| Tinjau never reaches `PROTECT` on any of the four frozen scenarios, at any threshold in the grid | measured, replayed | `three-policy-benchmark.json` `headlineFindings`; scene 3 output |
| `canClaimLossAvoided` is `false` | measured | `three-policy-benchmark.json` `claimGate`; `proof-of-protection.json` `claimGate` agrees |
| All 27 comparable cells flip sign between the two metric bases | measured | `three-policy-benchmark.md`; `benchmarkComparison.test.ts` |
| A volatility-only policy fires a false positive on the neutral control at k = 2, 3 and 5 | measured | `three-policy-benchmark.json`; scene 3 output |
| Tinjau declines that same window twice, on materiality and on persistence | measured | `three-policy-benchmark.md` §4.3 |
| The neutral control moved **more** than the material event (241 bps vs 235 bps) | measured | `apps/server/src/market/poolTelemetry.ts` measurements; deviations log |
| The method was frozen before any result existed | procedural | `t0-4-benchmark-preregistration.md` (2026-08-20); `scenarios/benchmark-preregistration.json` |
| Amendment AMD-002 is post-hoc and is structurally barred from opening the claim gate | procedural | deviations log, AMD-002; a test doctors the post-hoc cells into wins and asserts the gate still returns `false` |

### 6.4 X Layer relevance

| Element | Label | Note |
|---|---|---|
| Tokenized-stock assets and wrapper semantics | implemented | wNVDAx `0xa8ddb5…50d5` on chain 196, with a real third-party reference pool |
| OKX reference-index context as a confirmation leg | implemented as an input | **`UNAVAILABLE` for all four frozen anchors** |
| Pool price, flow, liquidity, executable exit depth | implemented | exit depth is a lower bound (see §7) |
| Low-cost on-chain risk settlement and bounded action | implemented on testnet | authoritative addresses in §3 |
| A reusable risk record other X Layer applications can read | implemented | proven by the reference consumer, which this project built (not external adoption) |
| Exchange OS adapter | **roadmap** | no production interface or access verified |

The Solidity is portable and this project does not pretend otherwise. X Layer is EVM-compatible. The
contribution is the operating loop in this environment, not an impossible-to-port contract.

---

## 7. Limitations, stated plainly

Read this before quoting anything above. None of it is buried elsewhere.

1. **Tinjau ties, it does not win.** On the four frozen replay scenarios Tinjau never reaches
   `PROTECT`, so its fee stays at base and its replayed economics are **identical to a do-nothing
   static fee**. `canClaimLossAvoided` is `false`. **No surface may claim Tinjau reduces LP loss.**
2. **On markout the benchmark cannot pick a winner.** All 27 comparable cells flip from
   `TINJAU_BEATS` to `TINJAU_LOSES` between the two metric bases, on identical trades. The
   pre-registered metric debits a counterfactual fee it never credits, which mechanically penalizes
   any fee-raising policy. The post-hoc AMD-002 metric credits counterfactual fee revenue assuming
   nobody would have been deterred by the higher fee, which mechanically rewards one. Both are
   published, AMD-002 is labelled post-hoc, and **no winner is declared**.
3. **The showcase event does not confirm.** Scenario B is a real 8-K about a material $105bn
   announcement with a hash-pinned primary document, and it resolves to `WATCH` on canonical data:
   its 235 bps drawdown retained only 13% after five minutes. The pool dipped and bounced.
   Re-measuring in the direction that would have favoured it gives 101 bps, half the floor, so the
   verdict gets weaker rather than stronger.
4. **The only `PROTECT` sits on a builder-controlled testnet pool with a constructed market leg.**
   The evidence is real and replayed; the price path is not. The canonical replay of the same event
   is `WATCH`.
5. **No dual OKX/X Layer confirmation exists.** No committed OKX index data covers any of the four
   frozen anchors, so the OKX leg is `UNAVAILABLE` for all four and the X Layer pool leg carries
   confirmation alone. A test fails if that data is ever backfilled, so the limitation cannot
   quietly stop being true.
6. **No live news or social monitoring.** News and social intake are immutable, source-linked replay
   fixtures. The social rumor is `SIMULATED`, written by this project, with `sourceUrl: null` and a
   `simulated://` identifier, because no byte-pinnable public post exists for that moment. The news
   chain beside it is real and source-linked. Containment is provable; live discovery, coverage and
   latency are not.
7. **The pool is extraordinarily thin and exit depth is a lower bound.** Only **0.53 to 2.29
   wNVDAx (roughly $120 to $517)** is provably quotable within one tick range across the four
   windows. Liquidity only changes at initialized ticks, which a swap log does not reveal, so the
   figure under-states depth and therefore over-states risk. Never present this as a liquid market.
8. **Three economic scenarios, one asset, one pool, a market weeks old.** The reference pool has
   had bytecode only since 2026-07-22. Nothing here generalizes to tokenized equities as a class.
9. **The benchmark re-prices identical observed trades under different fee schedules**, which
   embeds the false assumption that a higher fee would have deterred nobody. Fee revenue is
   overstated for fee-raising policies and adverse selection understated. The two biases oppose each
   other and the net sign is undetermined, so **these results may not be described as conservative**.
10. **The public X Layer RPC is flaky and serves stale reads.** 1,088 calls across four fixture
    captures needed 76 retries (about 7%). Post-write read lag measured at 2,519 to 2,746 ms.
11. **Testnet key hygiene is disclosed, not clean.** No independent assessor key existed, so the
    assessor was derived from the poster key, and the guardian is the same key as the poster because
    pausing needs gas. Testnet only. A derived key shares the fate of its parent, so production
    requires an independently generated assessor key. Local Anvil runs use four distinct keys, so
    role separation is genuinely demonstrated there.
12. **Speculation detection and independence derivation are curated heuristics, not models.** Both
    are deployed only in the direction where being wrong is the conservative direction.

### 7.1 Claims this project does not make

Prior art occupies every individual component (Chainlink on corporate actions, RavenPack-class news
intelligence, RiskClaw / NeuralHook / Sentinel Agent / UniBrain / AnchorHookV4 on AI-driven v4 fee
control, Hypernative and Chaos Labs on automated on-chain risk response, Argus on RWA position
protection). So none of the following appears anywhere:

- any "first" claim (first AI dynamic-fee hook, first corporate-action oracle, first on-chain risk
  registry, first CEX/DEX risk agent, first self-protecting pool);
- "production-ready", inferred from a builder-controlled test pool;
- adoption, protected TVL, customers, or revenue;
- a live OKX Exchange OS integration;
- external adoption inferred from a reference consumer this project built itself.

Identifiers such as `AfterhoursFeeHook` are genuine deployed names from the earlier prototype and
are kept unchanged, because renaming them would falsify provenance.

---

## 8. Errors found in existing judge-facing artifacts

Reported when this pack was first written, when the affected files belonged to other lanes.
**All five are now fixed**, and the status of each is recorded inline below so a reader can see
what changed rather than finding a rewritten history.

### 8.1 A wrong transaction hash in the deployment record — FIXED

**Status: corrected 2026-08-21.** The field now holds the verified hash, and the correction is
recorded in the file itself rather than applied silently.

The file lists, under `stacks.production-envelope.demoTransactions`:

```
"sceneA_post": "0x69c11cf4115037431bb1330cf7cd3bd32f3339b0aee2aa392a3b86ac0a96922c"
```

That transaction was sent to `0x1a1e17306f789f5ec7012b1e2cb866dedb61e2b1`, which is the
**demo-envelope** registry, not the production-envelope registry. Verified by
`eth_getTransactionByHash`:

```
0x025ca92d...  to: 0x60062389a7ab08f0030fc06adf9ce0c180537317  block 38825918   <- production
0x69c11cf4...  to: 0x1a1e17306f789f5ec7012b1e2cb866dedb61e2b1  block 38825425   <- demo
```

The correct production-envelope Scene A post is
`0x025ca92d8d477af734d3e7ce0e7465bf3afc0b1d511acf4fc184c5add1178671`, which is what
`deployed-addresses.json` and the demo driver both use. **This pack uses the correct hash.** The
error is in a file whose name says "authoritative", so it is worth correcting even though nothing
downstream depends on it.

### 8.2 An undocumented on-chain write — DOCUMENTED

**Status: recorded 2026-08-21** in the deployment record, with both what it proves (deterministic
recovery on the full production envelope, on a public chain) and what it does not.

Transaction `0xba5a7b99f807e5c5d60fdaedbd8c90657fdde22d3a4641f765225479f01b2b5b` posted a `PROTECT`
assessment to the production-envelope registry at 2026-08-21T04:00:01Z, about 22 seconds after the
Scene F unpause. Neither the hash nor its evidence commitment `0x32f397d9…78cbe` appears anywhere
in `docs/` or `apps/server/`. The production-envelope manifest was generated at 03:59:40Z, before
this write, and its stated scope is "Scenes A and F only".

Documented in §5.2 with its caveat. It should be added to the T7.2 record.

### 8.3 Two stale statements in `README.md` — FIXED

**Status: corrected 2026-08-21.** Both statements now match what the endpoint and the address
list actually do.

Both err on the safe side (they under-claim) but are now factually wrong:

- Item 9 says the public `tinjau.xyz/api/scoreboard` "is stale and serves an unlabelled synthetic
  test filing. Do not cite or screenshot that endpoint." Verified live 2026-08-21: the endpoint
  returns HTTP 200 with a `_READ_THIS_FIRST` banner, `dataMode: REPLAY`,
  `canClaimLossAvoided: false`, and a per-entry `provenance` object (`sourceClass: NEWS` +
  `isSimulated: true` for the rumor, `sourceClass: OFFICIAL` + `isSimulated: false` for the
  filing). The fabricated bankruptcy entry is gone. The endpoint is now safe to show.
- Item 1 says "Published addresses are T4.2 working addresses, not final". T7.2 has since published
  the authoritative list. `frontend-handoff/deployed-addresses.json` still carries
  `status: T4.2_WORKING_ADDRESSES_NOT_FINAL` and the demo driver prints it, which reads as a
  disclaimer on the final addresses.

### 8.4 Two undercounted test totals — FIXED

**Status: corrected 2026-08-21.** Current verified figures: server **594 passed / 0 failed**,
contracts **137 passed / 0 failed**, web **30 passed / 0 failed**.

`t6-4-claims-and-competitive-position.md` and the tracker both cite `forge test` **134/134**. The
verified figure on 2026-08-21 is **137 passed / 0 failed**. Server tests are cited as 153 in the
tracker's older baseline; the verified figure is **594 passed / 0 failed**. Both are undercounts, so
the direction is safe, but the numbers should match reality if they are quoted to judges.

---

## 9. Verification log

Everything below was run on 2026-08-21 from a clean shell in the repository root.

### 9.1 Demo scenes

```
$ node --version
v24.10.0
$ node demo/tinjau-demo.mjs scene1     # WATCH, fee 500, network sealed        OK
$ node demo/tinjau-demo.mjs scene2     # CONSTRUCTED PROTECT, 20000/9470/500   OK
$ node demo/tinjau-demo.mjs scene3     # 28 rows, 72 cells, claimGate false    OK
$ node demo/tinjau-demo.mjs check
manifest is byte-identical to what the source artifacts produce now
sha256 be884920d860b0f4c92180670f52ae54400f4e5d77e25d95ae111b7221ee7196
```

### 9.2 Test suites

```
$ cd apps/server && pnpm test
ℹ tests 594   ℹ pass 594   ℹ fail 0   ℹ todo 0

$ cd contracts && forge test
Ran 7 test suites: 137 tests passed, 0 failed, 0 skipped (137 total tests)
```

### 9.3 Live bytecode, `eth_getCode` at block 38849130

```
TinjauRiskRegistry         0x60062389a7AB08F0030FC06Adf9CE0C180537317 codeSize=6337
TinjauFeeHook              0x1092C9fe2dB084F26aa415A0fda14B001A786080 codeSize=6160
PoolManager (v4)           0x8F862A8b6f00C99b0610dc764228C661c4909ae1 codeSize=17151
swap router (test)         0xe5823a180BFAcbC24Aa9a744B76f3Dfb8bbECDA9 codeSize=5035
liquidity router (test)    0x1324A9A175779D53c65F9A43493CEa302cd54587 codeSize=4533
MOCK wNVDAx                0xf07A9D89848bc694c7154Fda4cce707Eb409F903 codeSize=1737
MOCK USDG                  0x666e81CCb9D4d6c2e7A3ed9f317E3dFBa2410e99 codeSize=1737
demo TinjauRiskRegistry    0x1a1e17306f789f5Ec7012B1E2CB866DeDB61E2b1 codeSize=6337
demo TinjauFeeHook         0xAb448f70fE44fbbF5f41225F7797fcC7e56c2080 codeSize=6160
demo swap router           0xE76D6fC0A5235155eEb60FbBA8623465520E19dC codeSize=5035
demo liquidity router      0xefEC4A304eeaA95581B2018b50472D762eE0833c codeSize=4533
```

Every size matches `t7-2-authoritative-addresses.json` exactly.

### 9.4 Live endpoints

```
tinjau.xyz            -> 200
tinjau.xyz/demo       -> 200
tinjau.xyz/proof      -> 200
tinjau.xyz/api/scoreboard -> 200, provenance object present, canClaimLossAvoided false
x.com/tinjauAI        -> 200
github.com/k3cs/Tinjau -> 404 (anonymous)   BLOCKING
```

### 9.5 Live registry read

Command and full output in §5.2. Registry `0x6006…7317`, chain 1952, 2 history entries, stored
`PROTECT` / effective `NORMAL`, effective fee 500.

---

## 10. Final checklist for Dien

- [ ] Make `github.com/k3cs/Tinjau` **public**, then re-check it loads in a private browser window.
- [ ] Post from `@tinjauAI` mentioning `@XLayerOfficial`, then copy the post URL.
- [ ] Decide the Telegram link (group or personal handle) and have it ready.
- [ ] Have the submission email ready.
- [ ] Paste project name, description (§2.1 or §2.2 depending on the field length), project URL,
      GitHub, email, Telegram, X handle, X-post URL into the form.
- [ ] Submit before **2026-08-21 23:59 UTC**.

Optional, only if there is time after the above:

- [ ] Correct `sceneA_post` in `t7-2-authoritative-addresses.json` (§8.1).
- [ ] Add the undocumented `PROTECT` transaction to the T7.2 record (§8.2).
- [ ] Refresh the two stale `README.md` §9 items and the two test counts (§8.3, §8.4).
