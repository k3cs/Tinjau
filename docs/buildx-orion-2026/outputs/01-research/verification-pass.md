# Full Verification Pass — every load-bearing claim re-checked against primary sources

- Date: 2026-08-16
- Reason: too many claims had been drawn from summarising fetches and aggregators, causing three reversals. This pass re-derives everything from first-party sources, on-chain state, or the local CSV.
- Method: official pages read through the browser DOM (not summarised), contracts queried by JSON-RPC, corpus counts recomputed locally, every attributed quote string-matched against the source cell.

## 1. Confirmed unchanged

| Claim | How verified |
|---|---|
| Event A window 2026-08-07 → 2026-08-21 23:59 UTC | Official page + T&C clause 2, read verbatim |
| Prizes 30k/15k/5k, Liquidity 50k, Launch up to 200k | Official page prize table, verbatim |
| Five participation requirements | Official page, verbatim |
| Google Form, 8 fields, **no track selector** | Form fetched directly |
| Event B rules, judging, ~$10 ignition fee | Page DOM read directly |
| **Event B still 2 entries** (Rigel AI 72, BaseScout AI 86) | Re-read 2026-08-16, countdown 17d 22h 42m |
| X Layer mainnet 196 / testnet 1952 | Official docs, plus `eth_chainId` returned `0xc4` = 196 |
| Corpus 242 rows, 57 hackathons, 51 columns | Recomputed from local CSV |
| All saturation counts | Recomputed; every figure reproduced exactly |
| 18 of 18 attributed project quotes | String-matched against their source cells |
| No RWA protocol on X Layer | All 32 protocols listed with categories: Dexs 20, Lending 4, Bridge 3, CEX 2, Launchpad 1, Cross-Chain Bridge 1, CeDeFi 1. **Zero RWA.** |
| xStocks does not support X Layer | xstocks.com read directly: Solana, Ethereum, BNB, Mantle, TON, Ink, Base present. **"X Layer" absent.** |

## 2. Corrections

**C1 — Judging criteria are seven, not ten.** `[Fakta]` T&C clause 4, verbatim: *"Projects will be evaluated based on their application of AI, innovation, product completeness, user value, integration with X Layer, growth potential, and contribution to the X Layer ecosystem. The Organizer's decisions regarding eligibility, judging results, and winners are final."*

`[Inferensi]` **"code quality", "onchain data" and "market potential" are not official criteria.** They came from the spreadsheet's extraction and I repeated them as fact. Two of my scoring tables had rows built on them.

**C2 — The Liquidity Grant is restricted-use, not cash.** `[Fakta]` FAQ, verbatim: *"The Liquidity Grant is available to projects competing in the AI-RWA track. The Organizer will evaluate projects based on their overall performance during the Hackathon, including product quality, innovation, user value, and contribution to the ecosystem. The best-performing project will receive the grant. **The grant must be used to support the winning project's growth and further develop the X Layer ecosystem.**"*

`[Inferensi]` I had been treating 50,000 USDT as straightforwardly better than the 30,000 first prize. A restricted growth grant and unrestricted prize money are not comparable at face value, and the comparison should have been qualified every time it was made.

**C3 — EXITPROOF-RWA is feasible. My infeasibility finding was wrong.** `[Fakta]` `USDY_InstantManager` at `0xa42613C243b67BF6194Ac327795b926B4b491f15` exposes `subscribe(address,uint256,uint256)` and `redeem(uint256,address,uint256)`, each a single on-chain transaction. Queried live:

| Getter | Value |
|---|---|
| `minimumDepositUSD()` | `1e18` = **$1.00** |
| `minimumRedemptionUSD()` | `1e18` = **$1.00** |
| `subscribePaused()` | `0` (active) |
| `redeemPaused()` | `0` (active) |
| `rwaToken()` | `0x96F6…B985C` = USDY ✓ |
| `ondoIDRegistry()` | `0xcf69…D97df` ✓ |

`[Fakta]` Function selectors were derived with a locally implemented keccak-256, self-tested against the empty-string digest and against the two selectors Ondo publishes in its own docs (`0x22d4a175`, `0xd8780161`). Both matched.

`[Inferensi]` The 40–50 day Regulation S lockup I cited came from aggregator sites, never from Ondo. Ondo's own docs describe a **USDYc "Cooking USDY"** certificate covering *"the period before their USDY tokens are issued"* — that is the wire/manual subscription path. It does not gate `InstantManager`. **A full subscribe → redeem probe cycle costs $1 plus gas and completes in two transactions.** The only gate is OndoIDRegistry whitelisting.

