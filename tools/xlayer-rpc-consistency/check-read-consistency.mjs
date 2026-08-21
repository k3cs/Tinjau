#!/usr/bin/env node
// SPDX-License-Identifier: MIT
//
// check-read-consistency — does this JSON-RPC endpoint answer from one node, or from several
// nodes at different block heights?
//
// WHY YOU WOULD CARE
//   If an endpoint is load-balanced across nodes that are not at the same height, a read
//   issued right after a confirmed write can be answered by a node that does not have that
//   write yet. You do not get an error. You get the PREVIOUS state, which is a plausible,
//   stale, wrong answer — the worst kind.
//
// WHAT THIS PROVES, when a probe fires
//   Each probe below is one-directional: it can only be produced by more than one answering
//   node, so a hit is evidence, not a hint.
//
//     probe A  eth_blockNumber goes BACKWARDS across STRICTLY SEQUENTIAL calls (request N+1
//              is sent only after response N has arrived). One node's head never decreases,
//              and under strict sequencing request N+1 is processed after request N. A lower
//              height therefore means a second, lagging node answered.
//
//     probe B  the endpoint reports head = H, and a request for block H issued afterwards
//              returns null. A single node that has published H still has H a moment later.
//              A null means a different node answered, and it does not have H.
//
//     probe D  the endpoint reports transaction X as included in block H, and
//              eth_getTransactionReceipt(X) issued immediately afterwards returns null.
//              This is read-after-write divergence in its purest form and is the probe
//              closest to what breaks application code.
//
//   Probe C (distinct eth_call values at "latest") is INFORMATIONAL only. Contract state can
//   legitimately change between calls, so it proves nothing on its own.
//
//   Note on concurrency: probe A must be sequential to be sound. Under concurrent requests a
//   late-arriving response may have been PROCESSED early, so a lower height proves nothing.
//   Probes B and D stay sound under concurrency because the fact they contradict (H exists,
//   X is in H) was established by the endpoint BEFORE the burst was sent. The script uses a
//   small concurrent burst for B and D on purpose: concurrent requests are far more likely to
//   be spread across backends than a sequential keep-alive stream, which a load balancer
//   often pins to one node.
//
// WHAT THIS DOES NOT PROVE
//   - Nothing about throughput, latency, or reliability. This is not a benchmark and its
//     numbers must never be quoted as one. Timings here are incidental.
//   - Nothing about any endpoint other than the --rpc-url you pass, from any network location
//     other than yours.
//   - Nothing durable. RPC topology changes without notice.
//   - A quiet run is NOT a disproof. In the author's own measurements probe D fired roughly
//     once in 250 rounds. Divergence is intermittent by nature: it needs two nodes to
//     disagree during your sample window. Re-run, or raise --rounds, before concluding.
//   - Rate-limit and transport errors are counted SEPARATELY and never counted as divergence.
//     Only a clean `"result": null` with no error object counts.
//
// Zero dependencies. No npm install, no package.json, no keys, no signing, no writes.
// Every call is read-only. Node 18+ (needs global fetch).
//
// Usage
//   node check-read-consistency.mjs                        # defaults: X Layer Testnet
//   node check-read-consistency.mjs --help
//   node check-read-consistency.mjs --rpc-url <url> --chain-id <id> [--contract 0x..]
//   node check-read-consistency.mjs --rounds 400 --json > run.json
//
// Exit codes (branchable without parsing text)
//   0  ran cleanly, divergence OBSERVED
//   3  ran cleanly, divergence NOT observed in this sample (not a clean bill of health)
//   1  usage error, RPC failure, or malformed response
//   2  --contract has no bytecode on this chain

