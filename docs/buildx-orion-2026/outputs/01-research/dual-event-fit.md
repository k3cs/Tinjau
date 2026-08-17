# Dual-Event Fit Analysis — one project, two submissions

- Date: 2026-08-16
- Sources: REF-001, REF-002, REF-005, REF-007, REF-008, REF-010

## 1. Can one project legally serve both?

`[Fakta]` Event A hard requirements: must include AI; must deploy on X Layer Testnet **during** 2026-08-07 → 2026-08-21; must later deploy on X Layer Mainnet; dedicated active project X account; X post mentioning `@XLayerOfficial`; Google Form with project name, description, URL, GitHub, email, Telegram, X handle, X-post URL.

`[Fakta]` Event B hard requirements: a working AI agent; website; X profile; GitHub; Discord **or** Telegram; register and submit from a **Base** wallet; ~$10 ETH ignition fee on Base per entry.

`[Fakta]` Neither event's published rules contain an exclusivity clause, a "built only for this hackathon" clause, or a prohibition on submitting the same work elsewhere.

`[Inferensi]` The requirement sets are compatible and largely overlapping. Event B's deliverables are close to a subset of Event A's, with two additions: a **Discord or Telegram community link** (Event A only asks for a Telegram handle in the form, which is not the same thing) and a **Base wallet** used for registration, submission, and prize payout.

**Deliverable union, produced once:**

| Deliverable | Event A | Event B |
|---|---|---|
| Working product + public URL | required | required (website) |
| GitHub repository | required | required |
| Project X account + `@XLayerOfficial` post | required | X profile required |
| Contracts live on X Layer Testnet | required | not required |
| Discord or Telegram community link | Telegram handle only | required |
| Base wallet + ~$10 ETH | not required | required |
| Runnable demo link | not required | optional, judges "try what they can run" |

## 2. The one unverified assumption

`[Fakta]` Both current Orion gallery entries are tagged "Base" and analyse Base addresses (REF-008).

`[Fakta]` Orion's written rules bind only the *wallet* to Base: *"Anyone with a wallet on Base"*, *"Prizes are paid to the wallet that submitted the winning entry"*. The FAQ says *"Any kind. Trading, social media, research, content, community tools... You are not limited to DeFi."*

`[Inferensi]` An agent whose contracts live on X Layer should be admissible, since the chain constraint attaches to registration and payout rather than to the agent. **This is the single assumption that could invalidate the one-project plan**, and it is listed as an open critical unknown.

**Cheap mitigation, no architecture change:** make the agent chain-parameterised at the data layer and have it also read Base. Both events then see a native project. This costs one RPC config and one chain-id switch if the agent's read path is written against a generic EVM client from the start — a Stage 4 decision, not a Stage 2 one.

## 3. Where the two judging rubrics disagree

`[Fakta]` Event A criteria: application of AI, innovation, product completeness, user value, X Layer integration, growth potential, code quality, onchain data, market potential, ecosystem contribution.

`[Fakta]` Event B criteria: usefulness, execution, originality (0–10 each), informed by an automated AI vetting score and builder upvotes.

`[Inferensi]` They agree on usefulness/user-value, originality/innovation, and execution/completeness. They diverge in one place that matters: Event A rewards **ecosystem contribution and market potential** (a primitive others build on), while Event B rewards **something a judge can run in five minutes**. A pure infrastructure primitive scores well on A and poorly on B; a slick single-purpose demo scores the reverse.

**Design consequence:** whatever is built needs a primitive underneath *and* one concrete, runnable, self-explanatory surface on top. Not a compromise between them — both, with the surface being the demo of the primitive.

## 4. Money, honestly weighted

`[Fakta]` Event A: 30,000 / 15,000 / 5,000 USDT Hackathon Grant; 50,000 USDT AI-RWA Liquidity Grant; Launch Grant 50,000 USDT per 10,000,000 USDT of qualifying OKX-DEX-interface volume, capped 200,000.

`[Fakta]` Event B: 5,000 USD total across seven winners.

`[Inferensi]` Event A carries ~98% of the available value, and its deadline is ~5.7 days away versus Event B's ~17. Event A therefore governs every scheduling and scope decision; Event B is a second submission of substantially the same artifact, eleven days later, with the extra time available for polish and a runnable demo.

`[Inferensi]` The **AI-RWA Liquidity Grant at 50,000 USDT is larger than 2nd place** and is contested by a much smaller field, since it requires a specific theme. That asymmetry is worth naming at Checkpoint 1 even if the recommendation ends up elsewhere.

`[Inferensi]` The Launch Grant is the largest number on the page and should be treated as **out of reach for a hackathon MVP**: 10,000,000 USDT of real, anti-fraud-reviewed DEX volume by 2026-08-31 is a distribution problem, not a build problem. Any plan that quietly assumes Launch Grant money is dishonest with itself.

## 5. Competitive baseline

`[Fakta]` Event B: two public entries against seven prizes on 2026-08-16, both read-only analyst agents on Base, AI vetting scores 86 and 72 (REF-008).

`[Inferensi]` Expected value per unit of effort in Event B is currently very high, but the field will grow before 2026-09-02 and this snapshot must not become a planning assumption.

`[Fakta]` Event A field size is not public — there is no entries gallery.

`[Inferensi]` Prior OKX-hackathon evidence (REF-009) says the binding risk on OKX rails is the **review queue**, not idea quality. Anything requiring OKX-side approval (ASP listing, agent registration) must be submitted with days of slack, not hours.

## 6. Capability inventory already in hand

`[Fakta]` OKX Onchain OS CLI installed; Agentic Wallet already created, EVM `0xb98e2cd39d2448162b1d60706a5f241f76c73028` (REF-009, needs a live re-check — that status line is from 2026-07-20).

`[Fakta]` `onchainos-skills` v4.2.6 installed locally with eight skills covering ERC-8004 identity, the task marketplace with stake/escrow/dispute/arbitration, x402 in four modes, MPP payment channels, a2a-pay, DEX aggregation, market data, and DeFi routing (REF-010).

`[Fakta]` Existing monorepo skeleton at `/Users/scientivan/Programming/New` with `apps/web`, `apps/server`, `apps/mcp-server`, plus empty `contracts/`, `packages/`, `services/`. `apps/mcp-server` already exists, which matters given pattern P2.

`[Fakta]` Prior UHI8 win (Veritas Protocol) — Solidity, hook architecture, ERC-6909 flash accounting, bonding-curve→CLMM graduation (REF-004).

`[Inferensi]` Solidity on an EVM-equivalent chain is proven ground for this builder. The unfamiliar surface is the OKX agent-economy API layer, and that is where Stage 4 verification effort belongs.

## 7. Open items carried to Stage 2

- Orion's tolerance for a non-Base agent chain — unverified, mitigated by design.
- Event A's pre-existing-code policy — unpublished; assume the on-chain deployment must be fresh.
- X Layer Testnet faucet reachability — unverified.
- Live re-check of the Agentic Wallet's state and balance.
