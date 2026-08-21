# Phase T1 — Final risk model and bounded on-chain policy

- Date: 2026-08-20
- Tasks: T1.1 – T1.5
- Owner: external non-frontend AI agent
- Result: **complete**
- Frontend files changed: none

## 1. What now exists

| Artifact | Role |
|---|---|
| `contracts/src/TinjauRiskTypes.sol` | canonical enums, reason bits, `RiskRecord`, promotion predicate |
| `apps/server/src/risk/types.ts` | TypeScript mirror with fail-safe decoders |
| `apps/server/src/risk/promotionConfig.ts` | frozen thresholds, `tinjau.policy/1.0.0` |
| `apps/server/src/risk/promote.ts` | deterministic `NORMAL/WATCH/PROTECT` engine |
| `contracts/src/TinjauRiskPolicy.sol` | bounded fee envelope, decay, cooldown |
| `contracts/src/TinjauRiskRegistry.sol` | signed, replay-proof, third-party-readable record |
| `contracts/test/fixtures/protect-eligibility-truth-table.json` | shared specification both languages verify against |
| `docs/.../frontend-handoff/risk-record.schema.json` | the §0.24 view model, versioned |

## 2. T1.1 — Versioned types

The vocabulary is defined once in Solidity and mirrored in TypeScript. Two hand-written
mirrors are not a shared schema unless something checks them, so
`apps/server/test/riskTypesParity.test.ts` **parses the Solidity source** and compares every
enum ordinal, reason-bit position, and the version string. A silent mismatch would mean a
contract writing `Protect` while the server reads `Watch`.

### 2.1 Zero-value discipline

[Inferensi] Solidity returns 0 for never-written storage, so every enum is ordered to make 0
the safest value rather than the most convenient one:

- `RiskState.Normal = 0` — an unwritten record grants no protection. The dangerous value is
  never the default.
- `SourceClass.Unknown = 0` — if `Official` were 0, uninitialised storage would read as the
  *most trusted* class, which is exactly backwards.
- `ConfirmationStatus.Unknown = 0` and `ConfidenceBand.Unknown = 0` — absence never reads as
  confirmation or as high confidence.

The `Unknown` sentinels are readable but **not writable**: the validators revert on them, so a
stored record carrying one is provably a record that was never posted. `assessedAt == 0` is
what distinguishes "never written" from "assessed as Normal".

### 2.2 Two decisions worth flagging

**Reason codes are a `uint32` bitmask on chain, strings off chain.** Storing string arrays per
record would cost more gas than the record itself and would not be machine-comparable. Bit
positions are permanent — to retire a reason, stop setting it; never reuse the position, or
historical records become unreadable. The bit-to-string mapping is the documented ABI contract
§0.12 requires.

**Unknown bits are refused, not ignored.** If a newer writer set a bit meaning "evidence was
retracted" and an older reader silently dropped it, the record would read as though the
retraction never happened. Both languages revert.

## 3. T1.2 — Deterministic promotion

`promote()` contains no model call, no network call, no clock read, and no randomness. Every
input arrives as an argument, so the same input always produces the same output. That is what
makes the §0.6 trust boundary real: AI may shape the evidence graph, but the transition is a
pure function anyone can re-run.

### 3.1 The invariant that is easy to get backwards

§0.7 says degraded data must never *create* a `PROTECT`, and separately that missing data must
not *cancel* one already running. These pull in opposite directions and the engine handles
them in different places:

- new promotion requires `confirmation === "CONFIRMED"` by exact equality, with freshness
  re-derived inside the engine rather than accepted from the caller;
- an active protection is checked **before** any new decision and continues on its original
  expiry and decay schedule.

[Inferensi] Cancelling early would hand an attacker a way to disable a pool's defence by
degrading one input feed. Fail-closed means refusing to start, not tearing down.

### 3.2 The self-revision rule — T0.2 §5's open question, now decided

T0.2 deliberately left scenario C undecided so the rule could not be fitted to an outcome.
The decision, frozen in `promote.ts` before any market data for that window was scored:

