# Learnings — Build X Series AI Season + Orion Builder

Store contextual evidence. Do not turn one failure into a universal rule.

## Active Guardrails Imported into This Hackathon

| ID | Guardrail | Relevant Stage | Confidence | Source Project |
|---|---|---|---|---|
| LEARN-001 | During ideation, do not filter ideas by time, team size, or development difficulty | Stage 2 | proven | Dien's stated working preference |
| LEARN-002 | On OKX rails, the review/approval queue is the schedule risk, not the build | Stage 4, 5, 7 | strong-signal | OKX AI Genesis Hackathon, July 2026 |
| LEARN-003 | Aggregator chain registries lag chain migrations; configure from first-party docs only | Stage 4, 5 | proven | This project, Stage 1 |
| LEARN-004 | A thin wrapper over one paid upstream wins a demo but scores badly on defensibility | Stage 2, 3 | hypothesis | REF-004 winner corpus |
| LEARN-006 | Never conclude coverage from a summarised fetch; pull the raw data and count | Stage 1, 2 | proven | This project, Stage 1 |

## Learning Index

| ID | Learning | Type | Confidence | Status | Related Stages |
|---|---|---|---|---|---|
| LEARN-001 | Ideate without feasibility constraints | success-pattern | proven | active | 2 |
| LEARN-002 | OKX review queue is the binding schedule risk | anti-pattern | strong-signal | active | 4, 5, 7 |
| LEARN-003 | Trust first-party chain docs over aggregators | mistake | proven | active | 4, 5 |
| LEARN-004 | Single-upstream wrappers have no moat and a fragile demo | anti-pattern | hypothesis | active | 2, 3 |
| LEARN-005 | Separate deterministic measurement from model judgement | success-pattern | strong-signal | active | 2, 3, 5 |
| LEARN-006 | Summarised fetches truncate silently; count the raw rows | mistake | proven | active | 1, 2 |
| LEARN-007 | Check novelty against the whole corpus before claiming a gap | anti-pattern | proven | active | 2 |
| LEARN-008 | Verification effort follows what is easy to check, which biases the conclusion | anti-pattern | proven | active | 1, 2 |
| LEARN-009 | Score a candidate against the official rubric before locking it, not after | anti-pattern | proven | active | 2 |
| LEARN-011 | A "negative" result from a retried sweep needs its coverage checked, not just its retry count | anti-pattern | proven | active | 5 |

## Learning Entry Template

### LEARN-001 — Ideate without feasibility constraints

- Type: success-pattern
- Source: previous-hackathon
- Context: Dien recorded this as a standing working preference during OKX AI Genesis ideation (2026-07-20), scoped to brainstorming and idea search.
- Observed outcome: applying time / team-size / difficulty filters during ideation collapsed the option space to safe, generic ideas.
- Cause: feasibility screening and divergent generation are different cognitive modes; running them together kills the divergent one.
- Early warning: any sentence in an ideation output resembling "too hard for a solo builder", "not enough time in 6 days", or "would need a bigger team".
- Prevention or repeat strategy: generate on originality and value alone. Reintroduce feasibility only at Checkpoint 1, or earlier if Dien explicitly asks.
- Recovery if it recurs: regenerate the shortlist with the filter removed and keep the filtered ideas as a separate list.
- Related fields or stages: Stage 2 ideation
- Reference and decision IDs: REF-009
- Service IDs: none
- Confidence: proven
- Status: active
- Recorded on: 2026-08-16

### LEARN-002 — On OKX rails, the review queue is the schedule risk

- Type: anti-pattern
- Source: previous-hackathon
- Context: OKX AI Genesis Hackathon, July 2026. Dien's recorded assessment was that the largest risk to submitting was failing OKX's ≤24h review before the deadline — explicitly *not* idea quality.
- Observed outcome: build progress and submission readiness decoupled; the queue became the critical path.
- Cause: OKX-side approval steps (agent registration, ASP listing) are asynchronous and outside the builder's control.
- Early warning: any OKX-side action still pending inside the last 48 hours before a deadline.
- Prevention or repeat strategy: front-load every step requiring OKX review. Register identity before the product is finished, not after.
- Recovery if it recurs: fall back to a submission path that does not depend on the pending approval, and keep the approval as an upgrade.
- Related fields or stages: Stage 4 planning, Stage 5 build, Stage 7 submission
- Reference and decision IDs: REF-009
- Service IDs: pending Stage 4
- Confidence: strong-signal
- Status: active
- Recorded on: 2026-08-16

