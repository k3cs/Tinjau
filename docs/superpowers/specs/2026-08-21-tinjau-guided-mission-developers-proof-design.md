# Tinjau Guided Mission, Developers, and Proof of Work Design

**Date:** 2026-08-21  
**Status:** Approved design, awaiting written-spec review  
**Scope:** Replace the current demo dashboard behavior with a guided mission experience and add separate
Developers and Proof routes.

## Context

The current `/demo` route is technically inspectable but reveals too much too early. A visitor can switch among
stages, while the command bar and scenario fixture already expose the outcome. This makes the page read as a
pre-filled dashboard instead of demonstrating how Tinjau moves from signal to evidence, bounded policy, action,
and recovery.

The revised experience must teach the product like a game tutorial: select a mission, receive one objective,
make a constrained decision, observe the consequence, and unlock the next stage. It must remain accurate about
what is implemented, replayed, historical, pending, or unavailable.

Two additional product questions need dedicated routes:

- `/developers` explains how an operator or developer would use Tinjau.
- `/proof` proves product completeness through testnet, transaction, API, test, and repository evidence.

## Goals

1. Make the complete Tinjau idea understandable without prior context.
2. Reveal evidence and system output only after the user performs the relevant action.
3. Let users attempt unsafe decisions so Tinjau can visibly reject them with a reason.
4. Keep short, permanent coaching visible at every stage.
5. Use modals only for meaningful risk, authorization, failure, and recovery events.
6. Demonstrate testnet completeness without presenting incomplete integrations as live.
7. Give developers an honest integration path with capability maturity at every step.

## Non-goals

- The walkthrough is not an unrestricted production control plane.
- The walkthrough does not manufacture a PROTECT transaction, X post, market confirmation, or benchmark result.
- The Developers page does not publish commands for integrations that do not exist.
- The Proof page is not a token or protocol analytics dashboard.
- This work does not change backend policy behavior or contract deployment state.

## Information architecture

Primary public routes become:

- `/` — product explanation and primary entry into the guided demo.
- `/demo` — mission selection and guided mission state machine.
- `/developers` — role-based integration guidance.
- `/proof` — Proof of Work evidence center.

The main navigation label is **Proof**, while the `/proof` page heading is **Proof of Work** with the subtitle
“Testnet deployments, transactions, and implementation evidence.”

Landing, Mission Recap, and Developers link to `/proof`. Detailed deployment claims live only on `/proof` so
they do not drift across pages.

## Guided mission experience

### Entry: Mission Select

Opening `/demo` shows no preloaded risk record or outcome. The user first chooses one mission:

1. **Scene A — Contain a rumor**  
   X-shaped rumor → evidence retrieval → WATCH → aggressive action blocked.
2. **Scene B — Verify an official event**  
   Official disclosure → provenance → market gate → current implementation or explicitly labeled lifecycle
   replay.
3. **Scene C — Compare three policies**  
   Matched input → static, volatility-only, and event-aware policies → evidence-based comparison.

Each mission card explains the objective, approximate number of decisions, and whether its data is observed,
replayed, or simulated. Choosing a mission creates a fresh mission session; it does not immediately reveal the
scenario output.

### Guided Console layout

Desktop uses a persistent two-column work area:

- **Coach Console:** context, current objective, available knowledge, unknowns, decision options, and why the
  stage matters.
- **System Output:** only the records and evidence revealed by completed actions.

The top area contains mission identity, `current stage / total stages`, and a compact progress rail. The decision
area remains visually attached to the Coach Console. On mobile, the Coach Console appears before System Output
in document order. The stage rail may scroll horizontally, but the page itself must not overflow.

### Permanent Coach Console

Every stage contains six short fields:

1. **What happened** — the latest event.
2. **Objective** — what the user must establish next.
3. **What Tinjau knows** — revealed, usable information.
4. **What remains unknown** — absent or unconfirmed information.
5. **Choose the next action** — constrained decisions.
6. **Why it matters** — LP and policy consequence.

The console is permanent. Important-event modals add emphasis but never replace this explanation.

### Stage sequence and progressive disclosure

All evidence missions use nine stages:

1. **Listen** — reveal one incoming signal.
2. **Retrieve** — reveal source URL, author, timestamp, and source snapshot.
3. **Understand** — reveal normalized claim, asset, event type, and extraction confidence.
4. **Relate** — reveal supporting, conflicting, and duplicate evidence incrementally.
5. **Decide** — calculate a deterministic risk state from currently available evidence.
6. **Confirm** — inspect OKX/X Layer market evidence and confirmation availability.
7. **Record** — reveal the versioned risk record, reason code, expiry, and registry status.
8. **Act** — reveal permitted, blocked, failed, or pending actions.
9. **Recover** — reveal expiry and deterministic decay toward NORMAL.

