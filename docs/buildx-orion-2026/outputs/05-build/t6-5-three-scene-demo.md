# T6.5 (non-frontend half) and T7.4 (clean CLI/API/contract rehearsal)

Non-frontend build artifact for workspace `buildx-orion-2026`.

- Created: 2026-08-21
- Owner: external non-frontend AI agent
- Covers: T6.5 scenario orchestration, factual demo manifest, reproducible scripts, fixture
  fallback; T7.4 clean-path reproduction of the CLI, the registry read, and the contract evidence
- Lane boundary: `apps/web/**` and `DESIGN.md` were not opened. The frontend lane owns browser
  choreography and visual presentation; this half owns the facts and the commands.

## 1. What was built

| File | Role |
|---|---|
| `demo/tinjau-demo.mjs` | the three-scene driver. Zero dependencies, Node 18+, network sealed |
| `docs/.../05-build/t6-5-demo-manifest.json` | the single factual demo manifest, derived not authored |
| `apps/server/test/demoManifest.test.ts` | 8 tests; fails if the manifest drifts from its evidence |
| `README.md` §4.1, §7, §8 | the judge-facing walkthrough, corrected (§6 below) |
| `tools/risk-reader/README.md` | stale "nothing is deployed yet" section corrected |

Nothing in the driver computes a result. Every number it prints is read out of a committed
artifact, and every one of those artifacts is pinned by sha256 inside the manifest.

## 2. One command per scene

Scenes follow tracker §0.14. Each has **three** commands, separated by what they cost the person
running them — a distinction the demo would otherwise blur.

| | needs | who can run it |
|---|---|---|
| `fixtureOnly` | Node 18+ | anyone, offline |
| `judgeVerifiable` | internet or one `pnpm install`, **no credentials** | anyone |
| `builderRegeneration` | funded X Layer Testnet keys | **builder only** |

The third column is the honest part. `builderRegeneration` is how the on-chain evidence was
produced, and a judge cannot run it. Presenting it as the reproduction command would be the easy
lie in this task.

### Scene 1 — rumour containment

```bash
node demo/tinjau-demo.mjs scene1
```

```
SCENE 1 — A rumour raises attention. It cannot raise the fee.
  This outcome is a CANONICAL REPLAY and matches its pre-registration. Nothing about it is constructed.

  FACTS
    scenarioId                   A-rumor-watch
    state                        WATCH
    confidenceBand               LOW
    reasonCodes                  ["DUPLICATE_SYNDICATION","INSUFFICIENT_SAMPLE","MARKET_DATA_UNAVAILABLE",
                                  "NO_OFFICIAL_CONFIRMATION","REFERENCE_MARKET_CLOSED","SINGLE_SOURCE"]
    actionAuthorized             false
    actionStatus                 NONE
    feeChargedByThePool          500
    feeSource                    PoolManager Swap event
    claimCount                   5
    apparentOrigins              1
    usableOrigins                1
    marketConfirmation           UNAVAILABLE
    okxLeg                       UNAVAILABLE

  ON CHAIN
    stack                        production-envelope (chain 1952)
    postAssessment tx            0x025ca92d8d477af734d3e7ce0e7465bf3afc0b1d511acf4fc184c5add1178671
    swap tx                      0xb801240c05b3477f6e2505ba51ee9b14e71fbc5527fbc6b0b15e142a8409cf4e
```

Five claims, one usable origin, no official confirmation — and the pool charged the base fee on a
real swap. That last number is the point: it is decoded from PoolManager's own `Swap` event, so it
is what the pool charged rather than what a view function said.

- `judgeVerifiable`: read the registry live (§4).
- `builderRegeneration`: `cd apps/server && npx tsx src/chain/tinjauDemoRun.ts --remote --scenes A`.

### Scene 2 — confirmed protection, **constructed**

```bash
node demo/tinjau-demo.mjs scene2
```

