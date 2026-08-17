# Team — Build X Series AI Season + Orion Builder

- Mode: solo
- Capacity last reviewed: 2026-08-16

> Mode is `[inferred]` — Dien speaks in the first person singular throughout and no collaborators have been named. Confirm before Checkpoint 2.

## Members and Availability

| Member | Skills | Role | Availability | Constraints | Owner Areas |
|---|---|---|---|---|---|
| Dien | Solidity/EVM (prior UHI8 winner, Veritas Protocol), TypeScript monorepo, prior OKX Onchain OS setup | Builder / decision-maker | [missing] hours per day not stated | Two deadlines 11 days apart; OKX-side review queues outside his control | Everything |
| Claude (this session) | Research, ideation, architecture, implementation, review | Assistant | Per session | No external submissions, account creation, on-chain spends, or fee payments without separate authorization | Stage execution and evidence |

## Ownership

| Deliverable | Owner | Reviewer | Due | Status |
|---|---|---|---|---|
| Hackathon profile | Claude | Dien | 2026-08-16 | completed |
| Winner-pattern analysis | Claude | Dien | 2026-08-16 | completed |
| Idea shortlist + recommendation | Claude | Dien | 2026-08-16 | needs-review |
| Service plan and integrations | Claude | Dien | before Checkpoint 2 | not-started |
| MVP happy path | Dien | Claude | before 2026-08-21 23:59 UTC | not-started |
| Event A submission package | Dien | Claude | 2026-08-21 23:59 UTC | not-started |
| Event B submission package | Dien | Claude | 2026-09-02 23:59 UTC | not-started |

## Capacity and Parallel Work

- Maximum concurrent workstreams: 1 primary implementation task at a time for the human (solo-mode limit, unchanged)
- **Agent-tooling exception (Stage 4, 2026-08-17):** the human team stays solo, but Stage 5 build work is executed via multiple Claude Code sessions — one orchestrator, up to 2 concurrent executors — per the protocol in `outputs/04-planning/task-tracker.md` §1. This is parallel *tooling*, not parallel *headcount*: Dien remains the single reviewer who verifies evidence and closes tasks, which is exactly why the executor cap is set by review capacity (2) rather than by how many agent sessions could technically run. Only unblocked tasks (task-tracker.md §2 dependency spine) run concurrently; the orchestrator sequences everything else by hand.
- Integration owner: Dien
- Integration schedule: task-tracker.md §2 (dependency spine) — set during Stage 4
- Solo-mode work-in-progress limit: one primary implementation task for Dien's own review attention; up to 2 for agent executors under orchestrator supervision

**Ideation exception (LEARN-001):** during Stage 2 this capacity picture is deliberately *not* used as an idea filter. Feasibility screening resumes at Checkpoint 1, at Dien's explicit request.

## Team Risks

- Risk: Event A deadline is ~5.7 days out while Stage 2 is only starting.
- Early warning: Checkpoint 1 not approved by end of 2026-08-17.
- Mitigation: Event A governs scope; Event B reuses the same artifact with 11 extra days.
- Fallback owner: Dien

- Risk: OKX-side review or approval queues (agent/ASP listing) block submission independently of build progress — this was the recorded dominant risk in the prior OKX hackathon (REF-009, LEARN-002).
- Early warning: any OKX action still pending 48h before 2026-08-21 23:59 UTC.
- Mitigation: submit anything requiring OKX review first, before feature work is complete.
- Fallback owner: Dien

- Risk: Event B's ignition fee is a real, non-refundable on-chain payment from Dien's Base wallet.
- Early warning: Base wallet holds under ~$15 in ETH at submission time.
- Mitigation: fund before 2026-09-01; Claude will not execute this payment.
- Fallback owner: Dien

## Change Record

- Date: 2026-08-16
- Ownership or capacity change: workspace created; solo mode set provisionally
- Scope impact: none yet
- Pipeline stages affected: Stage 0, Stage 1
- Decision ID: DEC-001
