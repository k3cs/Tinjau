# Independent Validation Result — EXITPROOF

- Date: 2026-08-16
- Source: independent agent, fresh session, given `exitproof-validation-prompt.md` with no recommendation or scores
- Verdict returned: **MODIFY**
- My assessment after checking it: **accept the MODIFY, in full**

## 1. Its falsifiable claims, checked against the local CSV

All four reproduce. I was wrong on all four.

**V1 — "the brief omitted L³ / Liquidity Load Layer, a closer neighbour."** `[Fakta]` Confirmed present: **Liquidity Load Layer (L^3)**, MIT Bitcoin Hackathon 2026, **3rd Place plus a shared Community Prize**.

Its core problem, verbatim: *"Users must pick one and stay exposed to its solvency, honesty and uptime, **with no ongoing measurement and no mechanism to exit before a failure becomes visible**."*

Its key innovation, verbatim: *"Treating mint selection as a continuous portfolio problem rather than a one-time choice: a live Bayesian score across eleven signals drives automatic load balancing, with deposits routed to the safest mint, **withdrawals draining the riskiest first**."*

`[Inferensi]` This is continuous custodial-exit-risk scoring, and it won a prize. It is the closest thing in the corpus to EXITPROOF's framing and my saturation scan missed it entirely, because my regexes were shaped around "RWA" and "proof of reserve" while L³ is about Cashu mints. **The scan measured my vocabulary, not the corpus.**

**V2 — "YieldCompass appears twice."** `[Fakta]` Confirmed, both Solana Frontier. Verbatim: *"Reporting **realized APY instead of advertised APY**, and scoring protocol risk transparently alongside it."* `[Inferensi]` Measured reality versus stated policy — the same instinct as EXITPROOF's reconciliation layer.

**V3 — "the proof-of-reserve match is Anyware, not Eliver."** `[Fakta]` Confirmed. The single `proof.of.reserve` match is **Anyware** (ETHPrague, Ethereum Core Award), which proposes EIP-4788 beacon-root state reads for *"cross-chain lending, governance verification, proof-of-reserves, attestations"*. My earlier pass printed Eliver because I ran a different intersection regex and misread its output as the same result. The downstream conclusion — that the single match is not asset-backing verification — still holds, but I named the wrong project.

**V4 — "withdraw/redemption capacity: 0 rows."** `[Fakta]` Confirmed: `withdraw.{0,20}(capacit|limit|queue)` = 0, `redemption.{0,20}(capacit|limit|queue)` = 0, `exit liquidit|exit capacit` = 1 (DobDex). So the specific measurement is genuinely absent.

## 2. Its meta-criticism, accepted

Verbatim: *"the brief declares neutrality but its evidence-gathering is asymmetric: heavy, reproducible verification on feasibility and novelty… the section where the idea is weakest carries only 'unknowns'… the selection tilts supportive."*

`[Inferensi]` Correct. I verified chain state, contract minimums and rate limits to five decimal places, and left demand as a list of things nobody had checked. Verification effort followed what was easy to check, and what was easy to check happened to be what supported the idea. Recorded as LEARN-008.

## 3. Where its environment limited it

`[Fakta]` It could not read orionagents.org at all — the site is client-rendered and returns 62 characters to `curl`. So every Hackathon B fact in its analysis is an unverified brief claim, and its aside that Orion may not be "worth entering" is an absence of data, not a finding.

`[Fakta]` It also could not verify the xStocks liquidity table, the live-agent list, or the Ondo rate-limiter numbers. Those were verified in this workspace against chain 196 and Ethereum mainnet, and stand.

## 4. Its central structural finding, which I had not made

`[Fakta]` Aave V3 on X Layer lists 9 reserves — USD₮0, USDG, WOKB, xBETH, xETH, xSOL, xOKSOL, xBTC, GHO — and **none is an xStock**.

`[Inferensi]` So the product's named customer, a lending market setting collateral factors on these assets, **does not exist on this chain**. I had listed the 9 reserves myself and did not draw this conclusion. It is the strongest point in the validation and it stands.

## 5. Its MODIFY proposal, tested

Proposal: cut executed redemption probes and the bonded challenge from hackathon scope, and promote **simulated executable exit depth** — how much can actually be sold at 1% / 5% / 10% slippage right now, via the deployed Uniswap path — to the core deliverable.

I ran it. NVDAx → USD₮0 on X Layer, live aggregator quotes:

| Shares | USD out | $/share | Impact | % of supply |
|---|---|---|---|---|
| 1 | 225.16 | 225.16 | — | 0.00% |
| 10 | 2,251.00 | 225.10 | −0.02% | 0.04% |
| 50 | 11,244.04 | 224.88 | −0.12% | 0.18% |
| 100 | 22,453.30 | 224.53 | −0.28% | 0.36% |
| 250 | 55,857.86 | 223.43 | −0.77% | 0.90% |
| 500 | 103,890.89 | 207.78 | **−7.72%** | 1.80% |
| 1000 | — | — | **no route** | 3.60% |

`[Fakta]` Headline DEX liquidity for NVDAx is **$478,411**. Sellable under 1% slippage: **~$55,858 — 12% of the headline.** Sellable at 7.72%: ~$103,891, 22% of the headline. Above roughly 500 shares the aggregator returns no route at all.

`[Inferensi]` The proposal is not merely feasible, it produces the product's thesis on the first asset tried: **the published liquidity figure overstates real exit capacity by roughly eight times at a tolerable slippage.** It needs no permission, no capital, no issuer cooperation, and no KYC, and it was computed in nine read-only calls.

## 6. Effect on the decision

`[Inferensi]` The MODIFY is accepted in full. It removes the two components that were unbuildable or demand-free, keeps the one framing the corpus leaves open, and converts open unknown #5 — depth behind quoted liquidity — from a hazard into the deliverable.

`[Inferensi]` L³ meaningfully reduces the novelty claim. EXITPROOF's remaining distinctness is narrower and should be stated as: executable depth measured through the deployed router rather than scored heuristically, published as a contract-readable object, on assets whose exit constraint is currently invisible. Not "nobody has thought about exit risk."

`[Inferensi]` The absent lending-market customer stays unresolved. Any submission must present the consumer contract as a reference integration, never as adoption, and should say the customer does not exist on this chain yet rather than waiting for a judge to notice.

## 7. Revised scope

**In:** exit-depth curves across the 11 xStocks and X Layer DeFi positions via deployed Uniswap v3/v4 quoting · the Ondo public rate-limit reader as the cross-chain redemption exemplar · LLM policy reconciliation with per-figure citations · registry contract on X Layer testnet then mainnet · HTTP + MCP surface · web view.

**Out, and labelled as roadmap in those words:** executed redemption probes · bonded challenge · anything requiring OndoID registration on the critical path.
