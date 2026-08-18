# AFTERHOURS — Full Idea Specification

Audience: an AI agent (or human) with **zero prior context**. This document is the single source of truth for what AFTERHOURS is, why every design decision was made, what is deliberately excluded, and what remains unproven. Read §3 ("What it is NOT") before forming any summary of the idea.

Status: **locked as the chosen idea** (2026-08-16), scope revised 2026-08-17 after round 6. Companion file: `afterhours-validation-prompt.md` (the neutral brief used for external scoring; that file asks for scores, this file explains). The two files must stay in sync on facts and scope; they deliberately differ in voice — the brief states, this file argues.

---

## 1. One-line and one-paragraph definition

**One line:** AFTERHOURS is a corporate-events oracle for tokenised equities on X Layer — three independent AI parses turn SEC disclosures into on-chain event state whose factual fields are bonded against the source document itself and carry a published per-field agreement level; a Uniswap v4 hook, a per-address holder digest, a forward calendar of scheduled events and a public X feed consume it; a historical study measures how long the pool stays stale after a disclosure, and a live scoreboard measures how far the feed runs ahead of the 24/7 reference price from day 1 onward.

**One paragraph:** Tokenised US equities (NVDAx, MSTRx, etc.) trade 24/7 on X Layer, but the companies behind them publish disclosures — 8-K material events, Form 4 insider trades — almost exclusively while the US stock market is closed (~97% of the last year's 8-Ks; see §7). Nothing on-chain knows those documents exist, and the pool goes on quoting its old price for a measured median of 4.6 minutes afterwards (full n=46 sample, 2026-08-17 — see §7 and `outputs/05-build/reaction-latency-study.md`). AFTERHOURS runs an agent that watches SEC EDGAR, parses each filing three times with independent LLM calls into structured factual fields (event type, effective date, amounts, affected token), compares those parses field by field, and posts the result on-chain with a bond anyone can take by proving the fields don't match the linked document. Consumers then react: a v4 hook widens swap fees inside a hard-bounded band during grave events, a holder digest answers "what happened to the tokens at this address while you were away" with no wallet connection, a forward calendar exposes the dates the same filings announce for the future, and an X bot publishes every parsed event. Two measurements sit underneath, deliberately separated: a retroactive study of how long the pool stays stale (from historical trades) and a prospective one of how far the feed leads the reference price (from an index series recorded from day 1).

---

## 2. The problem, precisely stated

1. [Fact] 11 tokenised US equities trade on X Layer DEX pools 24/7. The underlying stocks trade ~6.5 hours per US weekday.
2. [Fact] The 10 corporate underlyings filed 171 8-K reports in the last 365 days; **~97% of them were accepted by SEC while the US market was closed** (companies deliberately file after hours). An independent recount gives 166/171 = 97.1% with a naive DST model and no holiday calendar; the earlier figure was 168/171 = 98.2%. Use "~97%" unless the classifier is published (§7). They also filed 15 8-Ks and 45 Form 4s in just the last 30 days.
3. [Fact] **One class of corporate action is already solved, and the spec must say so.** NVDAx is a rebasing token whose `multiplier()` the issuer updates for splits and dividends; wNVDAx is a share-denominated vault over it whose `convertToAssets(1e18)` equals that multiplier to all 18 digits, read live in the same call (verified on-chain 2026-08-17, §7). A 4:1 split therefore multiplies the multiplier by 4 while each NVDAx is worth a quarter, leaving the wrapper's dollar price unchanged; a dividend produces gradual accrual, not a gap. **The mechanical class needs no oracle and the pool is structurally insulated from it.**
4. [Fact] What on-chain state does *not* carry is the **information class**: whether a given 8-K is material and why, when earnings are scheduled, what insiders transacted, whether a halt is in force. No multiplier update encodes any of that. These exist only in documents.
5. [Inference] Therefore the window where disclosure happens is exactly the window where only 24/7 venues (including on-chain pools) are trading, and those venues' contracts are blind to the documents.
6. [Fact] Parsing free-text SEC filings into structured fields has no deterministic implementation. This is the task the LLM performs, and it is why AI is load-bearing here rather than decorative.
7. [Inference] The lead-time claim splits into two classes with very different evidentiary status, and conflating them was a weakness of earlier drafts. **Unscheduled events** (8-K materiality, Form 4) have a lead time in seconds-to-minutes whose sign is genuinely unknown. **Scheduled events** (ex-dates, split effective dates, earnings times) are announced inside the same filings days-to-weeks ahead; that interval is legible in the document and needs no microstructure argument.
8. [Fact] **Measured 2026-08-17, full pre-registered sample (n=46, all 10 underlyings): the pool stays stale for a median of 4.6 minutes after a filing (5.9 min for 8-Ks, 3.7 min for Form 4s), and 14 of 46 (30%) sampled events did not trade at all within an hour** (§7, `outputs/05-build/reaction-latency-study.md`). This is the concrete size of the window the product addresses, and it is the one number in this file that was measured rather than assumed. Per-ticker spread is wide — GOOGLx saw no trade in 5 of its 6 filings — which itself supports the pool-staleness reading over a feed-speed reading (see point 5 below and §4.8b).
9. **What IS and is NOT claimed:** the markout study (§4.8c, `outputs/05-build/markout-study.md`) measured what this staleness costs LPs — median $0.06 loss per event at the 60-minute horizon (n=32), small for the typical event but concentrated in two large first trades that supply most of the aggregate dollar total. Nor is it claimed that the agent demonstrably outruns the price — the 4.6-minute figure measures pool inactivity, not agent speed, and the genuine lead-time comparison only starts accumulating from day 1 (§4.6). The ~97% figure locates where disclosure happens; it does not by itself prove on-chain mispricing.

---

## 3. What AFTERHOURS is NOT (misreading guards)

Each item below is a plausible misreading that must not appear in any summary of this idea:

- **Not a price oracle and not price prediction.** It never posts a price and never predicts one. It posts *document-derived event state*. A separate 24/7 index price from OKX exists and is used only as a deterministic input and as the scoreboard's comparison reference.
- **Not a claim that splits and dividends are unhandled on-chain.** They are handled, by the issuer's multiplier, and the wrapper insulates the pool's price from them entirely (§2.3, §7). Any summary saying "corporate actions are invisible on-chain" is wrong and will be falsified by a judge in one contract call. The gap is the *information* class only.
- **Not the first system to parse documents into on-chain state with an LLM.** Chainlink runs this pattern with Swift, Euroclear, DTCC, UBS and 24 institutions, with multi-model consensus, against a stated "$58 billion corporate actions problem" (§7). Claiming novelty for the mechanism is false and checkable. The defensible claims are the target (24/7 retail DEX pools and holders, not institutional asset servicing), the source (SEC EDGAR directly, including 8-K materiality and Form 4, not issuer/custodian feeds), the consumer (a contract that acts on the record, not a record handed downstream), and the treatment of disagreement (published, not resolved away).
- **Not a claim that the v4 pool has external LPs.** It holds the builder's seed and nothing else. It is a demonstration that the registry is consumable by a contract. Every user-value claim rests on §4.4, §4.5, §4.7 and §4.8 instead.
- **Per-field model agreement is a confidence signal, not a correctness proof.** Three independent parses can agree and still be wrong the same way. Do not describe agreement as verification.
- **Not "AI decides the swap fee".** The fee is a **deterministic, hard-bounded policy over the bonded factual fields** (form type, event type), with a fixed min/max fee band and per-event rate limit enforced in the hook contract. The model's severity grade only modulates the fee *within* that band. The model cannot push fees outside limits a judge can read in Solidity.
- **Not a bet on price reaction.** The bond does NOT settle against price moves. It guarantees **parse fidelity only**: anyone who shows, within the challenge window, that the posted structured fields don't match the linked source document (URL + content hash are on-chain) takes the bond. Ground truth for slashing is the document itself. (An earlier design settled bonds against realised price moves; it was rejected — see §9, decision D3.)
- **Not protection for existing LPs (yet).** All current tokenised-equity liquidity sits on Uniswap **v3** pools, which cannot host hooks. The hook protects only a newly created v4 pool that the builder seeds. Existing v3 LPs are served by the *feed* (readable, free) and, in the Event B window, by a published sentinel A/B experiment (§6) — not by the hook.
- **Not a marketplace, not x402-metered as a headline, not "we registered ERC-8004" as a selling point.** ERC-8004 registration happens as a one-line CLI action, deliberately not marketed (a 242-row winner corpus records these as dead novelty claims).
- **Not dependent on the agent economy existing.** Consumers are LPs, holders, and the builder's own hook — not other AI agents.
- **The severity/direction grade is unbonded model judgment.** This is a disclosed, deliberate asymmetry: facts are bonded, judgment is published with a track record. Do not describe the grade as bonded.
- **The system is centralised at MVP** in three disclosed places: single EventState signer key, named challenge-resolver key, operator-recorded scoreboard reference timestamps. Do not describe it as trustless beyond the parse-fidelity bond mechanism.

---

## 4. Architecture — components in full

### 4.1 Event agent (off-chain service)

- **Sources (Event A scope):** SEC EDGAR only — form types **8-K** (material corporate events) and **4** (insider transactions) — via the EDGAR submissions/full-text APIs, which carry second-precision acceptance timestamps. Plus OKX's 24/7 aggregated index price for the tokens (deterministic input, verified available via the `onchainos` CLI).
- **Live coverage (Event A):** **NVDAx and MSTRx** only. NVDAx because NVIDIA's scheduled 2026-08-26 earnings anchors the Event B demo; MSTRx because MicroStrategy is the set's highest-frequency filer (5 8-Ks in 30 days, 72 in the year), making real live events during the 5-day Event A window probable rather than hoped-for. The other 9 names ship as **configuration entries** (visible in the registry, not polled) — which is also the onboarding mechanism for each new listing: a config row, not code, with a stated 24-hour coverage commitment.
- **LLM tasks (the AI core):** (a) parse each filing's free text into structured factual fields: event type, effective date(s), declared amounts, affected token; (b) extract **dates announced for the future** (dividend record/payment dates, split effective dates, announced earnings times) that feed the forward calendar (§4.4); (c) separately emit a **severity tier and direction grade** (e.g. NORMAL / ELEVATED / GRAVE, positive/negative/unclear). Tasks (a) and (b) have no deterministic substitute; task (c) is judgment and is treated as such (unbonded, tracked).
- **Three-way parse with per-field comparison.** Every filing is parsed **three times by independent model calls**, and the results are diffed **field by field**, never document by document. All three agree on a field → posted with a high agreement level. They disagree → the disagreement is recorded alongside the value. A **key** field disagrees → the state is **not auto-posted**; it queues for manual review. Rationale, in order of weight: the bond is real money, so a contested field must never reach the chain unreviewed; a unanimous-but-wrong parse is defensible in a dispute record while a contested one is not; and disagreement is itself signal, because a filing three independent parses read differently is by that measure an ambiguous filing. Cost was never the constraint — at ~60 filings/month across the full set and 2 names live, three-way parsing against Claude Opus 5 (the original design target) was verified at roughly a two-figure dollar sum for the whole Event A window, so there was never a reason to run a single parse against a bonded post. **Current model (2026-08-17, temporary): Google Gemini, Flash tier, chosen because it requires no billing setup — Claude required payment and Gemini's free tier does not (SERVICES.md SVC-004). Migrating to Claude Opus 5 is tracked as task-tracker.md P1.11 (gated on P1.10, billing setup) — not on the critical path for either event; this is a provider swap, not a design change — the three-way parse and schema-guaranteed structured output work the same way on either provider.**
- **Pre-registration:** severity thresholds, settlement tolerances, and the scoreboard's "index reaction" definition are published *before* any data is collected, so the record cannot be retrofitted.
- Scheduled items (market calendar, published earnings dates, announced ex-dates) are handled deterministically once parsed.

### 4.2 Bonded EventState registry (on-chain, X Layer)

- Each posted EventState contains: token, event type, structured fields, **per-field agreement level**, severity grade, source document URL, source document **content hash**, timestamp, and any future dates the filing announced (§4.4).
- **Agreement is published, not resolved away.** This is a deliberate divergence from the Chainlink approach (§7), which drives extracted records toward a single attested answer with human attestors. Both designs are defensible; ours is cheaper, keeps the ambiguity visible to consumers, and gives the hook a bonded input it can price against. Do not present published disagreement as superior — present it as the choice a solo builder with a bond can actually defend.
- Each post carries a **USD₮0 bond guaranteeing parse fidelity**: during a fixed challenge window, anyone who demonstrates the structured fields do not match the linked document takes the bond. No price feed, no operator number, sits in the slashing path — the document is the ground truth.
- Challenge resolution at MVP: a named resolver key (centralisation disclosed; dispute record public).
- The registry is free to read by any contract or client. It is the product; everything else consumes it.

### 4.3 Uniswap v4 hook + one seeded pool

- `beforeSwap` reads the registry and applies a fee via a **deterministic policy over bonded factual fields** — form type, event type, and the recorded per-field agreement level — with a hard min/max band and per-event rate limit in the contract; the severity grade modulates within the band only.
- One **wNVDAx/USDG** v4 pool. wNVDAx is acquired by direct DEX purchase on the existing v3 pool (verified possible; no wrap/mint interaction needed).
- **Two different v4 environments, because canonical v4 does not exist on testnet 1952 (§7).**
  - **Mainnet 196:** canonical PoolManager `0x360e68…fb32`, hook + seeded pool deployed against it. **Not required by the Event A submission deadline** — the official FAQ states mainnet launch happens "subsequently" (§6, REF-027), so this is scheduled for after 2026-08-21 rather than gating submission. Still worth doing early if time allows, since it strengthens the AI-RWA grant narrative, but it is no longer a fatal-risk item.
  - **Testnet 1952:** the builder **deploys their own PoolManager** (v4-core is permissionlessly deployable, ~24 KB, testnet OKB only), then the same hook and a pool with mock tokens against it. This is what the judge actually swaps on in the demo (§5.3).
  - The alternative considered and rejected: registry-only on testnet with the pool on mainnet. It satisfies "testnet then mainnet" for the project, but it removes the swap from the demo, which is the only step where a judge *sees* the fee move. The extra cost of deploying a PoolManager is one `forge create` against a chain that already works, and the builder has v4 deployment experience (UHI8). Take the demo.
  - **State plainly in the submission that the testnet PoolManager is the builder's own deployment, not canonical Uniswap.** A judge who discovers that unaided reads it as misrepresentation; a judge who is told reads it as competence.
- The builder's proven specialty (UHI8 v4-hook prize) makes this the cheapest component, not the riskiest — which is exactly why it is scheduled **after** the measurement work (§5.1). It is the component least at risk from being built late.
- **This pool holds the builder's seed and nothing else, and the submission says so.** It demonstrates that the registry is consumable by a contract. It is not evidence of user value, and presenting it as such is the fastest way to lose the user-value criterion (a prior scoring round marked exactly this).

### 4.4 Forward event calendar (on-chain read)

- The same parse that records what happened (§4.1 task b) also records **dates the filing announces for the future**: dividend record and payment dates, split effective dates, announced earnings times.
- Exposed as a queryable forward read: *what is the next scheduled material event for this token, and when* — readable by any contract or client, same bond and same document hash as any other field.
- **Why this exists.** It moves part of the value claim off ground that has never been measured. The unscheduled lead time is seconds-to-minutes and unproven; the scheduled lead time is days-to-weeks and legible in the source document. One worked instance already sits inside the submission window: NVIDIA's 2026-08-26 after-close earnings is announced *now*, so the registry answers this query correctly on submission day with nothing pending.
- **Honest limit, and it must be stated in the pitch.** Corporate calendars are freely available off-chain, everywhere, for free. The claim is not that the calendar is novel; it is that this one is bonded state a contract can read. That is the same "demand for the data class ≠ demand for this delivery" caveat that applies to the X feed (§4.7), and it applies here with equal force.

### 4.5 Holder digest (per-address, no wallet connection)

- Paste an address → the page reads that address's token balances by RPC, joins them against the registry, and returns only the events touching tokens that address actually holds. Each event links to both its source document and its on-chain post. No signature, no connection, no gas, no account.
- **Why this exists.** It is the one surface that is useful at zero adoption. A feed is broadcast: it is worth nothing until someone follows it, which cannot be manufactured in the window. A per-address answer is worth something on first use, to the first user, with no network effect required. A judge can exercise it in seconds against any of the 1,663 existing NVDAx holder addresses (§7) while holding no tokens and no funded wallet.
- Previously deferred to the Event B window; moved into Event A scope in round 6 because it is cheap (RPC read + join + render, no new contract) and attacks the lowest-scoring criterion directly.

### 4.6 Lead-time scoreboard (public web page, no wallet needed)

- Two columns per event: (1) timestamp the agent posted the event on-chain, (2) timestamp the 24/7 index first "reacted" per the pre-published reaction definition. Reference timestamps operator-recorded until detection is automated (Event B).
- **This is where the true lead-time claim lives, and it works only going forward.** The index endpoint returns spot with no history (§7), so it cannot be backtested — but polling and storing it from day 1 builds the continuous series that §4.8b could not have. Unlike sparse on-chain trades, the index moves whether or not anyone touches the pool, so the comparison is meaningful. **Start the poller on day 1 even though nothing consumes it yet; every hour not recorded is a permanently lost hour.**
- Explicitly labelled analytics; never connected to slashing.
- The landing page states the closed-hours evidence honestly: disclosure lands in closed hours (~97%, with the classifier published, §7); per-hour price intensity does not (see §7 caveats).

### 4.7 Event feed on X (+ static Telegram)

- The **mandatory** project X account (Event A requirement) is itself a product surface: a bot posts every parsed event — 8-Ks and Form 4 insider trades — with its on-chain transaction link.
- Rationale with demand evidence: parsed Form-4/insider data has large demonstrated retail demand off-chain (Unusual Whales: 3M+ X followers; ecosystem: OpenInsider, secform4.com, Finviz, InsiderFinance). No existing tracker ties this data class to the on-chain tokenised versions of the same equities. (Caveat: this proves demand for the data class, not for this specific feed.)
- A Telegram channel exists as a static link (Event B requirement); posting is manual until the Event B window.

### 4.8 Evidence pack (pre-deadline deliverable, predeclared method)

Three studies published with the Event A submission, results published regardless of outcome:

- **(a) Parse-accuracy sample:** the parser run over a predeclared ~30-filing sample (drawn from the year's 171 filings, MSTR-heavy), reporting field-level accuracy **and the inter-model agreement rate** from §4.1.
- **(b) On-chain reaction latency** — renamed from "lead-time backtest"; the rename is the substance, see below. For every filing whose second-precision EDGAR acceptance timestamp falls inside that token's available price window (§7), the interval between document acceptance and the **first on-chain trade in the reference pool**, reported as a distribution: median, spread, and **the count of events with no trade at all inside the window** — which is a finding, not missing data.
- **(c) Markout study — complete 2026-08-17, `outputs/05-build/markout-study.md`:** realised LP losses on the events identified in (b) — widened to all 32 qualifying events across their own reference pools (not just wNVDAx's n=2), reported alongside the named wNVDAx case. Median 60-minute net markout −$0.06/event, cents-scale for the typical event, with 76% of the aggregate dollar total concentrated in two large first trades rather than spread evenly. This is where the dollars are, and after the rename it is the headline, not (b).

**Why (b) was renamed, and why the rename matters more than it looks.** The original design measured *lead time*: document publication versus price reaction, offered as proof the feed runs ahead of the market. The 2026-08-17 pilot measurement in §7 killed that reading. An on-chain price cannot move unless someone trades, and the first trade after a filing arrived at a median of 5.4 minutes in the 7-filing pilot, with 2 of 7 events seeing no trade for an hour. The interval measures **trade arrival**, which is a property of pool liquidity, not feed speed. Decisive test: a feed four minutes slower produces nearly the same number. A quantity that does not respond to the variable it allegedly measures is not evidence about that variable.

The same number supports a different claim cleanly: **the pool quotes a stale price for a median of several minutes after a disclosure, and sometimes for over an hour.** That is a direct statement about pool behaviour, which is exactly what was observed, and it needs no assumption about the agent at all.

**Full n=46 study now complete (2026-08-17)** — see §7 and `outputs/05-build/reaction-latency-study.md` for the full accounting. Result: median 4.6 min overall (5.9 min for 8-Ks, 3.7 min for Form 4s), 14/46 (30%) no trade within ±60min. The full sample confirms rather than overturns the pilot's reading — the pilot's 5.4 min / 2-of-7 (29%) sits inside the same range. A real coverage gap was found during this run (12 of the 14 no-trade events initially had an unswept RPC chunk) and closed by re-sweeping before the count was accepted; see the doc for the full disclosure.

Three consequences:

- **(b) stops being the headline and becomes the setup for (c).** Staleness is not itself a loss — nobody is trading during it. The loss lands on the *first* trade after the window, which is disproportionately likely to be an informed trader, because uninformed flow arrives at random while informed flow arrives right after news. (c) measures that in dollars.
- **The 14 no-trade events become the strongest line in the study**, not discarded rows: 30% of filings saw the pool not register them for a full hour. GOOGLx is the extreme case — 5 of its 6 filings saw no trade at all.
- **The genuine lead-time claim survives, but only prospectively.** The OKX index is continuous yet has no history (§7), so it cannot be backtested — but the operator can poll and store it from today, which is what the live scoreboard (§4.6) does. So: **(b) measures reaction latency retroactively from trades; §4.6 measures true lead time prospectively from a self-recorded index.** Two methods, two horizons, both valid. The error was using sparse historical trades to make a lead-time claim.

**Sample design (settled by the 2026-08-17 pilot, executed as planned):**

- **Backtest coverage is all ten underlyings; live polling coverage stays at two names.** These are independent choices — the backtest is offline and historical, so it does not require the agent to be polling that token. Restricting the backtest to NVDAx and MSTRx would have given n = 10, which is not a distribution. Widening gave **n = 46 at no extra build cost** (same script, longer CIK list) — TSLA ended up with zero qualifying filings in its price window, so 9 of the 10 underlyings actually contributed data.
- **Pre-registered split by form type, named as the primary measurement before running.** 34 of the 46 events are Form 4 insider transactions, which are routine and frequently move nothing. The **8-K subset (n = 12) is the primary measurement**; Form 4 is secondary. Both were published as run.
- **The power limit, stated rather than hidden.** Twelve 8-Ks is a small sample and the contribution is lumpy (CRCL alone supplied 12 of the 46 total, all Form 4). Reported as a distribution with the sample size attached, per-ticker breakdown included, never as a single headline number.

**Two constraints that must be respected or (b) is worthless:**

1. **Pull prices from v3 Swap events by RPC in targeted ±60-minute windows, not from the trades API.** The trades endpoint reaches back 3.4 hours and has no pagination (§7). Targeted windows cost ~72 getLogs calls per event against the 100-block cap, ~3,300 calls for the whole study.
2. The reference series must be **wNVDAx-denominated**. Because that multiplier drifts upward (§7), an NVDA-denominated reference compared against wNVDAx trades would record multiplier accrual as price movement and manufacture fake lead time. wMSTRx needs no such correction — its multiplier has never moved.

Priority: (a) and (b) sit **above** the v4 hook in build order (§5.1); (c) follows. Whatever is unfinished ships in the Event B window.

### 4.9 Data flow (end to end)

```text
SEC EDGAR (8-K / Form 4, second-precision acceptance time)
        │  poll
        ▼
Event agent ── 3× independent LLM parse ──► field-by-field diff
        │                                        │
        │                          key field disagrees → manual review queue
        │                          all agree / minor diff → carry agreement level
        │      + LLM grade → severity/direction (unbonded)
        │      + future dates announced by the filing
        │  sign + bond (USD₮0)
        ▼
EventState registry (X Layer)  ←── challenge: fields vs document hash → bond to challenger
        │ read                     (resolver key adjudicates, MVP)
        ├────────────► v4 hook: bounded fee policy over fields + agreement → wNVDAx/USDG pool
        ├────────────► Holder digest: address → balances → events touching them
        ├────────────► Forward calendar: next scheduled event per token
        ├────────────► X bot: post event + tx link
        └────────────► Scoreboard: post-time vs 24/7 reference reaction time

Offline, on historical data only:
  EDGAR acceptance times × per-trade wNVDAx history ──► lead-time backtest ──► markout study
```

---

## 5. Scope plan

### 5.1 Event A scope (~4.5 days as of 2026-08-17, deadline 2026-08-21 23:59 UTC)

Everything in §4 as written, with these boundaries: EDGAR only; NVDAx + MSTRx live; challenge flow = bare contract call (no UI); scoreboard static; Telegram manual; backtest bounded by available price history.

**Execution order — day 1 is eligibility, before any feature code:** create the X account; claim testnet OKB from the faucet; deploy your own PoolManager on testnet 1952 with mock tokens (§4.3, needs no real capital); create Event B assets (website shell, GitHub, Discord/Telegram). These are the only items that produce *ineligibility* rather than a low score. **The mainnet wNVDAx purchase, seed transaction, and mainnet wallet funding are no longer day-1 eligibility items** — resolved 2026-08-17 that mainnet launch is a post-deadline ("subsequent") obligation, not a submission requirement (REF-027, §6, §9 item 11). They're worth doing before the deadline if time allows (strengthens the AI-RWA grant narrative), but do not block submission or eligibility, and real capital should not be spent under time pressure just to hit day 1. (The facts that previously gated day 1 — wMSTRx mechanics, price-history depth, v4-on-testnet — were all resolved on 2026-08-17 and are recorded in §7.)

**Also on day 1, and it is not optional: start the index poller (§4.6).** It records the continuous reference series that the live lead-time comparison depends on. The endpoint has no history, so an hour not polled is an hour that can never be recovered. It is a cron job and a table; build it before anything that feels more interesting.

**Coverage is deliberately asymmetric:** live polling runs on 2 names, the backtest runs on all 10. See §4.8b — they are independent choices and conflating them costs the study 36 of its 46 events.

**Order after day 1:** multi-model parse (§4.1) → registry (§4.2) → lead-time backtest (§4.8b) → holder digest (§4.5) → forward calendar (§4.4) → v4 hook (§4.3) → scoreboard (§4.6) → X feed (§4.7) → markout study (§4.8c).

**Why the hook is late and this is deliberate.** It is the builder's demonstrated specialty (UHI8 prize), so it is the item least likely to fail when compressed, and it carries the weakest independent user-value claim (§4.3). Measurement is the opposite on both counts. The risk this trade accepts is real and should be named: if the schedule slips badly, the submission ships with evidence and no hook, which fails "product completeness" harder than the reverse. Accepted knowingly.

**Explicitly cut from Event A:** exchange halt feeds, issuer press releases, news feeds; any keeper executing on v3 LP positions; direction-asymmetric fees; vault products; challenge UI; automatic index-reaction detection; Telegram bot; extension of the backtest to the full 171-filing year; grade calibration; ERC-8004 registration.

### 5.2 Event B window (2026-08-22 → 09-02, deadline 2026-09-02 23:59 UTC)

- **The system runs live through NVIDIA's 2026-08-26 after-close earnings** — the submission includes that real event's complete trace: document → parsed state → on-chain post → fee change → scoreboard entry.
- **Sentinel A/B test:** two equal small LP positions in the *existing v3 wNVDAx pool*; one passive, one guarded by the feed (withdrawn/narrowed on GRAVE state); both P&Ls and all tx links published after the earnings event. One controlled live comparison on the venue where LPs already are (existence proof, not statistical significance).
- Deferred items land here: grade calibration, scoreboard backfill, Telegram bot, automatic reaction detection, additional sources, ERC-8004 registration (single CLI command). The holder view is no longer deferred — it moved into Event A scope (§4.5).
- **A "full 171-filing backtest" is no longer a deferred item because it can never exist.** Price history on X Layer begins 2026-07-20 (§7); filings older than that have no on-chain price to measure against, at Event B or ever. The sample grows only as new filings arrive — roughly 1.6 events per day across the ten names, so the Event B window adds perhaps 20 more.
- **Demo friction is zero by design:** scoreboard and registry readable with no wallet; the synthetic-injection demo runs on testnet via a hosted page with a pre-funded relayer — a judge needs no OKB or tokens.

### 5.3 Demo script (what a judge experiences)

1. Judge opens the site: sees the **live record first** — real 8-Ks/Form 4s already parsed and posted on-chain during the window (statistically expected given filing frequency), on scoreboard + X feed, each row showing its per-field agreement level.
2. Judge pastes **any address** into the holder digest (§4.5) — their own, or one of the 1,663 NVDAx holders — and gets a per-token answer with no wallet, no gas, no signature. This is the first thing in the flow that is useful to a stranger.
3. Judge queries the **forward calendar** (§4.4) for NVDAx and gets NVIDIA's 2026-08-26 after-close earnings, correct on submission day, with the source filing linked.
4. Judge opens the **lead-time backtest** (§4.8b): the distribution of document-to-price intervals over historical filings, with the sample size, the reaction definition published beforehand, and the result stated whatever it is.
5. Judge triggers a **synthetic high-severity 8-K injection** for NVDAx from the hosted page (clearly marked synthetic — this path exists because real GRAVE events can't be produced on demand); watches parse → three-way diff → bonded on-chain post → swaps on testnet → sees the fee widen inside the band. A non-material injected filing produces no state change. The page states that the testnet v4 environment is the builder's own PoolManager deployment, since canonical v4 does not exist on chain 1952 (§4.3).
6. Event B judges additionally see the real NVIDIA earnings trace and the sentinel A/B result.

Order matters: real record, then a surface a stranger can use, then measured evidence, then the synthetic demo last. A validator warned that if the judge's first click is synthetic, the project collapses to "fee hook with an LLM in front".

Nothing in steps 1–4 requires a wallet, a token, gas, or an account.

---

## 6. The two hackathons this is built for

### Event A — X Layer "Build X Series, AI Season" (primary)

- Deadline **2026-08-21 23:59 UTC**. Submission via Google Form.
- **Mandatory (any failure = ineligible):** AI in product design, deployed on X Layer; **testnet** launch during the hackathon (by the deadline); dedicated active X account; submission post from that account mentioning @XLayerOfficial; form by deadline. **Mainnet launch is explicitly "subsequent"** per the official FAQ, not a deadline requirement (verified 2026-08-17, REF-027, corrects this file's earlier "testnet + mainnet during the hackathon" reading).
- **Judging criteria (verbatim, these seven, no weights):** "application of AI, innovation, product completeness, user value, integration with X Layer, growth potential, and contribution to the X Layer ecosystem".
- Prizes 30,000 / 15,000 / 5,000 USDT, plus a separately judged **AI-RWA Liquidity Grant of 50,000 USDT** (criteria: product quality, innovation, user value, contribution to ecosystem; grant must fund the project's growth on X Layer). No track selector on the form → the submission text **states AI-RWA membership explicitly**. [Inference, not re-verified in this pass] whether "verifiable mainnet tx links" are specifically required for the AI-RWA grant (as opposed to base eligibility, which REF-027 clarifies does not need them) has not been re-checked — treat as a nice-to-have for this grant category until confirmed, not a blocker for the base submission.

### Event B — Orion Builder Hackathon (secondary)

- Deadline **2026-09-02 23:59 UTC**. Registration = wallet signature on Base (~$10 ETH submission cost); only the wallet touches Base — the product lives on X Layer.
- Eligibility: "If it is an AI agent and it works, it qualifies."
- **Judging:** partner judges score 0–10 on "usefulness, execution, and originality", informed by an AI vetting score and community upvotes. "Judges try what they can run."
- Required assets: website, X profile, GitHub, Discord or Telegram link.
- Field as of 2026-08-16: two public entries for seven prizes, both read-only analyst agents on Base. AFTERHOURS differentiates by **acting on-chain** (bonded posts that change live swap pricing) and by having a real event (NVDA earnings) inside its runnable record.

### How the design maps to Event A's criteria (the design was steered by this mapping)

| Criterion | The design's answer |
|---|---|
| Application of AI | LLM does work with no deterministic substitute (free-text filing → fields); three-way parse with per-field agreement published on-chain; accuracy and agreement rate both measured |
| Innovation | Not the mechanism (Chainlink + 24 institutions already run LLM→on-chain records, §7) but the target, the source, the acting consumer, and publishing disagreement instead of resolving it |
| Completeness | Hard cuts (§5.1), eligibility-first day 1, build order declared with its risk named |
| User value | Holder digest usable by a stranger at zero adoption; forward calendar answers correctly on submission day; lead-time backtest replaces an asserted claim with a measured one; hook explicitly not counted here |
| X Layer integration | Asset class exists on X Layer and effectively nowhere else; live v4 PoolManager; mainnet pool; OKX APIs |
| Growth | Config-row onboarding + 24h coverage SLA against the announced 40+ name fast-listing pipeline; market = disclosure-data layer, not current $3.8M v3 TVL |
| Ecosystem | Free public registry anyone can consume; first stated equity v4 pool; grant plan seeds pools per listing |

---

## 7. Verified facts (checked 2026-08-16 unless a later date is stated; method in parentheses)

**Chain/protocol:**
- X Layer mainnet chain 196 (`https://rpc.xlayer.tech`), testnet 1952. Gas token OKB. OP Stack, 1s blocks. TVL ~$115.8M, 32 protocols.
- Uniswap v4 PoolManager `0x360e68faccca8ca495c1b759fd9eee466db9fb32` live on **mainnet 196 only**, `codesize` 24,009. Holdings on 2026-08-17: 16,076 USDG, 116,733 USD₮0, and **3.2811 wNVDAx** (~$740). *This corrects an earlier claim in this file of "zero equity tokens" — the balance is small but not zero.* It does not appear among wNVDAx's top-20 holders, and none of wNVDAx's five indexed pools is Uniswap v4, so the substantive point stands: there is no meaningful tokenised-equity liquidity on v4.
- **Uniswap v4 is NOT deployed on X Layer testnet 1952.** `codesize` at the canonical PoolManager address on chain 1952 = **0**, and Uniswap's official deployment list names X Layer 196 only. Testnet 1952 itself is healthy (chainId 1952, current blocks, faucet page at `web3.okx.com/xlayer/faucet` responds 200). **Consequence: the testnet leg of the hook cannot use canonical v4 — the builder deploys their own PoolManager on 1952 (§4.3).**
- The two 32-byte "pool addresses" that appear in liquidity listings for wNVDAx and wMSTRx belong to **Caliber**, a different protocol that identifies pools by `bytes32`. They are not v4 pool IDs.
- **wNVDAx trades across 5 pools and 3 protocols:** USDG/Uniswap `0x2a2b1173…` $221k (≈51% of its liquidity), RTX/DYOR Swap $107k, GPU/Uniswap $46k, USDT/Caliber $34k, USDT/Uniswap $23k. wMSTRx main pool is `0xb665a8ed2c09bd243acfee75a82ef3a8b3f63c67` (wMSTRx/USDG, $274k, 0.05%). A single-pool scan therefore undercounts activity; §4.8 pre-registers the USDG pools as the sole reference.
- **Bond and quote currencies (verified on-chain 2026-08-17):** USD₮0 = `0x779ded0c9e1022225f8e0630b35a9b54be713736`, **6 decimals**. USDG = `0x4ae46a509F6b1D9056937BA4500cb143933D2dc8`, "Global Dollar", **6 decimals**. Neither is 18 — assuming 18 anywhere in the markout maths produces a 10¹²× error.
- **Block time is exactly 1.000 s** measured across 100,000 blocks, so timestamp→block conversion is a subtraction, not a search.
- **`eth_getLogs` is hard-capped at 100 blocks** on the public RPC (`-32602 block range greater than 100`). A ±60-minute window = 7,200 blocks = 72 calls ≈ 15 s. **Roughly 10% of calls fail transiently; per-call retry is mandatory** — a no-retry run and a retry run on the same filing produced 435 s and 237 s respectively, because the failed chunks hid the true first trade.
- Largest NVDAx pool is Uniswap **v3**: `0x2a2b11730c2b6d99a58034a869dd810d7300a7b2`, USDG/wNVDAx, ~$248k, 0.05% fee (RPC `fee()`/`factory()`). NVDAx total ≈ $480k across 5 pools (OKX API). **All equity liquidity is on v3-style pools; none on v4.**
- `wNVDAx` = "Wrapped NVIDIA xStock", `0xa8ddb5cd96b5222afe198316e9a57caa642850d5`, supply ~1,580; OKX security scan: no risk flags, risk level 1, community-recognized, top-10 holders 9.5%; actively traded ($300k–$11M daily) → freely transferable, acquirable by DEX purchase (RPC + OKX APIs).
- `wMSTRx` = "Wrapped MicroStrategy xStock", `0x30987adf0b11dc698438a99ba04ec3a1ab2c7eab`, 17 holders, ~$294k liquidity; underlying `MSTRx` = `0xae2f842ef90c0d5213259ab82639d5bbf649b08e` (90 holders, ~$6.5M mcap).

**Wrapper and corporate-action mechanics (RPC calls, verified 2026-08-17):**

- `NVDAx.multiplier()` = `1000918075849099600` (≈1.000918e18). NVDAx is a rebasing token: holder balances are shares scaled by this multiplier, which the issuer updates for dividends and splits. `NVDAx.terms()` = `https://www.backedassets.fi/legal-documentation`.
- `wNVDAx.asset()` = the NVDAx address, and `wNVDAx.convertToAssets(1e18)` = `1000918075849099600` — **identical to the multiplier to all 18 digits**. wNVDAx is a share-denominated vault (ERC-4626 surface) whose conversion rate is read from the multiplier at call time, same chain, same call. No relayer, oracle, keeper or bridge sits in that path, and there is no window in which the wrapper is stale relative to what it wraps.
- **Derived:** a 4:1 split raises the multiplier 4× while each NVDAx is worth ¼, so the wrapper's dollar price is unchanged; a dividend raises the multiplier slightly, producing gradual accrual (wstETH-like drift), not a gap. **The pool is structurally insulated from splits and dividends.**
- Cross-chain multiplier sync sits outside this surface and belongs to Backed + Chainlink's **xBridge** (Dec 2025, CCIP), built to keep rebasing and corporate actions synchronised between Solana's Token2022 multiplier model and the EVM implementation.
- **wMSTRx follows the identical pattern (verified 2026-08-17):** `wMSTRx.asset()` = MSTRx, `MSTRx.multiplier()` = `1000000000000000000`, `wMSTRx.convertToAssets(1e18)` = `1000000000000000000`. Same Backed `terms()`. The multiplier is *exactly* 1.0 because MicroStrategy pays no dividend, against NVDA's 1.000918 from its small dividend — a cross-check that the mechanism is understood correctly rather than matched by coincidence. **Practical consequence: wMSTRx needs no drift correction in any study; wNVDAx does.**
- **Measurement corollary:** the multiplier drifts upward, so a wNVDAx price series is not an NVDA price series. Any lead-time or markout study must use a wNVDAx-denominated reference or it will record accrual as price movement (§4.8).

**Prior art on the core mechanism (news sources, checked 2026-08-17):**

- Chainlink runs an ongoing corporate-actions initiative with Swift, Euroclear, DTCC, UBS and, as of Sibos 2025, **24 financial institutions**: LLMs convert unstructured corporate-action data into a structured "unified golden record" delivered on-chain and moved cross-chain via CCIP, using **consensus across several models** (GPT-4o, Gemini 1.5 Pro, Claude 3.5 Sonnet in phase 1). Phase 2 adds human data-attestor and data-contributor roles driving confirmed-record accuracy to 100%. Stated target: a "$58 billion corporate actions problem".
- Dynamic-fee hooks on Uniswap v4 are an established category (Atrium Dynamic Fee, FlexFee, Minimize-LVR, Arrakis Pro): they raise fees during high volatility and lower them in quiet markets, explicitly to tax arbitrage and reduce loss-versus-rebalancing. All documented implementations key off **price-derived inputs** — volatility, volume, inventory. None keys off documents.
- Underlying NVDAx `0xc845b2894dbddd03858fd2d643b4ef725fe0849d`: 1,663 holders, ~$6.3M mcap.
- 11 names on X Layer: NVDAx, AAPLx, GOOGLx, TSLAx, SPYx, METAx, SNDKx, MSTRx, CRCLx, COINx, AMZNx — ~$3.8M DEX liquidity, ~$68M mcap, 3,800+ holders; 1:1 backed, issuer publishes proof of reserves; redemption = KYC + $5,000 minimum.

**Disclosure timing/frequency (SEC EDGAR submissions API):**
- 171 8-Ks by the 10 corporate underlyings in 365 days. The total reproduces **exactly**. The closed-hours count does not: an independent recount on 2026-08-17 using a fixed UTC-4 offset and no market-holiday calendar gives **166 (97.1%)**, against the earlier 168 (98.2%). The recount is likely an *under*count (holidays not excluded), so the true figure sits between 97.1% and 98.2%. **Publish the classifier, not just the number** — the open/closed rule with its DST and holiday handling. This project's whole posture is pre-declared method; a headline percentage nobody can reproduce is the one place that posture visibly fails. If the classifier is not published, write "~97%".
- **Document sizes (fetched 2026-08-17):** real MSTR 8-K primary documents are 42–219 KB of raw HTML but only **10–15 K characters ≈ 2,500–3,700 tokens** after tag stripping, because the bulk is XBRL markup. **Strip tags before the model call** or pay ~50 K tokens of markup per filing to deliver 3 K tokens of content. At three parses this puts a filing at roughly $0.15 and the whole Event A window under $10.
- Last 30 days: 15 8-Ks + 45 Form 4s (~0.5 + ~1.5/day). MSTR: 72 8-Ks/year, 5/month recently.
- Acceptance timestamps are second-precision.

**Price behaviour (OKX kline API, wNVDAx, 298 hourly candles, 08-04→08-16):**
- 74.7% of total absolute hourly movement in closed hours — but closed hours are 4.5× more numerous and per-hour intensity is *higher* in open hours (0.39%/h vs 0.26%/h). Use only with this caveat. One >2% closed-hours hourly move in sample. No earnings in sample.

**Calendar:**
- **NVDA earnings 2026-08-26 after close** (between the deadlines). No scheduled event for the 11 names inside 08-16→08-21. SNDK earnings (08-05) and AAPL ex-div (08-10) already passed.

**Ecosystem:**
- X Layer × xStocks strategic partnership; assets "gradually integrated", "fast-listing mechanism". OKX CEX lists 40+ tokenised stocks/ETFs trading 24/7; a continuous 24/7 off-chain reference price exists (on-chain oracle availability unverified). OKX market API serves a real-time index price for these tokens (CLI-verified).

**Demand evidence:**
- Insider/Form-4 data demand off-chain: Unusual Whales 3M+ X followers; OpenInsider, secform4.com, Finviz, InsiderFinance, InsiderScreener exist as dedicated trackers.

**Data horizon — the binding constraint on §4.8b (measured 2026-08-17):**

- **These tokens are ~4 weeks old on X Layer.** Daily candles begin **2026-07-20** for wNVDAx and wMSTRx, and **2026-07-29** for the other eight names (wAAPLx, wTSLAx, wGOOGLx, wMETAx, wAMZNx, wCOINx and peers). Requesting 299 daily candles returns only 27 and 19 respectively — the API returns everything it has. **There is no year of price history, so a 171-filing backtest is impossible in principle, not merely inconvenient.**
- Hourly candles cap at 299 points per call with no time cursor = 12.4 days reachable.
- Per-trade history via the `onchainos token trades` endpoint caps at 500 trades with **no pagination**, which reaches back only **3.4 hours** for wNVDAx (~3,600 trades/day) and 17 hours for wMSTRx (~700 trades/day). It is a live tail, not an archive. *This corrects an earlier claim in this file that per-trade history was broadly retrievable via the OKX API.*
- The archival path is **v3 Swap events by RPC**, which are permanent. The public RPC hard-caps `eth_getLogs` at **100 blocks** (confirmed: `-32602 block range greater than 100`). At 1-second blocks that is 100 seconds per call, so a full 28-day sweep would take ~24,000 calls — impractical. **Targeted windows are the answer:** ±60 minutes around one event = 7,200 blocks = 72 calls, so 46 events cost ~3,300 calls, a matter of minutes.

**Backtest sample size (EDGAR cross-referenced against the windows above, 2026-08-17):**

- Restricted to the two live names, the sample is **n = 10** (NVDA: 0 8-K + 2 Form 4; MSTR: 5 8-K + 3 Form 4). Too small to report a distribution.
- Across all ten corporate underlyings, each within its own available window, the sample is **n = 46: 12 8-Ks and 34 Form 4s.** Contribution is uneven — CRCL 12, MSTR 8, META 7, GOOGL 6, AMZN 4, COIN 3, AAPL/NVDA/SNDK 2 each, TSLA 0.

**Measured on-chain reaction latency (7 real filings, USDG pools, RPC Swap events, 2026-08-17):**

| Token | Form | Accepted (UTC) | Swaps ±60 min | Gap to first swap after |
|---|---|---|---|---|
| MSTR | 8-K | 2026-07-20T12:00:16Z | 0 | none within ±60 min |
| MSTR | 8-K | 2026-07-27T12:00:17Z | 0 | none within ±60 min |
| MSTR | 8-K | 2026-07-30T20:00:23Z | 36 | 355 s |
| MSTR | 8-K | 2026-08-03T12:00:16Z | 96 | 324 s |
| MSTR | 8-K | 2026-08-10T12:00:15Z | 16 | 237 s |
| NVDA | 4 | 2026-08-07T20:47:24Z | 185 | 428 s |
| NVDA | 4 | 2026-08-12T21:13:10Z | 69 | 222 s |

**Median 324 s (5.4 min); 2 of 7 events had no trade at all within an hour.**

This is the single most consequential measurement in this file, and it invalidated the original framing of §4.8b. **An on-chain pool price cannot move unless someone trades.** The interval above is therefore dominated by trade arrival, a property of the pool's liquidity, not by how fast the agent parses. A feed taking four minutes would produce nearly the same number as one taking four seconds — and a measurement that does not move when you change the thing it supposedly measures cannot be evidence about that thing. Hence the reframe recorded in §4.8b and D7 (§8).

**Superseded by the full n=46 pre-registered study, completed 2026-08-17** (task P2.2/P2.3; full method, per-ticker breakdown, and a disclosed RPC-coverage-gap fix in `outputs/05-build/reaction-latency-study.md`):

| Split | n | No trade in ±60min | Median gap |
|---|---|---|---|
| All | 46 | 14 (30%) | 274 s (4.6 min) |
| 8-K (primary) | 12 | 3 (25%) | 355 s (5.9 min) |
| Form 4 (secondary) | 34 | 11 (32%) | 222 s (3.7 min) |

The 7-filing pilot above is a subset of this data, not a separate measurement — the full sample confirms the pilot's reading rather than overturning it (5.4 min pilot median vs. 4.6 min full-sample median, 29% vs. 30% no-trade). It is kept here as the historical record of the measurement that triggered the §4.8b reframe.

- **The OKX index endpoint returns spot only — a single price and timestamp, no history.** So the continuous off-chain reference that would have escaped trade sparsity cannot be used retroactively. It can serve the live scoreboard (§4.6) going forward, because the operator can poll and store it from today.
- 1-minute klines inherit the same sparsity: for wMSTRx, **97 of 298 consecutive minutes contain no trade**, and 1m bars reach back only ~5 hours per call.
- **NVIDIA Q2 FY2027 earnings, 2026-08-26:** results posted ~1:20 p.m. PT (**20:20 UTC**, i.e. 20 minutes after the 20:00 UTC close), call 2:00 p.m. PT (21:00 UTC). Confirms the "after US close" anchor for the Event B trace.

**Builder context:**
- Solo builder; prior Uniswap v4 hook prize (UHI8; Solidity, v4 hooks, ERC-6909). Empty TS monorepo (`apps/web`, `apps/server`, `apps/mcp-server`, `contracts/`). As of 2026-08-16: no project X account, website, Discord/Telegram; wallet unfunded.

---

## 8. Validation history (why the design looks like this)

Five rounds against independent scoring agents (Event A x/35, Event B x/30):

| Round | Design state | Scores (two agents) |
|---|---|---|
| 1 | Risk-scoring fee hook, LLM grades news severity | pre-scoring self-assessment only |
| 2 | + bonded grades settled vs official open print | 24–27/35 · 18–22/30 |
| 3 | Reframed: corporate-events oracle; settlement vs OKX index | 24–27/35 · 22/30 |
| 4 | + parse-fidelity bond (doc = ground truth); scope cuts; X bot | 24–26/35 · 22/30 |
| 5 | + 98.2% evidence, Form 4, MSTRx, evidence pack, fee band, market reframe | 3/5 on user value (see below) |
| 6 | + three-way parse with published per-field agreement, forward calendar, holder digest, retroactive lead-time backtest; hook demoted in build order; corporate-action overclaim corrected | not yet re-scored |
| 7 | Infrastructure verification pass (2026-08-17): v4 absent from testnet → own PoolManager; lead-time reframed to on-chain reaction latency after measuring it; 98.2% → ~97%; four fact corrections | not yet re-scored |

Persistent validator criticisms that drove changes: "AI is a bolt-on" (fixed by making parsing the core), "bond bets on price, not correctness" (fixed by parse-fidelity bond), "unbonded judgment controls fees" (fixed by hard fee band + deterministic policy over bonded fields), "demo is a rig passing its own fixtures" (fixed by real-events-first demo + filing-frequency facts), "growth capped by $3.8M v3 TVL" (fixed by disclosure-data-layer framing + 40+ pipeline).

**The round-5 user-value verdict, verbatim, because it drove everything in round 6:** *"User value: 3. The value claim rests on a lead time that has not been measured even once and on a fee that protects a pool nobody but the builder has deposited into; the demonstrated demand is for off-chain Form-4 trackers, which is evidence for the data class, not for this delivery of it."*

All three clauses are correct, and the round-6 response is deliberately **not** "add more features". Two classes of fix apply to a claims-outrun-evidence problem, and only two: change the claims to ones provable inside the window (backtest §4.8b, forward calendar §4.4), or add a surface useful at zero adoption (holder digest §4.5). The third clause — no external consumer — **cannot be fixed in 4.5 days and the submission stops claiming otherwise** (§4.3). Adding sources, names, or polish would have moved nothing.

### Rejected design alternatives (do not re-propose)

- **D1 — Settle bonds against the official market open print:** no on-chain source of the print exists on X Layer; operator would supply the ground truth grading himself. Rejected round 3→4.
- **D2 — Settle bonds against realised OKX index moves:** grades whether the market moved, not whether the parse was right; correct parses the market ignores get slashed. Rejected round 4→5 (validator finding).
- **D3 — Deterministic peg to OKX's 24/7 price instead of AI (the strongest external objection):** a peg reacts to prices; it cannot know an ex-date, a halt reason, an insider sale, or an earnings time before trading reflects it, because those live in documents that have no deterministic parser. The honest residual: the *economic size* of that document-to-price lead is unmeasured (evidence pack + scoreboard measure it).
- **D4 — Protect existing v3 LPs with an executing keeper:** adds a consent/product surface that can't be built and adopted in the window; replaced by feed documentation + the sentinel A/B experiment run on the builder's own positions.
- **D5 — Leading the pitch with the 74.7% statistic:** it is a count artifact (closed hours are 4.5× more numerous); a numerate judge would discount the whole pitch. Replaced by the 98.2% disclosure-timing fact, with its own caveat stated.
- **D6 — Rebase/wrapper divergence monitor (proposed and killed in round 6, with on-chain evidence):** the hypothesis was that the wrapped token on X Layer could lag the underlying's multiplier during a split, producing a 4× mispricing window nobody watches. **Verified false**: `wNVDAx.convertToAssets(1e18)` equals `NVDAx.multiplier()` to all 18 digits, read live in the same call on the same chain (§7). There is no lag, and a split does not move the wrapper's price at all. Beyond being wrong, it was also out of scope on three counts: a different failure class (wrong accounting vs unreflected information), a different owner (the cross-chain sync layer is Backed + Chainlink's xBridge — auditing it in front of X Layer judges is an unwinnable posture), and it would have split the one-line pitch into two half-products against a "product completeness" criterion. **Do not re-propose.** What survives from the research is §2.3, §3's corporate-action guard, and the measurement corollary in §4.8.
- **D7 — Claiming lead time from historical on-chain trades (measured and abandoned in round 7):** the plan was to prove the feed outruns the price by comparing EDGAR acceptance timestamps against the first price reaction in historical trade data. Measurement showed the interval is set by trade arrival, not by information arrival: median 5.4 min to the first trade, 2 of 7 events with no trade in an hour, and a number that would barely move if the agent were four minutes slower (§7). The escape hatch of using a continuous off-chain index was closed too: the index endpoint is spot-only with no history. **Replaced by (a) on-chain reaction latency measured retroactively (§4.8b) and (b) genuine lead time measured prospectively against a self-recorded index series (§4.6).** Do not re-propose backtesting lead time from trades — the data cannot carry the claim, and a numerate judge will say so.
- **NIGHTDESK (sibling idea, not chosen):** an agent that judges news materiality and executes bounded protective exits for holders. Parked, not merged. Its spec, if ever needed: `nightdesk-validation-prompt.md`.

---

## 9. Open risks and honest limits (current, unresolved)

1. **Resolved 2026-08-17: the dollar consequence of reaction latency is now measured (P2.4, `outputs/05-build/markout-study.md`), and it is trivial for the median event, not the whole picture.** On the pool named in this section's original illustrative example (USDG/wNVDAx, n=2), realised LP damage from the first post-filing trade is cents-scale (−$0.13 and +$0.01 at the 60-minute horizon) — smaller than the $20 guess this item originally floated. Across the full pre-registered 32-event sample (9 8-K, 23 Form 4), the median 60-minute net markout is −$0.06 (−9.5bps of the first trade's notional, −0.002bps of pool TVL) and 25 of 32 events show a net LP loss. The aggregate dollar sum (−$82.80 across all 32 events) is not evenly spread: two large first trades (AMZN's and AAPL's 8-K reactions, ~$1,000 notional each) supply 76% of it. The reframe in §4.8b fixed the *validity* of the reaction-latency claim; this closes the *magnitude* question it left open — the chain is real, correct, and (for the typical event) financially unimportant; the exception is the occasional large first trade, not a systematic per-filing effect.
2. **The genuine lead-time comparison has zero data until the index poller runs.** It cannot be backfilled (§7). Every result on that axis will be based on days, not months, at both submission deadlines. High-severity fee path is still demoed synthetically at Event A.
3. Severity grade is unbonded judgment; fee band caps blast radius; accuracy unknown until studies publish.
4. **Resolved 2026-08-17: the markout study ran (n=32, `outputs/05-build/markout-study.md`) and the result is small for the typical event** (median −$0.06 at 60min) — published regardless, per the original commitment. The aggregate dollar total is not evenly spread: two large first trades supply 76% of it, a concentration finding worth stating rather than smoothing into "small."
5. Single signer + named resolver + operator timestamps = disclosed centralisation.
6. Sentinel A/B is one event, small positions: existence proof only.
7. **No external party consumes anything, and none can be manufactured in 4.5 days.** The holder digest and forward calendar are useful on inspection, which is not adoption. Third-party feed consumption and follower uptake unproven; off-chain insider-data demand proves the data class, not this delivery.
8. Three parses reduce but do not eliminate bond-losing errors — independent runs can agree and still be wrong the same way. Whether any consumer acts on published per-field disagreement is untested.
9. The forward calendar restates freely available off-chain information; the only claimed difference is bonded state a contract can read, and no contract outside this project reads it today.
10. **Resolved 2026-08-17, and the answer is worse than assumed.** wMSTRx mechanics are verified and identical to wNVDAx (§7). Price history, however, begins only 2026-07-20 — these tokens are about four weeks old. The backtest sample is **n = 46 across nine names (TSLA had zero qualifying filings), of which only 12 are 8-Ks**, not the 171 the earlier plan implied — and the study has now actually run on this full sample (§7, `outputs/05-build/reaction-latency-study.md`). That is enough to publish a distribution with its sample size attached; it is not enough to make a confident claim about tail events, and the pitch must not overstate it.
11. **Resolved 2026-08-17: mainnet launch is not a fatal-risk item for Event A.** The only remaining fatal-risk eligibility items are the X account and testnet deployment/demo readiness by 2026-08-21 — both scheduled but not done. Funded mainnet wallet and mainnet launch (previously listed here) are now understood to be post-deadline obligations (REF-027) and have moved off the Event A critical path; the testnet leg runs entirely on mock tokens (§4.3), so it needs no real capital at all.
12. **Scope grew while the window shrank.** Four components were added at 4.5 days remaining and the hook was demoted below measurement. This is the most credible way the plan fails on execution rather than on concept, and it is an accepted trade, not an oversight (§5.1).
13. Field for Event A is unknown; Event B field will grow from its current two entries.

---

## 10. Quick reference

| Item | Value |
|---|---|
| X Layer RPC / chains | `https://rpc.xlayer.tech` · mainnet 196 · testnet 1952 · gas OKB |
| v4 PoolManager | `0x360e68faccca8ca495c1b759fd9eee466db9fb32` |
| wNVDAx | `0xa8ddb5cd96b5222afe198316e9a57caa642850d5` |
| NVDAx (underlying token) | `0xc845b2894dbddd03858fd2d643b4ef725fe0849d` |
| Main v3 pool (USDG/wNVDAx) | `0x2a2b11730c2b6d99a58034a869dd810d7300a7b2` |
| Event A deadline | 2026-08-21 23:59 UTC |
| NVDA earnings | 2026-08-26 after US close |
| Event B deadline | 2026-09-02 23:59 UTC |
| Bond/settlement currency | USD₮0 |
| wMSTRx / MSTRx | `0x30987adf0b11dc698438a99ba04ec3a1ab2c7eab` / `0xae2f842ef90c0d5213259ab82639d5bbf649b08e` |
| Live names (Event A) | NVDAx, MSTRx (9 others as config entries) |
| Backtest names | 9 of 10 underlyings had qualifying filings — n=46 (12 8-K + 34 Form 4) |
| Price history starts | 2026-07-20 (NVDAx, MSTRx) · 2026-07-29 (other 8) |
| RPC getLogs cap | 100 blocks (1s blocks → 100s per call); **retry every call**, ~10% fail |
| Block time | exactly 1.000 s → block = ts − offset, no search needed |
| USD₮0 (bond) | `0x779ded0c9e1022225f8e0630b35a9b54be713736` · **6 decimals** |
| USDG (quote) | `0x4ae46a509F6b1D9056937BA4500cb143933D2dc8` · **6 decimals** |
| wMSTRx/USDG pool | `0xb665a8ed2c09bd243acfee75a82ef3a8b3f63c67` · $274k · 0.05% |
| v4 on testnet 1952 | **does not exist** — deploy your own PoolManager (§4.3) |
| Measured pool staleness (full n=46 study) | median **4.6 min** (5.9 min 8-K, 3.7 min Form 4); 14/46 (30%): no trade within ±60 min |
| Index endpoint | **spot only, no history** — poll and store from day 1 |
| 8-K parse input | 2,500–3,700 tokens after stripping XBRL (raw HTML is 40–220 KB) |
| NVDA earnings | 2026-08-26, results ~20:20 UTC, call 21:00 UTC |
| Data tooling | `onchainos` CLI v4.4.2 (market, token, security APIs) · SEC EDGAR APIs · `cast` for RPC reads |
| Wrapper check (one line) | `cast call <wNVDAx> "convertToAssets(uint256)(uint256)" 1000000000000000000 --rpc-url https://rpc.xlayer.tech` — equals `NVDAx.multiplier()` |
| Parses per filing | 3 independent calls, diffed per field; key-field disagreement blocks auto-post |

**Glossary:** *EventState* = one on-chain record of one parsed filing (fields + agreement levels + grade + doc hash + bond). *Parse fidelity* = the posted fields match the linked document. *Agreement level* = how many of the three independent parses produced the same value for that field; a confidence signal, never a correctness proof. *Forward calendar* = the future dates a filing announces, exposed as a queryable on-chain read. *Holder digest* = paste-an-address view of events touching that address's holdings, no wallet connection. *Markout* = LP loss measured as trade price vs price a fixed time later. *Lead time* = interval from EDGAR acceptance timestamp to first price reaction under the pre-published reaction definition. *Sentinel A/B* = paired live LP positions, guarded vs passive. *GRAVE/ELEVATED/NORMAL* = severity tiers (final names may differ; semantics fixed).
