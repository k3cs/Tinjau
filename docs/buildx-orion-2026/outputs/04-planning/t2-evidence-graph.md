# Phase T2 — Minimum AI Evidence Graph

- Date: 2026-08-20
- Tasks: T2.1 – T2.4
- Owner: external non-frontend AI agent
- Result: **complete**
- Frontend files changed: none

## 1. What now exists

| Artifact | Lines | Role |
|---|---|---|
| `apps/server/src/evidence/speculation.ts` | 160 | assertion level from the source's own language |
| `apps/server/src/evidence/normalize.ts` | 227 | provenance validation, derived promotability |
| `apps/server/src/evidence/assets.ts` | 241 | company → token → pool, with explicit refusals |
| `apps/server/src/evidence/cluster.ts` | 160 | model proposes, deterministic rules validate |
| `apps/server/src/evidence/graph.ts` | 487 | derived independence, self-revision, recency, confidence |
| `apps/server/src/evidence/evaluate.ts` | 411 | end-to-end evaluation runner |
| `apps/server/eval/evidence-eval-set.json` | 572 | 14 labelled cases, gold labels from §0.7/§0.8 |

[Fakta] Verified 2026-08-20:

| Suite | Tests |
|---|---|
| `evidenceNormalize.test.ts` | 14/14 |
| `evidenceResolution.test.ts` | 16/16 |
| `evidenceGraph.test.ts` | 17/17 |
| `evidenceEval.test.ts` | 27/27 |
| **Total** | **74/74** |

## 2. T2.1 — Normalisation and the speculation boundary

Every claim entering the graph passes through `normalizeClaim`, whatever its origin. The
output records what the source said, who said it, when, where to check it, and how strongly it
was asserted, and refuses to invent any of those.

### 2.1 Speculation is labelled, never rewritten

[Fakta] `analyseSpeculation` matches 26 speculative markers ("in talks", "is considering",
"may", "nothing signed") and 14 unverified-attribution markers ("people familiar",
"could not immediately verify", "declined to comment"). It returns one of three levels
(`ASSERTED`, `SPECULATIVE`, `REPORTED_UNVERIFIED`), the exact markers it matched, and whether
the publisher disclaimed verification.

[Inferensi] The hardest version of the §0.8 failure is not a bad paraphrase. It is a pipeline
that reads "Nvidia is in **talks** to guarantee $250bn" and records an event called
"$250bn guarantee". The claim text survives untouched and the structured record still asserts
something the source never did. So the module never edits text; it labels, and it returns its
own evidence so a reviewer can check the call rather than trust it.

Two properties make the labelling hard to subvert:

- `describesCompletedEvent` is **derived** from the assertion level, never supplied. A test
  passes both `describesCompletedEvent: true` and `assertionLevel: "ASSERTED"` alongside
  hedged text; both are discarded.
- Hedged language **beats** a caller's structural hint. A caller that believes a claim is an
  assertion cannot assert away the hedging.

### 2.2 Missing provenance produces a non-promotable claim, not a discarded one

[Fakta] 11 named `ProvenanceViolation` variants. `promotable` is derived from that list being
empty, so no upstream component can declare its own claim usable.

[Inferensi] Discarding an unattributed claim would hide that someone fed one to the pipeline;
promoting it would let an unattributed assertion move a fee. Keeping it and marking it does
neither, and the rejected claim is exactly what makes a later `WATCH` explainable.

The most dangerous shape gets its own violation: a `SIMULATED` claim carrying a resolvable
`https://` URL is `RESOLVABLE_URL_ON_SIMULATED_CLAIM`. [Inferensi] Fabricated content wearing a
checkable-looking address is worse than fabricated content that admits it, because the address
invites a reader to stop checking.

Official ingestion keeps the requirements the existing bonded path already imposes: a content
hash, and a URL under `https://www.sec.gov/`. Lookalike hosts and the userinfo trick
(`https://www.sec.gov@evil.com/…`) are refused by the same guard the X bot already uses.

### 2.3 A conflation this phase introduced, and scenario B caught

[Fakta] An early rule flagged `officialConfirmation === true` on a hedged non-official claim as
`SPECULATION_RECORDED_AS_COMPLETED_EVENT`. Scenario B failed against it.

[Inferensi] The rule was wrong, and the failure was the fixture doing its job.
`officialConfirmation` means *"a filing later confirmed this claim"*; `describesCompletedEvent`
means *"this source asserted the event had happened"*. Those are different facts about
different moments. A hedged report that a subsequent filing confirms is the normal, honest
shape of breaking financial news, and scenario B is precisely that (the 2026-08-14 WSJ line
predicted "less than $120 billion" and the 8-K stated $105 billion). The rule would have
rejected legitimate evidence.

