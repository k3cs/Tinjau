# X Layer's public RPC serves reads from nodes at different block heights

**A read issued immediately after a confirmed write can miss that write.** The public endpoint
`https://testrpc.xlayer.tech` (X Layer Testnet, chain id 1952) is load-balanced across several
nodes, and those nodes are not always at the same block height. Send a transaction, wait for
its receipt, then read the contract state it changed: the read can be answered by a node that
does not have your transaction yet, and it returns the **previous** state. Not an error — a
plausible, well-formed, stale answer. If your code treats that answer as current, it will
report that the write did not happen, or that state changed back. In a measured run on
2026-08-21 the reads caught up after **2 519–2 746 ms** of waiting; the code that did the
waiting had a 1-second poll interval, so those figures are upper bounds, not the true lag.

This note is written to be usable without any context about the project that measured it. The
raw numbers are reproduced below rather than linked, the mitigations are written against any
contract rather than one specific one, and the reproduction script needs no credentials and no
checkout of anything.

Written 2026-08-22. Original measurements 2026-08-21 ~03:58Z; re-run and script verification
2026-08-21 17:40Z–18:15Z. All timestamps in this note are UTC.

---

## 1. What a developer will observe, and what breaks

The failure looks like this:

1. You submit a transaction that changes contract state.
2. You wait for the receipt. `status` is `0x1`. The transaction is on chain. The event it
   emitted is in the receipt's logs, and it decodes to the new state.
3. You immediately `eth_call` a getter for that same state at block tag `"latest"`.
4. You get the **old** value back.

Both step 2 and step 4 are true statements about the chain — just at different heights. Step 2
read the receipt from a node that had your block. Step 4 was answered by a different node that
did not.

What breaks, in rough order of how badly:

- **State machines driven by polling.** A poll loop that reads `"latest"` and reacts to change
  will see A → B → A and fire a spurious "reverted to A" transition. Nothing reverted.
- **Read-after-write assertions in tests and deploy scripts.** They fail intermittently, on a
  timer, with no bad commit to blame. This is the one that eats an afternoon.
- **Anything where the stale direction is the unsafe direction.** A stale read of a pause flag
  says "not paused" while a pause is live. A stale read of a risk or oracle record says
  "normal" while an alert is live. You under-report the dangerous state, silently. Whether
  this matters depends entirely on which way your state machine fails.
- **UIs that show state with no height attached.** The user sees a value and cannot tell
  whether it is current. Neither can you, from a support ticket.

What is **not** happening: this is not a reorg, and it is not a bug in your transaction. The
write is final. Only the read is behind.

---

## 2. Method

### 2.1 What was measured

A test harness ran a scripted sequence of writes against contracts on X Layer Testnet. After
each write's receipt confirmed, the harness polled a getter until the read agreed with the
write it had just made, and recorded how long that took. That elapsed time is the
**convergence wait**.

Precisely, the convergence wait is:

> Wall-clock milliseconds from the moment the first post-receipt read was **issued**, until a
> read **returned** a value satisfying a predicate that only the new state satisfies.
> The clock starts before the first read attempt, so it includes that first attempt's own
> round trip.

The polling loop, reproduced in full from the harness that produced the numbers:

```ts
export async function waitForReadConsistency<T>(
  read: () => Promise<T>,
  isCurrent: (value: T) => boolean,
  label: string,
  timeoutMs = 90_000,
): Promise<T> {
  const startedAt = Date.now();
  let attempts = 0;
  let last = await read();
  attempts++;
  if (isCurrent(last)) {
    readConsistencyLog.push({ label, waitedMs: 0, attempts, converged: true });
    return last;
  }

  while (Date.now() - startedAt < timeoutMs) {
    await new Promise((r) => setTimeout(r, 1_000));
    last = await read();
    attempts++;
    if (isCurrent(last)) {
      readConsistencyLog.push({ label, waitedMs: Date.now() - startedAt, attempts, converged: true });
      return last;
    }
  }

  readConsistencyLog.push({ label, waitedMs: Date.now() - startedAt, attempts, converged: false });
  throw new Error(
    `Read did not catch up with a confirmed write within ${timeoutMs}ms (${label}). The write ` +
      `is on chain; the RPC is serving an older view.`,
  );
}
```

