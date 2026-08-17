You are ideating for one project submitted to two hackathons. Everything you need is below. Do not restate it.

## Events

**A (governs). X Layer "Build X Series — AI Season".** Deadline 2026-08-21 23:59 UTC. Hard rules: must include AI; must deploy to X Layer Testnet during the hackathon (chainId 1952, gas OKB, EVM-equivalent OP Stack, 1s blocks, Flashblocks); mainnet later (196). Judged on: AI application, innovation, product completeness, user value, X Layer integration, growth potential, code quality, onchain data, market potential, ecosystem contribution. Prizes: 30k/15k/5k USDT, plus a separate **AI-RWA Liquidity Grant of 50k USDT** (bigger than 2nd place, much smaller field), plus a volume-based Launch Grant that is unreachable for an MVP.

Organizer stack available (OKX Onchain OS, CLI already installed locally): ERC-8004 identity with User/ASP/Evaluator roles; task marketplace with stake, escrow, delivery, dispute, arbitration; x402 in four modes; MPP payment channels; a2a-pay; DEX aggregator; market data APIs; agentic wallet with policy limits and limit orders.

**B (secondary). Orion Builder Hackathon.** Deadline 2026-09-02 23:59 UTC. Any working AI agent qualifies. Needs website, X profile, GitHub, Discord or Telegram, and a Base wallet (registration + ~$10 ETH ignition fee). Judged 0–10 on usefulness, execution, originality, informed by an automated AI vetting score and builder upvotes. Judges run what they can run. Field as of 2026-08-16: **2 entries against 7 prizes**, both read-only analyst agents on Base (AI scores 86 and 72), both pitching "deterministic engine computes, LLM only decides where to look, every figure traces to a real tool call".

Solo builder. Prior wins: Uniswap Hook Incubator UHI8 (Solidity, hooks, ERC-6909). Existing empty TS monorepo with `apps/web`, `apps/server`, `apps/mcp-server`, `contracts/`.

## Corpus: 242 winners across 57 hackathons, 2026

Theme saturation (rows out of 242): privacy/ZK 38 · cross-chain 33 · **x402 32** · gaming 31 · compliance/KYC 23 · social/creator 21 · insurance 19 · backtest 19 · tax 18 · MEV 18 · **RWA 18** · intent 17 · attestation 17 · agent liability 11 · staking/slashing 11 · **ERC-8004 8** · kill-switch 7 · personhood 7 · human-in-loop 5 · DEX routing 3 · no-code agents 2 · **proof-of-reserve / backing attestation 1**.

### Already won — do not re-propose these

*Agent accountability / reputation:* ClawMon (slashable stake on agent skills; "the only trust signal that scales with the value at risk is capital that can be taken away") · World of Geneva (**1st**, reputation keyed to agentId in a persistent economy) · Moltbet (**2nd**, staked publicly-settled agent forecasts as the reputation venue) · Phare (bonded claim + challenge window + paid adversarial verifier agents) · Mnemosyne (stake+slashing on agent data claims) · The Dojo (**2nd**, machine-graded sessions, auto-refund below 80% pass rate) · Immunity (security rules must earn authority by corroboration, each bonded) · The Wallet Shift (filtered 34,556 ERC-8004 registrations → 711 real services; "the useful product is the filter rather than the index").

