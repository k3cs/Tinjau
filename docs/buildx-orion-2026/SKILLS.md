# Skill Map — Build X Series AI Season + Orion Builder

The user's chosen primary skill has priority. Recommended skills must include a reason and must not silently replace it.

## Global Profile Snapshot Metadata

- Profile source: /Users/scientivan/.codex/skills/web3-hackathon-pipeline/profiles/global-stage-skills.md
- Snapshot date: 2026-08-16
- Snapshot status: available
- Snapshot SHA-256: 46b2195e6d9c257465ddd86785220564678cea57c17c114abe6c6738df472392

The snapshot below is immutable. Record workspace-specific changes as overlays under `Hackathon Overrides`; never edit the snapshot to apply an override. Synchronization from a changed global profile is a separate operation that requires a diff and explicit approval. A locked skill cannot be replaced without explicit approval.

<!-- GLOBAL_STAGE_SKILL_PROFILE_START -->
## Stage 0 — Hackathon Intake

### Primary

- Skill: web3-hackathon-pipeline
- Run: always
- Locked: yes

### Sequence

1. `web3-hackathon-pipeline`

### Data Flow

- Input: hackathon URLs, documents, screenshots, notes, and user answers
- Output: workspace, input inventory, critical unknowns, and provisional team mode
- Passed to: Stage 1

### Constraints

- Required references: governing inputs when available
- Things to avoid: ideating from unverified eligibility, deadline, or deliverables
- Time or process budget: collect only information needed to begin reliable research
- Approval condition: none beyond authority required for external actions

## Stage 1 — Research and Rule Extraction

### Primary

- Skill: web3-hackathon-pipeline
- Run: always
- Locked: yes

### Optional

- Skill: competitive-landscape
- Run when: comparable products, market alternatives, or differentiation need evidence

### Optional

- Skill: colosseum-copilot
- Run when: Solana hackathon history is relevant

### Optional

- Skill: defillama-research
- Run when: the idea depends on DeFi market or protocol evidence

### Sequence

1. `web3-hackathon-pipeline`
2. `competitive-landscape` when comparable products require mapping
3. `colosseum-copilot` when Solana hackathon evidence is relevant
4. `defillama-research` when DeFi evidence is relevant

### Data Flow

- Input: intake inventory and critical unknowns
- Output: verified rules, judging profile, references, success patterns, and anti-patterns
- Passed to: Stage 2

### Constraints

- Required references: current official sources for governing facts
- Things to avoid: using third-party summaries as the sole source for eligibility or deadlines
- Time or process budget: prioritize facts that can invalidate a submission
- Approval condition: ask before installing or creating an unavailable skill

## Stage 2 — Ideation and Validation

### Primary

- Skill: web3-hackathon-pipeline
- Run: always
- Locked: yes

### Additional

- Skill: brainstorming
- Run: before producing or selecting creative alternatives
- Required: yes

### Optional

- Skill: find-next-crypto-idea
- Run when: the build direction remains open after initial discovery

### Additional

- Skill: validate-idea
- Run: before Checkpoint 1 when a credible idea shortlist exists
- Required: yes

### Sequence

1. `web3-hackathon-pipeline`
2. `brainstorming`
3. `find-next-crypto-idea` when direction is still open
4. `validate-idea`

### Data Flow

- Input: verified hackathon profile, evidence, team capacity, and guardrails
- Output: alternatives, validation evidence, recommendation, and rejected ideas
- Passed to: Checkpoint 1

### Constraints

- Required references: user/problem evidence and relevant comparison projects
- Things to avoid: choosing an idea only because it uses sponsor technology
- Time or process budget: preserve time for a buildable happy path
- Approval condition: Checkpoint 1 approves the final idea

## Stage 3 — Product and MVP Definition

### Primary

- Skill: web3-hackathon-pipeline
- Run: always
- Locked: yes

### Additional

- Skill: problem-statement
- Run: before finalizing the user, problem, and value proposition
- Required: yes

### Optional

- Skill: product-review
- Run when: value, onboarding, happy path, or scope needs an adversarial review

### Sequence

