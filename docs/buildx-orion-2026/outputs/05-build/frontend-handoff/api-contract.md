# API contract

What the frontend can read, from where, with which parameters, what comes back when things go
wrong, and how stale any of it may be. Tracker §0.23 item 2.

Written by the non-frontend lane. If something here is wrong or missing, ask that lane — do not
work around it by scraping logs or decoding contract output by hand (§0.23 forbids that
explicitly, and every decoder you would need already exists below).

---

## 0. Read this first — the one thing that will bite you

**X Layer's public RPC serves stale reads.**

This was measured, not theorised. During the T4.2 testnet run a `postAssessment` transaction
confirmed, its own `AssessmentPosted` event decoded to `PROTECT`, and the very next
`currentRecord()` call returned the **previous `WATCH` record, 13 seconds older** — while the
swap in that same scene was correctly charged 20,000 pips by the pool. The RPC is
load-balanced, so a read issued immediately after a confirmed write can be answered by a node
at an older block height.

Measured convergence lag: **2,519–2,746 ms per write** (five observations, all converged after
3 attempts). The harness now waits until a read reflects the confirmed write, and throws if it
never converges.

**Consequence for any consumer, including this frontend:**

> A client polling `currentRecord` can read `NORMAL` while a `PROTECT` is live.

For a risk registry that is the dangerous direction — you under-report danger, silently. So:

- **Do not poll `currentRecord` and treat the answer as current.**
- **Follow the `AssessmentPosted` event** (`eth_getLogs` / a subscription) and use the block
  number it arrived at, **or** pin every read to an explicit block number (`eth_call` with a
  block tag, not `"latest"`).
- If you must poll, re-read until two consecutive responses agree **and** the block number is
  at or beyond the block of the write you are tracking. Treat a disagreement as "not yet
  known", never as "state changed back".
- Show the block number you read at. A risk state with no height attached is not checkable.

This limitation is also recorded in `known-limitations.md` and in
`deployed-addresses.json.network.rpcWarning` (where a schema `pattern` stops it being softened
away).

---

## 1. What actually exists, by transport

| Path | Transport | Status | Use it for |
|---|---|---|---|
| Repository fixtures | file read, no server | ✅ **primary** | all UI development |
| `TinjauRiskRegistry` on chain 1952 | JSON-RPC | ✅ deployed, working addresses | live/demo readback |
| Legacy scoreboard API | HTTP | ⚠️ deployed but **stale** | nothing judge-facing yet |
| A REST API for the new risk pipeline | HTTP | ❌ **does not exist** | — |

There is **no HTTP service that serves `RiskRecordView`**. The new pipeline is library code plus
fixtures plus an on-chain registry. Do not design a screen around an endpoint that has no
producer.

---

## 2. Fixture path — the one you should build against

Deterministic, offline, byte-stable. Re-running the generator must produce identical files.

### 2.1 Files and their schemas

| File | Validates against |
|---|---|
| `frontend-handoff/scenario-rumor-watch.json` | `scenario-result.schema.json` |
| `frontend-handoff/scenario-confirmed-protect.json` | `scenario-result.schema.json` |
| `frontend-handoff/three-policy-comparison.json` | `proof-of-protection.schema.json` |
| `frontend-handoff/deployed-addresses.json` | `deployed-addresses.schema.json` |

Inside the two scenario files:

- `.record` → validates against `risk-record.schema.json` (the §0.24 view model)
- `.evidenceGraph` → validates against `evidence-graph.schema.json`

Both `$ref`s are resolved against the real published schema files by the checker, so if the
schema says something, the artifact agrees.

### 2.2 Verify it yourself

```bash
node docs/buildx-orion-2026/outputs/05-build/frontend-handoff/tools/validate.mjs
```

Exit 0 means every artifact validates, every §0.23 artifact is present, 21 deliberate mutations
were rejected, and a set of load-bearing facts still hold (Tinjau never protects on a canonical
replay, `canClaimLossAvoided` is false, the OKX leg is unavailable, addresses are non-final, no
key material is present). Zero npm dependencies; Node 18+.

The same script runs inside the server suite as `apps/server/test/frontendHandoff.test.ts`, so
`pnpm test` fails if an artifact drifts.

### 2.3 Regenerate

