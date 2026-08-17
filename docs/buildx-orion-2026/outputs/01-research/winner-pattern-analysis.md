# Winner Pattern Analysis — "web3 hackathon winners"

- Source: REF-004, **242 data rows × 51 columns**, CSV pulled in full and analysed locally
- Date: 2026-08-16 (revised — see §0)
- Method: `curl` the gviz CSV export, then facet with Python. Raw file `winners.csv`, 1.3 MB.

## 0. Correction to the first version of this document

`[Fakta]` The first version of this analysis was built on **22 rows**. That was not the corpus — it was as far as a summarising fetch got before truncating. The real corpus is **242 rows across 57 distinct hackathons**.

`[Fakta]` The conclusion that version reached — *"no catalogued project both decides and is accountable for the decision"* — is **false**. At least six rows in the full corpus do exactly that. It has been retracted and replaced by §5.

Recorded as LEARN-006.

## 1. What the corpus actually is

`[Fakta]` 242 winners / finalists, 57 hackathons, 81 distinct chain-or-ecosystem labels.

By ecosystem, top of the distribution:

| Ecosystem | Rows |
|---|---|
| Solana | 60 |
| Ethereum + sponsor ecosystems | 30 |
| Unichain (incl. Reactive variants) | ~22 |
| Midnight (Cardano) | 11 |
| Stellar / Soroban | 8 |
| **OKX / multi-chain Web3** | **2** |

`[Fakta]` Only 2 rows share Event A's organizer (Cortex, FlyBeacon, OKX AI Genesis). `[Inferensi]` So the corpus is weak as direct evidence of *this* judge's taste, and strong as evidence of what the wider Web3-hackathon field has already built. Its main use is **saturation mapping**, not taste modelling.

## 2. Theme saturation (full corpus, keyword scan over 11 substantive columns)

| Theme | Rows | Read |
|---|---|---|
| privacy / ZK | 38 | saturated |
| cross-chain | 33 | saturated |
| **x402 payments** | **32** | **saturated — table stakes, not a differentiator** |
| gaming | 31 | saturated |
| compliance / KYC / sanctions | 23 | saturated |
| social / creator | 21 | saturated |
| insurance / underwriting | 19 | crowded |
| simulation / backtest | 19 | crowded |
| tax / accounting | 18 | crowded |
| MEV | 18 | crowded |
| intent-based | 17 | crowded |
| **RWA** | **18** | crowded, but see §6 |
| agent liability / recourse | 11 | contested |
| **ERC-8004** | **8** | contested |
| agent kill-switch / revoke | 7 | thin |
| identity / personhood | 7 | thin |
| human-in-the-loop approval | 5 | thin |
| DEX aggregation / routing | 3 | thin |
| agent onboarding / no-code | 2 | thin |
| **proof-of-reserve / backing attestation** | **1** | **thinnest theme in the corpus** |

`[Fakta]` 68 of 242 rows mention agents at all; 47 mention autonomy; 23 escrow; 20 reputation; 17 attestation; 11 staking or slashing.

## 3. The single most important correction: x402 is not an edge

`[Fakta]` 32 winners use x402, and **three entire hackathons in this corpus are dedicated to it** — Cronos x402 Paytech, San Francisco Agentic Commerce x402, x402 Stacks Challenge.

`[Fakta]` What has already been won with x402: per-call service pricing (FlyBeacon, RenderGate at $0.001/render), deferred settlement of the *previous* request (router402), paywalls inside `npm install` (Xpack), per-request anonymous RPC (Umbra Gateway), private search as an MCP tool (MeshSearch), payment-event analytics (Flovia), sponsorship metered per executed action (CroIgnite), recursive agent subcontracting on Bitcoin rails (SYNERGI), agent-to-Visa-card bridging (Cards402), on-chain spend policy vaults (CleverCon, BlockHelix, AgentFabric, Messier), and stealth addresses in the agent payment path (Veil Protocol).

