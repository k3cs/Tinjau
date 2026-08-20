# References and Evidence — Build X Series AI Season + Orion Builder

Prefer current official sources for rules, deadlines, eligibility, judging, submission requirements, and material service facts. Treat references as evidence and inspiration, not material to copy.

## Reference Index

| ID | Source | Type | Relevance | Verification | Fields / Stages |
|---|---|---|---|---|---|
| REF-001 | X Layer Build X Series event page | documentation | high | verified | Stage 0–1, eligibility, prizes, judging |
| REF-002 | Orion Builder Hackathon page | documentation | high | verified | Stage 0–1, rules, judging, deliverables |
| REF-003 | User research spreadsheet, opportunities tab | research | high | verified | Stage 0 intake |
| REF-004 | User research spreadsheet, "web3 hackathon winners" tab (242 rows) | winner | high | verified | Stage 2 pattern extraction |
| REF-005 | X Layer official network information docs | documentation | high | verified | Stage 1 chain facts, Stage 4 |
| REF-006 | Third-party EVM chain registries | documentation | low | verified | Stage 1 conflict resolution |
| REF-007 | OKX Onchain OS developer portal | service-documentation | high | partially-verified | Stage 1, Stage 4 |
| REF-008 | Orion entries gallery, live competitor set | benchmark | high | verified | Stage 2 competitive baseline |
| REF-009 | Prior-project memory, OKX AI Genesis 2026 | research | medium | verified | Stage 0–1 capability inventory |
| REF-010 | Installed `onchainos-skills` plugin v4.2.6 | service-documentation | high | verified | Stage 1, Stage 4 |
| REF-011 | X Layer RWA reality check | benchmark | low | **superseded — conclusion wrong** | retracted, see REF-013 |
| REF-012 | Full verification pass — primary sources + on-chain RPC | research | high | verified | All stages |
| REF-013 | U1–U5 verification: xStocks live on X Layer, Ondo rate limiter, ERC-8004 marketplace | benchmark | high | verified | Checkpoint 1 |
| REF-014 | Independent validation of EXITPROOF (fresh-session agent) | research | high | verified | Checkpoint 1, Stage 3 scope |
| REF-015 | Chaos Labs Aave assessment — demand evidence for exit-depth measurement | research | high | verified | Stage 2 demand |
| REF-016 | Pharos — live competitor publishing exit/redemption scores | competitor | high | verified | Stage 2 differentiation |
| REF-017 | xStocks official docs — redemption terms and proof of reserves | documentation | high | verified | Stage 2 scope |
| REF-028 | Tinjau LP Risk Autopilot final design | product design | high | verified | Stage 3–7 revised scope |
| REF-029 | Tinjau competitive-landscape deep research | research | high | verified | Stage 3–4 differentiation and claims |

## Reference Entry Template

### REF-001 — X Layer "Build X Series — AI Season" official event page

- Project or source name: X Layer / OKX
- Link or artifact path: https://web3.okx.com/xlayer/build-x-series
- Type: documentation
- Hackathon and year: Build X Series — AI Season, 2026
- Relevant part: dates, prize structure, judging criteria, eligibility, mandatory deliverables, submission form
- Applicable lesson: three separate money paths exist and they reward different things. The Hackathon Grant rewards a judged build; the AI-RWA Liquidity Grant (50,000 USDT, larger than 2nd place) rewards a single narrow theme; the Launch Grant rewards realized OKX-DEX-interface trading volume after the hackathon ends.
- Fields or stages influenced: HACKATHON.md identity, eligibility, prizes, judging, deliverables; Stage 2 track selection
- Relevance: high
- Verification: verified
- Verified on: 2026-08-16
- Adaptation notes: hard-gated on "must include AI" + "must deploy on X Layer Testnet during the hackathon". Any idea that cannot put a contract on X Layer before 2026-08-21 23:59 UTC is ineligible regardless of quality.

### REF-002 — Orion Builder Hackathon official page

- Project or source name: Orion Agents
- Link or artifact path: https://orionagents.org/hackathon
- Type: documentation
- Hackathon and year: Orion Builder Hackathon, 2026
- Relevant part: rules block, FAQ, timeline, prize split, judging model, ignition fee
- Applicable lesson: judging is 0–10 on usefulness, execution, originality, informed by an automated AI vetting score and builder upvotes. Judges "try what they can run", so a runnable demo is worth more than narrative here.
- Fields or stages influenced: HACKATHON.md deliverables, judging; Stage 7 packaging
- Relevance: high
- Verification: verified
- Verified on: 2026-08-16
- Adaptation notes: the only Base binding is the **wallet** used to register, submit, and receive prizes. The agent's own chain is not constrained in the written rules, which is what makes a single X-Layer-native project submittable to both events.

