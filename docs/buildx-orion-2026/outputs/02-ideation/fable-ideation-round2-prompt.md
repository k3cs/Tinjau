# Ideation Brief — one project, two hackathons, round 2

You have no prior context. Everything you need is below, including a graveyard of ideas already rejected and the reason each failed. Do not restate this brief.

A previous candidate was scored against the official rubrics by two independent agents and returned mid-pack. It has been abandoned. Your job is to produce candidates that score well on **every** criterion, not just the interesting ones.

Today is **2026-08-16**.

---

## 1. The two events

### Event A — X Layer "Build X Series, AI Season" *(governs everything)*

Deadline **2026-08-21 23:59 UTC — about 5.7 days away.**

**Five mandatory requirements. Failing any one makes the project ineligible:**

1. "The project must incorporate AI elements into its product design and be deployed on X Layer."
2. "During the Hackathon, the project must be deployed on the X Layer Testnet and subsequently launched on the X Layer Mainnet."
3. "The project must have a dedicated X account and keep it active throughout the project's lifetime."
4. "When submitting the project, the project's official X account must publish a related post and mention @XLayerOfficial."
5. Submission via a Google Form by the deadline.

**Judging criteria — Terms & Conditions clause 4, verbatim. These seven and no others:**

> "application of AI, innovation, product completeness, user value, integration with X Layer, growth potential, and contribution to the X Layer ecosystem"

No weights published. "Code quality", "onchain data" and "market potential" are **not** criteria — they are commonly assumed and absent from the official text.

**Prizes:** 30,000 / 15,000 / 5,000 USDT. Plus a Liquidity Grant of 50,000 USDT to "the best-performing project in the AI-RWA track", judged separately on "product quality, innovation, user value, and contribution to the ecosystem", and restricted: "The grant must be used to support the winning project's growth and further develop the X Layer ecosystem." The submission form has **no track selector**, so AI-RWA membership is assigned by judges.

**Terms:** participants retain IP; no exclusivity clause; reusing your own prior code is permitted; plagiarism and unauthorised use of others' code disqualify.

### Event B — Orion Builder Hackathon *(secondary)*

Deadline **2026-09-02 23:59 UTC — about 17 days.**

Any working AI agent qualifies: "If it is an AI agent and it works, it qualifies. You are not limited to DeFi."

**Judging, verbatim:** "Partner judges score every entry from 0 to 10 on **usefulness, execution, and originality**, informed by the AI vetting score and community upvotes." Also: "A demo link is optional but strongly recommended. **Judges try what they can run.**"

Each entry needs a website, X profile, GitHub, and a Discord or Telegram link. Registration is a free wallet signature on Base; submission costs about $10 in ETH. Prizes: $5,000 across seven winners.

**Field as of 2026-08-16:** two public entries against seven prizes. Both are read-only analyst agents on Base, automated vetting scores 86 and 72, both built as "a deterministic engine produces every number, the model decides where to look and writes the prose, every figure traces to a real tool call". The field will grow.

Only the *wallet* is bound to Base. The agent's own chain is unconstrained.

### The builder

One person. Prior result: **a Uniswap v4 hook prize at the Uniswap Hook Incubator (UHI8)** — Solidity, v4 hooks, ERC-6909 flash accounting. Existing empty TypeScript monorepo with `apps/web`, `apps/server`, `apps/mcp-server`, `contracts/`. No project X account, website, Discord or Telegram yet. Wallet currently unfunded.

---

## 2. What is actually deployed on X Layer — verified on-chain, 2026-08-16

This is your build surface. Everything here was confirmed by direct RPC calls or first-party address books.