The predicates were exact-match, not "did anything change": for a record write it was
`record.assessedAt === <the timestamp just written>`; for a boolean flag it was
`flag === <the value just written>`. A partially-updated or unrelated change could not satisfy
them.

### 2.2 Setup

| Item | Value |
|---|---|
| Endpoint | `https://testrpc.xlayer.tech` (public, no key) |
| Chain | X Layer **Testnet**, chain id **1952** |
| Date of the runs | 2026-08-21, `03:57:59.774Z` and `03:59:40.519Z` |
| Client | `viem` public client over HTTP, default transport settings |
| Poll interval | 1 000 ms, fixed; no backoff, no jitter |
| Timeout | 90 000 ms (never reached) |
| Reads | `eth_call` at block tag `"latest"` |
| Writes | ordinary `eth_sendRawTransaction`, waited to receipt before any read |
| Network location | a single developer machine, one ISP, one geography |

### 2.3 The measurement's resolution, stated plainly

**Every number below is quantised by the 1-second poll interval and is an upper bound.**

All eight observations converged on their third attempt. Under this loop the third attempt
*returns* at roughly two seconds of sleeping plus three round trips, so a recorded 2 519 ms
implies a round trip of about 173 ms and means only:

> the read had not converged at attempt 2 (roughly 1.2–1.4 s in), and had converged by attempt
> 3 (2 519 ms in).

The true convergence moment lies somewhere in that window. **Do not quote 2 519 ms as "the lag
is 2.5 seconds".** The honest statement is: the lag was longer than about 1.3 s and no longer
than about 2.7 s, in these eight cases, on this day. A finer-grained measurement was not taken.

### 2.4 What this method does not do

It never contrasts two nodes directly. It measures how long the *endpoint as a whole* takes to
start returning the new value. It cannot say how many nodes are behind the balancer, how far
behind any individual node is, or whether the lag distribution has a long tail past what the
sample caught.

---

## 3. The raw data

Eight observations, from two consecutive runs on 2026-08-21, both against
`https://testrpc.xlayer.tech`, chain id 1952. Reproduced here in full so this note stands
alone.

### Run 1 — 2026-08-21T03:57:59.774Z

| Write that was waited on | waited (ms) | attempts | converged |
|---|---:|---:|---|
| record write, `assessedAt=1787284258` | 2 519 | 3 | yes |
| record write, `assessedAt=1787284275` | 2 566 | 3 | yes |
| record write, `assessedAt=1787284655` | 2 589 | 3 | yes |
| boolean flag set to `true` | 2 706 | 3 | yes |
| boolean flag set to `false` | 2 746 | 3 | yes |

Run totals as recorded: `maxWaitedMs` 2 746, `totalWaitedMs` 13 126.

### Run 2 — 2026-08-21T03:59:40.519Z

Same endpoint and chain, a second contract deployment, about 100 seconds later.

| Write that was waited on | waited (ms) | attempts | converged |
|---|---:|---:|---|
| record write, `assessedAt=1787284750` | 2 594 | 3 | yes |
| boolean flag set to `true` | 2 566 | 3 | yes |
| boolean flag set to `false` | 2 530 | 3 | yes |

Run totals as recorded: `maxWaitedMs` 2 594, `totalWaitedMs` 7 690.

### Summary over all eight

- range **2 519 – 2 746 ms**, spread 227 ms
- **8 of 8** converged; **0** timed out
- **8 of 8** needed exactly 3 attempts, i.e. every single one was stale on first read and
  still stale on second read
- two different contract deployments, same endpoint, ~100 s apart, same behaviour

The last two points matter more than the millisecond figures. A 100% first-read staleness rate
across eight writes is not a tail event you can ignore; and the tight 227 ms spread across two
deployments is consistent with a systematic property of the endpoint rather than a transient
hiccup.

### The labels, verbatim

The tables above rename the writes into generic terms. The raw artifact's own labels, for
anyone checking this against the source, are:

```
run 1: "postAssessment assessedAt=1787284258"  2519 ms, 3 attempts, converged
       "postAssessment assessedAt=1787284275"  2566 ms, 3 attempts, converged
       "postAssessment assessedAt=1787284655"  2589 ms, 3 attempts, converged
       "setPaused(true)"                       2706 ms, 3 attempts, converged
       "setPaused(false)"                      2746 ms, 3 attempts, converged
run 2: "postAssessment assessedAt=1787284750"  2594 ms, 3 attempts, converged
       "setPaused(true)"                       2566 ms, 3 attempts, converged
       "setPaused(false)"                      2530 ms, 3 attempts, converged
```