### LEARN-003 — Trust first-party chain docs over aggregators

- Type: mistake
- Source: this-project
- Context: X Layer Testnet is listed as chain ID 195 by Chainlist, evmchainlist.org, rpc.info, thirdweb, and Alchemy; official OKX docs say 1952. Chainlist's own 195 entry is labelled "Deprecated" — 195 was the pre-OP-Stack testnet.
- Observed outcome: caught during Stage 1 research before any configuration was written.
- Cause: X Layer migrated to the OP Stack and aggregators did not update.
- Early warning: two sources disagreeing on any network constant.
- Prevention or repeat strategy: take chain IDs, RPCs, and contract addresses only from the chain's own docs, and record the URL and date.
- Recovery if it recurs: reconfigure and re-verify every deployed address against the correct explorer.
- Related fields or stages: Stage 4, Stage 5
- Reference and decision IDs: REF-005, REF-006, DEC-002
- Service IDs: none
- Confidence: proven
- Status: active
- Recorded on: 2026-08-16

### LEARN-004 — Single-upstream wrappers have no moat and a fragile demo

- Type: anti-pattern
- Source: external-reference
- Context: In the winner corpus (REF-004), Cortex's own recorded moat assessment is *"Weak technically, since the architecture is straightforward to reproduce"*, and FlyBeacon's recorded key risk is a hard dependency on live X data through Grok, *"a platform dependency subject to terms and pricing changes"*.
- Observed outcome: both still won, so this does not block a hackathon result — but Event A explicitly judges growth potential and market potential, where it costs points.
- Cause: the product's value lives in someone else's API.
- Early warning: the answer to "what breaks if this one provider changes terms tomorrow" is "everything".
- Prevention or repeat strategy: hold at least one asset the upstream does not own — accumulated data, an on-chain record, or a standard others adopt.
- Recovery if it recurs: name the dependency honestly in the submission rather than letting a judge find it.
- Related fields or stages: Stage 2, Stage 3
- Reference and decision IDs: REF-004
- Service IDs: none
- Confidence: hypothesis
- Status: active
- Recorded on: 2026-08-16

### LEARN-005 — Separate deterministic measurement from model judgement

- Type: success-pattern
- Source: external-reference
- Context: Both live Orion entries (REF-008) lead with the same claim — a deterministic engine produces every number, the LLM only chooses where to look next and writes the prose, and each figure traces back to a real tool call. The entry stating it most explicitly holds the higher AI vetting score (86 vs 72).
- Observed outcome: not yet an outcome — judging has not happened. This is a signal from an automated vetting score, not from a human verdict.
- Cause: verifiable provenance is machine-checkable in a way that model quality is not.
- Early warning: a design where the model itself produces the numbers a user would act on.
- Prevention or repeat strategy: make the model a router and a writer, never a calculator. Log the tool call behind every figure.
- Recovery if it recurs: extract the calculation into a deterministic module and have the model call it.
- Related fields or stages: Stage 2, Stage 3, Stage 5
- Reference and decision IDs: REF-008
- Service IDs: none
- Confidence: strong-signal
- Status: active
- Recorded on: 2026-08-16

### LEARN-006 — Summarised fetches truncate silently

- Type: mistake
- Source: this-project
- Context: The winners spreadsheet was first read through a summarising web fetch, which returned 22 rows and stated "Total Number of Data Rows: 22". The sheet actually holds 242 rows across 57 hackathons. A direct CSV pull and a row count settled it in one command.
- Observed outcome: an entire Stage 2 analysis, a recommendation, and a checkpoint payload were built on 9% of the corpus. The central claim — that no catalogued project combined agent decision-making with accountability — was false; seven winners already do it.
- Cause: a summarising layer between the tool and the data reported a count for what it had processed, not for what existed, with no truncation signal.
- Early warning: any conclusion of the form "nobody has built X" resting on a fetch rather than on a raw file.
- Prevention or repeat strategy: for any dataset that will support a coverage or novelty claim, download the raw artifact, print the row count and the column list, and analyse locally. Never let a summariser define the denominator.
- Recovery if it recurs: re-pull at full size, re-run the analysis, and retract the affected claims in writing rather than quietly amending them.
- Related fields or stages: Stage 1 research, Stage 2 ideation
- Reference and decision IDs: REF-004, DEC-003
- Service IDs: none
- Confidence: proven
- Status: active
- Recorded on: 2026-08-16