```
  *** CONSTRUCTED ***
  constructed: the market leg only
  canonical replay of the same event: WATCH
  reason codes only in canonical : ANTI_WICK_FAILED, MARKET_NOT_CONFIRMED
  reason codes only in constructed: MARKET_CONFIRMED

  FACTS
    state                        PROTECT
    confidenceBand               HIGH
    actionAuthorized             true
    requestedFee                 20000
    feeCurveChargedByThePool     [20000,9470,500,500]
    envelope                     {"baseFee":500,"maxFee":20000,"widenDuration":60,
                                  "decayDuration":300,"maxProtectDuration":360,"cooldown":60,
                                  "demoEnvelope":true}
    recoveryHadNoTransaction     true
    cooldownRefusedReArming      CooldownActive
    failedActionCase             {"induced":"guardian pause","error":"ProtectionPaused",
                                  "feeAfterFailure":500,"claimsNoBenefit":true}

  ON CHAIN
    swap @1787284279  charged  20000  previewed  20000  0x2e313c44…f787
    swap @1787284497  charged   9470  previewed   9730  0x93ae1e24…7bab
    swap @1787284653  charged    500  previewed    500  0xcf229e22…b7c0
    swap @1787284660  charged    500  previewed    500  0xfdb242cb…7ab0
```

**The scene prints `CONSTRUCTED` above the state, and prints the canonical `WATCH` beside it.**
That ordering is deliberate and is asserted by test: scenario B's real mainnet replay resolves to
`WATCH` because its market leg is `NOT_CONFIRMED`, and Tinjau reaches `PROTECT` on none of the four
frozen replay scenarios. The reason-code diff against the canonical run is three codes, all of them
market-leg codes, so what is constructed is the market and not the judgement about it.

The `9,470` against a previewed `9,730` is kept rather than reconciled: the fee is continuous in
time and seconds pass between quote and inclusion, so a quoted Tinjau fee is an upper bound during
decay.

- `builderRegeneration`: `... tinjauDemoRun.ts --remote --scenes B`.

### Scene 3 — the simpler alternatives

```bash
node demo/tinjau-demo.mjs scene3
```

```
  THE SIGN FLIPS WITH THE METRIC — both bases published, neither is clean
    vs VOLATILITY_ONLY, pre-registered basis : {"TINJAU_BEATS":27}
    vs VOLATILITY_ONLY, AMD-002 post-hoc     : {"TINJAU_LOSES":27}
    vs STATIC, both bases                    : {"TINJAU_TIES":27}

  BEHAVIOUR ON THE NEUTRAL CONTROL — this is what the demo may claim
    control: D-neutral-normal — a routine insider Form 4, pre-registered NORMAL
      VOLATILITY_ONLY  k=2                 TRIGGERED, 2 trigger(s) — FALSE_POSITIVE
      VOLATILITY_ONLY  k=3                 TRIGGERED, 1 trigger(s) — FALSE_POSITIVE
      VOLATILITY_ONLY  k=5                 TRIGGERED, 1 trigger(s) — FALSE_POSITIVE
      TINJAU           minDrawdownBps=150  NORMAL, 0 trigger(s) — TRUE_NEGATIVE
      TINJAU           minDrawdownBps=200  NORMAL, 0 trigger(s) — TRUE_NEGATIVE
      TINJAU           minDrawdownBps=300  NORMAL, 0 trigger(s) — TRUE_NEGATIVE

    "Tinjau declined to act on two large price moves because neither had a qualifying cause,
     and one of them a volatility-only policy would have traded on."
    A finding about restraint. It is not a demonstration of protection.
```

Scene 3 **leads with behaviour and never declares an economic winner**, because the benchmark
cannot supply one: all 27 comparable cells flip sign between the two metric bases on identical
trades. Both bases are printed. `canClaimLossAvoided` is `false` and Tinjau **ties** `STATIC`.

