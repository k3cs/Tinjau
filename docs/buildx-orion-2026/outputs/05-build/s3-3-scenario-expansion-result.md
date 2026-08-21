# S3.3 — Scenario expansion: result

> **The expansion set is empty. 0 of 0 additional events reached `PROTECT`, because there were
> no additional events to run.** Applying the frozen selection rule
> (`s3-3-scenario-expansion-selection-rule.md`, committed `b408ca0` before any market data was
> read) to live EDGAR selects exactly **one** 8-K in the measurable window, and it is scenario
> B's own filing — already frozen since T0.2. On this asset, in the only window where the market
> leg is physically measurable, **there was essentially nothing to select**: NVIDIA filed four
> documents with the SEC in those thirty days, and T0.2 already built scenarios from two of them.
> The four frozen scenarios are close to a **census**, not a curated sample.

- Date: 2026-08-22. Task: S3.3 Phase 2. Pre-registration: `b408ca0`.
- Run artifacts: `data/s3-3-market-availability.json` (pass 1),
  `data/s3_3_scenario_expansion_result.json` (full result).
- Script: `apps/server/src/studies/scenarioExpansionS33.ts` (`npm run study:s3_3`).
- **No threshold was changed. The four frozen scenarios were not modified.**

## 0. What this does and does not establish

The independent evaluation read *"no canonical replay reaches `PROTECT`"* as possibly a property
of **curated event choice**. On this universe that branch is now closed: there was no larger pool
of events to curate from, so the `WATCH`-only outcome cannot be explained by which events T0.2
picked.

**That is not vindication, and must not be presented as any.** Closing one explanation is not
evidence for another. This run does **not** show the frozen thresholds are correct, and it does
**not** show they are wrong. It has no independent ground truth about which events *should* have
dislocated the price, so it cannot separate:

- the events were genuinely quiet (thresholds fine, population uneventful), from
- the anti-wick gate is too strict for a pool this thin (thresholds mis-calibrated for the venue).

Distinguishing those needs a labelled set of true dislocations, which does not exist for this
asset. It is out of scope here and stays an open question.

## 1. Selection — the rule applied verbatim

| | |
|---|---|
| Universe | NVDA / `wNVDAx`, the only `supported` entry in `SUPPORTED_ASSETS` |
| Window | 2026-07-22T11:18:40Z .. 2026-08-20T18:00:00Z (both bounds inherited, §3.3) |
| 8-K rows in window | **1** |
| Cap `k = 12` | not bound |
| Selection pin | `a100bacb…386d` — **matches** the pre-registered value |
| Expansion rows | **0** |
| Control rows | 1 (`0001045810-26-000069`, labelled `CONTROL_REPRODUCTION` by §4.1 step 5) |

The pin matching matters on its own: EDGAR had not revised or added a filing inside the window
between Phase 1 and Phase 2, so §7.2's abort path was not taken and the frozen table still
describes live EDGAR.

**Every document NVIDIA filed with the SEC inside the measurable window, all form types:**

| Acceptance (UTC) | Form | Accession | Already frozen as |
|---|---|---|---|
| 2026-08-07T20:47:24Z | 4 | `0001197647-26-000007` | — |
| 2026-08-12T21:13:10Z | 4 | `0001310264-26-000008` | **scenario D** |
| 2026-08-14T20:19:53Z | 13F-HR | `0001045810-26-000065` | — |
| 2026-08-17T12:41:33Z | 8-K | `0001045810-26-000069` | **scenario B** |

Four documents in thirty days, two of them already frozen. The two that are not are a second
routine insider Form 4 and a quarterly holdings report — neither is an 8-K, and neither could
produce a different class of outcome.

Phase 1 §5.2 also recorded, from filing metadata alone, that **scenario B carries the only
MATERIAL 8-K NVIDIA filed in twelve months**: of the twelve trailing-year 8-Ks, eleven carry only
`2.02`/`5.02`/`5.07`/`8.01`/`9.01`, all `NON_MATERIAL` under the §4.3 map that was frozen before
the universe was enumerated. T0.2 did not get lucky and did not cherry-pick. There was one
candidate for the protection path and it is the one already frozen.

## 2. The reproduction check — what was actually run

With the expansion set empty, the run is a **reproduction check of the harness**, and it is
called that everywhere. It is not an expansion. The question it answers:

> Rebuild scenario B from the frozen rule — fetch the 8-K from EDGAR, re-derive every scenario
> field mechanically, re-capture the swap window from chain 196 — and does the unmodified engine
> still return the published `WATCH`?

