Pick one of three product ideas to build. Everything you need is below. You have no prior context and should assume none — do not defer to any recommendation you think may exist elsewhere. Reaching a different answer than expected is a valid outcome.

# Situation

One project, submitted to two hackathons. Solo builder. Prior win: Uniswap Hook Incubator UHI8 (Solidity, v4 hooks, ERC-6909). Existing empty TypeScript monorepo with `apps/web`, `apps/server`, `apps/mcp-server`, `contracts/`. Today is 2026-08-16.

**Event A — X Layer "Build X Series, AI Season".** Deadline 2026-08-21 23:59 UTC (~5.7 days). Hard rules: must include AI; must deploy to X Layer Testnet **during** the hackathon (chainId 1952, gas OKB, EVM-equivalent OP Stack, 1s blocks); mainnet later (196). Judged on: application of AI, innovation, product completeness, user value, X Layer integration, growth potential, code quality, onchain data, market potential, contribution to the X Layer ecosystem. Prizes: 30k/15k/5k USDT, plus a separate **AI-RWA Liquidity Grant of 50k USDT** (larger than 2nd place, much smaller field), plus a volume-based Launch Grant that is unreachable for an MVP. Submission is one Google Form with 8 fields and **no track selector** — a single project is considered for every grant, so targeting the AI-RWA grant costs nothing in eligibility, only in narrative focus.

Organizer stack available (OKX Onchain OS, CLI already installed): ERC-8004 identity (User/ASP/Evaluator roles), task marketplace with stake/escrow/dispute/arbitration, x402 in four modes, MPP payment channels, DEX aggregator, market data APIs, agentic wallet with contract-enforced policy limits.

**Event B — Orion Builder Hackathon.** Deadline 2026-09-02 23:59 UTC (~17 days). Any working AI agent qualifies. Needs website, X profile, GitHub, Discord or Telegram, and a Base wallet (registration is a free signature; submission costs a ~$10 ETH ignition fee). Judged 0–10 on **usefulness, execution, originality**, informed by an automated AI vetting score and upvotes from registered builders. Judges run what they can run. Field on 2026-08-16: **2 entries against 7 prizes**, both read-only analyst agents on Base (AI vetting scores 86 and 72), both pitching "a deterministic engine computes every number, the LLM only decides where to look, every figure traces to a real tool call". The field will grow before the deadline; treat 2 as a snapshot, not a planning assumption.

# Verified evidence

**V1 — corpus.** 242 hackathon winners and finalists across 57 hackathons in 2026, analysed in full. Theme saturation (rows out of 242): privacy/ZK 38 · cross-chain 33 · **x402 32** · gaming 31 · compliance/KYC 23 · social/creator 21 · insurance 19 · backtest 19 · tax 18 · MEV 18 · **RWA 18** · intent 17 · attestation 17 · agent liability 11 · staking/slashing 11 · **ERC-8004 8** · kill-switch 7 · personhood 7 · **human-in-loop 5** · DEX routing 3 · no-code agents 2 · **proof-of-reserve / backing attestation 1**.

Three of the 57 hackathons were dedicated entirely to x402. Using x402, ERC-8004, or MCP is therefore table stakes, not a novelty claim.

**V2 — the ERC-8004 registry is mostly empty.** A winner (The Wallet Shift, ETHGlobal New York finalist) filtered **34,556 raw ERC-8004 registrations down to 2,037 callable agents and then to 711 genuine services**, and won on the argument that "a permissionless registry measures intent to participate, not participation, so the useful product is the filter rather than the index".

**V3 — all 18 RWA winners assume backing; none verifies it.** They build structuring, liquidity and yield on top: zero-slippage oracle-pegged RWA swaps, private-secondaries venues, real-estate debt yield, thematic baskets, principal-protected notes, dividend stripping, prime-brokerage intent layers, hashrate-backed credit, confidential institutional tokens. The 17 attestation winners attest something else entirely — credentials, running code in a TEE, training data, sensor telemetry, contract risk scores, credit.

**V4 — X Layer has no RWA asset live today.** Verified 2026-08-16: xstocks.com lists Ethereum, Solana, BNB Smart Chain, Mantle, TON, Ink — not X Layer. No STBL protocol appears in public on-chain data despite a February 2026 launch announcement. The Hamilton Lane fund behind that announcement sits on Polygon and Ethereum. X Layer chain TVL is $115.8M across 32 protocols — Aave V3 $79.1M, Uniswap V3 $23.5M, PotatoSwap $5.9M, Curve $3.3M — and **none of the 32 is an RWA protocol**. The $2.95B attributed to "OKX" on X Layer is exchange custody, not DeFi.

**V5 — RWA redemption access.** BUIDL enforces an on-chain whitelist and rejects transfers to non-whitelisted addresses. OUSG is KYC-only with a $100K minimum. USDY is deny-list based, has no minimum, and is freely transferable in permitted jurisdictions. Redemption burns the token and triggers a wire transfer settling **T+1 to T+3**.

# The three candidates

## 1. EXITPROOF — exit-confidence scoring for tokenised claims

**Claim.** Every token that promises redemption is untested until someone tries. This tests, on a schedule, and publishes the result.

**Mechanism.** (a) On-chain flow forensics reconcile mint/burn against the issuer's claimed subscription activity. (b) Escrowed probe wallets execute **real small redemptions** on a schedule and sign latency and slippage receipts — the evidence source is the probe itself, rather than a feed someone grants access to. (c) A model reconciles issuer prose (docs, announcements, support replies during redemption) against the deterministic probe data; a 0–100 exit-confidence score publishes on X Layer as a contract-readable object; source divergence opens a bonded challenge. Probe receipts are anchored as X Layer transactions with heavy payloads off-chain.

