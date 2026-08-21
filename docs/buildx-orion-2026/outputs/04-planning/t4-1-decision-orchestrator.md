# T4.1 — The decision orchestrator

Build evidence for task T4.1 in `tinjau-lp-risk-autopilot-task-tracker.md`.

- Task: combine the structured Evidence Graph and the market confirmation into a **signed,
  explainable assessment**
- Acceptance: output contains inputs, rule version, state, reason, confidence band, expiry,
  proposed bounded action, and explanation; **retrying the same event is idempotent**
- Depends on: T1.2 (promotion), T2.3 (Evidence Graph), T3.3 (market confirmation)
- Code: `apps/server/src/decision/`
- Tests: `apps/server/test/decision*.test.ts` — **72 tests, all passing**
- Schema revision in use: `risk-record/1.0.1.json` (see §12, finding 2)

## 1. What was built

| File | Role |
|---|---|
| `src/decision/orchestrate.ts` | `decide()` — composes the layers into a `Decision` |
| `src/decision/viewModel.ts` | §0.24 `RiskRecordView`, transcribed and schema-checked |
| `src/decision/commitment.ts` | the evidence commitment and its byte-exact preimage |
| `src/decision/eip712.ts` | typed-data definition, digest, signing, key handling |
| `src/decision/envelope.ts` | the bounded-action envelope and the fee **proposal** rule |
| `src/decision/scenarioRunner.ts` | runs a frozen scenario end to end through the real modules |
| `src/decision/index.ts` | the surface T4.2 and T5 should import |

The orchestrator makes **no decision of its own**. Every judgement is delegated:

```text
state / reasons / confidence / expiry  -> risk/promote.ts            (T1.2)
independence / self-revision / recency -> evidence/graph.ts          (T2.3)
which claims may corroborate           -> evidence/evaluate.ts       (T2.4)
company -> token -> pool               -> evidence/assets.ts         (T2.2)
market verdict                         -> market/confirm.ts          (T3.3)
fee band and duration cap              -> contracts/TinjauRiskPolicy (T1.3)
```

What T4.1 adds is composition, an evidence commitment, a stable identity, the ABI shape, and
one defensive downgrade (§6.2).

## 2. Trust boundary (§0.6)

`decide()` contains no model call, no network call, no clock read, no randomness, and no
threshold that is not already frozen elsewhere. Time enters as the required `now` parameter and
is never defaulted — `decide({ now: NaN })` throws `DecisionInputError` rather than reading a
clock.

Proven, not asserted:

- `the same inputs always produce the same output, field for field` — two calls compared with
  `deepEqual` across the record, the ABI struct, the id and the digest;
- `time enters only as a parameter: nothing changes when the wall clock does` — two calls
  separated by 25 ms of real elapsed time with the same `now`, byte-identical;
- `no source file in src/decision logs, prints, or stringifies a key` — a structural scan, since
  no behavioural test would catch a debug line added later;
- `the assessor key is never read implicitly while building an assessment` — `orchestrate.ts`
  contains neither `process.env` nor `assessorKeyFromEnv`, so an unsigned path cannot require
  production credentials.

## 3. The evidence commitment — `tinjau.evidence-commitment/1.0.0`

`evidenceCommitment = keccak256(utf8Bytes(preimage))`.

The preimage commits **only to fields the published record itself carries**, so a third party
recomputes it from the `RiskRecordView` JSON alone — no repository access, no internal
identifier, no code from this project.

### 3.1 Header — four lines, each terminated by LF (`0x0A`)

| Line | Content |
|---|---|
| 1 | the literal `tinjau.evidence-commitment/1.0.0` |
| 2 | `assetAddress`, lowercased, `0x`-prefixed |
| 3 | `poolIdOrAddress`, lowercased |
| 4 | number of claims, base-10 ASCII, no padding |

### 3.2 Records — one per claim

Claims are sorted **ascending by `claimId` compared as UTF-8 bytes** — not UTF-16 code units,
and not with any locale collation. Each record is sixteen fields joined by US (`0x1F`) and
terminated by LF (`0x0A`), including the last record. The field order is exactly §0.24's
declaration order for `EvidenceClaimView`:

```text
 1 claimId            2 sourceClass          3 dataMode           4 sourceUrl
 5 sourceId           6 publisherOrAuthor    7 publishedAt        8 company
 9 tokenSymbol       10 tokenAddress        11 eventType         12 claimTextOrPointer
13 independenceGroup 14 relation            15 officialConfirmation
16 expiresAt
```

Encoding rules:

- `null` encodes as the **empty string** (only `sourceUrl`, `publisherOrAuthor`, `expiresAt`
  are nullable);
- booleans are the lowercase ASCII words `true` / `false`;
- `tokenAddress` is lowercased; every other string is committed verbatim, including case;
- timestamps are committed exactly as they appear in the published record.

Refusals — these throw rather than producing a hash:

- any field containing US (`0x1F`) or LF (`0x0A`). Escaping instead would break injectivity:
  `{"a\x1fb", "c"}` and `{"a", "b\x1fc"}` would hash identically, and injectivity is the one
  property a commitment must have;
- a duplicated `claimId`, because the sort order would be ambiguous.

An empty set still produces a non-zero hash (header + LF), which matters because the registry
reverts on `ZeroEvidenceCommitment()`.

### 3.3 Worked example

For one claim, the preimage is literally:

```text
tinjau.evidence-commitment/1.0.0\n
0xa8ddb5cd96b5222afe198316e9a57caa642850d5\n
0x2a2b11730c2b6d99a58034a869dd810d7300a7b2\n
1\n
claim-1␟NEWS␟REPLAY␟https://example.com/a␟example.com/a␟Example␟2026-08-17T12:00:00Z␟NVIDIA CORPORATION␟wNVDAx␟0xa8ddb5cd96b5222afe198316e9a57caa642850d5␟CONTINGENT_FINANCIAL_OBLIGATION␟pointer#claimText␟news:example␟ORIGIN␟false␟2026-08-18T12:00:00Z\n
```

(`␟` is US, `0x1F`; `\n` is a literal LF.) `decisionCommitment.test.ts` builds this expectation
by hand and compares it to the implementation, so the **published definition is the side that
wins** if the two ever disagree.

### 3.4 What it does not prove

It commits to the evidence the record **published**. It is not proof the evidence is true, that
a source said what a pointer claims, or that nothing was omitted. `sourceContentSha256` on the
frozen fixtures is the byte-level check on individual OFFICIAL documents; this is the set-level
check that the record was not edited after the fact.

## 4. Idempotency

### 4.1 `assessmentId`

`keccak256` over twenty LF-terminated lines, documented in full at `computeAssessmentId` in
`orchestrate.ts`: the id version, `eventKey`, four rule versions, chain id, registry address,
asset, pool id, reason bits, confidence, data mode, confirmation status, `assessedAt`,
`expiresAt`, `protectStartedAt`, the evidence commitment, the requested fee, and the state.

Two properties, both tested:

- **idempotent** — ten retries of the same event with the same inputs produce **one** id and
  **one** nonce (`retrying the same event with the same inputs is idempotent`);
- **sensitive** — changing `eventKey`, `chainId`, `registryAddress`, the evidence set, or the
  market status all change the id (`every decision-relevant field is covered by the
  assessmentId`).

`now` enters only through `assessedAt`. Re-assessing the same event one second later is a
*different* assessment and gets a different id, which is why a continuing PROTECT's
`protectStartedAt` is carried separately rather than re-derived from `now`.

### 4.2 The nonce is derived, not counted

`nonce = uint128(assessmentId[0:16])`. Two identical assessments therefore carry the same nonce
and the registry's replay protection refuses the second. That is what idempotency has to mean on
chain: **a retry cannot produce a second record.**

### 4.3 No ratcheting