Three runs, because the reconstruction carries **one** `OFFICIAL` claim (§4.4 forbids
hand-assembling a news graph) while frozen scenario B carries six claims including `NEWS`. The
evidence graphs differ *by construction*, so one comparison could not separate "the harness
disagrees" from "the claim sets differ on purpose".

| Run | Scenario | Fixture | Isolates |
|---|---|---|---|
| **R2** | frozen B | frozen | the canonical baseline, re-derived in process |
| **R3** | frozen B | **fresh capture** | the market leg exactly — identical claims |
| **R1** | reconstruction | fresh capture | the full §4.4 path end to end |

### 2.1 Everything reproduced

| Check | Result |
|---|---|
| Selection pin vs pre-registration | **match** |
| 8-K bytes: independent EDGAR fetch vs T0.2's pinned sha256 | **identical** — `1c480e33…8133`, 31,418 bytes |
| Pass 1 counts vs `manifest.json` | **identical** — 4,145 swaps, 1,193 before / 2,952 at-or-after anchor, 0 RPC range errors |
| Pass 2 decode vs frozen fixture swap count | **identical** — 4,145 |
| **R3 vs R2 field-for-field diff** | **empty** |
| Full `ConfirmationResult`, frozen fixture vs fresh capture | **identical**, every signal and every anti-wick field |
| R1 final state | `WATCH`, `aggressiveFeeAuthorized: false`, market leg `NOT_CONFIRMED` |
| §5.1 pre-registered expectation | **met** |

An independently re-fetched document, an independently re-captured 25,201-block window, and an
independently re-derived scenario file all land on the published answer. The frozen artifact is
not stale, and the capture path is reproducible.

### 2.2 The one expected difference, R1 vs R2

Only evidence-graph fields differ, exactly as §4.4 predicted:

| Field | R2 (frozen B) | R1 (reconstruction) |
|---|---|---|
| claims | 6 | 1 |
| `independentSourceCount` | 2 | 1 |
| reason codes gained | — | `SINGLE_SOURCE` |
| reason codes lost | `DUPLICATE_SYNDICATION`, `STALE_EVIDENCE` | — |

**The market leg is byte-identical between them** — same `ANTI_WICK_FAILED`, same
`MARKET_NOT_CONFIRMED`, same retention figures. The difference is entirely attributable to the
deliberately thinner claim graph, and R3's empty diff is what licenses that attribution rather
than leaving it as an assumption.

## 3. The market leg, in full

Both captures agree on every value below. Rule `tinjau.confirm/2.0.0`, thresholds unmodified.

| Signal | Measured | Threshold | Fired |
|---|---|---|---|
| drawdown | **234.86 bps** | ≥ 200 bps | no — gated by anti-wick |
| velocity | **0.41×** | ≥ 2.0× | no |
| basis | not evaluated | ≥ 300 bps | no — OKX leg `UNAVAILABLE` (SVC-003) |

| Anti-wick | Value |
|---|---|
| median retention across the hold interval | **9.66%** |
| lowest retention in the interval | 4.38% |
| required | 50% |
| observations in hold | 68 (minimum 2) |
| peak / trough / after-hold price | 227.31 / 221.97 / 226.58 |
| trough at | **2026-08-17T11:58:36Z** |
| checked at | 2026-08-17T12:03:33Z |

The pool fell 234.86 bps and gave back over 90% of it within five minutes. Under rule 2.0.0
anti-wick is a necessary condition that no other signal may substitute for, so the verdict is
`NOT_CONFIRMED` and the state is `WATCH`. This is the designed outcome for material official
evidence the market did not independently corroborate — not a failure mode.

### 3.1 Two observations that sharpen the published record

**The drawdown is pre-anchor.** The trough is at 11:58:36Z; the 8-K was accepted at 12:41:33Z.
The 234.86 bps move peaked and bottomed **43 minutes before the filing existed**. Even had it
persisted, it could not have been caused by the event. This corroborates and sharpens
`known-limitations.md` §2's note that measuring drawdown post-anchor only yields 101 bps: the
large move lives in the pre-anchor hour. The refusal is more robust than §2 stated, not less.

**Trade intensity *fell* after the filing.** Velocity is 0.41× — 1,193 swaps in the pre-anchor
hour (0.33/s) against 2,952 in the six post-anchor hours (0.14/s). There was no volume burst on
this event at all. `known-limitations.md` §2 attributes prior false confirmations to a volume
burst firing the ungated velocity signal; on this window velocity would not have fired even
without the F1 fix.

