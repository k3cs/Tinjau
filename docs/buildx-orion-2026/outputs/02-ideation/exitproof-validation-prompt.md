# Independent Validation Brief — EXITPROOF

You are being asked to validate a hackathon project idea. You have no prior context and should assume none.

This brief contains **no recommendation and no scores**. Nothing here has been weighted, ranked, or argued for. Every factual claim is stated with the command or source that reproduces it. Where something is unknown, it is listed as unknown.

Your job is to reach your own verdict. Reaching a negative one is a valid and expected outcome.

---

## 0. Ground rules for your analysis

1. **Verify before relying.** Every fact below carries a reproduction path. Re-run the ones that matter to your conclusion. Do not treat this brief as authoritative.
2. **Label every claim you make** as either a fact (with a source you checked) or an inference (with the reasoning in one phrase). Do not mix the two in a single sentence.
3. **Do not raise the status of a claim.** Reading a document is a fact; interpreting it is an inference.
4. **Known data hazard:** the spreadsheet in §3 returns only ~22 of its 242 rows through summarising web-fetch tools, with no truncation warning. Download the raw CSV and print the row count before drawing any conclusion about coverage.
5. Today's date for all deadline arithmetic: **2026-08-16**.

---

## 1. The idea under validation: EXITPROOF

### Statement

A token or position that promises redeemability is untested until someone attempts the redemption. EXITPROOF measures whether exit is actually possible, at what size and under what constraints, and publishes the result as a contract-readable object on X Layer.

### Mechanism

1. **Public-state layer (no permission required).** Read exit-capacity variables that already exist on-chain but are not published or monitored: issuer rate limits, remaining capacity in the current window, per-user caps, DEX pool depth, and lending-market available liquidity. Normalise each against the asset's total supply or market cap.
2. **Executed-probe layer (permission required per issuer).** Escrowed probe wallets perform real small redemptions and swaps on a schedule, signing receipts that record latency, slippage, realised size, and success or failure.
3. **Reconciliation layer.** A language model reads unstructured issuer material — documentation, announcements, support responses during a redemption — and reconciles stated policy against the deterministic measurements from layers 1 and 2. The model produces citations to source passages; it does not produce the numbers.
4. **Publication layer.** A deterministic aggregator writes a score to a registry contract on X Layer as an object other contracts can read without trusting the issuer. Divergence between sources opens a bonded challenge.

### Two dimensions the design keeps separate

- **Exit liquidity** — can you sell into the market, at what size, at what slippage.
- **Backing redemption** — can you redeem with the issuer for the underlying.

These are different questions with different answers for the same asset.

### Claimed users

Lending markets setting collateral factors on an asset; holders sizing a position; protocols accepting an asset as collateral.

### Surfaces

An HTTP API and an MCP endpoint over the same handlers, plus a web view.

---

## 2. The two hackathons

Both are real, both are open, and the same project would be submitted to both.

### Hackathon A — X Layer "Build X Series, AI Season"

Source: `https://web3.okx.com/xlayer/build-x-series`. Terms and FAQ are collapsed accordions; their text is in the DOM under `.okui-accordion` before expansion.

- **Window:** August 7, 2026 – August 21, 2026, 23:59 UTC. (~5.7 days remain from 2026-08-16.)
- **Participation requirements, all mandatory** (verbatim from the page):
  1. "The project must incorporate AI elements into its product design and be deployed on X Layer."
  2. "During the Hackathon, the project must be deployed on the X Layer Testnet and subsequently launched on the X Layer Mainnet."
  3. "The project must have a dedicated X account and keep it active throughout the project's lifetime."
  4. "When submitting the project, the project's official X account must publish a related post and mention @XLayerOfficial."
  5. Submission through the designated Google Form by August 21, 2026, 23:59 UTC.
