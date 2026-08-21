#!/usr/bin/env bash
# End-to-end proof for the Tinjau risk-registry reference consumer.
#
# Nothing is deployed to any public network by this script. It starts a LOCAL Anvil, deploys
# TinjauRiskRegistry to it, posts real EIP-712-signed assessments, and then runs the consumer
# against that chain over ordinary JSON-RPC. Task T7.2 owns the X Layer Testnet deployment; no
# testnet address exists yet and none may be published before then.
#
# Requires: foundry (anvil, forge, cast) and node >= 18. No npm install.
#
#   bash tools/risk-reader/test/anvil-e2e.sh
#
# Exit 0 = every case passed.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
READER="$HERE/../tinjau-risk-read.mjs"
CONTRACTS="$HERE/../../../contracts"
FIXTURE="$HERE/fixture"

PORT="${ANVIL_PORT:-8555}"
RPC="http://127.0.0.1:$PORT"
CHAIN_ID=31337

# Anvil's well-known deterministic development keys. They are printed by anvil on every start,
# hold no value on any real network, and are used here so the run is reproducible. They are not
# credentials.
DEPLOYER_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
DEPLOYER=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
ASSESSOR_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
ASSESSOR=0x70997970C51812dc3A010C7d01b50e0d17dc79C8

ASSET=0xAAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa
UNSUPPORTED_ASSET=0xbBbbBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB
POOL_ID=0x1111111111111111111111111111111111111111111111111111111111111111
OTHER_POOL_ID=0x2222222222222222222222222222222222222222222222222222222222222222

PASS=0
FAIL=0
ANVIL_PID=""

