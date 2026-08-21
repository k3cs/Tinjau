# T7.2 — authoritative deployment, and the T4.2–T4.5 closeout

Non-frontend build artifact for workspace `buildx-orion-2026`.

- Created: 2026-08-21
- Owner: external non-frontend AI agent
- Machine-readable companion: `../05-build/t7-2-authoritative-addresses.json`
- Scene evidence: `../05-build/t4-demo-manifest-xlayer-testnet.json`, `…-production-envelope.json`, `…-anvil.json`

## 1. The load-bearing question: are the deployed contracts stale?

`TinjauRiskTypes.sol` gained `REASON_PERSISTENCE_UNOBSERVED` (bit 22). Both
`TinjauRiskRegistry` and `TinjauFeeHook` inline `REASON_ALL_DEFINED`, so if that bit landed
after deployment, both are stale and must be redeployed.

**Answer: not stale. No redeploy is warranted.** Verified two independent ways.

### 1.1 Bytecode comparison

`apps/server/src/chain/tinjauBytecodeAudit.ts` compares deployed runtime code against a fresh
`forge build --force`, masking the two things that legitimately differ:

- **immutables** — the hook bakes in its PoolManager, registry and six envelope values (25 slots);
  the registry bakes its EIP-712 domain separator (2 slots). Foundry publishes
  `immutableReferences`, so these are masked from the artifact's own data rather than guessed.
- **metadata** — the trailing CBOR blob hashes the source text, so any edit changes it. Tracked
  separately, because "built from different source" and "behaves differently" are not the same
  finding.

Result, both stacks, both contracts: `bodyDifferences = 0`, `metadataDiffers = false`, sizes
6337/6337 and 6160/6160 → **`IDENTICAL`**. Metadata matching is the decisive part: it means the
source hash is the same, so the deployment was made from exactly this source.

### 1.2 Functional probe

Bytecode equality is an argument about compilation. The operational question is whether the
deployed registry **accepts the current schema**, so that is asked directly by `eth_call` (no
broadcast): simulate `postAssessment` carrying bit 22 and see which error comes back.
`postAssessment` validates reason bits before recovering a signer, so a schema-aware contract
gets as far as the signature check and a stale one stops earlier.

- bit 22 → `BadSignature` (reason bits accepted; the deployment knows bit 22)
- bit 30, undefined in every schema version → `UnknownReasonBits` (correctly refused)

### 1.3 Two defects the controls caught

Neither verdict was believed before its instrument was tested.

**The probe was broken on first use.** It stamped assessments from the local clock, and
`postAssessment` checks `assessedAt > block.timestamp` **before** it validates reason bits. The
public RPC lags the local clock, so every probe reverted `AssessmentFromFuture` and returned
"understood" — including for a bit no schema defines. Fixed by taking timestamps from the chain's
latest block. Without the self-check, §1.2's conclusion would have been drawn from an error that
proves nothing.

**`UnknownReasonBits` was not in the harness ABI.** It is declared in the `TinjauRiskTypes`
*library*, not in the registry contract, and library errors revert with their own selector. The
whole schema-validation family — `UnknownReasonBits`, `InvalidDataMode`,
`InvalidConfirmationStatus`, `InvalidConfidenceBand`, `EmptyEvidenceCommitment` — was decoding as
an unnamed revert. That is the family a malformed or newer-schema assessment lands in, and
precisely the one whose name a reader needs. All added, plus the two `TinjauRiskPolicy` envelope
errors.

**The bytecode comparator's ability to fail is tested**, in `test/tinjauBytecodeAudit.test.ts`
(5 tests): one flipped byte is caught, wholly different code is caught, a truncated deployment is
caught by size, and differences confined to immutable slots are correctly *not* flagged.

## 2. Authoritative addresses — chain 1952 (X Layer Testnet)

The "working, not final" label is **dropped** for everything below. Every address was re-read
from chain and every `codeSize` measured at emit time; only transaction hashes are transcribed.

