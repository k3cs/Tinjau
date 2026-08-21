# Frozen demo scenarios (task T0.2)

These files freeze the **one** tokenized equity and the **four** scenarios that the Tinjau
Hackathon MVP vertical slice is built and measured against. They are immutable inputs: once
frozen, changing them means re-running T0.2 and recording the change in the tracker's
deviations log, not quietly editing a file.

This directory is separate from `apps/server/synthetic/`. That directory holds the
**historical** AFTERHOURS P4.4 fabricated filings and stays untouched as prototype evidence.

## The frozen asset

| Field | Value |
|---|---|
| Company | NVIDIA CORPORATION |
| SEC CIK | `0001045810` |
| Ticker | NVDA |
| Traded token | wNVDAx (Wrapped NVIDIA xStock), 18 decimals |
| Token address | `0xa8ddb5cd96b5222afe198316e9a57caa642850d5` (X Layer mainnet, chain 196) |
| Reference pool | `0x2a2b11730c2b6d99a58034a869dd810d7300a7b2` (USDG / wNVDAx) |
| OKX index instrument | `wNVDAx` — same address, see `src/index-poller/config.ts` |

Why this asset: it is the only tracked name that simultaneously has a real X Layer mainnet
pool with real third-party swaps, a working OKX index feed, an SEC filing history, **and** a
deployed builder-controlled testnet pool wired to the fee hook. Every other tracked ticker is
missing at least one of those.

**Hard constraint found while freezing:** the reference pool's first block with code is
`65946484` (2026-07-22T10:18:40Z), and it was still untraded days later. The whole X Layer
wNVDAx market is only weeks old. No event before late July 2026 can be market-confirmed at
all, which is why the older NVDA filings in the repository's parse-accuracy sample could not
be used.

## The four scenarios

| | A | B | C | D |
|---|---|---|---|---|
| File | `scenario-a-rumor-watch.json` | `scenario-b-confirmed-protect.json` | `scenario-c-two-origins-hard-case.json` | `scenario-d-neutral-normal.json` |
| Role | rumour containment + false rumour | protection path | ambiguous boundary | neutral control |
| Anchor | 2026-07-27T20:33:00Z | 2026-08-17T12:41:33Z | 2026-08-15T19:38:26Z | 2026-08-12T21:13:10Z |
| Anchor block | `66415344` | `68201457` | `68053670` | `67800154` |
| Swaps in window | **0** | 4,145 | 265 | 367 |
| Expected state | `WATCH` | `PROTECT`, conditional | **undecided** | `NORMAL` |
| Economic row | no | yes | yes | yes |

Every anchor lands while the **US reference market is closed** and the X Layer pool keeps
trading. That is the asymmetry the product exists to guard, and it was a selection criterion.

All four are points on **one real timeline** for one company:

```text
2026-07-26  WSJ: Nvidia in talks for ~$250bn of OpenAI financing guarantees   → scenario A
2026-07-27  CNBC / TNW / DCD syndicate it; nobody confirms
2026-08-12  routine NVDA insider Form 4                                       → scenario D
2026-08-14  WSJ revises itself: now "less than $120bn"                        → scenario C
2026-08-15  The Information: Nvidia in talks to put $3bn into SB Energy       → scenario C
2026-08-17  NVDA 8-K: obligation capped at $105bn, 4.25 GW, OpenAI tenant     → scenario B
```

The $250bn figure was overstated by roughly 2.4×. It was never confirmed, and the same source
line walked it back three weeks later. That is what makes A a genuine false-rumour case rather
than a staged one.

Scenario A's claim is *"rumour-only evidence cannot authorise a bounded action"* — never
*"the rumour was false"*. The two are different claims and only the first is being proven.

### Why scenario C has no expected answer

C is the only case where non-official evidence legitimately **could** promote: two genuinely
independent origins (WSJ and The Information), no official filing anywhere in the window. The
literal promotion rule in §0.7 permits `PROTECT` there if market confirmation is fresh.