- `judgeVerifiable`: `cd apps/server && npx tsx src/benchmark/emit.ts`, which rewrites
  `three-policy-benchmark.json` **byte-identically**. Verified here by hashing before and after:
  `da9dff24e64fbed4eebd15018863981e0a1c63680bc05de122a40cce4ba3a910` both times.

## 3. The fixture-only fallback, and why it is evidence rather than a promise

```bash
node demo/tinjau-demo.mjs all
```

Before a single line of scene code runs, `sealNetwork()` replaces `fetch`, `WebSocket`,
`net.connect`, `net.Socket#connect`, `net.createConnection`, `tls.connect`, `dgram.createSocket`,
`dns.lookup`, `dns.resolve`, `dns.promises.lookup`, `http.request`, `http.get`, `https.request` and
`https.get` with functions that throw. A completed run therefore **could not** have contacted a
third-party service; it is not a claim that it did not.

A seal nobody attacks is indistinguishable from no seal, so the driver attacks its own:

```bash
$ node demo/tinjau-demo.mjs seal-selftest
  sealed   fetch
  sealed   net.connect
  sealed   new net.Socket().connect
  sealed   https.request
  sealed   dns.lookup

all network primitives are sealed
```

Exit code is 1 if any primitive escapes. This runs inside `pnpm test`.

**What the fallback does not prove.** It replays recorded facts. It does not re-execute the
on-chain transactions and it cannot notice that the chain has since moved on. That is what §4 is
for.

## 4. Live verification, read-only, no credentials

Two commands a stranger can run. Both are slow because the public X Layer RPC is slow: measured
3.4 s to 43 s for the registry read and 27 s to 57 s for the bytecode sweep, across runs minutes
apart.

```bash
node demo/tinjau-demo.mjs chain-verify
```

```
rpc      https://testrpc.xlayer.tech
chainId  1952 (address list says 1952)
height   38828913 then 38828915
pinned   block 38828913 — every read below is at this height

stack production-envelope
  ok   TinjauRiskRegistry           0x60062389a7AB08F0030FC06Adf9CE0C180537317  6337 bytes
  ok   TinjauFeeHook                0x1092C9fe2dB084F26aa415A0fda14B001A786080  6160 bytes
  ok   PoolManager (Uniswap v4)     0x8F862A8b6f00C99b0610dc764228C661c4909ae1  17151 bytes
  ok   swap router (test)           0xe5823a180BFAcbC24Aa9a744B76f3Dfb8bbECDA9  5035 bytes
  ok   liquidity router (test)      0x1324A9A175779D53c65F9A43493CEa302cd54587  4533 bytes
  ok   risk asset — MOCK wNVDAx     0xf07A9D89848bc694c7154Fda4cce707Eb409F903  1737 bytes
  ok   quote asset — MOCK USDG      0x666e81CCb9D4d6c2e7A3ed9f317E3dFBa2410e99  1737 bytes

stack demo-envelope
  ok   TinjauRiskRegistry           0x1a1e17306f789f5Ec7012B1E2CB866DeDB61E2b1  6337 bytes
  ok   TinjauFeeHook                0xAb448f70fE44fbbF5f41225F7797fcC7e56c2080  6160 bytes
  … 5 more, all ok

every published address has bytecode
```

All 14 code sizes matched the published list exactly.

### Handling the stale-read finding on the read side

The public RPC is load-balanced and serves reads from nodes at an older height (§8 deviations,
measured 2,519–2,746 ms convergence lag after a write). The write-side answer already exists in the
harness: it waits until a read reflects a confirmed write and throws if it never converges.

`chain-verify` needs the **read-side** answer, which is different:

1. `eth_blockNumber` twice, 1.5 s apart. If the second is lower, the driver prints
   `*** WENT BACKWARDS — stale read observed ***` rather than hiding it.
2. Every `eth_getCode` is pinned to `min(h1, h2)` as an explicit block parameter, so a report can
   never mix heights.

The fixture fallback sidesteps the problem entirely by not touching the network.

### The registry read