- **Chain:** mainnet 196 (`https://rpc.xlayer.tech`), testnet 1952 (`https://testrpc.xlayer.tech/terigon`). Gas token OKB. EVM-equivalent OP Stack, 1-second blocks, Flashblocks. Chain TVL ~$115.8M across 32 protocols: 20 DEXs, 4 lending markets, 3 bridges, 1 launchpad, 1 CeDeFi.
- **Uniswap v3 and v4 both live.** v4 PoolManager `0x360e68faccca8ca495c1b759fd9eee466db9fb32` (24,009 bytes), v4 PositionManager `0xcF1EAFC6928dC385A342E7C6491d371d2871458b`, v4 Quoter, v4 StateView, plus the full v3 set. **The builder's proven speciality is a live primitive on the target chain.**
- **Aave V3** Pool `0xE3F3Caefdd7180F884c01E57f65Df979Af84f116`, 9 reserves: USD₮0 ($38.0M available), USDG, WOKB, xBETH, xETH, xSOL, xOKSOL, xBTC, GHO.
- **11 tokenised equities** live with real DEX liquidity: NVDAx, AAPLx, GOOGLx, TSLAx, SPYx, METAx, SNDKx, MSTRx, CRCLx, COINx, AMZNx. Roughly $3.8M total DEX liquidity, ~$68M market cap, 3,800+ holders. Backed 1:1 by custodied shares; retail redemption exists but requires KYC and a $5,000 minimum; proof of reserves is already published by the issuer.
- **OKX Onchain OS**, driven by an installed `onchainos` CLI (v4.4.2), all live on chain 196: ERC-8004 agent identity with User/ASP/Evaluator roles; a task marketplace with stake, escrow, delivery, dispute and arbitration; x402 payments in four modes; MPP payment channels; a2a-pay; DEX aggregator with quote and swap; market data, signals, social sentiment, memecoin scanning, leaderboards; DeFi product discovery; limit-order strategies; security scanning (tx-scan, token-scan, dapp-scan, sig-scan); portfolio and wallet APIs; an MCP server mode.
- **The ERC-8004 marketplace is densely populated.** Live agents on chain 196 include Internet Court MCP, Merita, EVIDIQ (Aegis/Vault/Warden/Assay), Q402, Aletheia, VETO, Sigil, AttestVerify, VRYFY, A-Identity Trust Oracle, RealityCheck, PulseCheck, BetAudit, Phylax, Vera by Monvera, HuaQuant, OnchainLens, Cachet, TAG IT Verify, GovCoPilot, MintMoment, Acurast TEE. Services are priced in USD₮0. Many show zero sales.

---

## 3. The corpus — learn from it, do not copy from it

Spreadsheet: `https://docs.google.com/spreadsheets/d/1jPAQFjKaBbjoBe5cj_z-1dR8WD9-apNOT68CtFYeVfQ`, tab **"Web3 Hackathon Winners"**.

**Pull it as raw CSV. A summarising fetch silently returns ~22 of the 242 rows with no truncation warning:**

```bash
curl -sL "https://docs.google.com/spreadsheets/d/1jPAQFjKaBbjoBe5cj_z-1dR8WD9-apNOT68CtFYeVfQ/gviz/tq?tqx=out:csv&sheet=Web3%20Hackathon%20Winners" -o winners.csv
python3 -c "import csv;r=list(csv.DictReader(open('winners.csv')));print(len(r),'rows',len(r[0]),'cols')"
```

Expect **242 rows, 51 columns, 57 distinct hackathons**. Analytical columns include `Key Innovation`, `Core Problem`, `Unique Insight`, `Differentiation`, `Reusable Patterns`, `Moat`, `Key Risks`, `New Idea Opportunities`. Cells in `Business Model`, `Moat`, `Distribution Strategy` and `New Idea Opportunities` are prefixed "Inference:" by the sheet's author — hypotheses, not findings.

**Read it yourself.** Do not rely on the summary below; it exists so you don't waste effort re-deriving what is already known.

### Saturation, rows out of 242

privacy/ZK 38 · cross-chain 33 · **x402 32** · gaming 31 · compliance/KYC 23 · social/creator 21 · insurance 19 · backtest 19 · tax 18 · MEV 18 · RWA 18 · intent 17 · attestation 17 · agent liability 11 · staking/slashing 11 · **ERC-8004 8** · kill-switch 7 · personhood 7 · human-in-the-loop 5 · DEX routing 3 · no-code agents 2 · proof-of-reserve 1.

68 rows mention agents, 47 autonomy, 23 escrow, 20 reputation, 14 MCP. **Three of the 57 hackathons were dedicated entirely to x402.**

### Dead novelty claims

"We metered it with x402" · "we registered an ERC-8004 identity" (one winner filtered 34,556 registrations down to 711 real services and won on that finding) · "we exposed it over MCP". Use all three freely; never lead with them.

### Patterns that recur among winners

- Make the verdict a verifiable on-chain object another contract consumes, not an API response.
- Source evidence from where the subject cannot fabricate it.
- Deterministic engine computes every number; the model routes and writes.
- Bond the claim, open a challenge window, pay the challenger.
- Enforce limits in the contract, not the application.
- The filter is the product, not the index.
- One surface both humans and agents call.

---

## 4. The graveyard — do not re-propose any of these

Each was generated, researched, and rejected in a prior round. The reason matters more than the name.

