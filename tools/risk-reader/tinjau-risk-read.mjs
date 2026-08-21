#!/usr/bin/env node
// SPDX-License-Identifier: MIT
//
// tinjau-risk-read — a REFERENCE CONSUMER of the Tinjau risk registry, built by Tinjau.
//
// WHAT THIS IS: a worked example showing that the on-chain risk record is readable and
// decodable by someone who has only (a) a JSON-RPC endpoint and (b) the published ABI in
// ./abi/. It exists to demonstrate reusability of the record.
//
// WHAT THIS IS NOT: it is not external adoption, not an integration with a third party, and
// not evidence that anyone outside this project consumes the registry. Tinjau wrote it.
//
// INDEPENDENCE, and why it is enforced structurally rather than promised:
//   - zero npm dependencies. No package.json, no node_modules, no install step.
//   - imports nothing from apps/server/**, nothing from apps/web/**, nothing from
//     contracts/out/**. The only files it reads are the two JSON files in ./abi/, which are
//     hand-transcribed copies of the published ABI and the documented bit mapping.
//   - no keccak256 implementation, because the 4-byte selectors are carried explicitly in
//     ./abi/TinjauRiskRegistry.read.abi.json and verified against `cast sig` by the test.
//   - reuses none of Tinjau's decoding helpers. If it did, it would prove nothing about
//     third-party readability: it would only prove Tinjau can read its own output.
//
// Usage:
//   node tinjau-risk-read.mjs --rpc-url <url> --chain-id <id> --registry <0x..> \
//                             --asset <0x..> --pool-id <0x..32bytes> [--json]
//   node tinjau-risk-read.mjs --explain-reason-bits <0x..>   (offline; no chain needed)
//
// Every flag also has an environment fallback: TINJAU_RPC_URL, TINJAU_CHAIN_ID,
// TINJAU_REGISTRY, TINJAU_ASSET, TINJAU_POOL_ID.
//
// Exit codes (a consumer can branch on these without parsing text):
//   0  read succeeded and a record was decoded
//   1  usage error, RPC failure, or malformed response
//   2  no contract bytecode at the given registry address
//   3  read succeeded; there is NO RECORD for this (asset, poolId)
//   4  the record carries a reason bit this schema version does not define — refused
//   5  the registry reports a schema version this reader was not written for — refused

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// The self-carried ABI. These two files are the entire contract surface used.
// ---------------------------------------------------------------------------

const ABI = loadJson('./abi/TinjauRiskRegistry.read.abi.json');
const MAP = loadJson('./abi/reason-bits.json');

/** Schema version this decoder was written against. Anything else is refused. */
const SUPPORTED_SCHEMA = MAP.schemaVersion;

const SELECTOR = Object.fromEntries(
  ABI.functions.map((f) => [f.signature.slice(0, f.signature.indexOf('(')), f.selector]),
);

const BIT_BY_POSITION = new Map(MAP.bits.map((b) => [b.bit, b]));

function loadJson(rel) {
  return JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));
}

// ---------------------------------------------------------------------------
// Minimal ABI codec. Everything this contract returns on the read path is a
// STATIC type, so encoding is "one 32-byte word per value" and decoding is
// "slice 32-byte words". No dynamic head/tail handling is needed, and pretending
// otherwise would add code that is never exercised.
// ---------------------------------------------------------------------------

const word = (i, hex) => hex.slice(2 + i * 64, 2 + (i + 1) * 64);
const toBigInt = (w) => BigInt('0x' + w);
const toNumber = (w) => Number(toBigInt(w));
const toAddress = (w) => '0x' + w.slice(24);
const toBytes32 = (w) => '0x' + w;
const toBool = (w) => toBigInt(w) !== 0n;

function encodeAddress(a) {
  return a.toLowerCase().replace(/^0x/, '').padStart(64, '0');
}
function encodeBytes32(b) {
  return b.toLowerCase().replace(/^0x/, '').padStart(64, '0');
}

/** bytes32 holding packed ASCII -> string, trailing zero bytes dropped. */
function bytes32ToAscii(b) {
  const hex = b.replace(/^0x/, '');
  let out = '';
  for (let i = 0; i < 64; i += 2) {
    const code = parseInt(hex.slice(i, i + 2), 16);
    if (code === 0) break;
    out += String.fromCharCode(code);
  }
  return out;
}