const DEFAULTS = {
  // X Layer Testnet's public endpoint. For X Layer mainnet use
  //   --rpc-url https://rpc.xlayer.tech --chain-id 196 --contract <any deployed address>
  // Any EVM endpoint works; nothing here is X Layer specific.
  rpcUrl: 'https://testrpc.xlayer.tech',
  chainId: 1952,
  // Any deployed contract. This default is a public, builder-controlled registry on X Layer
  // Testnet, used only as a stable address to read from.
  contract: '0x60062389a7AB08F0030FC06Adf9CE0C180537317',
  // A read-only selector on that contract: schemaVersion() -> bytes32. Replace with any
  // selector plus ABI-encoded arguments for a contract of your own.
  calldata: '0x4e2ce6d3',
  rounds: 120,
  burst: 6,
  delayMs: 150,
  timeoutMs: 15_000,
};

const USAGE = `
check-read-consistency — detect block-height divergence behind a load-balanced JSON-RPC endpoint

  node check-read-consistency.mjs [options]

Options
  --rpc-url <url>      JSON-RPC endpoint             (default ${DEFAULTS.rpcUrl})
  --chain-id <id>      expected chain id; refuses on mismatch (default ${DEFAULTS.chainId})
  --contract <0x..>    contract to read from         (default ${DEFAULTS.contract})
  --calldata <0x..>    calldata for that read        (default ${DEFAULTS.calldata}, schemaVersion())
  --rounds <n>         sample rounds                 (default ${DEFAULTS.rounds})
  --burst <n>          concurrent probes per round   (default ${DEFAULTS.burst}; raise it and
                                                      you will be rate limited, not helped)
  --delay-ms <n>       pause between rounds, ms      (default ${DEFAULTS.delayMs})
  --timeout-ms <n>     per-request timeout, ms       (default ${DEFAULTS.timeoutMs})
  --quiet              findings only, no per-round lines
  --json               append a machine-readable JSON report
  --help               this text

Divergence is intermittent. A run that observes nothing has not disproved anything;
re-run or raise --rounds.

Exit codes: 0 divergence observed | 3 none observed | 1 error | 2 no bytecode at --contract

Read-only. No keys, no writes, no dependencies.
`;

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) fail(1, `unexpected argument "${a}"${USAGE}`);
    const key = a.slice(2);
    if (key === 'help' || key === 'json' || key === 'quiet') {
      out[key] = true;
      continue;
    }
    const value = argv[++i];
    if (value === undefined) fail(1, `--${key} needs a value${USAGE}`);
    out[key] = value;
  }
  return out;
}

function fail(code, message) {
  process.stderr.write(`\nerror: ${message}\n`);
  process.exit(code);
}

function requireHex(name, value, byteLength) {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]*$/.test(value)) {
    fail(1, `--${name} must be 0x-prefixed hex, got ${JSON.stringify(value)}`);
  }
  if (byteLength !== undefined && value.length !== 2 + byteLength * 2) {
    fail(1, `--${name} must be ${byteLength} bytes, got ${(value.length - 2) / 2}`);
  }
  return value;
}

function requireInt(name, value, min) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min) fail(1, `--${name} must be an integer >= ${min}, got ${value}`);
  return n;
}

// ---------------------------------------------------------------------------
// Minimal JSON-RPC client.
//
// Three outcomes are kept apart on purpose, because collapsing them is how a probe like this
// starts lying: `ok` (a result, possibly null), `rpcError` (the node answered with an error
// object — rate limits live here), and `transport` (HTTP or socket failure). Only `ok` with a
// null result is ever counted as divergence.
// ---------------------------------------------------------------------------

let rpcId = 0;

async function rpc(url, method, params, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    return { kind: 'transport', detail: `${method}: ${err.message}` };
  }
  clearTimeout(timer);
  if (!res.ok) return { kind: 'transport', detail: `${method}: HTTP ${res.status}` };
  let body;
  try {
    body = await res.json();
  } catch {
    return { kind: 'transport', detail: `${method}: body was not JSON` };
  }
  if (body && body.error) return { kind: 'rpcError', detail: `${method}: ${body.error.message ?? JSON.stringify(body.error)}` };
  return { kind: 'ok', result: body ? body.result : undefined };
}