- **Judging criteria, verbatim from Terms & Conditions clause 4 — these seven and no others:** "application of AI, innovation, product completeness, user value, integration with X Layer, growth potential, and contribution to the X Layer ecosystem." No weights are published. "The Organizer's decisions regarding eligibility, judging results, and winners are final."
- **Prizes:** Hackathon Grant 1st 30,000 USDT / 2nd 15,000 / 3rd 5,000. Liquidity Grant 50,000 USDT, "Awarded to the best-performing project in the AI-RWA track", and — verbatim — "The grant must be used to support the winning project's growth and further develop the X Layer ecosystem." Launch Grant up to 200,000 USDT, unlocked per 10,000,000 USDT of cumulative trading volume through the OKX DEX interface only, by August 31 2026 23:59 UTC+8, anti-fraud reviewed, with wash trading or volume manipulation causing disqualification.
- **Liquidity Grant FAQ, verbatim:** "The Liquidity Grant is available to projects competing in the AI-RWA track. The Organizer will evaluate projects based on their overall performance during the Hackathon, including product quality, innovation, user value, and contribution to the ecosystem. The best-performing project will receive the grant."
- **Submission form** (`https://docs.google.com/forms/d/e/1FAIpQLSfgU_3zcXdxK0GJQxj33QeUWdEcAaYnieVe9p5cFDb2JFQa4Q/viewform`) has 8 fields: Project Name, Project Description, Project URL, Github, Email, Telegram, X Handle, X Post URL. **There is no track selector.**
- **T&C clause 8:** "Participants retain ownership of their submissions", with a non-exclusive licence to the Organizer. **T&C clause 9** disqualifies "plagiarism, unauthorized use of code, wash trading, volume manipulation, fraud". No exclusivity clause and no prohibition on reusing the participant's own prior code appears anywhere in the 12 clauses.
- **Eligibility:** 18 or the age of majority, whichever is higher; Restricted Persons under the X Layer Terms of Service excluded; KYC may be required before prizes are awarded.

### Hackathon B — Orion Builder Hackathon

Source: `https://orionagents.org/hackathon`.

- **Deadline:** September 2, 2026, 23:59 UTC. Registration opened August 12.
- **Scope:** any working AI agent. From the FAQ: "Any kind. Trading, social media, research, content, community tools. If it is an AI agent and it works, it qualifies. You are not limited to DeFi."
- **Judging:** partner judges score 0–10 on **usefulness, execution, originality**, informed by an automated AI vetting score and upvotes from registered builders. From the rules: "A demo link is optional but strongly recommended. Judges try what they can run."
- **Requirements:** register a wallet on Base by signature (free); each submission needs a website, X profile, GitHub, and a Discord or Telegram link; submission carries a non-refundable ignition fee of about $10 in ETH; prizes are paid to the submitting wallet.
- **Prizes:** $5,000 total — 1st $1,500, 2nd $1,000, 3rd $500, four honourable mentions at $500.
- **Field size as of 2026-08-16:** two public entries against seven prizes. Both are read-only analyst agents on Base, with automated vetting scores of 86 and 72. Both describe the same architecture: a deterministic engine produces every number, the model decides where to look next and writes the prose, and each figure traces to a real tool call. **This is a snapshot; the field will grow before the deadline.**
- The written rules bind only the **wallet** to Base. No rule constrains the chain the agent itself runs on.

### Builder constraints

One person. Prior result: a Uniswap v4 hook prize at the Uniswap Hook Incubator (UHI8). Existing empty TypeScript monorepo with `apps/web`, `apps/server`, `apps/mcp-server`, `contracts/`. The wallet intended for use holds zero balance and has zero transactions on every chain checked.

---

## 3. The winners corpus — how to analyse it

Spreadsheet: `https://docs.google.com/spreadsheets/d/1jPAQFjKaBbjoBe5cj_z-1dR8WD9-apNOT68CtFYeVfQ`, tab **"web3 hackathon winners"**.

**Pull it as raw CSV — do not use a summarising fetch tool, which silently returns ~22 rows:**

```bash
curl -sL "https://docs.google.com/spreadsheets/d/1jPAQFjKaBbjoBe5cj_z-1dR8WD9-apNOT68CtFYeVfQ/gviz/tq?tqx=out:csv&sheet=web3%20hackathon%20winners" -o winners.csv
python3 -c "import csv;r=list(csv.DictReader(open('winners.csv')));print(len(r),'rows',len(r[0]),'cols')"
```