```bash
cd apps/server
npx tsx ../../docs/buildx-orion-2026/outputs/05-build/frontend-handoff/tools/generate.ts
```

No network, no clock. Every timestamp comes from a frozen fixture or a recorded on-chain run.

### 2.4 Upstream fixtures, if you want the raw inputs

- `apps/server/scenarios/manifest.json` — the frozen asset, pool, and all four scenarios
- `apps/server/scenarios/scenario-*.json` — the source-linked evidence sets
- `apps/server/scenarios/benchmark-preregistration.json` — the frozen benchmark method
- `apps/server/src/market/fixtures/pool-scenario-*-swaps.json` — the captured swap windows
- `docs/.../05-build/t4-demo-manifest-xlayer-testnet*.json` — the full decoded on-chain runs

### 2.5 Which scenarios exist, and what they resolve to

| Scenario | State | Confidence | Market leg | Artifact |
|---|---|---|---|---|
| A — rumour containment | `WATCH` | LOW | `UNAVAILABLE` | `scenario-rumor-watch.json` |
| B — official 8-K (canonical replay) | `WATCH` | MEDIUM | `NOT_CONFIRMED` | *(not published separately)* |
| B — official 8-K, **CONSTRUCTED** market | `PROTECT` | HIGH | `CONFIRMED` | `scenario-confirmed-protect.json` |
| C — two origins, one self-revised | `WATCH` | LOW | `NOT_CONFIRMED` | *(not published separately)* |
| D — neutral Form 4 | `NORMAL` | LOW | `NOT_CONFIRMED` | *(not published separately)* |

**Tinjau reaches `PROTECT` on none of the four frozen replay scenarios.** The only `PROTECT`
anywhere in this handoff comes from constructed market inputs on a builder-controlled testnet
pool, and `scenario-confirmed-protect.json` carries a `criticalCaveat` block saying so. The
schema makes that block **structurally required** whenever `provenance.outcomeOrigin` is
`CONSTRUCTED_MARKET_INPUTS`, and rejects the document if the two are relabelled apart.

---

## 3. On-chain read path — the real "API"

The §0.12 requirement is that a third party can read the risk record **without trusting
Tinjau's dashboard**. So the registry is the API. There is no auth, no key, no rate limit
beyond the RPC's own.

### 3.1 Endpoint

```
POST https://testrpc.xlayer.tech
Content-Type: application/json
```

Standard Ethereum JSON-RPC. Chain id **1952** (X Layer Testnet). Contract addresses are in
`deployed-addresses.json` — **T4.2 working addresses, not final**; T7.2 owns the authoritative
list, so do not hardcode them into anything a judge sees without checking first.

### 3.2 Read functions

Every one is a `eth_call`. Selectors are published so no keccak implementation is needed at
runtime, and `tools/risk-reader/test/anvil-e2e.sh` re-derives all twelve with `cast sig` and
fails if one drifts.

| Function | Selector | Inputs | Outputs |
|---|---|---|---|
| `currentRecord(address,bytes32)` | `0x92a22538` | `asset`, `poolId` | 12 static words, see below |
| `effectiveState(address,bytes32)` | `0x2a5915f3` | `asset`, `poolId` | `uint8 state`, `uint24 fee`, `uint64 endsAt` |
| `envelope()` | `0x0ee8b522` | — | `baseFee`, `maxFee`, `widenDuration`, `decayDuration`, `maxProtectDuration`, `cooldown` |
| `schemaVersion()` | `0x4e2ce6d3` | — | `bytes32` ASCII, e.g. `tinjau.risk/1.0.0` |
| `policyVersion()` | `0x58355ead` | — | `bytes32` ASCII |
| `paused()` | `0x5c975abb` | — | `bool` |
| `supportedAsset(address)` | `0xd82e66fa` | `asset` | `bool` |
| `historyLength(address,bytes32)` | `0x58e14f53` | `asset`, `poolId` | `uint256` |
| `key(address,bytes32)` | `0xbd6ca44b` | `asset`, `poolId` | `bytes32` |
| `lastProtectEndedAt(bytes32)` | `0xad987042` | `key` | `uint64` |
| `assessor()` | `0x1821d696` | — | `address` |
| `guardian()` | `0x452a9320` | — | `address` |