> A source line that has materially revised its own quantitative claim inside the evidence
> window may still support a `WATCH`, but may **not** be counted toward the two independent
> sources that non-official `PROTECT` requires. The disqualification applies to the whole
> `independenceGroup`, because a revision is a property of the source line, not of one article.

[Inferensi] The reasoning is about what the two-source rule is *for*. It exists to establish
that a fact is corroborated. A source that has demonstrably been wrong about the magnitude of
that very fact within the window has not established the fact — it has established that the
number is still moving. Acting on an unsettled number is exactly what bounded-action
discipline is meant to prevent.

Three things keep this from being result-driven:

1. **Threshold-free.** There is no ratio to tune, so it cannot be fitted to a scenario.
2. **Strictly conservative.** It can only block promotion, never enable it, so it cannot
   manufacture a favourable benchmark result.
3. **Generalises.** It matches the common pattern in breaking financial news, where an early
   figure is corrected within days — exactly when a pool should wait for the filing.

A test named *"scenario C would have promoted without the self-revision rule"* demonstrates
that removing it flips C to `PROTECT` with two independent sources. The rule is load-bearing,
not decorative, and T0.4 §3 requires the non-selected branch to stay in the artifact as a
disclosed sensitivity.

### 3.3 A gap this phase found and closed

[Fakta] The first version of the engine had no concept of **materiality**, so scenario D — a
routine NVDA insider Form 4, `sourceClass: OFFICIAL` — would have reached `PROTECT` given a
confirmed market. T0.2 had pre-registered `NORMAL` and called this "the primary false-positive
probe".

[Inferensi] Provenance and materiality are separate axes and conflating them is a real product
error, not a test artefact: an impeccably-sourced filing that reports no corporate action is
not a reason to raise LP fees. A new `materiality` field now gates promotion, `UNKNOWN` fails
closed, and non-material evidence does not even raise a `WATCH` — if every routine filing
raised monitoring, `WATCH` would be the permanent state and would stop meaning anything.

This required adding `REASON_NON_MATERIAL_EVENT` to both languages and the published schema,
and adding `materiality` to the frozen scenario fixtures. That fixture change is recorded as
`tinjau.scenario/0.2.0` with a `_schemaChangeLog` in each file.

### 3.4 A bug the frozen scenarios caught

[Fakta] Running scenario C through the engine returned `PROTECT`, not `WATCH`. The
self-revision rule was implemented per-claim: the WSJ *origin* carried the revision pointer,
but its Reuters *syndication* did not, so the group still counted as usable.

[Inferensi] That was a genuine logic error, not a fixture problem. A revision belongs to the
source line, so the disqualification is now group-wide. Letting a wire copy of a revised story
count while the revised original does not would restore exactly the corroboration the rule
exists to withhold.

## 4. T1.3 — The bounded envelope

`TinjauRiskPolicy` is pure math with no storage and no external calls, so the guarantees are
fuzz-testable against the arithmetic rather than through pool plumbing.

| Guarantee | Where enforced |
|---|---|
| `NORMAL`/`WATCH` always return `baseFee` | first branch, before any arithmetic |
| fee never leaves `[baseFee, maxFee]` | every path funnels through `_clamp` |
| protection never outlives `maxProtectDuration` or `expiresAt` | explicit checks, whichever is earlier |
| a proposal may only **lower** the fee | `requestedFee` intersected with the policy target via `min` |

[Inferensi] The fourth is the concrete form of "the LLM cannot select an arbitrary fee". An
off-chain proposer can ask for *less* protection than the policy allows but never more, so a
compromised assessor's worst case is under-protection, not a drained pool.

`validateEnvelope` also refuses a `maxProtectDuration` shorter than `widenDuration +
decayDuration`. That configuration is not unsafe, but it would truncate the decay curve, so
the "deterministic recovery" claim would not hold — better to refuse it than to tolerate it
silently.

The envelope values are the ones already deployed on the historical hook (`baseFee 500`,
`maxFee 20000`, widen 3600 s, decay 18000 s), so the tests bind what the product really runs.

## 5. T1.4 — The reusable record