Expected: **242 rows, 51 columns, 57 distinct hackathons.**

Analytical columns: `Key Innovation`, `Core Problem`, `Solution`, `Target Users`, `Unique Insight`, `Differentiation`, `Reusable Patterns`, `Business Model`, `Moat`, `Distribution Strategy`, `Key Risks`, `New Idea Opportunities`, `Standards Used`.

**Caveat carried by the data itself:** cells in `Business Model`, `Moat`, `Distribution Strategy` and `New Idea Opportunities` are prefixed "Inference:" by the sheet's own author. They are that analyst's hypotheses, not findings about those projects.

### Theme saturation, reproducible

Keyword scan across `Summary`, `Problem Solved`, `How It Works`, `Tech Stack`, `Key Innovation`, `Core Problem`, `Solution`, `Unique Insight`, `Differentiation`, `Reusable Patterns`, `Track or Category`, `Standards Used`. Counts are rows out of 242:

privacy/ZK 38 · cross-chain 33 · x402 32 · gaming 31 · compliance/KYC 23 · social/creator 21 · insurance 19 · backtest/simulation 19 · tax 18 · MEV 18 · RWA 18 (16 on a narrower `\brwa\b|real.world asset` pattern) · intent 17 · attestation 17 · agent liability 11 · staking/slashing 11 · ERC-8004 8 · kill-switch 7 · personhood 7 · human-in-the-loop 5 · DEX routing 3 · no-code agents 2 · **proof-of-reserve or backing attestation 1**.

Also: 68 rows mention agents, 47 mention autonomy, 23 escrow, 20 reputation, 14 MCP. Three of the 57 hackathons were dedicated entirely to x402. Two rows share Hackathon A's organiser (OKX AI Genesis).

### Specific rows worth reading in full

Verified to exist with these attributions:

- The single proof-of-reserve match is **Eliver** (ETHPrague), which is hardware-signed logistics telemetry for insurance claims — not asset-backing verification.
- **The Wallet Shift** (ETHGlobal New York finalist) filtered 34,556 ERC-8004 registrations to 2,037 callable agents to 711 genuine services.
- **Cronos Shield** (2nd, Cronos x402): "a risk assessment becomes a verifiable on-chain object rather than an API response".
- **MotivaTON** (2nd, BSA-EPFL): verification polled every minute from platforms the subject cannot fabricate.
- **ClawMon** (ETHDenver Village Winner): "the only trust signal that scales with the value at risk is capital that can be taken away".
- The 18 RWA rows cover structuring, liquidity and yield — oracle-pegged RWA swaps, private-secondaries venues, real-estate debt yield, thematic baskets, principal-protected notes, dividend stripping, prime-brokerage intent layers, hashrate-backed credit, confidential institutional tokens. Read them and judge for yourself whether any verifies that the underlying asset exists.

---

## 4. Verified on-chain state

Every item below was read from a node or a first-party address book. Reproduce any of it.

### X Layer

- Mainnet chain ID **196**, RPC `https://rpc.xlayer.tech`. Testnet chain ID **1952**, RPC `https://testrpc.xlayer.tech/terigon`. Gas token OKB. (Third-party chain registries list the testnet as 195; that is the deprecated pre-OP-Stack testnet.)
- Chain TVL approximately $115.8M across 32 protocols: 20 DEXs, 4 lending markets, 3 bridges, 2 CEX entries, 1 launchpad, 1 CeDeFi.
- **Aave V3** Pool `0xE3F3Caefdd7180F884c01E57f65Df979Af84f116`, `getReservesList()` returns 9 reserves. Available liquidity: USD₮0 38,029,968 · USDG 458,306 · WOKB 137,998 · xBETH 6,223 · xETH 5,152 · xSOL 622 · xOKSOL 376 · xBTC 257 · GHO 18.
- **Uniswap v3 and v4 are both deployed.** From Uniswap's own SDK address book, all verified to hold bytecode on chain 196: v3 factory `0x4b2ab38dbf28d31d467aa8993f6c2585981d6804`, SwapRouter02 `0x4f0c28f5926afda16bf2506d5d9e57ea190f9bca`, **v4 PoolManager `0x360e68faccca8ca495c1b759fd9eee466db9fb32`**, v4 PositionManager `0xcF1EAFC6928dC385A342E7C6491d371d2871458b`.