`postAssessment` writes a struct to a mapping; `setPaused` flips a boolean. Nothing about the
finding depends on either. The `assessedAt` values are the unix timestamps written into those
records, used as the convergence predicate because they are unique per write.

Cross-check available to anyone: `assessedAt=1787284750` is still readable on chain in the
`AssessmentPosted` log at block 38 825 918, transaction
`0x025ca92d8d477af734d3e7ce0e7465bf3afc0b1d511acf4fc184c5add1178671`. Decoding that log with
the code in §5 returns `assessedAt: 1787284750`, matching the label above.

### The qualitative observation, quoted verbatim

The run's own artifact carries this note alongside the numbers:

> X Layer's public RPC is load-balanced and serves stale reads. A confirmed `postAssessment`
> whose own event decoded to `PROTECT` was immediately followed by `currentRecord()` returning
> the previous `WATCH` record. Measured convergence lag 2519-2746 ms per write. A naive
> consumer can read `NORMAL` while a `PROTECT` is live — for a risk registry that is the
> dangerous direction. Pin reads to a block or follow `AssessmentPosted`; do not poll
> `currentRecord`.

Translated out of that project's vocabulary: a transaction confirmed and its own event said
the state was now the elevated one, while the immediately following getter call still returned
the earlier, lower-severity record.

---

## 4. Mitigation A — pin every read to a block number

**The rule: never send `"latest"` when you care about the answer.** Resolve a height once,
then read at that exact height. Every node that has the block returns the identical answer, and
you can state the height you read at.

The block tag is the last parameter of `eth_call`. Replacing `"latest"` with a hex block number
is the entire change.

### Zero-dependency Node

```js
// Read a contract at an explicit height. Works against any EVM endpoint, no libraries.
async function rpc(url, method, params) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const body = await res.json();
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result;
}

/**
 * Reads `calldata` against `contract` at an explicit block, and hands the height back with
 * the value. A read whose height you cannot state is a read you cannot check later.
 */
async function readAtBlock(url, contract, calldata, blockNumber) {
  const tag = '0x' + BigInt(blockNumber).toString(16);
  const value = await rpc(url, 'eth_call', [{ to: contract, data: calldata }, tag]);
  return { value, blockNumber: Number(blockNumber) };
}

// After a write: read at the block your transaction landed in, not at "latest".
const receipt = await rpc(url, 'eth_getTransactionReceipt', [txHash]);
const { value, blockNumber } = await readAtBlock(url, contract, calldata, BigInt(receipt.blockNumber));
```

If the node answering that `eth_call` has not reached your block, it returns an **error**
instead of a stale value. That is the whole point: pinning converts a silent wrong answer into
a loud, retryable one.

Verified on `https://testrpc.xlayer.tech`, 2026-08-21T18:10Z: an `eth_call` pinned to the
current head succeeds, and the same call pinned to head+5 returns

```json
{ "code": -32019, "message": "block is out of range" }
```

**Caveat on that test.** head+5 is a block that does not exist for *any* node, which is not
quite the same situation as a lagging node being asked for a block that does exist elsewhere.
It shows the error shape this endpoint uses for "I do not have that block", which is the shape
you must handle, but it does not prove a lagging node returns this exact code. Other clients
and providers word it differently (`header not found`, `missing trie node`, `unknown block`),
so match on more than one phrase and never let an unmatched error fall through as success.

```js
// Retry the pinned read until a node that has the block answers. Bounded, and it can only
// ever return the state at exactly `blockNumber` — never a newer or older one.
const BEHIND = /out of range|not found|missing|unknown block/i;

async function readAtBlockWithRetry(url, contract, calldata, blockNumber, tries = 10) {
  for (let i = 0; i < tries; i++) {
    try {
      return await readAtBlock(url, contract, calldata, blockNumber);
    } catch (err) {
      if (!BEHIND.test(err.message)) throw err;   // a real error, not a lagging node
      await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }
  throw new Error(`no node served block ${blockNumber} after ${tries} tries`);
}
```

### viem

