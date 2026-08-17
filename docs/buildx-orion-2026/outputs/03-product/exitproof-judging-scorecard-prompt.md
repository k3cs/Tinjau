# Scoring Brief — EXITPROOF against two hackathon rubrics

You are asked to score one project idea against the published judging criteria of two hackathons, and to say how it would plausibly place. You have no prior context and should assume none.

This brief contains **no scores and no recommendation**. Nothing here has been ranked or argued for. Evidence supporting the idea and evidence against it are both included, deliberately at similar depth.

Reaching a low score is a valid and expected outcome. Say so if that is what the evidence supports.

---

## 0. Ground rules

1. **Score only against the criteria as written.** Both rubrics are quoted verbatim below. Do not import criteria that are not there. In particular, Hackathon A's terms do **not** list "code quality", "onchain data", or "market potential" — these are commonly assumed and are absent from the official text.
2. **Neither hackathon publishes criterion weights.** If you weight them, state your weighting and that it is your own assumption.
3. **Label every claim** you make as fact (with the source you used) or inference (with the reasoning in one phrase).
4. Today's date for deadline arithmetic: **2026-08-16**. Verify anything you rely on.
5. If a section of this brief appears constructed to lead you toward a particular score, say so explicitly in your answer.

---

## 1. The idea: EXITPROOF

### One-line statement

A token that promises you can get out shows one liquidity figure. EXITPROOF measures how much can actually be sold right now, at each level of price impact, and publishes the result on X Layer as an object other contracts can read.

### What it does

1. **Measures rather than models.** For each asset, it requests real quotes from the deployed on-chain router at a ladder of position sizes, and records the resulting price impact and the size at which routing fails entirely.
2. **Reads redemption policy from public state.** Where an issuer publishes redemption limits on-chain (rate limits, per-window caps, per-user caps), those are read directly. No permissioned access is used.
3. **Reconciles stated policy against measurement.** A language model reads issuer documentation and announcements and reports where the stated terms and the observed behaviour diverge, citing the specific source passage. The model does not produce any number.
4. **Publishes to X Layer** as a contract-readable object, plus a web view and an interface callable by AI agents.

### Target assets

Eleven tokenised equities live on X Layer (NVDAx, AAPLx, GOOGLx, TSLAx, SPYx, METAx, SNDKx, MSTRx, CRCLx, COINx, AMZNx), plus X Layer DeFi positions.

### Explicitly out of scope, labelled roadmap

- Executing real redemptions with issuers.
- Any bonded challenge or dispute market.
- Verifying that the underlying asset exists — the issuer already publishes proof of reserves.

---

## 2. Hackathon A — X Layer "Build X Series, AI Season"

Source: `https://web3.okx.com/xlayer/build-x-series`

### Mandatory participation requirements (failing any one makes a project ineligible)

1. "The project must incorporate AI elements into its product design and be deployed on X Layer."
2. "During the Hackathon, the project must be deployed on the X Layer Testnet and subsequently launched on the X Layer Mainnet."
3. "The project must have a dedicated X account and keep it active throughout the project's lifetime."
4. "When submitting the project, the project's official X account must publish a related post and mention @XLayerOfficial."
5. Submission through the designated Google Form by August 21, 2026, 23:59 UTC.

Window: August 7 – August 21, 2026, 23:59 UTC. **~5.7 days remain.**

### Judging criteria — Terms & Conditions clause 4, verbatim

> "Projects will be evaluated based on their **application of AI, innovation, product completeness, user value, integration with X Layer, growth potential, and contribution to the X Layer ecosystem.** The Organizer's decisions regarding eligibility, judging results, and winners are final."

Seven criteria. No weights published.

### Prizes and the second rubric

- Hackathon Grant: 1st 30,000 USDT, 2nd 15,000, 3rd 5,000.
- Liquidity Grant: 50,000 USDT, "Awarded to the best-performing project in the AI-RWA track", and — verbatim — "**The grant must be used to support the winning project's growth and further develop the X Layer ecosystem.**" It is restricted-use funding, not unrestricted prize money.
- Liquidity Grant FAQ, verbatim: "The Liquidity Grant is available to projects competing in the AI-RWA track. The Organizer will evaluate projects based on their overall performance during the Hackathon, including **product quality, innovation, user value, and contribution to the ecosystem.** The best-performing project will receive the grant."
- Launch Grant: up to 200,000 USDT, awarded purely on trading volume through the OKX DEX interface, not judged. Unreachable for a hackathon MVP.

