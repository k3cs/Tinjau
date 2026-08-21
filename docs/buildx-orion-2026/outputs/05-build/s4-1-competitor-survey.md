# S4.1 — Independent competitor survey of the six-element combination

**Survey date:** 2026-08-21 (executed 2026-08-21/22 local; all retrievals dated 2026-08-21 UTC-equivalent
session). **Tools:** `WebSearch` and `WebFetch` only. **Author:** automated survey agent, no human contact
made. **Prior review being re-tested:**
[`docs/buildx-orion-2026/outputs/03-product/tinjau-competitive-landscape-deep-research.html`](../03-product/tinjau-competitive-landscape-deep-research.html)
(frozen 2026-08-20).

---

## 1. What this survey does and does not establish

Read this section before any other. It bounds every conclusion below.

**What it establishes.** On 2026-08-21, using 40 distinct queries (27 web searches plus 13 direct ETHGlobal showcase queries) and 22 page fetches across the venues
listed in §2, no public product, protocol, paper, or hackathon submission was found that implements all six
elements defined in §3 together. The queries, venues, and per-candidate verdicts are recorded so a stranger
can re-run the same search and check the same pages.

**What it does not establish.**

- **"Not found" means "not found in the public material reviewed on 2026-08-21."** It is not a claim about
  what exists.
- **Private, internal, unlaunched, or unindexed systems cannot be ruled out.** Enterprise risk platforms
  (Hypernative, Chaos Labs, Gauntlet) ship configurable automation whose customer-specific configurations are
  not public. A configuration matching all six elements could already exist and be invisible to this method.
- **Absence of evidence is not evidence of absence.** A survey that finds nothing has found nothing; it has
  not proven a negative.
- **Search coverage is partial.** `WebSearch` here is US-region and returns ranked results, not exhaustive
  indexes. DoraHacks and Devfolio pages are dynamic and partly WAF-protected (the same limitation the
  2026-08-20 review recorded). Hackathon submissions from the past ~2 weeks are frequently not yet indexed.
- **Most page reads were summarised, not read raw.** `WebFetch` converts a page and answers a prompt using a
  small model. Where a verdict below depends on an exact mechanism, the URL is given so a reader can check the
  primary text directly. Where the summariser's wording appeared looser than the underlying source, that is
  flagged inline and corrected (see Ondo, element 3).
- **Four candidates named in the 2026-08-20 review could not be fully re-verified today.** See §5.3.

**What this survey explicitly does not license.** It does **not** support any "first", "only", "unique", or
"no one else does this" phrasing, now or later, regardless of how empty the result set is. Tinjau's standing
prohibition on all "first X" claims is unaffected by this document. A finding of "not found" upgrades to
nothing. If a reader takes this survey as permission to write "the first corporate-event-aware fee hook", the
survey has been misused.

---

## 2. Method

### 2.1 Tools

`WebSearch` (US-region web search, ranked results) and `WebFetch` (page → markdown → small-model extraction
against a prompt). No other data source. No repository crawl, no contact with any person or organisation, no
private material.

### 2.2 Venues searched

| Venue | How it was reached | Result |
|---|---|---|
| ETHGlobal Showcase | `https://ethglobal.com/showcase?q=<term>` and project pages | 13 queries; hits and misses both recorded |
| GitHub topic pages | `github.com/topics/uniswap-v4-hook`, `uniswap-v4` | Repo list read directly |
| Curated hook lists | `fewwwww/awesome-uniswap-hooks` | Read directly |
| Hook directories | HookRank (`hookrank.io`), Uniswap hook-discovery docs | Surfaced via search; no news/event category found |
| Uniswap official | `blog.uniswap.org`, `docs.uniswap.org`, `developers.uniswap.org` | Read for tokenized-securities pools and dynamic fees |
| Tokenized-equity issuers | Ondo (`docs.ondo.finance`), xStocks (`docs.xstocks.fi`), Dinari, Kraken xStocks legal | Read / surfaced |
| Risk-infra vendors | Hypernative, Chaos Labs (`chaoslabs.xyz`), Gauntlet | Searched; Chaos Labs Edge AI post read |
| Oracle / corporate-actions | Chainlink corporate-actions initiative, DTCC/Swift coverage | Searched |
| News analytics | RavenPack / Bigdata.com | Searched |
| AMM / LVR literature | arXiv, OpenGradient research blog, Arrakis docs | Searched; OpenGradient read |
| Hackathon aggregators | DoraHacks BUIDL | Searched (dynamic pages; partial coverage) |
| OKX / X Layer | OKX Web3 developer challenge, Exchange OS coverage, xStocks-on-X-Layer news | Searched |

