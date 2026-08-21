# Independent evaluation prompt

Hand the block below to an AI agent that has no prior context about this project, so it can score
the submission against the published criteria and reach its own conclusion.

Three constraints shaped it:

- **No adjectives of quality and no comparative claims.** Nothing in it says the project performs
  well or badly on any criterion.
- **Symmetric.** An earlier draft listed eight statements of limitation and zero of what the
  project claims it demonstrates. That is not neutral, it is tilted. Both lists are present now,
  both marked as the project's claims, and both paired with the means to check them.
- **Complete enough to evaluate.** The agent is given the problem the project addresses, the
  mechanism, the state model, the enforcement limits with their actual values, what is on each
  page of the site, and where things live in the repository. A reviewer who has to reconstruct the
  idea from source before starting will score the idea rather than the work.

---

## The prompt

````text
You are evaluating a hackathon submission. Score it against the published criteria using evidence
you verify yourself. Do not accept any claim in this prompt without checking it, including the
descriptive sections: they are the project's account of itself, reproduced so you know what to
check, not established fact.

## Task

The submission is "Tinjau", entered in the BuildX/Orion hackathon, AI-RWA track, on X Layer. It is
a hackathon MVP built to a fixed deadline, not a production system.

Judging criteria, verbatim from the event terms, clause 4. No weights are published:

  1. application of AI
  2. innovation
  3. product completeness
  4. user value
  5. integration with X Layer
  6. growth potential
  7. contribution to the X Layer ecosystem

Produce a score and written justification for each of the seven, plus an overall assessment. For
every point awarded or withheld, cite the artifact, URL, command output or file you used. Where
you could not verify something, say so and score accordingly rather than assuming either way.

## 1. The problem the project says it addresses

Tokenised US equities trade on-chain continuously. The reference market that sets their value
does not: the US listing closes, and corporate disclosures (SEC filings) arrive at arbitrary
times, including outside trading hours.

An automated market maker pool quotes a price derived from its own reserves. It has no mechanism
for learning that a disclosure has changed what the asset is worth. In the interval between a
disclosure landing and the pool being re-priced by arbitrage, a trader who has read the disclosure
can trade against a stale quote. The cost of that trade falls on the pool's liquidity providers.

Assess whether this problem is real and material, not only whether the project's response to it
works. The project publishes its own measurement of it (see §6).

## 2. What the system does

Stated pipeline, in order:

  1. Ingest a claim: an SEC filing, a news article, or a social post.
  2. Normalise it, preserving source class (OFFICIAL / NEWS / RUMOR), publisher, original
     timestamp, URL, and a content hash.
  3. Build an evidence graph: resolve which company and token the claim concerns, group
     republished copies back to a single origin, mark contradictions, mark whether a claim is
     hedged or asserted, and record whether an official filing confirms it.
  4. Apply deterministic promotion rules to that graph to produce a risk state.
  5. Check the market independently: pool price, price basis against a reference, short-window
     drawdown, trade velocity, liquidity, executable exit depth, data freshness, and an anti-wick
     condition.
  6. Write the resulting record on chain.
  7. A Uniswap v4 hook reads that record and charges a fee accordingly.

### The state model

  NORMAL   No material unresolved evidence. Baseline fee only.
  WATCH    Rumour, a single source, a contradiction, or unusual market behaviour without
           sufficient attribution. Monitoring increases. The elevated fee is NOT authorised.
  PROTECT  Qualifying official evidence, or sufficiently corroborated non-official evidence, with
           a valid market confirmation. A temporary, capped fee increase is authorised.

Rules the project states are enforced rather than advisory: rumour-only evidence can never exceed
WATCH; one news source alone cannot authorise PROTECT; duplicate syndications of one origin count
as one source; stale or missing market data cannot create a new PROTECT, but also cannot cancel a
protection already running; WATCH expires if not refreshed; PROTECT has a maximum duration, a
cooldown, and deterministic recovery.

### The two trust domains