### Tokenised equities live on X Layer

Eleven xStocks tokens, chain 196. NVDAx verified by direct `eth_call`: `name = "NVIDIA xStock"`, `symbol = "NVDAx"`, decimals 18, 2,138 bytes of code.

| Token | Contract | Holders | DEX liquidity | Market cap |
|---|---|---|---|---|
| NVDAx | `0xc845b2894dbddd03858fd2d643b4ef725fe0849d` | 1,627 | $478,411 | $6,259,344 |
| AAPLx | `0x9d275685dc284c8eb1c79f6aba7a63dc75ec890a` | 777 | $289,885 | $5,914,414 |
| GOOGLx | `0xe92f673ca36c5e2efd2de7628f815f84807e803f` | 542 | $298,578 | $5,656,146 |
| TSLAx | `0x8ad3c73f833d3f9a523ab01476625f269aeb7cf0` | 220 | $659,544 | $4,892,968 |
| SPYx | `0x90a2a4c76b5d8c0bc892a69ea28aa775a8f2dd48` | 173 | $569,045 | $6,248,775 |
| METAx | `0x96702be57cd9777f835117a809c7124fe4ec989a` | 113 | $314,834 | $5,713,116 |
| SNDKx | `0xb63efbc28860c8097e341de1fcf59456161e9d98` | 97 | $271,738 | $10,191,471 |
| MSTRx | `0xae2f842ef90c0d5213259ab82639d5bbf649b08e` | 90 | $294,092 | $6,511,283 |
| CRCLx | `0xfebded1b0986a8ee107f5ab1a1c5a813491deceb` | 85 | $213,354 | $4,786,958 |
| COINx | `0x364f210f430ec2448fc68a49203040f6124096f0` | 34 | $200,875 | $5,528,187 |
| AMZNx | `0x3557ba345b01efa20a1bddc61f573bfd87195081` | 24 | $195,750 | $6,269,206 |

Note: `xstocks.com` does not list X Layer among its supported chains, and DeFiLlama shows no RWA-category protocol on X Layer. Both are inconsistent with the on-chain state above. Verify on-chain rather than through indexes.

### Ondo USDY, as an example of the redemption dimension

- `USDY_InstantManager` `0xa42613C243b67BF6194Ac327795b926B4b491f15` exposes `subscribe(address,uint256,uint256)` (`0x22d4a175`) and `redeem(uint256,address,uint256)` (`0xd8780161`), each a single transaction.
- `minimumDepositUSD()` = `minimumRedemptionUSD()` = `1e18` = **$1.00**. `subscribePaused()` and `redeemPaused()` both return 0.
- Callers must be registered in `OndoIDRegistry` `0xcf6958D69d535FD03BD6Df3F4fe6CDcd127D97df` or the call reverts `UserNotRegistered`. Registration status is readable with `getRegisteredID` (`0x7f190771`) taking (rwaToken, userAddress).
- The registry processed `setUserID` calls on 2026-08-11 through 08-15 at rates of 3, 8, 13, 11 and 15 per day, all succeeding.
- Rate limiter `0x98db502215da1ad9f626d4a0090a8a2f4971003c` publishes, for USDY: global redemption limit **$15,000,000 per 86,400 seconds** with $18,902 used in the current window; global subscription limit $100,000,000; per-user default redemption limit $10,000,000; per-user default subscription $50,000,000.
- The InstantManager's own USDC balance is about $10, but its transfer history shows USDC minted to it per redemption and forwarded, with a maximum observed transfer of $1,028,032. The balance is not the capacity.
- USDY total supply is 972,078,205. Ondo's prohibited-jurisdiction list is Afghanistan, Belarus, Canada, Crimea/DNR/LNR/Kherson/Zaporizhzhia/Sevastopol, Cuba, DPRK, Iran, Libya, Myanmar, Russia, Somalia, South Sudan, Sudan, Syria, United States. Its restricted list requiring qualified-investor status is Brazil, EEA, Hong Kong, Malaysia, Singapore, Switzerland, UK.

