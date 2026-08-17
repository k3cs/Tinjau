# Checkpoint 1 — rescored against the verified criteria

- Date: 2026-08-16
- Supersedes: the scoring tables in `idea-candidates.md`, `fable-round-validation.md`, and `exitproof-feasibility-kill.md`, all of which used criteria that are not in the official terms
- Basis: `outputs/01-research/verification-pass.md`

## 1. What changed in the ruler

`[Fakta]` Event A T&C clause 4 lists **seven** criteria: application of AI · innovation · product completeness · user value · integration with X Layer · growth potential · contribution to the X Layer ecosystem. No weights are published.

`[Fakta]` **"code quality", "onchain data" and "market potential" are not among them.** They came from the spreadsheet extraction. Every earlier table of mine carried rows for at least two of them.

`[Inferensi]` This matters directionally. The dropped rows were where EXITPROOF beat BLACKLETTER. The surviving list adds **product completeness** as one of only seven — a heavy weight in favour of whichever project actually gets finished in 5.7 days.

`[Fakta]` The Liquidity Grant *"must be used to support the winning project's growth and further develop the X Layer ecosystem"*, and goes to one best-performing project in the AI-RWA track.

`[Inferensi]` So the prize ladder is not 50k > 30k > 15k. It is 30k unrestricted, then 15k, then a 50k restricted growth budget that is only worth more than 30k to someone who intends to keep building. That is a question about Dien's intent, not about the projects.

## 2. Scores

1–5, assigned by Claude. Event A rows are the seven official criteria, unweighted because none are published.

| Criterion | EXITPROOF | THESEUS | BLACKLETTER |
|---|---|---|---|
| Application of AI | 4 | 5 | 5 |
| Innovation | 5 | 5 | 3 |
| Product completeness | 3 | 2 | 5 |
| User value | 4 | 2 | 4 |
| Integration with X Layer | 5 | 3 | 5 |
| Growth potential | 4 | 3 | 3 |
| Contribution to X Layer ecosystem | 5 | 4 | 4 |
| **Event A total (max 35)** | **30** | **24** | **29** |
| Orion: usefulness | 4 | 2 | 5 |
| Orion: execution | 3 | 3 | 4 |
| Orion: originality | 5 | 5 | 3 |
| **Orion total (max 15)** | **12** | **10** | **12** |
| Runnable by a judge in 5 min | 4 | 3 | 5 |
| Honest MVP by 2026-08-21 | 3 | 2 | 4 |

`[Inferensi]` **30 versus 29 is not a result.** It is inside the noise of my own scoring, and I assigned both sets. The honest reading is that EXITPROOF and BLACKLETTER are tied on Event A, tied on Orion's three criteria, and BLACKLETTER wins the two practical rows outright.

`[Inferensi]` THESEUS is out. Its two weakest rows are user value and product completeness, and both are official Event A criteria. Its premise is verified (an ERC-8004 registration says nothing about behaviour — 34,556 registrations, 711 real services) but the buyers who would care do not exist yet.

## 3. Where each candidate now stands

### EXITPROOF — probe real exits, publish exit-confidence

`[Fakta]` Feasible on RWA after all: `USDY_InstantManager` `subscribe`/`redeem` are single transactions with `minimumDepositUSD` and `minimumRedemptionUSD` both reading `1e18` = $1.00, neither paused. Indonesia is on neither of Ondo's prohibited nor restricted lists.

`[Fakta]` Feasible on X Layer natively with no permission at all: Aave V3 Pool holds 9 live reserves (USD₮0 38.0M, USDG 458k, WOKB 138k, and six more), alongside 20 DEXs and three further lending markets.

`[Fakta]` `USDY_InstantManager` currently holds **$10.00 USDC** against a USDY supply of **972,078,205**.

`[Inferensi]` That last figure is the product's own best advertisement, and it was readable from public contract state with no KYC, no capital, and no permission. It means the demo does **not** depend on the OndoIDRegistry whitelist landing in time — the read-only surface ships regardless, and executed probes upgrade it from "we can see the capacity" to "we went through it".

**Weakest row: product completeness.** Registry contract, probe executor, extraction with citations, deterministic aggregator, consumer contract, and a dual HTTP/MCP surface is a lot for one person in 5.7 days.

