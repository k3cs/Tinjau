# Validation Brief — score one candidate against two hackathon rubrics

You have no prior context. Your task: independently validate and score the project proposal below against the official judging criteria of two hackathons. Prior evaluations of this proposal exist but are omitted; do not attempt to reconstruct them.

Today is **2026-08-17**.

---

## 1. Your task

1. Score the proposal on **Event A's seven criteria**, each 1–5, with a one-sentence justification per score.
2. Score it on **Event B's three criteria**, each 0–10 (the official scale), with a one-sentence justification per score.
3. State the single most likely reason a judge would score it lower than you did.
4. State whether the 4.5-day scope (§5) is credible for the stated builder (§4). If not, say what must be cut, and in what order.
5. Verdict: submit as-is / submit with changes (list them) / do not submit.

Do not restate this brief. Mark every claim you add as fact (with source) or inference.

---

## 2. The two events

### Event A — X Layer "Build X Series, AI Season"

Deadline **2026-08-21 23:59 UTC (~4.5 days away)**.

Mandatory requirements (failing any one = ineligible): (1) AI elements in product design, deployed on X Layer; (2) deployed on X Layer Testnet and subsequently launched on Mainnet during the hackathon; (3) dedicated X account, kept active; (4) submission post from that account mentioning @XLayerOfficial; (5) Google Form submission by deadline.

**Judging criteria, verbatim from Terms & Conditions clause 4 (these seven and no others):**

> "application of AI, innovation, product completeness, user value, integration with X Layer, growth potential, and contribution to the X Layer ecosystem"

No published weights. Prizes 30,000 / 15,000 / 5,000 USDT. Separate **Liquidity Grant of 50,000 USDT** to "the best-performing project in the AI-RWA track", judged on "product quality, innovation, user value, and contribution to the ecosystem", restricted: "The grant must be used to support the winning project's growth and further develop the X Layer ecosystem." The submission form has no track selector; AI-RWA membership is assigned by judges.

### Event B — Orion Builder Hackathon

Deadline **2026-09-02 23:59 UTC (~16 days away)**.

Eligibility, verbatim: "If it is an AI agent and it works, it qualifies. You are not limited to DeFi."

Judging, verbatim: "Partner judges score every entry from 0 to 10 on **usefulness, execution, and originality**, informed by the AI vetting score and community upvotes." Also: "A demo link is optional but strongly recommended. **Judges try what they can run.**"

Each entry needs a website, X profile, GitHub, and a Discord or Telegram link. Registration is a wallet signature on Base; only the wallet is bound to Base — the agent's own chain is unconstrained. Field as of 2026-08-16: two public entries against seven prizes, both read-only analyst agents on Base (automated vetting scores 86 and 72).

---

## 3. Verified context (confirmed 2026-08-16 unless a later date is stated; method noted per item)

**Chain and protocol surface (RPC calls to `https://rpc.xlayer.tech` and first-party address books):**

- Mainnet chain 196, testnet 1952. Gas token OKB. EVM-equivalent OP Stack, 1-second blocks, Flashblocks. TVL ~$115.8M across 32 protocols, including 20 DEXs.
- Uniswap v3 and v4 both live. v4 PoolManager `0x360e68faccca8ca495c1b759fd9eee466db9fb32`, PositionManager, Quoter, StateView.
- The largest NVDAx pool is a Uniswap v3 pool (`0x2a2b11730c2b6d99a58034a869dd810d7300a7b2`, USDG/wNVDAx, ~$221k liquidity, 0.05% fee; confirmed v3 via `fee()`/`factory()` calls). wNVDAx trades across **5 pools and 3 protocols**: USDG/Uniswap $221k, RTX/DYOR Swap $107k, GPU/Uniswap $46k, USDT/Caliber $34k, USDT/Uniswap $23k. The wMSTRx main pool is `0xb665a8ed2c09bd243acfee75a82ef3a8b3f63c67` (wMSTRx/USDG, $274k, 0.05%). Two entries in these listings carry 32-byte identifiers; they belong to **Caliber**, which identifies pools by `bytes32`, and are not Uniswap v4 pool IDs.
- On 2026-08-17 the v4 PoolManager held 16,076 USDG, 116,733 USD₮0 and **3.2811 wNVDAx** (~$740). It does not appear among wNVDAx's top-20 holders, and none of wNVDAx's five indexed pools is Uniswap v4. (An earlier version of this brief stated the PoolManager held zero tokenised-equity tokens; that figure was wrong.)
- **Uniswap v4 is not deployed on X Layer testnet (chain 1952):** `codesize` at the canonical PoolManager address on 1952 is **0**, and Uniswap's official deployment list names X Layer 196 only. Chain 1952 itself is operational (chainId 1952, current blocks, faucet page returns HTTP 200). Uniswap v4 core is permissionlessly deployable by any party.
- Bond and quote currencies (verified on-chain 2026-08-17): USD₮0 = `0x779ded0c9e1022225f8e0630b35a9b54be713736`, **6 decimals**; USDG = `0x4ae46a509F6b1D9056937BA4500cb143933D2dc8`, "Global Dollar", **6 decimals**.
- Block time is **exactly 1.000 s** measured across 100,000 blocks. `eth_getLogs` on the public RPC is capped at **100 blocks** (error `-32602`); approximately 10% of calls fail transiently, and a no-retry run versus a retry run on the same filing returned 435 s versus 237 s for the same measured interval.

