# T6.3 — Reusable risk-record read example (reference consumer)

- Date: 2026-08-21
- Task: T6.3 (depends on T1.4)
- Owner: external non-frontend AI agent
- Artifact: `tools/risk-reader/**`
- Governing context: task tracker §0.12 (X Layer Risk Registry), §0.19 (claim boundary),
  §0.21 (repository map), `t1-risk-model-and-bounded-policy.md` §5

## 0. What this is, and what it is not

**Reference consumer, built by Tinjau.** A small read-only program that decodes the Tinjau risk
record using nothing but a JSON-RPC endpoint and the published ABI.

It is **not** external adoption, **not** a third-party integration, and **not** evidence that
anyone outside this project consumes the registry. Tinjau wrote it and Tinjau ran it. Per §0.19
this document makes no "first on-chain risk registry" claim, and no "first" claim of any kind.

T8.2 ("one genuinely separate registry consumer") is a **different** task and is **not** claimed
here. This artifact is its dependency, not its delivery.

## 1. Status labels used below

Per the project discipline, every statement carries one of:

- **[implemented]** — code exists and was executed;
- **[measured]** — a number produced by an actual run, with the command that produced it;
- **[replayed]** — driven from an immutable fixture rather than live data;
- **[simulated]** — fabricated for a safety test, labeled as such on chain via `DataMode`;
- **[roadmap]** — not built.

## 2. Files created

| Path | Role |
|---|---|
| `tools/risk-reader/tinjau-risk-read.mjs` | the consumer (Node, zero dependencies) |
| `tools/risk-reader/abi/TinjauRiskRegistry.read.abi.json` | hand-transcribed read-only ABI with explicit selectors |
| `tools/risk-reader/abi/reason-bits.json` | the §0.12 bit-to-meaning mapping, machine-readable |
| `tools/risk-reader/README.md` | how to run it, how it fails, claim label |
| `tools/risk-reader/test/anvil-e2e.sh` | end-to-end proof against a local Anvil |
| `tools/risk-reader/test/fixture/foundry.toml` | isolated Foundry project for one fixture |
| `tools/risk-reader/test/fixture/src/FutureSchemaRegistry.sol` | test-only ABI-compatible stand-in |

No file outside `tools/risk-reader/**` and this document was created or edited. No file under
`apps/web/**`, `apps/server/**`, `contracts/**`, or `DESIGN.md` was touched.

**No root-file change is required.** [measured] The repository has no root `package.json` and no
`pnpm-workspace.yaml` (`ls` on the repo root, 2026-08-21). The consumer has no `package.json`,
no dependencies, and no build step, so there is nothing to add to a workspace even if one is
introduced later. The e2e suite asserts this structurally and fails if the directory ever grows
a `package.json` or `node_modules`.

## 3. The command a judge runs

Two commands. The first is the self-contained proof; the second is the consumer on its own.

```bash
# 1. End-to-end: starts a LOCAL anvil, deploys the registry, posts signed assessments,
#    then reads them back with the consumer. Requires Foundry + Node 18+. No npm install.
bash tools/risk-reader/test/anvil-e2e.sh

# 2. The consumer alone, against any chain that has a TinjauRiskRegistry deployed:
node tools/risk-reader/tinjau-risk-read.mjs \
  --rpc-url  http://127.0.0.1:8555 \
  --chain-id 31337 \
  --registry 0x5fbdb2315678afecb367f032d93f642f64180aa3 \
  --asset    0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa \
  --pool-id  0x1111111111111111111111111111111111111111111111111111111111111111
```

### No address may be published yet

[implemented] `--registry` has **no default value** and the consumer refuses to run without it.

**Nothing is deployed.** The final X Layer Testnet deployment is task **T7.2**, which has not
run. No testnet address for `TinjauRiskRegistry` exists, and none may be published before T7.2
completes. The address shown above is Anvil's first deterministic `CREATE` address on a local
chain that exists only for the duration of the test.