Writing down an expected answer now would mean picking the rule to match it. So C records the
open question instead — *does a source line that revised its own headline figure by more than
2× count as self-contradicting?* — and requires T1.2 to freeze that rule **before** C's market
data is scored, and to apply the same rule to A, B and D.

### Why scenario A carries no economic row

Measured, not assumed: `eth_getLogs` over A's full seven-hour window returned **zero** swaps
with zero RPC errors. The pool had bytecode but no trading yet. With no trades, all three
benchmark policies earn zero fees and realise zero markout, so A cannot measure
false-positive cost. Scenario D carries that measurement instead.

A is still worth keeping twice over: it is the cleanest single-origin containment test, and
its empty window makes it a real degraded-data case for T3.4 — market confirmation must return
`UNAVAILABLE` and fail closed rather than promote.

**Do not widen A's window to reach liquidity.** Moving the window away from the event would
stop it measuring the event.

## Provenance rules

Every claim carries `sourceClass`, `dataMode`, a source URL or a non-resolvable simulated
identifier, a publication timestamp *with its precision*, the company/token mapping, an
independence group, and its relation to other claims.

- `OFFICIAL` claims point at SEC EDGAR. Where the document is stored here, its exact bytes are
  pinned by sha256.
- `NEWS` claims point at live third-party URLs. Article bodies are **not** copied into this
  repository; each claim stores a short verbatim headline or attribution span plus the URL.
  Two WSJ originals are paywalled and were never retrieved — those claims record
  `retrievedFromOrigin: false` and quote the syndications that name WSJ instead.
- The single `RUMOR` claim is `dataMode: SIMULATED` with `sourceUrl: null`. It is fabricated.

### Why the rumour is simulated

`SVC-008` was closed by DEC-010 with immutable replay fixtures, and no live social provider is
authorised for this MVP. A public search on 2026-08-20 found no individually citable, durably
addressable social post about these talks that could be byte-pinned offline. The honest option
was a fixture that says plainly it is fabricated, rather than a real-looking URL that resolves
to nothing.

It follows the convention the P4.4 fixtures established: `simulated://` identifier, null URL,
`dataMode: SIMULATED`, and a `_WARNING` field at the top of the file.

**This fixture cannot support any claim about live social monitoring, discovery, or latency.**

The real, verifiable news chain that ran the same weekend sits beside it as `NEWS` claims, so
the rumour scenario is not resting on fabricated evidence alone.

## Byte-pinned sources

| File | sha256 | Bytes |
|---|---|---|
| `sources/nvda-20260817-8k.htm` | `1c480e3320f3171e6ac1979a50eecb123d4150637c7b769444d16faf97928133` | 31,418 |
| `sources/nvda-20260817-ex99-1-press-release.htm` | `e3c39df5be133417c6f3b097cf6f81a5f502443bc4203eba55275fe2ad96f096` | 21,769 |
| `sources/nvda-20260817-8k-index.json` | `dbd2d505a397ff9b79e2e4985326c77b8b8f9d65682ba63080830c56ec6786f7` | 1,683 |
| `sources/simulated-rumor-2026-07-27-social.json` | `d6ec48514fc50c252d6aebd3bc5b71e51b630c3c216470f99d3085e66079dbcd` | 2,110 |

Recompute with `shasum -a 256 <file>`. `test/scenarioFixtures.test.ts` pins all four —
editing any of them without updating the manifest fails the suite.

EDGAR's own directory listing (`sources/nvda-20260817-8k-index.json`) independently
corroborates both the acceptance timestamp and the 31,418-byte size of the primary document.

## What these fixtures do not prove

- They do not prove live discovery, real-time monitoring, or source-to-state latency.
- The `RUMOR` claim is fabricated and proves only that the pipeline contains a rumour safely.
- Scenario C's window is thin weekend liquidity (265 swaps over seven hours). Velocity and
  exit-depth metrics there will be noisy and must be reported with that caveat.
- Scenario A's window is empty and can support no economic claim at all.
- Nothing here has been benchmarked yet. Thresholds are frozen separately in T0.4 and must not
  be calibrated on these events.
