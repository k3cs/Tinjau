# T4.2 — `TinjauFeeHook`: connecting the risk record to a fee a pool actually charges

Non-frontend build artifact for workspace `buildx-orion-2026`.

- Created: 2026-08-21
- Owner: external non-frontend AI agent
- Governing tracker: `tinjau-lp-risk-autopilot-task-tracker.md` (§0.6, §0.7, §0.11, §0.12, §0.18)
- Depends on: T1.3 (`TinjauRiskPolicy`), T1.4 (`TinjauRiskRegistry`)
- Status: **hook and tests complete and verified locally; nothing deployed**

## 1. The gap this closes

T1.3 built the fee arithmetic. T1.4 built the risk record. Nothing connected either one to a
Uniswap v4 pool. T4.2's acceptance requires "let the hook consume the policy, and execute a
swap showing the effective fee", but the only hook in the tree was `AfterhoursFeeHook` — the
deployed historical contract, which reads `EventStateRegistry` and maps an event **type and
severity** onto a fee. The final product maps a **risk state** onto a fee. Those are different
mechanisms, so a new contract was needed rather than an edit.

Nothing historical was renamed, altered, or removed (§0.18). `AfterhoursFeeHook`,
`AfterhoursFeePolicy`, and `EventStateRegistry` are untouched and their 56 tests still pass.

## 2. What was built

| File | Role |
|---|---|
| `contracts/src/TinjauFeeHook.sol` | the v4 `beforeSwap` hook |
| `contracts/test/TinjauFeeHook.t.sol` | 41 tests: 5 fuzz properties, 20 degraded paths, 7 end-to-end swaps |
| `contracts/test/mocks/MockTinjauRiskRegistry.sol` | a registry that can lie, for the fail-closed branches |
| `contracts/script/DeployTinjauHookAndPool.s.sol` | X Layer Testnet deployment, **written and dry-run only** |

All four files are new. No existing contract was modified.

### 2.1 The design decision that matters most

**The hook has no envelope of its own.** At construction it reads `registry.envelope()` and
freezes those six values into immutables. The registry's envelope is set once in its own
constructor and has no setter, so the two provably cannot drift.

The consequence is the property the product needs: *the hook cannot charge a fee outside the
band the registry published*, and there is no owner, admin, or guardian path that changes the
band afterwards. `TinjauFeeHook` has **no state-changing external function at all**.

Proven by `test_hookCannotWidenBeyondTheEnvelopeTheRegistryPublished`: a registry deployed with
`maxFee = 3 000` produces a hook whose widest possible output is 3 000, on the same record that
yields 20 000 against the production envelope.

### 2.2 The one lever that reaches the hook, and its bound

There is no admin function here, but the registry's guardian does hold one lever that reaches
it: `setAssetSupported(asset, false)` makes the hook stop resolving that asset, which forces
`baseFee`.

That power is **one-directional**. The guardian can lower a fee to baseline and can never raise
one, because raising requires a stored record that only a signed, market-confirmed, non-rumour
assessment can create. An emergency stop that can only under-protect is a different risk from
one that can over-charge, and only the first is acceptable. Proven by
`test_e2e_guardianCanStandProtectionDownButNeverRaiseAFee`.

### 2.3 Reads are hand-decoded on purpose

The registry is read through raw `staticcall` and the twelve-word `RiskRecord` is decoded by
hand, not through the typed ABI. `abi.decode` reverts on an out-of-range enum ordinal, and a
reverting hook halts the pool. **A pool that cannot be swapped is a worse outcome than a pool
charging its baseline fee**, so every malformed shape is caught before it becomes an enum.

### 2.4 `beforeInitialize` is enabled, and it refuses static-fee pools

v4 silently ignores a `beforeSwap` fee override on a non-dynamic-fee pool. On such a pool the
registry would read `PROTECT` while the pool kept charging its static fee, with nothing on chain
to reveal the mismatch — the product's central claim would simply be false for that pool. The
historical hook documented this footgun in a comment; this one refuses it
(`test_staticFeePoolCannotBeInitialisedWithThisHook`, which asserts the inner
`PoolMustUseDynamicFee` reason rather than merely that something reverted).

## 3. Properties proven

Command: `cd contracts && forge test`