1. `web3-hackathon-pipeline`
2. `problem-statement`
3. `product-review` when product risk warrants review

### Data Flow

- Input: approved idea and evidence
- Output: problem statement, product brief, MVP boundary, and demo narrative
- Passed to: Stage 4

### Constraints

- Required references: approved idea decision and user evidence
- Things to avoid: maximizing feature count instead of demo completeness
- Time or process budget: one reliable end-to-end happy path first
- Approval condition: no change to the approved idea without reopening Checkpoint 1

## Stage 4 — Architecture and Execution Planning

### Primary

- Skill: web3-hackathon-pipeline
- Run: always
- Locked: yes

### Optional

- Skill: scaffold-project
- Run when: a validated new project needs stack selection and workspace scaffolding

### Sequence

1. `web3-hackathon-pipeline`
2. `scaffold-project` when a new scaffold is justified

### Data Flow

- Input: product brief, MVP scope, team constraints, and service needs
- Output: architecture, service plan, ordered work, tests, deployment, and fallback
- Passed to: Checkpoint 2

### Constraints

- Required references: architecture evidence and verified service facts
- Things to avoid: premature scale, unnecessary protocols, and provider-first architecture
- Time or process budget: smallest architecture that supports the approved happy path
- Approval condition: Checkpoint 2 approves architecture, implementation, and service plan

## Stage 5 — Build

### Primary

- Skill: web3-hackathon-pipeline
- Run: always
- Locked: yes

### Sequence

1. `web3-hackathon-pipeline`

### Data Flow

- Input: approved architecture, service plan, skill map, and implementation order
- Output: working MVP, integrated services, build evidence, and visible blockers
- Passed to: Stage 6

### Constraints

- Required references: approved plan and stack-specific documentation
- Things to avoid: adding secondary features before the happy path works
- Time or process budget: select domain and stack skills only from the approved architecture
- Approval condition: request approval before changing locked routing or material scope

## Stage 6 — Testing and Quality Review

### Primary

- Skill: web3-hackathon-pipeline
- Run: always
- Locked: yes

### Optional

- Skill: review-and-iterate
- Run when: an installed ecosystem-compatible code readiness review fits the project

### Optional

- Skill: product-review
- Run when: UX, onboarding, feature completeness, or value needs review

### Optional

- Skill: cso
- Run when: the actual risk surface justifies a security review

### Optional

- Skill: debug-program
- Run when: a Solana program or transaction failure requires specialized debugging

### Sequence

1. `web3-hackathon-pipeline`
2. `review-and-iterate` when ecosystem-compatible code review is justified
3. `product-review` when product quality needs review
4. `cso` when security risk warrants it
5. `debug-program` when a matching Solana failure exists

### Data Flow

- Input: working MVP, acceptance criteria, service readiness, and risk register
- Output: test evidence, defects, limitations, and release recommendation
- Passed to: Stage 5 for fixes or Stage 7 for release preparation

### Constraints

- Required references: acceptance criteria and observed test evidence
- Things to avoid: downgrading eligibility, security, data-loss, or demo blockers
- Time or process budget: review proportional to the actual risk surface
- Approval condition: reopen affected checkpoint when evidence invalidates its basis

## Stage 7 — Demo, Pitch, and Submission

### Primary

- Skill: web3-hackathon-pipeline
- Run: always
- Locked: yes

### Optional

- Skill: submit-to-hackathon
- Run when: its ecosystem and submission workflow match the current hackathon

### Optional

- Skill: create-pitch-deck
- Run when: a deck or live pitch is required

### Optional

- Skill: marketing-video
- Run when: a produced demo or marketing video is required

### Optional

- Skill: video-craft
- Run when: frame-level polish materially improves the required video

### Sequence

1. `web3-hackathon-pipeline`
2. `submit-to-hackathon` when compatible with the current ecosystem
3. `create-pitch-deck` when a deck is required
4. `marketing-video` when a video is required
5. `video-craft` when the produced video needs visual refinement

### Data Flow

- Input: release candidate, verified requirements, evidence, and narrative
- Output: compliant demo and submission package
- Passed to: Checkpoint 3

### Constraints