### LEARN-007 — Check novelty against the whole corpus before claiming a gap

- Type: anti-pattern
- Source: this-project
- Context: "Stake-to-Act" was recommended as occupying an open gap. A full-corpus scan then surfaced ClawMon, Mnemosyne, Phare, The Dojo, Moltbet, World of Geneva and Immunity — seven winners on the same insight, one of them a 1st place. ClawMon had already published the exact argument: capital that can be taken away is the only trust signal that scales with the value at risk.
- Observed outcome: the recommendation was reversed before any build work started, which is the cheapest possible point to find it.
- Cause: a gap was inferred from absence in a sample rather than tested against the population.
- Early warning: a novelty claim with no accompanying search that could have falsified it.
- Prevention or repeat strategy: before recommending an idea, run a keyword scan for its mechanism across every substantive column of the corpus and record the hit count. An idea with seven precedents is a fallback, not a recommendation.
- Recovery if it recurs: demote the idea, keep its mechanism as a reusable pattern, and say plainly what was wrong.
- Related fields or stages: Stage 2 ideation
- Reference and decision IDs: REF-004, DEC-003
- Service IDs: none
- Confidence: proven
- Status: active
- Recorded on: 2026-08-16

### LEARN-008 — Verification effort follows what is easy to check, which biases the conclusion

- Type: anti-pattern
- Source: this-project
- Context: An independent validator observed that a brief I wrote as deliberately neutral was still asymmetric — chain state, contract minimums and rate limits were verified to five decimals, while the demand side carried only a list of unknowns. It also found two corpus neighbours I had missed (L³, YieldCompass) and one attribution that did not reproduce (Anyware, not Eliver).
- Observed outcome: the brief's facts survived spot-checking, but its selection tilted supportive, and the validator explicitly discounted for it.
- Cause: on-chain reads are cheap and conclusive; demand evidence is expensive and inconclusive. Effort flowed to the cheap side, and the cheap side happened to favour the idea.
- Early warning: a document where every supporting claim has a reproduction command and every weakness is listed as "unknown".
- Prevention or repeat strategy: before publishing an analysis, count verification effort spent on the case *for* versus the case *against*. If it is lopsided, spend on the weak side or state the imbalance in the document.
- Recovery if it recurs: accept the external correction in writing rather than re-arguing, and record what the asymmetry hid.
- Related fields or stages: Stage 1 research, Stage 2 ideation
- Reference and decision IDs: REF-004, REF-014, DEC-003
- Service IDs: none
- Confidence: proven
- Status: active
- Recorded on: 2026-08-16

### LEARN-009 — Score a candidate against the official rubric before locking it, not after

- Type: anti-pattern
- Source: this-project
- Context: EXITPROOF was validated for novelty, demand, feasibility and competition across many rounds, and locked at Checkpoint 1. Only afterwards was it scored against the seven official Hackathon A criteria. Both scoring agents returned mid-pack (22/35, 19/35), and the two criteria that sank it — application of AI at 2, and growth potential at 2 — had never been examined in any earlier round.
- Observed outcome: the decision was reversed one step after being locked, spending ideation time from a 5.7-day window.
- Cause: earlier rounds asked "is this idea real, novel and buildable", which are good questions but not the questions the judges ask. "Application of AI" is a criterion an exit-liquidity measurement will always score poorly on, and that was knowable from the start.
- Early warning: a candidate that has survived several validation rounds but has never been mapped onto the rubric line by line.
- Prevention or repeat strategy: score every shortlisted candidate against every official criterion *during* Stage 2, before Checkpoint 1. Treat a criterion the idea structurally cannot score on as a rejection reason, not a weakness to mitigate.
- Recovery if it recurs: reverse promptly and record why, rather than rescoping around a structural weakness.
- Related fields or stages: Stage 2 ideation, Checkpoint 1
- Reference and decision IDs: DEC-003, DEC-004
- Service IDs: none
- Confidence: proven
- Status: active
- Recorded on: 2026-08-16