### 2.3 Queries run, verbatim (2026-08-21)

`WebSearch`, in execution order:

1. `RiskClaw Uniswap v4 hook AI risk fee`
2. `NeuralHook Uniswap v4 dynamic fee TEE agent`
3. `ethglobal showcase "RiskClaw"`
4. `"Sentinel Agent" hackathon Uniswap v4 hook CEX DEX divergence fee`
5. `Uniswap v4 hook tokenized stock corporate action earnings dynamic fee liquidity provider protection`
6. `on-chain "risk registry" corporate events news oracle AMM fee tokenized equities 2026`
7. `xStocks Backed tokenized equity liquidity pool halt earnings risk protection hook`
8. `hookrank Uniswap v4 hook directory news event driven fee hook list`
9. `github "uniswap-v4-hook" news sentiment LLM oracle fee repository`
10. `"corporate action" OR "earnings announcement" driven AMM fee smart contract hook liquidity provider adverse selection research 2026`
11. `Chainlink corporate actions DTCC golden record 2026 automated protocol parameter control downstream`
12. `Hypernative automated response 2026 tokenized stocks corporate event LP fee Uniswap hook`
13. `Chaos Labs Edge risk oracle 2026 news events tokenized equities dynamic fee AMM`
14. `Argus Mantle RWA agent EIP-712 policy risk de-risk positions ERC-8004`
15. `Ondo Global Markets Dinari corporate actions handling trading halt tokenized stock on-chain automated`
16. `"rumor" unverified news on-chain oracle gated action DeFi protocol confirmation before acting 2026`
17. `"UniBrain" hook Reactive Network Uniswap v4 fee agent GitHub`
18. `ethglobal "RiskClaw" 0G agent swarm Uniswap v4 pool risk`
19. `"NeuralHook" ethglobal Uniswap v4 TEE inference dynamic fee`
20. `Arrakis HOT AMM dynamic fee LVR solver oracle 2026 tokenized equity`
21. `X Layer OKX DEX tokenized stock liquidity risk hook project 2026`
22. `dorahacks buidl "corporate action" OR "earnings" liquidity pool fee AI agent hook`
23. `arxiv news-aware AMM fee earnings announcement liquidity provider informed trading tokenized equity 2026`
24. `"information shock" OR "news event" driven dynamic fee hook deployed pool with expiry cooldown benchmark baseline comparison`
25. `RavenPack Bigdata.com on-chain smart contract integration DeFi liquidity fee 2026`
26. `"AnchorHookV4" OR "Anchor Hook" Uniswap v4 TWAP oracle deviation fee trade size limit`
27. `Uniswap v4 hook backtest "baseline" static fee versus volatility fee versus event fee LP outcome published results`

`WebFetch` targets, in execution order:

1. `https://ethglobal.com/showcase/sentinel-tv8am`
2. `https://www.opengradient.ai/blog/dynamic-amm-fee-research`
3. `https://github.com/topics/uniswap-v4-hook`
4. `https://blog.uniswap.org/tokenized-securities-are-live`
5. `https://chaoslabs.xyz/posts/edge-ai-alpha-release`
6. `https://docs.ondo.finance/ondo-global-markets/corporate-actions`
7. `https://ethglobal.com/showcase?q=RiskClaw`
8. `https://ethglobal.com/showcase?q=corporate+actions`
9. `https://ethglobal.com/showcase?q=tokenized+stocks+hook`
10. `https://ethglobal.com/showcase?q=xStocks`
11. `https://ethglobal.com/showcase?q=rumor`
12. `https://ethglobal.com/showcase?q=earnings`
13. `https://ethglobal.com/showcase?q=dynamic+fee+hook+news`
14. `https://ethglobal.com/showcase?q=SEC+filing`
15. `https://ethglobal.com/showcase?q=RWA+hook+fee`
16. `https://ethglobal.com/showcase/sage-protocol-tv19y`
17. `https://ethglobal.com/showcase/riskclaw-ip3a9`
18. `https://github.com/fewwwww/awesome-uniswap-hooks`
19. `https://ethglobal.com/showcase?q=NeuralHook`
20. `https://ethglobal.com/showcase?q=AnchorHook`
21. `https://ethglobal.com/showcase?q=Argus`
22. `https://ethglobal.com/showcase?q=UniBrain`