cleanup() {
  if [[ -n "$ANVIL_PID" ]]; then kill "$ANVIL_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT

banner() { printf '\n\033[1m=== %s ===\033[0m\n' "$1"; }
ok()   { PASS=$((PASS + 1)); printf '  \033[32mPASS\033[0m %s\n' "$1"; }
bad()  { FAIL=$((FAIL + 1)); printf '  \033[31mFAIL\033[0m %s\n' "$1"; }

# run_reader <expected-exit> <label> [extra args...] ; stores stdout in $OUT
run_reader() {
  local want="$1" label="$2"; shift 2
  set +e
  OUT="$(node "$READER" "$@" 2>&1)"
  local got=$?
  set -e
  if [[ "$got" == "$want" ]]; then ok "$label (exit $got)"; else bad "$label — expected exit $want, got $got"; echo "$OUT"; fi
}

expect_contains() {
  if grep -qF -- "$1" <<<"$OUT"; then ok "output contains: $1"; else bad "output missing: $1"; fi
}
expect_absent() {
  if grep -qF -- "$1" <<<"$OUT"; then bad "output should NOT contain: $1"; else ok "output correctly omits: $1"; fi
}

# ---------------------------------------------------------------------------
banner "0. selectors the consumer carries match cast sig"
# ---------------------------------------------------------------------------
# The consumer hardcodes 4-byte selectors so it needs no keccak256 at runtime. If one drifted
# from the real ABI the reads would return garbage, so re-derive all of them independently.
while read -r sel sig; do
  actual="$(cast sig "$sig")"
  if [[ "$actual" == "$sel" ]]; then ok "$sel  $sig"; else bad "$sig — carried $sel, cast sig says $actual"; fi
done < <(node "$READER" --print-abi | awk '/^  0x/ {print $1, $2}')

# ---------------------------------------------------------------------------
banner "1. start local anvil"
# ---------------------------------------------------------------------------
anvil --port "$PORT" --chain-id "$CHAIN_ID" --quiet &
ANVIL_PID=$!
for _ in $(seq 1 50); do
  if cast chain-id --rpc-url "$RPC" >/dev/null 2>&1; then break; fi
  sleep 0.2
done
cast chain-id --rpc-url "$RPC" >/dev/null
ok "anvil up on $RPC (chain id $(cast chain-id --rpc-url "$RPC"))"

# ---------------------------------------------------------------------------
banner "2. deploy TinjauRiskRegistry to the local chain"
# ---------------------------------------------------------------------------
# envelope = (baseFee 500, maxFee 20000, widen 3600s, decay 18000s, maxProtect 86400s, cooldown 3600s)
REGISTRY="$(forge create \
  --root "$CONTRACTS" \
  --rpc-url "$RPC" \
  --private-key "$DEPLOYER_KEY" \
  --broadcast \
  --json \
  src/TinjauRiskRegistry.sol:TinjauRiskRegistry \
  --constructor-args "$ASSESSOR" "$DEPLOYER" '(500,20000,3600,18000,86400,3600)' \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).deployedTo))')"
ok "registry deployed at $REGISTRY"

cast send "$REGISTRY" 'setAssetSupported(address,bool)' "$ASSET" true \
  --rpc-url "$RPC" --private-key "$DEPLOYER_KEY" >/dev/null
ok "asset $ASSET marked supported"

ASSESSMENT_TUPLE='(address,bytes32,uint8,uint8,uint8,uint8,uint32,uint64,uint64,bytes32,uint24,uint256,uint256)'
EVIDENCE=0x00000000000000000000000000000000000000000000000000000000000000ee

# post_protect <expiresInSeconds> <nonce> <reasonBits>
post_protect() {
  local ttl="$1" nonce="$2" bits="$3"
  local now assessed expires deadline tuple digest sig
  now="$(cast block latest --rpc-url "$RPC" --field timestamp)"
  assessed=$((now - 30))
  expires=$((now + ttl))
  deadline=$((now + 600))
  # state 2 = PROTECT, confidence 3 = HIGH, dataMode 3 = REPLAY, confirmation 4 = CONFIRMED
  tuple="($ASSET,$POOL_ID,2,3,3,4,$bits,$assessed,$expires,$EVIDENCE,0,$nonce,$deadline)"
  digest="$(cast call "$REGISTRY" "hashAssessment($ASSESSMENT_TUPLE)" "$tuple" --rpc-url "$RPC")"
  sig="$(cast wallet sign --no-hash --private-key "$ASSESSOR_KEY" "$digest")"
  cast send "$REGISTRY" "postAssessment($ASSESSMENT_TUPLE,bytes)" "$tuple" "$sig" \
    --rpc-url "$RPC" --private-key "$DEPLOYER_KEY" >/dev/null
  echo "$expires"
}

# OFFICIAL_FILING(16) | BONDED_EVIDENCE_PASSED(18) | MARKET_CONFIRMED(8) | TWO_INDEPENDENT_SOURCES(17)
PROTECT_BITS=$(( (1 << 16) | (1 << 18) | (1 << 8) | (1 << 17) ))
EXPIRES_AT="$(post_protect 600 1 "$PROTECT_BITS")"
ok "signed PROTECT assessment posted, expires at $EXPIRES_AT"

# ---------------------------------------------------------------------------
banner "3. CASE A — live PROTECT: stored and effective agree"
# ---------------------------------------------------------------------------
run_reader 0 "live PROTECT read" \
  --rpc-url "$RPC" --chain-id "$CHAIN_ID" --registry "$REGISTRY" --asset "$ASSET" --pool-id "$POOL_ID"
echo "$OUT"
expect_contains "STORED RECORD"
expect_contains "state                  PROTECT"
expect_contains "AGREE — stored PROTECT, effective PROTECT"
expect_contains "OFFICIAL_FILING"
expect_contains "MARKET_CONFIRMED"
expect_contains "BONDED_EVIDENCE_PASSED"
expect_contains "TWO_INDEPENDENT_SOURCES"
expect_contains "20000 (2.0000%)"
expect_contains "REPLAY"
expect_contains "Reference consumer, built by Tinjau"
expect_absent "adoption of"

# --json must put NOTHING but the JSON document on stdout, so it can be piped to a parser.
run_reader 0 "--json emits a parseable document only" --json \
  --rpc-url "$RPC" --chain-id "$CHAIN_ID" --registry "$REGISTRY" --asset "$ASSET" --pool-id "$POOL_ID"
if json_check="$(node -e '
  let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
    const j = JSON.parse(s);
    const want = { stateName: "PROTECT", diverges: false };
    if (j.stored.stateName !== want.stateName) throw new Error("stored.stateName=" + j.stored.stateName);
    if (j.effective.stateName !== want.stateName) throw new Error("effective.stateName=" + j.effective.stateName);
    if (j.diverges !== want.diverges) throw new Error("diverges=" + j.diverges);
    if (!j.stored.reasonCodes.includes("OFFICIAL_FILING")) throw new Error("missing reasonCodes");
    if (!/reference consumer/i.test(j.artifactLabel)) throw new Error("artifactLabel=" + j.artifactLabel);
    console.log("ok");
  });' <<<"$OUT" 2>&1)"; then
  ok "--json parses; stored/effective/diverges/reasonCodes/artifactLabel all as expected"
