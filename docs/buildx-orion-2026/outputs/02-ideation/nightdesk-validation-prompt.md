# Validation Brief — score one candidate against two hackathon rubrics

You have no prior context. Your task: independently validate and score the project proposal below against the official judging criteria of two hackathons. Prior evaluations of this proposal exist but are omitted; do not attempt to reconstruct them.

Today is **2026-08-16**.

---

## 1. Your task

1. Score the proposal on **Event A's seven criteria**, each 1–5, with a one-sentence justification per score.
2. Score it on **Event B's three criteria**, each 0–10 (the official scale), with a one-sentence justification per score.
3. State the single most likely reason a judge would score it lower than you did.
4. State whether the 5.7-day scope (§5) is credible for the stated builder (§4). If not, say what must be cut.
5. Verdict: submit as-is / submit with changes (list them) / do not submit.

Do not restate this brief. Mark every claim you add as fact (with source) or inference.

---

## 2. The two events

### Event A — X Layer "Build X Series, AI Season"

Deadline **2026-08-21 23:59 UTC (~5.7 days away)**.

Mandatory requirements (failing any one = ineligible): (1) AI elements in product design, deployed on X Layer; (2) deployed on X Layer Testnet and subsequently launched on Mainnet during the hackathon; (3) dedicated X account, kept active; (4) submission post from that account mentioning @XLayerOfficial; (5) Google Form submission by deadline.

**Judging criteria, verbatim from Terms & Conditions clause 4 (these seven and no others):**

> "application of AI, innovation, product completeness, user value, integration with X Layer, growth potential, and contribution to the X Layer ecosystem"

No published weights. Prizes 30,000 / 15,000 / 5,000 USDT. Separate **Liquidity Grant of 50,000 USDT** to "the best-performing project in the AI-RWA track", judged on "product quality, innovation, user value, and contribution to the ecosystem". The submission form has no track selector; AI-RWA membership is assigned by judges.

### Event B — Orion Builder Hackathon

Deadline **2026-09-02 23:59 UTC (~17 days away)**.

Eligibility, verbatim: "If it is an AI agent and it works, it qualifies. You are not limited to DeFi."

Judging, verbatim: "Partner judges score every entry from 0 to 10 on **usefulness, execution, and originality**, informed by the AI vetting score and community upvotes." Also: "A demo link is optional but strongly recommended. **Judges try what they can run.**"

Each entry needs a website, X profile, GitHub, and a Discord or Telegram link. Registration is a wallet signature on Base; only the wallet is bound to Base — the agent's own chain is unconstrained. Field as of 2026-08-16: two public entries against seven prizes, both read-only analyst agents on Base (automated vetting scores 86 and 72).

---

## 3. Verified on-chain context (X Layer, confirmed 2026-08-16 by RPC calls / first-party address books)

- Mainnet chain 196, testnet 1952. Gas token OKB. EVM-equivalent OP Stack, 1-second blocks, Flashblocks. TVL ~$115.8M across 32 protocols, including 20 DEXs.
- **11 tokenised equities** live with real DEX liquidity: NVDAx, AAPLx, GOOGLx, TSLAx, SPYx, METAx, SNDKx, MSTRx, CRCLx, COINx, AMZNx. ~$3.8M total DEX liquidity, ~$68M market cap, 3,800+ holders. Backed 1:1 by custodied shares; issuer publishes proof of reserves; retail redemption requires KYC and a $5,000 minimum.
- **Uniswap v3 and v4 both live** (v4 PoolManager `0x360e68faccca8ca495c1b759fd9eee466db9fb32`, plus PositionManager, Quoter, StateView).
- OKX Onchain OS CLI (v4.4.2) provides, among others: a DEX aggregator with quote and swap, market data, signals, social sentiment, security scanning, portfolio and wallet APIs, x402 payments, ERC-8004 registry, an MCP server mode.

**Not verified (treat as open questions):** per-pool depth and venue of xStock liquidity (slippage on a given exit size is unknown); whether X Layer supports EIP-7702 delegation; whether any measured demand exists among the 3,800+ holders for automated exit tooling.

---

## 4. The builder

One person, ~5.7 days for Event A. Prior result: a Uniswap v4 hook prize at the Uniswap Hook Incubator (UHI8) — Solidity, v4 hooks, ERC-6909 flash accounting. Existing empty TypeScript monorepo (`apps/web`, `apps/server`, `apps/mcp-server`, `contracts/`). No project X account, website, Discord or Telegram yet. Wallet currently unfunded.

---

## 5. The proposal — NIGHTDESK

One-line: an agent that monitors breaking news for a holder's tokenised equities around the clock and executes a pre-authorised, contract-bounded protective exit when it judges an event material.

