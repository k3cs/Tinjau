# Integrating the Tinjau risk registry

`TinjauRiskRegistry` is an on-chain record that answers one question for a tokenized-equity pool:
**is a bounded, time-limited protective action authorised right now, and until when?** You read it
with a JSON-RPC endpoint and a contract address — no Tinjau API key, no Tinjau dashboard, no
Tinjau software anywhere in your stack.

This page is the whole integration kit. It should take minutes, not an afternoon.

> **This kit is not evidence of adoption.** Everything here was built by Tinjau, including the
> reference consumer and the Solidity example. An integration kit lowers the cost of adoption; it
> is not adoption. Nobody outside this project is known to consume the registry.

---

## 1. Sixty seconds

```bash
node tools/risk-reader/tinjau-risk-read.mjs \
  --rpc-url  https://testrpc.xlayer.tech \
  --chain-id 1952 \
  --registry 0x60062389a7AB08F0030FC06Adf9CE0C180537317 \
  --asset    0xf07A9D89848bc694c7154Fda4cce707Eb409F903 \
  --pool-id  0x5e9eff19074225e9132eb73dc25cf0e3ff55c3fb31c9b28ab633851d2b54f730
```

Node 18+ and nothing else. No `npm install`, no `package.json`, no build step. The tool carries
its own hand-transcribed ABI in [`tools/risk-reader/abi/`](./tools/risk-reader/abi/) and reads
only from the chain. Full documentation: [`tools/risk-reader/README.md`](./tools/risk-reader/README.md).

If you want to write your own consumer instead, skip to §6 (plain Node), §7 (viem) or §8 (Solidity).

---

## 2. Live addresses and chain

| | |
|---|---|
| Chain | X Layer Testnet, chain id **1952** |
| RPC | `https://testrpc.xlayer.tech` |
| `TinjauRiskRegistry` | `0x60062389a7AB08F0030FC06Adf9CE0C180537317` |
| Example asset | `0xf07A9D89848bc694c7154Fda4cce707Eb409F903` (MOCK wNVDAx) |
| Example pool id | `0x5e9eff19074225e9132eb73dc25cf0e3ff55c3fb31c9b28ab633851d2b54f730` |

**This is testnet, and the pools hold builder-controlled mock tokens with no value.** The asset
above is a freely mintable mock standing in for canonical wNVDAx; it is not the real tokenized
asset, and it must never be presented as one. The liquidity in these pools was seeded by the
builders. These addresses prove that enforcement works. They are not a market.

A second, 60x-compressed "demo envelope" stack exists at a different registry address so that
recovery can be watched live within a demo. The authoritative list of both stacks, with the
bytecode verification behind them, is
[`docs/buildx-orion-2026/outputs/05-build/frontend-handoff/deployed-addresses.json`](./docs/buildx-orion-2026/outputs/05-build/frontend-handoff/deployed-addresses.json).
Take addresses from that file rather than copying them out of prose.

---

## 3. `effectiveState()` vs `currentRecord()` — read this before writing any code

This is the single most important semantic in the kit. Get it wrong and your integration is
worse than no integration.

- **`currentRecord(asset, poolId)`** returns the stored record, byte for byte as it was written.
  It applies no time rules. A record whose `expiresAt` passed six hours ago still says `PROTECT`,
  because a read never rewrites history and nobody pays gas to retire a lapsed record.
- **`effectiveState(asset, poolId)`** applies expiry and the envelope's duration cap at read time
  and returns the state you are actually authorised to act on, along with the fee and the moment
  protection ends.

**A consumer that acts on `currentRecord().state` applies protection the registry no longer
authorises** — indefinitely, silently, and with no transaction anywhere to show what went wrong.
The lapse is not an event. It is the absence of one.

### The live record, right now

Run the reader from §1 against the address above and this is what comes back. Real output, at
block 38876224, chain time `2026-08-21T17:57:41Z`:

```
  block / chain time     #38876224 @ 2026-08-21T17:57:41Z

STORED RECORD — currentRecord(), storage verbatim
  state                  PROTECT  (ordinal 2)
  assessed at            2026-08-21T03:59:57Z  (14h ago)
  expires at             2026-08-21T09:59:57Z  (8h ago)

EFFECTIVE STATE — effectiveState(), expiry and duration cap applied
  state                  NORMAL  (ordinal 0)
  effective fee          500 (0.0500%)  == base fee, no widening in force
  protection ends at     2026-08-21T09:59:57Z  (8h ago)

STORED vs EFFECTIVE
  *** DIVERGE — stored PROTECT, effective NORMAL. ***
```