```bash
node tools/risk-reader/tinjau-risk-read.mjs \
  --rpc-url https://testrpc.xlayer.tech --chain-id 1952 \
  --registry 0x1a1e17306f789f5Ec7012B1E2CB866DeDB61E2b1 \
  --asset    0xf07A9D89848bc694c7154Fda4cce707Eb409F903 \
  --pool-id  0x3b3942b682bd59383474974127140a3f0b0c2dff946b8164341c4812985a4a8c
```

Real output, exit 0, against the live testnet — the stand-down record the T4.2 run left behind:

```
  state                  WATCH  (ordinal 1)
  confidence band        MEDIUM
  data mode              REPLAY
  market confirmation    NOT_CONFIRMED
  policy version         tinjau.policy/1.0.0
  reasonBits             0x00054214  (6 bit(s) set)
    [bit  2] DUPLICATE_SYNDICATION   … [bit 18] BONDED_EVIDENCE_PASSED
  effective fee          500 (0.0500%)  == base fee, no widening in force
  STORED vs EFFECTIVE    AGREE — stored WATCH, effective WATCH.
```

This is T7.4's "registry read works without private context", executed rather than asserted.

## 5. Addresses are referenced, never copied

`deployed-addresses.json` is the only list. The driver resolves registry, hook, asset and pool id
from it **by `stackId` at run time**, and the manifest records the stack reference rather than a
second copy of the values. T7.2 is finalising that list right now; a copy here would have to be
chased when it changes, and a stale copy in a demo driver is exactly the kind of divergence that
shows up in front of judges.

The manifest carries `addressPolicy.status` verbatim from the list, currently
`T4.2_WORKING_ADDRESSES_NOT_FINAL`, and every scene prints it.

## 6. T7.4 — the clean-path rehearsal

The README was followed as written, from a shell holding no context this project did not publish.

### 6.1 Measured wall-clock time

| Step | Warm | Cold |
|---|---|---|
| `node demo/tinjau-demo.mjs all` + `seal-selftest` + `check` | 0.1 s | 0.1 s |
| `pnpm install` (`apps/server`) | 0.4 s | **17.2 s** |
| `pnpm test` — 594 pass, 0 fail | 11.4 s | 11.4 s |
| `pnpm typecheck` | 4.3 s | 4.3 s |
| `npx tsx src/benchmark/emit.ts` | 1.2 s | 1.2 s |
| `validate.mjs` (frontend handoff) | 0.1 s | 0.1 s |
| `forge test` — 137 pass, 0 fail | 0.3 s | **37.4 s** (`forge clean` first) |
| `bash tools/risk-reader/test/anvil-e2e.sh` — 59 pass, 0 fail | 1.8 s | 1.8 s |
| **offline subtotal** | **19.7 s** | **≈ 74 s** |
| `chain-verify` (live) | 26.6 s | 26.6 s |
| live registry read | 3.4 s | 3.4 s |
| **full walkthrough** | **49.7 s** | **≈ 104 s** |

Every step exited 0. The two live steps are the variable ones; a second measurement minutes earlier
gave 56.5 s and 43.2 s for the same two commands, so **budget three minutes for the full
walkthrough on a bad connection** and note that the offline path is under half a minute regardless.

### 6.2 README defects found and fixed

1. **No demo commands at all.** The README documented tests, the benchmark and the reference
   consumer, but nothing that runs the three-scene story T6.5 exists to deliver. Fixed: new §4.1.
2. **No prerequisites anywhere.** Node version, pnpm and Foundry were assumed. A reader could not
   tell which steps needed which tool, or that most of them need neither. Fixed: §8.1 table mapping
   each step to what it needs and how long it takes.
3. **`cd contracts && forge test` presented as runnable from a clone.** `contracts/` is excluded by
   the root `.gitignore` (it is a separate Foundry repository, because `forge install` manages
   `lib/` as submodules of *that* repo). Fixed: new §8.3 states the prerequisite and, importantly,
   states that steps 1–4 do not depend on it. See §7 for the packaging blocker this exposes.