**Why AI.** Navigating redemption flows and reconciling issuer claims against observed behaviour is unstructured work with no deterministic parser.

**Why a chain.** The score is a public input to other protocols' risk parameters, so it must be readable and verifiable by a contract that does not trust the issuer, and its history must be non-revisable.

**Nearest corpus neighbours.** MotivaTON (2nd, polls GitHub/LeetCode/Strava every minute for evidence the subject cannot fabricate). Cronos Shield (2nd, "a risk assessment becomes a verifiable on-chain object rather than an API response"). The 18 RWA winners, all of which assume what this measures.

**Objections.** Per V4, the probe subjects are cross-chain, so X Layer holds the scoring and settlement layer rather than the subject matter — the honest framing is a verification layer arriving ahead of assets the chain's operator has announced but not shipped. Per V5, allowlist tokens (BUIDL, OUSG) cannot be probed at all, so for those the only measurement is secondary-market exit, which is **liquidity, not backing**, and conflating the two would be a disqualifying overclaim. Redemption settles T+1 to T+3, so a probe cycle takes days. Real probes cost real capital. Overlap with Chainlink Proof of Reserve must be met head-on rather than glossed. No lending market will integrate the score during a hackathon, so any consumer contract is a reference integration, never adoption. At scale, a probe that executes a real redemption is indistinguishable from one, so the system moves what it measures.

## 2. THESEUS — proof you are still talking to the agent you hired

**Claim.** Operators silently swap models, prompts or configs. An identity registration says nothing about behavioural continuity.

**Mechanism.** (a) The operator bonds a version commitment — a hash of model, prompt and config — to its on-chain identity. (b) An auditor agent probes the live agent with sealed canary tasks and fingerprints the response distribution. (c) Significant drift from the attested fingerprint raises an on-chain drift flag and opens a bonded challenge; unattested change slashes the bond.

**Why AI.** Fingerprinting the behaviour of a black box is semantic judgement over unstructured output, not hash comparison.

**Why a chain.** Marketplaces and buyers gating on the identity must read the flag, and slashing must bind the operator.

**Nearest corpus neighbours.** VEIL VPN (TEE attests the exact running code, converting an unverifiable no-logs promise into a checkable claim) — but that covers only agents inside a TEE, and this works from the outside on the rest. Omega (overall winner, attests training-data provenance). Nothing in the 242 rows attests the live behaviour of a black-box agent from outside.

**Objections.** Separating a genuine model swap from ordinary stochastic variance is the core technical risk; distributional testing over a canary suite is standard ML monitoring practice and degrades gracefully (wider confidence bands produce fewer flags rather than wrong ones), but it is unproven here. Canaries that leak stop working, so the suite needs sealing and rotation. Demand timing is the deeper problem: this matters once buyers depend on specific named agents, and V2 says most registered agents are shells nobody depends on. Who pays — the operator being policed, or the buyer — is unresolved.

## 3. BLACKLETTER — the negotiation thread compiles into the escrow terms

**Claim.** Deals close on natural-language agreements, and escrow release then hinges on what an arbitrator later thinks those words meant.

**Mechanism.** (a) At deal close, a model compiles the negotiation thread into explicit acceptance tests and release conditions; **both parties co-sign the compiled artifact before escrow funds**. (b) Delivery is evaluated deterministically against the signed tests. (c) Ambiguity discovered later routes only that clause to arbitration; everything else releases.

**Why AI.** Compiling ambiguous prose into checkable conditions is compilation of meaning.

**Why a chain.** The compiled terms bind escrow between parties who trust neither each other nor the compiler, which is precisely why both must co-sign before funds move.

**Nearest corpus neighbours.** The Dojo (2nd, machine-grades every session on delivery/format/latency and auto-refunds below an 80% pass rate) — but its criteria are fixed by the platform, whereas these are derived from the parties' own negotiation. Aegis402 (escrow withholds swap output until a post-execution audit clears). Eliver (puts the AI at claim settlement; this moves it to contract formation so settlement needs no judgement).

**Objections.** Parties may sign compiled terms they never read, reproducing the original disease in a new host — though unread-but-deterministic is arguably better than read-but-ambiguous, because failure becomes discoverable before money moves. The compiler becomes a trusted third party both sides must accept, which is a new trust assumption rather than a removed one. Ambiguity that survives compilation still needs arbitration, so the mechanism reduces rather than eliminates the problem. Cold start: it needs a marketplace with real deal volume, and the organizer's task marketplace has almost none. The difference from The Dojo must be made explicit or a judge will collapse the two.

# Your task

Pick **one** to build. Feasibility is in scope — this is a selection decision, not brainstorming, so the ~5.7 days to Event A and the ~17 to Event B are real constraints, as is one person building it.

Produce, in this order:

1. **The pick**, in one sentence.
2. **Scoring** — score all three, 1–5, on: Event A innovation vs the corpus · Event A X Layer integration and onchain data · Event A ecosystem contribution · demonstrated user value · runnable by an Orion judge in five minutes · buildable to an honest MVP by 2026-08-21. Show the table, then say which row actually decided it.
3. **The strongest case for your runner-up**, argued properly rather than dismissed — at least 60 words.
4. **What would flip your decision** — one concrete, checkable fact.
5. **The one thing your pick must not claim**, given the objections listed above.

Be decisive. No preamble, no restating the brief, no hedged both-ways conclusion. Hard cap 700 words.
