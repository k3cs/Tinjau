# Post-submission changelog

**The submitted state is the tag [`submission-final`](https://github.com/k3cs/Tinjau/tree/submission-final).**
It points at commit `58ab29dd`, dated **2026-08-21 19:28:21 UTC**, the last commit whose commit and
push both preceded the hackathon deadline of **2026-08-21 23:59 UTC**. Everything reachable from
that tag is part of the submission and needs no label.

This file exists so that nothing added afterwards can be mistaken for part of it.

## The rules this file follows

Every change to a judge-visible surface made after the deadline gets one dated line below, whether
it flatters the project or not. Nothing is backdated: no commit date is manipulated, no dated
document is edited to look as though it predated the deadline, and no historical evidence file is
rewritten. Where a post-deadline finding contradicts something in the submitted state, the
correction is written as a correction, quoting what it replaces, rather than silently overwriting
it.

The `submission-final` tag was itself created about four hours late, at roughly 2026-08-22 04:00
UTC, because work was still running when the deadline passed. That is recorded in the tag's own
message. A tag applied late still points at the right commit, and the commit's timestamp is the
evidence.

## Why work continued after the deadline

Two published requirements extend past submission, so the project is not finished at the deadline
even though the submission is. The event's participation requirements state that a project *"must
have a dedicated X account and keep it active throughout the project's lifetime"*, and that a
project deployed on X Layer Testnet during the Hackathon must be *"subsequently launched on the X
Layer Mainnet"* — a clause carrying no date. Separately, the AI-RWA Liquidity Grant is judged on
*"overall performance during the Hackathon, including product quality, innovation, user value, and
contribution to the ecosystem"*.

Whether judges consider post-deadline repository or website changes is **not determinable from the
organizer's published material**. That question was researched rather than assumed; see
`docs/buildx-orion-2026/outputs/05-build/s0-1-judging-timeline-note.md`, which records what is
known, what is inferred, and what is unknowable. This changelog exists precisely because the answer
is unknown: if judges look only at the submitted state, the tag defines it exactly; if they look at
the live repository, this file tells them which parts arrived late.

## Changes after 2026-08-21 23:59 UTC

| Date (UTC) | Commit | Judge-visible change |
|---|---|---|
| 2026-08-22 03:54 | `252d42cb` | Added the demand-evidence outreach kit (`docs/.../05-build/s6-3-outreach-kit.md`), materials only, no approach made to anyone. Its notable content is a refusal: "attach Tinjau to your pool" cannot honestly be offered, because X Layer's real tokenized-equity pools are Uniswap v3 and a v4 hook binds at pool initialization. Also corrected three references in the S3.2 write-up to a raw-artifact path removed as a byte-identical duplicate, recorded there as deviation 9. |