### BLACKLETTER — the negotiation thread compiles into the escrow terms

`[Inferensi]` Now the strongest candidate on the two criteria that punish ambition: product completeness and a judge-runnable demo. It needs no third party, no KYC, no capital, and no cooperation from any issuer. A judge negotiates a toy deal in chat and watches it compile into co-signed release conditions.

**Weakest row: innovation.** `[Fakta]` Its neighbourhood is the most saturated in the corpus — 32 x402 rows across three dedicated x402 hackathons, plus The Dojo (machine-graded delivery, auto-refund below 80%) and Aegis402 (escrow withheld until an audit clears). `[Inferensi]` The real difference — criteria derived from the parties' own negotiation rather than fixed by the platform — is genuine but has to be stated explicitly or a judge collapses it into The Dojo.

### THESEUS — bonded behavioural continuity

Out, per §2.

## 4. An orthogonal fact that is not a candidate

`[Fakta]` Uniswap **v4** is live on X Layer. PoolManager `0x360e68faccca8ca495c1b759fd9eee466db9fb32`, 24,009 bytes, verified against Uniswap's own SDK address book. `[Fakta]` Dien's prior hackathon win is a Uniswap v4 hook prize (UHI8, Veritas Protocol).

`[Inferensi]` This is a direct match between the target chain and proven capability, and no document in this workspace had surfaced it. It is also **orthogonal to all three candidates** — none of them naturally uses a v4 hook.

`[Inferensi]` So it is either irrelevant to this decision, or it is an argument for reopening Stage 2 with a fourth direction. Reopening costs roughly a day of the 5.7 remaining. I am flagging it rather than smuggling it in, because pretending it does not exist would be the dishonest option and quietly adding it would be scope creep.

## 5. The five unverified items, and what each would change

| # | Unverified | How to settle it | What it changes |
|---|---|---|---|
| U1 | OndoIDRegistry whitelist turnaround for an Indonesian individual | Only by attempting it, at app.ondo.finance/account/wallets. Start day 1 | If slow, EXITPROOF ships read-only for RWA and executed probes only for X Layer DeFi. Does **not** kill the demo — N3 already gives a live figure |
| U2 | Whether `USDY_InstantManager` redemptions are funded just-in-time rather than from its $10 balance | Needs an archive node; free RPCs cap `eth_getLogs` at 50 blocks | If just-in-time, the $10 headline is misleading and must not be used as-is. The measurement still stands, its interpretation changes |
| U3 | Event A's AI-RWA track field size | Not discoverable — no entries gallery exists | Cannot be resolved. Any "small field" claim stays an assumption, and I have removed it from the case |
| U4 | Whether OKX Onchain OS ERC-8004 and task-marketplace endpoints behave as documented | Exercise the `onchainos` CLI | Load-bearing for BLACKLETTER, which routes disputes through them. If they do not work, BLACKLETTER's X Layer integration score falls |
| U5 | Live state of the OKX Agentic Wallet in REF-009 | Re-run the CLI; that note is from 2026-07-20 | Affects setup time only |

`[Inferensi]` U1 and U4 are the two that touch the decision. U1 is survivable for EXITPROOF because of N3. U4 is **not** obviously survivable for BLACKLETTER, since its escrow and dispute routing is the integration story. That asymmetry is worth naming: the safer-looking candidate carries the unverified dependency.

## 6. Recommendation

**EXITPROOF**, by a margin I do not trust, with **BLACKLETTER** as a genuine co-equal rather than a fallback.

`[Inferensi]` The corrected criteria narrowed EXITPROOF's lead from comfortable to nil, and BLACKLETTER wins both practical rows. What keeps me on EXITPROOF is U4: BLACKLETTER's strongest claim (X Layer integration through escrow and dispute routing) rests on endpoints nobody has exercised, while EXITPROOF's equivalent claim rests on contracts I read live this session.

`[Inferensi]` If Dien would rather optimise for a finished, legible, five-minute demo and is willing to spend an hour first verifying U4, **BLACKLETTER is the better choice and I would not argue against it**.

The decision is Dien's. Recorded as pending in `DEC-003`.