**The wrapper token (RPC calls + OKX security/token APIs):** the traded asset is `wNVDAx` ("Wrapped NVIDIA xStock", `0xa8ddb5cd96b5222afe198316e9a57caa642850d5`, supply 1,544.7). OKX's security token-scan returns no risk flags; risk-control level 1 (lowest); tagged community-recognized; top-10 holders hold 9.5%. It trades actively (recent daily DEX volume $300k–$11M), so it is freely transferable, and **it can be acquired by direct DEX purchase on the v3 pool — seeding a new pool does not require interacting with the wrap/mint path.** The underlying NVDAx is `0xc845b2894dbddd03858fd2d643b4ef725fe0849d` (1,663 holders, ~$6.3M market cap).

**Wrapper and corporate-action mechanics (RPC calls to `https://rpc.xlayer.tech`, confirmed 2026-08-17):**

- NVDAx is a rebasing token: `multiplier()` returns `1000918075849099600` (≈1.000918e18). The issuer updates this multiplier to reflect dividends and splits; holder balances are shares scaled by it. `terms()` returns `https://www.backedassets.fi/legal-documentation`.
- wNVDAx is a share-denominated vault wrapper over it: `asset()` returns the NVDAx address, and `convertToAssets(1e18)` returns `1000918075849099600`, equal to NVDAx's `multiplier()` to all 18 digits. The conversion rate is read from the multiplier at call time, on the same chain in the same call. No relayer, oracle, keeper or bridge sits in that path.
- Derived from the above: on a 4:1 split the multiplier rises 4×, so 1 wNVDAx redeems for 4× as many NVDAx while each NVDAx is worth ¼, leaving the wrapper's dollar price unchanged. A dividend raises the multiplier slightly, producing gradual accrual rather than a step change. Splits and dividends therefore do not move the wrapper's price; events that change the underlying equity's value do.
- Cross-chain synchronisation of the multiplier sits outside this contract surface: Backed and Chainlink launched xBridge (December 2025, built on CCIP) to keep rebasing and corporate actions synchronised between Solana's Token2022 multiplier model and the EVM rebasing implementation (news reports, checked 2026-08-17).
- wMSTRx (`0x30987adf0b11dc698438a99ba04ec3a1ab2c7eab`, 17 holders, ~$294k liquidity) follows the identical pattern over MSTRx (`0xae2f842ef90c0d5213259ab82639d5bbf649b08e`): `asset()` returns MSTRx, and both `MSTRx.multiplier()` and `wMSTRx.convertToAssets(1e18)` return `1000000000000000000`. The multiplier is exactly 1.0, consistent with MicroStrategy paying no dividend, against NVDA's 1.000918.
- Because the NVDAx multiplier drifts upward over time, a wNVDAx price series is not an NVDA price series. A study using an NVDA-denominated reference against wNVDAx trades would record multiplier accrual as price movement. The MSTRx multiplier has not moved, so wMSTRx is unaffected.

**Tokenised equities (OKX token API):** 11 live names on X Layer: NVDAx, AAPLx, GOOGLx, TSLAx, SPYx, METAx, SNDKx, MSTRx, CRCLx, COINx, AMZNx. ~$3.8M total DEX liquidity, ~$68M market cap, 3,800+ holders across names. Backed 1:1 by custodied shares; issuer publishes proof of reserves; retail redemption requires KYC and a $5,000 minimum.

