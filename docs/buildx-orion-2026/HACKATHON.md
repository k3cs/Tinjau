# Hackathon Profile — Build X Series AI Season + Orion Builder

- Workspace slug: buildx-orion-2026
- Created: 2026-08-16
- Profile status: research-complete

Use one label before every factual value:

- `[confirmed]`: supported by a current authoritative source or by the user for facts within their direct authority, such as team composition.
- `[inferred]`: derived from available evidence or reported by the user but still requiring independent verification.
- `[missing]`: not yet provided or discovered.
- `[conflicting]`: credible sources disagree; preserve each value and source.
- `[outdated]`: previously valid evidence is no longer current.

> Dual-event workspace. **Event A (governing)** = X Layer "Build X Series — AI Season". **Event B (secondary)** = Orion Builder Hackathon. Event A's rules govern architecture and deadline because they are stricter and earlier; Event B's deliverables are treated as an additive checklist. See `DEC-001`.

## Source Inputs

- Official page: `[confirmed]` Event A https://web3.okx.com/xlayer/build-x-series (REF-001); Event B https://orionagents.org/hackathon (REF-002)
- Rules or terms: `[confirmed]` Event B rules + FAQ read verbatim from the live page (REF-002). **Event A full Terms & Conditions (12 clauses) and all three FAQ answers read verbatim from the page DOM on 2026-08-16** (REF-001, REF-012)
- Brief or documents: `[confirmed]` User-supplied opportunity records `6a8087883093560376eb9800` (Event A) and `6a8087963093560376eb9801` (Event B), sourced from the user's research spreadsheet (REF-003)
- Screenshots: `[missing]`
- User notes: `[confirmed]` User is at ideation stage, wants one project covering both events, and asked to mine the "web3 hackathon winners" spreadsheet tab for adaptable patterns (REF-004)
- Prior-project memory: `[confirmed]` OKX Onchain OS CLI already installed; OKX Agentic Wallet already created, EVM `0xb98e2cd39d2448162b1d60706a5f241f76c73028` (REF-009)
- Last source review: `[confirmed]` 2026-08-16

## Identity

- Organizer: `[confirmed]` Event A — X Layer (OKX). Event B — Orion Agents (REF-001, REF-002)
- Format and location: `[confirmed]` Both online, worldwide (REF-001, REF-002)
- Start date and timezone: `[confirmed]` Event A 2026-08-07. Event B registration/submissions opened 2026-08-12 (REF-001, REF-002)
- Submission deadline and timezone: `[confirmed]` **Event A: 2026-08-21 23:59 UTC** (= 2026-08-22 06:59 WIB, ~5.7 days from 2026-08-16). **Event B: 2026-09-02 23:59 UTC** (= 2026-09-03 06:59 WIB, ~17 days). Event B page countdown read "18d 0h 26m" on 2026-08-15, consistent (REF-001, REF-002)
- Results date: `[confirmed]` Event A — Launch Grant volume cutoff 2026-08-31 23:59 UTC+8, official data snapshot 2026-09-01. `[missing]` Event A winner-announcement date. Event B — `[confirmed]` judging starts after deadline, winners announced on X; `[missing]` exact date (REF-001, REF-002)

## Eligibility and Rules

- Participant eligibility: `[confirmed]` Event A — 18+ or local age of majority, whichever is higher; Restricted Persons under X Layer ToS excluded; KYC may be required to receive prizes. Event B — anyone with a wallet on Base (REF-001, REF-002)
- Team-size limits: `[confirmed]` Neither event publishes a maximum. Event B allows one builder to submit multiple agents, each vetted and charged separately (REF-001, REF-002)
- Existing-code policy: `[confirmed]` Event A T&C clause 9 disqualifies *"plagiarism, unauthorized use of code"* but contains **no prohibition on reusing the participant's own prior code**. Event A still requires deployment to X Layer Testnet **during** the hackathon window. Event B publishes no policy
- Intellectual-property terms: `[confirmed]` Event A T&C clause 8: *"Participants retain ownership of their submissions"*, granting the Organizer only a worldwide non-exclusive royalty-free licence for operation, judging, promotion and reporting. **No exclusivity clause exists**, so the same project may be submitted to Event B
- Open-source requirements: `[confirmed]` Event A requires a GitHub link in the submission form. Event B requires a GitHub link per entry. `[inferred]` Neither explicitly mandates an OSI licence, but both require the repo to be reachable by judges
- Geographic or compliance restrictions: `[confirmed]` Event A excludes Restricted Persons per X Layer ToS. `[missing]` The exact restricted-jurisdiction list was not read; verify before relying on prize eligibility
- Other disqualifiers: `[confirmed]` Event A — wash trading or volume manipulation disqualifies a project from the Launch Grant. Event B — late entries not accepted; entries only from registered wallets (REF-001, REF-002)