### 2.1 Production envelope — **this is the stack judges should read**

Envelope: `baseFee 500`, `maxFee 20 000`, `widen 3 600s`, `decay 18 000s`, `cap 21 600s`,
`cooldown 3 600s` — inherited from the deployed historical hook (§0.11), not chosen here.
Deployed in block **38824844**.

| Role | Address | codeSize | Source | Deploy tx |
|---|---|---|---|---|
| `TinjauRiskRegistry` | `0x60062389a7AB08F0030FC06Adf9CE0C180537317` | 6337 | IDENTICAL | `0x4fb85332…d9c552` |
| `TinjauFeeHook` | `0x1092C9fe2dB084F26aa415A0fda14B001A786080` | 6160 | IDENTICAL | `0xaf4cfcbe…a2f17e` |
| `PoolSwapTest` | `0xe5823a180BFAcbC24Aa9a744B76f3Dfb8bbECDA9` | 5035 | v4-core, unmodified | `0x4e3ea888…7521a8` |
| `PoolModifyLiquidityTest` | `0x1324A9A175779D53c65F9A43493CEa302cd54587` | 4533 | v4-core, unmodified | `0xc657f110…e9cac4` |

Pool id `0x5e9eff19074225e9132eb73dc25cf0e3ff55c3fb31c9b28ab633851d2b54f730`.

### 2.2 Demo envelope — exists only because X Layer Testnet has no `evm_increaseTime`

Envelope: the same shape compressed 60× (`widen 60s`, `decay 300s`, `cap 360s`, `cooldown 60s`),
preserving `cap == widen + decay` and `cooldown == widen` exactly. Deployed in block **38824870**.

| Role | Address | codeSize | Source | Deploy tx |
|---|---|---|---|---|
| `TinjauRiskRegistry` | `0x1a1e17306f789f5Ec7012B1E2CB866DeDB61E2b1` | 6337 | IDENTICAL | `0x86caff4b…6d8a24` |
| `TinjauFeeHook` | `0xAb448f70fE44fbbF5f41225F7797fcC7e56c2080` | 6160 | IDENTICAL | `0x8f4b736a…29aa9` |
| `PoolSwapTest` | `0xE76D6fC0A5235155eEb60FbBA8623465520E19dC` | 5035 | v4-core, unmodified | `0x65c20374…68ec0c` |
| `PoolModifyLiquidityTest` | `0xefEC4A304eeaA95581B2018b50472D762eE0833c` | 4533 | v4-core, unmodified | `0x4f487f18…93c2e2` |

Pool id `0x3b3942b682bd59383474974127140a3f0b0c2dff946b8164341c4812985a4a8c`.

**Anything shown from this stack must be labelled as using demo timings.** It exists because the
production envelope's 21 600s recovery window cannot be watched on a chain that cannot warp; the
alternative was a testnet demo unable to show the recovery half of the claim at all. The
production timings are bound by `forge test` (137/137) and by the Anvil run.

Both hook addresses end in `…6080`: low 14 bits `0x2080` =
`BEFORE_INITIALIZE_FLAG | BEFORE_SWAP_FLAG`, which is what makes them valid v4 hook addresses.

### 2.3 Reused unchanged from the historical deployment (§0.16)

`PoolManager` `0x8F862A8b6f00C99b0610dc764228C661c4909ae1` (17151), mock wNVDAx
`0xf07A9D89848bc694c7154Fda4cce707Eb409F903` (1737), mock USDG
`0x666e81CCb9D4d6c2e7A3ed9f317E3dFBa2410e99` (1737).

### 2.4 Roles

Assessor `0x0990EAcecFe00f1709A748D37cCd52C45B95aC72` (derived, holds 0 OKB by design — it only
signs). Guardian and poster both `0x8BCC23b3352e9c450160676803AC5cfe1e2329e1`. Swap relayer
`0x4e7691FA710D488F1D2CD6d22619eb325bf99eBd`. Rationale and its production limitation:
`t4-2-t4-5-harness-and-testnet-run.md` §8.