**Measured price behaviour (OKX kline API, wNVDAx, 298 hourly candles, 2026-08-04 to 2026-08-16):**

- 74.7% of the total absolute hourly log-return occurred during US-market-closed hours (243 closed hours vs 54 open hours in the sample).
- Per-hour movement intensity was higher during open hours (0.39%/h) than closed hours (0.26%/h); the 74.7% figure reflects that closed hours are ~4.5× more numerous.
- One hourly move >2% occurred while the market was closed (2026-08-05 13:00 UTC, +2.9%, ~$116k volume in the hour).
- The sample is 12.4 days. No earnings release for any of the 11 names occurred inside it.

**Disclosure timing and frequency (SEC EDGAR submissions API, checked 2026-08-16):**

- Over the last 365 days the 10 corporate underlyings (SPY excluded) filed **171 8-K reports**. The share accepted while the US market was closed is **between 97.1% and 98.2%** depending on classifier: an independent recount on 2026-08-17 using a fixed UTC-4 offset and no market-holiday calendar gives 166/171 = 97.1%; an earlier count gave 168/171 = 98.2%. The 171 total reproduces exactly. Companies file outside market hours by deliberate practice; the figure establishes where disclosure happens, not that on-chain pools misprice it.
- Real MSTR 8-K primary documents fetched 2026-08-17 are 42–219 KB of raw HTML and **10–15 K characters (≈2,500–3,700 tokens) after tag stripping**, the balance being XBRL markup.
- NVIDIA Q2 FY2027 results are posted ~1:20 p.m. PT (**20:20 UTC**, 20 minutes after the 20:00 UTC close) on 2026-08-26, with the call at 21:00 UTC.
- Over the last 30 days the 10 names filed **15 8-Ks and 45 Form 4 insider-transaction reports** (~0.5 and ~1.5 per day), so several real filings are expected inside any 5-day window.
- MSTR alone filed 72 8-Ks in the last 365 days (~6 per month) and 5 in the last 30 days — the highest-frequency filer of the set.
- EDGAR acceptance timestamps are second-precision, giving an exact document-publication time for lead-time measurement.

**Demand evidence for the data class (web sources, checked 2026-08-16):** retail demand for parsed Form 4 / insider-transaction data is demonstrated off-chain: Unusual Whales (an options/insider-flow tracker) has 3M+ followers on X, and a whole ecosystem of dedicated Form-4 trackers exists (OpenInsider, secform4.com, Finviz insider pages, InsiderFinance, InsiderScreener). None of them ties this data to on-chain tokenised versions of the same equities.

**Price-history depth and trade-level data availability (OKX API + RPC, measured 2026-08-17):**

- Daily candles begin **2026-07-20** for wNVDAx and wMSTRx and **2026-07-29** for the other eight tokenised names. A request for 299 daily candles returns 27 and 19 respectively, i.e. the endpoint returns all it holds. These tokens are approximately four weeks old on X Layer; there is no year of on-chain price history for them.
- Hourly candles are capped at 299 points per call with no time cursor (12.4 days reachable).
- Per-trade history via the token-trades endpoint is capped at 500 trades with no pagination, reaching back 3.4 hours for wNVDAx (~3,600 trades/day) and 17 hours for wMSTRx (~700 trades/day).
- The v3 pool's Swap events are permanent and retrievable by RPC. The public RPC caps `eth_getLogs` at **100 blocks** (error `-32602`); at 1-second blocks that is 100 seconds per call. A full 28-day sweep would require ~24,000 calls; a ±60-minute window around a single event requires ~72.

**Backtest sample size (EDGAR submissions API cross-referenced against the windows above, 2026-08-17):** within the two live names the sample is **n = 10** (NVDA 0 8-K + 2 Form 4; MSTR 5 8-K + 3 Form 4). Across all ten corporate underlyings, each within its own available window, the sample is **n = 46: 12 8-Ks and 34 Form 4s**, distributed CRCL 12, MSTR 8, META 7, GOOGL 6, AMZN 4, COIN 3, AAPL 2, NVDA 2, SNDK 2, TSLA 0.