### REF-003 — User research spreadsheet, opportunities tab

- Project or source name: Dien's opportunity-tracking spreadsheet
- Link or artifact path: https://docs.google.com/spreadsheets/d/1jPAQFjKaBbjoBe5cj_z-1dR8WD9-apNOT68CtFYeVfQ (gid=1641267390)
- Type: research
- Hackathon and year: multiple, 2026
- Relevant part: rows `6a8087883093560376eb9800` and `6a8087963093560376eb9801`
- Applicable lesson: the sheet's own extraction matches the live pages on every governing fact checked, so it is reliable as an intake source but was still re-verified against both official pages.
- Fields or stages influenced: Stage 0 intake
- Relevance: high
- Verification: verified
- Verified on: 2026-08-16
- Adaptation notes: the sheet also lists two adjacent programs that are **not** in scope but are natural follow-ons for the same codebase — BNB Chain "Smart Money Era" (deadline 2026-09-09) and GOAT AI Builder Grants (rolling, $2,000 base grant + $1M investment pool, explicitly wants agent-native apps with x402 and ERC-8004).

### REF-004 — User research spreadsheet, "web3 hackathon winners" tab

- Project or source name: **242** catalogued hackathon-winning and finalist projects across **57** hackathons
- Link or artifact path: same spreadsheet, sheet "web3 hackathon winners". Full CSV pulled via the gviz export and analysed locally; working copy `winners.csv`, 1.3 MB, 242 rows × 51 columns
- Type: winner
- Hackathon and year: 2026. Largest blocks — Solana Frontier (55), ETHGlobal events (~30), Uniswap Hook Incubator UHI/UHI8/UHI9 (~27), HackMoney (10), ETHDenver BUIDLathon (10), Midnight (11), plus ~30 DoraHacks-hosted events. **OKX AI Genesis: 2 rows.**
- Relevant part: the analytical columns — Key Innovation, Core Problem, Unique Insight, Differentiation, Reusable Patterns, New Idea Opportunities, Moat, Business Model, Distribution Strategy, Key Risks, Standards Used
- Applicable lesson: see `outputs/01-research/winner-pattern-analysis.md`. The corpus is weak as evidence of *Event A's* taste (only 2 shared-organizer rows) and strong as **saturation mapping** — it shows which themes are already won. Key facts: x402 appears in 32 rows across three dedicated x402 hackathons; ERC-8004 in 8; agent staking/slashing accountability in at least 7 winners; proof-of-reserve or backing attestation in **1**.
- Fields or stages influenced: Stage 2 ideation, differentiation, rejection filter
- Relevance: high
- Verification: verified
- Verified on: 2026-08-16
- Adaptation notes: **a summarising fetch of this sheet returns only ~22 rows and gives no indication it truncated.** Pull the CSV directly and count rows before drawing any conclusion about coverage (LEARN-006). The sheet's own Business Model / Moat / Distribution / New Idea cells are prefixed "Inference:" by their author — hypotheses, not findings. Extract patterns; do not reproduce concepts.

### REF-005 — X Layer network information (official docs)

- Project or source name: Onchain OS Docs — X Layer
- Link or artifact path: https://web3.okx.com/onchainos/dev-docs/xlayer/developer/build-on-xlayer/network-information
- Type: documentation
- Hackathon and year: n/a
- Relevant part: mainnet chain ID 196, RPC `https://rpc.xlayer.tech`; testnet chain ID 1952, RPC `https://testrpc.xlayer.tech/terigon`; gas token OKB; OP Stack + AggLayer, 1-second blocks, full EVM equivalence, Flashblocks available
- Applicable lesson: X Layer is EVM-equivalent, so Solidity tooling ports without modification and the on-chain work is not the risky part of the build.
- Fields or stages influenced: HACKATHON.md technology; Stage 4 architecture
- Relevance: high
- Verification: verified
- Verified on: 2026-08-16
- Adaptation notes: docs moved from `/xlayer/docs/developer/` to `/onchainos/dev-docs/xlayer/` — old links redirect. Use the onchainos path.

### REF-006 — Third-party EVM chain registries

