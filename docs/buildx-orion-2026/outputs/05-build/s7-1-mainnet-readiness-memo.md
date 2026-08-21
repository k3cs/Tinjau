# S7.1 — Mainnet readiness memo

**Prepared for:** Dien (owner). **Date:** 2026-08-22. **Status:** decision memo. Nothing here
is an instruction to deploy, and this document contains no deployment steps.

Notation: `[Fakta]` means a claim with a source you can open (a file path, a live RPC result, a
URL). `[Inferensi]` means my reasoning on top of those facts. Every money figure that is not
measured is labelled **estimate**.

---

## 1. Unaudited status, and what that means

**These contracts have never had a security review or an audit, external or internal.**
`[Fakta]` I searched every Markdown file in the repository for the word "audit"
(`grep -ri "audit" --include="*.md"`, plus a full read of `docs/buildx-orion-2026/`). Every hit
is one of three unrelated things: a *claim* audit (checking that pitch copy matches evidence), a
*branding* audit, or a *bytecode* audit (`apps/server/src/chain/tinjauBytecodeAudit.ts`, which
compares deployed runtime code against a fresh local build). Not one hit refers to a security
review of the Solidity. `[Fakta]` The two hits inside `contracts/src/` are code comments about
readability ("exactly one place to audit", `TinjauRiskTypes.sol:266`), not review records. There
is no audit report, no auditor name, no engagement, and no scope document anywhere in the tree.

What that means in practice:

- `[Fakta]` 1,427 lines of Solidity across four contracts (`TinjauFeeHook.sol` 540,
  `TinjauRiskRegistry.sol` 394, `TinjauRiskTypes.sol` 303, `TinjauRiskPolicy.sol` 190) have been
  read by their author and by nobody with an adversarial mandate.
- `[Fakta]` 137 Foundry tests pass, including 13 fuzz properties. That is real, and it is not an
  audit. Tests prove that the properties **you thought to write down** hold on the inputs the
  fuzzer reached. An audit is someone paid to find the property you did not think of.
- `[Inferensi]` The blast radius is smaller than for most unaudited DeFi code, and this is worth
  saying plainly rather than hiding: `[Fakta]` none of the four contracts contains a token
  transfer, a `payable` function, a `delegatecall`, or a `selfdestruct` (verified by grep across
  all four files). They custody nothing. A bug cannot steal funds from them, because they hold
  none.
- `[Inferensi]` The realistic worst case is therefore **mispricing, not theft**: a swapper
  charged 2% when they should have been charged 0.05%, or a pool left at 0.05% when the record
  says it should be protected. On a Uniswap v4 pool there is one sharper case, and the code
  already anticipates it: a hook that reverts halts the pool. `[Fakta]` `TinjauFeeHook` reads
  the registry through raw `staticcall` and decodes by hand specifically so a malformed record
  cannot revert a swap (`TinjauFeeHook.sol:57-62`). That mitigation is designed, tested, and
  unreviewed by anyone else.

Nothing below softens this. Read section 7 with section 1 in mind.

---

## 2. The stated mainnet obligation, and what is not determinable about it

This changes the shape of the decision, so it belongs next to section 1 rather than in a
footnote. Mainnet is not only a score-mover. It is written into the event's participation
requirements.