else
  bad "--json document wrong: $json_check"
fi

# ---------------------------------------------------------------------------
banner "4. CASE B — expired PROTECT: stored says PROTECT, effective says NORMAL"
# ---------------------------------------------------------------------------
cast rpc evm_setNextBlockTimestamp $((EXPIRES_AT + 60)) --rpc-url "$RPC" >/dev/null
cast rpc evm_mine --rpc-url "$RPC" >/dev/null
run_reader 0 "expired PROTECT read" \
  --rpc-url "$RPC" --chain-id "$CHAIN_ID" --registry "$REGISTRY" --asset "$ASSET" --pool-id "$POOL_ID"
echo "$OUT"
expect_contains "DIVERGE — stored PROTECT, effective NORMAL"
expect_contains "THIS IS THE CASE A NAIVE CONSUMER GETS WRONG"
expect_contains "500 (0.0500%)"

# ---------------------------------------------------------------------------
banner "5. CASE C — no record for this key"
# ---------------------------------------------------------------------------
run_reader 3 "unassessed pool id" \
  --rpc-url "$RPC" --chain-id "$CHAIN_ID" --registry "$REGISTRY" --asset "$ASSET" --pool-id "$OTHER_POOL_ID"
echo "$OUT"
expect_contains "NO RECORD for this (asset, poolId)"

run_reader 3 "unsupported asset" \
  --rpc-url "$RPC" --chain-id "$CHAIN_ID" --registry "$REGISTRY" --asset "$UNSUPPORTED_ASSET" --pool-id "$POOL_ID"
expect_contains "NOT in the registry's supported set"

# ---------------------------------------------------------------------------
banner "6. CASE D — paused registry"
# ---------------------------------------------------------------------------
cast send "$REGISTRY" 'setPaused(bool)' true --rpc-url "$RPC" --private-key "$DEPLOYER_KEY" >/dev/null
run_reader 0 "paused registry read" \
  --rpc-url "$RPC" --chain-id "$CHAIN_ID" --registry "$REGISTRY" --asset "$ASSET" --pool-id "$POOL_ID"
echo "$OUT"
expect_contains "paused                 YES"
expect_contains "NOT cancelled and history is NOT erased"
cast send "$REGISTRY" 'setPaused(bool)' false --rpc-url "$RPC" --private-key "$DEPLOYER_KEY" >/dev/null

# ---------------------------------------------------------------------------
banner "7. CASE E — undefined reason bit is refused, not ignored"
# ---------------------------------------------------------------------------
# The real registry's validateReasonBits rejects an undefined bit on write, so a v1.0.0
# deployment cannot store one. A FUTURE schema version can. The fixture below is the only way
# to feed the consumer such a record over a real eth_call.
UNKNOWN_BITS=$(( (1 << 31) | (1 << 8) ))   # bit 31 undefined, bit 8 MARKET_CONFIRMED
FUTURE_BITS_REGISTRY="$(forge create \
  --root "$FIXTURE" --rpc-url "$RPC" --private-key "$DEPLOYER_KEY" --broadcast --json \
  src/FutureSchemaRegistry.sol:FutureSchemaRegistry \
  --constructor-args "$(cast format-bytes32-string 'tinjau.risk/1.0.0')" "$UNKNOWN_BITS" \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).deployedTo))')"