Totals: **27 `WebSearch` queries** plus **13 ETHGlobal showcase queries** issued as fetches (fetch targets
7–15 and 19–22) = **40 distinct query strings**, over **22 page fetches**.

---

## 3. The six-element definition being tested

A system counts as a match only if **all six** are present in the same public system, verifiable from public
material.

| # | Element | Present means |
|---|---|---|
| **E1** | Source-grounded tokenized-equity evidence | The decision input is a real filing, issuer disclosure, or news item about a *tokenized equity*, carried with per-claim provenance (source identity, document hash or link) that a third party can check. Pool telemetry, price, or volatility does not count. |
| **E2** | Rumor containment | Unverified or single-source claims are structurally capped **below** the aggressive action. There must be a distinct, lower-severity state for unconfirmed claims, not just a confidence number feeding the same knob. |
| **E3** | Independent market confirmation before acting | Before the aggressive action fires, an *independent market* signal (exchange index, DEX quote, depth) must corroborate. Waiting for the same issuer to publish a final number is data completeness, not independent confirmation. |
| **E4** | Bounded, temporary LP/pool action | The response is a pool-level control (a fee or equivalent) with an explicit **ceiling** and an explicit **temporary** character. An unbounded or permanent action fails. |
| **E5** | Deterministic recovery | Protection ends by rule — expiry, decay, cooldown — not by an operator's discretion or a model's later opinion. |
| **E6** | Measured, published outcome comparison vs baseline policies | A published, reproducible comparison of the policy against at least one baseline policy, on LP-relevant metrics. A single "we collected N% more fees" line without baseline definitions and reproducible artifacts is weaker than this and is scored *partial*. |

A note on E4/E5 fairness: a venue-level trading pause is not a *pool* fee, but it is a bounded temporary
action against the same risk. Where a candidate does that, it is scored **partial** on E4 rather than absent,
and the difference is stated in the notes. Scoring it "absent" would be the flattering choice, not the honest
one.

---

## 4. Candidate comparison

Legend: **Y** present · **P** partial · **N** absent · **?** unclear from public material reviewed.

### 4.1 Candidates required by the task brief

| Candidate | E1 | E2 | E3 | E4 | E5 | E6 |
|---|---|---|---|---|---|---|
| RiskClaw | N | N | N | Y | ? | N |
| NeuralHook | N | N | N | Y | ? | N |
| Sentinel (ETHGlobal, `sentinel-tv8am`) | N | N | P | Y | ? | N |
| UniBrain | N | N | N | Y | ? | N |
| AnchorHookV4 | N | N | Y | Y | ? | N |
| Hypernative | ? | ? | ? | P | ? | N |
| Chaos Labs (Edge / Risk Oracles) | N | N | Y | P | P | N |
| Chainlink corporate actions / DTCC | Y | N | N | N | N | N |
| RavenPack / Bigdata.com | P | P | P | N | N | N |
| Arrakis (HOT, Pro Hook) | N | N | Y | Y | P | P |
| Argus (Mantle RWA, per 2026-08-20 review) | P | ? | Y | N | ? | N |

### 4.2 Candidates found beyond the required list

| Candidate | E1 | E2 | E3 | E4 | E5 | E6 |
|---|---|---|---|---|---|---|
| **Ondo Global Markets / Ondo Stocks** | P | N | ? | P | Y | N |
| SAGE Protocol (ETHGlobal) | P | N | N | P | N | N |
| OpenGradient dynamic AMM fee research | N | N | N | Y | N | P |
| Autopilot Hook (`RegisGraptin`) | N | N | N | Y | ? | ? |
| CodesenSys dynamic-fee hook (EWMA volatility) | N | N | N | Y | N | N |
| CodesenSys `compliant-rwa-hook` | N | N | N | N | N | N |
| RangeGuard / IL-coverage hooks | N | N | N | P | ? | N |
| Custos (Mantle AI risk-guardian vault) | ? | ? | ? | N | ? | N |
| Dinari dShares | P | N | N | N | N | N |
| xStocks / Backed | N | N | N | N | N | N |

