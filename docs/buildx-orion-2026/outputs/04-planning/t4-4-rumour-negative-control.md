# T4.4 — the rumour negative control, proved end to end

- Task: T4.4, tracker `tinjau-lp-risk-autopilot-task-tracker.md` §4 phase T4
- Depends on: T2.4, T4.2
- Verified: 2026-08-21
- Governing invariants: tracker §0.7 (rumour-only evidence stays at or below `WATCH`), §0.8 (provenance
  is preserved and speculation is never paraphrased into fact)

## 1. What this task had to show

The acceptance criterion has four parts, and all four are checked separately below:

1. UI, API, and registry all show `WATCH` for the frozen rumour scenario;
2. the aggressive fee path stays unauthorised;
3. test and transaction/read evidence are stored;
4. the result is not presented as official fact.

The path under test is the full one: intake → Evidence Graph → decision engine → registry → hook →
the fee an actual pool charges. Nothing below is a view function's opinion of what should happen;
where a fee is quoted it is decoded from PoolManager's own `Swap` event.

## 2. The scenario

Scenario `A-rumor-watch`, frozen in T0.2. One rumour claim plus four news outlets reporting an
NVIDIA/OpenAI backstop. The four outlets collapse to **one** origin, which is the whole point of the
control: a naive source count reads four, the Evidence Graph reads one.

**The rumour claim is `SIMULATED`.** It was fabricated by this project as a safety test because no
byte-pinnable social post exists for it. It carries `sourceUrl: null` and a `simulated://`
identifier. The four news items alongside it are real and source-linked. This scenario therefore
proves containment logic; it proves nothing about live social discovery, coverage, or latency.

## 3. Decision layer — `WATCH`, and why

`apps/server/test/decisionScenarios.test.ts`, 18 passed / 0 failed on 2026-08-21:

```
✔ all four frozen scenarios produce their pre-registered risk state end to end
✔ no frozen scenario authorises the aggressive fee path
✔ every record explains its own specific refusal, not a generic one
✔ scenario A: zero swaps produce a valid, explainable assessment rather than a throw
✔ scenario A is labelled SIMULATED at the record level, because one claim is fabricated
✔ scenario A's market leg cannot create a PROTECT even with the evidence at its strongest
✔ scenario A: a protection already running is NOT cancelled by the missing market data
✔ every scenario is reproducible: two runs are byte-identical
```

Two of those deserve emphasis, because they are the ones a plausible-looking implementation gets
wrong:

- *"a protection already running is NOT cancelled by the missing market data"* is tracker §0.7's
  rule that missing data must not silently cancel a bounded policy already in force. Absent data is
  a reason to refuse to **start**, never a reason to **stop** early.
- *"scenario A's market leg cannot create a PROTECT even with the evidence at its strongest"* is the
  negative control on the control: even if the evidence side were maximally favourable, this market
  leg cannot carry a promotion.

The six reason codes the engine recorded, expanded offline from the on-chain bitmask
`0x00204826` by `tools/risk-reader/tinjau-risk-read.mjs --explain-reason-bits`:

```
[bit  1] SINGLE_SOURCE             one independent origin; one source never authorises the aggressive path
[bit  2] DUPLICATE_SYNDICATION     several outlets, one origin, counted once
[bit  5] NO_OFFICIAL_CONFIRMATION  no filing confirms the claim
[bit 11] MARKET_DATA_UNAVAILABLE   the market could not be checked at all
[bit 14] REFERENCE_MARKET_CLOSED   the US reference market was closed in the window
[bit 21] INSUFFICIENT_SAMPLE       data present but too sparse to conclude
```

`MARKET_DATA_UNAVAILABLE` and `INSUFFICIENT_SAMPLE` are deliberately distinct codes: "we could not
look" is a different fact from "we looked and saw too little", and collapsing them would let a
silent failure read as an observation.

## 4. Contract layer — `WATCH` cannot buy the aggressive fee

`forge test`, 137 passed / 0 failed on 2026-08-21. The load-bearing cases:

```
testFuzz_normalAndWatchAlwaysChargeExactlyBaseFee
test_e2e_watchIsChargedBaseFeeByTheActualPool
test_rumorEvidenceMayStillRaiseWatch
```

The first is a fuzz property, not an example: across generated inputs, `NORMAL` and `WATCH` charge
**exactly** the base fee. The third pins the other half of §0.7, which is easy to lose while
enforcing the first: a rumour is still allowed to raise attention to `WATCH`. Containment must not
degrade into ignoring the rumour.

## 5. Local chain — the whole path, including a real swap

`apps/server/test/tinjauHarness.test.ts:274`, inside the "T4.2–T4.5 end to end on a local chain"
suite (server suite total 594 passed / 0 failed, 2026-08-21):

```
✔ Scene A: the frozen rumour reaches WATCH and a real swap is charged baseFee
```

## 6. X Layer Testnet — decoded from the chain on 2026-08-21

Both deployed stacks carry the scenario. Every value below was re-read today over
`https://testrpc.xlayer.tech` and decoded from the raw event data, not copied from a manifest.

### 6.1 The assessment reached the registry as `WATCH`

`AssessmentPosted(bytes32 indexed key, address indexed asset, bytes32 indexed poolId, RiskState
state, uint32 reasonBits, uint64 assessedAt, uint64 expiresAt, bytes32 evidenceCommitment)`,
where `RiskState` is `Normal=0, Watch=1, Protect=2`:

| Stack | Post transaction | Decoded `state` | `reasonBits` |
|---|---|---|---|
| Production envelope, registry `0x60062389…7317` | `0x025ca92d…8671` | `1` = **WATCH** | `2115622` |
| Demo envelope, registry `0x1a1e1730…E2b1` | `0x69c11cf4…922c` | `1` = **WATCH** | `2115622` |

Both receipts return `status: 1`. Both records carry a 86,400 s TTL, so `WATCH` expires unless it is
refreshed, which is tracker §0.7's expiry rule holding on a public chain rather than in a test.

Note that the two stacks agree on state and on all six reason bits while committing **different**
evidence commitments, because the commitment binds the asset/pool key each stack was deployed
against.

### 6.2 The pool charged the base fee

Swap `0xcdfd10400ee82305dd733b8a2c554f208e919adecc640409fcc197e6b4046b5f`, decoded from
PoolManager `0x8F862A8b…9ae1`'s own `Swap` event:

```
poolId      0x3b3942b682bd59383474974127140a3f0b0c2dff946b8164341c4812985a4a8c
amount0     -1000000000000000
amount1     999499987070558
tick        -1
fee (pips)  500      <-- base fee, no widening
```

500 pips is the configured base fee. The ceiling the contract would have permitted under `PROTECT`
is 20,000 pips. The gap between those two numbers is what the negative control is for.

Reproduce it without trusting this file:

```bash
node tools/risk-reader/tinjau-risk-read.mjs \
  --rpc-url https://testrpc.xlayer.tech --chain-id 1952 \
  --registry 0x1a1e17306f789f5Ec7012B1E2CB866DeDB61E2b1 \
  --asset    0xf07A9D89848bc694c7154Fda4cce707Eb409F903 \
  --pool-id  0x3b3942b682bd59383474974127140a3f0b0c2dff946b8164341c4812985a4a8c
```

## 7. Public API — `WATCH`, unauthorised, and labelled

`https://tinjau.xyz/api/scoreboard`, HTTP 200 on 2026-08-21, entry `A-rumor-watch`:

```json
"state": "WATCH",
"confidenceBand": "LOW",
"action": { "authorized": false, "status": "NONE",
            "baseFeePips": "500", "maxFeePips": "20000",
            "requestedFeePips": null, "appliedFeePips": null },
"marketConfirmation": { "status": "UNAVAILABLE", "okxLeg": "UNAVAILABLE" },
"provenance": { "sourceClass": "NEWS", "dataMode": "SIMULATED", "isSimulated": true }
```

`requestedFeePips` is `null`, not zero. No fee was requested and refused; none was ever requested.

## 8. UI — the same state, in the same words

`https://tinjau.xyz/risk`, rumour scenario, captured 2026-08-21 →
[`../05-build/t4-4-ui-watch-live.jpg`](../05-build/t4-4-ui-watch-live.jpg)

The page renders the `WATCH` chip beside a `SIMULATED` badge, a `MARKET LEG REPLAYED` badge and
`CONFIDENCE LOW`, under the heading **"Watching, and the protective fee stays blocked."** All six
reason codes appear as separate cards, each tagged `HOLDS THE STATE DOWN` or `RECORDED FACT`. The
bounded-action panel reads:

```
AUTHORISED   No          STATUS   NONE
BASE FEE     0.05%       CEILING  2.00%

No action ran, so there is no recovery curve. The pool charged its base fee the whole time.
```

The market panel says `UNAVAILABLE` with the sentence *"We could not look. There was no usable
reading. This is a gap, not a finding."* That distinction is the §0.10 requirement surfaced in the
product rather than buried in a JSON field.

## 9. Acceptance, item by item

| Criterion | Where it is shown | Result |
|---|---|---|
| UI shows `WATCH` | §8, live screenshot | met |
| API shows `WATCH` | §7, live HTTP 200 | met |
| Registry shows `WATCH` | §6.1, decoded event on both stacks | met |
| Aggressive fee unauthorised | §4 fuzz property, §6.2 charged 500 pips, §7 `authorized: false` | met |
| Test evidence stored | §3, §4, §5 — 18, 137 and 594 passing | met |
| Transaction/read evidence stored | §6.1, §6.2, three transaction hashes, all `status: 1` | met |
| Not presented as official fact | `SIMULATED` on chain, `isSimulated: true` in the API, `SIMULATED` badge in the UI, `NO_OFFICIAL_CONFIRMATION` in the reason bits | met |

## 10. What this does not prove

- **The rumour is `SIMULATED`.** Containment is proved; live social discovery, coverage and latency
  are not, and no artifact may say otherwise.
- **The pool is builder-controlled** test liquidity with freely-mintable mock tokens. It demonstrates
  enforcement. It is not a market, and 500 pips charged there is not a market outcome.
- **The demo-envelope run shifted every timestamp forward by 2,078,278 s** so the assessment could be
  posted against live chain time. State and all six reason codes were checked identical to the
  unshifted canonical run, and the shift is recorded in the manifest rather than hidden.
- **The market leg is `UNAVAILABLE`, not `NOT_CONFIRMED`.** `WATCH` here is partly the result of
  absent data. A run with a complete market leg could in principle differ, and this scenario does not
  foreclose that.
- **This is one scenario.** It is the pre-registered negative control, not a coverage claim.
