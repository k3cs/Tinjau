# T2.4 — Evidence Graph evaluation report

- Date: 2026-08-21
- Task: T2.4 (depends on T2.3, complete)
- Owner: external non-frontend AI agent
- Result: **14/14 cases pass; `unsupportedProtectRate` = 0**
- Frontend files changed: none

## 1. What was measured

The labelled set in `apps/server/eval/evidence-eval-set.json` runs the **real** pipeline end to
end, with no mocks at any stage:

```text
normalizeClaim (T2.1) → buildEvidenceGraph (T2.3) → resolveAsset (T2.2) → promote (T1.2)
```

[Inferensi] Each phase already had its own tests, so each could be correct while the **seam**
between them was wrong. The seam that matters is T2.3 → T1.2: the graph derives how many
origins genuinely corroborate an event, and the promotion rules consume that count. Until this
task, "the derivation feeds the rules" was an intention rather than a demonstrated fact.

Runner: `apps/server/src/evidence/evaluate.ts`. Test: `apps/server/test/evidenceEval.test.ts`.

## 2. Results

[Fakta] Measured 2026-08-21 by running the eval set through `evaluate()`:

| Dimension | Passed | Accuracy |
|---|---|---|
| EXTRACTION | 5/5 | 100% |
| INDEPENDENCE | 3/3 | 100% |
| ENTITY_RESOLUTION | 2/2 | 100% |
| MATERIALITY | 2/2 | 100% |
| CONTRADICTION | 1/1 | 100% |
| RUMOR_CONTAINMENT | 1/1 | 100% |
| **Overall** | **14/14** | **100%** |

| Critical metric | Value | Target |
|---|---|---|
| `unsupportedProtectRate` | **0** | 0 |
| `rumorToWatchRate` | 1.0 | 1.0 |

`unsupportedProtectRate` counts cases whose gold state is `NORMAL` or `WATCH` that nonetheless
returned `PROTECT`, over all such cases (11 of the 14). [Inferensi] Unlike the other figures
this is not a quality target — a single failure would mean a broken safety invariant rather
than a missed accuracy goal.

### 2.1 Per-case outcomes

[Fakta] Observed state, derived origin count, and resolution for each case:

| Case | Gold | Observed | Usable origins | Resolution |
|---|---|---|---|---|
| `official-material-event` | PROTECT | PROTECT | 1 | RESOLVED |
| `official-without-market-confirmation` | WATCH | WATCH | 1 | RESOLVED |
| `rumor-only-with-perfect-market` | WATCH | WATCH | 0 | RESOLVED |
| `single-origin-four-outlets` | WATCH | WATCH | 1 | RESOLVED |
| `two-independent-origins` | PROTECT | PROTECT | 2 | RESOLVED |
| `self-revising-source-line` | WATCH | WATCH | 1 (of 2) | RESOLVED |
| `unnamed-relay-headline` | WATCH | WATCH | 1 | RESOLVED |
| `neutral-routine-form4` | NORMAL | NORMAL | 1 | RESOLVED |
| `unclassified-materiality` | NORMAL | NORMAL | 1 | RESOLVED |
| `unsupported-token-nvdax` | WATCH | WATCH | 1 | UNSUPPORTED_ASSET |
| `unknown-company` | WATCH | WATCH | 1 | UNKNOWN_COMPANY |
| `missing-provenance` | WATCH | WATCH | 1 | RESOLVED |
| `simulated-claim-with-real-looking-url` | WATCH | WATCH | 0 | RESOLVED |
| `stale-evidence-only` | NORMAL | NORMAL | 0 | RESOLVED |

[Fakta] `single-origin-four-outlets` carries **no** `independenceGroup` on any claim. All four
claims were nonetheless assigned the derived origin `wsj` from their attribution text, which is
what makes "four outlets, one story" a demonstrated capability rather than a hand-typed number.

## 3. A 100% score is not the interesting part

[Inferensi] Every case passing on the first run is a result worth being sceptical about — it
can equally mean the harness is not capable of failing. Three things were done to check that:

1. **The gold labels predate the runner.** They were written in T2.4's planning step from
   tracker §0.7/§0.8, before `evaluate.ts` existed. They describe intended behaviour, not
   observed behaviour.
2. **A negative control** proves the seam is load-bearing (§4.1 below): strip one translation
   step and the same evidence flips from `WATCH` to `PROTECT`.
3. **Structural assertions** guard the set itself. One test fails if the set ever loses its
   `PROTECT` case — without one, `unsupportedProtectRate` would pass trivially by never
   promoting anything.

## 4. Findings

