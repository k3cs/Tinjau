# The Tinjau Cut — narration corrections

Companion to the storyboard artifact *The Tinjau Cut* (12 beats, 4 acts, 1:59). That
document is the plan; this one records where the narration written on 2026-08-21 no
longer matches the evidence, and what it has to say instead.

All twelve beats are animated, and stitched into `out/tinjau-cut.mp4`. Composition ids
match the storyboard's beat numbers. Beats not listed below keep their written narration.

---

## Beat 04 — "Five reports, one source" · 0:22 · 12s

**The narration as written is not supported by the evidence graph and must be replaced.**

> ~~"Tinjau reads the reports themselves. Four of them trace back to the same Wall Street
> Journal story. That isn't four sources agreeing. It's one story, repeated. So: pay
> attention, change nothing."~~

`evidenceGraph.independence` in `scenario-rumor-watch.json` records **two** syndications,
not four. `confidenceFactors[0]` states it in the file's own words: *"2 claim(s) attribute
their reporting to another outlet."*

| Claim | `derivedOriginKey` | `isSyndication` |
|---|---|---|
| CNBC | `wsj` | `true` |
| The Next Web | `wsj` | `true` |
| The Wall Street Journal | `wsj` | `false` — it is the origin |
| DataCenterDynamics | `unrecognised:datacenterdynamics.com` | **`false`** |
| Social post | `unrecognised:simulated:` | `false` |

DataCenterDynamics is not a syndication of the Journal. Its headline ends `- report`, so
`relaysUnnamedReport` is `true` and its origin cannot be recognised at all. Saying it
traces back to the Journal asserts an edge the graph does not contain — the same error
`src/data.ts` warns about in its own header.

The outcome the plan wanted is still true and still says what it needs to:
`independentOriginCount` and `usableOriginCount` are both **1**.

**Replacement narration** (36 words):

> "Tinjau reads the reports themselves. Two name the Journal in their own words. One names
> no source at all. One we wrote ourselves, as a test. Five claims, one usable source.
> Pay attention. Change nothing."

The animation already matches this: two lime connectors into the Journal, two struck
cards on the far side of the divider. Keep the corner mark from the storyboard.

---

## Beat 05 — "The model never touches the money" · 0:34 · 9s

**The storyboard credits the model with work it does not do, and beat 04's corner mark
repeats the error.**

> ~~SMALL MARK, corner: this grouping was produced by the model and checked against the
> rules — both published~~

`README.md` §9.10: *"Speculation detection and independence derivation are curated
heuristics, not models."* And `s2-2-evidence-graph-live.md` says of the study that did
ask a model: *"the deterministic promotion engine remains the decider and the model's
output is not wired into it."*

So the model did not group the five claims. What a model genuinely does on the path that
reaches the chain is smaller and verifiable: it parses scenario B's real 8-K three times
and the agreement report's `readyToPost` supplies reason bit 18 to the unchanged decision
engine. Posted in tx `0x7edfb15d0a…c4fdd507`, block 38,875,116, chain 1952. 3 of 3 parses
succeeded, both key fields agreed, `declaredAmounts` disagreed and does not gate. The
outcome did not change — computed and assumed both resolve `WATCH`.

**Replacement narration** (33 words):

> "That call was never the model's to make. It reads the filing three times and reports
> where the three readings disagree. It can't set a fee and it can't authorise anything.
> The contract does that."

**Replacement corner mark for beat 04:**

> the grouping is curated heuristics — a model was asked the same questions separately and
> both answers are published

---

## Beat 07 — "It acts briefly, then puts itself back" · 0:51 · 12s

Narration stands. Three hard constraints are enforced in the picture:

1. **`CONSTRUCTED` sits beside `PROTECT` at the same size**, from the frame `PROTECT`
   appears. `t6-5-demo-manifest.json` requires exactly this, and names the alternative
   *"the single most misleading thing this project could publish."*
2. **The canonical replay of the same event — `WATCH` — is on screen for the whole beat.**
   Tinjau reaches `PROTECT` on none of the four frozen replays.
3. **No seconds appear anywhere in the shot.** The four fees ran on the 60×-compressed
   demo envelope; putting them beside the production timings is the one genuinely
   misleading frame available. The disclosure names the compression instead.

The second fee is printed `0.947%`, not `0.95%`. 9,470 pips is a measured value decoded
from a Swap event and rounding it hides a digit.

S3.3 searched for a scenario that reaches protection on canonical data and **found none**,
so per the storyboard's own instruction the wording stays exactly as written and the
"set up by us" super stays.

---

## Beat 08 — "The boring one moved it more" · 1:03 · 10s

Narration stands as written. Both figures verified against §6.3 of
`three-policy-benchmark.md`: the routine Form 4 fell **241 bps**, the $105bn 8-K fell
**235 bps**, and the Form 4 is five days earlier, so "days earlier" is right.