A continuing PROTECT keeps its **original** `protectStartedAt`, mirroring
`TinjauRiskRegistry.postAssessment`. The test refreshes at +60 s, +120 s, +600 s, +3 600 s and
+18 000 s and asserts that `protectStartedAt` and `expiresAt` never move, and that
`remainingProtectSec` **shrinks** rather than resetting. Without this, an assessment refreshed
every minute would push the duration cap forward forever and the bounded action would quietly
become a permanent one. A refresh at the cap emits `EXPIRED` + `DECAYED_TO_BASELINE` and stops
protecting rather than starting a new interval.

## 5. Signing

EIP-712, transcribed from `contracts/src/TinjauRiskRegistry.sol` and **checked against the
Solidity source by parsing it**, not against a second copy of the same assumption. A typed-data
mistake produces a bare `BadSignature()` on chain with no diagnosis, so:

- the typehash string is regex-extracted from the contract and compared character for character;
- `ASSESSMENT_TYPES` regenerates that same string, so the array and the constant cannot drift;
- the domain name, version and `EIP712Domain` type string are all located in the constructor;
- the digest from our hand-rolled `abi.encode` mirror is compared against viem's independent
  `hashTypedData` — two derivations agreeing, not one repeated;
- all thirteen struct members are mutation-tested against the digest;
- signatures are asserted low-`s` across twelve nonces, since the registry rejects the malleable
  high half of the curve.

**Key handling.** The production key comes from `TINJAU_ASSESSOR_PRIVATE_KEY` via
`assessorKeyFromEnv`, the only implicit key source in the codebase. It is never logged, never
serialised into a record or document, and its error paths report the variable **name** only —
tested with a secret-looking malformed value that must not appear in the message. Tests use an
obviously-fake constant (thirty-two `0x11` bytes) defined only in the test file, and touch no
network: signing is local elliptic-curve arithmetic.

## 6. Fail-closed behaviour

### 6.1 The invariant that is easy to get backwards

Two halves of §0.7, both tested across `NOT_CONFIRMED` / `UNAVAILABLE` / `STALE`:

- degraded market data can never **create** a new PROTECT;
- degraded market data does **not cancel** a protection already running — it continues on its
  original expiry and decay schedule.

Cancelling early would hand an attacker a way to disable the pool's defence by degrading one
feed, which is the opposite of failing closed.

### 6.2 Two guards added here

**Stale-CONFIRMED downgrade.** A `CONFIRMED` verdict older than `marketFreshnessSec` becomes
`STALE` in the record, the reason codes and the on-chain struct alike. Freshness is decided by
the promotion engine, not accepted from the market layer.

**Unfreshenable-CONFIRMED downgrade.** A `CONFIRMED` verdict carrying no observation timestamp
cannot be freshness-checked, so it fails closed to `UNAVAILABLE`. The current engine cannot
produce that shape; this is a guard against future change in a module T4.1 does not own.

### 6.3 Reason-code merge

The market engine's four **verdict** codes (`MARKET_CONFIRMED`, `MARKET_NOT_CONFIRMED`,
`MARKET_DATA_STALE`, `MARKET_DATA_UNAVAILABLE`) are dropped on merge, because `promote()`
re-derives the effective status after its own freshness bound and emits the right one. Keeping
both would let a record carry `MARKET_CONFIRMED` beside `MARKET_DATA_STALE` — not a nuance, a
contradiction. Every **diagnostic** code survives (`ANTI_WICK_FAILED`, `THIN_EXIT_DEPTH`,
`REFERENCE_MARKET_CLOSED`, `INSUFFICIENT_SAMPLE`, `PERSISTENCE_UNOBSERVED`), because those say
*why*. The unedited market result is preserved separately in
`record.marketConfirmation.reasonCodes`.

### 6.4 Explanation fidelity (§0.12)

Each unresolved-asset outcome emits its own code and **none of the others** — the specific
defect logged when a previous agent emitted `UNSUPPORTED_ASSET` for an unknown company. Tested:
an unknown company emits `UNKNOWN_COMPANY` and neither `UNSUPPORTED_ASSET` nor
`AMBIGUOUS_ENTITY`; a known company whose token has no pool emits `UNSUPPORTED_ASSET` and
neither of the others.

## 7. The bounded action is a PROPOSAL