## Tracks, Sponsors, and Technology

- Available tracks: `[confirmed]` Event A — one AI + onchain-value track, plus a dedicated **AI-RWA path** that alone qualifies for the Liquidity Grant, plus a volume-based Launch Grant. Event B — single open AI-agent track (trading, social, research, content, community tools, anything) (REF-001, REF-002)
- Target track: `[missing]` Pending Checkpoint 1
- Sponsor challenges: `[confirmed]` None separate from the grant structure in either event
- Required technology: `[confirmed]` Event A — the project **must** include AI, **must** deploy on X Layer Testnet during the hackathon, and **must** subsequently deploy on X Layer Mainnet. Event B — must be a working AI agent; registration/submission wallet must be on Base (REF-001, REF-002)
- Allowed technology: `[confirmed]` X Layer is full-EVM-equivalent OP Stack, so any standard Solidity/EVM tooling works. Testnet chain ID **1952**, RPC `https://testrpc.xlayer.tech/terigon`, gas token OKB, explorer `https://www.okx.com/web3/explorer/xlayer-test`. Mainnet chain ID **196**, RPC `https://rpc.xlayer.tech` (REF-005)
- Prohibited technology: `[missing]` No prohibitions published on either page
- Chain-ID conflict resolved: `[conflicting]` → `[confirmed]` Third-party chain lists (Chainlist, evmchainlist, rpc.info) report X Layer Testnet as chain ID **195**; official OKX docs report **1952**. Chainlist itself labels 195 "Deprecated". Resolution: use **1952** for the new OP-Stack X Layer testnet (REF-005 official beats REF-006 third-party)

## Service Constraints and Benefits

- Required third-party services: `[inferred]` Event A submission needs a live project URL, GitHub, and a dedicated project **X (Twitter) account** that must stay active — so a hosting service, a repo host, and an X account are hard requirements, not options. Event B additionally needs a **Discord or Telegram** link and a website
- Prohibited or restricted services: `[missing]` None published
- Sponsor credits or participant benefits: `[missing]` No hackathon-specific credits published on the Event A page. `[inferred]` The OKX Onchain OS developer stack (Wallet, Payment/x402, Trade, Market, OKX.AI/ERC-8004) is documented under one portal and is the organizer's own stack, so using it is the highest-signal form of "X Layer integration" for judging (REF-007)
- Evidence required for sponsor usage: `[confirmed]` Event A — an X post from the project account mentioning `@XLayerOfficial`, plus the post URL pasted into the Google Form. Launch Grant volume is measured through the **OKX DEX interface** and is anti-fraud reviewed (REF-001)
- Account, role, or permission constraints: `[confirmed]` Event B prizes are paid to the wallet that submitted the entry, and entries must come from the registered wallet. `[confirmed]` Event B submission requires a non-refundable **ignition fee of ~$10 in ETH on Base**; registration itself is a free signature (REF-002)
- Budget ceiling for services: `[missing]` Not stated by the user
- Material service facts last reviewed: `[confirmed]` 2026-08-16

## Judging and Prizes