**C4 — Indonesia is eligible.** `[Fakta]` Ondo's prohibited list is Afghanistan, Belarus, Canada, Crimea/DNR/LNR/Kherson/Zaporizhzhia/Sevastopol, Cuba, DPRK, Iran, Libya, Myanmar, Russia, Somalia, South Sudan, Sudan, Syria, and the United States. The restricted list requiring qualified-investor status is Brazil, EEA, Hong Kong, Malaysia, Singapore, Switzerland, UK. **Indonesia appears on neither.** Fable's flip-test would have returned "eligible".

**C5 — Two open unknowns are now closed, both favourably.** `[Fakta]` T&C clause 9 disqualifies *"plagiarism, unauthorized use of code"* but contains **no prohibition on reusing the participant's own prior code** and **no exclusivity clause**. `[Fakta]` Clause 8: *"Participants retain ownership of their submissions"*, granting the Organizer only a non-exclusive licence. `[Inferensi]` Submitting the same project to Orion is permitted.

**C6 — RWA row count depends on the regex.** `[Fakta]` 16 rows on `\brwa\b|real.world asset`; 18 on the broader pattern that also catches "tokenised equity/asset/treasury". My table's "18" is the broader figure and should have said so.

## 3. New findings this pass produced

**N1 — Uniswap v4 is live on X Layer.** `[Fakta]` From Uniswap's own SDK address book, every X Layer address verified to hold bytecode on chain 196: v3 factory `0x4b2a…6804` (24,535 bytes), SwapRouter02 (24,497), NonfungiblePositionManager (24,384), **v4 PoolManager `0x360e68faccca8ca495c1b759fd9eee466db9fb32` (24,009 bytes)**, v4 PositionManager (23,877), v4 Quoter, v4 StateView.

`[Inferensi]` Dien's prior hackathon win is a **Uniswap v4 hook** prize (UHI8, Veritas Protocol). A live v4 PoolManager on the target chain is a direct match to proven capability, and nothing in this workspace had surfaced it.

**N2 — Aave V3 on X Layer has nine live reserves.** `[Fakta]` `getReservesList()` on Pool `0xE3F3Caefdd7180F884c01E57f65Df979Af84f116` returns 9 assets; available liquidity read from each aToken:

| Asset | Available |
|---|---|
| USD₮0 | 38,029,968 |
| USDG | 458,306 |
| WOKB | 137,998 |
| xBETH | 6,223 |
| xETH | 5,152 |
| xSOL | 622 |
| xOKSOL | 376 |
| xBTC | 257 |
| GHO | 18 |

`[Inferensi]` Real, permissionless, instantly withdrawable exit paths on X Layer itself. Plus 20 DEXs and three more lending markets.

**N3 — the strongest single datum for EXITPROOF, found by accident.** `[Fakta]` `USDY_InstantManager` currently holds **$10.00 USDC**, against a USDY total supply of **972,078,205**.

`[Inferensi]` If that balance is the instant-redemption capacity, the ratio is roughly one part in a hundred million. Whether redemptions are instead funded just-in-time from a treasury allowance is **unverified** — free public RPCs cap `eth_getLogs` at 50 blocks, so throughput could not be measured here.

`[Inferensi]` That unanswered question is precisely the product. The signal is readable from public contract state, for free, with no KYC and no capital — which means EXITPROOF has a large read-only surface that needs no probe at all, with executed probes as the confirming layer rather than the entry ticket. This is a materially better shape than either version previously described.

## 4. Effect on the decision

`[Inferensi]` The Path A / Path B fork collapses again, this time on verified facts rather than framing. The mechanism covers RWA and DeFi with one codebase; RWA turns out to be probeable at $1 through a permissionless-after-registration contract; X Layer DeFi is probeable with no registration at all. Scope is a presentation choice, not an architectural one.

`[Inferensi]` But two corrections cut against the RWA emphasis. The Liquidity Grant is restricted-use growth funding rather than cash (C2), and "onchain data" and "market potential" are not judging criteria (C1), so the case for chasing the AI-RWA track is weaker than the earlier tables implied — while "integration with X Layer" **is** a criterion, which favours native probes.

`[Inferensi]` Checkpoint 1 should be re-presented with corrected criteria and corrected prize semantics before any idea is locked.

## 5. Still unverified, and labelled as such

- Whether `USDY_InstantManager` redemptions are serviced just-in-time from a treasury allowance rather than its $10 balance. Needs an archive node.
- OndoIDRegistry whitelisting turnaround for an Indonesian individual. Only discoverable by attempting it.
- Event A's AI-RWA track field size. No entries gallery exists.
- Whether the OKX Onchain OS ERC-8004 and task-marketplace endpoints behave as documented. Not exercised.
- Live state of the OKX Agentic Wallet recorded in REF-009. That note is from 2026-07-20.