`currentRecord` returns `RiskRecord`, an **all-static tuple**: 12 consecutive 32-byte words
with no head offset.

```
asset, poolId, state(uint8), confidence(uint8), dataMode(uint8), confirmation(uint8),
reasonBits(uint32), assessedAt(uint64), expiresAt(uint64), protectStartedAt(uint64),
evidenceCommitment(bytes32), policyVersion(bytes32)
```

**Write functions are deliberately not in the published ABI** (`postAssessment`, `setPaused`,
`rotateAssessor`, `setAssetSupported`). A consumer of a risk record never needs them.

### 3.3 Do not hand-roll a decoder

`tools/risk-reader/` is a complete reference consumer: Node, zero npm dependencies, its own ABI
and selectors, importing nothing from `apps/server`. It decodes every field into words,
expands each reason bit into a code **and a sentence**, and refuses an undefined reason bit or a
newer schema version rather than ignoring it.

```bash
node tools/risk-reader/tinjau-risk-read.mjs \
  --rpc-url https://testrpc.xlayer.tech --chain-id 1952 \
  --registry <address from deployed-addresses.json> \
  --asset <address> --pool-id <bytes32> --json

node tools/risk-reader/tinjau-risk-read.mjs --print-abi
node tools/risk-reader/tinjau-risk-read.mjs --explain-reason-bits 0x00070100   # offline
```

The reason-bit map also lives at `tools/risk-reader/abi/reason-bits.json`.

### 3.4 Stored state versus effective state — read both

`currentRecord()` returns storage **verbatim**. `effectiveState()` applies expiry and the
duration cap.

After a protection decays, the stored record **still reads `PROTECT`**: expiry is applied at
read time rather than by erasing history. A consumer that acts on the stored state alone
applies protection the registry no longer authorises.

**Always read both and show the divergence.** The reference reader ends every run with an
explicit `AGREE` / `*** DIVERGE ***` verdict for exactly this reason.

### 3.5 The event to follow

```solidity
event AssessmentPosted(
    bytes32 indexed key,
    address indexed asset,
    bytes32 indexed poolId,
    RiskState state,
    uint32   reasonBits,
    uint64   assessedAt,
    uint64   expiresAt,
    bytes32  evidenceCommitment
);
```

Also emitted: `ProtectionEnded(bytes32 indexed key, uint64 endedAt)`,
`PausedSet(bool, address indexed)`, `AssessorRotated(address indexed, address indexed)`,
`AssetSupportSet(address indexed, bool)`.

Per §0 above, **the event is the reliable signal, not a poll**. Keep the log's `blockNumber` and
pin subsequent `eth_call`s to it.

### 3.6 Error and degraded behaviour on this path

| Situation | What you observe | What it means | What to render |
|---|---|---|---|
| Never assessed | `currentRecord.assessedAt == 0` | No record was ever written | "No assessment" — **not** `NORMAL` as a finding. `NORMAL` is on-chain ordinal 0, so an unwritten record is indistinguishable from `NORMAL` by state alone. |
| Read is behind a known write | stale record, older `assessedAt` | The RPC answered from an older node | Retry / pin to block. **Never** render it as a state change. |
| Registry paused | `paused() == true` | New protections are blocked | The hook fails closed to `baseFee` while the record, its history and its clock are untouched. A pause can only ever **shorten** protection, never extend it. |
| Protection lapsed | `effectiveState.state != currentRecord.state` | Deterministic recovery happened | Show effective, and disclose the divergence. |
| RPC range error / timeout | JSON-RPC error, or a short log range | The public RPC is flaky: 76 retries over 1,088 calls (~7%) during fixture capture | Retry with backoff and small log ranges. Show a degraded indicator; do not silently show old data as fresh. |
| Undefined reason bit | a bit the map does not name | Should be impossible — `validateReasonBits` rejects them on write | **Refuse**, do not ignore. The reference reader refuses. |
| Newer `schemaVersion()` | not `tinjau.risk/1.0.0` | The registry outran your decoder | **Refuse**, do not guess. |

### 3.7 Freshness and caching on this path

- There is **no cache layer**. Freshness is whatever the RPC gives you, subject to §0.
- The registry stores its own `assessedAt` and `expiresAt` (epoch seconds). Judge freshness from
  those, not from when your request returned.