System Output starts with an explicit empty state. An action appends only its corresponding event and output. Old
events remain visible as the investigation trail; the next stage never arrives pre-populated.

### Decisions and guardrails

Each stage offers a small set of authored decisions. A decision is one of:

- **Accepted:** valid action, reveals output, and may unlock the next stage.
- **Rejected:** selectable unsafe action that is refused with a stable reason code and explanation.
- **Unavailable:** action whose dependency is absent. It remains visible with the missing requirement, but does
  not pretend it ran.

Rejected choices must be selectable. This proves that Tinjau constrains an operator or AI even when an unsafe
instruction is attempted. Rejection does not corrupt or reset mission progress.

### Important-event modal

A modal appears only when:

- the risk state first changes to WATCH, PROTECT, or back to NORMAL;
- a user action is rejected;
- market confirmation fails or is unavailable;
- an on-chain action succeeds or fails;
- protection expires or enters/completes decay.

The modal contains:

- previous state and new state;
- immediate cause;
- supporting evidence;
- active guardrail;
- actions now allowed and prohibited;
- data mode and capability maturity.

Routine stage completion remains in the Coach Console and event trail to avoid modal fatigue.

### Progress behavior

- Future stages are locked until their prerequisites complete.
- Completed stages may be revisited without losing outputs.
- A deep link cannot bypass locked prerequisites.
- Session state survives refresh in the same browser tab through `sessionStorage`.
- `Restart mission` clears decisions and outputs for the active mission.
- `Choose another scenario` returns to Mission Select and starts a separate fresh session.
- Closing the tab ends the session; cross-device or account persistence is not required.

### Mission Recap

Completing a mission opens a recap containing:

- evidence and system event timeline;
- decisions made by the user;
- rejected actions and reason codes;
- risk-state transitions;
- authorized, blocked, unavailable, or replayed actions;
- data-mode and capability-maturity legend;
- direct link to `/proof` for implementation evidence;
- actions to replay the mission or choose another.

## Mission definitions

### Scene A — Contain a rumor

The mission begins with one X-shaped claim. Representative decisions include:

- **Raise the fee immediately** — rejected because a rumor cannot authorize an aggressive policy action.
- **Treat repost volume as confirmation** — rejected because syndication/duplicates are not independent support.
- **Retrieve the original source** — accepted.
- **Search for an official source** — accepted.
- **Hold at WATCH while support is absent** — accepted.

The current outcome is WATCH. Aggressive fee action is blocked, provenance is recorded, and X Publisher does not
publish the claim as fact. X Listener and X Publisher remain separate capabilities with separate maturity labels.

### Scene B — Verify an official event

The mission begins with an official disclosure. Representative decisions include:

- **Enter PROTECT immediately** — rejected until all required gates pass.
- **Verify source provenance** — accepted.
- **Inspect supporting/conflicting evidence** — accepted.
- **Run OKX/X Layer market confirmation** — accepted if the adapter is available; otherwise unavailable with an
  explanation.
- **Record a bounded policy decision** — accepted only when prerequisites permit it.

The experience separates:

1. **Current implementation:** the real current path. If final confirmation or action integration is unavailable,
   it stops at WATCH or a degraded confirmation state.
2. **Lifecycle replay:** a separately initiated, prominently labeled REPLAY that demonstrates the intended
   `PROTECT → bounded fee → expiry → decay → NORMAL` lifecycle without claiming a live transaction.

Replay and current implementation never share the same action-status badge. Explorer links appear only for real
historical or current testnet evidence.

### Scene C — Compare three policies

The user chooses a preregistered case: confirmed event, unresolved rumor, false rumor, or neutral control. The
walkthrough then:

1. shows and locks the shared input checksum;
2. optionally asks the user to predict the safest policy;
3. runs static fee;
4. runs volatility-only dynamic fee;
5. runs event-aware Tinjau;
6. reveals comparable metrics incrementally;
7. explains missing or pending benchmark outputs.

The UI preserves `null`, unavailable, and pending values. It never converts them to zero and never names Tinjau
the winner unless the benchmark evidence supports that conclusion.

## Developers page

`/developers` answers “How do I use Tinjau?” through four role-based paths:

1. **Pool operator** — bounded fee policy and pool/hook integration boundary.
2. **Protocol developer** — versioned risk record, reason codes, expiry, and action status.
3. **Evidence integrator** — official, news, market, or X-shaped evidence adapters.
4. **Observer/dashboard builder** — read-only provenance and risk-state consumption.

Each path contains:

- architecture summary;
- prerequisites;
- step-by-step quick start;
- request/response or contract-call example when implemented;
- expected output;
- error and degraded behavior;
- maturity label for each step;
- link to supporting proof.

Pending or roadmap integrations show their intended interface and missing dependency, not executable-looking
instructions. Historical names such as `AfterhoursFeeHook` are always identified as historical contract
identity rather than current public branding.