| Idea | Why it died |
|---|---|
| **EXITPROOF** — measure and publish executable exit depth for tokenised assets | Scored 22/35 and 19/35 on Event A by two independent agents. **Application of AI: 2** — the numbers are deterministic, so the model is a bolt-on summariser, which is fatal in an "AI Season". **Growth potential: 2** — no protocol on X Layer lists xStocks, so the on-chain consumer does not exist. **Product completeness: 2**. Also: Pharos already runs the architecture for stablecoins, CryptoRank already published the equivalent research for tokenised equities, and DefiLlama built the free version then switched it off |
| **Stake-to-Act** — agents post a bond against a falsifiable pre-commitment before acting | Seven corpus winners already occupy it: ClawMon, Mnemosyne, Phare, The Dojo, Moltbet, World of Geneva (1st), Immunity |
| **BLACKLETTER** — compile the negotiation thread into co-signed executable escrow terms | Two live incumbents on X Layer doing exactly this: Merita (#5516) and Internet Court MCP (#2162) |
| **THESEUS** — bonded version commitment on an agent identity, canary-probed for behavioural drift | Demand depends on an agent economy that is 98% empty shells |
| **DOCKET** — arbitration verdicts compounding into citable precedent | Cold start: worthless until dispute volume exists. Substantial prior art outside the corpus (Kleros, Aragon Court) |
| **PROBATE** — receivership for dead or rogue agents | The corpus data falsifies the premise: registries are already mostly dead and nobody is stranded |
| **DEFER** — agents hire staked human reviewers for irreversible calls | Many judgement calls have no gradeable outcome, so the slashing loop never closes |
| **TELLTALE** — bonded forgery court for AI-fabricated evidence | Moves money on a detector that is losing an arms race; the challenge path is circular |
| **Portable agent memory** | Direct sequel to a project the same organiser already awarded |
| **Creator authenticity verification** | Real demand, no genuine on-chain necessity |
| **Unbundled security review as x402 calls** | x402 metering is table stakes, not novelty |

---

## 5. What the scoring taught us

The previous candidate was validated for novelty, demand, competition and feasibility across many rounds — and still scored mid-pack, because nobody had mapped it onto the rubric line by line until the end. Two criteria sank it, and both were predictable from the start.

**Treat these as design constraints, not afterthoughts:**

- **Application of AI.** If the model only summarises, routes, or narrates around a deterministic core, this scores 2. The event is called *AI Season*. The AI must be doing work that cannot be done another way, and a judge must see that in one sentence.
- **Growth potential.** If the value depends on a consumer, integration, or market that does not exist yet on X Layer, this scores 2. Prefer something whose first user exists today.
- **Product completeness.** Judged as shipped, by one person, in ~5.7 days. This is a criterion, not a constraint I am imposing — an ambitious half-built thing scores worse than a smaller finished thing. Scope accordingly, and say what you are cutting.
- **Contribution to the X Layer ecosystem.** A judge from the organiser reads this. An idea whose headline is that the organiser's own published numbers are wrong carries avoidable political risk.
- **Orion's field.** Both current entries are read-only analyst agents. Something that *acts*, or that a judge can run and immediately see do something, differentiates within that field.

---

## 6. Your task

Read the corpus yourself first. Then produce **7 candidate ideas** that are not in §4 and not re-skins of anything in the corpus.

For each, give exactly this, hard cap 160 words:

```
NAME — one-line hook a judge understands without context
User + problem:
What the AI actually does (and why it cannot be done deterministically):
What is on-chain, and why it must be:
X Layer surface used (from §2):
5-minute demo a judge can run:
Nearest corpus neighbour + how this differs:
Self-score, Event A 1–5: AI / innovation / completeness / user value / X Layer integration / growth / ecosystem
Self-score, Orion 1–5: usefulness / execution / originality
Weakest point:
```

Rules for the set:

- **At least 2 must score 4+ on every one of Event A's seven criteria.** If you cannot get there, say so rather than inflating.
- **At least 1 must plausibly sit in the AI-RWA track** (tokenised equities are live on X Layer per §2), since that is a separately judged 50,000 USDT path.
- **At least 1 must exploit Uniswap v4 hooks**, given the live PoolManager and the builder's proven prize in exactly that.
- Vary the shape: do not submit seven risk-scoring tools or seven marketplaces.
- Ignore team size and personal difficulty. Do **not** ignore the ~5.7-day window, because product completeness is a scored criterion.

Finish with:

1. Your single strongest pick and the one sentence that justifies it.
2. The criterion your strongest pick is weakest on, and what you would cut to fix it.
3. Any idea you generated and discarded because the corpus showed it was already won — name it and the winner.

No preamble, no summary, no restating this brief.