**Measured interval from filing acceptance to the first on-chain trade (7 real filings, USDG pools, RPC Swap events with retries, 2026-08-17):**

| Token | Form | Accepted (UTC) | Swaps ±60 min | Gap to first swap after |
|---|---|---|---|---|
| MSTR | 8-K | 2026-07-20T12:00:16Z | 0 | none within ±60 min |
| MSTR | 8-K | 2026-07-27T12:00:17Z | 0 | none within ±60 min |
| MSTR | 8-K | 2026-07-30T20:00:23Z | 36 | 355 s |
| MSTR | 8-K | 2026-08-03T12:00:16Z | 96 | 324 s |
| MSTR | 8-K | 2026-08-10T12:00:15Z | 16 | 237 s |
| NVDA | 4 | 2026-08-07T20:47:24Z | 185 | 428 s |
| NVDA | 4 | 2026-08-12T21:13:10Z | 69 | 222 s |

Median 324 s (5.4 min); 2 of 7 events had no trade within an hour. An on-chain pool price changes only when a trade occurs, so this interval is a function of trade arrival in that pool.

**Full n=46 pre-registered study, completed 2026-08-17** (method, per-ticker results, and a disclosed RPC-coverage-gap check in `outputs/05-build/reaction-latency-study.md`):

| Split | n | No trade in ±60min | Median gap |
|---|---|---|---|
| All | 46 | 14 (30%) | 274 s (4.6 min) |
| 8-K (primary) | 12 | 3 (25%) | 355 s (5.9 min) |
| Form 4 (secondary) | 34 | 11 (32%) | 222 s (3.7 min) |

The 7-filing table above is a subset of this data. Before the no-trade count was accepted, the 14 no-trade results were checked for RPC window coverage: 12 of the 14 had an incompletely swept window (a call that failed all retries), those 12 were re-swept with a more aggressive retry policy, and all 12 still showed no trade with full coverage.

**Reference-price history:** the OKX index endpoint returns a single spot price and timestamp with **no historical series**, so it cannot be queried retroactively; it can be polled and stored prospectively. One-minute klines inherit trade sparsity — for wMSTRx, **97 of 298 consecutive minutes contain no trade** — and reach back ~5 hours per call.

**Event calendar for the 11 underlyings (public earnings/dividend calendars, checked 2026-08-16):**

- NVIDIA reports Q2 FY2027 earnings on **2026-08-26 after US market close** — 5 days after Event A's deadline and 7 days before Event B's.
- SanDisk (SNDKx underlying) reported earnings 2026-08-05; Apple's ex-dividend date was 2026-08-10. Both precede the Event A window.
- **No scheduled event (earnings or confirmed ex-dividend date) for any of the 11 names falls inside the Event A window (2026-08-16 → 08-21).** Ex-dividend dates for NVDA, GOOGL and META in early September could not be confirmed.

**Ecosystem announcements (news reports, August 2026):** X Layer has a strategic partnership with xStocks (regulated tokenised-stock issuer associated with Kraken/Backed); xStocks assets are to be "gradually integrated" into X Layer with a "fast-listing mechanism". OKX's centralised exchange lists **40+ tokenised US stocks and ETFs** with **24/7 trading** on a shared order book. OKX's founder has publicly signalled RWA expansion on X Layer.

**Reference-price availability:** OKX's market API serves a real-time aggregated index price for these tokens (verified via CLI call). Because OKX's CEX trades the same underlyings 24/7, a continuous off-chain reference price for the equities exists around the clock. **Not verified:** whether any of these prices is available as an on-chain oracle on X Layer.

---

## 4. The builder

One person, ~4.5 days for Event A. Prior result: a Uniswap v4 hook prize at the Uniswap Hook Incubator (UHI8) — Solidity, v4 hooks, ERC-6909 flash accounting. Existing empty TypeScript monorepo (`apps/web`, `apps/server`, `apps/mcp-server`, `contracts/`). No project X account, website, Discord or Telegram yet. Wallet currently unfunded.

---

## 5. The proposal — AFTERHOURS

One-line: a corporate-events oracle for tokenised equities — several AI models independently parse company disclosures into on-chain event state whose factual fields are bonded against the source document itself and carry a published per-field agreement level; a Uniswap v4 hook, a per-address holder digest, a forward calendar of scheduled events, and a public X feed are its consumers; a historical backtest and a live scoreboard measure how far the feed runs ahead of the 24/7 reference price.