## Proof of Work page

`/proof` is the authoritative evidence center. It contains:

### Testnet deployment ledger

- X Layer testnet network identity;
- contract address;
- deployment transaction and explorer link;
- deployed-at block/time when available;
- last verification timestamp;
- relationship between Tinjau branding and historical contract names.

### Service and API evidence

- verifiable endpoints and current reachability;
- example response captured with timestamp and provenance;
- live, degraded, stale, or unavailable status;
- last verified evidence when a service is currently unreachable.

### Capability matrix

All major capabilities use the same central maturity manifest as landing, demo, and Developers. The page separates
IMPLEMENTED, HISTORICAL, PENDING, and ROADMAP from LIVE, OBSERVED, REPLAY, and SIMULATED.

### Build and test evidence

- commit identifier;
- production build result;
- TypeScript result;
- browser/accessibility test result;
- evidence or benchmark fixture provenance;
- direct repository evidence where public links exist.

Claims must be derived from verified configuration or a generated proof manifest. A missing address, URL, hash,
or timestamp produces an honest unavailable state rather than invented evidence.

## Data and component architecture

### Mission definition

Mission content lives in a typed central manifest. Each stage declares:

- stage identifier and coach copy;
- prerequisites;
- choices;
- choice classification and reason code;
- events and outputs to reveal;
- state transition;
- important-event modal;
- completion condition.

The UI renders the manifest. Scenario-specific decision logic does not live inside presentation components.

### Session reducer

A deterministic reducer owns:

- `selectedMission`;
- `currentStage`;
- `completedStages`;
- `decisions`;
- `revealedOutputs`;
- `importantEvents`;
- `dataMode`;
- `missionStatus`.

State is schema-versioned before being stored in `sessionStorage`. Invalid or outdated stored state fails closed
to Mission Select rather than partially hydrating an impossible stage.

### Presentation components

- `MissionSelect`
- `GuidedMissionShell`
- `CoachConsole`
- `ProgressRail`
- `DecisionPanel`
- `ProgressiveOutput`
- `StateExplanationModal`
- `MissionRecap`

Developers and Proof use separate route components but consume the same capability and proof manifests.

## Loading, failure, and fallback behavior

- Loading shows the current objective and names the dependency being checked.
- Retrieval errors preserve prior events and offer Retry.
- If an approved fixture exists, the user may explicitly select `Continue with replay`; the data mode then changes
  to REPLAY before any fallback output appears.
- Actions depending on failed data remain locked or rejected.
- Stale proof shows the last verified timestamp and does not claim current liveness.
- Unknown mission state resets safely to Mission Select with an explanation.
- Modal focus is trapped, returns to the triggering decision, and supports keyboard dismissal when dismissal is
  safe.

## Motion and responsive behavior

Motion communicates append, unlock, state transition, and modal entrance. It does not decorate idle surfaces.
New output may fade/translate in over a short duration; existing evidence remains stationary. The experience
honors `prefers-reduced-motion` and never relies on animation alone to explain state.

Desktop keeps Coach and Output side by side. Tablet may use a narrower coach column. Mobile stacks Coach,
decisions, and Output in that semantic order. Important current state and action availability remain visible
without depending on hover.

## Accessibility

- Mission and decision choices are native buttons or links with visible focus.
- Locked stages explain their prerequisite to assistive technology.
- Progress uses text as well as position and color.
- New output is announced through a restrained live region; the entire event history is not re-announced.
- Modals use correct dialog semantics and labelled titles/descriptions.
- Risk, maturity, and data mode never rely on color alone.
- All flows remain operable with keyboard and at 200% zoom.

## Verification plan

Automated coverage must prove:

- each mission begins empty and can be completed through accepted choices;
- unsafe choices remain selectable and are consistently rejected;
- future stages cannot be opened through controls or deep links;
- safe choices reveal only their declared outputs;
- state modals appear only for specified important events;
- refresh restores valid session progress;
- restart and scenario change reset the correct state;
- unavailable live data cannot become simulated success implicitly;
- replay mode is visible before replay data appears;
- current implementation and lifecycle replay cannot be visually conflated;
- false-rumor and neutral comparison values preserve null/pending semantics;
- Developers does not offer executable steps for pending integrations;
- Proof never renders unverified explorer or API links;
- desktop, mobile, keyboard, accessibility, and reduced-motion behavior pass.

## Acceptance criteria

The design is complete when a first-time judge can:

1. choose a scenario without seeing its answer;
2. understand every stage through the permanent Coach Console;
3. attempt an unsafe action and see Tinjau reject it with evidence and a reason;
4. watch data and system output accumulate causally;
5. distinguish current implementation from replay and pending work;
6. finish a mission and summarize why state or action changed;
7. learn how to integrate Tinjau through `/developers`;
8. verify testnet and implementation evidence through `/proof`.