The check was removed rather than patched. [Inferensi] The §0.8 protection did not weaken; it
moved somewhere stronger. `describesCompletedEvent` being derived means no component can turn a
hedge into a fact, which is a structural guarantee rather than a validation rule that has to
fire. The related graph-level question (is a claim marked confirmed actually backed by an
`OFFICIAL` claim in the same set?) cannot be answered from one claim in isolation and belongs
to T2.3's territory.

### 2.4 A gap in the T0.2 freeze that only surfaced here

[Fakta] Scenario D's `OFFICIAL` claim was frozen without a `sourceContentSha256`, and pointed
at EDGAR's XSL rendering wrapper rather than the raw document. Once T2.1 made byte commitments
mandatory for every `OFFICIAL` claim, it failed.

[Inferensi] This was a defect in the freeze, not in the new rule. Every other official claim
could be verified byte-for-byte by a third party and the neutral control could not, which
quietly made it the weakest evidence in the set precisely where a false positive would be most
embarrassing.

[Fakta] Closed by pinning the raw Form 4
(`d7ac69f01fba9daa4b686223afad6dbec0b89baa48e2c74ff1b9cc4694539526`, 6,527 bytes) plus its
EDGAR directory listing, which independently corroborates the acceptance stamp and size. The
scenario schema moved to `tinjau.scenario/0.2.1` with a `_schemaChangeLog`, and the manifest now
pins 6 immutable sources, asserted by test.

## 3. T2.2 — Entity resolution and clustering

### 3.1 The NVDAx / wNVDAx defect, closed

[Fakta] `SUPPORTED_ASSETS` holds 2 entries for NVIDIA: `wNVDAx`
(`0xa8ddb5…50d5`, in the USDG reference pool, sampled by the index poller,
`supported: true`) and `NVDAx` (`0xc845b2…0849d`, unwrapped, `poolAddress: null`,
`supported: false`).

[Inferensi] The T0.2 §2.2 defect was never a wrong address. It was treating *"the ticker we
track"* and *"the token our pool trades"* as the same thing. They are different ERC-20s, and an
action keyed to the wrong one would have applied to a pool nobody was protecting.

The unsupported sibling is **listed rather than omitted**, and that choice is load-bearing.
[Inferensi] Omitting it would make a claim about `NVDAx` resolve to `UNKNOWN_COMPANY`, which
reads like a coverage gap someone should go fill. Listing it produces `UNSUPPORTED_ASSET` with
an explanation that names the supported sibling, so a near miss is obvious instead of
mysterious. A test asserts the entry stays registered and stays unsupported.

Resolution refuses rather than guesses in three further ways:

- an address hint beats a symbol hint (an address is unambiguous, a symbol is not), tested
  with a symbol naming the unsupported token and an address naming the supported one;
- an unrecognised symbol refuses instead of widening back to every token for the company;
- `mayAuthorizeAction` is derived and true for exactly one outcome (`RESOLVED`). Ambiguity is a
  refusal, not a tie-break.

### 3.2 A model proposes, deterministic rules validate

[Inferensi] Grouping paraphrases is genuinely a language problem (headline wording, entity
aliases, partial overlap all defeat string matching), so this is where §0.6 says AI belongs.
What matters is where it stops.

[Fakta] `buildClusters` rejects five proposal shapes: `UNKNOWN_CLAIM_ID`,
`DUPLICATE_CLAIM_ASSIGNMENT`, `SPANS_MULTIPLE_COMPANIES`, `EMPTY_CLUSTER`,
`DUPLICATE_EVENT_KEY`. Rejections are returned, not swallowed, and unclustered claims surface
rather than vanishing.

[Inferensi] `DUPLICATE_CLAIM_ASSIGNMENT` is the one that matters most. Letting one claim belong
to two clusters would double-count a source when independence is measured, and the
independence count is the one arithmetic in this system that must not be inflatable.

A deterministic fallback (`proposeClustersDeterministically`) exists for the no-provider path.
It groups by `(company, eventType)` and therefore **splits** where a model would merge.
[Inferensi] Splitting under-counts corroboration, which can only hold a state lower — the safe
direction for a fallback that does not understand language.

## 4. T2.3 — Independence, self-revision and recency, derived

This is the phase's substance. Until T2.3, `independenceGroup` and `relation` arrived
hand-labelled on the frozen fixtures. That was fine for freezing evidence, but it meant the
system had never demonstrated it could tell a syndication from an independent report — the
answer was written in by hand.

[Fakta] `deriveIndependence` reads 6 attribution patterns against 11 publisher aliases and
collapses each claim into the origin it names. Scenario A's four outlets derive to one origin,
with zero disagreements against the hand labels.