The record is not wrong. It is history, and it says truthfully that a protection was authorised
between 03:59:57Z and 09:59:57Z on 2026-08-21. Reading it as an instruction today is what is
wrong. A consumer polling `currentRecord` on this pool would have been charging the widened fee
for hours after the registry stopped authorising it.

### The rule

```
act on   -> effectiveState().state
audit on -> currentRecord()
```

Two things end a protection, both without any transaction:

1. the record's own `expiresAt` passes, or
2. `protectStartedAt + maxProtectDuration` passes (21,600 s on the production envelope).

`effectiveState().endsAt` is the earlier of the two. Refreshing an ongoing protection does not
move `protectStartedAt` forward, so a stream of refreshed assessments cannot ratchet the cap.

### `assessedAt == 0` is a third answer

A never-written record reads as all zeroes, and zero decodes to `RiskState.NORMAL`. That default
is safe — it authorises nothing — but *"nobody has ever assessed this pool"* is a different
finding from *"Tinjau assessed this pool and judged it normal"*, and `assessedAt == 0` is the only
thing separating them. A UI that reports the first as the second tells its users a pool was
cleared when nobody ever looked at it.

---

## 4. The public RPC serves stale reads

`https://testrpc.xlayer.tech` load-balances across nodes at differing heights, so two consecutive
`latest` reads can come from different blocks and disagree. Measured convergence lag after a write
is 2,519–2,746 ms. For a risk registry the failure direction is the dangerous one: a stale read
shows `NORMAL` while a `PROTECT` is live.

Two mitigations, both used by the snippets below:

1. **Pin your reads to a block number.** Fetch `eth_blockNumber` once, then pass that value as the
   block tag for every `eth_call` in the batch. Reads that must agree with each other must come
   from one block.
2. **Follow the event instead of polling.** `AssessmentPosted` is emitted on every write, with
   `key`, `asset` and `poolId` all indexed:

   ```
   topic0 0x86a1931c7ee126cfee1d62ec50eed2d2ac38ddfe3a8668b7f2f366ef84397936
          AssessmentPosted(bytes32,address,bytes32,uint8,uint32,uint64,uint64,bytes32)
   topic1 key    = keccak256(abi.encodePacked(asset, poolId))
   topic2 asset
   topic3 poolId
   ```

   Note the event tells you when a record was **written**. It cannot tell you when one **lapsed**,
   because lapsing emits nothing. Event-driven consumers still need a timer against
   `effectiveState().endsAt`.

   One practical limit of this RPC: `eth_getLogs` refuses a range wider than 100 blocks
   (`block range greater than 100 max`). Page your backfill.

The read-consistency measurements and the recommended polling pattern live in a sibling note,
`docs/buildx-orion-2026/outputs/05-build/s6-2-xlayer-rpc-read-consistency.md`. Read that rather
than re-deriving the numbers from here.

---

## 5. Reason bits

`RiskRecord.reasonBits` is a `uint32` bitmask recording *why* the assessment landed where it did.
The complete, machine-readable bit-to-meaning table is
[`tools/risk-reader/abi/reason-bits.json`](./tools/risk-reader/abi/reason-bits.json), transcribed
by hand from `contracts/src/TinjauRiskTypes.sol`. Expand a mask offline with:

```bash
node tools/risk-reader/tinjau-risk-read.mjs --explain-reason-bits 0x00054114
```

Bit positions are permanent. A retired reason stops being set; its position is never reused, or
historical records become unreadable.

### An undefined bit must be refused, not masked off

Bits 15, 23, 29, 30 and 31 have no meaning in schema `tinjau.risk/1.0.0` (mask of defined bits:
`0x1F7F7FFF`). If you meet a record carrying one, **refuse the record**. Do not mask the bit off
and report the rest.

The reason is concrete. If a newer schema gives one of those bits a meaning like *"the evidence
behind this record was retracted"*, a consumer that drops bits it does not recognise will report
the record as though the retraction never happened — confidently, and with every other field
looking correct. A partially understood record is more dangerous than an unreadable one. The
reference consumer exits `4` on this; the Solidity example reverts.

### Bit 18 carries a caveat you should surface