**Problem statement:** tokenised equities on X Layer trade 24/7; the underlying equities trade ~6.5 hours per weekday, and their holders sleep. Material adverse news (earnings misses, halts, fraud disclosures, M&A collapse) can break at any hour. A conventional stop-loss triggers on price, which reacts after informed flow has already moved the pool. The proposal asserts that reacting to the news itself, before or as the pool reprices, produces better exits than reacting to price. (This assertion is not backed by a backtest; no measurement exists of how fast X Layer xStock pools reprice after off-hours news.)

**Components:**

1. **Off-chain monitoring agent.** Polls disclosure and news sources for the user's held names (SEC EDGAR filings such as 8-K, exchange halt notifications, issuer press releases, news feeds). An LLM classifies each item per holding into one of three outcomes: execute protective exit, alert only, ignore. Scheduled events (earnings calendar) inform the classification but the classification itself is performed by the LLM.
2. **On-chain mandate contract.** The user pre-authorises the agent's key with explicit bounds stored and enforced on-chain: per-name allowlist, maximum fraction of the position that may be sold, minimum acceptable price (floor), and an expiry after which the authority lapses. The contract rejects any call outside these bounds; the agent's key cannot transfer funds to itself or to third parties.
3. **Execution path.** Within the mandate, the agent sells the bounded amount of the affected xStock into USD₮0 via the OKX DEX aggregator (Uniswap v4 is an alternative route).
4. **Decision log.** Every classification (including "ignore") is recorded with a hash of the triggering evidence; executed actions store the evidence hash on-chain alongside the transaction.
5. **Minimal web UI.** Mandate setup (select names, set bounds, sign) and a decision-log viewer.

**Explicitly cut from the 5.7-day scope:** hedging strategies (collars, puts), re-entry logic after an exit, mobile or push notifications, multi-wallet support, any strategy beyond the single bounded protective exit.

**Demo plan (what a judge runs):** judge funds a testnet wallet with NVDAx, signs a mandate with visible bounds, then injects two synthetic headlines into the agent's input: one non-material, one material. The judge observes the first classified as ignore with no transaction, and the second produce an on-chain exit within the mandate's bounds, with the evidence hash recorded.

**Event B submission shape:** the monitoring agent is the submitted AI agent; its on-chain effect is executing bounded exits under the mandate contract. Event B's deadline is ~11 days after Event A's.

---

## 6. Related factual record

From a 242-row corpus of recent Web3 hackathon winners (57 hackathons), and from a prior candidate for these same two events:

- **ALMA** (ETHGlobal Cannes 2026 finalist, plus a Uniswap Foundation prize): an autonomous rebalancing agent for Uniswap v4 LP positions; one EIP-712 signature under EIP-7702 registers an agent key against a selector whitelist with a 30-day expiry, bounding the agent to an exact call sequence.
- **Aegis Protocol** (Good Vibes Only: OpenClaw Edition, 3rd place): an agent on BNB Chain that monitors DeFi positions, classifies threats with an LLM, and cross-checks the API price against an on-chain DEX price before executing a protective transaction.
- **maki** (ETHGlobal Cannes 2026 finalist): a hardware-signed DeFi agent whose architecture prevents the model from constructing transaction calldata; tools invoke typed deterministic adapters and signing sits behind schema-strict IPC.
- **EXITPROOF** (prior candidate for these same two events, abandoned): measured executable exit depth for tokenised assets with a deterministic engine; an LLM summarised the results. It was scored on Event A's rubric by two agents before abandonment; the recorded reasons for rejection were the deterministic role of the model and the absence of an existing on-chain consumer.
- Corpus counts: 68 of 242 rows mention agents, 47 autonomy; corpus notes record "we metered it with x402", "we registered an ERC-8004 identity", and "we exposed it over MCP" as claims that recur without winning on their own.

---

## 7. Known open questions (unresolved as of 2026-08-16)

1. LLM misclassification has no quantified error rate in either direction: a false positive sells part of a healthy position (bounded by the mandate but still a realised loss plus fees and slippage); a false negative misses the event entirely.
2. No backtest compares news-triggered exits against a plain price stop-loss on these pools; the core performance claim is unmeasured.
3. Per-pool xStock liquidity depth is unknown; a bounded exit on a thin pool may itself move the price materially.
4. The mandate contract's delegation mechanism on X Layer is undecided (session-key contract vs EIP-7702, whose availability on chain 196 is unverified).
5. The agent operator (the builder) runs the off-chain monitoring and holds the agent key; the trust and liability position of automatically selling a user's assets is undescribed.
6. Event A requires mainnet launch within the window; the builder's wallet is currently unfunded (gas is OKB).

No preamble. Produce the scores, justifications, and verdict in the order given in §1.
