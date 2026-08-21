# T4.2–T4.5 — the end-to-end harness, and what running it on a public chain revealed

Non-frontend build artifact for workspace `buildx-orion-2026`.

- Created: 2026-08-21
- Owner: external non-frontend AI agent
- Covers: T4.2 (poster/registry/policy/hook wiring), T4.3 (expiry and deterministic recovery),
  T4.4 (rumour negative control), T4.5 (confirmed-event path), §0.11 (failed action)
- Depends on: T1.3, T1.4, T4.1 (`decide()`), the `TinjauFeeHook` from `t4-2-hook-and-wiring.md`
- Status: **green on local Anvil and on X Layer Testnet (chain 1952)**

## 1. What was built

| File | Role |
|---|---|
| `apps/server/src/chain/tinjauChain.ts` | chain-agnostic clients, time control, bytecode checks |
| `apps/server/src/chain/tinjauAbi.ts` | hand-written, source-checked ABI fragments and enum name tables |
| `apps/server/src/chain/tinjauHarness.ts` | post, read, swap, decode — the on-chain primitives |
| `apps/server/src/chain/tinjauScenes.ts` | Scenes A, B and F, with their assertions |
| `apps/server/src/chain/tinjauLocalStack.ts` | boots Anvil and deploys the stack onto it |
| `apps/server/src/chain/tinjauRoleKeys.ts` | derives the gas-less assessor key |
| `apps/server/src/chain/tinjauPreflight.ts` | pre-deployment check: chain, balances, bytecode, roles |
| `apps/server/src/chain/tinjauDemoRun.ts` | one entry point, both chains; writes the decoded manifest |
| `apps/server/test/tinjauHarness.test.ts` | 14 tests, including the full end-to-end run on Anvil |
| `contracts/script/DeployTinjauStack.s.sol` | deploy-if-absent stack, one script for both chains |

The decision is never reimplemented. Every assessment comes from `decide()` via the real
pipeline (`normalizeClaims` → `buildEvidenceGraph` → `resolveAsset` → `confirmMarket` →
`decide`), and the harness signs and relays what it produces.

## 2. The chain-agnostic claim, and how it was tested

One entry point serves both targets. `--local` boots an Anvil and deploys; `--remote` reads an
RPC URL, a chain id and addresses from the environment. **The scene code below that dispatch is
the same code.**

That claim was tested the only way it can be: the identical harness was run against a local
Anvil and then against X Layer Testnet. It failed on the first remote attempt (§5), and the fix
was in the shared read path, not in a remote-only branch. No scene function knows which chain it
is on.

Two things are configuration rather than branching, deliberately:

- **`supportsTimeTravel`** is a declared property, not something discovered from a failed call.
  Anvil accepts `evm_increaseTime`; no public chain does.
- **`allowWallClockWait`** lives on the config for the same reason. A scene that had to know
  which chain it was on in order to advance time would have disproved the claim it exists to
  make.

When neither is possible, `advanceTime` **refuses**:

```
Cannot advance 12600s on "prod-env-guard-check": this endpoint does not support
evm_increaseTime. ... Skipping the advance and reporting the swap anyway would present three
swaps at the same instant as a decay curve.
```

That refusal was executed against the production-envelope deployment on 1952 and is the reason
the demo-envelope stack exists.

## 3. Deployed addresses — **T4.2 working addresses, not final**

**T7.2 re-verifies and owns the authoritative list.** Every address below was confirmed to have
bytecode by `eth_getCode` at run time (sizes are the measured `codeSize`).

### Production envelope — 3 600 / 18 000 / 21 600 s, chain 1952

| Role | Address | codeSize |
|---|---|---|
| `TinjauRiskRegistry` | `0x60062389a7AB08F0030FC06Adf9CE0C180537317` | 6337 |
| `TinjauFeeHook` | `0x1092C9fe2dB084F26aa415A0fda14B001A786080` | 6160 |
| `PoolSwapTest` | `0xe5823a180BFAcbC24Aa9a744B76f3Dfb8bbECDA9` | 5035 |
| `PoolModifyLiquidityTest` | `0x1324A9A175779D53c65F9A43493CEa302cd54587` | 4533 |
| pool id | `0x5e9eff19074225e9132eb73dc25cf0e3ff55c3fb31c9b28ab633851d2b54f730` | — |

### Demo envelope — 60 / 300 / 360 s, chain 1952