`BONDED_EVIDENCE_PASSED` (bit 18) means the bonded parse-agreement path is *recorded* as passed.
It does not by itself distinguish a value that was computed from one that was assumed. On Tinjau's
four frozen scenarios it was an assumed input. Exactly one published record computes it, from
three live independent parses of the origin filing. `reason-bits.json` carries this as a `caveat`
field on that bit; a consumer showing bit 18 to a human should show the caveat with it, at the
point of decision rather than in a footnote. **Treat bit 18 as unverified unless the writer of
that particular record says otherwise.**

The live record above sets `0x00054114` = bits 2, 4, 8, 14, 16, 18 —
`DUPLICATE_SYNDICATION`, `STALE_EVIDENCE`, `MARKET_CONFIRMED`, `REFERENCE_MARKET_CLOSED`,
`OFFICIAL_FILING`, `BONDED_EVIDENCE_PASSED`.

---

## 6. Copy-paste consumer, plain Node, zero dependencies

Node 18 or newer. Save as `tinjau-minimal.mjs` and run `node tinjau-minimal.mjs`.

```js
// Read the Tinjau risk record with nothing but Node 18+. No npm install.
// X Layer Testnet (chain 1952). Testnet only; the pools hold valueless mock tokens.

const RPC      = 'https://testrpc.xlayer.tech';
const REGISTRY = '0x60062389a7AB08F0030FC06Adf9CE0C180537317';
const ASSET    = '0xf07A9D89848bc694c7154Fda4cce707Eb409F903';
const POOL_ID  = '0x5e9eff19074225e9132eb73dc25cf0e3ff55c3fb31c9b28ab633851d2b54f730';

// 4-byte selectors, carried explicitly so no keccak256 is needed at runtime.
// Verify with: cast sig 'currentRecord(address,bytes32)'
const SEL = { currentRecord: '0x92a22538', effectiveState: '0x2a5915f3' };

const STATE = ['NORMAL', 'WATCH', 'PROTECT'];

// The two arguments are static types: one 32-byte word each, no head offset.
const ARGS =
  ASSET.toLowerCase().replace(/^0x/, '').padStart(64, '0') +
  POOL_ID.toLowerCase().replace(/^0x/, '').padStart(64, '0');

const word = (hex, i) => hex.slice(2 + i * 64, 2 + (i + 1) * 64);
const num  = (hex, i) => Number(BigInt('0x' + word(hex, i)));

async function ethCall(selector, blockTag) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'eth_call',
      params: [{ to: REGISTRY, data: selector + ARGS }, blockTag],
    }),
  });
  const body = await res.json();
  if (body.error) throw new Error(`${selector}: ${body.error.message}`);
  return body.result;
}

// Pin both reads to ONE block. The public X Layer RPC serves reads from nodes at
// differing heights, so two 'latest' calls can straddle a write and disagree.
const head = await fetch(RPC, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
}).then((r) => r.json());
const BLOCK = head.result;

const rec = await ethCall(SEL.currentRecord, BLOCK);       // 12 static words
const eff = await ethCall(SEL.effectiveState, BLOCK);      // (uint8, uint24, uint64)

const storedState = num(rec, 2);
const assessedAt  = num(rec, 7);
const expiresAt   = num(rec, 8);
const reasonBits  = num(rec, 6) >>> 0;

// Bits defined by schema tinjau.risk/1.0.0. See tools/risk-reader/abi/reason-bits.json.
// Refuse an undefined bit; do NOT mask it off. A newer writer's bit could mean
// "the evidence was retracted", and dropping it would hide that the record ever said so.
const DEFINED = 0x1f7f7fff; // bits 15, 23, 29, 30, 31 are undefined in 1.0.0
if (reasonBits & ~DEFINED) {
  console.error(`REFUSED: reasonBits 0x${reasonBits.toString(16)} carries a bit this schema does not define.`);
  process.exit(4);
}

if (assessedAt === 0) {
  // Unwritten storage is all zeroes, and zero decodes to NORMAL. Safe, but
  // "never assessed" is a different finding from "assessed and found normal".
  console.log('NO RECORD for this (asset, poolId) — nobody has ever assessed it.');
  process.exit(3);
}

console.log(`block            ${Number(BigInt(BLOCK))}`);
console.log(`stored state     ${STATE[storedState]}   <- history; do NOT act on this`);
console.log(`expires at       ${new Date(expiresAt * 1000).toISOString()}`);
console.log(`EFFECTIVE state  ${STATE[num(eff, 0)]}   <- act on this`);
console.log(`effective fee    ${num(eff, 1)} (${(num(eff, 1) / 10000).toFixed(4)}%)`);
console.log(`protection ends  ${num(eff, 2) === 0 ? '(none running)' : new Date(num(eff, 2) * 1000).toISOString()}`);
console.log(`diverges         ${STATE[storedState] !== STATE[num(eff, 0)]}`);
```