## 4. Verification — real runs, real output

Foundry **is** available in this environment. [measured]

```text
$ forge --version && cast --version && anvil --version && node --version
forge Version: 1.7.1
cast  Version: 1.7.1
anvil Version: 1.7.1
v24.10.0
```

### 4.1 Suite result

[measured] Final run, 2026-08-21:

```text
$ bash tools/risk-reader/test/anvil-e2e.sh
...
=== SUMMARY ===
  passed: 59
  failed: 0

$ echo $?
0
```

59 assertions across 10 case groups. Every one is an assertion about output the consumer
actually produced from an `eth_call` against a chain, not a mock.

### 4.2 The headline case — an expired `PROTECT`

[measured] Verbatim stdout, ANSI codes stripped. The registry was deployed to local Anvil, a
signed `PROTECT` assessment was posted, the chain clock was advanced past the record's expiry
with `evm_setNextBlockTimestamp`, and the consumer was then run:

```text
==========================================================================
 TINJAU RISK REGISTRY — REFERENCE CONSUMER READ
 Reference consumer, built by Tinjau. Not external adoption, not an
 integration, not evidence that a third party uses this registry.
==========================================================================

REGISTRY
--------------------------------------------------------------------------
  address                0x5fbdb2315678afecb367f032d93f642f64180aa3
  chain id               31337
  rpc                    http://127.0.0.1:8555
  block / chain time     #4 @ 2026-08-21T02:37:01Z
  schema version         tinjau.risk/1.0.0
  policy version         tinjau.policy/1.0.0
  assessor (writer)      0x70997970c51812dc3a010c7d01b50e0d17dc79c8
  guardian (pause)       0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
  paused                 no

BOUNDED-ACTION ENVELOPE (read from chain, not from a Tinjau claim)
--------------------------------------------------------------------------
  base fee               500 (0.0500%)
  max fee                20000 (2.0000%)
  widen duration         3600s held fully widened
  decay duration         18000s of linear decay back to base
  max protect duration   86400s hard cap on one interval
  cooldown               3600s before protection may re-arm

QUERY
--------------------------------------------------------------------------
  asset                  0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa  [supported by this registry]
  pool id                0x1111111111111111111111111111111111111111111111111111111111111111
  record key             0xdf7e44625a0cd6b99a54ec5c1c3ed8851f97629a88dcf861bf9ba2d1f13d15a9
  history entries        1

STORED RECORD — currentRecord(), storage verbatim
--------------------------------------------------------------------------
  This is what is written on chain. Reading it does NOT apply expiry.

  asset                  0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
  pool id                0x1111111111111111111111111111111111111111111111111111111111111111
  state                  PROTECT  (ordinal 2)
                         A bounded, time-limited fee action is authorised.
  confidence band        HIGH — High confidence. May reach the top of the fee band.
  data mode              REPLAY — Historical data replayed from an immutable fixture. Not live discovery.
  market confirmation    CONFIRMED — Checked and corroborated within the freshness bound. The only value that satisfies a PROTECT gate.
  evidence commitment    0x00000000000000000000000000000000000000000000000000000000000000ee
  policy version         tinjau.policy/1.0.0
  assessed at            2026-08-21T02:25:31Z  (12min ago)
  expires at             2026-08-21T02:36:01Z  (60s ago)
  protect started at     2026-08-21T02:26:01Z  (11min ago)
  last protect ended at  (not set)
  reasonBits             0x00070100  (4 bit(s) set)
    [bit  8] MARKET_CONFIRMED
             The independent market check corroborated the event within the freshness bound.
    [bit 16] OFFICIAL_FILING
             An issuer or regulator filing is present in the evidence set.
    [bit 17] TWO_INDEPENDENT_SOURCES
             At least two genuinely independent origins were found.
    [bit 18] BONDED_EVIDENCE_PASSED
             The bonded parse-agreement path passed for the official document.

EFFECTIVE STATE — effectiveState(), expiry and duration cap applied
--------------------------------------------------------------------------
  This is what a consumer should act on right now.

  state                  NORMAL  (ordinal 0)
                         No material unresolved evidence. Baseline fee only. Also what an unwritten record reads as.
  effective fee          500 (0.0500%)  == base fee, no widening in force
  protection ends at     2026-08-21T02:36:01Z  (60s ago)

STORED vs EFFECTIVE
--------------------------------------------------------------------------
  *** DIVERGE — stored PROTECT, effective NORMAL. ***

  The stored record still says PROTECT because a read never rewrites
  history; the record stands as it was written. But time has moved past it:
    - the record's own expiresAt (2026-08-21T02:36:01Z) has passed;
  so the state to act on is NORMAL and the fee is back at 500 (0.0500%).

  THIS IS THE CASE A NAIVE CONSUMER GETS WRONG. Reading currentRecord() alone and
  acting on "PROTECT" would apply protection that the registry no longer
  authorises. Always take the state from effectiveState().

CLAIM DISCIPLINE
--------------------------------------------------------------------------
  Reference consumer, built by Tinjau, to show the record is independently
  readable. It is not external adoption and not a third-party integration.
  It reads only; it never writes, and the write functions are not in its ABI.
```