**Refinement to a published figure:** §2 records anti-wick retention as "~10–13%". The exact
value under rule 2.0.0 is **9.66% median / 4.38% minimum over 68 observations**. Slightly lower
than published, i.e. the refusal is marginally stronger.

## 4. A secondary finding the reproduction surfaced

**`explainWatch` names the wrong binding gate for OFFICIAL-only evidence.** R1's human
explanation opens:

> "Only one independent origin reported this. Additional outlets carrying the same story are
> syndications of that origin, not corroboration."

For `OFFICIAL` evidence that is misleading. `mayReachProtect` requires two independent origins
only on the `NEWS` path; on the `OFFICIAL` path it reduces to
`officialEvidencePassed && confirmation === "CONFIRMED"`. A single official origin with a
confirming market **would** promote. The branch ordering in
`apps/server/src/risk/promote.ts` `explainWatch()` tests `independentSources < 2` before
`status !== "CONFIRMED"`, without regard to source class, so the record explains itself with a
reason that is not the operative one for this claim set. `SINGLE_SOURCE` is correctly emitted as
a diagnostic; only the prose ordering is wrong.

This is an **explanation-quality issue (§0.12), not a threshold or a state error** — R1's state,
authorisation and reason codes are all correct. **It was not fixed here**: it is outside S3.3's
scope, it would change the explanation text for scenarios A and C as well, and changing engine
behaviour while a pre-registered run is in flight is precisely what the freeze-first discipline
forbids. It is logged for whoever owns `promote.ts`.

## 5. A drafting defect in the Phase 1 rule, disclosed not repaired

The committed pre-registration is internally inconsistent on one point, and the Phase 1 document
was **not** edited to fix it (that would rewrite a pre-registration after seeing its result):

- **§5.1** expects the control row to reproduce *"state `WATCH`, `aggressiveFeeAuthorized: false`,
  market leg `NOT_CONFIRMED`"*.
- **§7.3** makes the run VOID unless it reproduces *"with the same reason codes"*.

But §4.4's one-claim graph makes exact reason-code equality **structurally unreachable** for R1.
Read strictly, §7.3 would void a run that behaved exactly as §4.4 designed it to.

This was foreseeable at drafting time and was missed. It is disclosed rather than resolved by
reinterpretation, and the design absorbs it honestly: **run R3 exists precisely so the strict
reason-code test is still performed**, on the comparison where it is meaningful — identical
claims, only the capture differing. R3's diff is empty, so the strict test passes where it can be
asked. Under both readings the run is a pass; the ambiguity never had to be resolved in this
run's favour, and if it ever does, that is a decision for whoever owns the tracker, not for the
executing agent.

## 6. Limitations

1. **The expansion set is empty.** This run adds zero new events and zero new evidence about
   threshold calibration. It is a reproduction check.
2. **It cannot show the thresholds are correct or incorrect** (§0). No independent ground truth
   about which events should have dislocated the price exists for this asset.
3. **One asset, one pool, ~30 days, one chain.** `SUPPORTED_ASSETS` contains only NVDA/`wNVDAx`
   as supported and **no MSTR-linked asset at all**. Nothing here generalises to tokenized
   equities as a class or to any other ticker.
4. **The OFFICIAL path only.** One `OFFICIAL` claim, no `NEWS` claims — so nothing is shown about
   the two-independent-origin path, syndication collapsing, or the self-revision rule.
5. **`officialEvidencePassed` is assumed `true`, not computed** (tracker §8). The bonded
   parse-agreement path is not exercised.
6. **The OKX leg is `UNAVAILABLE`** for this anchor as for all four frozen scenarios (SVC-003).
   No result here may be described as dual-leg confirmed.
7. **This does not open `canClaimLossAvoided`.** Its conditions are in `t0-4` §8.6, untouched
   here; `known-limitations.md` §18 stands unchanged.
8. **Amendments were considered and not taken** (§5.4 of the rule): extending `W_end` forward,
   admitting other form types, widening `W_start` backwards. Changing the frame in response to
   its own yield is the forbidden move, and the yield being inconvenient is why it stays.

## 7. Threshold statement

**No threshold was changed by this task and none may be changed as a result of it** (§9 of the
pre-registration). `tinjau.policy/1.0.0` and `tinjau.confirm/2.0.0` are untouched: the 200 bps
drawdown floor, the 300 s anti-wick hold, the 0.5 retention fraction, the 30-swap verdict
minimum, the 2.0× velocity ratio and the 300 bps basis floor all stand exactly as frozen. The
four T0.2 scenarios were not modified, re-scored, or re-anchored; the reconstruction lives in
`apps/server/scenarios/expansion/` and does not touch them.