### 4.1 The seam closes a real safety hole [Fakta]

`promote()` cannot see two flags the Evidence Graph produces: `relaysUnnamedReport` (T2.3) and
`promotable` (T2.1). Its `EvidenceClaim` type has neither field. So the runner must translate
them, and that translation is not cosmetic.

Negative control, run against a two-origin set where one origin is a `"- report"` relay:

```text
graph.usableOriginCount = 1
WITH wiring    -> WATCH
WITHOUT wiring -> PROTECT
```

[Inferensi] Without the translation, evidence that **disclaimed its own independence** would
have counted as a full independent origin and authorised a fee change. The same applies to a
claim with incomplete provenance. This is now pinned by the test
*"the disqualification wiring is load-bearing, not decorative"*.

### 4.2 Interface gap in `promote.ts` — reported, not fixed [Fakta]

`EvidenceClaim` offers exactly one lever for "this claim must not add to the independent-origin
count": the group-wide `selfRevised` flag. Three distinct facts need that lever:

1. the source line revised its own figure — genuinely `selfRevised`;
2. the claim disclaims being an origin (`"- report"` headlines);
3. the claim's provenance is incomplete (no publisher, no URL).

The runner therefore sets `selfRevised` for all three and records the true reason separately in
a `disqualifications` field, so nothing is lost. [Inferensi] The clean fix is a
`contributesIndependentOrigin?: boolean` field on `EvidenceClaim`. That belongs in
`promote.ts`, which is outside T2.4's scope and may be under concurrent edit, so it was **not
changed**. Recorded here for a later task.

### 4.3 Reason-code fidelity gap [Fakta]

`unknown-company` resolves to `UNKNOWN_COMPANY` but the emitted reason code is
`UNSUPPORTED_ASSET`. `promote()` receives only two booleans (`assetSupported`,
`entityResolved`), so it cannot distinguish "this company is not registered" from "this token
has no pool".

[Inferensi] The **state** is correct in both cases (`WATCH`, no action authorised), so this is
not a safety issue. But a judge or a consumer reading the record is told "unsupported asset"
when the truth is "we do not know this company", and §0.12 requires the record to explain
itself without a dashboard. Worth a distinct reason code before T6.1 renders these.

### 4.4 Coverage gap: CLUSTERING has no cases [Fakta]

The eval set's `_dimensions` header declares seven dimensions; six have cases. CLUSTERING has
none, because each eval case is a single cluster and so cannot exercise the rejection paths
(hallucinated claim ids, overlapping clusters, clusters spanning two companies).

[Inferensi] Those paths are covered directly in `evidenceResolution.test.ts`, so the capability
is tested — just not from this set. The gap is asserted explicitly in the test suite rather than
left silent, so it cannot be mistaken for a dimension that quietly lost its coverage.

## 5. What this evaluation does not establish

- **It is 14 hand-written cases on one asset.** It demonstrates that the invariants hold on the
  shapes chosen; it is not a measurement of real-world accuracy, and no rate here should be
  quoted as a general capability.
- **No live model is involved.** Every case is deterministic and reproducible by construction
  (asserted by a test). That is what §0.9 requires of the graph, but it means the evaluation
  measures the deterministic layer, not an LLM's extraction quality.
- **Market confirmation is still a parameter.** Each case supplies a `ConfirmationStatus`
  directly. The engine that produces one is T3.1–T3.3 and does not exist yet, so no case here
  has been confirmed against real market data.
- **`officialEvidencePassed` is still an input**, not a computation. Wiring it to the bonded
  parse-agreement path remains open from T1's carried-forward list.

## 6. Verification

[Fakta] Commands and results, 2026-08-21:

| Check | Command | Result |
|---|---|---|
| Eval suite | `cd apps/server && npx tsx --test test/evidenceEval.test.ts` | 27/27 pass |
| Server regression | `cd apps/server && pnpm test` | 283/283 pass (256 before this task) |
| Server typecheck | `cd apps/server && pnpm typecheck` | pass |

## 7. Carried forward

1. **`contributesIndependentOrigin` on `EvidenceClaim`** (§4.2) — removes the `selfRevised`
   overload. Owner: whoever next touches `promote.ts`.
2. **A distinct reason code for an unknown company** (§4.3), before T6.1 renders risk records.
3. **CLUSTERING cases** (§4.4) if the eval set is ever extended — hallucinated ids and
   cross-company clusters are the paths worth adding.
4. **Re-run this set after T3.3 lands**, replacing the supplied `ConfirmationStatus` with a
   real market-confirmation result. Until then no case is an end-to-end proof.