### 2.5 Both pools are BUILDER-CONTROLLED

Seeded with freely-mintable mock tokens that have no value. They demonstrate enforcement. They
are not markets, and no figure measured on them is a market result.

## 3. T4.2 — connect poster, registry, policy and hook

**Acceptance: registry state and pool fee agree; a failed action stays visible and cannot claim a
protection benefit; transaction hashes and decoded events are recorded. Met.**

- **Agreement is asserted, not assumed.** Scene B reads `registry.effectiveState()` and compares
  it to the fee decoded from PoolManager's own `Swap` event. On 1952 both were **20 000**; the
  scene fails if they differ. The fee is never taken from the hook's view function — a dynamic-fee
  override is applied to one swap and never written to `slot0`, so `previewFee` is an intention
  and the `Swap` event is the outcome.
- **Failed action.** Scene F induces a real guardian pause, the post is refused on chain with the
  decoded error `ProtectionPaused`, and the recorded action reads `status: FAILED`,
  `appliedFee: null`, `txHash: null`, `failureReason: ProtectionPaused`, while `authorized`
  stays `true` — the evidence did authorise it; only the write failed, and those are different
  facts. A swap immediately afterwards is charged **500**, which is the measured proof that no
  benefit was obtained. Pause `0xcde60150…`, swap `0x6932b3e7…`, unpause `0x80659537…`.
- **Decoded, never raw.** Every event argument is returned by name, every enum ordinal mapped to
  a string, every revert mapped to its error name and arguments. §0.23 forbids asking anyone to
  decode ad hoc contract output.

## 4. T4.3 — automatic expiry and deterministic recovery

**Acceptance: time advancement returns the policy to baseline within the configured maximum;
history remains readable; cooldown prevents immediate unsafe re-entry. Met.**

Fees actually charged, decoded from the `Swap` event:

| Chain | Envelope | Widened | Mid-decay | Recovered |
|---|---|---|---|---|
| Anvil 31337 | production | 20 000 | 10 250 | 500 |
| X Layer 1952 | demo | 20 000 | 9 470 | 500 |

- **No LLM, no keeper, no transaction ends it.** Between the widened swap and the recovered swap
  the only thing that changes is `block.timestamp`. On Anvil that is `evm_increaseTime`; on 1952
  it is a wall-clock wait. Recovery that depended on someone showing up would not be
  deterministic recovery.
- **History stays readable.** After recovery `effectiveState()` returns `NORMAL` while
  `currentRecord()` still returns `PROTECT`. Expiry is applied at read time; it does not erase
  what the record said. Asserted in `tinjauHarness.test.ts`.
- **Cooldown blocks re-entry**, refused by the contract with the decoded error `CooldownActive`,
  and a swap afterwards is charged **500**. `lastProtectEndedAt` is only set by an explicit
  stand-down, so the scene posts one (`0x85e854b3…`) first — lapsing by time alone does not arm
  cooldown, and pretending otherwise would test nothing.
- **The guard is real.** Running Scene B against the production-envelope stack on 1952 refuses:
  *"Cannot advance 12600s … Skipping the advance and reporting the swap anyway would present
  three swaps at the same instant as a decay curve."*

## 5. T4.4 — the rumour negative control, end to end

**This is the scene that proves the safety claim rather than the capability claim, and it is the
one to read first.**

**Registry half: met. UI/API half: pending, and not claimed.**

A `PROTECT` demonstration shows the system *can* act. Anyone can build something that raises a
fee. The load-bearing question is whether it *declines* to act when the evidence does not support
acting, and the frozen rumour scenario is the case constructed to test exactly that.

What ran, on chain 1952, through the production pipeline with nothing stubbed:

1. The frozen source-linked rumour scenario went through `normalizeClaims` → `buildEvidenceGraph`
   → `resolveAsset` → `confirmMarket` → `decide()`. The decision was **`WATCH`**, with reason
   codes `SINGLE_SOURCE`, `DUPLICATE_SYNDICATION`, `NO_OFFICIAL_CONFIRMATION`,
   `MARKET_DATA_UNAVAILABLE`, `INSUFFICIENT_SAMPLE`, `REFERENCE_MARKET_CLOSED` — four outlets
   collapsing to one origin, and no market corroboration.
2. It was signed by the assessor and relayed on chain: `0x69c11cf4…96922c`. The registry accepted
   it as `WATCH`.
3. Readback from the registry and the hook directly, with no dashboard involved: `state: WATCH`,
   `effectiveState.fee: 500`, and the hook's own reason code `None` — meaning **"no protection
   was warranted"**, not "protection was warranted and then lapsed". Those are different findings
   and the record distinguishes them.
4. **A real swap through a real PoolManager was charged 500** (`0xcdfd1040…46b5f`) — `baseFee`,
   the same fee an unassessed pool charges. The aggressive path was never opened.

Why the fee reading is evidence rather than a restatement: the identical measurement on the same
pool returns **20 000** under Scene B. The instrument discriminates; it is not returning 500
because it can only return 500.

**The containment is defence in depth, at four independent layers**, and any one of them alone
would hold:

- the promotion engine caps rumour-only evidence at `WATCH` (T1.2, fuzz-proven);
- `TinjauRiskRegistry.postAssessment` reverts a rumour-driven `PROTECT` **even with a valid
  assessor signature**, because the trust model assumes the off-chain engine may be compromised
  (T1.5, `testFuzz_rumorOnlyEvidenceCanNeverReachProtect`);
- `TinjauFeeHook` re-checks `REASON_RUMOR_ONLY` at read time and charges `baseFee` regardless
  (`testFuzz_rumorBitAlwaysBlocksTheAggressiveFee`);
- `TinjauRiskPolicy.effectiveFee` returns `baseFee` for any state that is not `PROTECT`, before
  any arithmetic runs.

**What is not claimed.** T4.4's acceptance also asks that the **UI and API** show `WATCH`. The UI
belongs to the frontend lane. The API half is blocked on the VPS redeploy tracked at T7.3 — the
provenance fix exists in code but the live endpoint still serves the old payload, so no
judge-facing material may cite that endpoint yet. **The registry and on-chain half is done and
verifiable today; the UI/API half is pending.** Stating it as fully closed would be exactly the
kind of overclaim this scene exists to guard against.

Two honest limitations that do not weaken the result but bound it: the rumour claim itself is
`SIMULATED` (T0.2 disclosure — no byte-pinnable social post exists for it; the news chain beside
it is real and source-linked), so this proves containment and not live social discovery. And the
timestamps were shifted forward so the evidence could be posted to a live chain — by one constant
across claims, anchor and market window together, with the scene asserting the shifted run
produces the same state and the same reason codes as the canonical one, and a test proving that
guard is not vacuous.

## 6. T4.5 — the confirmed-event path

**Acceptance: evidence → confirmation → `PROTECT` → bounded fee → swap/readback → decay →
`NORMAL` from one reproducible command. Met, with the constructed inputs stated plainly.**

One command runs it (§9 of `t4-2-t4-5-harness-and-testnet-run.md`). Transaction hashes for every
step are in the manifest.

**Precisely what is constructed.** The canonical mainnet replay of this same event resolves to
**`WATCH`**, because its market leg is `NOT_CONFIRMED` — the published T3.3 result, which stands
and is not revisited. So this scene pairs the **real replayed 8-K evidence** with a
**constructed price path on the builder-controlled pool**. It must never be presented as a
replayed `PROTECT`.

How much is constructed is measured rather than asserted. Against the canonical replay the
reason-code diff is exactly:

```
only in canonical  : ANTI_WICK_FAILED, MARKET_NOT_CONFIRMED
only in constructed: MARKET_CONFIRMED
```

All three are market-leg codes. The evidence-leg conclusions — `OFFICIAL_FILING`,
`BONDED_EVIDENCE_PASSED`, `DUPLICATE_SYNDICATION`, `STALE_EVIDENCE` — are **identical in both
runs**, and a test fails if a non-market reason ever moves. `usReferenceMarketOpen` is taken from
the scenario rather than set to a convenient value, so market-hours context is not a second
constructed input.

The constructed path is fed to the real `confirmMarket` under its own frozen thresholds (200 bps
drawdown floor, anti-wick necessary with median retention over the hold interval, 30-swap
minimum). **What is constructed is the market, not the judgement about it** — if a future
tightening of those rules rejects this path, the scene fails, which is the correct outcome.

A known reporting limit: the on-chain `dataMode` is derived from the evidence only, so the record
cannot express "evidence replayed, market constructed". That distinction lives in the manifest
and in this document, and it is why the caveat is repeated wherever the scene appears.

## 7. Fix applied: the hook's decoder coupling is now asserted

Previously recorded as a T7.1 recommendation; done now, because a silent, test-passing
disablement of all protection is the worst failure mode in this system.

`TinjauFeeHook._loadRecord` hand-decodes exactly twelve ABI words and refuses any other
returndata length. That is deliberate — `abi.decode` reverts on an out-of-range enum, and a
reverting hook would halt the pool instead of failing closed. But it means **adding a thirteenth
field to `RiskRecord` would silently disable all protection**: every read would return
`RegistryUnreachable`, every quote would be `baseFee`, and every existing test would still pass,
because failing closed is what they assert.

Three tests now stand between that change and going unnoticed:

- `test_riskRecordEncodesToTheTwelveWordsTheHookDecodes` — asserts `abi.encode(RiskRecord)` is
  384 bytes, with a failure message naming what to update. Verified load-bearing by mutation:
  changing the constant to 416 fails the test.
- `test_registryReturnsExactlyTheLengthTheHookExpects` — the real registry's answer really is
  384 bytes, so the constant is not merely self-consistent.
- `test_degraded_oneExtraRecordFieldSilentlyDisablesProtection` — demonstrates the failure: a
  record with one extra word turns an active `PROTECT` charging `MAX_FEE` into `baseFee` with
  reason `RegistryUnreachable`, silently.

`TinjauRiskTypes.sol` is orchestrator-owned and frozen; none of this constrains it. It only
guarantees that changing it cannot pass unnoticed.

## 8. Verification

| Suite | Command | Result |
|---|---|---|
| Contracts | `cd contracts && forge test` | **137/137** (was 134; +3 decoder-coupling tests) |
| Server | `cd apps/server && npx tsx --test "test/**/*.test.ts"` | **594/594** (includes +5 comparator controls from this task; the total also moves with the other lanes) |
| Typecheck | `npx tsc --noEmit` | clean |
| Deployment audit | `npx tsx src/chain/tinjauVerifyDeployment.ts` | both stacks `CURRENT`, `IDENTICAL`, schema-current |

No key appears in any artifact; verified by scanning every file written against the real key
material.

## 9. Still open

- **T4.4's UI/API half** and **T7.3's VPS redeploy**. Until the redeploy lands, no judge-facing
  material may cite the live scoreboard endpoint.
- **The read-staleness guidance is not yet in `frontend-handoff/`** (off-limits to me). Consumers
  reading the registry from the same public RPC can read `NORMAL` while a `PROTECT` is live;
  measured lag 2 519–2 746 ms per write. This belongs in the handoff notes and in T6.3's
  reference consumer.
- **No claim of a first.** Prior art occupies AI- and telemetry-driven v4 fee control (§0.19).
