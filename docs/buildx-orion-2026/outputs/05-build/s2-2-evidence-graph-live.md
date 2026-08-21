# S2.2 — The evidence graph, derived live by the model, next to the heuristics

**Artifact:** `docs/buildx-orion-2026/outputs/05-build/data/s2_2_scenario_a_graph_live.json`
**Runner:** `apps/server/src/studies/scenarioAGraphLive.ts`
**Run:** 2026-08-21T18:01:11.747Z · model `gemini-3.6-flash` (ambient `GEMINI_MODEL=gemini-3.5-flash` was overridden and both values are recorded)
**Scenario:** `A-rumor-watch`, sha256 `a69691da…03fc22`, five claims

## What this is

`apps/server/src/evidence/` derives the evidence graph with heuristics: regular expressions over
attribution phrases, an alias table of publisher names, and a lookup from company and symbol to a
supported pool. The site calls the capability "AI Evidence Graph". Until this study existed, no
model had ever been asked the same questions on the same input.

This asks it, once, on scenario A, and publishes where the two answers coincide and where they do
not. **Nothing here adjudicates a disagreement.** No heuristic was changed to match the model, and
no model output was post-processed to match a heuristic. The deterministic promotion engine remains
the decider and the model's output is not wired into it; `runScenario` was run on the untouched
scenario and returned `WATCH`, which is scenario A's pre-registered expectation.

## Method

Both sides were shown the same ten fields per claim: `claimId`, `sourceClass`, `sourceId`,
`publisherOrAuthor`, `publishedAt`, `company`, `tokenSymbol`, `tokenAddress`, `eventType`, and the
verbatim `claimTextOrPointer`.

The model was **not** shown `independenceGroup`, `relation`, or `duplicateOf`. Those are the frozen
scenario's hand labels (the answer a human wrote in T0.2). `deriveIndependence` does not read them
when deriving either, so withholding them keeps both sides answering the same question from the same
evidence.

The model was asked for **graph structure only** through a Zod schema passed to `generateObject`, so
the shape is structurally guaranteed rather than best-effort JSON. Three questions, nothing else: an
entity partition, an origin partition, and a list of contradicting pairs. No state, no severity, no
confidence, no recommendation.

Heuristic answers were taken from the production modules, unmodified:

- **Entity** — `resolveAsset(company, tokenSymbol, tokenAddress)` from `evidence/assets.ts`. Two
  claims are the same entity when they resolve to the same key (the token address when resolved).
- **Origin** — `deriveIndependence(claims)` from `evidence/graph.ts`. Two claims share an origin
  when their `derivedOriginKey` matches.