```ts
import { createPublicClient, http } from 'viem';

const client = createPublicClient({ transport: http('https://testrpc.xlayer.tech') });

const hash = await walletClient.writeContract({ /* ... */ });
const receipt = await client.waitForTransactionReceipt({ hash });

// `blockNumber` is the pin. Every read that describes the effect of this write uses it.
const value = await client.readContract({
  address: contractAddress,
  abi,
  functionName: 'someGetter',
  args: [],
  blockNumber: receipt.blockNumber,
});
```

### ethers v6

```ts
const receipt = await tx.wait();
const value = await contract.someGetter({ blockTag: receipt.blockNumber });
```

### Rules that come with pinning

- **Carry the height with the value everywhere**, including into your UI and your logs. A
  state with no height attached is not checkable by anyone, including you.
- **Never compare values read at different heights** and call the difference a state change.
  It may be the same state seen from two nodes.
- Archive-node limits apply to old blocks. Recent heights (last few hundred blocks) are served
  by ordinary full nodes; pinning to something hours old may need an archive endpoint.
- Pinning does **not** help you learn about *new* state. For that, see mitigation B.

---

## 5. Mitigation B — follow events instead of polling state

**Polling `"latest"` asks "what is true now?", which is exactly the question a load-balanced
endpoint cannot answer consistently. Following logs asks "what happened, and at which
height?", which every node answers identically for blocks it has.**

A log carries its own `blockNumber` and `transactionHash`. It cannot arrive without them. So a
consumer built on logs always knows the height of the fact it is holding, never invents a
transition that did not happen, and degrades into "I am behind" rather than into "the state
changed back".

This section uses a concrete event, but nothing is specific to it. Substitute any event from
any contract on X Layer.

### Step 1 — compute the event's `topic0`

`topic0` is `keccak256` of the event's canonical signature: the name, then the parameter types
in order, no names, no spaces. Enums are `uint8`. Indexed and non-indexed parameters both
appear.

```solidity
event AssessmentPosted(
    bytes32 indexed key,
    address indexed asset,
    bytes32 indexed poolId,
    RiskState state,       // an enum -> uint8
    uint32 reasonBits,
    uint64 assessedAt,
    uint64 expiresAt,
    bytes32 evidenceCommitment
);
```

Canonical signature: `AssessmentPosted(bytes32,address,bytes32,uint8,uint32,uint64,uint64,bytes32)`

```bash
cast sig-event "AssessmentPosted(bytes32,address,bytes32,uint8,uint32,uint64,uint64,bytes32)"
# 0x86a1931c7ee126cfee1d62ec50eed2d2ac38ddfe3a8668b7f2f366ef84397936
```

```ts
// viem, if you would rather not shell out
import { toEventSelector } from 'viem';
const topic0 = toEventSelector(
  'event AssessmentPosted(bytes32 indexed key, address indexed asset, bytes32 indexed poolId, uint8 state, uint32 reasonBits, uint64 assessedAt, uint64 expiresAt, bytes32 evidenceCommitment)',
);
```

### Step 2 — pull logs forward from a height you have already processed

**Mind the range cap.** `https://testrpc.xlayer.tech` rejects any `eth_getLogs` whose
`toBlock - fromBlock` exceeds **100**, with `block range greater than 100 max`. Verified
2026-08-22: a span of 100 succeeds, 101 succeeds (the cap is on the difference, so
`fromBlock..fromBlock+100` is 101 blocks inclusive), 102 fails. A follower that asks for
"everything since my cursor" will therefore work fine while it is caught up and fail the
moment it falls behind — the worst possible time. Chunk unconditionally.

```js
// Zero-dependency log follower. Holds a cursor, never asks "what is true now?".
// MAX_SPAN is the endpoint's eth_getLogs limit on (toBlock - fromBlock).
const MAX_SPAN = 100n;

async function pollLogs(url, address, topic0, fromBlock, { confirmations = 0n } = {}) {
  const head = BigInt(await rpc(url, 'eth_blockNumber', [])) - BigInt(confirmations);
  if (head < fromBlock) return { logs: [], nextFrom: fromBlock, caughtUp: true };

  // Never ask for more than the endpoint will serve, even when far behind.
  const to = fromBlock + MAX_SPAN < head ? fromBlock + MAX_SPAN : head;

  const logs = await rpc(url, 'eth_getLogs', [{
    address,                                   // omit to watch every contract
    topics: [topic0],                          // add more entries to filter indexed args
    fromBlock: '0x' + fromBlock.toString(16),
    toBlock: '0x' + to.toString(16),
  }]);

  // Advance past what you just consumed. This cursor is your whole state.
  // caughtUp:false means call again immediately rather than sleeping.
  return { logs, nextFrom: to + 1n, caughtUp: to === head };
}
```