### LEARN-010 — A measurement that doesn't move when you vary the thing it's supposed to measure isn't evidence about that thing

- Type: anti-pattern
- Source: this-project
- Context: AFTERHOURS's original value claim was that document-parsing gives the feed "lead time" over the 24/7 price, measured as document-timestamp minus first-price-reaction. When actually measured against 7 real filings, the median interval to the first on-chain trade was 5.4 minutes, with 2 of 7 events showing no trade at all within an hour. An on-chain pool's price only moves when someone trades it, so that interval is a function of trade arrival (a property of pool liquidity), not of how fast the parsing agent runs. A feed that was four minutes slower would have produced nearly the same number.
- Observed outcome: caught before build, not after — reframed the claim from "the feed leads the price" (unfalsifiable with this data) to "the pool quotes a stale price for a measured 5.4 minutes" (directly supported by the same data), and moved the genuine lead-time claim to a *prospective* measurement (poll and store a continuous index from day 1) since the sparse historical trade data could never have supported it.
- Cause: the plan assumed price data was continuous like an order book, without checking whether the specific instrument (a low-volume AMM pool) actually produces a continuous series. It does not.
- Early warning: any claim of the form "X happened before Y" where Y is only observable through a sparse, event-triggered proxy (a trade, a vote, a claim submission) rather than a continuously sampled signal.
- Prevention or repeat strategy: before designing a study, ask "if the thing I'm claiming were false, would this measurement look any different?" If changing the input variable wouldn't move the output, the study doesn't test the claim — find what it actually measures and either use that, or find a continuously-sampled proxy instead.
- Recovery if it recurs: rename and reframe around what the data actually shows rather than discarding the measurement; sparse/negative results are often the sharper finding (a company filed and the market didn't notice for an hour is a stronger claim than "we were 8 seconds faster").
- Related fields or stages: Stage 2/4, any hackathon claim built on "we react faster than the market"
- Reference and decision IDs: DEC-005; `outputs/02-ideation/afterhours-spec.md` §7, §8 (D7)
- Service IDs: none
- Confidence: proven
- Status: active
- Recorded on: 2026-08-17

### LEARN-011 — A "negative" result from a retried sweep needs its coverage checked, not just its retry count

- Type: anti-pattern
- Source: this-project
- Context: The n=46 reaction-latency study (P2.2) swept ±60min RPC windows in 100-block chunks, each chunk retried 4 times on failure. Across ~3,300 chunk queries, 71 failed all 4 tries and were silently excluded from the swap list rather than aborting the event. 14 of the 46 events came back "no trade in the window" — but checking which of those 14 actually had full window coverage found that 12 did not: a failed chunk had been silently dropped from exactly the events with nothing to contradict it.
- Observed outcome: caught before the numbers were reported, not after. A targeted re-sweep of those 12 events with a more aggressive retry policy achieved full coverage on all 12, and all 12 still showed no trade — so the reported 14/46 figure held up, but it could easily not have, and the first pass had no way to tell the difference between "genuinely no trade" and "didn't look everywhere."
- Cause: per-call retry lowers the failure rate but does not make it zero, and a sweep built from many independent calls (100-block chunks over a 2-hour window ≈ 72 calls) accumulates a nontrivial chance that *some* chunk in *some* event's window fails outright. A "no trade" conclusion is exactly the case where a silently-dropped chunk is invisible — there's no partial result to look inconsistent.
- Early warning: any study built from many small retried RPC/API calls per unit of analysis, where the reported finding is an absence ("no trade," "no event," "not found") rather than a value — absences don't self-report missing coverage the way a suspiciously-low count would.
- Prevention or repeat strategy: track the residual error count per unit of analysis (not just an aggregate retry-success rate), and before accepting any "absence" finding, check whether that specific unit's sweep had zero residual errors. If not, close the gap (more retries, longer backoff, or a fully separate re-sweep) before reporting, not after.
- Recovery if it recurs: re-sweep exactly the affected units with a strictly more aggressive retry policy; report both the original and corrected figures if they differ, and how many units were affected either way.
- Related fields or stages: Stage 5 build, any RPC/API-heavy measurement study
- Reference and decision IDs: `outputs/05-build/reaction-latency-study.md` §4
- Service IDs: none
- Confidence: proven
- Status: active
- Recorded on: 2026-08-17