- `marketConfirmation.observedAt` in the view model is **nullable**. `null` means **nothing was
  observed**. Do not compute `age = now - observedAt` without a null check, and do not
  substitute the assessment instant — that would let a leg that was never observed read as
  perfectly fresh.
- Nullity tracks *"was anything observed"*, **not** the `UNAVAILABLE` status. A window whose
  sample is below the engine's floor is `UNAVAILABLE` yet **has real observations and keeps its
  timestamp**. `UNAVAILABLE ⟹ null` is a false invariant; do not build one.
- A quoted fee (`previewFee`) is an **upper bound** during decay. Measured on chain:
  previewed 9,730 against 9,470 actually charged, because the fee is continuous in time and
  seconds pass between quote and inclusion. That is not a discrepancy and must not be rendered
  as one.

---

## 4. Legacy scoreboard HTTP API

This is the **old** corporate-events service, not the new risk pipeline. It predates the
`NORMAL/WATCH/PROTECT` model.

### 4.1 Run it

```bash
cd apps/server && pnpm tsx src/scoreboard-api/main.ts
```

Requires `TINJAU_STATE_DIR` to be set and to exist; it refuses to start otherwise.
`SCOREBOARD_API_PORT` defaults to **8787**.

### 4.2 Routes

| Method | Path | Success | Body |
|---|---|---|---|
| `GET` | `/health` | 200 | liveness |
| `GET` | `/scoreboard` | 200 | registry events joined with index-reaction data |

Response codes:

| Code | When | Body / headers |
|---|---|---|
| 200 | ok | JSON |
| 404 | unknown path | `{"error":"not found"}` |
| 405 | any method other than GET | `{"error":"method not allowed"}`, `Allow: GET` |
| 429 | over 60 requests/minute per source IP (fixed window) | `{"error":"rate limit exceeded","retryAfterSeconds":N}`, `Retry-After: N` |

### 4.3 Caching

Recomputed **at most once per 30 seconds** (`CACHE_TTL_MS = 30_000`). A request inside that
window is served from the last computation. There is no `Cache-Control` header and no ETag;
the cache is server-side only.

### 4.4 CORS

**There are no CORS headers, deliberately.** The only intended caller is a Vercel server-side
Route Handler (`apps/web/src/app/api/scoreboard/route.ts`) doing a server-to-server fetch. CORS
polices cross-origin *browser* requests, which this is not. Adding
`Access-Control-Allow-Origin` would be unused attack surface.

**So: do not fetch this service directly from browser JavaScript.** Proxy it through your own
route handler, as the existing app already does. If you genuinely need a browser-direct call,
ask the non-frontend lane rather than adding the header yourself — it changes the service's
threat model.

There is no auth token either: `/scoreboard` re-serves data that is already public on chain, so
a bearer token would protect nothing that is not open elsewhere.

### 4.5 ⚠️ The deployed copy is stale — do not cite it

`https://tinjau.xyz/api/scoreboard` currently returns an event labelled
`"8-K — bankruptcy_or_restructuring"` for NVDAx **with no source field at all**. That document
was fabricated by this project for a pipeline test. **As served today the API asserts a false
corporate event about a real company.**

The fix — an additive `provenance` object built from the on-chain `sourceUrl` /
`sourceContentHash` — exists in code and is tested, but is **not deployed** (T7.3 owns the
redeploy).

Until then: **do not cite that endpoint, do not screenshot it, do not link judges to it.**

When it does redeploy, each entry carries:

```ts
interface EventProvenance {
  sourceClass: "OFFICIAL" | "NEWS" | "RUMOR" | "UNKNOWN";
  dataMode: "OBSERVED" | "SIMULATED" | ...;
  isSimulated: boolean;   // true for anything a reader must not take as a real event
  sourceUrl: string;      // the exact on-chain value, unmodified
  sourceContentHash: string;
  label: string;          // plain-language warning for any consumer that renders it
}
```

Classification **fails closed**: an unrecognised URL scheme is `UNKNOWN` with
`isSimulated: true`. Render `isSimulated` unmistakably.

---

## 5. Field semantics you must not get wrong

These are product requirements, not styling preferences. Each exists because getting it wrong
would make the interface assert something untrue.

