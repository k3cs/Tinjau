# Idea Candidates — Stage 2 (revised)

- Date: 2026-08-16, revised after the corpus was re-read at full size (242 rows, not 22)
- Guardrail in force: **LEARN-001** — generated with no filtering on time, team size, or development difficulty. Feasibility enters only in §5.
- Design constraints: P1–P7 in `outputs/01-research/winner-pattern-analysis.md`
- What changed: the previously recommended C1 was demoted after seven precedents were found. See §2.

## 1. The search direction

`[Fakta]` Across 242 winners in 57 hackathons, the thinnest theme is **proof-of-reserve / backing attestation: 1 row**. The 18-row RWA corpus is entirely about structuring, liquidity and yield, and not one of the 18 verifies that the underlying asset is still there.

`[Fakta]` Event A publishes a dedicated **AI-RWA path** whose Liquidity Grant is **50,000 USDT** — larger than the hackathon's own 2nd place (15,000).

`[Inferensi]` The gap and the money point at the same place, which is rare enough to be worth acting on.

## 2. Demoted: C1 — Stake-to-Act

The earlier recommendation. An agent may only act after bonding a falsifiable pre-commitment, settled by a deterministic resolver, recorded against its identity.

`[Fakta]` Seven corpus winners already occupy this space: ClawMon (ETHDenver Village Winner, slashable stake on agent skills), Mnemosyne (Open Agents finalist, stake + slashing on agent data claims), Phare (ETHPrague award, bonded claim + challenge window + paid verifier agents), The Dojo (BNB 2nd, machine-graded sessions with automatic refunds), Moltbet (SF x402 2nd, staked publicly-settled agent forecasts), World of Geneva (SF x402 **1st**, reputation keyed to `agentId`), Immunity (ETHGlobal NY finalist, financially bonded security rules).

`[Fakta]` ClawMon already states C1's core argument: *"the only trust signal that scales with the value at risk is capital that can be taken away."*

`[Inferensi]` Entering Event A with this would mean competing on execution against seven projects that already won with the same insight. Demoted to fallback. The *mechanism* stays useful — it is P4 — but it is no longer the idea.

## 3. Candidates

### C2 — **Continuous backing attestation for tokenised real-world assets** *(recommended)*

**One line.** Every RWA token claims something exists off-chain. This continuously checks whether it still does, and publishes the answer as an on-chain object other contracts can read without trusting the issuer.

**User and problem.** `[Fakta]` The 18 RWA winners in the corpus all build financial machinery — lending, baskets, dividend stripping, principal protection — on top of an *assumed* backing. `[Inferensi]` The people exposed to that assumption being wrong are the lending markets that accept RWA tokens as collateral and the holders who cannot see between quarterly attestation PDFs. Today the signal is a periodic document from one auditor, and between documents the on-chain representation and off-chain reality can drift arbitrarily far with no observable trace.

**Mechanism.**
1. Each evidence source (custodian statement, registry filing, insurance record, auditor letter, market comparable) is polled on a schedule, not on request.
2. A model turns each unstructured document into a structured reading with a confidence and a citation to the exact passage. The model never produces the final number.
3. A deterministic aggregator on X Layer combines agreement, freshness and coverage into a 0–100 backing-confidence score.
4. The score is a contract-readable object, not an API response — a lending market can gate its collateral factor on it directly.
5. Divergence between sources opens a bonded challenge that a human or an evaluator agent resolves.

**Why a chain is required.** The score is a public input to *other* protocols' risk parameters. It has to be readable and verifiable by a contract that does not trust the issuer, and the history has to be non-revisable — an issuer who could quietly edit last month's score would defeat the purpose.

**Why AI is required.** The evidence is prose. Custodian statements, filings and auditor letters are unstructured, inconsistent between issuers, and change format. Turning them into comparable structured readings is a language problem, and there is no deterministic parser for it.

**Pattern fit.** P1 (the verdict is an on-chain object, per Cronos Shield) · P2 (evidence polled from sources the issuer does not control, per MotivaTON) · P3 (model reads, aggregator computes) · P4 (bonded challenge on divergence, per Phare) · P7 (score readable by both a dashboard and an agent).

**Precedent check.** `[Fakta]` Nothing in the 242 rows does this. The nearest three are Cronos Shield (on-chain risk objects, but for contract safety not asset backing), Eliver (sensor-signed telemetry for logistics insurance), and RWAOS (confidential institutional tokens with an audit anchor, but the anchor records disclosure, not verification).

**Dual-event read.** Event A: the only candidate aimed at the 50,000 USDT AI-RWA path, and it satisfies "onchain data" and "ecosystem contribution" by construction. Event B: runnable in the same shape the current field already rewards — point it at a token, get a verdict with every figure traced to a source. `[Fakta]` BaseScout scores 86 on exactly that shape; the difference is the dimension being measured.

---

### C3 — **Bounded-authority remediation agent**

**One line.** Rigel tells you 19 live approvals put $1,293 at risk. This one revokes them, inside limits you set, and shows its work.

**User and problem.** Wallet owners who get a diagnosis and never act on it.

**Mechanism.** Deterministic diagnostic engine → model prioritises remediations → user grants a bounded authority envelope enforced in a contract, not in application code → execution → every step traced to a tool call and a tx hash.