Real output, run against the live registry (chain time `2026-08-21T17:57Z`):

```
block            38875983
stored state     PROTECT   <- history; do NOT act on this
expires at       2026-08-21T09:59:57.000Z
EFFECTIVE state  NORMAL   <- act on this
effective fee    500 (0.0500%)
protection ends  2026-08-21T09:59:57.000Z
diverges         true
```

The record layout it decodes is 12 consecutive 32-byte words, in this order:

| Word | Field | Word | Field |
|---|---|---|---|
| 0 | `asset` | 6 | `reasonBits` |
| 1 | `poolId` | 7 | `assessedAt` |
| 2 | `state` | 8 | `expiresAt` |
| 3 | `confidence` | 9 | `protectStartedAt` |
| 4 | `dataMode` | 10 | `evidenceCommitment` |
| 5 | `confirmation` | 11 | `policyVersion` |

`RiskRecord` is an all-static tuple, so it is ABI-encoded inline with no head offset. That is why
the snippet needs no ABI decoder.

---

## 7. Copy-paste consumer, viem

```bash
npm i viem   # tested against viem 2.53.1
```

```js
import { createPublicClient, http, defineChain } from 'viem';

const xLayerTestnet = defineChain({
  id: 1952,
  name: 'X Layer Testnet',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: ['https://testrpc.xlayer.tech'] } },
  testnet: true,
});

const REGISTRY = '0x60062389a7AB08F0030FC06Adf9CE0C180537317';
const ASSET    = '0xf07A9D89848bc694c7154Fda4cce707Eb409F903';
const POOL_ID  = '0x5e9eff19074225e9132eb73dc25cf0e3ff55c3fb31c9b28ab633851d2b54f730';

// Only the read functions. Omitting the write functions is deliberate: a consumer
// that cannot name postAssessment cannot call it by accident.
const abi = [
  {
    type: 'function', name: 'currentRecord', stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }, { name: 'poolId', type: 'bytes32' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'asset', type: 'address' },
        { name: 'poolId', type: 'bytes32' },
        { name: 'state', type: 'uint8' },
        { name: 'confidence', type: 'uint8' },
        { name: 'dataMode', type: 'uint8' },
        { name: 'confirmation', type: 'uint8' },
        { name: 'reasonBits', type: 'uint32' },
        { name: 'assessedAt', type: 'uint64' },
        { name: 'expiresAt', type: 'uint64' },
        { name: 'protectStartedAt', type: 'uint64' },
        { name: 'evidenceCommitment', type: 'bytes32' },
        { name: 'policyVersion', type: 'bytes32' },
      ],
    }],
  },
  {
    type: 'function', name: 'effectiveState', stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }, { name: 'poolId', type: 'bytes32' }],
    outputs: [
      { name: 'state', type: 'uint8' },
      { name: 'fee', type: 'uint24' },
      { name: 'endsAt', type: 'uint64' },
    ],
  },
];

const client = createPublicClient({ chain: xLayerTestnet, transport: http() });
const STATE = ['NORMAL', 'WATCH', 'PROTECT'];

// Pin both reads to ONE block. The public RPC serves reads from nodes at differing
// heights, so two independent 'latest' calls can straddle a write and disagree.
const blockNumber = await client.getBlockNumber();
const contract = { address: REGISTRY, abi, args: [ASSET, POOL_ID], blockNumber };

const [record, [state, fee, endsAt]] = await Promise.all([
  client.readContract({ ...contract, functionName: 'currentRecord' }),
  client.readContract({ ...contract, functionName: 'effectiveState' }),
]);

// Refuse an undefined reason bit; never mask it off. See tools/risk-reader/abi/reason-bits.json.
const DEFINED = 0x1f7f7fff; // bits 15, 23, 29, 30, 31 are undefined in tinjau.risk/1.0.0
if (record.reasonBits & ~DEFINED) {
  throw new Error(`reasonBits 0x${record.reasonBits.toString(16)} carries a bit this schema does not define`);
}
if (record.assessedAt === 0n) throw new Error('NO RECORD: nobody has ever assessed this (asset, poolId)');

console.log(`block            ${blockNumber}`);
console.log(`stored state     ${STATE[record.state]}   <- history; do NOT act on this`);
console.log(`EFFECTIVE state  ${STATE[state]}   <- act on this`);
console.log(`effective fee    ${fee} (${(fee / 10000).toFixed(4)}%)`);
console.log(`protection ends  ${endsAt === 0n ? '(none running)' : new Date(Number(endsAt) * 1000).toISOString()}`);
console.log(`diverges         ${record.state !== state}`);
```

