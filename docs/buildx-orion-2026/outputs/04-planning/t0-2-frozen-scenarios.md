# T0.2 — Frozen demo asset and scenarios

- Date: 2026-08-20
- Task: T0.2 (depends on T0.1, complete)
- Owner: external non-frontend AI agent
- Result: **frozen — one asset, four scenarios**
- Frontend files changed: none
- Governing design: `../../../superpowers/specs/2026-08-20-tinjau-lp-risk-autopilot-design.md`
- Fixtures: `apps/server/scenarios/` (+ `apps/server/test/scenarioFixtures.test.ts`)

## 1. What was frozen

One tokenized equity and four scenarios, all drawn from **one real timeline** on that asset.
The tracker's minimum was one official event plus one rumour. Four were frozen instead
because §0.13 also requires neutral and false-rumour cases in the benchmark, and because a
fourth, genuinely ambiguous case was needed to keep T1.2's promotion rule honest.

```text
2026-07-26  WSJ: Nvidia in talks for ~$250bn of OpenAI financing guarantees   → scenario A
2026-07-27  CNBC / TNW / DCD syndicate it; nobody confirms
2026-08-12  routine NVDA insider Form 4                                       → scenario D
2026-08-14  WSJ revises itself: now "less than $120bn"                        → scenario C
2026-08-15  The Information: Nvidia in talks to put $3bn into SB Energy       → scenario C
2026-08-17  NVDA 8-K: obligation capped at $105bn, 4.25 GW, OpenAI tenant     → scenario B
```

| | A | B | C | D |
|---|---|---|---|---|
| Role | containment + false rumour | protection path | ambiguous boundary | neutral control |
| Anchor | 2026-07-27T20:33:00Z | 2026-08-17T12:41:33Z | 2026-08-15T19:38:26Z | 2026-08-12T21:13:10Z |
| Anchor block | `66415344` | `68201457` | `68053670` | `67800154` |
| Swaps in window | **0** | 4,145 | 265 | 367 |
| Expected state | `WATCH` | `PROTECT`, conditional | **undecided** | `NORMAL` |
| Economic row | no | yes | yes | yes |

Every anchor lands while the **US reference market is closed** and the X Layer pool keeps
trading. That was a selection criterion, not a coincidence — it is the asymmetry the product
claims to guard.

## 2. The asset: NVDA → wNVDAx on X Layer

| Field | Value |
|---|---|
| Company | NVIDIA CORPORATION, CIK `0001045810`, ticker NVDA |
| Traded token | wNVDAx (Wrapped NVIDIA xStock), 18 decimals |
| Token address | `0xa8ddb5cd96b5222afe198316e9a57caa642850d5` (X Layer mainnet, chain 196) |
| Reference pool | `0x2a2b11730c2b6d99a58034a869dd810d7300a7b2` (USDG/wNVDAx) |
| Testnet demo pool token | `0xf07A9D89848bc694c7154Fda4cce707Eb409F903` (mock, builder-controlled) |

[Fakta] Token identity read live on 2026-08-20 via `eth_call` against `https://rpc.xlayer.tech`:
`symbol()` → `wNVDAx`, `name()` → `Wrapped NVIDIA xStock`, `decimals()` → `18`. Pool
`token0()` → `0x4ae46a509f6b1d9056937ba4500cb143933d2dc8` (USDG, 6 decimals),
`token1()` → `0xa8ddb5cd96b5222afe198316e9a57caa642850d5`.

[Inferensi] NVDA is the only defensible choice in the tracked set, because it is the only
ticker with all four of: a real X Layer pool carrying third-party swaps, a working OKX index
instrument, an SEC filing history, and a deployed testnet pool wired to the fee hook. MSTRx
has an index feed and a mainnet pool but no testnet pool; the other nine tracked names are
`live: false` configuration rows.

### 2.1 The X Layer wNVDAx market is only weeks old

[Fakta] The reference pool's first block with bytecode is `65946484`
(`eth_getCode` binary search, 2026-08-20), timestamp **2026-07-22T10:18:40Z**. Its window on
2026-07-27 contains **zero** swaps.

[Inferensi] This is a real limitation of the product story, not just of these fixtures. There
is no X Layer market history for this asset before late July 2026, so no earlier NVDA filing
can be market-confirmed. It excluded both older NVDA 8-Ks in the repository's frozen
parse-accuracy sample (`0001045810-25-000207`, 2025-08-27 earnings; `0001045810-26-000026`,
2026-04-27). The exclusion is a data-availability fact, not a preference about outcomes, and
it should be disclosed in judge-facing material rather than glossed over.

### 2.2 Token-mapping defect recorded, not fixed

[Fakta] `apps/server/src/chain/tokenAddresses.ts:39` maps `NVDAx.mainnet` to
`0xc845b2894dbddd03858fd2d643b4ef725fe0849d`. Read live, that address is `NVDAx` /
"NVIDIA xStock" — the **unwrapped** sibling. The reference pool and the OKX index poller
(`apps/server/src/index-poller/config.ts:16`) both use
`0xa8ddb5cd96b5222afe198316e9a57caa642850d5` (`wNVDAx`).