### 4.3 Per-candidate notes

**RiskClaw** — `https://ethglobal.com/showcase/riskclaw-ip3a9`. "A 0G agent swarm decides, in real time, how a
Uniswap v4 pool should behave under risk." Inputs are **pool metrics only**: an Observer snapshots pool
metrics to 0G Storage KV, an Analyst sends them to a language model. Output is structured
(`riskScoreBps`, `recommendedFee`, `recommendedMaxAbsAmount`, `reasoning[]`), and a Guardian rejects updates
whose fee jump exceeds `maxFeeJump` (50000 pips) or score jump exceeds `maxScoreJump` (4000 bps) — that is a
real **bounded** action (E4 = Y). Evidence is a `PolicyProof` over compute/metrics roots, which is
provenance over *its own inference*, not over an external corporate document (E1 = N). No corporate filings,
no rumor tier, no independent market confirmation, no expiry described, no baseline comparison published.
Closest mechanism analogue; different evidence class.

**NeuralHook** — `https://ethglobal.com/showcase?q=NeuralHook`: "AI predicts impermanent loss before it hits.
Fees surge. LPs get paid back. Trustless." Fee surge on predicted IL — telemetry-driven forecasting, no
exogenous document evidence. E1/E2/E3 absent on the public blurb; E6 not published in material reviewed.

**Sentinel** — `https://ethglobal.com/showcase/sentinel-tv8am`. MEV/sandwich defence, not information risk.
Mempool heuristics (gas price, swap size, frequency, timing, known bots) → MEV confidence score; on-chain
challenge above 60% confidence; "Progressive Fees: Escalating costs (20% per swap)" with surge pricing
"capped at 10% maximum" — an explicit ceiling, so E4 = Y. E3 scored **P** because mempool corroboration is a
market-side check, but it is the *same* venue, not an independent market. Deterministic expiry not stated;
no baseline outcome comparison. Note: the 2026-08-20 review described a "Sentinel Agent" doing Binance-vs-DEX
divergence; the showcase project reachable today under that name is the MEV one. Both are recorded; they may
be different submissions (see §5.3).

**UniBrain** — no ETHGlobal showcase entry found for the name (`?q=UniBrain` → no projects found). Search
surfaced a UniBrain hook described as triggering on-chain actions via a Dutch auction on a v4 pool, and
separate Reactive-Network hooks for IL coverage and cross-chain IL hedging. Either way, pool-telemetry
driven; no corporate evidence, no rumor tier, no published baseline comparison.

**AnchorHookV4** — `https://ethglobal.com/showcase?q=AnchorHook`: "Anchor is a deterministic on-chain risk
agent implemented as a Uniswap v4 hook for stablecoin pools." Deterministic rules over TWAP-vs-oracle
deviation with fee and trade-size limits (E3 = Y: an oracle is an independent price reference; E4 = Y).
Stablecoin pools, no corporate events, no rumor handling, no published outcome study. This is the honest
"substitute that needs no AI" comparison, and it remains that.

**Hypernative** — enterprise monitoring and automated response across many chains. Its detection sources and
customer response playbooks are not public at the granularity needed to score E1–E3, hence `?`. E4 scored
**P**: pause/unwind/custom actions are bounded and operator-defined, but no public pool-fee-with-ceiling
mechanism for tokenized equities was found. No public LP-outcome comparison found. **This is the candidate
most likely to be configurable into something close to the six elements privately**, and it is the main
reason §1's "private systems cannot be ruled out" is not boilerplate.

**Chaos Labs** — `https://chaoslabs.xyz/oracles`, `https://chaoslabs.xyz/posts/risk-oracles-real-time-risk-management-for-defi`,
`https://chaoslabs.xyz/posts/edge-ai-alpha-release`. Risk Oracles adjust protocol parameters in real time and
"parameters automatically ease as liquidity improves" — that is rule-based recovery (E5 = P) on a
telemetry trigger. Edge AI Oracle is an LLM multi-agent council with a web-scraper agent that "prioritizes
reputable, verified information" and a document-bias analyst — but the published alpha post resolves
*prediction-market questions* (elections, sports), not corporate actions, and the fetched page gives no
provenance-per-claim, no rumor tier, no AMM fee path, no expiry, and no baseline comparison. Parameter
automation is clearly not novel; the corporate-evidence path is not present in the reviewed material.