| Property | Test | Result |
|---|---|---|
| `NORMAL`/`WATCH` charge exactly `baseFee` | `testFuzz_normalAndWatchAlwaysChargeExactlyBaseFee` | proven (fuzz, 256 runs) |
| fee never leaves `[baseFee, maxFee]` | `testFuzz_feeNeverLeavesTheBand` | proven (fuzz, 256 runs) |
| protection never outlives `min(cap, expiresAt)` | `testFuzz_protectionNeverOutlivesTheEarlierOfCapAndExpiry` | proven (fuzz, 256 runs) |
| decay is monotonic | `testFuzz_decayIsMonotonic` | proven (fuzz, 256 runs) |
| rumour bit can never widen the fee | `testFuzz_rumorBitAlwaysBlocksTheAggressiveFee` | proven (fuzz, 256 runs) |
| decay reaches `baseFee` inside the window | `test_decayReachesBaseFeeWithinTheConfiguredWindow` | proven (exact curve pinned) |
| expiry enforced at read time, no keeper | `test_expiredProtectRecoversWithNoTransactionAtAll` | proven |
| a real swap is charged the fee | 7 `test_e2e_*` through `PoolManager` | proven |

The fuzz properties run against `MockTinjauRiskRegistry` deliberately. The real registry
*refuses* to store a rumour-driven `PROTECT`, an out-of-range enum, or an undefined reason bit,
so it physically cannot produce the inputs the fail-closed branches exist to survive. The hook's
trust model assumes the writing path may be compromised (§0.6); testing only against a registry
that behaves would leave every one of those branches unexercised.

### 3.1 Degraded paths — every one falls back to `baseFee`

| Degraded condition | Test | `Degraded` code returned |
|---|---|---|
| never assessed | `test_degraded_noRecordAtAll` | `NoRecord` |
| registry reverts | `test_degraded_registryReverts` | `RegistryUnreachable` |
| registry returns wrong shape | `test_degraded_registryReturnsWrongShape` | `RegistryUnreachable` |
| registry paused | `test_degraded_registryIsPaused` | `RegistryPaused` |
| asset not supported | `test_degraded_unsupportedAsset` | `NoSupportedAsset` |
| both pool sides supported | `test_degraded_bothSidesSupportedIsRefusedNotGuessed` | `AmbiguousAsset` |
| `PROTECT` not exactly `Confirmed` | `test_degraded_protectWithoutExactConfirmation` | `NotMarketConfirmed` |
| `PROTECT` carrying the rumour bit | `test_degraded_storedProtectCarryingTheRumorBitIsRefusedAtReadTime` | `RumorOnly` |
| out-of-range state / confidence / confirmation | three `test_degraded_malformedRecord_*` | `MalformedRecord` |
| `DataMode.Unknown` sentinel | `test_degraded_unknownDataModeSentinel` | `MalformedRecord` |
| timestamp wider than `uint64` | `test_degraded_malformedRecord_overwideTimestamp` | `MalformedRecord` |
| undefined reason bit | `test_degraded_undefinedReasonBits` | `UndefinedReasonBits` |
| record for a different key | `test_degraded_recordForADifferentKey` | `RecordKeyMismatch` |
| different policy version | `test_degraded_recordWrittenUnderADifferentPolicyVersion` | `PolicyVersionMismatch` |
| `PROTECT` with no start | `test_degraded_protectWithNoRecordedStart` | fee `baseFee` |
| future-dated `PROTECT` start | `test_degraded_futureDatedProtectStart` | fee `baseFee` |
| expired / past the cap | `testFuzz_protectionNeverOutlives…` | `LapsedOrExpired` |

The four `Unknown` sentinels each fail closed at the layer that owns them: `dataMode` at load,
`confirmation` at the exact-`Confirmed` gate, `confidence` inside the policy's widening math
(`test_confidenceBandsOrderCorrectlyAndUnknownWidensNothing`). `SourceClass` is not a field of
`RiskRecord`, so there is nothing to gate.

Two codes exist so that "no protection was warranted" (`None`) and "protection was warranted and
then ran out" (`LapsedOrExpired`) are distinguishable. They charge the same fee; they are not the
same finding, and §0.12 requires the record to explain itself.

### 3.2 The tests were mutation-checked before being believed

All 41 passed on the first run, which is a reason for suspicion rather than confidence. Three
mutations were introduced into `TinjauFeeHook.sol`, run, and reverted:

| Mutation | Killed | Reading |
|---|---|---|
| `beforeSwap` returns `baseFee` unconditionally | exactly the 4 fee-asserting `test_e2e_*` | the end-to-end tests measure what the **pool charged**, not what the view returned |
| rumour re-check replaced with `if (false)` | exactly the 2 rumour tests | the read-side rumour gate is load-bearing |
| non-`PROTECT` short-circuit weakened to `state == Normal` | **nothing** (first attempt) | see finding 6.2 |

The third mutation surfaced a real gap and the test was strengthened until it caught it; the
mutation was then re-applied to confirm the fix. Details in §6.2.

## 4. End-to-end: the fee a real swap was actually charged

The fee override on a dynamic-fee pool is **not** persisted into `slot0` — `getSlot0` would keep
reporting the pool's stored `lpFee`. The only place the applied fee is observable is
PoolManager's own `Swap` event, so every figure below is decoded from that event after a real
swap through `PoolSwapTest` against a real `PoolManager`. This is the difference between "the
hook returned a number" and "the pool charged it".

| Registry state | Elapsed since `protectStartedAt` | Fee read back from the `Swap` event | Test |
|---|---|---|---|
| never assessed | — | **500** (0.05%) | `test_e2e_noRecord_realSwapChargesBaseFee` |
| `NORMAL` | — | **500** | `test_e2e_normal_realSwapChargesBaseFee` |
| `WATCH` | — | **500** | `test_e2e_watchIsChargedBaseFeeByTheActualPool` |
| `PROTECT`, confidence `High` | 0 s | **20 000** (2%) | `test_e2e_protect_realSwapChargesTheWidenedFee` |
| `PROTECT`, confidence `High` | 12 600 s (mid-decay) | **10 250** (1.025%) | `test_e2e_protectDecaysBackToBaseFee…` |
| `PROTECT`, confidence `High` | 21 600 s | **500** | `test_e2e_protectDecaysBackToBaseFee…` |

`test_e2e_protect_realSwapChargesTheWidenedFee` additionally asserts that the fee the pool
charged equals `registry.effectiveState(...)` — the acceptance criterion "registry state and pool
fee agree", checked rather than assumed.

The recovery from 20 000 to 500 happens with **no transaction sent to end it**. Between the
widened swap and the recovered swap, the only thing that changes is `block.timestamp`. Recovery
that depended on a keeper appearing would not be deterministic recovery.

The pool used is **builder-controlled test liquidity**. It proves the mechanism. It is not a
market and nothing measured on it is a market result.

## 5. Decision: what `paused` does at read time

**Decided by Dien, 2026-08-21: fail closed.** A paused registry makes the hook charge `baseFee`,
and the reason code says `RegistryPaused`.

This needed a decision because the two sources conflicted. The task brief listed "registry
paused" among the degraded paths that must fail closed; `TinjauRiskRegistry` documents the
opposite intent, that pause blocks NEW protections and does not cancel a running one, per §0.7.

The reasoning behind the decision:

- §0.7's prohibition targets a protection **silently cancelled by degraded data**. A guardian
  pause is neither silent nor data-driven — it is an explicit human action, and it is the only
  lever available if the assessor key is compromised and posts a `PROTECT` that would otherwise
  charge 2% for six hours.

- The registry's own semantics are **untouched**. The record is still stored, its history is
  still intact, and the registry still refuses to accept a new `PROTECT` while paused. What
  pause changes here is only the fee **action**.
- The protection clock is **not** paused with it. `protectStartedAt` keeps running, so a pause can
  only ever shorten the total time a fee is elevated, never extend it. Unpausing resumes the
  decay curve where it would have been, not where it left off.
Proven by `test_degraded_registryIsPaused` and, through a real pool and a real swap, by
`test_e2e_guardianCanStandProtectionDownButNeverRaiseAFee`.

## 6. Findings

### 6.1 `Assessment.requestedFee` never reaches the enforcement path (finding about a frozen contract — not patched)

`TinjauRiskPolicy`'s documented guarantee 4 is: *"A proposal can only ever LOWER the fee.
`requestedFee` is intersected with the policy's own target via `min` … the concrete form of 'the
LLM cannot select an arbitrary fee'."*

