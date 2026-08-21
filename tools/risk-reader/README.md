# `tinjau-risk-read` — reference consumer for the Tinjau risk registry

**Reference consumer, built by Tinjau.** It is a worked example proving that the on-chain risk
record is readable and decodable by someone holding nothing but a JSON-RPC endpoint and the
published ABI. It is **not** external adoption, **not** a third-party integration, and **not**
evidence that anyone outside this project consumes the registry. Tinjau wrote it and Tinjau
runs it. (Tracker task T6.3; claim boundary §0.19.)

It reads. It never writes: the write functions are not in the ABI it carries.

## Run it

Requirements: **Node 18 or newer.** Nothing else. No `npm install`, no `package.json`, no
`node_modules`, no build step.

```bash
node tools/risk-reader/tinjau-risk-read.mjs \
  --rpc-url  <json-rpc-url> \
  --chain-id <chain-id> \
  --registry 0x<TinjauRiskRegistry address> \
  --asset    0x<tokenised equity address> \
  --pool-id  0x<32-byte pool id>
```

Every flag has an environment fallback: `TINJAU_RPC_URL`, `TINJAU_CHAIN_ID`,
`TINJAU_REGISTRY`, `TINJAU_ASSET`, `TINJAU_POOL_ID`.

Extra modes:

```bash
node tools/risk-reader/tinjau-risk-read.mjs --json ...            # JSON only on stdout
node tools/risk-reader/tinjau-risk-read.mjs --print-abi           # the ABI it carries
node tools/risk-reader/tinjau-risk-read.mjs --explain-reason-bits 0x00070100   # offline
```

## There is no default address, on purpose

`--registry` has no default and will not get one here. The final X Layer Testnet deployment is
tracker task **T7.2**, and baking a pre-T7.2 address into a tool would create a second address
list to chase when the authoritative one changes.

A stack **is** deployed and readable today — T4.2 working addresses, not final. Take them from
the one list that owns them,
`docs/buildx-orion-2026/outputs/05-build/frontend-handoff/deployed-addresses.json`, and pass
them as flags. A worked invocation is in the repository README §4.1.

**The public X Layer RPC serves stale reads** (convergence observed within 2,519–2,746 ms after a
write, across eight writes on testnet; read those as upper bounds rather than the lag, because the
measuring harness polled on a 1,000 ms interval, and see
`docs/buildx-orion-2026/outputs/05-build/s6-2-xlayer-rpc-read-consistency.md` for the method and
its limits). This reader issues a single point-in-time read, so a consumer that acts on the record
should pin reads to a block number or follow the `AssessmentPosted` event rather than polling
`currentRecord`. For a risk registry the failure direction is the dangerous one: a stale read
shows `NORMAL` while a `PROTECT` is live.

## What it decodes

Everything §0.12 requires a third party to be able to read, expanded into words:

| Field | Rendered as |
|---|---|
| supported asset | address, plus whether the registry's supported-asset set contains it |
| pool | pool id, plus the derived record key |
| state | `NORMAL` / `WATCH` / `PROTECT` with its meaning |
| reason bits | every set bit expanded to its code **and** a sentence, never a bare bitmask |
| evidence commitment | `bytes32` |
| confidence band | `LOW` / `MEDIUM` / `HIGH` with what it permits |
| assessed at, expiry | ISO-8601 plus a relative age against the chain's own block timestamp |
| policy version | ASCII, unpacked from `bytes32` |
| schema version | ASCII, checked against what this reader can decode |

It also reads the bounded-action envelope (`baseFee`, `maxFee`, `widenDuration`,
`decayDuration`, `maxProtectDuration`, `cooldown`) off the chain, so a consumer verifies the
fee band and duration cap itself instead of trusting a claim about them.

## Stored state and effective state are reported separately

`currentRecord()` returns storage verbatim; `effectiveState()` applies expiry and the duration
cap. A record that still says `PROTECT` but has lapsed is the exact case a naive consumer gets
wrong, so the output always ends with an explicit `AGREE` or `*** DIVERGE ***` verdict naming
both values. A reader who acts on the stored state alone would apply protection the registry no
longer authorises.

## How it fails

| Situation | Behaviour | Exit |
|---|---|---|
| record decoded | full report | 0 |
| usage error, RPC unreachable, chain-id mismatch | message on stderr | 1 |
| no bytecode at `--registry` | refuses to "read" an empty address | 2 |
| no record for this `(asset, poolId)` | says so, and explains that this differs from "assessed as NORMAL" | 3 |
| record carries a reason bit this schema does not define | **refuses**, aborts before reporting an effective state | 4 |
| registry reports a newer `schemaVersion()` | **refuses** to decode | 5 |

Exit 4 is deliberate and is the one worth arguing about. Masking an unknown bit off and
reporting the rest would let a newer writer's fact — say, a bit meaning "evidence was retracted"
— vanish, and the record would read as though it never happened. A partially understood record
is more dangerous than an unreadable one.

Exit 3 matters for a similar reason. Unwritten storage reads as all zeroes, and zero decodes to
`RiskState.NORMAL`. That is safe by design, but "nobody has ever assessed this pool" is not the
same finding as "Tinjau assessed this pool and judged it normal". `assessedAt == 0` separates
them.

## Independence, and how it is enforced rather than promised

The point of T6.3 is that a stranger can read the record. A reader that reused Tinjau's own
decoders would prove only that Tinjau can read its own output. So:

- zero npm dependencies, no `package.json`, no workspace entry, no install;
- imports nothing from `apps/server/**` (and specifically nothing from
  `apps/server/src/scoreboard-api/**`), nothing from `apps/web/**`, nothing from
  `contracts/out/**`;
- the only files it reads are the two in `./abi/`, hand-transcribed from the published ABI;
- no keccak256 implementation — the 4-byte selectors are carried explicitly in
  `abi/TinjauRiskRegistry.read.abi.json` and re-derived with `cast sig` by the test;
- `test/anvil-e2e.sh` asserts all of the above structurally, so the independence claim fails
  loudly if someone later adds an import.

## Prove it works

```bash
bash tools/risk-reader/test/anvil-e2e.sh
```

Starts a **local Anvil**, deploys `TinjauRiskRegistry` to it, posts real EIP-712-signed
assessments, and runs the consumer against that chain over ordinary JSON-RPC. It covers a live
`PROTECT`, an expired `PROTECT` (the stored-vs-effective divergence), a missing record, an
unsupported asset, a paused registry, an undefined reason bit, a newer schema version, a
chain-id mismatch, a codeless address, and an unreachable RPC.

Requires Foundry (`anvil`, `forge`, `cast`) in addition to Node. Foundry is needed only to
*create* the test chain — the consumer itself never uses it.

Nothing in that script touches any public network. No mainnet, no testnet, no credentials: the
private keys it uses are Anvil's well-known deterministic development keys, which anvil prints
on every start and which hold no value anywhere.

`test/fixture/` holds one throwaway contract, `FutureSchemaRegistry.sol`. It is ABI-compatible
with the registry's read surface and returns whatever the test asks for. It exists because the
real registry at schema `tinjau.risk/1.0.0` *cannot* produce the two records the consumer must
refuse — `validateReasonBits` rejects an undefined bit on write, and v1.0.0 reports v1.0.0 by
construction. Both are situations a future schema version creates. It enforces no rule, stores
no history, and must never be mistaken for the registry.