The `DataMode` reads `REPLAY` because the posted assessment declared itself replayed. The
consumer prints the mode's meaning verbatim, so a reader cannot mistake fixture-driven input
for live discovery. That labelling is on chain, not in the presentation layer.

## 5. Acceptance against the tracker

> **T6.3 acceptance:** clean-environment command returns and decodes the current record;
> artifact is labeled "reference consumer," not external adoption.

**Met.** [measured]

| Criterion | Evidence |
|---|---|
| clean-environment command | `node tools/risk-reader/tinjau-risk-read.mjs …` — Node 18+ only, no `npm install`, no `package.json`, no build. Verified running from an unrelated cwd (`/Users/scientivan`), exit 0. |
| returns the current record | `currentRecord()` decoded over `eth_call` against local Anvil; output in §4.2. |
| decodes it | every §0.12 field expanded to words; see §6. |
| labeled reference consumer | the label is in the output header, the output footer, the README's first line, the source header, and the `--json` document's `artifactLabel` field. Asserted by the suite. |
| not external adoption | no adoption, integration, customer, or usage claim appears in any artifact. §0.19's prohibited "first" claims are absent. |

## 6. §0.12 coverage — what a third party can read without the dashboard

[implemented] All nine §0.12 minimums are decoded into human-readable form:

| §0.12 requirement | Rendered as |
|---|---|
| supported asset | address, plus whether the registry's supported set contains it |
| pool | pool id, plus the derived record key |
| current state | `NORMAL` / `WATCH` / `PROTECT`, ordinal **and** meaning |
| reason code(s) | **every set bit expanded to its code and a sentence** — never a bare hex mask |
| evidence commitment | `bytes32` |
| confidence band | `LOW` / `MEDIUM` / `HIGH`, with what each permits |
| assessment timestamp | ISO-8601 plus relative age against the chain's own block timestamp |
| expiry | ISO-8601 plus relative age; drives the effective-state verdict |
| policy version | ASCII, unpacked from `bytes32` |

Beyond the minimum it also reads the bounded-action envelope (`baseFee`, `maxFee`,
`widenDuration`, `decayDuration`, `maxProtectDuration`, `cooldown`) off the chain, so a consumer
verifies the fee band and duration cap itself rather than trusting a Tinjau claim about them.
That is the §0.12 sentence "reads cannot depend on trusting Tinjau's dashboard" taken literally.

`reasonBits` is shown in both forms — the raw `0x00070100` and the expanded list — because a
consumer diffing records needs the compact value and a human needs the sentences.