Real output, run against the live registry (chain time `2026-08-21T17:57Z`):

```
block            38876024
stored state     PROTECT   <- history; do NOT act on this
EFFECTIVE state  NORMAL   <- act on this
effective fee    500 (0.0500%)
protection ends  2026-08-21T09:59:57.000Z
diverges         true
```

---

## 8. Copy-paste consumer, Solidity

[`contracts/src/examples/ExampleRiskConsumer.sol`](./contracts/src/examples/ExampleRiskConsumer.sol)
is a complete worked example of one contract reading the registry from another. Its test is
[`contracts/test/examples/ExampleRiskConsumer.t.sol`](./contracts/test/examples/ExampleRiskConsumer.t.sol),
and it runs as part of `cd contracts && forge test` from a bare clone — dependencies are vendored,
so there is no setup step.

To adopt it, copy **two files** into your own repository: the example itself, and
`contracts/src/TinjauRiskTypes.sol` (a dependency-free library holding every enum ordinal, reason
bit and the record struct). The example declares its own minimal `ITinjauRiskRegistry` interface
rather than importing the registry, so you do not pull in the EIP-712 machinery or any write
function.

### What it exposes

| View | Returns | Reads |
|---|---|---|
| `currentRiskState()` | the state to act on | `effectiveState` |
| `shouldPause()` | `true` only for a live `PROTECT` | `effectiveState` |
| `currentProtection()` | `(fee, endsAt)` | `effectiveState` |
| `hasBeenAssessed()` | `assessedAt != 0` | `currentRecord` |
| `storedStateForAuditOnly()` | storage verbatim | `currentRecord` |

### The four things it demonstrates

1. **Effective, never stored.** Every view that makes a decision reads `effectiveState`. The
   stored state is reachable only through `storedStateForAuditOnly`, named so that misuse shows up
   in the caller's own diff rather than hiding behind a comment at the call site.

2. **Undefined bits are refused.** `currentRiskState` and `currentProtection` call
   `TinjauRiskTypes.validateReasonBits` on the stored `reasonBits` first, and revert with
   `UnknownReasonBits` on any bit outside the set this copy of the library defines. A view that
   reverts is loud, and loud is the correct failure for "I do not understand this record".

3. **Exact equality, never `>=`.** `shouldPause()` compares against `RiskState.Protect` exactly.
   Ordering over these enums exists for human legibility only; a `state >= Watch` gate would
   silently widen the moment a future schema inserts a member, and `WATCH` explicitly does not
   authorise the aggressive path.

4. **Schema pinning at deployment.** The constructor reads `schemaVersion()` once and reverts with
   `SchemaMismatch` if the registry does not report the version this consumer was compiled against.
   Enum ordinals and struct layout are guaranteed only within one schema version, so decoding a
   foreign one could produce a confident wrong answer.

The core of it:

```solidity
function currentRiskState() public view returns (TinjauRiskTypes.RiskState) {
    TinjauRiskTypes.validateReasonBits(registry.currentRecord(asset, poolId).reasonBits);
    (TinjauRiskTypes.RiskState state,,) = registry.effectiveState(asset, poolId);
    return state;
}

function shouldPause() external view returns (bool) {
    return currentRiskState() == TinjauRiskTypes.RiskState.Protect;
}
```

The test proves the divergence rather than asserting it: it posts a real EIP-712-signed `PROTECT`,
warps past `expiresAt`, and checks that storage still says `PROTECT` while `shouldPause()` has
already gone false. It covers the duration-cap path, the `WATCH`-is-not-`PROTECT` case, the
never-assessed case, the undefined-bit refusal (against a deliberately lying registry, because the
real one refuses to store such a record), the foreign-schema refusal, and selector equality between
the example's hand-declared interface and the real contract.