run_reader 4 "record with undefined reason bit 31" \
  --rpc-url "$RPC" --chain-id "$CHAIN_ID" --registry "$FUTURE_BITS_REGISTRY" --asset "$ASSET" --pool-id "$POOL_ID"
echo "$OUT"
expect_contains "REFUSED: bit(s) 31 are not defined"
expect_contains "Aborting before reporting an effective state"
# It must not have quietly reported the bits it did understand as the whole story.
expect_absent "EFFECTIVE STATE"

run_reader 4 "offline bitmask expansion refuses the same bit" --explain-reason-bits 0x80000100
expect_contains "MARKET_CONFIRMED"
expect_contains "REFUSED: bit(s) 31"

# ---------------------------------------------------------------------------
banner "8. CASE F — newer schema version is refused"
# ---------------------------------------------------------------------------
FUTURE_SCHEMA_REGISTRY="$(forge create \
  --root "$FIXTURE" --rpc-url "$RPC" --private-key "$DEPLOYER_KEY" --broadcast --json \
  src/FutureSchemaRegistry.sol:FutureSchemaRegistry \
  --constructor-args "$(cast format-bytes32-string 'tinjau.risk/2.0.0')" 0 \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).deployedTo))')"
run_reader 5 "registry reporting tinjau.risk/2.0.0" \
  --rpc-url "$RPC" --chain-id "$CHAIN_ID" --registry "$FUTURE_SCHEMA_REGISTRY" --asset "$ASSET" --pool-id "$POOL_ID"
echo "$OUT"
expect_contains 'this reader decodes "tinjau.risk/1.0.0" only'

# ---------------------------------------------------------------------------
banner "9. CASE G — operator mistakes fail loudly"
# ---------------------------------------------------------------------------
run_reader 1 "wrong --chain-id" \
  --rpc-url "$RPC" --chain-id 196 --registry "$REGISTRY" --asset "$ASSET" --pool-id "$POOL_ID"
expect_contains "chain id mismatch"

run_reader 2 "address with no bytecode" \
  --rpc-url "$RPC" --chain-id "$CHAIN_ID" --registry 0x000000000000000000000000000000000000dEaD \
  --asset "$ASSET" --pool-id "$POOL_ID"
expect_contains "no contract bytecode"

run_reader 1 "unreachable rpc" \
  --rpc-url http://127.0.0.1:1 --chain-id "$CHAIN_ID" --registry "$REGISTRY" \
  --asset "$ASSET" --pool-id "$POOL_ID"
expect_contains "RPC transport failure"

# ---------------------------------------------------------------------------
banner "10. CASE H — the consumer imports nothing from apps/ and needs no npm"
# ---------------------------------------------------------------------------
# Independence is the whole point of T6.3. A reader that reused Tinjau's own decoders would
# only prove Tinjau can read its own output, so assert the absence structurally.
# Comment lines are excluded: the file names these paths in prose precisely to say it does not
# use them, and an assertion that forbade mentioning them would forbid documenting the boundary.
foreign="$(grep -nE "apps/(server|web)|scoreboard-api|contracts/out|node_modules|require\(" "$READER" \
  | grep -vE "^[0-9]+: *(//|\*)" || true)"
if [[ -n "$foreign" ]]; then bad "reader references Tinjau internals:"; echo "$foreign"; else
  ok "reader references no apps/**, no contracts/out/**, no node_modules"
fi

nonlocal="$(grep -nE "^import .* from '" "$READER" | grep -vE "from '(node:|\./)" || true)"
if [[ -n "$nonlocal" ]]; then bad "reader has a non-builtin, non-relative import:"; echo "$nonlocal"; else
  ok "every import is either a node: builtin or a relative path inside tools/risk-reader"
fi

if [[ -e "$HERE/../package.json" || -e "$HERE/../node_modules" ]]; then
  bad "reader directory grew a package.json or node_modules; it must stay install-free"
else
  ok "no package.json and no node_modules — nothing to install, no workspace entry needed"
fi

# ---------------------------------------------------------------------------
printf '\n\033[1m=== SUMMARY ===\033[0m\n  passed: %d\n  failed: %d\n\n' "$PASS" "$FAIL"
[[ "$FAIL" == 0 ]]