## 7. Stored vs effective — why they are printed separately

[implemented] `currentRecord()` returns storage verbatim; `effectiveState()` applies expiry and
the duration cap. The consumer calls **both**, prints them under separate headings, and closes
with an explicit `AGREE` or `*** DIVERGE ***` verdict naming both values.

The divergence case is not a footnote in the output — it is a banner that names the wrong
behaviour it prevents. [measured] Case B in §4.2: stored `PROTECT`, effective `NORMAL`, fee back
at the 500 base. A consumer reading only `currentRecord()` would have applied a 2% fee that the
registry no longer authorises.

## 8. Failure handling — all four required cases, plus three more

[implemented] Exit codes are part of the interface so a consumer can branch without parsing
prose.

| Case | Behaviour | Exit | Suite case |
|---|---|---|---|
| **no record for this key** | reports `NO RECORD`, and explains that unwritten storage decodes to `NORMAL` but is not the same finding as "assessed and judged normal" (`assessedAt == 0` separates them) | 3 | 5 |
| **expired record** | stored vs effective divergence banner | 0 | 4 |
| **undefined reason bit** | **refuses**; aborts before reporting any effective state | 4 | 7 |
| **paused registry** | banner stating that pause blocks NEW protections only, does not cancel a running one, and does not erase history | 0 | 6 |
| newer `schemaVersion()` | refuses to decode | 5 | 8 |
| chain-id mismatch | refuses before decoding anything | 1 | 9 |
| no bytecode at address / unreachable RPC | distinct messages | 2 / 1 | 9 |

### 8.1 Why the undefined bit is refused rather than ignored

Masking an unknown bit off and reporting the rest would let a newer writer's fact disappear. If
a future schema set a bit meaning "evidence was retracted", a silently-ignoring reader would
render the record as though the retraction never happened. A partially understood record is more
dangerous than an unreadable one, so the consumer stops and does not print an effective state at
all. [measured] Suite case 7 asserts both the refusal **and** the absence of an
`EFFECTIVE STATE` section in that output.

### 8.2 The one place a fixture contract was necessary

[simulated] The real `TinjauRiskRegistry` at schema `tinjau.risk/1.0.0` **cannot** produce the
two records the consumer must refuse: `validateReasonBits` rejects an undefined bit on write,
and v1.0.0 reports v1.0.0 by construction. Both situations are created only by a *future* schema
version.

Testing them offline against the decoder would prove only that a function works. So
`tools/risk-reader/test/fixture/src/FutureSchemaRegistry.sol` is deployed to the local chain and
read over real `eth_call`. It is ABI-compatible with the read surface and returns exactly what
the test asks for. It enforces no rule, validates nothing, stores no history, and its own
`DataMode` field reads `SIMULATED` on chain so it cannot be mistaken for evidence of anything.
It must never be confused with the registry.

The offline path `--explain-reason-bits` is also tested, but as a convenience, not as the proof.

## 9. Independence — enforced, not promised

[implemented] The consumer imports **nothing** from `apps/server/**`. Specifically nothing from
`apps/server/src/scoreboard-api/**`, nothing from `apps/web/**`, and nothing from
`contracts/out/**`.

Its complete import list is two lines:

```js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
```

Both are Node builtins. The only files it opens are the two JSON files in its own `./abi/`
directory.

This matters because reusing Tinjau's own decoding helpers would prove nothing about
third-party readability — it would prove only that Tinjau can read its own output. So the
independence is asserted structurally by the suite (case 10), and any future import will fail
the build:

- no import that is neither a `node:` builtin nor a relative path inside `tools/risk-reader/`;
- no reference to `apps/server`, `apps/web`, `scoreboard-api`, `contracts/out`, `node_modules`,
  or `require(` outside comments;
- no `package.json` and no `node_modules` in the directory.

### 9.1 It carries its own ABI, including selectors