The project's stated architectural claim is that the model never holds authority. The model is
used for language and identity work: parsing ambiguous prose, resolving entities, collapsing
duplicates, detecting contradictions, and explaining confidence. The contract validates supported
assets and pools, state transitions, signature, nonce, freshness and expiry, the fee ceiling, the
maximum duration, the cooldown, and recovery. The contract can reject a model proposal.

Thresholds are stated to be frozen in versioned configuration, not chosen by a model at runtime.

### The enforcement limits, as deployed

  baseFee              500 pips (0.05%)
  maxFee            20,000 pips (2.00%)
  widenDuration      3,600 s held fully widened
  decayDuration     18,000 s of linear decay back to base
  maxProtectDuration 21,600 s hard cap on one interval
  cooldown           3,600 s before protection may re-arm

These are readable from the deployed registry (§7). Recovery is stated to require no keeper
transaction: expiry is applied at read time.

## 3. What is on the website

  https://tinjau.xyz

  /                 The problem, a three-term glossary, the measured result including the part
                    that went against the project.
  /why-it-matters   A measurement of 32 real SEC filings against 10 real third-party tokenised
                    equity pools on X Layer mainnet, with its limitations.
  /risk             What the model is used for and what it may never do, the containment rule,
                    the fee lifecycle, then two frozen scenarios followed end to end.
  /proof            Deployment ledger with addresses and bytecode sizes, the three-policy
                    benchmark, the claim gate, findings, prohibited sentences, data limitations,
                    capability evidence, build evidence.
  /x-layer          What is read from the chain, what was deployed onto it, and what the project
                    measured about the chain and published back.
  /roadmap          What runs today, what is built but not connected, and what is not built, each
                    gated by a named condition rather than a date.
  /faq              The seven judging criteria answered, plus a group the project titles "the
                    awkward questions".
  /developers       Commands a reader can run against the deployed registry, by role.
  /demo             A three-scene guided walkthrough.

  https://tinjau.xyz/api/scoreboard   Public JSON of the frozen scenario records.

## 4. Repository

  https://github.com/k3cs/Tinjau   (public)

  contracts/           Solidity: TinjauRiskRegistry, TinjauFeeHook, types, tests
  apps/server/         Evidence pipeline, market confirmation, decision engine, benchmark
  apps/web/            The website
  tools/risk-reader/   A standalone reader for the on-chain record, zero npm dependencies
  demo/                The three-scene driver
  docs/                Method documents, raw measurement data, published data artifacts

## 5. What the project claims it demonstrates

Each is the project's claim. Verify it.

  - The full path runs end to end on a public chain: evidence, decision, on-chain record, hook,
    and a real swap whose fee is decoded from the pool's own Swap event rather than a view
    function.
  - Rumour containment holds: on its rumour scenario the state is WATCH and the pool charged 500
    pips, the base fee, against a ceiling of 20,000.
  - Deterministic recovery is observable on chain: a PROTECT record with a 21,600 s cap expired
    with no keeper transaction, and the registry then reads effective NORMAL with the fee at base.
  - Restraint on a neutral control: on a routine filing that moved the price, a volatility-only
    policy raised its fee at every trigger setting tested, and Tinjau declined at every setting.
    The project states this is its one surviving comparative claim, and that it is behavioural
    rather than economic.
  - The on-chain record is readable by anyone without the project's server, using a reader with
    zero npm dependencies and its own hand-transcribed ABI.
  - A measured property of X Layer's public RPC: reads are served from nodes at differing heights,
    with a convergence lag the project measured at 2,519 to 2,746 ms per write.
  - Test coverage the project states: 594 server tests, 137 contract tests including fuzz
    properties on the fee band, 30 web tests.

## 6. What the project states it cannot claim