**Chainlink corporate actions / DTCC / Swift** — 24-participant initiative; LLMs plus the Chainlink Runtime
Environment turn unstructured issuer data into a "Unified Golden Record" consumable by smart contracts and
post-trade systems; DTCC will use Chainlink for a collateral appchain automating pricing/valuation/settlement.
E1 = Y and by far the strongest of any candidate. E4/E5 = N: no pool-side fee action, no ceiling, no expiry.
No published LP-outcome comparison. The 2026-08-20 review's "high threat: Chainlink expands downstream"
remains the correct read — nothing found today shows that expansion has happened.

**RavenPack / Bigdata.com** — news analytics with entity/event taxonomies, relevance, novelty, sentiment; now
delivering through AI research agents (AWS Bedrock, Snowflake). E1 = P (news with source metadata, but not
tokenized-equity-specific and not published with per-claim on-chain provenance); E2/E3 = P (novelty and
relevance scoring is adjacent to rumor handling but is a score, not a capped state). No on-chain action at
all: E4/E5/E6 = N.

**Arrakis (HOT AMM, Pro Hook)** — `https://arrakis.finance/blog/hot-the-mev-aware-amm-built-to-empower-lps-is-live`,
`https://docs.arrakis.finance/text/modules/hotAmm/whitepaper.html`,
`https://arrakis.finance/blog/the-arrakis-pro-hook-dynamic-fees-for-token-issuers-on-uniswap-v4`. Dynamic fee
rises with time-since-quote and resets on solver update; signed quotes with expiration (E5 = P, expiry is
real but is a quote lifetime, not a protection window). Fee mechanism is bounded (E4 = Y) and oracle/solver
priced (E3 = Y). E6 = P: LVR-reduction analysis is published, but as mechanism analysis, not as a
policy-vs-policy outcome table on a specific pool. No news, no corporate events. Arrakis remains the
strongest reason Tinjau must not claim general LVR superiority.