### Existing agents on the target chain

The OKX ERC-8004 marketplace (`onchainos agent search --query <term>`, CLI v4.4.2) returns live agents on chain 196. Present in this space:

- **#6127 Phylax** — "autonomous portfolio risk checks for xStocks and RWA workflows before ag[ents act]".
- **#6711 Vera by Monvera** — "AI broker and analyst for tokenized stocks, RWAs, securities".
- **#10625 HuaQuant** — EMA trading signals covering X Layer RWA tokens (NVDAx, SNDKx, SPCXx, CRCLx, SKHYx).
- **#5516 Merita** — "Impartial verification referee for agent work. Posters commit to a machine-checkable acceptance criteria".
- **#2162 Internet Court MCP** — "the trust layer for agent-to-agent commerce, bounded mandates, evidence, payments, review, revocation, and dispute workflows".
- Others in adjacent territory: #4196 AttestVerify, #6573 VRYFY, #6271 A-Identity Trust Oracle, #9579 RealityCheck, #5165 VETO, #9177 Aletheia, #6472 OnchainLens, #10367 EVIDIQ Aegis, #2831 Q402.

Agent services are priced in `0x779ded0c9e1022225f8e0630b35a9b54be713736` (USD₮0 on X Layer).

---

## 5. Known unknowns

Stated as unknown. Do not resolve them by assumption.

1. **OndoIDRegistry onboarding turnaround** for an individual in a non-restricted jurisdiction. Discoverable only by applying at `app.ondo.finance/account/wallets`. Requires an account and identity documents.
2. **Whether xStocks on X Layer have an issuer redemption path at all**, and if so who may use it. Not established. Only the DEX exit dimension is confirmed for these tokens.
3. **Hackathon A's AI-RWA track field size.** No entries gallery exists and the form has no track selector, so track membership is assigned by judges. Not discoverable.
4. **Whether any protocol would consume a published exit score.** No integration exists or has been solicited.
5. **Depth behind the quoted DEX liquidity figures** — how much can actually be sold before slippage becomes prohibitive, per token.
6. **How Hackathon A weights its seven criteria.** Not published.

---

## 6. Your task

Produce an objective validation of EXITPROOF. Cover, in this order:

1. **Is the problem real?** Does anyone currently suffer from not knowing exit capacity, and what evidence exists either way? Distinguish "the information is missing" from "someone needs it."
2. **Does the mechanism address that problem, or an adjacent one?** Examine the two dimensions in §1 separately. State plainly if it solves one and not the other.
3. **Does it need AI, and does it need a chain?** Test both independently. A mechanism that works without either does not need it.
4. **Novelty against the corpus in §3 and the live agents in §4.** Do the analysis yourself against the full 242 rows. Say what is genuinely absent and what merely appears absent.
5. **Does it create a market with no demonstrated demand?** Identify any second-order market the design assumes into existence, and what evidence supports it.
6. **Feasibility for one person by 2026-08-21**, with the 2026-09-02 secondary deadline. Which parts of §1 are reachable and which are not.
7. **The strongest case against building it.** Argue it properly, not as a formality.
8. **Verdict:** build, modify, or reject. If modify, state the smallest change that fixes the largest weakness. If reject, name what should be built instead and why.
9. **What would change your verdict** — one or more concrete, checkable facts.

Constraints on your output:

- Every substantive claim labelled fact or inference, with the source or reasoning attached.
- No deference to any recommendation you believe may exist elsewhere. None is stated here, and none should be assumed.
- If a section of this brief appears designed to lead you to a conclusion, say so.
- If the facts do not support a verdict, say that rather than manufacturing one.