Each is the project's published position. Check whether the site and repository are consistent
with it, and whether any surface contradicts it. Inconsistency between these and the project's
own marketing is itself evidence to weigh.

  - It CANNOT claim it reduces LP loss. Its pre-registered benchmark condition
    "beats-both-at-every-k-and-threshold" is recorded failed and the flag `canClaimLossAvoided`
    is false. On its four frozen scenarios Tinjau never reached PROTECT, so its fee never left
    baseline and its replayed economics tie a do-nothing policy.
  - Its economic comparison reverses direction between two metric bases on all 27 comparable
    cells. It publishes both and selects neither.
  - The four frozen scenarios resolve A=WATCH, B=WATCH, C=WATCH, D=NORMAL. The PROTECT it
    demonstrates uses a CONSTRUCTED price path on a pool it controls; the canonical replay of that
    same event resolves to WATCH.
  - The rumour input is SIMULATED, written by the project, with a null source URL.
  - Both pools it deployed are builder-controlled test liquidity using freely-mintable mock tokens
    with no value.
  - The OKX index leg is UNAVAILABLE for all four frozen scenarios, so dual-venue confirmation is
    not demonstrated.
  - News and social intake use frozen replay fixtures, not a live feed, so latency and coverage
    are not demonstrated.
  - The 32-filing measurement in §1 was taken on third-party pools with NO Tinjau hook attached.
    It sizes a problem; it does not measure what the product prevented.
  - The reference consumer that reads the record was built by the project, so it demonstrates
    reusability and is not evidence of third-party adoption.

## 7. Verification you can run

Bytecode at a published address:

    curl -s -X POST https://testrpc.xlayer.tech -H 'content-type: application/json' \
      -d '{"jsonrpc":"2.0","id":1,"method":"eth_getCode",
           "params":["0x60062389a7AB08F0030FC06Adf9CE0C180537317","latest"]}'

Read the record and the enforcement limits, without the project's server:

    git clone https://github.com/k3cs/Tinjau && cd Tinjau
    node tools/risk-reader/tinjau-risk-read.mjs \
      --rpc-url https://testrpc.xlayer.tech --chain-id 1952 \
      --registry 0x60062389a7AB08F0030FC06Adf9CE0C180537317 \
      --asset    0xf07A9D89848bc694c7154Fda4cce707Eb409F903 \
      --pool-id  0x5e9eff19074225e9132eb73dc25cf0e3ff55c3fb31c9b28ab633851d2b54f730

Decode what a pool actually charged, from the chain's own event:

    swap tx 0xcdfd10400ee82305dd733b8a2c554f208e919adecc640409fcc197e6b4046b5f
    The last 32-byte word of the PoolManager Swap event data is the fee in pips.

Test suites:

    cd apps/server && npm install && npm test
    cd contracts && forge test
    cd apps/web && npm install && npm run test:contract

Re-derive the demo manifest from its sources and diff it, and validate the data artifacts:

    node demo/tinjau-demo.mjs check
    node docs/buildx-orion-2026/outputs/05-build/frontend-handoff/tools/validate.mjs

Deployed contracts the project publishes:

    TinjauRiskRegistry   0x60062389a7AB08F0030FC06Adf9CE0C180537317
    TinjauFeeHook        0x1092C9fe2dB084F26aa415A0fda14B001A786080
    PoolManager (v4)     0x8F862A8b6f00C99b0610dc764228C661c4909ae1
    Risk asset (mock)    0xf07A9D89848bc694c7154Fda4cce707Eb409F903
    Chain                X Layer Testnet, id 1952, RPC https://testrpc.xlayer.tech

## 8. How to evaluate

  1. Verify before scoring. Prefer chain data, command output and source code over any prose,
     including this prompt and the project's own site.
  2. Check whether the limitations in §6 appear on the surfaces where the corresponding claims in
     §5 appear, or only in a separate document.
  3. Distinguish implemented and running from designed, replayed, simulated, or future work. The
     project uses explicit labels for these. Assess whether the labels match reality.
  4. Assess each criterion on its own terms. A weakness under one is not automatically a weakness
     under another.
  5. Note anything you find that the project has not disclosed, and weigh it.
  6. Report any claim you could not verify, and why.

Output format:

  - One section per criterion: score, evidence checked, reasoning.
  - A list of unverified or unverifiable claims.
  - A list of anything that contradicts the project's own statements.
  - An overall assessment.
````