const toNumber = (hex) => Number(BigInt(hex));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(USAGE);
    process.exit(0);
  }

  const rpcUrl = args['rpc-url'] ?? process.env.XLAYER_RPC_URL ?? DEFAULTS.rpcUrl;
  const wantChainId = requireInt('chain-id', args['chain-id'] ?? process.env.XLAYER_CHAIN_ID ?? DEFAULTS.chainId, 1);
  const contract = requireHex('contract', args.contract ?? DEFAULTS.contract, 20);
  const calldata = requireHex('calldata', args.calldata ?? DEFAULTS.calldata);
  const rounds = requireInt('rounds', args.rounds ?? DEFAULTS.rounds, 2);
  const burst = requireInt('burst', args.burst ?? DEFAULTS.burst, 1);
  const delayMs = requireInt('delay-ms', args['delay-ms'] ?? DEFAULTS.delayMs, 0);
  const timeoutMs = requireInt('timeout-ms', args['timeout-ms'] ?? DEFAULTS.timeoutMs, 1);
  const asJson = Boolean(args.json);
  const quiet = Boolean(args.quiet);

  const out = (line = '') => process.stdout.write(line + '\n');
  const say = quiet ? () => {} : out;
  const startedAtIso = new Date().toISOString();

  // --- chain identity, checked before anything else -------------------------
  // Probing the right address on the wrong chain is the failure mode that produces a
  // confident wrong answer.
  const idRes = await rpc(rpcUrl, 'eth_chainId', [], timeoutMs);
  if (idRes.kind !== 'ok') fail(1, idRes.detail);
  const chainId = toNumber(idRes.result);
  if (chainId !== wantChainId) {
    fail(1, `chain id mismatch: --chain-id said ${wantChainId}, ${rpcUrl} reports ${chainId}. Refusing to continue.`);
  }

  const codeRes = await rpc(rpcUrl, 'eth_getCode', [contract, 'latest'], timeoutMs);
  if (codeRes.kind !== 'ok') fail(1, codeRes.detail);
  if (!codeRes.result || codeRes.result === '0x') {
    fail(2, `no contract bytecode at ${contract} on chain ${chainId}. Wrong address, wrong chain, or not deployed.`);
  }

  out('');
  out('==========================================================================');
  out(' JSON-RPC READ-CONSISTENCY PROBE');
  out(' Read-only. Detects whether one endpoint answers from nodes at different');
  out(' block heights. NOT a benchmark. Says nothing about any other endpoint.');
  out('==========================================================================');
  out(`  endpoint          ${rpcUrl}`);
  out(`  chain id          ${chainId}`);
  out(`  contract read     ${contract}  (${(codeRes.result.length - 2) / 2} bytes of code)`);
  out(`  calldata          ${calldata}`);
  out(`  sample            ${rounds} rounds, burst ${burst}, ${delayMs} ms apart`);
  out(`  started           ${startedAtIso}`);
  out('');

  // -------------------------------------------------------------------------
  // The sampling loop.
  // -------------------------------------------------------------------------
  const heads = [];
  const regressions = [];      // probe A
  const missingHeads = [];     // probe B
  const missingReceipts = [];  // probe D
  const callValues = new Map();// probe C, informational
  let rpcErrors = 0;
  let transportErrors = 0;
  let receiptRounds = 0;
  let blockRounds = 0;
  const t0 = Date.now();

  say('  round   head        A  probe          result');
  say('  ----------------------------------------------------------------------');

  for (let i = 0; i < rounds; i++) {
    if (i > 0 && delayMs > 0) await sleep(delayMs);

    // One call gives the head number, its hash, and its transaction list.
    const blockRes = await rpc(rpcUrl, 'eth_getBlockByNumber', ['latest', false], timeoutMs);
    if (blockRes.kind === 'rpcError') { rpcErrors++; continue; }
    if (blockRes.kind === 'transport') { transportErrors++; continue; }
    if (!blockRes.result) { rpcErrors++; continue; }

    const headHex = blockRes.result.number;
    const head = toNumber(headHex);
    const txs = blockRes.result.transactions ?? [];

    // --- probe A: strictly sequential, so a decrease is proof -----------------
    const prev = heads.length > 0 ? heads[heads.length - 1] : null;
    if (prev !== null && head < prev) {
      regressions.push({ round: i, from: prev, to: head, blocksBehind: prev - head });
    }
    heads.push(head);

    // --- probe C: informational only ----------------------------------------
    const callRes = await rpc(rpcUrl, 'eth_call', [{ to: contract, data: calldata }, 'latest'], timeoutMs);
    if (callRes.kind === 'ok') callValues.set(callRes.result, (callValues.get(callRes.result) ?? 0) + 1);
    else if (callRes.kind === 'rpcError') rpcErrors++;
    else transportErrors++;

    // --- probe D when the head block carries a transaction, else probe B -----
    let probeName;
    let hits = 0;
    if (txs.length > 0) {
      probeName = 'D receipt';
      receiptRounds++;
      const txHash = txs[txs.length - 1];
      const replies = await Promise.all(
        Array.from({ length: burst }, () => rpc(rpcUrl, 'eth_getTransactionReceipt', [txHash], timeoutMs)),
      );
      for (const r of replies) {
        if (r.kind === 'rpcError') rpcErrors++;
        else if (r.kind === 'transport') transportErrors++;
        else if (r.result === null || r.result === undefined) hits++;
      }
      if (hits > 0) {
        missingReceipts.push({ round: i, block: head, txHash, missing: hits, of: burst });
      }
    } else {
      probeName = 'B block  ';
      blockRounds++;
      const replies = await Promise.all(
        Array.from({ length: burst }, () => rpc(rpcUrl, 'eth_getBlockByNumber', [headHex, false], timeoutMs)),
      );
      for (const r of replies) {
        if (r.kind === 'rpcError') rpcErrors++;
        else if (r.kind === 'transport') transportErrors++;
        else if (r.result === null || r.result === undefined) hits++;
      }
      if (hits > 0) missingHeads.push({ round: i, head, missing: hits, of: burst });
    }

    const flagA = prev !== null && head < prev ? '  <-- HEAD WENT BACKWARDS' : '';
    const verdict = hits > 0 ? `MISSING ${hits}/${burst}  <-- STALE NODE ANSWERED` : `all ${burst} consistent`;
    say(`  ${String(i).padStart(5)}   ${String(head).padEnd(11)} ${prev === null ? ' ' : String(head - prev).padStart(1)}  ${probeName}      ${verdict}${flagA}`);
  }

  if (heads.length === 0) fail(1, 'every round failed; nothing was sampled. Check --rpc-url and connectivity.');

  const minHead = Math.min(...heads);
  const maxHead = Math.max(...heads);
  const elapsedMs = Date.now() - t0;
  const divergenceHits = regressions.length + missingHeads.length + missingReceipts.length;
  const diverged = divergenceHits > 0;

  // -------------------------------------------------------------------------
  // The mitigation, demonstrated rather than asserted.
  // -------------------------------------------------------------------------
  const pinned = Math.max(minHead, maxHead - 8);
  const pinnedHex = '0x' + pinned.toString(16);
  const pinnedRes = await rpc(rpcUrl, 'eth_call', [{ to: contract, data: calldata }, pinnedHex], timeoutMs);
  const latestRes = await rpc(rpcUrl, 'eth_call', [{ to: contract, data: calldata }, 'latest'], timeoutMs);
  const show = (r) => (r.kind === 'ok' ? String(r.result).slice(0, 66) : `[${r.kind}] ${r.detail}`);

  out('');
  out('  ---------------------------- FINDINGS --------------------------------');
  out(`  rounds sampled                ${heads.length}/${rounds} over ${elapsedMs} ms`);
  out(`  head range                    ${minHead} .. ${maxHead}  (${maxHead - minHead} blocks advanced)`);
  out(`  probe A  head went backwards  ${regressions.length} hit(s)`);
  for (const r of regressions.slice(0, 10)) {
    out(`             round ${r.round}: ${r.from} -> ${r.to}  (${r.blocksBehind} block(s) behind)`);
  }
  out(`  probe B  own head not found   ${missingHeads.length} hit(s) in ${blockRounds} round(s)`);
  for (const m of missingHeads.slice(0, 10)) {
    out(`             round ${m.round}: endpoint said head=${m.head}, then ${m.missing}/${m.of} said no such block`);
  }
  out(`  probe D  receipt not found    ${missingReceipts.length} hit(s) in ${receiptRounds} round(s)`);
  for (const m of missingReceipts.slice(0, 10)) {
    out(`             round ${m.round}: tx ${m.txHash} reported in block ${m.block},`);
    out(`                       then ${m.missing}/${m.of} receipt reads returned null`);
  }
  out(`  probe C  distinct latest vals ${callValues.size} (informational; state may change legitimately)`);
  out(`  rpc errors / transport errors ${rpcErrors} / ${transportErrors}  (never counted as divergence)`);
  out('');
  out('  ------------------------ THE MITIGATION ------------------------------');
  out(`  eth_call at "latest"                ${show(latestRes)}`);
  out('                                      ^ answered at a height you were not told');
  out(`  eth_call at ${pinnedHex} (${pinned})    ${show(pinnedRes)}`);
  out('                                      ^ same answer from every node that has this');
  out('                                        block, and you can state the height you read at');
  out('');
  out('  ----------------------------- VERDICT --------------------------------');
  if (diverged) {
    out(`  DIVERGENCE OBSERVED — ${divergenceHits} hit(s).`);
    out('  This endpoint answered from nodes at different block heights during the');
    out('  sample. A read issued right after a confirmed write can land on a node that');
    out('  lacks that write and return the PREVIOUS state: no error, just a stale');
    out('  answer. Pin reads to a block number, or follow the event your write emitted.');
  } else {
    out('  NO DIVERGENCE OBSERVED in this sample.');
    out('  This is NOT a clean bill of health. The probes only fire when two nodes');
    out('  disagree while you happen to be looking, and the rate can be well under 1%');
    out('  of rounds. Re-run, raise --rounds, or sample during write activity before');
    out('  concluding anything. The mitigations cost little and stay correct either way.');
  }
  out('');

  if (asJson) {
    out(
      JSON.stringify(
        {
          tool: 'check-read-consistency',
          startedAtIso,
          endpoint: rpcUrl,
          chainId,
          contract,
          calldata,
          rounds,
          roundsSampled: heads.length,
          burst,
          delayMs,
          elapsedMs,
          headMin: minHead,
          headMax: maxHead,
          probeA_headRegressions: regressions,
          probeB_ownHeadNotFound: missingHeads,
          probeD_receiptNotFound: missingReceipts,
          probeC_distinctLatestValues: callValues.size,
          rpcErrors,
          transportErrors,
          pinnedBlock: pinned,
          pinnedCallValue: pinnedRes.kind === 'ok' ? pinnedRes.result : null,
          latestCallValue: latestRes.kind === 'ok' ? latestRes.result : null,
          divergenceObserved: diverged,
          divergenceHits,
          _notABenchmark:
            'Latency and throughput are not measured and must not be inferred from this file. One endpoint, one network location, one moment.',
          _quietRunIsNotADisproof:
            'divergenceObserved:false means the probes did not fire during this sample. It is not evidence that the endpoint is strongly consistent.',
        },
        null,
        2,
      ),
    );
  }

  process.exit(diverged ? 0 : 3);
}

main().catch((err) => fail(1, err.stack ?? String(err)));