`abi/TinjauRiskRegistry.read.abi.json` is hand-transcribed, not generated from
`contracts/out/**`. Each entry carries an explicit 4-byte selector, so the consumer needs no
keccak256 implementation at runtime and no crypto dependency.

Hardcoded selectors could drift, so [measured] suite case 0 re-derives all twelve independently
with `cast sig` and compares:

```text
=== 0. selectors the consumer carries match cast sig ===
  PASS 0x92a22538  currentRecord(address,bytes32)
  PASS 0x2a5915f3  effectiveState(address,bytes32)
  PASS 0x4e2ce6d3  schemaVersion()
  PASS 0x58355ead  policyVersion()
  PASS 0x5c975abb  paused()
  PASS 0x0ee8b522  envelope()
  PASS 0xd82e66fa  supportedAsset(address)
  PASS 0x58e14f53  historyLength(address,bytes32)
  PASS 0x1821d696  assessor()
  PASS 0x452a9320  guardian()
  PASS 0xbd6ca44b  key(address,bytes32)
  PASS 0xad987042  lastProtectEndedAt(bytes32)
```

### 9.2 Read-only by construction

The write functions (`postAssessment`, `setPaused`, `rotateAssessor`, `setAssetSupported`) are
**absent from the carried ABI**. The consumer cannot write even if instructed to: it has no
selector for any state-changing call, holds no key, and has no signing code.

## 10. Limitations and honest negatives

1. **Not deployed anywhere public.** [measured] Every run in this document is against a local
   Anvil chain at `http://127.0.0.1:8555`, chain id 31337. Nothing proves behaviour against
   X Layer Testnet, because nothing is deployed there. T7.2 owns that, and no address may be
   published before it completes. The consumer takes chain id and address as arguments
   specifically so no address is baked in prematurely.
2. **Foundry is required for the test, not for the consumer.** The consumer needs only Node.
   The e2e harness needs `anvil`, `forge`, and `cast` to *create* a chain to read.
3. **The record content is fabricated for the test.** The assessments posted by the harness are
   made-up values on made-up addresses, chosen to exercise decode paths. They are not evidence
   about any real asset. The `DataMode` field declares `REPLAY` or `SIMULATED` on chain
   accordingly.
4. **This is not T8.2.** A reference consumer built by the project is P0 and is what this task
   delivers. Genuinely separate consumption is P1 and remains unproven. Per §0.19 no adoption
   may be inferred from this artifact.
5. **Not audited, not hardened.** [roadmap] The consumer has no retry, no rate limiting, no
   multi-pool batching, and no caching. It reads one `(asset, poolId)` per invocation. A
   production SDK is explicitly a deferred P2 item in the tracker.
6. **No history traversal.** [roadmap] It reports `historyLength` but does not walk
   `historyAt()`. Auditing a past decision is possible through the ABI but is not implemented in
   this example.
7. **Compile-time coupling to the contracts project in the harness only.** [implemented]
   `test/anvil-e2e.sh` runs `forge create --root contracts/` to deploy the registry under test.
   That is the harness building the thing to be read; the consumer itself never reads
   `contracts/`. A judge who already has a deployed registry can skip the harness entirely and
   run the consumer alone.

## 11. Downstream impact

- **T6.4** (docs alignment) may cite this artifact as the reusable-record read example, using
  the "reference consumer, built by Tinjau" label verbatim.
- **T7.2** (deployment) must supply the real chain id and address. Once it does, the same
  command in §3 works unchanged — only the two argument values differ. Nothing in the consumer
  needs editing.
- **T7.4** (clean judge path) can use `bash tools/risk-reader/test/anvil-e2e.sh` as a
  self-contained, network-free reproduction that needs no private context.
- **T8.2** (separate consumer) inherits `abi/` as the published surface a separate package would
  consume.
- **Frontend handoff (§0.23)** is unaffected: this artifact adds no endpoint and changes no
  schema.