*Agent payments / permissions:* FlyBeacon (agency unbundled into 9 x402-priced calls) · RenderGate (**3rd**, $0.001/render) · router402 (settles the *previous* request) · Xpack (paywall inside `npm install`) · Umbra Gateway (per-request anonymous RPC) · MeshSearch (private search as an MCP tool) · Flovia (payment-event analytics replacing cookies) · CroIgnite (**3rd**, sponsorship metered per executed action) · SYNERGI (recursive agent subcontracting on Bitcoin rails) · Cards402 (**1st**, agent → real Visa PAN) · SuperPage (**3rd**, ERC-8004 + AP2 + x402 + MCP in one purchase path) · AgentFabric (**1st**, permission not wallet as the unit of delegation) · CleverCon (**2nd**, spend limit moved into a Soroban vault contract) · BlockHelix (**3rd**, permissions as a queryable endpoint enforced by merkle policy) · Messier (**3rd**, SaaS and agent API spend as one budgeting problem) · Veil Protocol (stealth addresses in the agent payment path) · Slopstock (agent earnings fractionalised via ERC-7857 iNFT + ERC-20 shares) · Accrue (monetising the assistant's thinking spinner) · Aegis402 (escrow withholds swap output until a post-execution audit clears).

*Agent memory / runtime:* Cortex (memory on Arweave, verification anchored on X Layer, HTTP+MCP, x402 per op — **same organizer**) · anima (**3rd**, sovereign on-chain agent harness bound to an iNFT) · Corpus (agent runs on the user's own machine to dodge hosting cost and bot detection) · SAP MCP (hosted discovery, local key custody and payment authorisation).

*RWA — all 18 build financial machinery on an **assumed** backing, none verifies it:* DobDex (zero-slippage oracle-pegged RWA swaps) · ODL (private-secondaries venue built around the liquidator) · Housd (residential mortgage credit as uncorrelated DeFi yield) · Cesto (one basket spanning RWA + prediction markets + perps) · ppn.fi (vault yield as the option premium in a principal-protected note) · xPrime (**1st**, intent layer over prime-brokerage primitives) · Stretch (full DeFi stack around a single tokenised equity) · xStream (**3rd**, dividend strip separated from price exposure) · HashCredit (**2nd**, mining-pool payouts as the enforcement point for hashrate credit) · SnowBall (**3rd**) · Crafts (equity-linked token issuance a VC cap table tolerates) · JK Index (collector-owned price reference) · RWAOS (**2nd**, confidentiality as a four-primitive control plane).

*Attestation — none of it is about asset backing:* AnchorShield (**2nd**, revocation non-membership alongside KYC/sanctions/age/jurisdiction) · Satisfy (zk + attestation policy inside a Uniswap v4 hook) · VEIL VPN (TEE attests the exact running code, killing the unverifiable no-logs promise) · Omega (**overall winner**, compliance attestation as a cryptographic primitive over training data) · Credence (**1st**, behavioural model on 115,687 real borrowers + ZK credit attestation) · Cronos Shield (**2nd**, "a risk assessment becomes a verifiable on-chain object rather than an API response") · Eliver (telemetry signed at the sensor, AI adjudicator settles the insurance claim) · MotivaTON (**2nd**, verification polled every minute from GitHub/LeetCode/Strava — evidence the subject cannot fabricate) · npmguard (audit verdict published as an ENS subname, so checking is a name resolution not an API call) · DIVE (oracle nodes bound to verified humans; sybil resistance from personhood not stake).

### Patterns that win

P1 Make the verdict a verifiable on-chain object another contract consumes, not an API response. P2 Source evidence from where the subject cannot fabricate it. P3 Deterministic engine computes every number; the model only routes and writes. P4 Bond the claim, open a challenge window, pay the challenger. P5 Enforce limits in the contract, not the application. P6 The filter is the product, not the index. P7 One surface both humans and agents call (HTTP + MCP, or CLI-first).

### Dead novelty claims

"We metered it with x402" (32 rows, three dedicated x402 hackathons). "We registered an ERC-8004 identity" (registry is 98% empty shells, and someone already won by proving it). "We exposed it over MCP" (14 rows). Use all three; never lead with them.

## Current shortlist

- **C2 (leading)** — continuous backing attestation for tokenised RWAs. Poll genuinely public evidence, model extracts structured readings with per-figure citations, deterministic aggregator publishes a 0–100 backing-confidence score on X Layer as a contract-readable object, bonded challenge on source divergence. Open risk: whether real public evidence sources exist for at least two independent inputs in the time available.
- **C3 (fallback)** — bounded-authority remediation agent. Best Orion fit, but both halves are already solved above.
- **C1 (dead)** — stake-to-act bonded agent decisions. Seven precedents.
- **Rejected** — portable agent memory (sequel to Cortex, same organizer, market doesn't exist); creator authenticity verification (real demand, no chain necessity); unbundled security review (x402 metering is table stakes).

## Your task

Produce **6 ideas that are not in any list above**, plus **1 sharpened variant of C2** that survives its open risk.

Every idea must pass both tests explicitly:
- **Why AI** — the work must be genuinely unstructured or judgement-shaped, not a numeric pipeline with a chatbot on it.
- **Why a chain** — something must need to be verifiable by, or enforceable against, a party that does not trust the author.

Prefer thin themes over crowded ones. An idea that scores well on Event A's ecosystem-contribution and onchain-data criteria *and* is runnable by an Orion judge in five minutes beats one that only does either.

Ignore feasibility entirely. Do not consider deadline, team size, or development difficulty. Optimise for originality and value.

Format per idea, hard cap 110 words:
```
NAME — one-line hook
User + problem:
Mechanism (3 steps max):
Why AI / Why chain:
Nearest corpus neighbour and how this differs:
Weakest point:
```

No preamble, no summary, no restating the brief. End with one line naming your single strongest pick and why.