### If you are writing a Uniswap v4 hook

`contracts/src/TinjauFeeHook.sol` is stricter than the example, for reasons specific to being in
the swap path: it reads the registry through raw `staticcall` and decodes by hand, so that a
reverting, missing or wrong-shaped registry degrades to the base fee instead of reverting the swap.
Read it before putting a registry read on a path where a revert costs a user their transaction.

---

## 9. The full read surface

Every read function, with its 4-byte selector. Verify any of them with
`cast sig '<signature>'`; the machine-readable copy is
[`tools/risk-reader/abi/TinjauRiskRegistry.read.abi.json`](./tools/risk-reader/abi/TinjauRiskRegistry.read.abi.json).

| Selector | Signature | Gives you |
|---|---|---|
| `0x2a5915f3` | `effectiveState(address,bytes32)` | **the state to act on**, fee, end time |
| `0x92a22538` | `currentRecord(address,bytes32)` | the stored record, 12 static words |
| `0x0ee8b522` | `envelope()` | the fee band and duration cap, from the chain |
| `0x4e2ce6d3` | `schemaVersion()` | which decoder to apply |
| `0x58355ead` | `policyVersion()` | which policy rules produced the record |
| `0x5c975abb` | `paused()` | whether new protections are blocked |
| `0xd82e66fa` | `supportedAsset(address)` | whether this asset is in the vetted set |
| `0x58e14f53` | `historyLength(address,bytes32)` | how many assessments exist for this key |
| `0xbd6ca44b` | `key(address,bytes32)` | the record key, without computing keccak yourself |
| `0xad987042` | `lastProtectEndedAt(bytes32)` | with `envelope().cooldown`, whether a new protection could re-arm |
| `0x1821d696` | `assessor()` | the address whose signature authorises a write |
| `0x452a9320` | `guardian()` | the address that can pause |

Read `envelope()` rather than trusting this document about the fee band. The production-envelope
registry publishes `baseFee 500`, `maxFee 20000`, `widenDuration 3600`, `decayDuration 18000`,
`maxProtectDuration 21600`, `cooldown 3600` — check it yourself.

**Pause does not cancel anything.** A guardian pause blocks *new* protections. A protection already
running is untouched, and history is never erased. So `paused() == true` does not mean
`effectiveState()` is safe to ignore.

---

## 10. What this kit is not

- **Not adoption.** Tinjau wrote the reference consumer, the snippets above and the Solidity
  example. An integration kit lowers the cost of adoption; it is not adoption, and nothing here is
  evidence that a third party consumes this registry.
- **Not audited.** No external security review has been performed on any contract in this
  repository.
- **Not production.** Testnet only, chain 1952. The pools hold builder-controlled mock tokens with
  no value, and the assessor key on testnet is derived from the poster key rather than
  independently generated (disclosed in `deployed-addresses.json`).
- **Not a price oracle.** The registry says what protective action is authorised. It does not say
  what anything is worth.
- **Not a guarantee that a record exists.** Only assets in the registry's supported set can be
  assessed at all, and a supported asset may simply never have been assessed. Check `assessedAt`.

## 11. Where to look next

| | |
|---|---|
| Reference consumer + its ABI | [`tools/risk-reader/`](./tools/risk-reader/) |
| Contract source | [`contracts/src/TinjauRiskRegistry.sol`](./contracts/src/TinjauRiskRegistry.sol), [`TinjauRiskTypes.sol`](./contracts/src/TinjauRiskTypes.sol), [`TinjauRiskPolicy.sol`](./contracts/src/TinjauRiskPolicy.sol) |
| Solidity example + test | [`contracts/src/examples/`](./contracts/src/examples/), [`contracts/test/examples/`](./contracts/test/examples/) |
| Addresses, both stacks | [`docs/buildx-orion-2026/outputs/05-build/frontend-handoff/deployed-addresses.json`](./docs/buildx-orion-2026/outputs/05-build/frontend-handoff/deployed-addresses.json) |
| RPC read consistency | `docs/buildx-orion-2026/outputs/05-build/s6-2-xlayer-rpc-read-consistency.md` |
| Build with no setup step | [`contracts/README.md`](./contracts/README.md), [`contracts/lib/VENDORED.md`](./contracts/lib/VENDORED.md) |
| The measured result, including what failed | [`README.md`](./README.md) |
