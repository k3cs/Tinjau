# Team — Build X Series AI Season + Orion Builder

- Mode: solo
- Capacity last reviewed: 2026-08-20

> Dien remains the sole human builder, integration owner, and decision-maker. DEC-011 authorizes one user-managed external AI agent for non-frontend work and Codex for frontend work; neither agent is an external project collaborator or evidence of team/adoption.

## Members and Availability

| Member | Skills | Role | Availability | Constraints | Owner Areas |
|---|---|---|---|---|---|
| Dien | Solidity/EVM (prior UHI8 winner, Veritas Protocol), TypeScript monorepo, prior OKX Onchain OS setup | Builder / integration owner / decision-maker | [missing] hours per day not stated | Two deadlines 11 days apart; OKX-side review queues outside his control | Approval, integration, human-only actions, final submission |
| External non-frontend AI agent (user-managed) | Context supplied by the revised tracker; implementation capability otherwise not assumed | Non-frontend implementer | Per user-managed session | Starts with no conversation context; cannot edit `apps/web/**` or `DESIGN.md`; no unapproved accounts, spend, outreach, mainnet, or submission | Server, AI/data, contracts, benchmarks, backend/API, evidence, non-UI docs |
| Codex (this session) | Product context, frontend implementation, integration review | Frontend implementer / documentation orchestrator | Per session | Does not own non-frontend implementation under DEC-011; no external submissions, account creation, on-chain spends, or fee payments without separate authorization | `apps/web/**`, frontend design, browser demo path, frontend verification |

## Ownership

| Deliverable | Owner | Reviewer | Due | Status |
|---|---|---|---|---|
| Hackathon profile | Claude | Dien | 2026-08-16 | completed |
| Winner-pattern analysis | Claude | Dien | 2026-08-16 | completed |
| Idea shortlist + recommendation | Claude | Dien | 2026-08-16 | completed |
| Revised LP Risk Autopilot design | Codex | Dien | 2026-08-20 | completed |
| Revised service plan and integrations | Codex | Dien | before reopened Checkpoint 2 | completed — SVC-007/SVC-008 replay fixtures approved |
| MVP non-frontend core | External non-frontend AI agent | Dien | before 2026-08-21 23:59 UTC | not-started — begin T0.2 |
| MVP frontend | Codex | Dien | before 2026-08-21 23:59 UTC | not-started — waits for stable handoff or explicit user request |
| MVP integration and acceptance | Dien | Codex | before 2026-08-21 23:59 UTC | not-started |
| Event A submission package | Dien | Claude | 2026-08-21 23:59 UTC | not-started |
| Event B submission package | Dien | Claude | 2026-09-02 23:59 UTC | not-started |

## Capacity and Parallel Work

- Maximum concurrent workstreams: one primary task in each authorized agent lane; Dien retains a separate review/integration lane.
- **Prospective execution rule (DEC-011):** the non-frontend and frontend lanes may proceed in parallel only when they touch separate files and the frontend consumes a frozen schema or deterministic handoff fixture. Each lane keeps at most one primary implementation task in progress.
- File boundary: the external agent must not edit `apps/web/**` or `DESIGN.md`; Codex does not implement server/contracts/benchmark tasks unless Dien changes the assignment.
- Integration contract: non-frontend output for the frontend must be written to `outputs/05-build/frontend-handoff/` in the formats required by the revised tracker §0.23–§0.24.
- Integration owner: Dien
- Integration schedule: `outputs/04-planning/tinjau-lp-risk-autopilot-task-tracker.md` §3 — approved by DEC-010
- Further delegation is not authorized by DEC-011.

**Ideation exception (LEARN-001):** during Stage 2 this capacity picture is deliberately *not* used as an idea filter. Feasibility screening resumes at Checkpoint 1, at Dien's explicit request.

## Team Risks

- Risk: Event A deadline is 2026-08-21 23:59 UTC while Stage 5 still requires the final evidence → state → bounded action → recovery → three-policy proof loop.
- Early warning: the external agent has not frozen T0.2/T0.4 or a versioned frontend handoff while the frontend lane is ready to begin.
- Mitigation: external agent starts at T0.2, preserves the P0 dependency spine, produces deterministic handoff fixtures early, and cuts P1/P2 breadth before any P0 proof step.
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

- Date: 2026-08-20
- Ownership or capacity change: Dien authorizes two non-overlapping implementation lanes—external agent for non-frontend and Codex for frontend—with mandatory versioned handoff artifacts
- Scope impact: no product-scope change; execution and file ownership only
- Pipeline stages affected: Stage 5 through Stage 7 integration
- Decision ID: DEC-011