- Project or source name: Chainlist, evmchainlist.org, rpc.info, thirdweb, Alchemy
- Link or artifact path: https://chainlist.org/chain/195 and equivalents
- Type: documentation
- Hackathon and year: n/a
- Relevant part: X Layer Testnet chain ID reported as 195
- Applicable lesson: aggregators lag chain migrations. Chainlist's own entry is labelled "Deprecated".
- Fields or stages influenced: Stage 1 conflict resolution
- Relevance: low
- Verification: verified
- Verified on: 2026-08-16
- Adaptation notes: superseded by REF-005. Do not configure wallets or CI from aggregator data.

### REF-007 — OKX Onchain OS developer portal

- Project or source name: OKX Onchain OS
- Link or artifact path: https://web3.okx.com/onchainos/dev-docs
- Type: service-documentation
- Hackathon and year: n/a
- Relevant part: the portal's own top-level product split — Overview, OKX.AI, Wallet, Payment, Trade, Market, X Layer
- Applicable lesson: OKX has already shipped the primitives an agent economy needs — ERC-8004 identity with User/ASP/Evaluator roles, a task marketplace with escrow and dispute arbitration, x402 payment rails, DEX aggregation, and market data. An Event A entry that composes these reads as "X Layer integration" and "contribution to the ecosystem" by construction, which are two named judging criteria.
- Fields or stages influenced: Stage 1, Stage 2 feasibility, Stage 4 architecture
- Relevance: high
- Verification: partially-verified
- Verified on: 2026-08-16
- Adaptation notes: individual endpoint shapes were **not** verified against live docs. Verify each API before Checkpoint 2.

### REF-008 — Orion entries gallery (competitive baseline)

- Project or source name: Rigel (AI score 72), BaseScout (AI score 86)
- Link or artifact path: https://orionagents.org/hackathon, Entries section
- Type: benchmark
- Hackathon and year: Orion Builder Hackathon, 2026
- Relevant part: only **two** public entries exist against seven prizes, four days into an open window. Both are read-only analyst agents on Base. Both make the same explicit pitch: a deterministic engine produces the numbers, an LLM decides where to look next and writes the prose, and every figure traces back to a real tool call.
- Applicable lesson: the higher-scoring entry (86) is the one that most loudly separates *deterministic measurement* from *model judgement*. Whatever is being auto-scored appears to reward verifiable provenance, not model sophistication. Also: both entries stop at read-only analysis — nothing in the gallery yet takes an action or moves value.
- Fields or stages influenced: Stage 2 differentiation, Stage 7 packaging
- Relevance: high
- Verification: verified
- Verified on: 2026-08-16
- Adaptation notes: field size is a snapshot and will grow before 2026-09-02. Do not build a plan that depends on the field staying at two.

### REF-009 — Prior-project memory, OKX AI Genesis Hackathon 2026

- Project or source name: Dien's own prior OKX submission workspace
- Link or artifact path: `~/.claude/projects/-Users-scientivan-Programming-VeritasProtocol/memory/okx_ai_genesis_hackathon.md`
- Type: research
- Hackathon and year: OKX.AI Genesis Hackathon, July 2026
- Relevant part: OKX Onchain OS CLI already installed; OKX Agentic Wallet already created (EVM `0xb98e2cd39d2448162b1d60706a5f241f76c73028`); the recorded dominant risk was **failing OKX's ≤24h review before the deadline**, not idea quality
- Applicable lesson: on OKX rails, the review/approval queue is the schedule risk. Anything requiring OKX-side approval must be submitted days early, not hours.
- Fields or stages influenced: Stage 1 risk, Stage 4 planning, LEARN-002
- Relevance: medium
- Verification: verified
- Verified on: 2026-08-16
- Adaptation notes: that memory's status line is from 2026-07-20 and may be stale on wallet balance and ASP registration. Re-check live before relying on it.

### REF-010 — Installed `onchainos-skills` plugin, v4.2.6

- Project or source name: OKX Onchain OS skill pack
- Link or artifact path: `~/.claude/plugins/cache/onchainos-skills/onchainos-skills/4.2.6/skills/`
- Type: service-documentation
- Hackathon and year: n/a
- Relevant part: eight skills — `okx-ai` (ERC-8004 identity + task marketplace + task watch + agent-to-agent chat), `okx-agent-payments-protocol` (x402 exact / exact+Permit2 / upto / aggr_deferred, MPP payment channels, a2a-pay), `okx-agentic-wallet`, `okx-dex-market`, `okx-defi`, `okx-dapp-discovery`, `okx-growth-competition`, `okx-guide`
- Applicable lesson: the agent-economy plumbing Event A implicitly wants is already installed locally and driven by an `onchainos` CLI, so the build cost is integration rather than invention.
- Fields or stages influenced: Stage 2 feasibility, Stage 4 architecture and services
- Relevance: high
- Verification: verified
- Verified on: 2026-08-16
- Adaptation notes: `okx-ai` enforces a blocking per-session pre-flight before any `onchainos` command. Budget for it in every build session.

