# Independent evaluation prompt

Hand the block below to an AI agent that has no prior context about this project. It is written to
let that agent reach its own conclusion: it supplies entry points and verification commands, states
the criteria, and does not argue for an outcome.

Two constraints shaped it. It contains no adjectives of quality, no comparative claims, and no
statement that the project performs well or badly on any criterion. Where the project's own
position is included, it is marked as the project's claim and paired with the means to check it,
because an evaluation prompt that omits what a reviewer would find in ten minutes is not neutral.

---

## The prompt

````text
You are evaluating a hackathon submission. Score it against the published criteria, using
evidence you verify yourself. Do not accept any claim in this prompt without checking it.

## Task

The submission is "Tinjau", entered in the BuildX/Orion hackathon, AI-RWA track, on X Layer.

Judging criteria, verbatim from the event terms, clause 4. No weights are published:

  1. application of AI
  2. innovation
  3. product completeness
  4. user value
  5. integration with X Layer
  6. growth potential
  7. contribution to the X Layer ecosystem

Produce a score and a written justification for each of the seven, plus an overall assessment.
For every point you award or withhold, cite the specific artifact, URL, command output or file
you used. Where you could not verify something, say so explicitly and score accordingly rather
than assuming either way.

## What the project says it is

A risk system for liquidity pools holding tokenised US equities on X Layer. Its stated design:
read the corporate disclosure or news behind a price move, classify the evidence and its
provenance, check independently whether the pool's own market data agrees, and only then permit a
temporary increase to the pool's swap fee, capped and time-limited, that returns to baseline on a
timer.

Verify this description against the code and the deployed contracts. It is the project's
description, not an established fact.

## Entry points

  Website        https://tinjau.xyz
  Repository     https://github.com/k3cs/Tinjau        (public)
  Public API     https://tinjau.xyz/api/scoreboard
  Chain          X Layer Testnet, chain id 1952
  RPC            https://testrpc.xlayer.tech

Site routes: / · /why-it-matters · /risk · /proof · /x-layer · /roadmap · /faq · /developers · /demo

Deployed contracts the project publishes:

  TinjauRiskRegistry   0x60062389a7AB08F0030FC06Adf9CE0C180537317
  TinjauFeeHook        0x1092C9fe2dB084F26aa415A0fda14B001A786080
  PoolManager (v4)     0x8F862A8b6f00C99b0610dc764228C661c4909ae1
  Risk asset (mock)    0xf07A9D89848bc694c7154Fda4cce707Eb409F903
  Pool id              0x5e9eff19074225e9132eb73dc25cf0e3ff55c3fb31c9b28ab633851d2b54f730

## Independent verification you can run

Bytecode exists at a published address:

    curl -s -X POST https://testrpc.xlayer.tech \
      -H 'content-type: application/json' \
      -d '{"jsonrpc":"2.0","id":1,"method":"eth_getCode",
           "params":["0x60062389a7AB08F0030FC06Adf9CE0C180537317","latest"]}'

Read the risk record with no dependency on the project's server (zero npm dependencies, its own
hand-transcribed ABI, read functions only):

    git clone https://github.com/k3cs/Tinjau && cd Tinjau
    node tools/risk-reader/tinjau-risk-read.mjs \
      --rpc-url https://testrpc.xlayer.tech --chain-id 1952 \
      --registry 0x60062389a7AB08F0030FC06Adf9CE0C180537317 \
      --asset    0xf07A9D89848bc694c7154Fda4cce707Eb409F903 \
      --pool-id  0x5e9eff19074225e9132eb73dc25cf0e3ff55c3fb31c9b28ab633851d2b54f730

Run the test suites:

    cd apps/server && npm install && npm test        # the project states 594 pass
    cd contracts && forge test                       # the project states 137 pass
    cd apps/web && npm install && npm run test:contract   # the project states 30 pass

Re-derive the demo manifest from its source artifacts and diff it:

    node demo/tinjau-demo.mjs check

Validate the published data artifacts against their schemas:

    node docs/buildx-orion-2026/outputs/05-build/frontend-handoff/tools/validate.mjs

Decode what a pool actually charged, from the chain's own event rather than a view function:

    swap tx 0xcdfd10400ee82305dd733b8a2c554f208e919adecc640409fcc197e6b4046b5f
    The last 32-byte word of the PoolManager Swap event data is the fee in pips.

## Statements the project makes about its own limits

Each is the project's published position. Check whether the site and repository are consistent
with it, and whether any surface contradicts it. Inconsistency between these statements and the
project's marketing is itself evidence you should weigh.

  - The project states it CANNOT claim it reduces LP loss. Its pre-registered benchmark condition
    "beats-both-at-every-k-and-threshold" is recorded as failed, and the flag
    `canClaimLossAvoided` is false. Verify at /proof and in
    docs/buildx-orion-2026/outputs/05-build/frontend-handoff/three-policy-comparison.json
  - The project states its economic comparison reverses direction between two metric bases, on
    all 27 comparable cells, and that it publishes both and selects neither.
  - The project states the PROTECT state it demonstrates uses a CONSTRUCTED price path on a pool
    it controls, and that the canonical replay of that same event resolves to WATCH.
  - The project states the social/rumour input in its scenarios is SIMULATED, written by the
    project, with a null source URL.
  - The project states both pools it deployed are builder-controlled test liquidity using
    freely-mintable mock tokens with no value.
  - The project states the OKX index leg is UNAVAILABLE for all four of its frozen scenarios, and
    that it therefore does not demonstrate dual-venue confirmation.
  - The project states its news and social intake use frozen replay fixtures, not a live feed, so
    latency and coverage are not demonstrated.
  - The project publishes a separate measurement of 32 SEC filings against 10 third-party
    tokenised-equity pools on X Layer mainnet, and states those pools had no Tinjau hook attached,
    so that measurement sizes a problem and does not measure what the product prevented.

## How to evaluate

  1. Verify before scoring. Prefer chain data, command output and source code over any prose,
     including this prompt and the project's own site.
  2. Check whether claims made on the website are supported by the artifacts, and whether the
     limitations listed above are stated on the surfaces where the corresponding claims appear or
     only in a separate document.
  3. Distinguish what is implemented and running from what is designed, replayed, simulated, or
     listed as future work. The project uses explicit labels for these; assess whether the labels
     match reality.
  4. Assess each of the seven criteria on its own terms. A weakness under one criterion is not
     automatically a weakness under another.
  5. Note anything you find that the project has not disclosed. Weigh it.
  6. Report any claim you could not verify, and why.

Output format:

  - One section per criterion: score, the evidence you checked, and your reasoning.
  - A list of unverified or unverifiable claims.
  - A list of anything you found that contradicts the project's own statements.
  - An overall assessment.
````