`action.status` is `PENDING`, never `APPLIED`. This assessment applies nothing; T4.2 owns the
transaction and is the only thing entitled to write `APPLIED`, `FAILED`, or a `txHash`.

The envelope is the deployed one (`baseFee 500`, `maxFee 20000`, widen 3 600 s, decay 18 000 s,
cap 21 600 s, cooldown 3 600 s). Policy targets by confidence band, mirroring
`TinjauRiskPolicy.targetFeeForConfidence` with the same truncating integer division:

| Band | Target (pips) |
|---|---|
| LOW | 7 000 |
| MEDIUM | 13 500 |
| HIGH | 20 000 |

**T1.3 guarantee 4** is enforced here as well as on chain: a request above the target is clamped
**down**, never honoured. Tested at `target - 1` (honoured), `target + 1` (clamped), `0`
(floored at `baseFee`) and `1 000 000` (clamped). Written as an explicit `Math.min` so no future
edit can turn it into a `max`. A compromised assessor's worst case is under-protection.

## 8. The four frozen scenarios, end to end

Every stage is the production module: normalisation (T2.1) → Evidence Graph (T2.3) → asset
resolution (T2.2) → market confirmation over the captured mainnet swap window (T3.3) →
`decide()` (T4.1). Nothing is stubbed and no fixture carries a pre-baked answer.

| Scenario | State | Confidence | Market leg | Data mode |
|---|---|---|---|---|
| A — rumour containment | `WATCH` | LOW | `UNAVAILABLE` | `SIMULATED` |
| B — official 8-K | `WATCH` | MEDIUM | `NOT_CONFIRMED` | `REPLAY` |
| C — two origins, one revised | `WATCH` | LOW | `NOT_CONFIRMED` | `REPLAY` |
| D — neutral Form 4 | `NORMAL` | LOW | `NOT_CONFIRMED` | `REPLAY` |

All four match their T1.2 promotion outcomes. **No scenario authorises the aggressive fee path**
(`authorized: false`, `requestedFee: null`, `requestedFee: 0` in the ABI struct).

Reason codes and commitments as emitted (REPLAY of mainnet data, assessed at each scenario's
market-window end):

| Scenario | `assessmentId` | `evidenceCommitment` |
|---|---|---|
| A | `0xf1b07b46…0b99a2f7` | `0x2db9d614…450180e5` |
| B | `0x7ee562c7…4dda9f11` | `0x25fc54ba…2902010f` |
| C | `0xa2854027…6816ad96` | `0x97526c4c…54b390e3` |
| D | `0x1da9ac0d…a6707ffd` | `0x9aab4141…6f4ef16a` |

### 8.1 Scenario B is a published negative, not a bug

B carries qualifying official evidence — `OFFICIAL_FILING` and `BONDED_EVIDENCE_PASSED` are both
on the record — and is refused by the **market** leg, which is `NOT_CONFIRMED` on the mainnet
replay. T0.2 pre-registered `PROTECT` *conditional on* fresh market confirmation and
pre-registered `WATCH` as the fallback. The fallback is what happened, and it stands.

A clearly-labelled **counterfactual** in `decisionScenarios.test.ts` re-runs B with only the
confirmation verdict replaced by `CONFIRMED`, and it reaches `PROTECT` at confidence `HIGH`.
That isolates *which* leg is refusing — the question a judge will ask — and claims nothing about
the real market. The OBSERVED run is what is published.

### 8.2 Scenario A is the fail-closed case

Zero swaps in the window. The orchestrator produces a valid, complete assessment and neither
throws nor promotes:

- `UNAVAILABLE`, kept distinct from `NOT_CONFIRMED` — "could not look" and "looked and saw
  nothing" never collapse into one;
- the absence of an observation is visible rather than disguised: `blockNumber`,
  `xLayerPoolPrice`, `drawdownBps` are all `null`, `fresh` and `antiWickSatisfied` are `false`;
- still a complete record: commitment, expiry, explanation, and all five evidence claims;
- granting the bonded path as a counterfactual does not move it off `WATCH`;
- a protection *already running* is **not** cancelled by the missing data — it keeps its
  original start and expiry.