[Fakta] `detectSelfRevision` extracts scaled money amounts and flags a source line stating more
than one figure for the same event. Scenario C derives `usableOriginCount = 1` from 2 apparent
origins, which is the first time T1.2's self-revision rule received a **derived** input rather
than a hand-set flag.

### 4.1 Two derivation bugs the frozen fixtures caught

[Fakta] Scenario A produced `usableOriginCount = 2` when it should have been 1. Two distinct
failures:

1. A byline reading `"CNBC, reporting a Wall Street Journal story"` resolved **CNBC's own
   identity** to `wsj`, because identity matching scanned the whole publisher field for any
   known alias.
2. A headline ending `"- report"` (DataCenterDynamics) counted as a full independent origin.

[Inferensi] Both are genuine weaknesses rather than fixture problems. The first would
mis-identify any outlet whose byline names another. The second would let a claim that
*explicitly disclaims being the origin* count as one.

Both fixes are deliberately conservative:

- Publisher identity now reads only the **leading segment** of the byline (before a comma or
  dash). Anything after it is attribution, and attribution is handled separately. [Inferensi]
  The publisher is whoever published; anyone else named in that field is being cited.
- [Fakta] 4 `UNNAMED_RELAY_PATTERNS` detect a claim that admits it is relaying a report without
  saying whose. Such a claim is **excluded from the origin count entirely** — it cannot be
  merged into an origin (none is named) and must not be counted as one (independence is exactly
  what it disclaimed). [Inferensi] Excluding rather than guessing under-counts corroboration,
  which can only hold a state lower.

### 4.2 What is deliberately NOT detected

[Inferensi] Bare-amount comparison **across different outlets** is absent by design.
"$250bn of guarantees" and "$3bn equity stake" are different quantities about the same deal, and
a detector that flagged them as contradictory would manufacture contradictions out of ordinary
reporting — then cap promotion on the strength of its own noise. Contradiction is asserted only
where the **same source line** changed its **own** figure, or where a claim explicitly declares
`relation: "CONTRADICTS"`. A test pins the negative case.

### 4.3 Every confidence change is explained

[Fakta] 8 `ConfidenceFactor` codes, each carrying a direction (`RAISES` / `LOWERS`), a
plain-language explanation, and the claim ids behind it. §0.9 requires a machine-readable
explanation for why confidence changed; a bare number would be unauditable.

Recency marks stale evidence without deleting it, and flags claims dated **after** the
assessment instant as `fromFuture` (a data defect, surfaced rather than silently accepted).

## 5. T2.4 — The labelled evaluation set

[Fakta] 14 cases. Result: **14/14 passed**, `unsupportedProtectRate` = **0**,
`rumorToWatchRate` = **1.0**.

| Dimension | Cases | Passed |
|---|---|---|
| EXTRACTION | 5 | 5 |
| INDEPENDENCE | 3 | 3 |
| ENTITY_RESOLUTION | 2 | 2 |
| MATERIALITY | 2 | 2 |
| CONTRADICTION | 1 | 1 |
| RUMOR_CONTAINMENT | 1 | 1 |
| CLUSTERING | 0 | — |

[Fakta] `unsupportedProtectRate`'s denominator is every case whose gold state is not `PROTECT`:
**12** cases (9 `WATCH` + 3 `NORMAL`).

Every `expected` value is a gold label written from §0.7/§0.8 — the intended behaviour, not a
snapshot of what the code returns. A failing case is a finding about the code, and the label is
never edited to match.

The runner executes the real pipeline end to end (`normalizeClaim` → `buildEvidenceGraph` →
`resolveAsset` → `promote`), so T2.3's derivations actually drive T1.2's rules rather than
being asserted separately.

### 5.1 A clean first run, treated as suspicious

[Inferensi] 14/14 on first execution is worth distrusting rather than celebrating: it is
equally consistent with a harness that cannot fail. Three things discharge that suspicion.

1. [Fakta] The gold labels predate the runner. They were written from the tracker's invariants
   before `evaluate.ts` existed.
2. [Fakta] A negative control flips a real outcome (§5.2), proving the harness distinguishes
   correct from incorrect behaviour.
3. [Fakta] A structural test fails if the set ever loses its `PROTECT` cases — otherwise the
   critical metric could pass trivially by never promoting anything.

[Fakta] `CLUSTERING` has 0 cases because each eval case is a single cluster, so rejection paths
cannot be exercised there. Those paths are covered in `evidenceResolution.test.ts`, and the gap
is asserted explicitly in the suite so it cannot be mistaken for lost coverage.

### 5.2 The safety hole the evaluation found

This is the most important thing T2.4 produced, and it is a hole rather than a confirmation.