4. **`forge install` never mentioned.** `contracts/lib/` is git-ignored inside the contracts repo
   too, so a fresh checkout has no `forge-std` and no `v4-core`. Fixed in §8.3.
5. **Benchmark reproduction assumed a completed `pnpm install`.** §4.4 was read before §8 and would
   fail on a clean machine. Fixed, and a determinism check the reader can run themselves was added
   rather than leaving "byte-identically" as an assertion.
6. **The repository map omitted `apps/server/src/chain/`** — the harness that produced every
   transaction hash the README quotes — **and `demo/`.** Fixed.
7. **`tools/risk-reader/README.md` said "Nothing is deployed yet"** and that no address may be
   published. Both stopped being true at T4.2. Left uncorrected, the one artifact whose job is to
   prove a stranger can read the registry would have told that stranger there was nothing to read.
   Fixed, with the address list named as the source and the stale-read caveat added.

### 6.3 What the rehearsal confirmed working without private context

- repository setup for the server lane (`pnpm install`, 594 tests, typecheck);
- the benchmark, reproduced and byte-identical across two runs;
- the registry read, decoded against the live testnet, exit 0;
- source links — the frozen scenarios' EDGAR URLs and content hashes validate offline through
  `validate.mjs` and `scenarioFixtures.test.ts`;
- transaction evidence — every published address returned bytecode at one pinned block, and every
  quoted transaction hash appears in the committed manifests;
- the contract suite, 137 tests, from a cold `forge clean`.

## 7. Blocker found during T7.4 — packaging, not code

**Almost none of this work is in the published repository.** Measured on 2026-08-21:

- `git status` reports **148 untracked files**, including `README.md` itself, `tools/`, `demo/`,
  `apps/server/src/{evidence,market,risk,decision,benchmark,chain}`, `apps/server/scenarios/`, and
  the whole of `docs/.../05-build/frontend-handoff/`;
- the working tree is **23 commits ahead of `origin/main`**, unpushed;
- `contracts/` is git-ignored by the root repository (`.gitignore:17`), and its own nested
  repository has **one commit** — `chore: scaffold foundry project` — **no remote**, and
  `src/`, `test/` and `script/` untracked. Every `Tinjau*.sol` file exists only on this machine.

So a judge cloning `github.com/dienmsk/Tinjau` today gets a README-less tree with no evidence, no
demo driver, and no contracts. Every reproduction claim in §6 was verified against the **working
tree**, not against what is published.

This is outside the non-frontend lane's authority to fix: committing and pushing is not authorised
by the tracker, and restructuring `contracts/` into a submodule or a published sibling repository is
a decision for Dien while another agent is mid-deployment. **Recorded here and escalated rather than
silently patched.** Remediation, in order:

1. `git add` the untracked work and push the 23 commits;
2. give `contracts/` a remote, commit `src/`/`test/`/`script/`, push, and link it from README §8.3;
3. re-run §6.1 from a fresh `git clone` into an empty directory — the numbers above do not
   establish that this works, only that it works here.

## 8. What this does not prove

- **Scene 2's `PROTECT` is constructed** and the canonical replay of that same event is `WATCH`.
  Nothing in the demo may present it as a replayed result.
- **Tinjau ties `STATIC`.** `canClaimLossAvoided` is `false`. No scene claims reduced LP loss.
- **The OKX leg is `UNAVAILABLE` for all four scenarios.** There is no dual confirmation.
- **The rumour fixture is `SIMULATED`.** Containment is provable; live social discovery is not.
- **Both pools are builder-controlled** test liquidity in valueless mock tokens.
- **Addresses are T4.2 working addresses.** T7.2 owns the authoritative list.
- **The fixture fallback replays recorded facts.** It cannot detect that the chain has changed.
- **The clean-path timings are from this machine's working tree**, not from a fresh clone (§7).