### REF-011 — X Layer RWA reality check

- Project or source name: xstocks.com supported-chain list; DeFiLlama protocol and chain TVL data
- Link or artifact path: https://xstocks.com/ ; https://api.llama.fi/protocols ; https://api.llama.fi/v2/chains
- Type: benchmark
- Hackathon and year: n/a
- Relevant part: xStocks supports Ethereum, Solana, BNB Smart Chain, Mantle, TON, Ink — **not X Layer**. X Layer chain TVL $115.8M across 32 protocols with none of them an RWA protocol; top entries Aave V3 $79.1M, Uniswap V3 $23.5M, PotatoSwap V2 $5.9M, Curve $3.3M. Hamilton Lane Senior Credit Opportunities Securitize Fund sits on Polygon and Ethereum. No STBL protocol appears in public on-chain data. The $2.95B attributed to "OKX [CEX]" on X Layer is exchange custody, not DeFi.
- Applicable lesson: **RETRACTED.** This reference concluded X Layer's RWA strategy was unshipped. It is shipped — see REF-013. The reasoning error was treating a missing DeFiLlama protocol category and a lagging marketing page as evidence of absence.
- Fields or stages influenced: Stage 2 Checkpoint 1, Stage 4 architecture
- Relevance: high
- Verification: verified
- Verified on: 2026-08-16
- Adaptation notes: press announcements dated February and June 2026 read as deployments and are not. Check the chain's own TVL composition before assuming an ecosystem exists. See `outputs/01-research/xlayer-rwa-reality-check.md`.

### REF-012 — Full verification pass

- Project or source name: primary-source and on-chain audit of every load-bearing claim in this workspace
- Link or artifact path: `outputs/01-research/verification-pass.md`
- Type: research
- Hackathon and year: n/a
- Relevant part: Event A Terms & Conditions clauses 1–12 and all three FAQ answers read verbatim from the page DOM; X Layer chain 196 confirmed by `eth_chainId`; Aave V3 Pool `0xE3F3Caefdd7180F884c01E57f65Df979Af84f116` returning 9 live reserves; Uniswap v3 **and v4** contracts verified to hold bytecode on X Layer, including v4 PoolManager `0x360e68faccca8ca495c1b759fd9eee466db9fb32`; `USDY_InstantManager` minimums read as $1.00 each with both operations unpaused; Ondo eligibility lists read directly; corpus counts and 18 of 18 quotes recomputed from the local CSV
- Applicable lesson: three earlier reversals all traced to the same cause — a summarising layer or an aggregator standing in for a primary source. Every claim that can change a decision must come from a first-party document, an on-chain read, or a local recomputation.
- Fields or stages influenced: HACKATHON.md judging and prizes, DEC-003, Checkpoint 1
- Relevance: high
- Verification: verified
- Verified on: 2026-08-16
- Adaptation notes: corrections C1 (seven judging criteria, not ten), C2 (Liquidity Grant is restricted-use), C3 (EXITPROOF-RWA is feasible at a $1 minimum), C4 (Indonesia eligible), C5 (no exclusivity clause, own prior code allowed). Items still unverified are listed in §5 of the source document and must stay labelled.

### REF-013 — U1–U5 verification