Filtering on indexed arguments happens positionally in `topics`. `topics[1]` is the first
indexed parameter, `topics[2]` the second, and so on; `null` means "any".

```js
// Only logs for one asset (2nd indexed param), any key, any pool:
topics: [topic0, null, '0x' + assetAddress.slice(2).padStart(64, '0').toLowerCase()]
```

### Step 3 — decode, and keep the height

```js
// Non-indexed parameters are ABI-encoded, in order, in `log.data`. All the types in this
// event are static, so decoding is "slice 32-byte words" — no head/tail offsets involved.
function decode(log) {
  const word = (i) => log.data.slice(2 + i * 64, 2 + (i + 1) * 64);
  return {
    // indexed parameters live in topics, not data
    key:    log.topics[1],
    asset:  '0x' + log.topics[2].slice(26),
    poolId: log.topics[3],
    // non-indexed, in declaration order
    state:               Number(BigInt('0x' + word(0))),
    reasonBits:          Number(BigInt('0x' + word(1))),
    assessedAt:          Number(BigInt('0x' + word(2))),
    expiresAt:           Number(BigInt('0x' + word(3))),
    evidenceCommitment:  '0x' + word(4),
    // the part that makes this correct: every fact carries its height
    blockNumber:      Number(BigInt(log.blockNumber)),
    transactionHash:  log.transactionHash,
  };
}
```

Dynamic types (`string`, `bytes`, arrays) need real ABI decoding, so use `viem`'s
`decodeEventLog` or `ethers`' `Interface.parseLog` there. Static-only events decode with the
slicing above and no dependencies.

### Step 4 — rules for the cursor

- **Advance the cursor only past blocks you have fully processed.** Overlapping ranges are
  fine and cheap; gaps are permanent data loss.
- **Deduplicate on `(transactionHash, logIndex)`.** Overlapping ranges will re-deliver logs,
  and you want that to be harmless.
- **Expect `eth_getLogs` to be answered by a lagging node too.** It returns fewer logs, never
  wrong ones, so your cursor simply does not advance. That is the failure mode you want.
- **Set `confirmations` above zero if reorgs matter to you.** Height divergence and reorgs are
  different problems; this note is about the first, but a log follower is where you handle
  both.
- **Seed the cursor from the deployment block, not from `"latest"`**, or your first run
  silently starts with no history. Blocks arrived about 1.00 s apart during the 2026-08-22
  sampling (190 blocks in 190 776 ms), so with a 100-block cap, backfilling a day costs on the
  order of 860 calls — plan for it rather than discovering it in production.

### When you must still read state

Some values have no event: an immutable set in the constructor, a derived view function, a
mapping nobody emits on. For those, use mitigation A — read them pinned to the block number
you got from the log that made you care.

```js
// Correct combination: the event tells you WHEN, the pinned read tells you WHAT.
for (const log of logs) {
  const at = BigInt(log.blockNumber);
  const derived = await readAtBlockWithRetry(url, contract, someViewCalldata, at);
  handle({ ...decode(log), derived: derived.value, atBlock: Number(at) });
}
```

### If you must poll state anyway

Sometimes you cannot restructure. Then make the staleness visible instead of invisible:

- Read `eth_blockNumber` and the state **together**, and treat the pair as one observation.
- Require the observed height to be **at or beyond** the block of the write you are tracking
  before you believe the value.
- Require **two consecutive reads to agree** before acting.
- Treat a disagreement as **"not yet known"**, never as **"the state changed back"**. This one
  rule removes most of the damage on its own.

---

## 6. Reproduction

`check-read-consistency.mjs` (alongside this note at
`tools/xlayer-rpc-consistency/check-read-consistency.mjs`) probes any JSON-RPC endpoint for
height divergence. Zero dependencies, read-only, no keys, no writes, Node 18+.