| Role | Address | codeSize |
|---|---|---|
| `TinjauRiskRegistry` | `0x1a1e17306f789f5Ec7012B1E2CB866DeDB61E2b1` | 6337 |
| `TinjauFeeHook` | `0xAb448f70fE44fbbF5f41225F7797fcC7e56c2080` | 6160 |
| `PoolSwapTest` | `0xE76D6fC0A5235155eEb60FbBA8623465520E19dC` | — |
| `PoolModifyLiquidityTest` | `0xefEC4A304eeaA95581B2018b50472D762eE0833c` | — |
| pool id | `0x3b3942b682bd59383474974127140a3f0b0c2dff946b8164341c4812985a4a8c` | — |

Reused from the historical deployment (§0.16), unchanged: `PoolManager`
`0x8F862A8b6f00C99b0610dc764228C661c4909ae1`, mock wNVDAx
`0xf07A9D89848bc694c7154Fda4cce707Eb409F903`, mock USDG
`0x666e81CCb9D4d6c2e7A3ed9f317E3dFBa2410e99`.

Both hook addresses end in `…6080`; the low 14 bits are `0x2080` =
`BEFORE_INITIALIZE_FLAG | BEFORE_SWAP_FLAG`, which is what makes them valid v4 hook addresses.

**Both pools are BUILDER-CONTROLLED test liquidity**, seeded with freely-mintable mock tokens
that have no value. They demonstrate enforcement. They are not markets, and nothing measured on
them is a market result.

### Why two deployments

X Layer Testnet has no `evm_increaseTime`. The production envelope's recovery window is 21 600 s,
so a live recovery demonstration there would take six hours. The alternative to a second
deployment was a testnet demo that could not show the recovery half of the claim at all.

- The **production envelope** is what `forge test` (134/134) and the Anvil run bind, and what
  T7.2 should publish.
- The **demo envelope** is the same shape compressed 60× — `cap == widen + decay` and
  `cooldown == widen` are preserved exactly — and exists solely so the recovery can be watched.
  Anything shown from it must be labelled as using demo timings.

## 4. Results

### Anvil (chain 31337, production envelope)

| Scene | State | Fees actually charged |
|---|---|---|
| A — rumour containment | `WATCH` | **500** |
| B — protect → decay → recover → cooldown | `PROTECT` | **20 000 → 10 250 → 500 → 500** |
| F — failed action | `PROTECT` (refused) | **500** |

### X Layer Testnet (chain 1952, demo envelope)

| Scene | State | Fees actually charged |
|---|---|---|
| A — rumour containment | `WATCH` | **500** |
| B — protect → decay → recover → cooldown | `PROTECT` | **20 000 → 9 470 → 500 → 500** |
| F — failed action | `PROTECT` (refused) | **500** |

Every fee is decoded from PoolManager's own `Swap` event — what the pool charged, not what the
hook's view function said. Transaction hashes for all of it are in
`../05-build/t4-demo-manifest-xlayer-testnet.json`.

Scene A on 1952: post `0x69c11cf4115037431bb1330cf7cd3bd32f3339b0aee2aa392a3b86ac0a96922c`,
swap `0xcdfd10400ee82305dd733b8a2c554f208e919adecc640409fcc197e6b4046b5f`.
Scene B on 1952: post `0x659cb5553e2f53364445bdc4521dee3e87843b59d31f5861c0e196d471b3be7b`,
widened `0x2e313c44bae3112cbb3c2430cf0e5e745327c197b54697f9f1e1ccca7df3f787`,
mid-decay `0x93ae1e2470eec2e0d42cf4a252d8ab5363636387f963e7770b132adfe7e17bab`,
recovered `0xcf229e22b8af4b4841437d57bee33af31edb5fbebbb79178cd9d36ac8546b7c0`,
stand-down `0x85e854b34937b7857c8f32a0e1e2e19b445b41460c75b7c867a0bb448f2cfa46`.

The production-envelope stack was verified with Scenes A and F (neither needs to advance time):
both pass, at `500`.

## 5. Finding: the public RPC serves stale reads, and it matters beyond this harness

**The first remote run failed all three scenes. The contracts were not at fault.**

Measured, from the failing manifest: a `postAssessment` whose own decoded event read
`state: PROTECT, assessedAt: 1787283731` was immediately followed by a `currentRecord` that
returned the *previous* record — `state: WATCH, assessedAt: 1787283718`, 13 seconds older. In the
same scene the swap was correctly charged **20 000** while `previewFee` returned **500**.