`[Fakta]` Verbatim from the Participation Requirements block on the official event page
(https://web3.okx.com/xlayer/build-x-series), which I fetched and re-read myself on 2026-08-22:

> "Participating projects must meet all of the following requirements. Projects that fail to
> meet any requirement will be ineligible to participate in the Hackathon or receive prizes.
> ... During the Hackathon, the project must be deployed on the X Layer Testnet and
> **subsequently** launched on the X Layer Mainnet."

**What this establishes.** `[Fakta]` A mainnet launch is a stated obligation, and the
requirements block it sits in is the one whose preamble mentions ineligibility.

**What this does not establish, and must not be read as establishing.**

- `[Fakta]` The clause carries **no date**. "Subsequently" is the only timing word in it.
- `[Fakta]` The same sentence explicitly scopes the *testnet* deployment to "During the
  Hackathon", and places the mainnet launch after it. `[Inferensi]` If mainnet were also a
  during-hackathon obligation, the sentence would not need two different time framings.
- `[Inferensi]` Therefore whether a missing mainnet deployment affects eligibility **at judging
  time** is not determinable from the published material. It is genuinely ambiguous, and I am
  leaving it ambiguous rather than resolving it in the direction that suits my recommendation.
  **Nothing here should be read as saying Dien's eligibility is currently at risk.** That is not
  established. Nor is the opposite established.

`[Inferensi]` The practical consequence: the cheapest action available on this whole memo is not
a deployment. It is asking the organizer, in writing, what "subsequently" means and whether it
gates judging. That costs nothing, risks nothing, and collapses the ambiguity that most of this
memo has to work around. See section 9.

**A second official clause is also relevant here.** `[Fakta]` The event page carries two
separately numbered clause-4s. The Terms clause 4 ("Judging") lists the seven criteria including
"integration with X Layer". A separate Disclaimer block has its own clause 4, verbatim:

> "4. Final Determination. The Organizer will consider onchain data, code quality, innovation,
> and market potential. Final rankings will be determined at the Organizer's sole discretion."

`[Inferensi]` "Onchain data" as an explicit ranking input cuts both ways and should not be
over-read as pro-mainnet. Testnet chain 1952 is also onchain data, and this project has an
unusual amount of it: a real registry, real assessments, real swaps repriced by the hook, plus
32 real corporate events measured against 10 real chain-196 pools. What mainnet would add is
*which* chain the data sits on, not whether onchain data exists.

**A third requirement, easy to miss, and ongoing.** `[Fakta]` Same block: "The project must have
a dedicated X account and keep it active throughout the project's lifetime." `[Inferensi]` That
is an obligation that outlives the submission deadline, like running the assessor. It belongs in
the operational-cost picture (section 4.5), not in a to-do list that ends at judging.

---

## 3. The decision being asked

**Given that a mainnet launch is a stated obligation with no published deadline, and that it
would also move one evaluation criterion from 8/10, should Tinjau launch its contracts on X Layer
mainnet (chain 196) now, and/or run a pool with real third-party liquidity?**

---

## 4. What mainnet would cost

### 4.1 A finding that changes what "attach to real liquidity" can even mean

The evaluator offered two routes, "mainnet deployment, **or** a hook attached to real X Layer
liquidity". **The second route is not available.** It is not expensive, it is structurally
impossible, and this is the most important technical finding in this memo.

- `[Fakta]` The ten real tokenized-equity pools on X Layer mainnet that this project measured
  (`markout-study.md` §2.1) are **Uniswap v3** pools. I re-verified live on 2026-08-22: the NVDA
  pool `0x2a2b...a7b2` answers the v3 `slot0()` selector and exposes `feeProtocol` and
  `tickSpacing`, which are v3 concepts.
- `[Fakta]` `TinjauFeeHook` is a Uniswap **v4** hook (`IHooks`, `beforeInitialize`, `beforeSwap`).
- `[Fakta]` In Uniswap v4 the hook address is part of the `PoolKey` and is fixed at pool
  initialization. `TinjauFeeHook.beforeInitialize` additionally rejects any pool that is not
  flagged dynamic-fee (`PoolMustUseDynamicFee`).
- `[Inferensi]` Therefore no existing X Layer liquidity can have this hook attached, ever. Not
  the v3 equity pools (wrong protocol version), and not any v4 pool that already exists (hook is
  immutable after initialize). "Attaching to real liquidity" can only mean **creating a new v4
  pool and persuading liquidity to move into it**. That is a business development problem, not a
  deployment task.
- `[Fakta]` The Uniswap v4 `PoolManager` *is* deployed on X Layer mainnet
  (`0x360e68faccca8ca495c1b759fd9eee466db9fb32`, 24,009 bytes of code, verified live
  2026-08-22 via `eth_getCode`; listed on
  https://developers.uniswap.org/docs/protocols/v4/deployments). So the infrastructure exists.
  What does not exist is v4 tokenized-equity liquidity to join. I searched and found none; treat
  that as "not found", not as proof of absence.

`[Inferensi]` Note how this interacts with section 2: the *obligation* is "launched on the X
Layer Mainnet", which a deployed registry and hook would satisfy on any plain reading. The
obligation does not appear to require real third-party liquidity. The evaluator's stronger
suggestion does. These are two different asks with two different price tags, and conflating them
would overstate what compliance costs.

### 4.2 Gas: effectively free, and not the constraint

`[Fakta]` Verified live against `https://rpc.xlayer.tech` on 2026-08-22: `eth_chainId` returns
`0xc4` (196), `eth_gasPrice` returns `0x1312d01` = 20,000,001 wei = **0.02 gwei**. Gas token is
OKB. `[Fakta]` OKB spot at the time of writing was **$105.16** (OKX `OKB-USDT` ticker;
CoinGecko independently returned $105.05). Explorers: https://www.oklink.com/x-layer and
https://www.xlayerscan.com/.

`[Fakta]` Gas figures below are measured, not estimated: contract deployments come from the real
testnet broadcast (`contracts/broadcast/DeployTinjauStack.s.sol/1952/run-latest.json`), and
function costs from `forge test --gas-report` run on 2026-08-22. Mainnet gas is identical to
testnet gas for the same bytecode.

| Item | Measured gas | Cost at 0.02 gwei, OKB $105 |
|---|---|---|
| Deploy `TinjauRiskRegistry` | 1,505,330 | $0.0032 |
| Deploy `TinjauFeeHook` (CREATE2) | 1,412,846 | $0.0030 |
| `setAssetSupported` + pool init + first LP add | 366,820 | $0.0008 |
| **Full stack, one pool** | **3,284,996** | **$0.0069** |
| One `postAssessment` write (worst observed) | 315,657 | $0.00066 |
| `beforeSwap` overhead per swap | 611 | negligible |

`[Inferensi]` Even at 100× today's gas price and double the OKB price, the full stack deploy is
under $1.50 and a year of hourly assessments (8,760 writes) is under $120. **Gas is not a reason
to deploy and not a reason not to.** Anyone framing the mainnet decision as a gas-cost decision
has the wrong model. This also means the *obligation* in section 2 is not expensive to satisfy in
gas terms. What makes it expensive is everything in sections 4.3 and 7.

### 4.3 The costs that are actually real

| Cost | Range | Basis |
|---|---|---|
| Security review, 4 contracts (~1,400 lines) | **$15k-50k** (estimate) | see below |
| Seed liquidity for a credible pilot pool | **$10k-250k** of own capital at risk (estimate) | see §4.4 |
| Backend + LLM + hosting + X account, ongoing | **$30-100/month** (estimate) plus time | see §4.5 |
| Gas, deploy + a year of writes | **under $10** (measured) | §4.2 |

**Security review estimate.** `[Fakta]` Published 2026 market references put boutique audits at
$8k-25k, mid-tier at $25k-80k, and top-tier at $80k-350k per scope, with Solidity typically
20-30% cheaper than Rust or Move because the auditor supply is larger. Sources:
[Sherlock's 2026 pricing reference](https://sherlock.xyz/post/smart-contract-audit-pricing-a-market-reference-for-2026),
[Zealynx 2026 audit pricing](https://www.zealynx.io/research/audit-ops/audit-pricing-2026),
[QuillAudits 2026](https://www.quillaudits.com/blog/smart-contract/smart-contract-audit-cost-2026).
`[Inferensi]` This scope sits at the low end on size (four small contracts, no custody, no
upgradeability, no cross-chain messaging) and at the high end on specialism (a v4 hook sits
directly in the swap path, and v4-hook reviewers are a narrow bench). Netting those, **$15k-50k**
is my estimate for a competent review, and I would not trust a quote materially below $10k for
this scope. Rush delivery reportedly adds 20-50%.

### 4.4 Liquidity the pilot would need

`[Fakta]` Live measurement of the existing X Layer NVDA v3 pool, 2026-08-22: reserves are
125,192 USDG plus 619.4 wNVDAx, roughly **$259k total** at the pool's own implied price of
$215.83 per wNVDAx. In-range liquidity at the current tick is `L = 74,573,866,644,615,381`,
which means roughly **$5,500 of USDG moves the price 1%** (an approximation that ignores
initialized-tick boundaries).

`[Inferensi]` A new v4 pool would compete directly against that. To be a *market* rather than a
demo it needs comparable depth, so $100k-250k. To be merely non-trivial and honestly presentable
it needs perhaps $10k-50k. Either way the capital is Dien's, exposed to impermanent loss and
adverse selection on a thin pair, and it does not become "real third-party liquidity" merely by
being on mainnet. **A builder-seeded mainnet pool is still a builder-controlled pool.**

`[Inferensi]` There is also a routing problem that money does not solve. The hook's entire
function is to *raise* the fee under PROTECT, up to 2%. Takers route to the cheapest venue. A
new pool that sometimes charges 2% next to an existing v3 pool that always charges 0.05% has a
structural reason to lose flow exactly when it is doing its job. I have not verified whether the
OKX DEX aggregator routes v4 pools on X Layer; treat that as unverified and decision-relevant.

### 4.5 Ongoing operational cost, and who runs it

`[Fakta]` The assessor is an off-chain process. It signs EIP-712 `Assessment` messages; a
separate **poster** pays gas to relay them (`TinjauRiskRegistry.sol:41-44`). `[Fakta]` The
pipeline runs on a VPS (`tinjau-vps`, `15.235.146.33`) with four systemd units (`tinjau-agent`,
`tinjau-index-poller`, `tinjau-scoreboard-api`, `tinjau-xbot`), and the evidence extraction calls
Gemini `gemini-3.6-flash` (`apps/server/src/llm/provider.ts:22`).

- **Who runs it: one person.** `[Fakta]` There is no second operator, no on-call rotation, and no
  runbook for handover recorded anywhere in the repo. `[Inferensi]` That is the honest answer and
  it is the operational risk, not the hosting bill.
- **Cost: $30-100/month (estimate)** for VPS, Vercel, and Gemini Flash-tier calls at the observed
  polling cadence. Not material next to the audit.
- **Plus a non-money obligation that does not expire.** `[Fakta]` The event requires "a dedicated
  X account" kept "active throughout the project's lifetime". `[Inferensi]` This is the same
  class of commitment as running the assessor: cheap per week, but it is a standing obligation on
  one person with no backup, and it is the kind of thing that quietly lapses. Worth deciding
  deliberately rather than discovering later.
- **What happens if the assessor stops: the system fails safe, by design.** `[Fakta]` Expiry is
  enforced at read time. `TinjauRiskPolicy.effectiveFee` compares `block.timestamp` against the
  record's own `expiresAt` and against `protectStartedAt + maxProtectDuration`; no transaction is
  needed to stand protection down (`TinjauFeeHook.sol:63-68`). `[Inferensi]` So a dead assessor
  means the pool returns to its 0.05% base fee and stays there. Nobody is harmed. But the product
  is then silently doing nothing while a mainnet deployment implies it is doing something, and
  that gap is a reputational risk rather than a financial one.

---

## 5. What a minimal real-liquidity pilot would look like

This section describes a shape, **not a plan of action**, and deliberately contains no steps.
Given §4.1, "pilot" can only mean a new v4 pool. Note that satisfying the section 2 obligation
does not obviously require this section at all.

**Smallest defensible scope.** One asset (wNVDAx against USDG, the only pair with any
project-specific evidence history), one pool, the production envelope (base 500 pips, max 20,000
pips, 6-hour cap), liquidity sized so that the maximum credible loss is money Dien would shrug
at, and every public surface labelled with the pool's actual character. If any third-party LP
ever deposits, that fact is the milestone, not the deployment.

**What would have to be true first** (all of them, not a menu):

1. `[Fakta, production blocker]` An **independently generated assessor key** exists, held
   separately from the wallet that pays gas. Today the assessor key is *derived*:
   `keccak256(posterKey ‖ "tinjau.rolekey/1.0.0:assessor")`
   (`apps/server/src/chain/tinjauRoleKeys.ts:44`). The module's own header says it: "A derived
   key shares the fate of the key it came from... NOT acceptable for production."
2. `[Fakta]` The **guardian is a different key from the poster**. On testnet they are the same
   wallet, because pausing costs gas and only two funded wallets existed
   (`known-limitations.md` §17).
3. A security review is complete and its findings are fixed (§1, §4.3).
4. Consumers read via the `AssessmentPosted` event or a pinned block number, never by polling
   `currentRecord`. `[Fakta]` X Layer's public RPC is load-balanced and served a 13-second-stale
   `WATCH` immediately after a confirmed `PROTECT` write; measured convergence lag 2,519-2,746 ms
   (`known-limitations.md` §1). For a risk registry the error direction is the dangerous one: a
   consumer can read `NORMAL` while a `PROTECT` is live.
5. `[Fakta]` `apps/web/src/lib/risk/model.ts` `REASON_CODES` is fixed. It is missing three codes
   the published schema carries, so the frontend validator **throws on a record that is valid
   against the published schema** (`known-limitations.md` §16).
6. `[Fakta]` `tinjau.xyz/api/scoreboard` no longer asserts a fabricated
   `"8-K — bankruptcy_or_restructuring"` about NVDA with no source field
   (`known-limitations.md` §15). This is live today and is a worse public defect than the absence
   of a mainnet deployment.

**What the kill switch is.**

`[Fakta]` The guardian holds exactly three levers: `setPaused(true)` blocks *new* protections,
`rotateAssessor` replaces the signing key, and `setAssetSupported(asset, false)` makes the hook
stop resolving that asset and fall back to base fee. `[Fakta]` `TinjauFeeHook` has **no
state-changing external function at all** and reads its fee band as immutables from the registry
at construction, so there is no path by which anyone raises the band later.

`[Fakta]` The bound that matters: a pause **fails closed**. It drops the hook to `baseFee` while
leaving the record, its history and its clock untouched, so pausing can only ever shorten
protection, never extend it (DEC-012, `known-limitations.md` §17). Every guardian lever is
one-directional downward: the guardian can lower a fee to baseline and can never raise one.

`[Inferensi]` What the kill switch does **not** do: it cannot un-charge a swapper who already
paid 2% during a false positive, it cannot withdraw the seeded liquidity (that is an ordinary LP
withdrawal, unaffected by any of this), and it cannot act faster than a human noticing. It is a
stop, not an undo.

---

## 6. Which claims mainnet would license, and which it would not

**Mainnet presence would license** (each only if the specific thing actually happens):

- "Deployed on X Layer mainnet, chain 196", with addresses and bytecode verifiable by anyone.
- "The risk registry is readable on X Layer mainnet by any third-party contract, without trusting
  Tinjau's API or dashboard."
- "A real mainnet swap was priced by the hook" — only after a real swap actually executes.
- "A third party has liquidity in a Tinjau-hooked pool" — **only if a non-builder LP actually
  deposits.** Deploying does not create this claim; a stranger's deposit does.
- `[Inferensi]` Separately, and this is compliance rather than a product claim: it would satisfy
  the section 2 requirement on any plain reading of "launched on the X Layer Mainnet". Meeting a
  stated obligation is not a statement about the product, and should not be dressed as one.

**Mainnet presence would NOT license.** These stay prohibited, and mainnet has no bearing on any
of them, because each is gated on evidence that a deployment does not produce:

| Claim | Why mainnet does not unlock it |
|---|---|
| "Tinjau reduces LP loss" / "avoided $N" | `[Fakta]` `canClaimLossAvoided` is **false**. Tinjau's fee stayed at 500 pips through every window, so its replayed economics are identical to `STATIC`: 27 of 27 comparable cells are `TINJAU_TIES`, and "beats" means strictly greater. Stays prohibited until the **original pre-registered** conditions pass on canonical data. |
| "Tinjau outperformed the baselines economically" | Same source. Worse: the sign of the comparison flips between the pre-registered and post-hoc bases on identical trades, so the truth is bracketed across zero. |
| A replayed `PROTECT` | `[Fakta]` Tinjau reaches `PROTECT` on **none** of the four frozen scenarios at any threshold in the grid. The demo's protect scene uses a **constructed price path on a builder-controlled pool**; only the market data is constructed, the verdict is the real engine's. A mainnet address does not create evidence that did not exist. |
| "Dual OKX/X Layer confirmation" for any replayed scenario | `[Fakta]` The OKX leg is `UNAVAILABLE` for all four scenarios; index history is not retroactively available. |
| "Production-ready" | Section 1. Unaudited, single-operator, derived assessor key. |
| "Real liquidity" / "protected TVL" / adoption | A builder-seeded mainnet pool is builder-controlled. Only a third party's deposit changes this. |
| "Manipulation-proof confirmation" | `[Fakta]` Anti-wick uses the **median** over the hold interval; an attacker holding the price for 150s of 300s still passes, and this is disclosed. |
| "Live news or social discovery / coverage / latency" | `[Fakta]` One frozen claim is a `SIMULATED` post written in-house with `sourceUrl: null`; no live social provider is authorised. |
| Any "first ..." claim | Already on the prohibited list and unrelated to deployment. |

`[Inferensi]` Net: mainnet buys **one** genuinely new sentence ("it is deployed and readable on
chain 196"), a second one conditionally if a stranger ever deposits, and compliance with a stated
requirement. It buys nothing on the axis where this project is actually weakest, which is that it
has never demonstrated protection on real data.

---

## 7. The risks, ranked

Ranked by expected damage, not by likelihood alone.

| # | Risk | Status | Why it ranks here |
|---|---|---|---|
| 1 | **Derived assessor key.** `keccak256(posterKey ‖ version:role)` | `[Fakta]`, **production blocker** | Compromising the hot poster wallet hands over signing authority for free. On mainnet the poster must be online to relay. An attacker with it can post `PROTECT` at 2% repeatedly (subject to the 1h cooldown and 6h cap), or post `NORMAL` to suppress real protection. The code's own module header calls this unacceptable for production. |
| 2 | **No security review.** 1,427 lines, unreviewed | `[Fakta]` | Section 1. Mitigated in scale by holding no funds; not mitigated in kind. The hook sits in the swap path of every trade. |
| 3 | **Guardian and poster are the same key** | `[Fakta]` (testnet config) | If carried to mainnet, the compromise in #1 also takes the kill switch. Splitting them is cheap; failing to split them makes #1 unrecoverable. |
| 4 | **Over-charging a real counterparty** on a false positive | `[Inferensi]` | Up to 2% for up to 6 hours, on real money, with no refund path. Bounded by the envelope and by the fact that the guardian can only ever lower a fee, but bounded harm is still harm and there is no undo. |
| 5 | **Stale-read under-reporting** | `[Fakta]`, measured | A mainnet consumer polling `currentRecord` can read `NORMAL` while `PROTECT` is live. Silent, and in the dangerous direction. |
| 6 | **Seeded capital at risk** | `[Inferensi]` | IL and adverse selection on a thin pair, plus the routing problem in §4.4. |
| 7 | **LLM and heuristics in the evidence path** | `[Fakta]` | Speculation detection is a curated phrase list, independence derivation is a curated alias list, and both are disclosed as incomplete. Constrained so they can only ever *weaken* a claim, which is the right direction, but a missed hedge still leaves a claim looking stronger than it is. |
| 8 | **Single operator, no handover** | `[Inferensi]` | Fails safe if it stops (§4.5), but a live mainnet deployment implies an ongoing service that one person's absence silently ends. Same class as the standing X-account obligation. |
| 9 | **Live public defects** (§15 fabricated bankruptcy, §16 frontend throw) | `[Fakta]` | Not mainnet risks. Listed here because they are **already live** and cost more credibility right now than the missing mainnet deployment does. |
| 10 | **Unresolved timing of the mainnet obligation** | `[Fakta]` that the clause exists and is undated; `[Inferensi]` on its effect | A non-technical risk, and the only one on this list that is cheap to remove: ask the organizer. It ranks last on damage because nothing establishes that it is currently biting, and it ranks first on cost-effectiveness because clarifying it is free. |

`[Inferensi]` Risks 1, 2 and 3 are the ones that make the answer to section 3 "not now" rather
than "how much". They are also the only three entirely within Dien's control to fix. Risk 10 is
the one that could change the whole calculation, and it is answerable by a question rather than
by money.

---

## 8. The do-nothing alternative, taken seriously

Staying on testnet is a real option with real costs. Section 2 changes this section more than any
other: "do nothing" now means "do not launch *yet*", not "never launch", because a stated
obligation exists.

**What the project loses.**

- `[Fakta]` It does not satisfy a written participation requirement. `[Inferensi]` Whether that
  matters at judging is unknown (section 2), and the honest way to hold this is as an open
  exposure of unknown size, not as a crisis and not as a non-issue.
- The "Integration with X Layer" criterion stays at 8/10. `[Inferensi]` On a seven-criterion
  rubric that is a fraction of a point, but a visibly available and visibly declined one.
- It cannot say "deployed on mainnet", a line that reads well to a non-technical reader and that
  competitors will have.
- It never learns what real traders do to the pool, which is genuine product information that no
  testnet run produces.
- `[Inferensi]` A judge inclined to read caution as inability will read it that way, and this
  memo cannot prevent that.

**What the project keeps.**

- No unaudited code holds a live fee lever over a real counterparty's money.
- No real swapper can be charged 2% by a false positive.
- No capital is exposed to a pair whose whole-market measured LP harm across 32 events on 10 real
  pools was `[Fakta]` **$82.80 in total** (`market-exposure.json`, X Layer chain 196, measured
  2026-08-17, typical first-trade notional ~$105). `[Inferensi]` That number is the most
  clarifying fact in this memo: the entire measurable problem on this market, across every
  tokenized-equity pool and every corporate event studied, is smaller than a rounding error on a
  $15k audit. Spending $15k-50k plus seed capital to protect against $82.80 of observed harm is
  not a close call on economics. Note the scope limit: this argues against the *liquidity pilot*,
  not against a bare compliance deployment, which costs cents in gas.
- The claim boundary stays intact and defensible, which is the thing this project has actually
  built that most competitors have not.
- `[Inferensi]` "We did not launch unaudited code that prices real people's trades, and here is
  the blocker we are clearing first" is a *positive* signal to a serious reviewer, if it is
  stated as a decision rather than discovered as an omission. It only works if it is said out
  loud, and it works considerably better if it is paired with a stated intent to meet the
  obligation once the blocker is cleared.

---

## 9. Recommendation

**Do not launch on X Layer mainnet this week, and do not run a real-liquidity pilot. Treat the
mainnet launch as a real obligation to be met after the assessor-key blocker is cleared, say so
publicly, and ask the organizer what "subsequently" means.**

That is three things. The order matters.

**First, ask.** `[Inferensi]` The single highest-value action on this memo costs nothing: a
written question to the organizer asking whether the mainnet launch is required before judging,
and if so by when. Every other item here is priced in dollars or risk; this one is priced in one
message. It also removes risk 10 outright, and it is the only item whose answer could reverse the
rest of this recommendation. I have not contacted anyone, and this is a recommendation to Dien,
not something I have done.

**Second, do not launch now.** The reasoning:

1. **There is a named production blocker that is not yet cleared.** `[Fakta]` The assessor key is
   derived from the poster key, and the project's own code calls that unacceptable for
   production. `[Inferensi]` Launching with it would contradict a limitation Tinjau has published
   about itself, which is worse for credibility than a late launch. It is also cheap to fix:
   generating an independent key and separating the guardian is hours of work, not dollars.
2. **The product upside is capped at one sentence.** Section 6 shows mainnet licenses "deployed
   and readable on chain 196" and nothing else. It does not touch the claim the project most
   needs and cannot make ("reduces LP loss"), because that is gated on `canClaimLossAvoided`,
   which is `false` on pre-registered data and unaffected by where the code lives.
3. **The evaluator's second route does not exist.** No hook can attach to X Layer's real
   tokenized-equity liquidity: it is Uniswap v3, and v4 hooks are fixed at pool initialization.
   Chasing that suggestion literally means funding a competing pool, which is a business, not a
   fix, and the obligation in section 2 does not appear to require it.
4. **The pilot economics are lopsided.** $15k-50k of review plus seed capital, against $82.80 of
   total measured harm across the entire market this product addresses.

**Third, say it out loud.** `[Inferensi]` A short public note stating the position converts an
omission into evidence of judgment: mainnet launch is understood as a requirement, it is
intended, it is gated on an independently generated assessor key and a security review, and here
is the blocker list. That costs nothing, is true, and is materially better than silence, which
reads as either ignorance of the requirement or inability to meet it.

**Conditions under which I would change this recommendation.**

- **Immediately, if the organizer says mainnet is required before judging.** `[Inferensi]` Then
  the decision is no longer economic and the question becomes the narrowest compliant launch.
  The version I would argue least against is **registry only, no pool, no liquidity**: it is the
  half that holds no fee lever over anyone, carries no capital, costs about $0.003 in gas, and
  still satisfies "launched on the X Layer Mainnet" on a plain reading. Even that version needs
  an independently generated assessor key first, because a compromised derived key can write
  false risk records that a third-party consumer might act on. `[Inferensi]` I would rather see a
  bare registry launched with a clean key than a full pool launched with a derived one.
- **For the full stack including a hooked pool**, I would want all four of: (1) an independently
  generated assessor key held separately from the gas-paying wallet, with a distinct and colder
  guardian; (2) a completed security review with findings fixed; (3) the two live public defects
  fixed (§15 fabricated bankruptcy on the API, §16 frontend validator throw), because adding
  surface area while the existing surface asserts a false corporate event about a real company is
  the wrong order of operations; and (4) for the liquidity pilot specifically, a **named third
  party** that has said it would read the registry or provide liquidity. Demand evidence, not
  supply. Absent (4), a mainnet pool is a more expensive testnet pool.

---

## Sources

Repository, verified 2026-08-22:
`contracts/src/TinjauRiskRegistry.sol`,
`contracts/src/TinjauFeeHook.sol`,
`contracts/src/TinjauRiskPolicy.sol`,
`contracts/src/TinjauRiskTypes.sol`,
`contracts/broadcast/DeployTinjauStack.s.sol/1952/run-latest.json`,
`apps/server/src/chain/tinjauRoleKeys.ts`,
`apps/server/src/llm/provider.ts`,
`docs/buildx-orion-2026/HACKATHON.md`,
`docs/buildx-orion-2026/outputs/05-build/frontend-handoff/known-limitations.md`,
`docs/buildx-orion-2026/outputs/05-build/market-exposure.json`,
`docs/buildx-orion-2026/outputs/05-build/markout-study.md`,
`docs/buildx-orion-2026/outputs/05-build/three-policy-benchmark.md`,
`docs/buildx-orion-2026/outputs/05-build/t7-2-authoritative-addresses.json`.
Test and gas figures from `forge test` and `forge test --gas-report`, run 2026-08-22
(137 passed, 0 failed, 0 skipped).

Official event page, fetched and read directly 2026-08-22:
https://web3.okx.com/xlayer/build-x-series — Participation Requirements block (mainnet
obligation, dedicated X account) and Disclaimer clause 4 "Final Determination" (onchain data,
code quality, innovation, market potential; rankings at the Organizer's sole discretion). Both
quoted verbatim in section 2.

Live chain reads, 2026-08-22, `https://rpc.xlayer.tech`: `eth_chainId`, `eth_gasPrice`,
`eth_getCode`, and `slot0()`/`liquidity()`/`balanceOf` on the ten reference pools.

External: [Uniswap v4 deployments](https://developers.uniswap.org/docs/protocols/v4/deployments) ·
[OKLink X Layer explorer](https://www.oklink.com/x-layer) ·
[XLayerScan](https://www.xlayerscan.com/) ·
[Sherlock 2026 audit pricing reference](https://sherlock.xyz/post/smart-contract-audit-pricing-a-market-reference-for-2026) ·
[Zealynx 2026 audit pricing](https://www.zealynx.io/research/audit-ops/audit-pricing-2026) ·
[QuillAudits 2026 audit cost](https://www.quillaudits.com/blog/smart-contract/smart-contract-audit-cost-2026).
OKB price from the OKX `OKB-USDT` spot ticker and CoinGecko, both read 2026-08-22.