### 8.3 Assessment instant

`scenarioRunner` assesses at the **end of the market replay window**, not at the decision anchor.
`promote()` re-judges the market observation's age against `now` with a 900 s bound; assessing
at the anchor would date every observation in the window into the future, so the market leg
would be discarded on timing before its verdict was considered — and a refusal produced that way
would say nothing about the market. At the window end the last observation is 0 s old, which is
the market leg's **most favourable possible timing**. Every scenario still declines, so the
refusal is on the merits.

A test asserts that no claim's in-window status differs between the two instants, so the choice
does not quietly drop evidence.

## 9. Schema conformance

`decisionSchema.test.ts` validates real orchestrator output against the published
`frontend-handoff/risk-record.schema.json` — the file the frontend owner builds against.

The server has no JSON-Schema library, so the test implements the Draft 2020-12 subset the
schema actually uses. Two guards keep that from being self-serving:

1. a test asserts the published schema uses **no keyword the validator does not implement**,
   so nothing is silently ignored;
2. a test feeds the validator **twenty mutations** (unknown key, missing key, bad enum, bad
   const, malformed address, malformed bytes32, non-date timestamp, duplicate reason codes,
   unknown reason code, empty explanation, negative and non-integer durations, unknown keys
   nested in `action` / `evidence` / `marketConfirmation`, bad relation, bad status, plus a
   numeric, a non-date, and a missing `observedAt`) and asserts each is **rejected**. A
   validator that accepts everything would make every other assertion meaningless.

A further test pins the revision: `$id` is `risk-record/1.0.1.json`, `observedAt` is
`["string", "null"]`, and it is **still required** — an omitted field and an explicit `null` are
different facts.

One shape the schema **cannot** express and this suite therefore checks at the orchestrator
level instead: "a non-null `observedAt` on an `UNAVAILABLE` leg". Expressing it would need
`if`/`then`, which the published schema does not use and which is not mine to add — and, as
§10 records, it would be **wrong**: an `UNAVAILABLE` verdict from a below-floor sample has
genuine observations. The correct invariant, tested in `decisionScenarios.test.ts`, is that
`observedAt` and `blockNumber` agree about whether a look happened, and that an unobserved leg
is never `fresh`.

All four scenario records validate, before and after a JSON round-trip. A constructed PROTECT
record validates too, so the authorised branch is covered and not only refusals.

## 10. Decisions worth flagging

**Record-level `dataMode` is the least-live mode present.** Scenario A carries one simulated
rumour beside four genuinely replayed news claims, and the whole record therefore reads
`SIMULATED`. This deliberately **over-states** how synthetic the record is. §0.8 is explicit
that a simulated input must never be presentable as observed, and the exact per-claim truth is
never lost — `evidence[].dataMode` carries each claim's own mode.

**`observedAt` is null when there is no observation.** A window with zero swaps has no
observation to stamp, and since schema `1.0.1` the field is nullable, so the record says `null`
rather than substituting the assessment instant. `fresh` is *forced* to `false` alongside it
rather than merely expected to be — `market/confirm.ts` is owned elsewhere and nothing it
returns should be able to make an unobserved leg look fresh. See §12, finding 2.

**Nullity tracks "was anything observed", not the status.** `UNAVAILABLE` does not by itself
imply a null timestamp: it covers both scenario A's empty window *and* a window whose sample is
below the engine's floor, and the second of those has real observations that must keep their
timestamp. A test records this so the invariant is not later tightened into a false one.

**`freshness` is the AND of both bounds.** The market engine judges the observation's age when
it computes the verdict; `promote()` re-judges it against `now`. The record reports the
conjunction, so it cannot claim `fresh: true` for an observation the promotion engine had
already discarded.

**Unresolved assets still produce a record.** When resolution fails, `assetAddress` falls back
to the claim's own token address (or the zero address), `poolIdOrAddress` is the literal string
`unresolved`, and `postable` is `false`. The registry rejects an unsupported asset outright, so
the assessment is deliberately not submittable — but a complete, explainable record still exists,
which *is* the fail-closed behaviour rather than a degraded version of it.