[Inferensi] These are two different tokens, so the current mainnet label and the market Tinjau
actually observes are not the same asset. Out of scope for T0.2 and it touches the existing
posting path, so it is recorded here and carried into T1.1/T2.2, where company → token → pool
mapping is validated deterministically. The frozen scenarios use `wNVDAx` throughout.

## 3. Scenario A — containment and the false rumour

Anchor 2026-07-27T20:33:00Z (16:33 US/Eastern, 33 minutes after the close; the originating WSJ
report ran the previous day, a Sunday).

Evidence: one `RUMOR`/`SIMULATED` social fixture, plus four `NEWS`/`REPLAY` claims that all
collapse into **one** independence group — CNBC, The Next Web and DataCenterDynamics each
attribute the story to the Wall Street Journal.

[Fakta] The syndication is provable from the wire copy: *"Nvidia is in talks to provide roughly
$250 billion in financing guarantees for OpenAI, the Wall Street Journal reported on Sunday,
citing people familiar with the matter"*, followed by *"Reuters said it could not immediately
verify the report, and Nvidia, OpenAI, and the US Commerce Department did not respond to
requests for comment."*

[Fakta] The $250bn figure was never confirmed. NVIDIA's own 8-K caps the initial obligation at
**$105 billion** — an overstatement of roughly 2.4×. The same WSJ line revised itself to
"less than $120 billion" on 2026-08-14.

Pre-registered outcome: **`WATCH`, unconditional.** The `RUMOR` claim is capped by invariant,
and four outlets carrying one origin supply one independent source where the promotion rule
requires two. If the engine ever returns `PROTECT` here, the engine is wrong.

### 3.1 Scenario A carries no economic row

[Fakta] `eth_getLogs` over the Swap topic across A's full seven-hour window returned **0**
events with 0 RPC errors.

[Inferensi] With no trades, all three benchmark policies earn zero fees and realise zero
markout, so A cannot measure false-positive cost — scenario D carries that instead. A remains
valuable twice over: it is the cleanest single-origin containment test, and its empty window is
a genuine degraded-data case for T3.4, where confirmation must return `UNAVAILABLE` and fail
closed. Widening A's window to reach liquidity would stop it measuring the event and is
explicitly forbidden in the fixture.

### 3.2 Why the rumour is simulated

[Fakta] DEC-010 closed SVC-008 with immutable replay fixtures; no live social provider is
authorised. A public search on 2026-08-20 returned no individually citable, durably addressable
social post about these talks that could be byte-pinned offline.

[Inferensi] Fabricating a real-looking URL would be worse than an explicit fixture, so the
rumour is marked `SIMULATED` with a null URL, a `simulated://` identifier and a `_WARNING`
banner. **It cannot support any claim about live social monitoring, discovery, or latency.**
The real news chain sits beside it so the scenario does not rest on fabricated evidence alone.

## 4. Scenario B — confirmed protection

Anchor 2026-08-17T12:41:33Z, Monday pre-market: 08:41:33 US/Eastern, 49 minutes before the
13:30Z open.

[Fakta] SEC 8-K, accession `0001045810-26-000069`, items 1.01 / 2.03 / 7.01, primary document
`nvda-20260817.htm` (31,418 bytes, sha256 `1c480e33…928133`). EDGAR's own directory listing
stamps every item `2026-08-17 08:41:33` US/Eastern and reports the same byte length,
independently corroborating both timestamp and document.

[Fakta] Item 1.01, verbatim: *"NVIDIA entered into multiple residual value guaranties …
relating to leases for approximately 4.25 gigawatts of IT load in the aggregate at the
Portsmouth Site"* and *"NVIDIA's aggregate payment obligation is cumulatively capped at
$105 billion for its initial commitment under the Agreements."*

Pre-registered outcome: **`PROTECT`, conditional on `marketConfirmation.status === CONFIRMED`
and `fresh === true`.** If confirmation returns `NOT_CONFIRMED`, `STALE` or `UNAVAILABLE`, the
correct answer is `WATCH`, and that must be published as-is rather than worked around by
loosening the confirmation rules.

B's window also contains both non-official clusters, and they are recorded rather than dropped:
the WSJ revision was **right** ("less than $120bn" vs the actual $105bn), while The
Information's *$3 billion* investment figure was **wrong** against NVIDIA's stated $1.5 billion.
Right about direction, wrong about magnitude, is exactly what the Evidence Graph must be able
to express.

## 5. Scenario C — the case the naive rule gets wrong

Anchor 2026-08-15T19:38:26Z, a Saturday. Evidence: the WSJ revision cluster (2026-08-14) and
The Information cluster (2026-08-15) — **two genuinely independent origins**, no official
filing anywhere in the window.

[Inferensi] This sits exactly on the promotion boundary. §0.7 permits non-official `PROTECT`
with "at least two genuinely independent evidence sources and a fresh market-confirmation
signal", and C clears the first half. Without this scenario, T1.2 could ship a promotion rule
that has never been tested against a real ambiguous input — scenario A is decided by the
single-origin rule and scenario B by an official filing, so neither exercises the boundary.