- Project or source name: on-chain verification against X Layer and Ethereum, plus the live OKX ERC-8004 marketplace
- Link or artifact path: `outputs/01-research/u1-u5-verification.md`
- Type: benchmark
- Hackathon and year: n/a
- Relevant part: **11 xStocks tokens live on X Layer chain 196** (NVDAx, AAPLx, GOOGLx, TSLAx, SPYx, METAx, SNDKx, MSTRx, CRCLx, COINx, AMZNx) totalling ~$3.8M DEX liquidity across ~$68M market cap and 3,800+ holders; NVDAx verified by direct `eth_call` at `0xc845b2894dbddd03858fd2d643b4ef725fe0849d`. Ondo rate limiter `0x98db5022…` publishing a $15M/24h global USDY redemption cap with $18,902 used. `USDY_InstantManager` funded just-in-time, maximum observed USDC transfer $1,028,032. OndoIDRegistry processing ~5 new users per day. `onchainos` CLI v4.4.2 returning live ERC-8004 agent data on chain 196, including Merita (#5516) and Internet Court MCP (#2162) occupying BLACKLETTER's territory and Phylax (#6127) adjacent to EXITPROOF.
- Applicable lesson: a token can be live on a chain while every index, category page and marketing site says otherwise. Query the chain.
- Fields or stages influenced: retracts REF-011; rescores Checkpoint 1
- Relevance: high
- Verification: verified
- Verified on: 2026-08-16
- Adaptation notes: liquidity-to-market-cap ratios run 2.7%–13% across the eleven tokens, which is the exit-risk question stated numerically and is measurable today.

### REF-014 — Independent validation of EXITPROOF

- Project or source name: fresh-session agent given `exitproof-validation-prompt.md`, no recommendation or scores supplied
- Link or artifact path: `outputs/02-ideation/independent-validation-result.md`
- Type: research
- Hackathon and year: n/a
- Relevant part: verdict MODIFY. Four falsifiable claims, all reproduced against the local CSV — Liquidity Load Layer (L^3, MIT Bitcoin 2026, 3rd Place) is a closer corpus neighbour that my saturation scan missed; YieldCompass appears twice with realised-versus-advertised measurement; the single proof-of-reserve match is Anyware, not Eliver; withdraw/redemption capacity is genuinely 0 rows. Structural finding I had not made: Aave V3 on X Layer lists 9 reserves and none is an xStock, so the named lending-market customer does not exist on this chain. Its MODIFY proposal was tested live and produced the thesis on the first asset — NVDAx headline liquidity $478,411 versus ~$55,858 sellable under 1% slippage and no route above ~500 shares.
- Applicable lesson: a keyword saturation scan measures the analyst's vocabulary, not the corpus. L³ was invisible to regexes shaped around "RWA" and "proof of reserve" because it is about Cashu mints.
- Fields or stages influenced: DEC-003, Checkpoint 1, Stage 3 scope
- Relevance: high
- Verification: verified
- Verified on: 2026-08-16
- Adaptation notes: its Hackathon B analysis is uninformed rather than negative — orionagents.org is client-rendered and returned 62 characters to its tooling, so it verified nothing about Orion. Its meta-criticism of my evidence asymmetry is accepted and recorded as LEARN-008.

### REF-015 — Chaos Labs assessment of USDai/sUSDai for Aave V3 Arbitrum

- Link or artifact path: https://governance.aave.com/t/arfc-onboard-usdai-susdai-to-aave-v3-arbitrum-instance/23260/7
- Type: research
- Relevant part: verbatim — *"Current sell side liquidity conditions, measured as the maximum size that can be swapped within 5% price impact, are as follows: USDai: ~$5M to USDC (down from $30M); sUSDai: ~$4.5M to USDC (down from $35M)"* and *"In scenarios of large scale or rapid withdrawals, the protocol may still face constraints in meeting redemption demand."* Drives concrete parameters: 55M supply cap, 45M borrow cap, 20% reserve factor, no collateral or borrowing enabled initially.
- Applicable lesson: **this is the demand evidence two prior analyses concluded did not exist.** A professional risk firm computes max-size-within-price-impact by hand, and that number changes whether real money is lent against an asset. The gap is automation and coverage, not need.
- Relevance: high
- Verification: verified
- Verified on: 2026-08-16
- Adaptation notes: neither Claude nor the first validator looked in governance forums. Demand evidence for infrastructure lives where parameters are argued, not where products are marketed.

### REF-016 — Pharos

- Link or artifact path: https://pharos.watch/ and https://pharos.watch/methodology/
- Type: competitor
- Relevant part: publishes Safety Scores over *"backing, exit routes, and economic control"*; a Redemption Backstop score 0–100 against *"modeled capacity requests of 5% of supply"*; a Liquidity Score for *"how safely a stablecoin can exit through decentralized markets"*; DEWS depeg early warning; a systemic stress index. Live dashboard titled *"Stablecoin Analytics Dashboard: Track 404 Coins"* — Core 258, Variants 50, Pegs 30, Chains 113.
- Applicable lesson: the proposed architecture already exists and runs. A text scan of the live page returns zero occurrences of "X Layer", "xStock", "equity", "stock", "RWA", "tokenized" or "OKB" — it is stablecoin-only. Surviving differentiation: quoted through the deployed router at real position sizes rather than modelled at 5% of supply; tokenised equities rather than stablecoins; on-chain object rather than dashboard and API.
- Relevance: high
- Verification: verified
- Verified on: 2026-08-16
- Adaptation notes: treat as validation of the method, not only as competition. Its existence removes "nobody wants this".

### REF-017 — xStocks official documentation

- Link or artifact path: https://docs.xstocks.fi/docs/frequently-asked-questions
- Type: documentation
- Relevant part: verbatim — *"Can retail users redeem directly with the issuer? Yes. Retail users are legally permitted to redeem directly with the issuer, subject to KYC requirements and the $5,000 minimum transaction size. In practice, most users access liquidity through secondary markets."* · *"If interacting directly with the issuer for issuance or redemption, the minimum transaction size is $5,000."* · *"Each xStock is collateralized on a 1:1 basis... Proof of reserves is publicly available."*
- Applicable lesson: closes open unknown #2 — the redemption dimension is defined, not absent. Executed probes cost $5,000 each plus KYC, so they stay out of hackathon scope. Backing is already publicly proven by the issuer, so measuring it adds nothing; exit *at size* is the only unanswered question.
- Relevance: high
- Verification: verified
- Verified on: 2026-08-16
- Adaptation notes: the issuer's own sentence *"most users access liquidity through secondary markets"* is the product thesis stated by the counterparty.

### REF-018 — Uniswap v4 deployment registry

- Link or artifact path: https://developers.uniswap.org/contracts/v4/deployments
- Type: documentation
- Relevant part: PoolManager `0x360e68faccca8ca495c1b759fd9eee466db9fb32` is listed for X Layer, chain ID **196** (mainnet), reused across several chains at the same address. No entry exists for X Layer Testnet (chain 1952) anywhere in the deployment table.
- Applicable lesson: the spec previously assumed v4 was deployable on testnet 1952 by referencing the same canonical address. On-chain `codesize` check at that address on 1952 returns 0, consistent with this registry — v4 must be self-deployed on testnet.
- Relevance: high
- Verification: verified
- Verified on: 2026-08-17
- Adaptation notes: re-check this table if the hook needs to move to a different chain before submission.

### REF-019 — SEC EDGAR submissions API (direct calls)

- Link or artifact path: `https://data.sec.gov/submissions/CIK{10-digit}.json` (per-company filing index, second-precision `acceptanceDateTime`)
- Type: primary source / live API
- Relevant part: used to recount the 8-K closed-hours share (166/171 = 97.1% with a fixed UTC-4 offset and no holiday calendar, against an earlier 168/171 = 98.2%), to fetch real 8-K primary documents (42–219 KB raw HTML, 2,500–3,700 tokens after tag stripping), and to build the n=46 backtest sample (12 8-K + 34 Form 4 across all 10 underlyings).
- Applicable lesson: the 98.2% figure does not reproduce exactly under a slightly different classifier; publish the classifier itself, not just the percentage, or state "~97%".
- Relevance: high
- Verification: verified
- Verified on: 2026-08-17
- Adaptation notes: rate-limit-friendly with a descriptive `User-Agent` header; no auth needed.

### REF-020 — X Layer RPC direct verification (`cast` + raw `eth_getLogs`)

- Link or artifact path: `https://rpc.xlayer.tech` (mainnet 196), `https://testrpc.xlayer.tech` (testnet 1952)
- Type: primary source / live RPC
- Relevant part: confirmed wNVDAx/wMSTRx wrapper mechanics (`convertToAssets(1e18)` == underlying `multiplier()` to 18 digits, for both tokens); confirmed v4 PoolManager `codesize` 24,009 on mainnet vs 0 on testnet; confirmed block time exactly 1.000 s over 100,000 blocks; confirmed `eth_getLogs` hard-capped at 100 blocks (`-32602`) with ~10% transient failure rate requiring per-call retry; confirmed USD₮0 and USDG both use 6 decimals, not 18; measured the 5.4-minute median on-chain reaction latency across 7 real filings.
- Applicable lesson: several facts assumed from documentation (v4 on testnet, 18-decimal quote tokens, "zero equity tokens in the PoolManager") were wrong when checked directly on-chain. Direct RPC verification caught all of them.
- Relevance: high
- Verification: verified
- Verified on: 2026-08-17
- Adaptation notes: re-run the block-time calibration if it has been more than a few days — 1.000 s/block is measured, not a protocol guarantee.

### REF-021 — `onchainos` CLI v4.4.2 (token/market data)

- Link or artifact path: local CLI, `onchainos token liquidity|trades|search`, `onchainos market kline|index`
- Type: tool / live API wrapper
- Relevant part: enumerated all 5 wNVDAx pools across 3 protocols (Uniswap, DYOR Swap, Caliber — the latter's 32-byte pool identifiers were initially misread as v4 pool IDs); confirmed price-history depth starts 2026-07-20 (NVDAx, MSTRx) / 2026-07-29 (other 8 names); confirmed the OKX index endpoint returns spot-only with no history.
- Applicable lesson: liquidity listings that show a 32-byte "address" are a different protocol's pool-ID scheme (Caliber here), not automatically Uniswap v4.
- Relevance: high
- Verification: verified
- Verified on: 2026-08-17
- Adaptation notes: none.

### REF-022 — Chainlink corporate-actions initiative

- Link or artifact path: https://www.prnewswire.com/news-releases/chainlink-and-24-leading-financial-market-participants-advance-industry-initiative-to-solve-58-billion-corporate-actions-problem-302569071.html
- Type: competitor / prior art
- Relevant part: Chainlink + Swift, Euroclear, DTCC, UBS and 24 institutions run LLM-to-on-chain corporate-action parsing today, with multi-model consensus (GPT-4o, Gemini 1.5 Pro, Claude 3.5 Sonnet in phase 1) and human data-attestors in phase 2 driving confirmed-record accuracy to 100%; framed as a "$58 billion corporate actions problem."
- Applicable lesson: "LLM parses a document into structured on-chain state" is not novel and must not be claimed as such. The defensible differences are the target (24/7 retail DEX pools, not institutional asset servicing), the source (SEC EDGAR directly, including 8-K/Form 4, not issuer/custodian feeds), the acting consumer (a fee-changing hook, not a downstream record), and publishing model disagreement instead of resolving it away.
- Relevance: high
- Verification: verified
- Verified on: 2026-08-17
- Adaptation notes: cite this deliberately early in the pitch rather than letting a judge discover it — spec §3, §6.

### REF-023 — Google Gemini structured-output capability (official docs)

- Link or artifact path: `ai.google.dev/gemini-api/docs/interactions/structured-output`; `blog.google` Gemini API structured-outputs announcement
- Type: documentation (first-party)
- Relevant part: Gemini supports schema-guaranteed JSON output via `responseMimeType: "application/json"` + `responseSchema` (JSON Schema, works with Pydantic/Zod out of the box), satisfying the same "bonded fields need schema-guaranteed output" requirement the architecture was built around for Claude's `output_config.format`
- Applicable lesson: the provider swap in DEC-007 is an API-layer substitution, not a design change — both providers can guarantee the parse output matches the bonded-field schema
- Relevance: high
- Verification: verified
- Verified on: 2026-08-17
- Adaptation notes: capability-only reference; see REF-026 for pricing and free-tier limits, sourced separately and less reliably

### REF-026 — Google Gemini pricing + free-tier limits (secondary sources, unverified against Google's own page)

- Link or artifact path: search aggregation, 2026-08-17 — cloudzero.com, geotoolbox.ai, aipricing.guru, felloai.com, metacto.com (third-party pricing-tracker/SEO sites, not `ai.google.dev` itself)
- Type: secondary source
- Relevant part: as of April 2026, free-tier access is reportedly Flash/Flash-Lite models only (Pro models require paid billing), no credit card required, rate limits ~5–15 requests/minute and up to 1,000 requests/day. Paid-tier figures reported: Gemini 3.5 Flash ≈ $1.50/$9.00 per 1M tokens; Gemini 3.1 Pro ≈ $2.00/$12.00 (≤200K context), stepping to $4.00/$18.00 above that
- Applicable lesson: if these figures hold, the free-tier daily cap (1,000 requests) comfortably covers AFTERHOURS's actual polling volume (§4.1: ~60 filings/month across the full set, 3 parses + 1 grade call each ≈ 4 calls/filing, well under 1,000/day even on a busy filing day) — but none of this was checked against Google's own pricing page
- Relevance: high
- Verification: unverified
- Verified on: 2026-08-17
- Adaptation notes: reverify directly against Google's official pricing page before the Event B window and again before any paid-tier commitment — aggregator figures drift and are sometimes wrong; do not treat these numbers as load-bearing for a budget decision without that reverification

### REF-024 — Vercel account access confirmed (Dien, self-attested)

- Link or artifact path: n/a — Dien's direct confirmation in this session
- Type: primary source (owner self-attestation)
- Relevant part: Dien confirmed he can log into his Vercel account
- Applicable lesson: this is the extent of verification possible without Dien sharing account access; actual deploy readiness (SVC-005 readiness criteria) is confirmed only once task-tracker.md P0.12 (create the Vercel project, deploy a placeholder) actually runs
- Relevance: medium
- Verification: verified
- Verified on: 2026-08-17
- Adaptation notes: self-attested by the account owner — the strongest form of verification available for a credential-gated service Claude cannot access directly

### REF-025 — VPS SSH access confirmed (Dien, self-attested)

- Link or artifact path: n/a — Dien's direct confirmation in this session
- Type: primary source (owner self-attestation)
- Relevant part: Dien confirmed he can SSH into his own VPS
- Applicable lesson: same caveat as REF-024 — full readiness (SVC-006 readiness criteria: process manager configured, secrets set, SSH hardened) closes only once task-tracker.md P0.11 actually runs
- Relevance: medium
- Verification: verified
- Verified on: 2026-08-17
- Adaptation notes: self-attested by the machine owner

### REF-027 — Event A mainnet-deployment timing (official FAQ, direct re-verification)

- Link or artifact path: https://web3.okx.com/xlayer/build-x-series — Requirements section + FAQ ("Does the project need to be deployed on Mainnet during the Hackathon?")
- Type: documentation (primary source, same page as REF-001, re-fetched specifically for this question)
- Relevant part: FAQ answer, quoted verbatim: "The project must be deployed on the X Layer Testnet during the Hackathon and subsequently launched on the X Layer Mainnet." Fetched twice independently (once for a broad summary, once demanding verbatim quotes only) with consistent wording both times.
- Applicable lesson: "subsequently" places mainnet launch after the hackathon window — testnet deployment by the 2026-08-21 23:59 UTC submission deadline satisfies the eligibility requirement; mainnet is not gating submission or judging. This corrects an earlier reading (HACKATHON.md's original "must subsequently deploy on X Layer Mainnet" line, written before this specific FAQ pairing was checked) that had been treated as an undated blanket "must," creating pressure to fund and deploy to mainnet before the Event A deadline when the source does not actually require that.
- Relevance: high — reorders task-tracker.md's Event A critical path (P0.2, P0.4, P1.9, P4.3 move off the pre-deadline critical path)
- Verification: verified
- Verified on: 2026-08-17
- Adaptation notes: read via WebFetch (a summarizing intermediate step), not raw HTML inspected directly by the orchestrator — two independent fetches agreed, but per LEARN-006 (never conclude coverage from a summarised fetch without checking), a direct human read of the live FAQ is still the fully independent confirmation if this fact is ever load-bearing for a dispute.

### REF-028 — Tinjau LP Risk Autopilot final design

- Link or artifact path: `../superpowers/specs/2026-08-20-tinjau-lp-risk-autopilot-design.md`
- Type: product design
- Relevant part: final positioning, five required differentiators, `NORMAL/WATCH/PROTECT`, dual confirmation, bounded policy, Risk Registry, Proof of Protection, three-scene demo, measurement rules, scope boundary, and claim rules
- Applicable lesson: the product is not judged as a complete risk agent unless evidence, market confirmation, bounded action, recovery, and measured outcome are shown as one vertical workflow
- Relevance: high
- Verification: verified
- Verified on: 2026-08-20
- Adaptation notes: approved by Dien and committed in `b20db69`. This is the prospective product source of truth. Earlier AFTERHOURS specifications remain historical evidence and do not override it

### REF-029 — Tinjau competitive-landscape deep research

- Link or artifact path: `outputs/03-product/tinjau-competitive-landscape-deep-research.html`
- Type: research / competitor analysis
- Relevant part: comparison against corporate-action extraction, event/news intelligence, RWA monitoring, and AI-controlled Uniswap v4 projects; identifies which individual components are occupied and narrows Tinjau's differentiation to their combined tokenized-equity workflow
- Applicable lesson: do not claim first AI hook, first corporate-action oracle, or first on-chain risk registry. Prove causal evidence, rumor containment, dual confirmation, tokenized-equity awareness, and measured protection together
- Relevance: high
- Verification: verified
- Verified on: 2026-08-20
- Adaptation notes: verified with limitations stated in the artifact; no claim of exhaustive market coverage. Use its competitor matrix consistently in demo, README, documentation, and pitch; preserve the distinction between public evidence and inference

## Source Conflicts

- Topic: X Layer Testnet chain ID
- Conflicting reference IDs: REF-005 (1952), REF-006 (195)
- Preferred source and reason: REF-005 — first-party documentation, and REF-006's own listing is flagged deprecated
- Resolution: use chain ID 1952 with RPC `https://testrpc.xlayer.tech/terigon`
- Decision ID: DEC-002