So the writes landed and the pool behaved correctly; the reads were served by nodes at an older
height. X Layer's public RPC is load-balanced, and a read issued immediately after a confirmed
transaction can be answered by a node that has not seen it.

Three symptoms, one cause:

- Scene A: readback reported `NORMAL` / `NoRecord` after a successful `WATCH` post.
- Scene B: readback reported the earlier `WATCH`, so the harness concluded the registry and the
  pool disagreed — **a false report, and the worst thing this artifact could have claimed**.
- Scene F: `setPaused(true)` was not visible when the post simulated, so the transaction took the
  cooldown branch and returned `CooldownActive` instead of the induced `ProtectionPaused`.

Fixed in the shared read path: after a confirmed write the harness waits until a read reflects
it, bounded, and **throws rather than proceeding** if it never converges. Measured lag on 1952:
**2 519–2 746 ms per write, 13 126 ms total across 5 writes**. The figures are published in the
manifest's `readConsistency` block rather than absorbed.

**This is not only a harness problem.** §0.12 requires the risk record to be readable by a third
party without trusting Tinjau's dashboard. Any such consumer reading from the same public RPC
inherits this: for a risk registry, a stale read means **reading `NORMAL` while a `PROTECT` is
live**. A consumer that acts on the record should pin reads to a block number, or wait for the
`AssessmentPosted` event rather than polling `currentRecord`. This belongs in the T6.3 reference
consumer's guidance and in the frontend handoff notes.

Anvil could never have surfaced it: one node, instant finality, read-after-write always
consistent. It appeared on the first contact with a real chain.

## 6. Finding: `previewFee` and the charged fee diverge on a live chain

On 1952 the mid-decay swap previewed **9 730** and was charged **9 470**. On Anvil the two are
always identical.

The cause is not a defect: the fee is a continuous function of elapsed time, and several seconds
pass between quoting and inclusion. On Anvil time only moves when warped, so no time passes
between the two. The gap here is 260 hundredths of a bip, consistent with roughly 4 seconds of
decay at the demo envelope's rate.

The consequence is real for anyone quoting: **a quoted Tinjau fee is an upper bound during
decay, not a promise**. The manifest records `previewedFee` and `appliedFee` side by side for
every swap precisely so this is visible rather than something a reader has to notice.

## 7. Honesty mechanisms built into the scenes

### 7.1 Time shifting is presentational, and that is checked

A frozen scenario is anchored in mainnet time weeks in the past. Posting it unmodified reverts
(`AssessmentExpired`); assessing it at the current instant makes its evidence stale and its
market leg ancient, so the run would measure the shift rather than the scenario.

Every timestamp — claims, anchor, and swap window together — is shifted by one constant, which
preserves every relationship between the parts. Scene A then asserts the shifted run produces the
**same state and the same reason codes** as the unshifted canonical run, and fails if it does
not. Scene A's measured shift on the 1952 run was 2 076 972 s (about 24 days).

That guard is not vacuous, and a test proves it: shifting the evidence *without* the market
changes the reason codes, while shifting both together does not.

### 7.2 Scene B is constructed, and exactly how much is measured

Scenario B's real mainnet replay resolves to `WATCH`, because its market leg is `NOT_CONFIRMED`
(T3.3, published). That result stands and is not revisited. A `PROTECT` demonstration therefore
cannot be a replay.

Scene B pairs the **real replayed 8-K evidence** with a **constructed price path on the
builder-controlled pool**. The path is fed to the real `confirmMarket` under its own thresholds —
200 bps drawdown floor, anti-wick necessary with median retention over the hold interval, 30-swap
minimum — so what is constructed is the market, not the judgement about it.

How much was constructed is measured, not asserted. Against the canonical replay the reason-code
diff is exactly:

```
only in canonical  : ANTI_WICK_FAILED, MARKET_NOT_CONFIRMED
only in constructed: MARKET_CONFIRMED
```

All three are market-leg codes. The evidence-leg conclusions — `OFFICIAL_FILING`,
`BONDED_EVIDENCE_PASSED`, `DUPLICATE_SYNDICATION`, `STALE_EVIDENCE` — are **identical in both
runs**. A test fails if a non-market reason ever moves. `usReferenceMarketOpen` is taken from the
scenario rather than set to a convenient value, so the market-hours context is not a second
constructed input.

`STALE_EVIDENCE` is present in the canonical run too; it is a property of the scenario's own
claim dates against its anchor, not something the shift or the construction introduced.