`TinjauRiskRegistry.Assessment` carries `requestedFee`, and it is bound into the EIP-712 hash
(`TinjauRiskRegistry.sol:366`), so it is authenticated. But it is **never written into
`RiskRecord`** — that struct has no fee field — and `postAssessment` reads it nowhere else. A
`grep` for `requestedFee` across `contracts/src` returns exactly those two sites plus the policy
library itself.

Consequence: **on the on-chain enforcement path, guarantee 4 is inert.** The hook has nothing to
intersect and must pass `requestedFee = 0`. The guarantee remains true for any caller invoking
`effectiveFee` directly with the assessment in hand (which the T1.3 fuzz tests do), but that is
not the path a swap takes.

The *safety* claim behind it is still intact, by a different and arguably stronger mechanism: the
record has no fee field at all, so the off-chain assessor cannot express a fee. Its only
influence on the amount is `confidence`, which is three discrete bands all strictly inside the
envelope. An assessor cannot ask for more than `High` gives, and `High` is the ceiling anyway.

**Recommendation, not applied:** either persist `requestedFee` into `RiskRecord` (a schema
change, so `SCHEMA_VERSION` would have to bump), or amend the T1.3 evidence line so it does not
cite a mechanism that the enforcement path does not use. This was not patched because
`TinjauRiskTypes.sol`, `TinjauRiskPolicy.sol`, and `TinjauRiskRegistry.sol` are frozen and
orchestrator-owned.

### 6.2 The hook's own `NORMAL`/`WATCH` guard was redundant, and the test could not see it

`_quote` short-circuits on `state != Protect` before any arithmetic. So does
`TinjauRiskPolicy.effectiveFee`. Weakening the hook's guard to `state == Normal` therefore
changed nothing measurable: **all 40 tests still passed**, because the policy library returned
`baseFee` for a `WATCH` anyway.

That means the fuzz property, as first written, proved the *composed system's* behaviour but not
the hook's own guard — a mutation confined to the hook was invisible.