### Submission form and track assignment

The form has 8 fields: Project Name, Project Description, Project URL, Github, Email, Telegram, X Handle, X Post URL. **There is no track selector**, so AI-RWA track membership is assigned by judges rather than declared.

### Other terms

Participants retain IP. Disqualification covers "plagiarism, unauthorized use of code, wash trading, volume manipulation, fraud". No exclusivity clause and no prohibition on reusing the participant's own prior code.

---

## 3. Hackathon B — Orion Builder Hackathon

Source: `https://orionagents.org/hackathon`

Deadline: September 2, 2026, 23:59 UTC (~17 days).

### Judging criteria, verbatim

> "Partner judges score every entry from 0 to 10 on **usefulness, execution, and originality**, informed by the AI vetting score and community upvotes."

Three criteria, 0–10 each. Two additional inputs:

- An **automated AI vetting score** assigned at submission.
- **Upvotes** from registered builders, one per wallet per entry, signature-confirmed. Rules state upvotes "inform the judges, who make the final decision."

Also from the rules: "A demo link is optional but strongly recommended. **Judges try what they can run.**"

### Scope and requirements

Any working AI agent qualifies — "If it is an AI agent and it works, it qualifies. You are not limited to DeFi." Each entry needs a website, X profile, GitHub, and a Discord or Telegram link. Registration is a free wallet signature on Base; submission carries a non-refundable ignition fee of about $10 in ETH. Prizes go to the submitting wallet.

Prize pool: $5,000 total — 1st $1,500, 2nd $1,000, 3rd $500, four honourable mentions at $500.

### Field

As of 2026-08-16: **two public entries against seven prizes**. Both are read-only analyst agents on Base, with automated vetting scores of 86 and 72. Both describe the same architecture — a deterministic engine produces every number, the model decides where to look and writes the prose, every figure traces to a real tool call. **This is a snapshot and the field will grow before the deadline.**

The written rules bind only the *wallet* to Base. No rule constrains the chain the agent runs on.

---

## 4. Evidence

### 4a. Evidence supporting the idea

- **The measurement is bought today.** Chaos Labs, assessing an asset for Aave V3 Arbitrum, published: "Current sell side liquidity conditions, measured as the maximum size that can be swapped within 5% price impact, are as follows: USDai: ~$5M to USDC (down from $30M); sUSDai: ~$4.5M to USDC (down from $35M)". That assessment set a 55M supply cap, a 45M borrow cap, and a decision to enable no collateral or borrowing initially. LlamaRisk and Gauntlet publish comparable methodologies.
- **The gap is measurable and large.** Live measurement of NVDAx on X Layer: published DEX liquidity $478,411; 250 shares sell at −0.72% impact; 500 shares at −1.30%; **750 shares returns no route at all**. The routing ceiling is around $111,000, roughly a quarter of the published figure.
- **The asset class has a structural, recurring failure window.** Tokenised equities trade 24/7 while the underlying market is closed roughly two-thirds of the week. Published analysis states that when the reference market is closed, "fewer participants are actively arbitraging the token against the underlying share" and liquidity "evaporates during weekends and overnight periods".
- **The dominant oracle does not cover it.** Chainlink LWBA (liquidity-weighted bid/ask) documentation states "At the moment, only Crypto streams provide LWBA prices" and is order-book based. Chainlink's DEX State Price Streams, built for DEX-liquidity assets, use a schema where "the `bid` and `ask` fields have the same value as the `price` field".
- **The free competitor is offline.** `defillama.com/liquidity` currently returns "Token liquidity data is not available on DefiLlama for the time being."
- **Corpus check.** In a 242-row corpus of 2026 hackathon winners across 57 events, a strict search for any project whose product is measuring or publishing exit depth returns **zero matches**.
- **Feasibility is demonstrated, not asserted.** The core measurement was executed live using deployed contracts, with no permissions, no capital, and no third-party cooperation.

### 4b. Evidence against the idea