**Problem statement:** on-chain state for tokenised equities carries no information-event data. One class of corporate action is already handled without an oracle: per §3, NVDAx implements an issuer-updated `multiplier` for splits and dividends, and wNVDAx derives its conversion rate from that multiplier at read time, so splits leave the wrapper's price unchanged and dividends accrue gradually. The class that is not handled is informational: whether a given 8-K is material and why, when earnings are scheduled, what insiders transacted, whether a halt is in force. These exist only in documents (8-K filings, Form 4s, press releases, exchange notices) — and per §3, 98.2% of the last year's 8-Ks from these companies were published while the US market was closed, i.e. in the window where only the 24/7 venues, including the on-chain pools, are trading. A price feed — including OKX's 24/7 index (§3) — reacts to these events after trading begins to reflect them; the documents themselves are published earlier. Parsing documents has no deterministic implementation.

The value claim rests on lead time, across two horizons with different evidentiary status. For **unscheduled events** (8-K materiality, Form 4) the lead time is on the order of seconds to minutes and its sign and size are unmeasured; the proposal measures it historically via the backtest (component 8b) and live via the scoreboard (component 6). For **scheduled events** (ex-dates, split effective dates, earnings times) the announcement appears in a filing days to weeks before the event, so the interval is readable from the document itself; the forward calendar (component 4) exposes this class. All measurement rules are published before data collection.

**Components (Event A scope, after cuts):**

1. **Event agent, multi-model (off-chain).** Sources for Event A: **SEC EDGAR only (8-K and Form 4)**, plus OKX's 24/7 index as a deterministic input. **Live coverage: NVDAx and MSTRx** — NVDAx because its scheduled 2026-08-26 event anchors Event B, MSTRx because MSTR is the set's highest-frequency filer (5 8-Ks in the last 30 days, §3), which makes real live events during the Event A window probable rather than hoped-for. The other 9 names ship as configuration entries (visible in the registry, not yet polled), which is also the mechanism for onboarding each new listing from the announced fast-listing pipeline — a config entry, not code.

   Each filing is parsed three times by independent model calls, and the results are compared field by field rather than document by document. A field on which all runs agree is posted with a high agreement level. A field on which they disagree is posted with the disagreement recorded; if a key field disagrees, the state is not auto-posted and is queued for manual review. The agent separately publishes a severity/direction grade. Severity thresholds, tolerances, and reaction definitions are published before any data is collected. At the stated volume (~60 filings/month across the full set, 2 names live), three-way parsing costs a two-figure dollar sum for the Event A window.

2. **Bonded EventState registry (on-chain).** Each posted state links the source document's URL and content hash, and carries a USD₮0 bond that guarantees parse fidelity: during a challenge window, anyone who shows the structured fields do not match the linked document takes the bond. The ground truth for slashing is the document itself — no price feed and no operator-posted number sits in the slashing path. Challenge resolution is adjudicated by a named resolver key for the MVP, with the dispute record public.

   Per-field model agreement is published as part of the state rather than resolved away. The proposal gives two reasons: it distinguishes a unanimous parse from a contested one in the bond's dispute record, and a filing on which three independent parses diverge is by that measure an ambiguous filing. This differs from the approach recorded in §6, which drives extracted records toward a single attested answer. The severity/direction grade is labelled model judgment: it is not bonded, and its history against subsequent index moves is published as a track record (component 6).

3. **v4 hook + one seeded pool.** `beforeSwap` reads the registry. The fee is a deterministic, hard-bounded policy over the bonded factual fields (form type, event type, and the recorded agreement level): a fixed min/max fee band and a per-event rate limit are enforced in the hook, and the severity grade only modulates the fee within that band, so the model cannot move the fee outside limits readable in the contract. One wNVDAx/USDG v4 pool, seeded by the builder (wNVDAx acquired by DEX purchase, per §3). Because canonical v4 does not exist on chain 1952 (§3), the two legs differ: on **mainnet 196** the hook and pool are deployed against the canonical PoolManager; on **testnet 1952** the builder deploys their own PoolManager and runs the same hook and a mock-token pool against it. The submission states that the testnet PoolManager is the builder's own deployment rather than canonical Uniswap. The alternative considered was registry-only on testnet with the pool on mainnet, which was rejected because it removes the swap step from the demo. The pool's only liquidity is the builder's own seed; the proposal presents it as a demonstration that the registry is consumable by a contract.