### 7.3 The asset remap is one field, and it is asserted

`decide()` resolves evidence to the canonical asset on X Layer **mainnet** (chain 196). The
enforcement stack runs on a chain where that token does not exist, so the assessment's `asset`
field is remapped to the deployed stand-in before signing. **Exactly one field changes**, and a
test enumerates the differing keys and asserts the list is `["asset"]` — so the remap cannot grow
into a place where decisions get edited. The remap is recorded in every scene artifact.

## 8. Decision to record: the assessor key is derived

The registry separates three roles: the **assessor** signs, the **poster** pays gas to relay, and
the **guardian** pauses and vets. This environment has two funded testnet wallets and no assessor
key.

Collapsing all three onto one wallet would have deployed a stack that cannot demonstrate the
separation at all. Instead: **the assessor needs no gas** — it only signs EIP-712 messages off
chain — so its key is derived deterministically, `keccak256(posterKey || "tinjau.rolekey/1.0.0:assessor")`,
domain-separated on both version and role. No new secret is stored anywhere, and any later run
against the same deployment recovers the same signer.

Deployed assessor address: `0x0990EAcecFe00f1709A748D37cCd52C45B95aC72` (0 OKB, by design).
Guardian and poster are both `0x8BCC23b3352e9c450160676803AC5cfe1e2329e1`, because the guardian
must pay gas to pause and only two funded wallets exist.

**This is a testnet arrangement and not a production one.** A derived key shares the fate of the
key it came from. In production the assessor key must be generated independently and held
separately from the wallet that pays gas, precisely so that compromising the hot relayer does not
hand over signing authority. Setting `TINJAU_ASSESSOR_PRIVATE_KEY` overrides the derivation with
no code change. Dien can overrule this by supplying a key.

Anvil uses four genuinely distinct keys, so the role separation *is* demonstrated there.

## 9. Reproducing

```bash
# local, boots its own Anvil and deploys
cd apps/server && npx tsx src/chain/tinjauDemoRun.ts --local

# preflight before touching a public chain
npx tsx src/chain/tinjauPreflight.ts

# X Layer Testnet, demo envelope (the full three-scene run)
TINJAU_RPC_URL=https://testrpc.xlayer.tech TINJAU_CHAIN_ID=1952 \
TINJAU_REGISTRY=0x1a1e17306f789f5Ec7012B1E2CB866DeDB61E2b1 \
TINJAU_HOOK=0xAb448f70fE44fbbF5f41225F7797fcC7e56c2080 \
POOL_MANAGER=0x8F862A8b6f00C99b0610dc764228C661c4909ae1 \
SWAP_ROUTER=0xE76D6fC0A5235155eEb60FbBA8623465520E19dC \
LIQUIDITY_ROUTER=0xefEC4A304eeaA95581B2018b50472D762eE0833c \
RISK_ASSET=0xf07A9D89848bc694c7154Fda4cce707Eb409F903 \
QUOTE_ASSET=0x666e81CCb9D4d6c2e7A3ed9f317E3dFBa2410e99 \
TOKEN0=0x666e81CCb9D4d6c2e7A3ed9f317E3dFBa2410e99 \
TOKEN1=0xf07A9D89848bc694c7154Fda4cce707Eb409F903 \
POOL_ID=0x3b3942b682bd59383474974127140a3f0b0c2dff946b8164341c4812985a4a8c \
TICK_SPACING=60 \
npx tsx src/chain/tinjauDemoRun.ts --remote
```

`--scenes A,F` restricts the run; `--out` redirects the manifest. Keys come from the environment
and are never printed, returned, or written — a test asserts a key cannot appear in the
serialisable configuration surface.

## 10. What this does not prove

- **The pools are builder-controlled.** Every fee figure was charged on liquidity this project
  created, with mock tokens that have no value.
- **Scene B's market leg is constructed** and must never be presented as a replay. The published
  replay result for scenario B remains `WATCH`.
- **The 1952 run used the demo envelope.** The production timings are proven by `forge test`
  (134/134) and by the Anvil run, and the production-envelope deployment on 1952 is verified live
  only on the scenes that do not advance time.
- **The rumour claim in scenario A is `SIMULATED`** (T0.2 disclosure). The news chain beside it is
  real and source-linked. Scene A proves containment, not live social discovery.
- **These are T4.2 working addresses.** T7.2 re-verifies and owns the authoritative list.
- **No claim of a first.** Prior art occupies AI- and telemetry-driven v4 fee control (§0.19).