// ---------------------------------------------------------------------------
// JSON-RPC. Node 18+ ships fetch, so there is no HTTP dependency either.
// ---------------------------------------------------------------------------

let rpcId = 0;

async function rpc(url, method, params) {
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
    });
  } catch (e) {
    fail(1, `RPC transport failure calling ${url}: ${e.message}`);
  }
  if (!res.ok) fail(1, `RPC returned HTTP ${res.status} from ${url}`);
  const body = await res.json();
  if (body.error) {
    const data = body.error.data ? ` (data: ${JSON.stringify(body.error.data)})` : '';
    fail(1, `RPC error on ${method}: ${body.error.message}${data}`);
  }
  return body.result;
}

async function call(url, to, fn, argWords = '') {
  const sel = SELECTOR[fn];
  if (!sel) fail(1, `internal: no selector carried for ${fn}`);
  return rpc(url, 'eth_call', [{ to, data: sel + argWords }, 'latest']);
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function fail(code, msg) {
  process.stderr.write(`\nERROR: ${msg}\n`);
  process.exit(code);
}

/// Human-readable output. Silenced by --json so the JSON document is the ONLY thing on stdout
/// and can be piped straight into a parser. Errors always go to stderr regardless.
let HUMAN = true;
const say = (...a) => {
  if (HUMAN) console.log(...a);
};

function iso(unixSeconds) {
  if (unixSeconds === 0) return '(not set)';
  return new Date(unixSeconds * 1000).toISOString().replace('.000Z', 'Z');
}

function relative(unixSeconds, nowSeconds) {
  if (unixSeconds === 0) return '';
  const d = unixSeconds - nowSeconds;
  const a = Math.abs(d);
  if (a < 2) return 'now';
  const unit =
    a < 90 ? [a, 's'] : a < 5400 ? [Math.round(a / 60), 'min'] : a < 172800 ? [Math.round(a / 3600), 'h'] : [Math.round(a / 86400), 'd'];
  return d >= 0 ? `in ${unit[0]}${unit[1]}` : `${unit[0]}${unit[1]} ago`;
}

const feePct = (fee) => `${fee} (${(fee / 10000).toFixed(4)}%)`;

function enumName(kind, ordinal) {
  const entry = MAP.enums[kind].find((e) => e.ordinal === ordinal);
  return entry ?? null;
}

function rule(label = '') {
  const line = '-'.repeat(74);
  return label ? `\n${label}\n${line}` : line;
}

// ---------------------------------------------------------------------------
// Reason-bit expansion. Refuses undefined bits rather than masking them off.
// ---------------------------------------------------------------------------

function expandReasonBits(bits) {
  const undefinedBits = [];
  const known = [];
  for (let i = 0; i < 32; i += 1) {
    if (((bits >>> i) & 1) === 0) continue;
    const entry = BIT_BY_POSITION.get(i);
    if (entry) known.push(entry);
    else undefinedBits.push(i);
  }
  return { known, undefinedBits };
}

/** Greedy word wrap, so a long caveat stays readable in an 80-column terminal. */
function wrap(text, width) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/)) {
    if (line && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function printReasonBits(bits) {
  const hex = '0x' + (bits >>> 0).toString(16).padStart(8, '0');
  const { known, undefinedBits } = expandReasonBits(bits);

  say(`  reasonBits             ${hex}  (${known.length + undefinedBits.length} bit(s) set)`);
  if (bits === 0) {
    say('    (none) — no reason codes were recorded for this assessment');
  }
  for (const e of known) {
    say(`    [bit ${String(e.bit).padStart(2)}] ${e.code}`);
    say(`             ${e.meaning}`);
    // A bit whose meaning overstates what was actually established carries a
    // `caveat` in reason-bits.json. It prints here, attached to the bit, and not
    // in a footnote: a consumer reading this output is deciding whether to trust
    // the bit, and that is the moment the limit has to be in front of them.
    if (e.caveat) {
      say('             LIMIT OF THIS BIT:');
      for (const line of wrap(e.caveat, 62)) say(`               ${line}`);
    }
  }
  if (undefinedBits.length > 0) {
    say('');
    say(`  REFUSED: bit(s) ${undefinedBits.join(', ')} are not defined in schema ${SUPPORTED_SCHEMA}.`);
    say('  This record was written by a schema newer than this reader understands.');
    say('  This reader will NOT mask an unknown bit off and report the rest. If a newer');
    say('  writer set a bit meaning, say, "evidence was retracted", silently dropping it');
    say('  would make the record read as though the retraction never happened. Upgrade the');
    say('  reader (refresh ./abi/reason-bits.json) before trusting this record.');
  }
  return undefinedBits;
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const USAGE = `
tinjau-risk-read — reference consumer for the Tinjau risk registry (built by Tinjau)

  node tinjau-risk-read.mjs --rpc-url <url> --chain-id <id> --registry <0x...> \\
                            --asset <0x...> --pool-id <0x... 32 bytes> [--json]

  node tinjau-risk-read.mjs --explain-reason-bits <0x...>    offline bitmask expansion
  node tinjau-risk-read.mjs --print-abi                      show the ABI it carries

Environment fallbacks: TINJAU_RPC_URL TINJAU_CHAIN_ID TINJAU_REGISTRY TINJAU_ASSET
                       TINJAU_POOL_ID

There is no default registry address, and there will not be one until the final X Layer
Testnet deployment exists (tracker task T7.2). Pass the address you want to read.
`;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) fail(1, `unexpected argument "${a}"${USAGE}`);
    const k = a.slice(2);
    if (k === 'json' || k === 'help' || k === 'print-abi') {
      out[k] = true;
      continue;
    }
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) fail(1, `flag --${k} needs a value${USAGE}`);
    out[k] = v;
    i += 1;
  }
  return out;
}