```bash
node check-read-consistency.mjs --help
node check-read-consistency.mjs                      # defaults to X Layer Testnet, chain 1952
node check-read-consistency.mjs --rounds 600 --json > run.json
node check-read-consistency.mjs --rpc-url https://rpc.xlayer.tech --chain-id 196 \
                                --contract 0xYourContract --calldata 0xYourSelector
```

Exit codes: `0` divergence observed, `3` none observed this run, `1` error, `2` no bytecode at
the given contract.

### What it looks for

The script never sends a transaction, so it cannot reproduce read-after-write directly. Instead
it looks for the *cause* — one endpoint answering from nodes at different heights — using
probes that are one-directional, meaning a hit can only be produced by more than one answering
node:

- **Probe A — head goes backwards.** `eth_blockNumber` across strictly sequential calls
  (request N+1 sent only after response N arrived). A single node's head never decreases, and
  under strict sequencing request N+1 is processed after request N. A lower height therefore
  means a second, lagging node answered.
- **Probe B — the endpoint's own head is unknown.** The endpoint reports head `H`; a request
  for block `H` sent afterwards returns `null`. One node that published `H` still has `H` a
  moment later. A `null` means a different node answered.
- **Probe D — a just-reported transaction has no receipt.** The endpoint reports transaction
  `X` as included in block `H`; `eth_getTransactionReceipt(X)` sent immediately afterwards
  returns `null`. This is the closest available analogue of read-after-write, and it is the
  probe that actually fires.

Probes B and D issue a small concurrent burst on purpose. A sequential keep-alive stream tends
to get pinned to one backend by the load balancer; concurrent requests spread across more of
them. Probe A must stay sequential to be sound — under concurrency a late-arriving response may
have been processed early, so a lower height would prove nothing.

Rate-limit and transport errors are counted separately and are **never** counted as
divergence. Only a clean `"result": null` with no error object counts.

### What it found when re-run, 2026-08-21 17:40Z – 18:15Z

That is about 14 hours after the §3 measurements, on the same UTC day, against the same
endpoint, from the same machine and network. (Local time there is UTC+7, so these runs are
dated 2026-08-22 locally; UTC is used throughout to keep the ordering unambiguous.)

| Sample | Rounds | Spacing | Divergence hits |
|---|---:|---:|---:|
| shipped script | 60 | 120 ms | 0 |
| shipped script | 200 | 0 ms | 0 |
| shipped script | 300 | 150 ms | 0 |
| shipped script | 600 | 100 ms | 0 |
| shipped script | 250 | 120 ms | 0 |
| ad-hoc receipt probe | 246 | 150 ms | **1** |

The one hit, at ~17:47Z: the endpoint reported transaction `0xd07e292774…` as included in
block 38 876 097, and **2 of 6** `eth_getTransactionReceipt` calls issued immediately
afterwards returned `null`. That is probe D firing, and it is the same shape as the original
finding — the endpoint contradicting, within milliseconds, a fact it had just stated.

Real output of the last run:

```
  ---------------------------- FINDINGS --------------------------------
  rounds sampled                600/600 over 373554 ms
  head range                    38876522 .. 38876896  (374 blocks advanced)
  probe A  head went backwards  0 hit(s)
  probe B  own head not found   0 hit(s) in 0 round(s)
  probe D  receipt not found    0 hit(s) in 600 round(s)
  probe C  distinct latest vals 1 (informational; state may change legitimately)
  rpc errors / transport errors 0 / 0  (never counted as divergence)

  ----------------------------- VERDICT --------------------------------
  NO DIVERGENCE OBSERVED in this sample.
```

**So: the property did not reproduce on demand.** State that plainly rather than implying
the script fires whenever you point it at the endpoint. One hit in 1 656 rounds total.

Two honest observations about that number, kept separate from each other:

- **[Fact]** The single hit is hard to square with a steady background rate. If the rate were
  the 1-in-246 the first sample suggests, the following 1 410 rounds would have been expected
  to produce roughly six more hits, and produced none.
- **[Inference]** That pattern is what an *episodic* fault looks like: one node briefly falls
  behind, is caught by whatever probe is running at that minute, then rejoins and the endpoint
  looks perfectly consistent for the next half hour. It is not a steady low-probability
  coin flip. Nobody inspected the operator's infrastructure, so this remains a reading of the
  numbers, not a finding.