**No outcome is pre-registered.** The correct answer depends on a rule that does not exist yet,
and asserting `WATCH` now would mean implementing whatever produces `WATCH`. The fixture
records the open question instead:

> Does a source line that revised its own headline figure downward by more than 2× within 19
> days count as self-contradicting for promotion purposes, and does that cap promotion at
> `WATCH` even when a second independent origin agrees on the direction of the story?

T1.2 must answer it, freeze the answer in versioned configuration **before** C's market data is
scored, and apply the same rule unchanged to A, B and D. Choosing the rule after seeing which
branch produces a better benchmark number is explicitly out of bounds.

### 5.1 This corrects an error in an earlier draft of this freeze

The first version of scenario A used a 2026-08-15 anchor and listed only The Information
cluster. That was wrong: the WSJ revision of 2026-08-14T23:43:56Z falls **inside** that
scenario's own 72-hour evidence window and was missed. With it included there are two
independent origins, so the original scenario A was not the clean negative control it claimed
to be. Rather than narrow the window to exclude the inconvenient cluster — which would have
been result-driven gerrymandering — scenario A was re-anchored to the genuinely single-origin
2026-07-27 moment, and the two-origin situation became scenario C on its own merits.

## 6. Pre-registration discipline

Selection criteria actually used, in order:

1. an on-chain market must exist at all for the asset (§2.1);
2. official evidence must be a real, hash-verifiable SEC document;
3. non-official evidence must have a real, verifiable syndication chain to test independence;
4. every anchor must fall while the US reference market is closed;
5. replay windows must be measured for data availability, and the measurement reported
   whatever it says — including scenario A's zero.

**No scenario's price path was inspected before these fixtures were frozen.** Only swap counts
and RPC error counts were measured, which is a data-availability check rather than a result.
Thresholds are a separate freeze in T0.4 and must not be calibrated on these events.

[Fakta] Measured availability, `eth_getLogs` over the Swap topic, 2026-08-20:

| Scenario | Swaps in window | Before anchor | At/after anchor | First swap gap | RPC errors |
|---|---|---|---|---|---|
| A | 0 | 0 | 0 | — | 0 |
| B | 4,145 | 1,193 | 2,952 | 0 s | 0 |
| C | 265 | 38 | 227 | 370 s | 0 |
| D | 367 | 46 | 321 | 222 s | 0 |

[Fakta] Independent cross-check: scenario D's anchor block `67800154` and its 222-second
first-trade gap both match `event_block` and `gap_seconds` for the same ticker, form and
acceptance timestamp in `../05-build/data/p2_4_markout_raw.jsonl`, produced by an earlier
study using its own method. That validates the block/timestamp arithmetic used across all four
scenarios.

[Inferensi] Scenario C's window is thin weekend liquidity (265 swaps over seven hours), so
velocity and exit-depth metrics there will be noisy and must be reported with that caveat.

## 7. Coverage against tracker §0.13

| Required category | Scenario |
|---|---|
| Material / discontinuous event | B |
| Neutral, ordinary event | D |
| False or overstated rumour | A |
| Ambiguous boundary case | C |
| Degraded or missing market data | A |

The economic distribution rests on B, C and D only, because A's window contains no trades.
This is asserted by the fixture test, not just by this document.

## 8. Verification

| Check | Command | Result |
|---|---|---|
| New fixture pins | `cd apps/server && npx tsx --test test/scenarioFixtures.test.ts` | 13/13 pass |
| Server regression | `cd apps/server && pnpm test` | 166/166 pass (was 153 at T0.1) |
| Server typecheck | `cd apps/server && pnpm typecheck` | pass |

The suite pins the four source hashes and byte lengths, the simulated-rumour labelling
everywhere it is referenced, the EDGAR provenance of official claims, the one-origin
independence collapse, C's two-origin structure, the unconditional expectations for A and D,
C's undecided status, evidence-window containment, the block arithmetic, and §0.13 coverage
including the rule that a zero-trade window cannot claim an economic row.

## 9. Carried forward

1. **Token-mapping defect** (§2.2) → T1.1 / T2.2 must resolve `NVDAx` vs `wNVDAx`
   deterministically before any mapping is trusted to authorise an action.
2. **Scenario C's open rule** (§5) → T1.2 must decide and freeze it before scoring.
3. **T0.4** must freeze thresholds without calibrating them on these four events, and must
   record that scenario A contributes no economic row.
4. **Market-history limitation** (§2.1) → the X Layer wNVDAx market is weeks old. T6.4 and
   T7.5 must state this rather than imply a long observed history.
5. **Frontend handoff** — the scenario files are written to the `EvidenceClaimView` shape in
   tracker §0.24 under `schemaVersion: tinjau.scenario/0.1.0`. If T1.1 bumps that version, the
   §0.23 handoff artifacts must be regenerated rather than edited in place.