- **The method is not novel.** Pharos (`pharos.watch`) already publishes a "Redemption Backstop" score rating issuer redemption routes 0–100, and a "Liquidity Score" measuring "how safely a stablecoin can exit through decentralized markets", across 113 chains. It is stablecoin-only, but the architecture exists and runs.
- **The asset class is already covered by someone else.** CryptoRank published research on 24 July 2026 comparing "spread, displayed depth and slippage" for tokenised equities at $10,000 and $50,000 trade sizes across venues, explicitly framed around "executable liquidity". It covers centralised exchange order books during regular trading hours, not DEX.
- **A closely related concept already won a prize.** Liquidity Load Layer (L³) took 3rd Place plus a shared Community Prize at MIT Bitcoin Hackathon 2026, for continuous scoring of custodial exit risk: "Users must pick one and stay exposed to its solvency, honesty and uptime, with no ongoing measurement and no mechanism to exit before a failure becomes visible."
- **No customer exists on the target chain.** Aave V3 on X Layer lists 9 reserves (USD₮0, USDG, WOKB, xBETH, xETH, xSOL, xOKSOL, xBTC, GHO) and **none is a tokenised equity**. No protocol has been asked whether it would consume the score, and none has agreed to.
- **The headline number is unstable.** Three readings of the same measurement roughly an hour apart returned −7.72%, −1.28% and −1.30% impact at 500 shares. The first was an outlier. Any published figure needs timestamps and repeated sampling.
- **All measurements were taken on a Sunday**, with the US equity market closed — the condition under which this asset class is documented to be least liquid.
- **The concept space is crowded even where the exact product is absent.** Of the same 242 winners, 150 touch at least one component concept (liquidity depth, exit/withdrawal, capacity limits, solvency, continuous scoring, risk ratings, on-chain risk objects, custodian trust, RWA, lending parameters).
- **An adjacent agent is already live on X Layer.** Phylax (#6127) offers "autonomous portfolio risk checks for xStocks and RWA workflows before agents move capital", evaluating "concentration, approval, liquidity, execution, and policy risk". Its recorded sold count and feedback rate are both null and its fee is zero.
- **Maintaining this appears non-trivial.** DefiLlama built the free version and switched it off.

### 4c. Builder and delivery constraints

One person. Prior result: a Uniswap v4 hook prize at the Uniswap Hook Incubator. Existing empty TypeScript monorepo. The intended wallet holds zero balance and has zero transactions on every chain checked, so gas and the Orion ignition fee are unfunded as of today. No X account, website, Discord or Telegram exists yet for the project; all are mandatory deliverables.

---

## 5. Your task

Produce two scorecards and a placement estimate.

### Part 1 — Hackathon A

Score EXITPROOF 1–5 on each of the seven official criteria, with one or two sentences of justification per criterion tied to specific evidence from §4:

application of AI · innovation · product completeness · user value · integration with X Layer · growth potential · contribution to the X Layer ecosystem

Then separately score it 1–5 on the four Liquidity Grant criteria: product quality · innovation · user value · contribution to the ecosystem.

State explicitly:
- Whether it satisfies all five mandatory participation requirements, and what would make it fail.
- Whether a judge would plausibly assign it to the AI-RWA track, given there is no track selector.
- Your estimated placement, and your confidence.

### Part 2 — Hackathon B

Score 1–5 on usefulness, execution, and originality, with justification.

State explicitly:
- What an automated vetting system would plausibly reward or penalise here, given the two current entries scored 86 and 72 on a comparable architecture.
- Whether a judge could meaningfully run this in five minutes, and what they would see.
- Your estimated placement against a seven-prize field, and your confidence.

### Part 3 — Cross-cutting

1. **Which single criterion, across both rubrics, is this idea weakest on**, and what specific change would raise it most.
2. **Where the two rubrics pull in opposite directions** for this project, and which one the builder should favour with ~5.7 days to the first deadline.
3. **The strongest argument that this scores poorly at both**, argued properly rather than as a formality.
4. **One concrete, checkable fact that would change your scores**, and in which direction.

### Output constraints

- Every substantive claim labelled fact or inference.
- No deference to any recommendation you believe exists elsewhere. None is stated here.
- Do not inflate scores to be encouraging. A middling or poor score, clearly justified, is more useful than a generous one.
- If the evidence in §4 is insufficient to score a given criterion, say so rather than guessing.