- Required references: current submission requirements and working product evidence
- Things to avoid: unsupported claims, broken permissions, and automatic submission
- Time or process budget: create only required formats
- Approval condition: Checkpoint 3 and separate external-submission authority

## Stage 8 — Evaluation and Learning

### Primary

- Skill: web3-hackathon-pipeline
- Run: always
- Locked: yes

### Additional

- Skill: learn
- Run: during retrospective curation and guardrail promotion
- Required: yes

### Optional

- Skill: product-review
- Run when: delivered product value should be compared with the approved intent

### Sequence

1. `web3-hackathon-pipeline`
2. `learn`
3. `product-review` when delivered value requires comparison

### Data Flow

- Input: execution history, outcomes, feedback, incidents, and service results
- Output: contextual learnings, anti-patterns, and reusable guardrails
- Passed to: future hackathon intake

### Constraints

- Required references: observed outcomes and project evidence
- Things to avoid: treating one painful failure as a universal rule
- Time or process budget: capture only evidence-backed reusable learning
- Approval condition: do not mutate other workspace snapshots without explicit synchronization
<!-- GLOBAL_STAGE_SKILL_PROFILE_END -->

## Hackathon Overrides

Keep this section outside the snapshot. Duplicate the entry template for each workspace-only routing change.

### OVERRIDE-NNN — Override Title

- Stage:
- Replaces skill:
- Replacement skill:
- Scope: this-hackathon
- Reason:
- Locked target: yes | no
- Approved by:
- Approval date:

## Stage Skill Summary

The candidate sets are general starting points. Recheck installed skills and replace them based on the specific hackathon, product, ecosystem, and output requirements.

| Stage | Primary Skill | General Candidate Set | Fallback | Availability |
|---|---|---|---|---|
| 0 — Intake | `web3-hackathon-pipeline` | Parent orchestrator | Manual template copy | [fill] |
| 1 — Research | `web3-hackathon-pipeline` | `competitive-landscape`; conditional `colosseum-copilot` or `defillama-research` | Manual source review | verify at stage entry |
| 2 — Ideation | `web3-hackathon-pipeline` | `brainstorming`, `find-next-crypto-idea`, `validate-idea` | Structured ideation and validation | verify at stage entry |
| 3 — Product | `web3-hackathon-pipeline` | `problem-statement`, `product-review` | Manual product definition | verify at stage entry |
| 4 — Planning | `web3-hackathon-pipeline` | `scaffold-project` plus justified domain guidance | Manual implementation plan | verify at stage entry |
| 5 — Build | `web3-hackathon-pipeline` | Domain- and stack-specific skills from the approved architecture | Stack-specific coding workflow | verify at stage entry |
| 6 — Quality | `web3-hackathon-pipeline` | `review-and-iterate`, `product-review`, `cso`; conditional debugger | Manual test and review | verify at stage entry |
| 7 — Submission | `web3-hackathon-pipeline` | `submit-to-hackathon`, `create-pitch-deck`; conditional video skills | Manual submission checklist | verify at stage entry |
| 8 — Retrospective | `web3-hackathon-pipeline` | `learn`, `product-review` | Structured retrospective | verify at stage entry |

## Skill Usage Entry

Duplicate this section for every selected skill.

### Skill Name

- Role: primary | additional | optional | fallback
- Stage:
- Trigger:
- Selection reason:
- Required input:
- Expected output:
- Dependencies:
- Constraints:
- Execution order:
- Locked: yes | no
- Selection source: active-instruction | hackathon-override | global-profile | candidate-map
- Override reason:
- Availability: available | unavailable | needs-installation | needs-creation
- Exit criteria:
- Reference IDs:
- Learning IDs / things to avoid:

## Reusable Skill Proposal

Use this only when no available skill covers a required capability. Obtain approval before creating or installing anything.

- Proposed name:
- Problem solved:
- Example trigger prompts:
- Use when:
- Do not use when:
- Input:
- Workflow:
- Output:
- Tools or integrations:
- Required references:
- Required assets or scripts:
- Risks and constraints:
- Validation and test examples:
- Relationship to available skills:
- Approval status: pending