4. **Forward event calendar (on-chain read).** The same parse that extracts what happened also extracts dates announced for the future: dividend record and payment dates, split effective dates, announced earnings times. These are exposed as a queryable forward calendar — "what is the next scheduled material event for this token, and when" — readable by any contract or client. One instance falls inside the submission window: NVIDIA's 2026-08-26 after-close earnings is already announced, so the registry can answer the query on submission day. Corporate calendars of this kind are freely available off-chain; the proposal's claim is that this one is bonded state a contract can read.

5. **Holder digest (per-address, no wallet connection).** A page where anyone pastes an address; it reads that address's token balances by RPC, joins them against the registry, and returns the events affecting the tokens that address holds. Output is per-token and links each event to both its source document and its on-chain post. No signature, no connection, no gas. It can be exercised against any of the 1,663 existing NVDAx holder addresses (§3) by someone holding no tokens and no funded wallet.

6. **Lead-time scoreboard (public web page).** Two columns per event: the timestamp the agent posted it on-chain and the timestamp the reference price first reacted (reference timestamps operator-recorded initially, per the pre-published reaction definition). Because the index endpoint has no history (§3), this series exists only from the day polling starts and cannot be backfilled; it is the only place the proposal makes a lead-time claim. Clearly labelled analytics; not connected to slashing. The landing page states the closed-hours evidence with its caveat (disclosure lands in closed hours; per-hour price intensity does not).

7. **Event feed on X.** The mandatory project X account (Event A requirement 3) is itself a product surface: a bot posts every parsed event — 8-Ks and Form 4 insider transactions — with its on-chain transaction link. Parsed insider-transaction data is a class with demonstrated retail demand off-chain (§3, demand evidence); no existing tracker ties it to the on-chain tokenised versions of the same equities. A Telegram channel exists as a static link (Event B requirement); posts to it are manual until Event B.

8. **Evidence pack (pre-deadline deliverable, predeclared method).** Three studies published with the submission, results published regardless of outcome:

   (a) **Parse-accuracy sample** — the parser run over a predeclared ~30-filing sample (drawn from the 171-filing year, MSTR-heavy), reporting field-level accuracy and the inter-model agreement rate from component 1.

   (b) **On-chain reaction latency** — for every filing whose second-precision EDGAR acceptance timestamp falls inside that token's available price window (§3), the interval between document acceptance and the first on-chain trade in the reference pool, reported as a distribution: median, spread, and the count of events with no trade inside the window. It runs on historical data only and requires no live event. The proposal states that this measures how long the pool quotes a stale price, not how far the agent runs ahead of the price, on the stated grounds that the interval is set by trade arrival and would be substantially unchanged by a slower agent (§3). Sample design, per the §3 measurements: the backtest covers all ten underlyings (n = 46) while live polling stays at two names, on the stated grounds that the study is offline and does not require the agent to poll a token; restricting it to the live names would give n = 10. Results are pre-registered split by form type, with the 8-K subset (n = 12) named as the primary measurement and Form 4 (n = 34) as secondary. Prices are read from v3 Swap events in targeted ±60-minute windows rather than from the trades endpoint, and the wNVDAx reference series is wNVDAx-denominated (§3).

   (c) **Markout study** — realised LP losses on the existing v3 wNVDAx pool around the events identified in (b), computed from per-trade data, expressing the measured lead time in dollars on the pool where LPs exist today.

   In build order, (a) and (b) precede the v4 hook; (c) follows. Whatever is unfinished ships in the Event B window.

**Execution order:** day 1 is reserved for the items that can produce ineligibility rather than a low score — create the X account, fund the wallet with OKB, execute a verified mainnet purchase of wNVDAx and a seed transaction, create the Event B assets (website shell, GitHub, Discord or Telegram), and check the wMSTRx facts listed as unverified in §7 — before further feature code. The order after that is: multi-model parse (1), registry (2), lead-time backtest (8b), holder digest (5), forward calendar (4), v4 hook (3), scoreboard (6), X feed (7), markout study (8c).