A second inference, also unestablished: reading right after your **own** write is a much
harsher test than passively watching the chain, because it forces a read at the exact instant
the newest block is still propagating. The §3 measurements did that and were stale 8 times out
of 8. This script cannot send transactions, so it can only catch the far weaker passive
version. That would explain the gap between 100% and roughly 0%, but this note does not
establish it.

For anyone reproducing: **a quiet run is not a disproof.** The probes fire only when two nodes
disagree while you happen to be looking. Raise `--rounds`, re-run at a different hour, and if
you can, do the real test — send a transaction on testnet, wait for the receipt, then read at
`"latest"` in a tight loop and time how long the old value persists. That is the §3
measurement, and it is the one that produced a hit every single time.

---

## 7. Limits of this finding

Stated so nobody has to reverse-engineer them:

- **Testnet only.** Every observation in §3 is X Layer **Testnet**, chain id **1952**, endpoint
  `https://testrpc.xlayer.tech`. **No measurement was taken against X Layer mainnet** (chain
  id 196, `https://rpc.xlayer.tech`). This note makes **no claim** about mainnet behaviour in
  either direction. The reproduction script accepts mainnet parameters; nobody has run it there
  as of this writing.
- **One endpoint.** This is a property of a public load-balanced endpoint, not of X Layer the
  chain, not of its consensus, and not of any private, paid, or self-hosted RPC. A dedicated
  node or a single-backend provider will not show this.
- **Two runs, one day, eight writes.** 2026-08-21, about 100 seconds apart, from one machine
  on one ISP in one geography. Eight observations is enough to establish that the property
  exists; it is nowhere near enough to characterise its distribution, its tail, or its
  variation by time of day or region.
- **Not a benchmark.** No latency, throughput, availability, or reliability figure appears
  here, and none may be inferred. The millisecond values measure how long a *polling loop* took
  to see a write, not how fast anything is. Quoting them as endpoint performance would be a
  misreading.
- **Upper bounds, not measurements of the lag.** The 1-second poll interval quantises every
  figure (§2.3). The true convergence lag is somewhere below the recorded number.
- **Not reproducible on demand.** Re-running 14 hours later produced **one hit in 1 656
  rounds**, and the shipped script's own five runs (1 410 rounds) produced **zero** (§6). The
  §3 measurements stand as what was observed at ~03:58Z on 2026-08-21, and nothing here shows
  the property is observable at an arbitrary moment. Anyone repeating this should expect to
  need patience, or to send real transactions.
- **RPC behaviour changes without notice.** Node counts, balancer policy, sync strategy, and
  hardware are all operator decisions that can change any day. Nothing here should be treated
  as a durable property of the endpoint. Re-run the script rather than trusting this note's
  numbers.
- **No root cause established.** "Load-balanced across nodes at differing heights" is the
  explanation consistent with every observation, and probes A, B, and D are each individually
  inconsistent with a single answering node. But nobody inspected the operator's
  infrastructure, and no alternative mechanism was ruled out by direct evidence.
- **The mitigations were not A/B tested.** Block-pinned reads and event-following are standard
  practice for exactly this class of problem, and the project that measured this adopted both.
  Neither was measured against a control.
- **This is not a defect report.** Serving reads from a pool of nodes at slightly different
  heights is ordinary behaviour for a public load-balanced endpoint, on any chain. It is
  documented here because it is undocumented at the point of use, and because the mitigations
  are cheap and most people write the naive version first.

---

## 8. One-paragraph version, for pasting elsewhere

> X Layer Testnet's public RPC (`https://testrpc.xlayer.tech`, chain id 1952) is load-balanced
> across nodes at differing block heights, so a read issued right after a confirmed write can
> be answered by a node that lacks that write and silently return the previous state. Measured
> 2026-08-21 over eight writes: every one was stale on first read, and reads converged after
> 2 519–2 746 ms (upper bounds — the measuring loop polled once per second). Fix: pin reads to
> an explicit block number instead of `"latest"`, and follow the events your write emits
> instead of polling state. Caveats that travel with the number: testnet only, no mainnet
> measurement was taken; eight writes on one day from one machine; not a benchmark; the
> property is episodic and did not reproduce on demand when probed 14 hours later; RPC
> behaviour can change at any time.