- **Contradiction** — `relation === "CONTRADICTS"` on either claim (the input
  `buildEvidenceGraph`'s `CONTRADICTION_DECLARED` factor reads), OR both claims sitting in one
  origin that `detectSelfRevision` flagged as having stated two different figures.

### Integrity, before any token was spent

Scenario A pins **no** document hashes: none of its five claims carries `sourceContentSha256`, and
only one references a local file at all. That is a gap in the fixture and it is published as one
rather than papered over with a check that always passes. Two checks ran instead:

1. The scenario file itself was hashed and compared against a constant declared in the study. It is
   a drift alarm (an edit to the frozen scenario breaks the study loudly), not an independent
   freeze.
2. Every claim referencing a local document had that document hashed. One did
   (`sources/simulated-rumor-2026-07-27-social.json`, sha256 `d6ec4851…79dbcd`). It carries no pin,
   so it is recorded `UNPINNED` — recorded, not verified, and not a pass.

## The agreement table

Ten claim pairs, three comparisons each, thirty comparisons total. `H` is the heuristic, `M` the
model.

| Pair | Same entity (H / M) | Same origin (H / M) | Contradicts (H / M) |
| --- | --- | --- | --- |
| a-001 / a-002 | yes / yes ✅ | no / no ✅ | no / no ✅ |
| a-001 / a-003 | yes / yes ✅ | no / no ✅ | no / no ✅ |
| a-001 / a-004 | yes / yes ✅ | no / no ✅ | no / no ✅ |
| a-001 / a-005 | yes / yes ✅ | no / no ✅ | no / no ✅ |
| a-002 / a-003 | yes / yes ✅ | yes / yes ✅ | no / no ✅ |
| a-002 / a-004 | yes / yes ✅ | yes / yes ✅ | no / no ✅ |
| a-002 / a-005 | yes / yes ✅ | no / **yes** ❌ | no / no ✅ |
| a-003 / a-004 | yes / yes ✅ | yes / yes ✅ | no / no ✅ |
| a-003 / a-005 | yes / yes ✅ | no / **yes** ❌ | no / no ✅ |
| a-004 / a-005 | yes / yes ✅ | no / **yes** ❌ | no / no ✅ |

| Category | Agree | Disagree | Model silent |
| --- | --- | --- | --- |
| Entity resolution | 10 / 10 | 0 | 0 |
| Syndication origin | 7 / 10 | 3 | 0 |
| Contradiction | 10 / 10 | 0 | 0 |

The model placed every claim in exactly one entity group and one origin group, invented no claim
ids, and left nothing unplaced. Its groupings were:

- **Entity:** one group, all five claims, labelled "NVIDIA CORPORATION / wNVDAx".
- **Origin:** two groups. `claim-a-001` alone ("Social media rumor"), and
  `claim-a-002`, `-003`, `-004`, `-005` under "The Wall Street Journal, 2026-07-26" with
  `originClaimId: claim-a-004`.
- **Contradictions:** none.

The heuristic derived three origins: `wsj` (a-002, a-003, a-004),
`unrecognised:datacenterdynamics.com` (a-005), and `unrecognised:simulated:` (a-001).

## The disagreements, one at a time

All three disagreements are the same underlying event seen from three pairs: **is `claim-a-005`
(DataCenterDynamics) part of the WSJ origin?** The model says yes. The heuristic says it has its own
origin key. Neither was changed.

### claim-a-002 / claim-a-005, claim-a-003 / claim-a-005, claim-a-004 / claim-a-005

**What the heuristic did.** `claim-a-005`'s text is a headline ending `… Ohio data center - report"`.
No `ATTRIBUTION_PATTERN` in `evidence/graph.ts` matches, because the headline names no outlet — so
`attributedTo` stays `null`. The `UNNAMED_RELAY_PATTERNS` entry `/[-–—]\s*report\s*["'”’]?\s*$/i`
does match, so `relaysUnnamedReport` is `true` and the claim keeps its own key,
`unrecognised:datacenterdynamics.com`. `graph.ts` documents this as deliberate: the claim has
disclaimed being an origin but has not said whose report it is relaying, so it can be neither merged
nor counted.

**What the model did.** It read the whole set together and inferred that a headline disclaiming its
own originality, published the same day, about the same $250bn figure, alongside two outlets that
explicitly name the WSJ, is the same story. Its stated basis was "CNBC, The Next Web, and
DataCenterDynamics attribute their reports regarding the $250 billion Nvidia-OpenAI financing
backstop to the Wall Street Journal report."

**Which is right.** Not resolved here, and I do not think it can be resolved from this evidence
alone. The two answers are not really answering the same question. The heuristic asks "does this
claim name its origin?" and correctly answers no. The model asks "which origin is this, given
everything else in the set?" and gives an answer the heuristic's design explicitly declines to
guess. There is a real argument on each side:

- For the heuristic: the headline genuinely does not name the WSJ. A rule that infers an origin
  from co-occurrence would, on a different day, merge two independent scoops that happened to run
  together — and merging is the direction that *removes* corroboration silently.
- For the model: the frozen scenario's own hand label agrees with it (`claim-a-005` is labelled
  `relation: DUPLICATE, duplicateOf: claim-a-004`), and the scenario's pre-registered reasoning
  names DataCenterDynamics as one of the four outlets carrying one WSJ story. But a hand label is
  a human's judgement, not ground truth, and it was withheld from the model precisely so this
  comparison would mean something.

**Why nothing was changed.** Both readings are defensible, the heuristic's behaviour is documented
as intentional rather than accidental, and rule 2 of this task is that publishing the disagreement
is the deliverable. Editing either side to make the table go green would destroy the only
information this study produces.