**Explicitly cut from Event A scope:** exchange halt feeds, issuer press releases and news feeds (deferred to Event B window); any keeper executing on v3 LP positions (the feed is documented for third-party consumption instead); direction-asymmetric fees; vault products; challenge-flow UI beyond a bare contract call; automatic index-reaction detection (deferred).

**Event B window (2026-08-22 → 09-02):** the system runs live through NVIDIA's 2026-08-26 earnings; the submission includes the complete trace for that real event — document → parsed state → on-chain post → fee change → scoreboard entry. Also in this window: a **sentinel A/B test** — two equal small LP positions in the existing v3 wNVDAx pool, one passive, one guarded by the feed (withdrawn or narrowed on high-severity state), with both P&Ls and all transaction links published after the earnings event, turning "protection unproven" into one controlled live comparison on the venue where LPs already are. Deferred here as well: extension of the lead-time backtest to the full 171-filing year as price history allows, grade calibration and scoreboard backfill, the Telegram bot, automatic reaction detection, additional sources (halt feeds, press releases), and ERC-8004 registration of the feed (a single CLI command). **Demo friction:** the scoreboard and registry explorer are readable with no wallet; the injection demo runs on testnet through a hosted page with a pre-funded relayer, so a judge needs no OKB or tokens to run it.

**Addressable market, as stated by the proposal:** the disclosure-data layer for every venue and product touching tokenised equities — 11 names on-chain today, a 40+ name pipeline on OKX's CEX with an announced fast-listing mechanism (§3) — not the ~$3.8M of current v3 DEX liquidity. The feed and registry serve v3 LPs, holders, bots and future protocols regardless of which venue holds the liquidity; the hook is one consumer among them. Coverage commitment: a new listing's feed goes live within 24 hours (a config entry, per component 1).