A **new** contract rather than a migration of `EventStateRegistry`. [Inferensi] The deployed
registry records corporate *events* — permanent, bonded, challengeable history. This one
records risk *state*, which expires. Overloading one contract would have forced bonded-challenge
semantics onto records with nothing to bond, and a storage-layout migration would have
destroyed the existing events. The old registry keeps running and keeps its history; the new
one references evidence by commitment hash.

The trust model assumes the off-chain assessor is compromised:

- rumour-driven `PROTECT` is **re-checked on chain** and reverts even with a genuine signature;
- `Confirmed` is required by exact equality — `Stale`, `Unavailable`, `NotConfirmed` all fail;
- nonces prevent replay; deadlines prevent stale submission; an older `assessedAt` cannot
  overwrite a newer record;
- high-`s` signatures are rejected, so one authorisation cannot be reshaped into a second;
- a continuing protection **keeps its original start**, so refreshing every minute cannot
  ratchet the duration cap forward — the difference between a bounded action and a permanent
  one;
- pause blocks new protections without deleting evidence, rewriting history, or cancelling a
  protection already running.

`effectiveState()` applies expiry at read time so the common case is hard to get wrong, while
`currentRecord()` returns the record exactly as stored — a read never rewrites history.

## 6. T1.5 — Coverage

The mandatory property from the tracker is
`testFuzz_rumorOnlyEvidenceCanNeverReachProtect`: fuzzed across confidence, data mode, timing
and every other reason bit, with a genuine assessor signature, asserting the write reverts and
leaves no record at all.

`mayReachProtect` is specified once in
`contracts/test/fixtures/protect-eligibility-truth-table.json` — hand-written from §0.7, and
read by **both** implementations. Neither language generates it, so it is a specification
rather than a snapshot, and drift on either side fails on that side. Foundry's
`fs_permissions` is scoped to that one directory, read-only.

| Suite | Result |
|---|---|
| `cd apps/server && pnpm test` | 209/209 pass (153 at T0.1) |
| `cd apps/server && pnpm typecheck` | pass |
| `cd contracts && forge test` | 93/93 pass, 0 failed (56 at T0.1) |

## 7. Two testing traps worth recording

[Fakta] **`vm.expectRevert` and helper functions.** Twelve registry tests failed because
`vm.expectRevert()` was consumed by the `registry.hashAssessment` call inside the signing
helper rather than by the call under test. Signature computation is now hoisted above the
expectation.

[Fakta] **`via_ir` hoists `block.timestamp` across `vm.warp`.** A test built an assessment
after warping the clock and still received the pre-warp timestamp: the optimiser has no way to
know a cheatcode mutates block context, so it reused the earlier read. Timestamps are now
passed explicitly into the assessment builder rather than read inside it. [Inferensi] Any
future time-travelling test in this repository should do the same.

## 8. Carried forward

1. **The token-mapping defect from T0.2 §2.2 is still open.** `tokenAddresses.ts:39` points at
   the unwrapped `NVDAx` while the pool and index poller use `wNVDAx`. T1.1's types make the
   mapping explicit but do not resolve which address is correct for the supported-asset set.
   This must close in T2.2 before any mapping authorises an action.
2. **`officialEvidencePassed` is currently an input, not a computation.** The bonded
   parse-agreement path exists in the prototype but is not yet wired into `promote()`. T2.1
   owns that connection.
3. **Market confirmation is a parameter, not an implementation.** Every `PROTECT` in this
   phase is conditional on a `ConfirmationStatus` supplied by the caller. T3.1–T3.3 build the
   engine that produces it; until then, no scenario's `PROTECT` has been demonstrated
   end-to-end against real market data.
4. **Nothing is deployed.** These contracts compile and pass tests locally. T7.2 owns testnet
   deployment, and no address may be published until then.
5. **`forge build` emits `block-timestamp` lint warnings.** They are expected: a time-decay
   policy necessarily compares against block time. The exposure is bounded by the envelope —
   a validator shifting the clock can at most move the fee within `[baseFee, maxFee]` or end a
   protection slightly early, neither of which escapes the guarantees.