[Fakta] `promote()`'s `EvidenceClaim` had exactly one lever meaning "this claim must not add to
the independent-origin count": the group-wide `selfRevised` flag. But three distinct facts
needed that lever:

1. the source line revised its own figure;
2. the claim disclaimed being an origin (`relaysUnnamedReport`);
3. the claim's provenance is incomplete (`promotable === false`).

[Fakta] Negative control on a two-origin set where one origin is a `"- report"` relay:

```
graph.usableOriginCount = 1
WITH the wiring    -> WATCH
WITHOUT the wiring -> PROTECT
```

[Inferensi] Without the translation, evidence that had **explicitly disclaimed its own
independence** counted as a full independent origin and authorised a fee change. The Evidence
Graph knew the right answer; `promote()` had no way to receive it. A seam between two correct
components was itself the vulnerability.

**Fix.** `EvidenceClaim` now carries `contributesIndependentOrigin?: boolean` alongside
`selfRevised`, and the two behave differently on purpose:

| Lever | Scope | Why |
|---|---|---|
| `selfRevised` | **group-wide** | a revision belongs to the source line, not one article |
| `contributesIndependentOrigin` | **per-claim** | one relayed headline does not taint that outlet's other reporting |

[Fakta] `promote.ts` implements exactly that: `if (c.selfRevised) entry.disqualified = true`
(group) against `if (c.contributesIndependentOrigin !== false) entry.usable = true` (claim).

[Inferensi] Conflating them would break in both directions. Making the relay flag group-wide
would discard an outlet's genuine reporting because it also ran a wire story. Making
self-revision per-claim would let a source line's un-revised articles corroborate a figure the
same line had already contradicted.

### 5.3 Reason-code fidelity

[Fakta] `promote()` received the asset resolution as two booleans, flattening four outcomes onto
two bits. An unknown company emitted reason `UNSUPPORTED_ASSET`.

[Inferensi] The **state** was correct (`WATCH`), so this was never a safety issue. But §0.12
requires the record to explain itself, and it misdescribed the refusal. Three different
findings send an operator to three different places: *"which of this company's tokens?"*,
*"this token has no verified pool"*, and *"never heard of this company"*. Sending someone to
look for a pool that was never the problem is a real cost, and T6.1 will render these to
judges.

[Fakta] Fixed by passing `resolutionOutcome` through verbatim and adding
`REASON_UNKNOWN_COMPANY` (bit 20) to `TinjauRiskTypes.sol`, `risk/types.ts`, the parity test,
and the published `risk-record.schema.json` — now 25 reason codes. A test asserts each outcome
emits its own code **and none of the other two**.

## 6. Honest limitations

1. **Speculation detection is a curated marker list, not a model.** [Fakta] 26 + 14 phrases
   over English financial-news phrasing. It will miss hedging the list does not cover.
   [Inferensi] It is deployed in the one direction where being wrong is cheap: detection may
   only ever **weaken** a claim's assertion level, never strengthen it. A missed hedge leaves a
   claim looking stronger than it is, which is still caught downstream by the two-source and
   market-confirmation requirements; a false positive merely holds a real event at `WATCH`
   slightly longer. Neither error can by itself cause an unsupported action.

2. **Independence derivation is heuristic.** [Fakta] 11 publisher aliases, 6 attribution
   patterns, 4 relay patterns. Two failure modes were found and fixed during T2.3; [Inferensi]
   more certainly exist, and an outlet outside the alias table is keyed by its source-id host
   rather than recognised.

3. **Derivation and hand labels can disagree, and disagreement is surfaced rather than
   auto-resolved.** [Inferensi] Either could be wrong. Silently preferring one would hide a
   real question from the only party able to answer it.

4. **`officialEvidencePassed` is still an input, not a computation.** The bonded
   parse-agreement path exists in the prototype and is not yet wired into the evidence pipeline.

5. **The evaluation set is small.** 14 cases on one asset. [Inferensi] It proves the invariants
   hold on the shapes it contains; it does not establish accuracy on a distribution.

## 7. Carried forward

1. **`officialEvidencePassed` must be computed**, not supplied — it connects the existing
   three-parse agreement path to the new pipeline.
2. **Market confirmation remains a parameter.** Every `PROTECT` decision T2 can produce is
   conditional on a `ConfirmationStatus` the caller supplies. T3.1–T3.3 build the engine that
   derives it; until then no scenario has been demonstrated end to end against real market data.
3. **The evaluation set should grow** with any new failure mode found in T3+, especially
   degraded-market cases, which it currently does not cover at all.
4. **Clustering rejection paths need eval coverage** if the set is ever used as the primary
   AI-quality measure rather than as a safety probe.
5. **Nothing is deployed**, and no address may be published until T7.2.