function requireHex(name, value, byteLength) {
  if (!value) fail(1, `missing --${name}${USAGE}`);
  const re = new RegExp(`^0x[0-9a-fA-F]{${byteLength * 2}}$`);
  if (!re.test(value)) fail(1, `--${name} must be 0x followed by ${byteLength * 2} hex characters, got "${value}"`);
  return value.toLowerCase();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  HUMAN = !args.json;

  if (args.help || process.argv.length === 2) {
    say(USAGE);
    process.exit(args.help ? 0 : 1);
  }

  if (args['print-abi']) {
    say(`ABI carried by this consumer (schema ${ABI.schemaVersion}):\n`);
    for (const f of ABI.functions) say(`  ${f.selector}  ${f.signature}`);
    say('\nVerify any of them with:  cast sig \'<signature>\'');
    process.exit(0);
  }

  if (args['explain-reason-bits'] !== undefined) {
    const raw = args['explain-reason-bits'];
    const n = Number(BigInt(raw));
    if (!Number.isSafeInteger(n) || n < 0 || n > 0xffffffff) {
      fail(1, `--explain-reason-bits must fit in uint32, got ${raw}`);
    }
    say(`\nOffline reason-bit expansion (schema ${SUPPORTED_SCHEMA}, no chain read)\n`);
    const unknown = printReasonBits(n >>> 0);
    say('');
    process.exit(unknown.length > 0 ? 4 : 0);
  }

  const rpcUrl = args['rpc-url'] ?? process.env.TINJAU_RPC_URL;
  const wantChainId = args['chain-id'] ?? process.env.TINJAU_CHAIN_ID;
  const registry = requireHex('registry', args.registry ?? process.env.TINJAU_REGISTRY, 20);
  const asset = requireHex('asset', args.asset ?? process.env.TINJAU_ASSET, 20);
  const poolId = requireHex('pool-id', args['pool-id'] ?? process.env.TINJAU_POOL_ID, 32);
  if (!rpcUrl) fail(1, `missing --rpc-url${USAGE}`);
  if (!wantChainId) fail(1, `missing --chain-id${USAGE}`);

  // --- chain identity ------------------------------------------------------
  // Checked before anything else. Reading the right address on the wrong chain
  // is the failure mode that produces a confident, wrong answer.
  const actualChainId = Number(BigInt(await rpc(rpcUrl, 'eth_chainId', [])));
  if (actualChainId !== Number(wantChainId)) {
    fail(1, `chain id mismatch: --chain-id said ${wantChainId}, ${rpcUrl} reports ${actualChainId}. Refusing to decode.`);
  }

  // --- is there a contract there at all? -----------------------------------
  const code = await rpc(rpcUrl, 'eth_getCode', [registry, 'latest']);
  if (!code || code === '0x') {
    fail(2, `no contract bytecode at ${registry} on chain ${actualChainId}. Wrong address, wrong chain, or not deployed yet.`);
  }

  const block = await rpc(rpcUrl, 'eth_getBlockByNumber', ['latest', false]);
  const nowSeconds = Number(BigInt(block.timestamp));
  const blockNumber = Number(BigInt(block.number));

  // --- registry-level facts -------------------------------------------------
  const schemaVersion = bytes32ToAscii(toBytes32(word(0, await call(rpcUrl, registry, 'schemaVersion'))));
  const policyVersion = bytes32ToAscii(toBytes32(word(0, await call(rpcUrl, registry, 'policyVersion'))));
  const paused = toBool(word(0, await call(rpcUrl, registry, 'paused')));
  const assessorAddr = toAddress(word(0, await call(rpcUrl, registry, 'assessor')));
  const guardianAddr = toAddress(word(0, await call(rpcUrl, registry, 'guardian')));
  const envRaw = await call(rpcUrl, registry, 'envelope');
  const envelope = {
    baseFee: toNumber(word(0, envRaw)),
    maxFee: toNumber(word(1, envRaw)),
    widenDuration: toNumber(word(2, envRaw)),
    decayDuration: toNumber(word(3, envRaw)),
    maxProtectDuration: toNumber(word(4, envRaw)),
    cooldown: toNumber(word(5, envRaw)),
  };
  const assetSupported = toBool(word(0, await call(rpcUrl, registry, 'supportedAsset', encodeAddress(asset))));

  const argWords = encodeAddress(asset) + encodeBytes32(poolId);
  const recordKey = toBytes32(word(0, await call(rpcUrl, registry, 'key', argWords)));
  const historyLength = toNumber(word(0, await call(rpcUrl, registry, 'historyLength', argWords)));
  const lastProtectEndedAt = toNumber(word(0, await call(rpcUrl, registry, 'lastProtectEndedAt', encodeBytes32(recordKey))));

  // --- header ---------------------------------------------------------------
  say('');
  say('==========================================================================');
  say(' TINJAU RISK REGISTRY — REFERENCE CONSUMER READ');
  say(' Reference consumer, built by Tinjau. Not external adoption, not an');
  say(' integration, not evidence that a third party uses this registry.');
  say('==========================================================================');
  say(rule('REGISTRY'));
  say(`  address                ${registry}`);
  say(`  chain id               ${actualChainId}`);
  say(`  rpc                    ${rpcUrl}`);
  say(`  block / chain time     #${blockNumber} @ ${iso(nowSeconds)}`);
  say(`  schema version         ${schemaVersion}`);
  say(`  policy version         ${policyVersion}`);
  say(`  assessor (writer)      ${assessorAddr}`);
  say(`  guardian (pause)       ${guardianAddr}`);
  say(`  paused                 ${paused ? 'YES' : 'no'}`);
  if (paused) {
    say('    The guardian has paused NEW protections. A protection already running is');
    say('    NOT cancelled and history is NOT erased, so the record below remains valid;');
    say('    what is blocked is the posting of a new PROTECT.');
  }
  say(rule('BOUNDED-ACTION ENVELOPE (read from chain, not from a Tinjau claim)'));
  say(`  base fee               ${feePct(envelope.baseFee)}`);
  say(`  max fee                ${feePct(envelope.maxFee)}`);
  say(`  widen duration         ${envelope.widenDuration}s held fully widened`);
  say(`  decay duration         ${envelope.decayDuration}s of linear decay back to base`);
  say(`  max protect duration   ${envelope.maxProtectDuration}s hard cap on one interval`);
  say(`  cooldown               ${envelope.cooldown}s before protection may re-arm`);

  // --- schema gate ----------------------------------------------------------
  if (schemaVersion !== SUPPORTED_SCHEMA) {
    say('');
    fail(
      5,
      `registry reports schema "${schemaVersion}"; this reader decodes "${SUPPORTED_SCHEMA}" only. ` +
        'Enum ordinals and struct layout are only guaranteed within one schema version, so decoding ' +
        'anyway could produce a confident wrong answer. Refusing.',
    );
  }

  // --- the record -----------------------------------------------------------
  const raw = await call(rpcUrl, registry, 'currentRecord', argWords);
  if (raw.length !== 2 + 12 * 64) {
    fail(1, `currentRecord returned ${(raw.length - 2) / 2} bytes, expected 384 (12 words). ABI drift?`);
  }
  const rec = {
    asset: toAddress(word(0, raw)),
    poolId: toBytes32(word(1, raw)),
    state: toNumber(word(2, raw)),
    confidence: toNumber(word(3, raw)),
    dataMode: toNumber(word(4, raw)),
    confirmation: toNumber(word(5, raw)),
    reasonBits: toNumber(word(6, raw)) >>> 0,
    assessedAt: toNumber(word(7, raw)),
    expiresAt: toNumber(word(8, raw)),
    protectStartedAt: toNumber(word(9, raw)),
    evidenceCommitment: toBytes32(word(10, raw)),
    policyVersion: bytes32ToAscii(toBytes32(word(11, raw))),
  };

  say(rule('QUERY'));
  say(`  asset                  ${asset}${assetSupported ? '  [supported by this registry]' : '  [NOT in the registry\'s supported set]'}`);
  say(`  pool id                ${poolId}`);
  say(`  record key             ${recordKey}`);
  say(`  history entries        ${historyLength}`);

  // --- no record ------------------------------------------------------------
  // assessedAt == 0 is the discriminator. A never-written slot reads as all zeroes,
  // which decodes to RiskState.NORMAL — safe by design, but "never assessed" and
  // "assessed and found normal" are different findings and are reported as such.
  if (rec.assessedAt === 0) {
    say(rule('RESULT'));
    say('  NO RECORD for this (asset, poolId).');
    say('');
    say('  Storage was never written for this key, so every field reads as zero.');
    say('  Zero decodes to RiskState.NORMAL, which is safe — an unwritten record grants');
    say('  no protection and authorises no fee change — but it is NOT the same finding as');
    say('  "Tinjau assessed this pool and judged it normal". assessedAt == 0 is what');
    say('  separates the two. A consumer that ignores this would report a pool as');
    say('  actively cleared when nobody has ever looked at it.');
    say('');
    if (!assetSupported) {
      say('  Note: this asset is also not in the registry\'s supported set, so an assessment');
      say('  for it would be rejected outright rather than recorded with a warning.');
      say('');
    }
    process.exit(3);
  }

  // --- stored, verbatim -----------------------------------------------------
  const stateEnum = enumName('RiskState', rec.state);
  const confEnum = enumName('ConfidenceBand', rec.confidence);
  const modeEnum = enumName('DataMode', rec.dataMode);
  const confirmEnum = enumName('ConfirmationStatus', rec.confirmation);
  for (const [kind, ord, e] of [
    ['RiskState', rec.state, stateEnum],
    ['ConfidenceBand', rec.confidence, confEnum],
    ['DataMode', rec.dataMode, modeEnum],
    ['ConfirmationStatus', rec.confirmation, confirmEnum],
  ]) {
    if (!e) fail(5, `${kind} ordinal ${ord} is not defined in schema ${SUPPORTED_SCHEMA}. Refusing to guess.`);
  }

  say(rule('STORED RECORD — currentRecord(), storage verbatim'));
  say('  This is what is written on chain. Reading it does NOT apply expiry.');
  say('');
  say(`  asset                  ${rec.asset}`);
  say(`  pool id                ${rec.poolId}`);
  say(`  state                  ${stateEnum.name}  (ordinal ${rec.state})`);
  say(`                         ${stateEnum.meaning}`);
  say(`  confidence band        ${confEnum.name} — ${confEnum.meaning}`);
  say(`  data mode              ${modeEnum.name} — ${modeEnum.meaning}`);
  say(`  market confirmation    ${confirmEnum.name} — ${confirmEnum.meaning}`);
  say(`  evidence commitment    ${rec.evidenceCommitment}`);
  say(`  policy version         ${rec.policyVersion}`);
  say(`  assessed at            ${iso(rec.assessedAt)}  (${relative(rec.assessedAt, nowSeconds)})`);
  say(`  expires at             ${iso(rec.expiresAt)}  (${relative(rec.expiresAt, nowSeconds)})`);
  say(`  protect started at     ${iso(rec.protectStartedAt)}${rec.protectStartedAt ? `  (${relative(rec.protectStartedAt, nowSeconds)})` : ''}`);
  say(`  last protect ended at  ${iso(lastProtectEndedAt)}${lastProtectEndedAt ? `  (${relative(lastProtectEndedAt, nowSeconds)})` : ''}`);
  const undefinedBits = printReasonBits(rec.reasonBits);

  if (undefinedBits.length > 0) {
    say('');
    say('  Aborting before reporting an effective state. A partially understood record is');
    say('  more dangerous than an unreadable one.');
    say('');
    process.exit(4);
  }

  // --- effective, right now -------------------------------------------------
  const effRaw = await call(rpcUrl, registry, 'effectiveState', argWords);
  const eff = {
    state: toNumber(word(0, effRaw)),
    fee: toNumber(word(1, effRaw)),
    endsAt: toNumber(word(2, effRaw)),
  };
  const effEnum = enumName('RiskState', eff.state);
  if (!effEnum) fail(5, `effectiveState returned RiskState ordinal ${eff.state}, undefined in ${SUPPORTED_SCHEMA}.`);

  const expired = rec.expiresAt !== 0 && nowSeconds >= rec.expiresAt;
  const lapsedByDuration = eff.endsAt !== 0 && nowSeconds >= eff.endsAt;

  say(rule('EFFECTIVE STATE — effectiveState(), expiry and duration cap applied'));
  say('  This is what a consumer should act on right now.');
  say('');
  say(`  state                  ${effEnum.name}  (ordinal ${eff.state})`);
  say(`                         ${effEnum.meaning}`);
  say(`  effective fee          ${feePct(eff.fee)}${eff.fee === envelope.baseFee ? '  == base fee, no widening in force' : ''}`);
  say(`  protection ends at     ${iso(eff.endsAt)}${eff.endsAt ? `  (${relative(eff.endsAt, nowSeconds)})` : '  — no protection interval running'}`);

  say(rule('STORED vs EFFECTIVE'));
  if (stateEnum.name === effEnum.name) {
    say(`  AGREE — stored ${stateEnum.name}, effective ${effEnum.name}.`);
    if (stateEnum.name === 'PROTECT') {
      const remaining = eff.endsAt ? eff.endsAt - nowSeconds : 0;
      say(`  The protection is live and bounded: it ends at ${iso(eff.endsAt)} (${remaining}s away),`);
      say('  as the earlier of the record\'s own expiry and the envelope\'s duration cap.');
    }
  } else {
    say(`  *** DIVERGE — stored ${stateEnum.name}, effective ${effEnum.name}. ***`);
    say('');
    say(`  The stored record still says ${stateEnum.name} because a read never rewrites`);
    say('  history; the record stands as it was written. But time has moved past it:');
    if (expired) {
      say(`    - the record's own expiresAt (${iso(rec.expiresAt)}) has passed;`);
    }
    if (lapsedByDuration && !expired) {
      say(`    - the bounded protection interval ended at ${iso(eff.endsAt)};`);
    }
    say(`  so the state to act on is ${effEnum.name} and the fee is back at ${feePct(eff.fee)}.`);
    say('');
    say('  THIS IS THE CASE A NAIVE CONSUMER GETS WRONG. Reading currentRecord() alone and');
    say(`  acting on "${stateEnum.name}" would apply protection that the registry no longer`);
    say('  authorises. Always take the state from effectiveState().');
  }

  say(rule('CLAIM DISCIPLINE'));
  say('  Reference consumer, built by Tinjau, to show the record is independently');
  say('  readable. It is not external adoption and not a third-party integration.');
  say('  It reads only; it never writes, and the write functions are not in its ABI.');
  say('');

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          registry,
          chainId: actualChainId,
          blockNumber,
          chainTimestamp: nowSeconds,
          schemaVersion,
          policyVersion,
          paused,
          assessor: assessorAddr,
          guardian: guardianAddr,
          envelope,
          query: { asset, poolId, recordKey, assetSupported, historyLength, lastProtectEndedAt },
          stored: {
            ...rec,
            stateName: stateEnum.name,
            confidenceName: confEnum.name,
            dataModeName: modeEnum.name,
            confirmationName: confirmEnum.name,
            reasonCodes: expandReasonBits(rec.reasonBits).known.map((b) => b.code),
          },
          effective: { ...eff, stateName: effEnum.name },
          diverges: stateEnum.name !== effEnum.name,
          artifactLabel: 'reference consumer, built by Tinjau — not external adoption',
        },
        null,
        2,
      ),
    );
  }

  process.exit(0);
}

main().catch((e) => fail(1, e.stack ?? String(e)));