> "Here's what surprised us. Days earlier, routine paperwork moved the price more than that
> hundred-billion announcement did. A system watching only price raised its fee on the
> boring one. Tinjau didn't."

One note on the picture, not the words: the two values are plotted as marks on **one
shared axis**, not as two bars from zero. Two bars would differ by a dozen pixels and the
graphic would only mean something after its caption was read.

---

## Beat 09 — "Two tests, written before they were run" · 1:13 · 15s

The storyboard left the last line open because the second test had not run. It has now —
`s3-2-paired-pool-result.md`, executed 2026-08-21.

- Band: **`CONFIRMS`**, at **D = 195.38 bps** under the primary mark
- The sign holds under all three marks; the control run read exactly zero
- **Third execution.** The first two are void and are published in full
- The document is explicit: this does **not** license "Tinjau reduces LP loss"

The storyboard's instruction was to use only the words the pre-registration allows. The
allowed word is the band name, `CONFIRMS`, and nothing built on top of it.

**Narration** (44 words):

> "Does it save money? We wrote down what counts as success before running anything. The
> first test failed. The second ran two identical pools through the same trades — one
> protected, one not. It confirmed. It still doesn't let us say Tinjau reduces LP loss."

---

## Beat 12 — "The edges, then the address" · 1:52 · 7s

**The super must be narrowed.** As written it claims more than the intake work delivered:

> ~~"the feeds are replayed" has left this list — with live intake wired in, it is no
> longer true~~

`s5-2-live-news-intake.md` §"What that choice does not do" is explicit: an 8-K is
`OFFICIAL`, not `NEWS`. The live path replaces the frozen intake for **corporate
disclosure only**. It *"does not give this project live third-party press."* And
`known-limitations.md` still carries the `SIMULATED` social claim, which cannot support
any statement about live social monitoring.

**Replacement super:**

> live SEC filings are wired in — third-party press is still replayed, and the one social
> claim is still ours

---

## Fixed, not deferred

`media/thread2/card-04.html` printed `node tools/verify-proof-of-protection.mjs` and that
path did not exist. The card appears in beat 09. `tools/verify-proof-of-protection.mjs`
now exists and forwards to the real verifier at
`docs/buildx-orion-2026/outputs/05-build/tools/verify-proof-of-protection.mjs`; the
command on the card runs and exits 0. The card did not need re-rendering.

---

## Built

All twelve beats are animated and assembled in one Remotion composition, `src/Film.tsx`.

- `out/tinjau-cut.mp4` — 5,712 frames, 3:10.4, 1920×1080, 30 fps, silent, subtitles burned in
- `out/tinjau-cut.srt` — the same cues as a sidecar, for a soft-subtitle upload
- `out/beats/` — the twelve beats on their own

```bash
npx remotion render Film out/tinjau-cut.mp4 --codec h264 --crf 18 --color-space bt709
```

There is no ffmpeg concat step; `Film.tsx` sequences the beats itself so the subtitle
track is a layer over them rather than something burned on afterwards.

## Pacing

`src/timing.ts` is the film's only clock, and it holds two separate dials.

**`PACE = 1.4`** stretches the motion inside every beat. Each beat reads `useBeatFrame()`
from `kit.tsx` instead of `useCurrentFrame()`, so one constant slows all twelve at once
and none can drift out of step. It is not set higher: the review of the first cut said the
speed itself was fine, so this is breathing room rather than slow motion.

**`STRETCH = 1.6`** on the durations. What is left after the motion finishes is a still
hold of 3–6 seconds on the completed frame, and that hold is the actual reading time.
Several frames carry a ledger, a readout panel and a disclosure at once; a viewer needs to
finish the picture before the next shot arrives.

| | first cut | now |
|---|---|---|
| Runtime | 1:59.0 | **3:10.4** |
| Frames | 3,570 | 5,712 |
| Hold after motion ends | 0–2s | 3–6s |

Ceiling is 3:30. Changing either dial re-times the beats, the compositions and both
subtitle outputs together — nothing downstream holds its own copy of the timeline.

## Subtitles

Cues live in `src/subtitles.ts` as lines grouped per beat, weighted by word count and
spread across whatever that beat's duration currently is. There are no hand-typed
timestamps, so the burned-in captions and the `.srt` cannot disagree, and a cue can never
cross a beat boundary — a line is never held over the wrong picture. The last cue of each
beat runs to the end of the beat, so a sentence stays on screen through the reading hold.

The band is a designed element, not floating text with a shadow: a hairline at y=966, a
solid carbon field beneath it, and the sentence in Inter 400 at 32px. It is opaque because
every beat was re-laid out to finish above it — the disclosure lines moved from
`bottom: 46` to `bottom: 130`, and beat 04's readout panel and verdict moved up with them.
Nothing is covered, so nothing needs to show through.

Voice is not recorded. The storyboard's order of work puts it last, against finished
picture, so a beat that runs long is heard before it is committed to. The subtitle timings
are the read the voice should match.