**How much this disagreement actually costs, in this scenario.** Less than it looks, and that is
worth stating rather than leaving the reader to assume the worst. `countDerivedIndependentOrigins`
already excludes any claim with `relaysUnnamedReport`, so `claim-a-005` contributes nothing to the
origin count under the heuristic. Under the model's grouping it would fold into `wsj`, which also
contributes nothing new. Either way `usableOriginCount` is **1**, the §0.7 two-origin bar is
unmet, and scenario A stays at `WATCH`. The two sides disagree about the shape of the graph, not
about the corroboration arithmetic that the promotion engine reads.

### The contradiction axis: agreement that means less than it looks

Both sides returned zero contradictions across all ten pairs. That is a genuine 10/10, but it is not
a like-for-like 10/10. The heuristic's contradiction test is half hand label — it fires on
`relation === "CONTRADICTS"`, which nobody set on scenario A — and only the self-revision half is
derived from text. The model was deliberately not shown that label. Two methods agreeing that
nothing is there, when one of them is reading a field that is empty by construction, is weak
evidence about either.

## Two incidental findings, neither part of the table

Both are visible in the artifact and neither was fixed, because fixing production heuristics is out
of scope for this task.

**`extractMoneyAmounts` does not understand `$250bn`.** The regex in `evidence/graph.ts` matches a
scale *word* (`billion`, `million`, `trillion`), so `claim-a-005`'s `"$250bn backstop"` is extracted
as the value `250`, not `250000000000`. The artifact records it:
`{"claimId": "claim-a-005", "amount": {"value": 250, "text": "$250"}}`.

This changed nothing in this run, because `claim-a-005` sits alone in its own origin and
`detectSelfRevision` compares figures only *within* one origin. It is worth recording that under the
model's grouping the situation would differ — a `wsj` origin containing a-002, a-003, a-004 and
a-005 would hold the distinct values `250000000000` and `250`. I did not run that variant and make
no claim about what the engine would then do; the observation is that the disagreement above is not
inert, not that it flips anything.

**The simulated-claim origin key is degenerate.** `ownOriginKey` falls back to
`` `unrecognised:${claim.sourceId.split("/")[0]}` ``, and `claim-a-001`'s `sourceId` is
`simulated://tinjau/T0.2/social/…`, whose first `/`-segment is `simulated:`. So its key is
`unrecognised:simulated:` — a key every `simulated://` claim would share regardless of which
simulated source it came from. Scenario A has exactly one such claim, so nothing collided here, and
`countDerivedIndependentOrigins` skips `RUMOR` claims anyway. In a set with two simulated claims from
different fixtures it would merge them.

## Limitations

Carried verbatim in the artifact's `limitations` array:

- One scenario, one run, one live non-deterministic model call. **This measures nothing about
  accuracy.** Re-running can produce a different grouping and therefore a different agreement count.
- The deterministic promotion engine remains the decider. The model's output is graph structure only
  and is not wired into `decision/`, `risk/`, or any scenario file. Scenario A's published state is
  unchanged; the unchanged engine's `WATCH` is recorded in the artifact so it can be checked.
- Disagreements are reported, not adjudicated. Neither side is treated as ground truth anywhere.
- The contradiction axis is not like-for-like (see above).
- The model saw ten claim fields and was not shown `independenceGroup`, `relation`, or
  `duplicateOf`.
- `claim-a-001`'s claim text is a file pointer, not prose. Both sides are blind to that claim's
  wording — a property of the fixture, not of either method.
- Scenario A's evidence window contains zero swaps on chain 196, so there is no market leg here at
  all. This study is entirely on the evidence path.
- Only three structural questions were asked. Recency, provenance violations, materiality, assertion
  level, and self-revision amounts are derived by the heuristics alone and have no counterpart in
  the model's output.
- One referenced document carries no `sourceContentSha256`, so nothing about its bytes was verified.
  Its hash is recorded as `UNPINNED`, which is a statement about the fixture and not a pass. The
  scenario file is pinned, but by a constant this study declared at authoring time.

## Reproducing

```bash
cd apps/server
npx tsx src/studies/scenarioAGraphLive.ts --dry-run   # heuristics + integrity gates, no tokens
npx tsx src/studies/scenarioAGraphLive.ts             # one live model call, writes the artifact
```

The model call is non-deterministic. A rerun will produce a new `runAtUtc` and may produce a
different grouping; that is the first limitation, not a defect.