- Judging criteria and weights: `[confirmed]` Event A — **seven criteria**, verbatim from Terms & Conditions clause 4: *"application of AI, innovation, product completeness, user value, integration with X Layer, growth potential, and contribution to the X Layer ecosystem"*. No weights published; Organizer's decisions are final. **Correction:** "code quality", "onchain data" and "market potential" appear in the spreadsheet extraction but **not** in the official terms — do not treat them as criteria. Liquidity Grant is judged separately on *"overall performance during the Hackathon, including product quality, innovation, user value, and contribution to the ecosystem"*, awarded to one best-performing project in the AI-RWA track. Event B — partner judges score 0–10 on **usefulness, execution, originality**, informed by Orion's AI vetting score and community upvotes from registered builders; judges decide (REF-001, REF-002)
- Relevant prizes: `[confirmed]` Event A, up to 300,000 USDT total — Hackathon Grant 30,000 / 15,000 / 5,000 USDT; **AI-RWA Liquidity Grant 50,000 USDT, restricted use** — the official FAQ states *"The grant must be used to support the winning project's growth and further develop the X Layer ecosystem"*, so it is growth funding, not cash, and is not directly comparable to the Hackathon Grant; Launch Grant 50,000 USDT per full 10,000,000 USDT of qualifying OKX DEX-interface volume, capped 200,000 USDT per project. Event B, 5,000 USD across seven winners — 1,500 / 1,000 / 500 and 4 × 500 (REF-001, REF-002)
- Tie-break rules: `[missing]` Neither event publishes one
- Public-voting component: `[confirmed]` Event B has one — upvotes from registered builders, one vote per wallet per entry, confirmed by signature; upvotes inform but do not decide. Event A has none (REF-002)

## Required Deliverables

- Project description: `[confirmed]` Event A — description field in the Google Form. Event B — entry description shown in the public gallery (REF-001, REF-002)
- Source repository: `[confirmed]` Required by both
- Deployed product: `[confirmed]` Event A — project URL + contracts live on X Layer Testnet, with a mainnet deployment to follow. Event B — website required, live demo optional but "strongly recommended" and judges "try what they can run"
- Demo video: `[confirmed]` Not mandatory in either event. `[inferred]` Still worth producing — Event B judges explicitly reward what they can run, Event A weighs product completeness
- Pitch deck: `[confirmed]` Not required by either event
- Live presentation: `[confirmed]` Not required by either event
- Other deliverables: `[confirmed]` Event A — dedicated active project **X account** + a public post mentioning `@XLayerOfficial` + Google Form (name, description, URL, GitHub, email, Telegram, X handle, X-post URL) at https://docs.google.com/forms/d/e/1FAIpQLSfgU_3zcXdxK0GJQxj33QeUWdEcAaYnieVe9p5cFDb2JFQa4Q/viewform. Event B — website, X profile, GitHub, Discord **or** Telegram, submission signed from the registered Base wallet, plus the ignition fee

## Critical Unknowns

- [x] Resolve eligibility and disqualifying rules. — Resolved for both events; only the Restricted-Persons jurisdiction list remains unread.
- [x] Confirm the final deadline and timezone from an official source. — Event A 2026-08-21 23:59 UTC; Event B 2026-09-02 23:59 UTC.
- [x] Confirm required deliverables and submission method. — Google Form (A); registered-wallet onchain submission + ignition fee (B).
- [x] Confirm judging criteria and intended track. — Criteria confirmed; target track still pending Checkpoint 1.
- [x] Confirm service requirements, restrictions, and sponsor benefits that could affect architecture. — X account, hosting, repo, Discord/TG, Base wallet with ~$10 ETH.
- [ ] Confirm whether Event B accepts an agent whose contracts live on X Layer rather than Base. Both current gallery entries are Base-tagged, but the written rules say "any kind of AI agent" and only bind the **wallet** to Base.
- [x] Confirm Event A's pre-existing-code policy before reusing any prior repository. — Resolved: only plagiarism and unauthorized use of others' code are barred.
- [ ] Confirm the X Layer Testnet faucet URL and that testnet OKB is obtainable in time.
- [ ] Confirm the exact "qualifying OKX DEX-interface volume" definition if the Launch Grant is targeted.

## Relevant References

- Reference IDs: REF-001, REF-002, REF-003, REF-004, REF-005, REF-006, REF-007, REF-008, REF-009, REF-010, REF-011, REF-012

## Conflicts and Resolution

- Conflicting values: X Layer Testnet chain ID — 195 (third-party chain registries) vs 1952 (official OKX docs)
- Sources involved: REF-005 (official), REF-006 (third-party aggregators)
- Resolution owner: Dien
- Resolution status: resolved — use 1952; 195 refers to the deprecated pre-OP-Stack testnet and is labelled deprecated by Chainlist itself