**Precedent check.** `[Fakta]` The enforcement half is well covered — CleverCon (Stellar 2nd, spend limits in a Soroban vault), AgentFabric (Cronos x402 **1st**, permission as the unit of delegation), BlockHelix (Solana Agent 3rd), Messier (BNB 3rd), SAP MCP. `[Fakta]` The diagnostic half is what both live Orion entries already do. `[Inferensi]` So this is a strong *combination* of two solved halves rather than a new idea — which is a legitimate hackathon entry and a weak Event A entry, since Event A judges innovation and ecosystem contribution directly.

**Dual-event read.** Best possible Event B fit, weakest Event A contribution story.

---

### C4 — **The filter for RWA tokens** *(adjacent to C2)*

**One line.** The Wallet Shift proved the filter is the product for agents. Do it for RWA tokens: classify every tokenised asset by whether its backing evidence is real, current and independently sourced.

**Precedent check.** `[Fakta]` The Wallet Shift won a finalist slot on exactly this reasoning — *"the useful product is the filter rather than the index"* — for ERC-8004 agents.

`[Inferensi]` Kept as a candidate but weaker than C2: a classification of existing tokens is a one-shot dataset, while C2 is a live signal other contracts consume. C2 subsumes it — the filter is what C2's score produces at rest.

---

### C5–C7 — rejected, reasons in §7

Portable agent memory, creator authenticity verification, unbundled security review as metered calls.

## 4. Comparison

Scores 1–5, assigned by Claude from the evidence above. Weights follow the two published rubrics.

| Criterion (weight) | C2 RWA attestation | C3 Remediation | C1 Stake-to-Act |
|---|---|---|---|
| Novelty vs 242-row corpus (A, ×3) | 5 | 2 | 1 |
| X Layer integration + onchain data (A, ×3) | 5 | 2 | 4 |
| Ecosystem contribution (A, ×2) | 5 | 2 | 4 |
| User value, demand evidenced (A+B, ×3) | 4 | 5 | 3 |
| Runnable in five minutes (B, ×3) | 4 | 5 | 4 |
| Originality vs Orion field (B, ×2) | 5 | 3 | 4 |
| Prize-path targeting (A, ×2) | 5 | 2 | 3 |
| **Weighted total (max 90)** | **83** | **57** | **56** |

`[Inferensi]` C2's margin comes almost entirely from the novelty and prize-targeting rows, both of which are grounded in the full-corpus scan rather than in taste.

## 5. Honest objections to C2

**O1 — Where does real evidence come from in five days?** `[Inferensi]` The strongest objection. Custodian APIs are permissioned; an issuer will not hand a hackathon project a live feed. The honest answer is to pick sources that are genuinely public — SEC/EDGAR-style filings, land or company registries, published auditor letters, on-chain reserve addresses for stablecoin-adjacent RWAs — and to state plainly which sources are live and which are fixtures. **A demo that silently uses synthetic custodian data while implying live verification is the one failure mode that would deserve to lose.**

**O2 — Is this just Chainlink Proof of Reserve?** `[Inferensi]` Partly overlapping and the submission must say so. PoR reports a number from a permissioned feed the issuer arranged. The difference claimed here is (a) multiple *independent* sources rather than one issuer-selected feed, (b) a confidence and freshness score rather than a bare balance, (c) unstructured document evidence that no numeric feed covers, and (d) a bonded challenge path. If those four do not hold up in implementation, this is a worse PoR and should be abandoned rather than dressed up.

**O3 — Does anyone actually consume the score?** `[Inferensi]` No lending market will integrate it during a hackathon. The honest demo is a reference consumer contract of our own that gates a collateral factor on the score, presented as a reference integration and never as adoption.

**O4 — Model reliability on legal documents.** `[Inferensi]` Extraction from filings and auditor letters is exactly where models hallucinate confidently. P3 is the mitigation — every extracted figure carries a citation to the source passage and the aggregation is deterministic — but the extraction step is still the weakest link and should be stated as one.

**O5 — Event B fit is good but not the best available.** `[Inferensi]` C3 would score higher with Orion's judges. Choosing C2 is an explicit trade of Orion upside for the 50,000 USDT path, and that trade is Dien's to make, not mine.

## 6. Feasibility, introduced only now

`[Fakta]` Event A deadline 2026-08-21 23:59 UTC (~5.7 days). Event B 2026-09-02 23:59 UTC (~17 days).

`[Inferensi]` C2's minimum honest core: one score registry contract on X Layer, two or three genuinely public evidence sources, one extraction pipeline with citations, one deterministic aggregator, one reference consumer contract, and one agent surface over HTTP + MCP. The bonded challenge path can ship as a documented second layer. That ordering satisfies Event A's "deployed on X Layer Testnet during the hackathon" requirement early, which LEARN-002 says is the binding constraint.

## 7. Rejected, with reasons

| Idea | Reason | Reusable later? |
|---|---|---|
| C1 Stake-to-Act | Seven corpus winners already occupy it; ClawMon states the same core insight | Yes — as P4, the challenge mechanism inside C2 |
| C4 RWA token filter | Subsumed by C2; a one-shot dataset rather than a live signal | Yes, as C2's public leaderboard view |
| C5 Portable agent memory | Direct sequel to Cortex, same organizer; the market it bridges does not exist | Yes, once multiple memory providers exist |
| C6 Creator authenticity | Real demand, no genuine on-chain necessity | Yes, outside a Web3 hackathon |
| C7 Unbundled security review | x402 metering is table stakes — 32 corpus rows and three dedicated hackathons | Yes, as C2's pricing model |

## 8. Recommendation

**C2 — Continuous backing attestation for tokenised RWAs.** Fallback **C3** if the evidence-source problem in O1 proves unsolvable with genuinely public data.