1. **`dataMode: "SIMULATED"` must be unmistakable.** One frozen claim is fabricated by this
   project as a safety test. It carries `sourceUrl: null` and a `simulated://` id. If it renders
   like a real source, the screen is lying.

2. **Record-level `dataMode` is the least-live mode present.** Scenario A reads `SIMULATED`
   overall although four of its five claims are genuinely replayed. This deliberately
   *over-states* how synthetic the record is; per-claim truth lives in `evidence[].dataMode`.

3. **Show `usableOriginCount`, not `independentOriginCount`.** Scenario C has two apparent
   origins but only one that may corroborate, because the other revised its own figure. "2
   independent sources" beside a `WATCH` makes a precisely-reasoned decision look arbitrary.

4. **`action.authorized` is false for every state except `PROTECT`.** A `WATCH` that appears to
   authorise a fee change contradicts the product's central safety claim.

5. **`UNAVAILABLE` and `NOT_CONFIRMED` are different.** "We could not look" and "we looked and
   saw nothing" must not render the same.

6. **`ANTI_WICK_FAILED` and `PERSISTENCE_UNOBSERVED` are different.** The first is a positive
   finding — we watched the hold interval and the move retraced. The second means the interval
   was unreachable or too sparse and we know nothing either way.

7. **Non-promotable claims are displayed, not hidden.** A claim rejected for missing provenance
   is part of *why* the state is what it is. Two frozen claims are paywalled WSJ originals with
   no retrievable URL — hiding them would make a `WATCH` unexplainable.

8. **`publishedAtPrecision` is real.** Several frozen claims are known only to the day. Do not
   render a fake time.

9. **Observed versus counterfactual.** Every metric in `three-policy-comparison.json` carries a
   `basis` marker. The two must never share a visual treatment.

10. **A constructed outcome must be labelled constructed, at the same visual weight as the state
    itself.** See `scenario-confirmed-protect.json.criticalCaveat.uiRequirement`.

---

## 6. Known integration blocker (frontend lane owns the fix)

`apps/web/src/lib/risk/model.ts` `REASON_CODES` is missing three codes the published
`risk-record.schema.json` carries:

- `INSUFFICIENT_SAMPLE`
- `PERSISTENCE_UNOBSERVED`
- `UNKNOWN_COMPANY`

`scenario-rumor-watch.json`'s record emits `INSUFFICIENT_SAMPLE`, so
`apps/web/src/lib/risk/validate.ts` **throws on a record that is valid against the published
schema**. Any frontend fed real orchestrator output fails on scenario A.

The non-frontend lane is forbidden from touching `apps/web/**` (§0.22), so this is reported, not
fixed. Diff `model.ts` against the **current** `$defs.reasonCode.enum` in
`risk-record.schema.json`, not against any list written down elsewhere — the enum moved three
times during this session.

---

## 7. Versioning

| Artifact | Version | Note |
|---|---|---|
| `risk-record.schema.json` | `$id .../risk-record/1.0.1.json` | `schemaVersion` field stays `tinjau.risk/1.0.0` |
| `evidence-graph.schema.json` | `tinjau.evidence-graph/1.0.0` | |
| `proof-of-protection.schema.json` | `tinjau.proof-of-protection/1.0.0` | |
| `scenario-result.schema.json` | `tinjau.scenario-result/1.0.0` | |
| `deployed-addresses.schema.json` | `tinjau.deployed-addresses/1.0.0` | |
| confirmation rules | `tinjau.confirm/2.0.0` | major bump: F2's fix is two-sided |
| policy | `tinjau.policy/1.0.0` | |

`risk-record`'s `$id` is `1.0.1` while its `schemaVersion` **field** stays `tinjau.risk/1.0.0`
on purpose: `observedAt` became nullable, but no on-chain vocabulary changed — no enum, ordinal
or reason bit moved, and `observedAt` never goes on chain. Bumping the field would break parity
with the Solidity constant over something the contract does not carry. Widening keeps every
previously-valid document valid.

`contracts/src/TinjauRiskTypes.sol` is the source of truth for every enum ordinal and reason-code
bit. `apps/server/test/riskTypesParity.test.ts` parses that Solidity file and fails if the
TypeScript mirror or the published schema drifts from it. Fields will not be removed or
repurposed without a version bump and a recorded migration (§0.24).