**Argus (Mantle RWA prototype)** — this specific project could **not be re-located** on 2026-08-21. The
ETHGlobal showcase returns four unrelated "Argus" projects (a 0G TEE rebalance swarm, two "autonomous DeFi
agents with a DSL" entries, and a threat-intelligence dashboard). The row in §4.1 reproduces the
2026-08-20 review's own scoring, marked as **inherited, not re-verified**. The nearest live analogue found
today is **Custos** (`https://github.com/0xMaxyz/Custos`), "an autonomous AI agent that de-risks on-chain by
itself by rotating back to USDC the moment RWA danger appears, with every decision recorded with its evidence
under a verifiable ERC-8004 identity". Custos protects a *position*, not a pool; no fee action, so E4 = N.

**Ondo Global Markets / Ondo Stocks — the closest counterexample found.**
`https://docs.ondo.finance/ondo-global-markets/corporate-actions`, plus
`https://docs.chain.link/data-feeds/tokenized-equity-feeds/ondo`. This is the candidate that came nearest and
deserves the most careful reading:

- **E1 = P.** Real corporate actions on real tokenized equities drive real on-chain behaviour. But the input
  is an issuer/agent-maintained corporate-actions calendar and feed, not a per-claim evidence record with
  published provenance a third party can independently check against a source document.
- **E2 = N.** Nothing in the reviewed documentation treats an unverified or rumoured claim as a distinct,
  capped state. The system acts on scheduled and confirmed corporate actions.
- **E3 = ?** — and this needs an explicit correction. The page-extraction step summarised Ondo as employing
  "market confirmation before processing", citing that ETF distributions are halted "until the exact amount of
  the dividend is known". Read plainly, that is **data completeness from the same issuer chain**, not
  corroboration by an independent market. Under §3's definition that is not E3. Marked `?` rather than `N`
  only because full mechanism detail was not read in raw form.
- **E4 = P.** The actions are genuinely bounded and temporary and are the strongest such actions found
  anywhere in this survey: trading "may be paused 7:50:00pm–8:10:00pm the day before the dividend ex-date";
  around earnings, assets enter a **"limited" state where maximum trade sizes are reduced**, lifting when
  earnings ends; `SyntheticSharesOracle` applies ≤1%/24h updates automatically but requires a **scheduled
  pause window announced ≥24h in advance** with manual confirmation for >1% updates such as splits, freezing
  price at the last good value during the pause. Scored P, not Y, because these are venue/oracle-level
  controls on trading and pricing, not a bounded LP fee inside a pool. The functional overlap is real and
  should not be minimised.
- **E5 = Y.** Pause windows are scheduled and time-bounded; the earnings "limited" state lifts by rule.
- **E6 = N.** No published comparison of this policy against baseline policies on LP-relevant metrics was
  found. Status is published operationally at `status.ondo.finance`; that is disclosure, not measurement.

**SAGE Protocol** — `https://ethglobal.com/showcase/sage-protocol-tv19y`. Notable because it is the only
project found that drives a v4 fee from a **named external institutional data source**: S&P Global's
Stablecoin Stability Assessment (1–5 scale), pulled on-chain by a Chainlink CRE workflow that watches S&P's
publication cycle. E1 = P — external, source-identified, provenance-bearing data → pool fee, which is the
right *shape*; but the subject is stablecoin stability ratings, not tokenized-equity corporate events, and a
rating is a periodic score rather than a discrete event with a document behind it. E4 = P: the fee move is a
**discount** of up to 30% for well-rated pairs, with no penalty branch — so there is a bound, but it is not a
protective fee with a ceiling. No rumor tier, no market confirmation, no expiry, no outcome comparison.

**OpenGradient dynamic AMM fee research** —
`https://www.opengradient.ai/blog/dynamic-amm-fee-research`. Inputs are historical price/volatility only
(LMAD over 1–1280 minute windows). Explicit ceiling: `Fee = (30 + 6z)` bps, floor 18 bps, "if z >= 2, set the
fee to the maximum of 42 bps" (E4 = Y). Fee refreshes every ~5 blocks rather than expiring, so E5 = N.
E6 = P: a 2023 historical simulation on Uniswap V3 WETH/USDT and WBTC/USDC showing ~18.9% more fees than a
static 30bps baseline — one baseline, one metric, crypto pairs only, no tokenized equities.

**Autopilot Hook** — `https://github.com/RegisGraptin/autopilot-hook`, "Dynamic fee using Machine Learning",
built at Atrium academy. Volatility forecasting → fee. No external evidence layer.

**GitHub `uniswap-v4-hook` topic page, read 2026-08-21** — the repositories listed were: `ScopeLift/fixed-fee-swap`,
`SpryFinance/spry-subgraph`, `hookwright/untoll-hook`, `CodesenSys/CodesenSys-Uniswap-V4-DynamicFeeHook`,
`garykocsis/RangeGuard`, `CodesenSys/compliant-rwa-hook`, `masaun/uniswap-v4-confidential-hook`,
`ariessa/onyx`. Exactly one mentions RWA (KYC/AML enforcement on RWA pools — a compliance gate, not a risk
response). **None** mention news, corporate events, earnings, filings, tokenized stocks, or a risk registry.

**`fewwwww/awesome-uniswap-hooks`, read 2026-08-21** — AI entries are about *generating* hooks (Cook Some
Hooks, a Claude Code plugin), not about evidence. Oracle entries are price oracles (geomean, volatility,
truncated). RWA entry is fractional real estate (`0xEstate`). The list contains **no** entry focused on
tokenized stocks or on corporate news/events.

**Uniswap tokenized securities (`blog.uniswap.org/tokenized-securities-are-live`)** — important context, not a
counterexample. Tokenized equities are live on Uniswap and v4 "supports custom pool logic such as allowlists,
KYC gates, and dynamic fees". The page **does not** name any hook that reacts to corporate actions, earnings,
halts, or news. The capability exists at the protocol level; no public implementation using it for corporate
events was found.

**xStocks / Backed, Dinari, Kraken xStocks disclosures** — the *risk* Tinjau addresses is documented plainly
by the issuers themselves ("if the underlying stock is halted or suspended on traditional exchanges, xStocks
may still be traded, which can result in price discrepancies due to the absence of a reliable reference
price"; 24/7 trading means "weekend earnings reactions, overnight macro events... all price through the
exchange's book"). The mitigations described are structural (bankruptcy-remote SPV, 1:1 collateral,
segregated custody, proof of reserves, audited contracts) — none is an automated market-microstructure
response. This strengthens the problem statement; it is not prior art for the solution.

---

## 5. Searches that returned nothing relevant

A survey that reports only hits is not a survey. These are the null results.

### 5.1 ETHGlobal showcase queries returning zero or zero-relevant projects

| Query | Result |
|---|---|
| `?q=corporate+actions` | No projects found |
| `?q=tokenized+stocks+hook` | No projects found |
| `?q=xStocks` | No projects found |
| `?q=rumor` | No projects found |
| `?q=SEC+filing` | No projects found |
| `?q=dynamic+fee+hook+news` | No projects found |
| `?q=RWA+hook+fee` | No projects found |
| `?q=earnings` | One project, "Vyper Learnings" — unrelated (string match on "learnings") |
| `?q=UniBrain` | No projects found |

The `?q=rumor` and `?q=corporate+actions` nulls are the two most load-bearing negative results in this
document, because they target the two elements (E2, E1) that the claim rests on.

### 5.2 Search queries that surfaced no matching system

- **Corporate-event-driven AMM fees** (queries 5, 10, 24): returned dynamic-fee/LVR literature and volatility
  hooks only. Query 24 explicitly returned volatility-based fees with the note that nothing matched "news
  event"-driven fees with expiry and baseline comparison.
- **On-chain risk registry for corporate events** (query 6): returned tokenized-equity market commentary and
  RWA platform round-ups; no such registry.
- **Rumor / unverified-claim gating on-chain** (query 16): returned general oracle infrastructure. No protocol
  found that gives unverified claims a structurally distinct, capped state.
- **Chainlink corporate actions → automated protocol parameter control** (query 11): the downstream link does
  not appear in any reviewed material.
- **Hypernative + tokenized stocks + LP fee** (query 12): no result connecting Hypernative to tokenized-equity
  pool fees.
- **RavenPack on-chain integration** (query 25): no smart-contract integration found.
- **Published three-way policy benchmarks for v4 hooks** (query 27): explicitly none found. The closest was
  qualitative commentary that dynamic-fee pools "earn substantially more fees per dollar of liquidity than
  fixed-fee pools" — an assertion without a reproducible artifact.
- **DoraHacks BUIDL search** (query 22): returned Yieldera, LiquidMesh Finance, CLP-HELIX, AI Agents' DEX,
  iAgentArena, Agentify, DeFi AI Agent Consultant. All are AI liquidity managers or agent trading platforms;
  none uses corporate evidence, rumor tiers, or publishes a baseline comparison.
- **X Layer / OKX ecosystem** (query 21): returned tokenized-stock listings, fee promotions, Exchange OS, and
  the hackathon programme. No project found doing corporate-event-aware pool risk on X Layer.
- **Academic literature** (queries 10, 23, 24, 27): the 2026 arXiv AMM literature found
  (`2606.21769` optimal dynamic fees / LVR stochastic control, `2606.23070` mitigating adverse selection in
  CL-AMMs with dynamic fees, `2603.09669` DEX competition through dynamic fees, `2602.00101` formal AMM fee
  mechanisms in Lean 4) is uniformly **volatility- and flow-driven**. No paper found models fees against
  scheduled or unscheduled *corporate events*, and none addresses rumor gating.

### 5.3 Named candidates that could not be fully re-verified today

State this plainly rather than quietly carrying the earlier review's numbers forward:

- **Argus (Mantle RWA)** — not re-located. §4.1 row is inherited from 2026-08-20, not re-verified.
- **UniBrain** — no showcase entry under that name; only indirect search descriptions.
- **"Sentinel Agent" (Binance-vs-DEX divergence, per the 2026-08-20 review)** — the showcase project
  reachable under that name today is an MEV-defence project. Either the earlier review described a different
  submission, or the description drifted. Both readings are recorded; neither is resolved.
- **RiskClaw, NeuralHook, AnchorHookV4** — all three **were** re-verified on the ETHGlobal showcase today, so
  the earlier review's core mechanism claims stand.

Failing to re-verify a candidate is not evidence it does not exist. It is evidence this method did not reach
it.

---

## 6. Verdict

**The claim survives, but it should carry a footnote, and one word in it is now doing work it cannot
support.**

No system found on 2026-08-21 implements all six elements. The gaps are consistent and they are not close
calls:

- **E2 (rumor containment) was found in no candidate at all.** Not one. RavenPack has novelty scoring, Chaos
  Labs Edge AI has a bias analyst — both are scores feeding one pathway, not a structurally capped
  lower-severity state. This is the single emptiest column in the matrix.
- **E6 (measured, published outcome comparison vs baseline policies) was found in essentially no candidate.**
  The only things approaching it are OpenGradient's single-baseline historical simulation on crypto pairs and
  Arrakis's mechanism-level LVR analysis. No deployed v4 hook was found publishing a policy-vs-policy outcome
  comparison.
- **E1 and E4/E5 exist, but never in the same system.** Chainlink has the strongest corporate evidence and no
  pool action. RiskClaw/NeuralHook/AnchorHookV4 have bounded pool action and no corporate evidence. Ondo has
  both corporate evidence and bounded expiring action — and is the reason for the narrowing below.

**Where the sentence needs work.** README §2 says "No complete public product with the exact reviewed
combination..." The word **"reviewed"** was accurate for a self-conducted review; it is weak as a public
claim because a reader cannot tell what was reviewed. That is precisely the objection the 2026-08-21
independent evaluation raised. The fix is not to weaken the claim's substance — it is to attach a method a
stranger can re-run.

**Recommended change: keep the sentence, add a citation.** Replace the trailing pointer so it cites this
survey alongside the existing landscape document, and make the date current:

> No complete public product with the exact reviewed combination of source-grounded tokenized-equity
> evidence, rumor containment, OKX/X Layer confirmation, bounded LP action, deterministic recovery, and
> measured three-policy outcome was found.
>
> "Not found" means not found in the public material reviewed on 2026-08-20 and re-surveyed on 2026-08-21
> across 40 queries and 22 sources — method, queries, and per-candidate verdicts in
> [`docs/buildx-orion-2026/outputs/05-build/s4-1-competitor-survey.md`](./docs/buildx-orion-2026/outputs/05-build/s4-1-competitor-survey.md).
> It is not proof that no such system exists privately.

**One optional narrowing, offered honestly.** If the project wants the strongest possible version of the
claim, narrow "bounded LP action" to "bounded LP action in a pool" in the positioning sentence. Ondo Global
Markets performs corporate-action-triggered, bounded, deterministically-expiring *venue* actions on tokenized
equities today (scheduled pause windows, reduced maximum trade sizes around earnings). It is not an LP-fee
mechanism and it lacks E2, E3, and E6 — so the sentence as written is not false. But a well-informed reviewer
who knows Ondo's corporate-actions page could reasonably ask why it is not discussed. Naming that distinction
is cheaper than being asked about it.

**Constraint restated, because a null result invites exactly this mistake.** Nothing in this survey licenses
"first", "only", "unique", or "no one else". Six elements were not found together in public material on one
day, using two tools, from one region. The correct verb remains **"was not found."**

---

## 7. If you want to re-run this

1. Tools: any web search plus a page fetcher. No account, no API key, no private data.
2. Run all 27 search queries in §2.3 verbatim, plus the 13 showcase queries in step 3. Record hits **and** nulls; the nulls in §5 are the evidence.
3. For ETHGlobal, hit `https://ethglobal.com/showcase?q=<url-encoded term>` directly — plain search engines do
   not index showcase entries reliably, which is why queries 1–3 failed while the direct fetch succeeded.
   Re-run at minimum: `corporate actions`, `rumor`, `earnings`, `xStocks`, `tokenized stocks hook`,
   `SEC filing`, `RWA hook fee`, `dynamic fee hook news`.
4. Read `https://github.com/topics/uniswap-v4-hook` and `https://github.com/fewwwww/awesome-uniswap-hooks` and
   scan every entry for news / corporate-event / tokenized-equity language. Both lists change; a new entry is
   the most likely place a counterexample first appears.
5. Score each candidate against the six definitions in §3 **before** looking at §4, then compare. If your
   verdicts differ from §4, §4 is what should change.
6. If any single system scores Y on all six, the claim has a counterexample. Correct README §2 rather than
   qualifying it further.
7. Re-run before any public submission or press. Elements E1 and E4 are converging fast in this market:
   Chainlink moving downstream toward automated controls, or Ondo/Uniswap issuer hooks adding an event-driven
   fee, would each close the gap without any announcement aimed at this project.

**Recheck-by date:** this survey should be considered stale after **2026-09-21**.
