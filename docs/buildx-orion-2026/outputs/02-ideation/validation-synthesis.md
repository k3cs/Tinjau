# Validation Synthesis — two independent agents, one verdict

- Date: 2026-08-16
- Inputs: Fable, fresh session (`independent-validation-result.md`) and Codex GPT-5.6-high (`exitproof-independent-validation.md`, confidence 0.82)
- Both were given `exitproof-validation-prompt.md`, which carried no recommendation and no scores
- **Both returned MODIFY. They converge on the same modification.**

## 1. Where they agree, independently

| Finding | Fable | Codex |
|---|---|---|
| Executed redemption probes are not buildable by 2026-08-21 | yes | yes |
| Bonded challenge market has no participants and should be cut | yes | yes |
| Quote-based executable exit depth is the buildable core | yes | yes |
| The corpus proof-of-reserve match is **Anyware, not Eliver** | yes | yes |
| Publishing a score as a contract-readable object is an existing pattern | yes (Cronos Shield) | yes (Pharos) |

`[Inferensi]` Two agents in separate sessions, with different tooling, reaching the same verdict and the same corrective is a stronger signal than either verdict alone. The Anyware/Eliver correction reproducing twice also confirms it was my error, not a quirk of one scan.

## 2. What Codex found that neither Fable nor I found

### C1 — The demand evidence exists. This was the biggest hole in the case.

`[Fakta]` Chaos Labs, assessing USDai/sUSDai for Aave V3 Arbitrum, publishes verbatim: *"Current sell side liquidity conditions, **measured as the maximum size that can be swapped within 5% price impact**, are as follows: USDai: ~$5M to USDC (down from $30M); sUSDai: ~$4.5M to USDC (down from $35M)"*, and notes *"In scenarios of large scale or rapid withdrawals, the protocol may still face constraints in meeting redemption demand."*

`[Fakta]` That assessment drives concrete listing parameters: 55M supply cap, 45M borrow cap, 20% reserve factor, and **no collateral or borrowing enabled initially**.

`[Inferensi]` This is EXITPROOF's exact output — maximum size swappable within a price-impact bound — produced by hand, by a professional risk firm, to decide whether real money is lent against an asset. Both Fable and I concluded demand was unproven. **We were both wrong, and neither of us looked in governance forums.** The measurement is purchased today; the open question is only whether anyone pays for it *automated*, and *on X Layer*.

### C2 — Pharos is a live, substantial competitor

`[Fakta]` `pharos.watch` publishes Safety Scores covering *"backing, exit routes, and economic control"*, a **Redemption Backstop score** rating an issuer redemption route 0–100 against *"modeled capacity requests of 5% of supply"*, a **Liquidity Score** measuring *"how safely a stablecoin can exit through decentralized markets"*, plus DEWS depeg early warning and a systemic stress index.

`[Fakta]` Verified on the live dashboard: it is titled *"Stablecoin Analytics Dashboard: Track 404 Coins"*, showing Core 258 · Variants 50 · Pegs 30 · Chains 113. A text scan of the running page returns **zero** occurrences of "X Layer", "xStock", "equity", "stock", "RWA", "tokenized", or "OKB".

`[Inferensi]` So the architecture EXITPROOF proposes is already built and running — for **stablecoins**, on other chains. Three genuine differences survive: Pharos models capacity at a fixed 5% of supply while the approach tested here **quotes through the deployed router at real position sizes**; Pharos covers stablecoins, not tokenised equities; and Pharos is a dashboard and API, not an on-chain object.

`[Inferensi]` Pharos existing is on balance *good* evidence, not bad. It proves the method works and that someone funded it. It removes "nobody wants this" and replaces it with "prove your slice is different", which is a much better problem to have.

### C3 — xStocks redemption exists, and closes open unknown #2

`[Fakta]` From xStocks' own documentation, verbatim: *"**Can retail users redeem directly with the issuer?** Yes. Retail users are legally permitted to redeem directly with the issuer, subject to **KYC requirements and the $5,000 minimum transaction size**. In practice, **most users access liquidity through secondary markets**."* And: *"If interacting directly with the issuer for issuance or redemption, the minimum transaction size is $5,000."*

`[Fakta]` Also: *"Each xStock is collateralized on a 1:1 basis. The corresponding underlying securities are held in segregated custody accounts. **Proof of reserves is publicly available.**"*

`[Inferensi]` Three consequences. Open unknown #2 is closed — the redemption dimension is **defined** for xStocks, not undefined as I had recorded. Executed probes remain infeasible, but for a cleaner reason than I guessed: $5,000 per probe plus KYC, not a lockup. And the issuer's own sentence — *"most users access liquidity through secondary markets"* — is the product's thesis stated by the issuer.

`[Inferensi]` Proof of reserves being *already public* also narrows the design honestly: the backing question is answered by the issuer. What is **not** answered is whether you can get out at your size. That is the only dimension worth building.

## 3. The modification, tested

Both validators propose replacing executed probes with quote-based executable depth. I ran it. NVDAx → USD₮0 on X Layer, live aggregator quotes:

| Shares | USD out | $/share | Impact |
|---|---|---|---|
| 100 | 22,453.30 | 224.53 | −0.28% |
| 250 | 55,857.86 | 223.43 | −0.77% |
| 500 | 103,890.89 | 207.78 | **−7.72%** |
| 1000 | — | — | **no route** |

`[Fakta]` Published DEX liquidity for NVDAx is $478,411. Sellable under 1% impact: **~$55,858 — 12% of that figure**. No route at all above roughly 500 shares.

`[Inferensi]` The published number overstates usable exit capacity by about eight times. That is the same class of finding Chaos Labs produces by hand, on an asset class nobody covers, on a chain Pharos does not track, computed in nine read-only calls.

## 4. Net effect on the idea

| Dimension | Before validation | After |
|---|---|---|
| Demand | unproven, listed as an unknown | **evidenced** — Chaos Labs does this manually to set Aave caps (C1) |
| Novelty | claimed as near-absent | **narrowed** — Pharos (stablecoins) and L³ (Cashu mints) occupy the method |
| Redemption dimension | undefined for xStocks | **defined**, and gated at $5,000 + KYC (C3) |
| Feasibility | probes uncertain | **probes out, quotes in**, confirmed by both validators and executed here |
| Customer on X Layer | assumed | **absent** — Aave X Layer lists 9 reserves, no xStocks |

`[Inferensi]` Demand went up, novelty went down, scope got smaller and more certain. That is a healthier position than before validation, and the surviving claim is narrow enough to state without overclaiming:

> Executable exit depth for tokenised equities on X Layer, measured through the deployed router at real position sizes rather than modelled, published as a contract-readable object. Backing is not measured — the issuer already publishes proof of reserves. Redemption capacity is read from public policy, not probed.

## 5. What must not be claimed

- That backing is verified. xStocks publish proof of reserves; EXITPROOF does not add to that.
- That executed redemption probes exist. They do not, and they are labelled roadmap in those words.
- That any protocol will consume the score. None exists on X Layer for these assets, and none has been asked.
- That the method is novel. Pharos built it for stablecoins; the novelty is the asset class, the chain, the measurement being quoted rather than modelled, and the on-chain object.

## 6. Open, still

- Whether any X Layer venue or agent would consume the output. One outreach message would be the first demand datum anyone in this workspace has gathered — Codex flagged the same gap.
- Whether Pharos intends to cover tokenised equities.
- OndoID onboarding turnaround, now off the critical path since the USDY reader is public-state only.