## 11. Verification

```bash
cd apps/server
pnpm typecheck                      # clean
npx tsx --test 'test/decision*.test.ts'   # 72 tests, 72 pass, 0 fail, 0 todo
pnpm test                           # 525 tests, 525 pass, 0 fail, 0 todo
```

## 12. Findings and limitations

**Finding 1 — the frontend's reason-code list is stale (blocks T6.1/T6.2 integration). OPEN.**
`apps/web/src/lib/risk/model.ts` `REASON_CODES` carries 24 codes; the published schema's
`$defs.reasonCode.enum` carries 27. Missing from the frontend: `INSUFFICIENT_SAMPLE`,
`PERSISTENCE_UNOBSERVED`, `UNKNOWN_COMPANY`. Scenario A's record emits `INSUFFICIENT_SAMPLE`, so
`apps/web/src/lib/risk/validate.ts` would throw on a real orchestrator record even though that
record validates against the published schema. `apps/web` is the frontend owner's lane, so this
is reported rather than fixed.

The count is worth re-deriving rather than quoting: the enum has been extended twice during this
phase (`UNKNOWN_COMPANY` in T2.4, `INSUFFICIENT_SAMPLE` in T3.3, `PERSISTENCE_UNOBSERVED` at bit
22 in T3.4). Whoever fixes `model.ts` should diff it against the **current** enum, not against
any list written down here.

**Finding 2 — the schema forced a timestamp where none exists. RESOLVED 2026-08-21.**

The defect: `marketConfirmation.observedAt` was required and non-nullable, but scenario A's
window contains no swaps, so there was no observation to stamp. The orchestrator substituted the
assessment instant.

Why that was a real defect rather than an inconvenience: a consumer computing
`age = now - observedAt` against a substituted timestamp reads a leg that was **never observed**
as perfectly fresh. That is the same failure shape T3.1 removed when it measured OKX freshness
from source time rather than ingestion time. An absence must not be representable as a reading,
even with `status: UNAVAILABLE` sitting beside it — a consumer that trusts the timestamp field
is not being unreasonable.

The fix, made by the orchestrator owner in the shared schema: `observedAt` is now
`["string", "null"]` and `$id` is bumped to `https://tinjau.xyz/schemas/risk-record/1.0.1.json`.
`schemaVersion` deliberately stays `tinjau.risk/1.0.0` — no on-chain vocabulary changed, no
enum, ordinal or reason bit moved, and `observedAt` never goes on chain, so bumping it would
break parity with the Solidity constant for a field the contract does not carry.

T4.1 now emits `null` wherever nothing was observed, with `fresh` forced to `false` alongside.
Re-running all four scenarios after the change: **exactly one field moved** — scenario A's
`observedAt`, from `2026-07-28T02:33:00.000Z` to `null`. All four assessment IDs, all four
evidence commitments, every state, confidence band, market status and expiry are unchanged.
(A's `fresh` was already `false`, so it did not move either.) Three tests were added: A's null,
the inverse across B/C/D so the null cannot become a lazy default, and the `UNAVAILABLE`-is-not-
null note in §10.

**Limitation 1 — `officialEvidencePassed` is still an input, not a computation.** Carried
forward from the T1.x limitation already in the tracker. `scenarioRunner` defaults it to `true`
so an OFFICIAL scenario is evaluated on its most favourable bonded assumption, and a refusal is
never an artefact of assuming the bond failed. T2.1 owns wiring it to the bonded parse-agreement
path.

**Limitation 2 — no assessment has been posted on chain.** T4.1 produces the signed struct and
the digest; T4.2 owns the transaction. `action.status` is `PENDING` and `appliedFee` / `txHash`
are `null` on every record produced so far. No address may be published from this task.

**Limitation 3 — the `eventKey` is caller-supplied.** Idempotency is defined relative to it. The
scenario runner derives it from the frozen scenario id; a live pipeline would take it from
`evidence/cluster.ts`. Two callers that disagreed about event identity would produce two
assessments for one event, and nothing here can detect that.