**Grant-use statement (Event A's AI-RWA Liquidity Grant, if awarded):** seed protected v4 pools for additional tokenised-equity listings as they arrive. The submission text states AI-RWA track membership explicitly (the form has no track selector, §2) and includes verifiable mainnet transaction links for deployment and seeding.

**Demo plan (what a judge runs):** the judge first sees the live record — real 8-Ks and Form 4s already parsed and posted on-chain during the window (per §3, several are statistically expected), on the scoreboard and the X/Telegram feed. The judge then triggers a synthetic high-severity 8-K injection for NVDAx from the hosted page (the path real events rarely exercise on demand); the agent parses and grades it; the bonded registry updates on-chain; the judge swaps on testnet via the same page and observes the widened fee; a non-material injected filing produces no state change. For Event B, the record includes the real NVIDIA earnings event end-to-end.

**Event B submission shape:** the event agent is the submitted AI agent; its on-chain effects are bonded registry updates that change live swap pricing. Event B's deadline is ~11 days after Event A's.

---

## 6. Related factual record

From a 242-row corpus of recent Web3 hackathon winners (57 hackathons), and from a prior candidate for these same two events:

- **Devia** (Uniswap Hook Incubator UHI9, General Prize): a v4 hook that raises swap fees under oracle uncertainty (price deviation, stale updates), computed deterministically from numeric inputs.
- **DobDex** (UHI, Unichain Prize): RWA-specific v4 hook that overrides AMM-curve pricing to force oracle-pegged execution at exact oracle prices.
- **xStream** (xStocks Hackathon EthCC, 3rd Prize): splits a tokenised stock into a dividend token and a price-exposure token.
- **EXITPROOF** (prior candidate for these same two events, abandoned): measured executable exit depth for tokenised assets with a deterministic engine; an LLM summarised the results. It was scored on Event A's rubric by two agents before abandonment; the recorded reasons for rejection were the deterministic role of the model and the absence of an existing on-chain consumer.
- Recurring patterns recorded among corpus winners include: "bond the claim, open a challenge window, pay the challenger"; "make the verdict a verifiable on-chain object another contract consumes"; "deterministic engine computes every number; the model routes and writes".
- **Chainlink corporate-actions initiative (news sources, checked 2026-08-17).** An ongoing initiative with Swift, Euroclear, DTCC, UBS and, as of Sibos 2025, 24 financial institutions in total: LLMs convert unstructured corporate-action data into a structured "unified golden record" delivered on-chain and moved cross-chain via CCIP, using a consensus across several models (GPT-4o, Gemini 1.5 Pro, Claude 3.5 Sonnet in the first phase). Phase 2 adds human data-attestor and data-contributor roles that drive confirmed-record accuracy to 100%. The initiative frames the target as a "$58 billion corporate actions problem". Points of comparison with the proposal: it serves institutional asset servicing rather than 24/7 retail DEX pools and holders; it sources issuer and custodian corporate-action feeds rather than SEC EDGAR directly (and does not cover 8-K materiality or Form 4 insider data); the record is delivered for downstream systems rather than consumed by an on-chain contract that acts on it; and it resolves model disagreement to a single attested answer rather than publishing it.
- Dynamic-fee hooks on Uniswap v4 are an established category (news and repository sources, checked 2026-08-17): widely deployed implementations raise fees during high volatility and lower them in quiet markets, stated purpose being to tax arbitrage and reduce loss-versus-rebalancing. The documented implementations key off price-derived inputs — volatility, volume, inventory.
- The corpus contains no project handling corporate actions (splits, dividends, halts, delistings) for tokenised assets. Corpus counts: 38 rows privacy/ZK, 32 x402, 18 RWA, 8 ERC-8004; "we metered it with x402", "we registered an ERC-8004 identity", and "we exposed it over MCP" recur without winning on their own.

---

## 7. Known open questions (unresolved as of 2026-08-17)

1. The interval from filing to first on-chain trade is now measured on the full pre-registered sample (median 4.6 min, 14/46 with no trade in an hour, §3), but its dollar consequence is not: the markout study (component 8c) has not been run and its result may be trivial relative to a $221k pool. The proposal's claim that the agent runs ahead of the reference price has no supporting data at all yet, and cannot acquire any retroactively (§3) — it accrues only from the day the index poller starts.
2. The severity grade is unbonded model judgment; the hook's fee band and rate limit bound its effect, but its accuracy is unquantified until the parse-accuracy sample and (in Event B) grade calibration are published.
3. The closed-hours share of 8-K filings (§3) reflects corporate filing practice. It establishes where disclosure happens, not the size of any resulting on-chain mispricing. Two independent counts of that share disagree (97.1% vs 98.2%) because of DST and market-holiday handling; the proposal states it as "~97%" unless it publishes its classifier.
4. Uniswap v4 does not exist on X Layer testnet (§3), so the testnet half of the demo runs on a PoolManager the builder deploys. Whether a judge treats that as equivalent to a canonical v4 deployment is unknown.
5. The EventState signer is a single key run by the builder, and challenge resolution is a named resolver key for the MVP. The parse-fidelity bond constrains but does not decentralise either.
6. Scoreboard reference timestamps are operator-recorded until reaction detection is automated (analytics only; not in the slashing path).
7. No external party consumes any component today. Existing LPs are on v3; the v4 pool (component 3) holds only the builder's seed. The holder digest (component 5) and forward calendar (component 4) can be exercised without adoption, but neither has users. Third-party feed consumption and X follower uptake are unproven. The off-chain demand evidence in §3 covers the data class, not this delivery of it.
8. The sentinel A/B test (Event B) is a single event with small positions: an existence proof, not a statistically significant comparison.
9. Three independent parses (component 1) reduce but do not eliminate the chance of a bond-losing error, since independent runs can agree and still be wrong the same way. Whether any consumer acts on published per-field disagreement is untested.
10. The forward calendar (component 4) restates information available off-chain; the claimed difference is that it is bonded state a contract can read. No contract outside the proposal reads it today.
11. The backtest sample is n = 46, of which 12 are 8-Ks and 34 are Form 4 insider transactions; the largest single contributor is CRCL at 12 events and TSLA contributes none (§3). Routine Form 4 filings may produce no measurable price reaction, in which case an interval computed over them has no interpretation. The 8-K subset is small enough that the distribution may not separate from noise. The sample cannot be enlarged retroactively: price history begins 2026-07-20 (§3), so filings older than that have no on-chain price to measure against at Event B or later; it grows only at roughly 1.6 new filings per day across the ten names.
12. Event A requires mainnet launch within the window; wallet funding, bond capital, and all mandatory accounts are scheduled for day 1 and not yet done.
13. Eight components (§5), one of which is a three-part evidence pack, are scheduled against ~4.5 days of solo build time, with day 1 consumed by eligibility items. Component 3 is the builder's demonstrated specialty (§4); the others are not.

No preamble. Produce the scores, justifications, and verdict in the order given in §1.