Fixed by asserting the `Degraded` reason as well as the fee: a `WATCH` must read as `None` ("no
protection was warranted"), never as a lapsed or refused protection. Re-applying the same
mutation now fails the fuzz test on its 6th run. The redundancy itself is kept deliberately —
defence in depth against a future change on either side — but it is now observable.

### 6.3 Asset resolution refuses rather than tie-breaks

`AfterhoursFeeHook` resolves an ambiguous pool (both sides carry registry entries) by preferring
the more recently posted event, documented as not expected to occur. `TinjauFeeHook` refuses
instead and charges `baseFee`. Silently picking one would attach a record about token A to a pool
whose operator believes it is protected on token B — a wrong answer delivered confidently, which
is worse than no answer.

### 6.4 The hand-decoder is coupled to `RiskRecord`'s field count

`_loadRecord` requires exactly 384 bytes of returndata — the twelve static words of the current
`RiskRecord`. Adding a thirteenth field would make **every** read return `RegistryUnreachable`
and the hook would charge `baseFee` forever. That direction is safe (it fails closed, not open)
but it is silent, and a deployment would look healthy while protecting nothing.

This matters because `TinjauRiskTypes.sol` is orchestrator-owned and changed during this task
(mtime moved to 2026-08-21 09:59 while this hook was being written; the struct was unaffected,
six lines were added elsewhere). Mitigation in place: the schema-version and policy-version
checks already refuse a record from a different schema, and a field addition requires bumping
`SCHEMA_VERSION` per that file's own instruction. **Recommended for T7.1:** add an assertion
that `abi.encode(RiskRecord)` is 384 bytes, so a field addition fails a test rather than silently
disabling the hook. Not added here — a test asserting the shape of a frozen, orchestrator-owned
struct belongs next to that struct, not in this suite.

For the same reason `test_degraded_undefinedReasonBits` derives the lowest undefined reason bit
from `REASON_ALL_DEFINED` instead of hardcoding a position: a hardcoded bit would stop testing
anything the day someone defined it.

## 7. Deployment — written, dry-run, **not broadcast**

Nothing was deployed. No transaction was sent to any network.

### 7.1 The dry-run that was performed

```bash
cd contracts && \
POOL_MANAGER=0x8F862A8b6f00C99b0610dc764228C661c4909ae1 \
RISK_ASSET=0xf07A9D89848bc694c7154Fda4cce707Eb409F903 \
QUOTE_ASSET=0x666e81CCb9D4d6c2e7A3ed9f317E3dFBa2410e99 \
ASSESSOR=<assessor address> \
GUARDIAN=<guardian address> \
forge script script/DeployTinjauHookAndPool.s.sol:DeployTinjauHookAndPool \
  --rpc-url https://testrpc.xlayer.tech \
  --sender <guardian address>
```

Result: `Script ran successfully.` / `SIMULATION COMPLETE.` against live chain-1952 state.
Estimated gas 7 657 791 at 0.04 gwei ≈ 0.000306 OKB. The mined hook address ended in `…6080`,
whose low 14 bits are `0x2080` = `BEFORE_INITIALIZE_FLAG | BEFORE_SWAP_FLAG` — the mining works
against the real `CREATE2_FACTORY`, which is the step that fails in production if mined against
the EOA instead.

**The addresses printed by that dry-run are simulation artifacts and must not be published.**
They depend on the sender's nonce and no bytecode exists at any of them. The generated
`broadcast/.../dry-run/` directory was deleted for that reason, so nothing under `broadcast/`
implies a deployment that did not happen.

### 7.2 The command a later, separately-authorised step would run

```bash
cd contracts && \
POOL_MANAGER=0x8F862A8b6f00C99b0610dc764228C661c4909ae1 \
RISK_ASSET=0xf07A9D89848bc694c7154Fda4cce707Eb409F903 \
QUOTE_ASSET=0x666e81CCb9D4d6c2e7A3ed9f317E3dFBa2410e99 \
ASSESSOR=<assessor address> \
GUARDIAN=<guardian address> \
forge script script/DeployTinjauHookAndPool.s.sol:DeployTinjauHookAndPool \
  --rpc-url https://testrpc.xlayer.tech \
  --broadcast --private-key $DEPLOYER_PRIVATE_KEY
```

It would deploy, in one transaction batch:

1. `TinjauRiskRegistry` with the inherited envelope (500 / 20 000 / 3 600s / 18 000s / 21 600s cap / 3 600s cooldown);
2. `TinjauFeeHook` at a CREATE2-mined address encoding `beforeInitialize | beforeSwap`;
3. a **builder-controlled** dynamic-fee pool over the two mock tokens, tick spacing 60, at 1:1;
4. `PoolModifyLiquidityTest` and `PoolSwapTest` routers;
5. seed liquidity of 1e24 in freely-mintable mock tokens (no value), ticks −120…120.

`TINJAU_REGISTRY` reuses an existing registry instead of deploying a new one. `SEED_LIQUIDITY`
overrides the seed. Nothing is hardcoded.

**Guards in the script.** `run()` reverts with `wrong chain: refusing to deploy` unless
`block.chainid == 1952` (verified: setting `TINJAU_EXPECTED_CHAIN_ID=1` and pointing at 1952
reverts as intended). If the broadcaster is not the guardian, the script prints the
`setAssetSupported` call the guardian must make rather than skipping it silently — a hook that
cannot resolve its asset charges `baseFee` forever and would otherwise look like a working
deployment.

## 8. What this does not prove

- **Nothing is deployed.** No address, transaction hash, or decoded on-chain event exists for
  `TinjauFeeHook` yet. T7.2 owns deployment; T4.2's evidence field cannot be closed on this
  document alone.
- **The pool is builder-controlled.** Every fee figure in §4 was charged on liquidity this
  project created, with mock tokens that have no value. It demonstrates the mechanism working
  end to end and says nothing about any real market.
- **The record posted in the end-to-end tests is a test fixture**, not the output of the T4.1
  decision orchestrator (which does not exist yet). The hook is proven to enforce whatever the
  registry holds; whether the registry holds the right thing is T4.1's and T3.4's question.
- **T3.4 is still open** with two blocking findings (F1 velocity bypasses anti-wick, F2
  single-instant persistence sampling). Those govern whether a `PROTECT` should have been created
  at all. They do not affect this hook, which enforces a record rather than deciding one — but a
  demo that shows this hook charging 2% is showing enforcement, not a validated decision.
- **No claim of a first.** Prior art occupies AI- and telemetry-driven v4 fee control (§0.19).
  Nothing here is claimed as first, novel, or production-ready.