`[Inferensi]` Using x402 is now the price of entry in an agent hackathon, not a claim. Any submission whose novelty *is* "we metered it with x402" has been beaten at least a dozen times. It should appear in the architecture and never in the pitch's first line.

## 4. Patterns that transfer (revised, full corpus)

**P1 — Make the verdict a verifiable on-chain object, not an API response.** `[Fakta]` Cronos Shield (2nd, Cronos x402): *"a risk assessment becomes a verifiable on-chain object rather than an API response: a vault's circuit breaker can consult and verify the score"*. `[Fakta]` npmguard (ETHGlobal Cannes finalist) publishes audit verdicts as ENS subnames so *"checking a package is a name resolution rather than an API call"*. `[Inferensi]` The recurring winning move is not computing a score, it is making the score *consumable by another contract without trusting you*.

**P2 — Source verification from evidence the subject cannot fabricate.** `[Fakta]` MotivaTON (2nd, BSA-EPFL): polls GitHub commits, LeetCode, Chess.com, Strava every minute so escrow releases on evidence the user does not control. `[Fakta]` Eliver (ETHPrague, Best Hardware Usage): signs telemetry *at the sensor* so *"the argument about what happened disappears and settlement becomes automatable"*. `[Inferensi]` The strongest oracle designs in this corpus move the trust boundary to where the evidence is produced, not to who reports it.

**P3 — Separate deterministic measurement from model judgement.** `[Fakta]` Both live Orion entries lead with this (REF-008), higher AI vetting score to the one that states it most explicitly. `[Fakta]` The Dojo (2nd, BNB): *"Reputation in an agent economy has to be produced by machine-graded outcomes rather than by human review, because the transaction volume and the speed make human adjudication impossible."*

**P4 — Bond the claim, open a challenge window, pay the challenger.** `[Fakta]` Phare (ETHPrague, Future Society Award): reporter posts a bond, optimistic oracle opens a challenge window, verifier agents earn half the slashed bond. `[Fakta]` ClawMon (ETHDenver Village Winner): *"the only trust signal that scales with the value at risk is capital that can be taken away."* `[Fakta]` Mnemosyne (Open Agents finalist): staking + slashing so *"false data publication is financially costly."*

**P5 — Enforce the limit in the contract, not the application.** `[Fakta]` CleverCon (2nd, Stellar Hacks: Agents): *"Moving the spending limit from application code into a Soroban vault contract, so an agent's budget is enforced by the chain rather than by the marketplace operator."* `[Fakta]` AgentFabric (1st, Cronos x402): *"Making the permission the unit of delegation rather than the wallet."* Also BlockHelix (3rd, Solana Agent), Messier (3rd, BNB), SAP MCP.

**P6 — The filter is the product, not the index.** `[Fakta]` The Wallet Shift (ETHGlobal NY finalist) reduced **34,556 raw ERC-8004 registrations to 2,037 callable agents and then to 711 genuine services**, and states: *"A permissionless registry measures intent to participate, not participation, so the useful product is the filter rather than the index."*

**P7 — One surface both humans and agents call.** `[Fakta]` Cortex (HTTP + MCP), MeshSearch (search as an MCP tool), SuperPage (ERC-8004 + AP2 + x402 + MCP in one purchase path), Moltbet (*"CLI-first rather than GUI-first, so an agent is the primary user and a human dashboard is only an observer view"*).

## 5. Retraction: agent accountability is a crowded field

`[Fakta]` The following winners already build what the first version of this document called an open gap:

| Project | Award | What it already does |
|---|---|---|
| ClawMon | ETHDenver Village Winner | Slashable stake on agent skills; names the exact reputation-vs-stake breakpoint |
| Mnemosyne | Open Agents Finalist | Stake + slashing dispute resolution on agent data claims, with x402 |
| Phare | ETHPrague Future Society Award | Bonded falsifiable claim + challenge window + paid adversarial verifier agents |
| The Dojo | BNB Hack 2nd | Machine-graded sessions, automatic refunds below an 80% pass rate |
| Moltbet | SF x402 2nd | Staked, publicly settled agent forecasts as the reputation-generating venue |
| World of Geneva | SF x402 **1st** | Identity, reputation and validation keyed to `agentId`, accumulating across a persistent economy |
| Immunity | ETHGlobal NY Finalist | Security rules must earn authority through corroboration; every rule financially bonded |

`[Fakta]` Moltbet states the thesis directly: *"An agent's forecasting skill is unprovable until it has been staked repeatedly and settled publicly."*

`[Inferensi]` A "bonded agent claims / stake-to-act" project entering Event A now would be the eighth of its kind in this corpus, competing on execution against seven that already won. That is a bad trade when a thinner theme is available.

`[Fakta]` The Wallet Shift's number — 711 genuine services out of 34,556 ERC-8004 registrations — also means **anchoring reputation to an ERC-8004 identity is not by itself a differentiator**; the registry is 98% noise and someone already won by saying so.

## 6. Where the corpus is actually thin

`[Fakta]` **Proof-of-reserve / backing attestation: 1 row in 242.** And the 17 attestation rows are about something else entirely — credentials (AnchorShield, Satisfy), running code (VEIL VPN's TEE), training data (Omega), telemetry (Eliver), risk scores (Cronos Shield), credit (Credence).

`[Fakta]` The 18-row RWA corpus is uniformly about **structuring, liquidity and yield**: zero-slippage RWA swaps (DobDex), private-secondaries venues (ODL), real-estate debt yield (Housd), thematic baskets (Cesto), principal-protected notes (ppn.fi), equity dividend stripping (xStream), prime-brokerage intent layers (xPrime), hashrate-backed credit (HashCredit), confidential institutional tokens (RWAOS).

`[Fakta]` **Not one of the 18 verifies that the underlying asset is still there.** Every one assumes the backing and builds financial machinery on top of that assumption.

`[Inferensi]` That is the real gap, and it is structural rather than accidental: verification is unglamorous and hard to demo, so hackathon builders skip it and build the fun layer above. Event A's **AI-RWA Liquidity Grant (50,000 USDT)** is the rare brief that pays for exactly the unglamorous half.

`[Inferensi]` It also passes the "why AI" test honestly. The evidence for RWA backing is unstructured and heterogeneous — custodian statements, registry filings, auditor letters, insurance records — which is genuinely a language-model problem, not a numerical one. And it passes the "why a chain" test: the resulting score is a public input to *other* protocols' risk parameters, so it must be readable and verifiable by a contract that does not trust the issuer.

## 7. Anti-patterns the corpus establishes

- `[Inferensi]` **Novelty claims built on x402, ERC-8004, or MCP alone are dead.** 32, 8 and 14 rows respectively, including three x402-dedicated hackathons. Use them; do not sell them.
- `[Fakta]` Cortex's own recorded moat: *"Weak technically, since the architecture is straightforward to reproduce."* `[Inferensi]` Wrapping one paid upstream wins a demo and scores badly on Event A's explicit growth- and market-potential criteria.
- `[Fakta]` FlyBeacon's recorded key risk is a hard dependency on live X data through Grok, *"a platform dependency subject to terms and pricing changes."*
- `[Fakta]` The Wallet Shift's 34,556 → 711 finding. `[Inferensi]` Registering in a permissionless registry proves nothing and should never be presented as traction.
- `[Inferensi]` Sixty Solana rows and ~22 Unichain rows are irrelevant to Event A beyond mechanism vocabulary. Do not import their concepts.

## 8. Carried into Stage 2

- P1–P7 become design constraints.
- §3 kills any x402-as-headline pitch.
- §5 demotes the agent-accountability direction from "open gap" to "crowded field".
- §6 becomes the primary search direction.
