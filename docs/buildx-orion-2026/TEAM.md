# Team — Build X Series AI Season + Orion Builder

- Mode: solo
- Capacity last reviewed: 2026-08-20

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
| Idea shortlist + recommendation | Claude | Dien | 2026-08-16 | completed |
| Revised LP Risk Autopilot design | Codex | Dien | 2026-08-20 | completed |
| Revised service plan and integrations | Codex | Dien | before reopened Checkpoint 2 | in-progress — SVC-007/SVC-008 pending |
| MVP happy path | Dien | Claude | before 2026-08-21 23:59 UTC | not-started |
| Event A submission package | Dien | Claude | 2026-08-21 23:59 UTC | not-started |
| Event B submission package | Dien | Claude | 2026-09-02 23:59 UTC | not-started |

## Capacity and Parallel Work

- Maximum concurrent workstreams: 1 primary implementation task at a time for the human (solo-mode limit, unchanged)
- **Prospective execution rule (revised 2026-08-20):** the default is one active implementation task. A second independent workstream or executor agent is permitted only after Dien explicitly authorizes it; the revised tracker does not infer that authorization from the historical DEC-006 plan.
- Integration owner: Dien
- Integration schedule: `outputs/04-planning/tinjau-lp-risk-autopilot-task-tracker.md` §3 — pending revised Checkpoint 2 approval
- Solo-mode work-in-progress limit: one primary implementation task; one additional independent stream only with Dien's explicit authorization

**Ideation exception (LEARN-001):** during Stage 2 this capacity picture is deliberately *not* used as an idea filter. Feasibility screening resumes at Checkpoint 1, at Dien's explicit request.

## Team Risks

- Risk: Event A deadline is 2026-08-21 23:59 UTC while the revised implementation plan is awaiting Checkpoint 2 approval.
- Early warning: T0.1 shows that the existing prototype cannot supply most of the revised P0 vertical slice by reuse.
- Mitigation: preserve the full evidence → state → bounded action → recovery → three-policy proof loop; cut P1/P2 breadth first and use source-linked replay fixtures if live news/social access is unavailable.
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

- Date: 2026-08-20
- Ownership or capacity change: revised LP Risk Autopilot tracker becomes the prospective plan; default WIP reset to one task and historical multi-executor permission is not carried forward automatically
- Scope impact: P0 is one complete vertical slice; P1/P2 cannot block it
- Pipeline stages affected: Stage 4, Checkpoint 2, Stage 5
- Decision ID: DEC-009, DEC-010
