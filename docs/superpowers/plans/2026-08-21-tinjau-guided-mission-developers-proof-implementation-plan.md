# Tinjau Guided Mission, Developers, and Proof Implementation Plan

**Date:** 2026-08-21  
**Design source:**
`docs/superpowers/specs/2026-08-21-tinjau-guided-mission-developers-proof-design.md`  
**Frontend scope:** `apps/web/**`, `DESIGN.md`, and frontend-facing evidence manifests only.

## Outcome

Replace the pre-filled `/demo` dashboard with a deterministic guided mission experience, then add:

- `/developers` for role-based product integration guidance;
- `/proof` for testnet, service, capability, and build evidence;
- shared truth manifests so landing, demo, Developers, and Proof cannot drift.

The implementation must preserve the current visual direction while making the demo feel like an authored
tutorial rather than an inspection dashboard.

## Truth constraints before implementation

1. The historical prototype is deployed on X Layer Testnet and may be shown with verified addresses.
2. `EventStateRegistry` and `AfterhoursFeeHook` are historical artifacts, not the final Tinjau risk registry and
   fee-hook integration.
3. The testnet pool and mock assets are builder-controlled.
4. The final Tinjau contracts are not deployed until tracker T7.2 says otherwise.
5. X Listener is simulated/pending; X Publisher is historical/replay and not integrated with the final pipeline.
6. OKX reference and X Layer telemetry adapters are implemented; final market confirmation remains pending.
7. Current Scene B remains WATCH when final confirmation is unavailable.
8. The PROTECT lifecycle is shown only after an explicit `Continue with replay` decision and remains labeled
   REPLAY throughout.
9. Comparison results remain pending/null until the T5 handoff exists. No winner is declared.
10. The stale public scoreboard API is not linked as proof until backend redeployment is verified.

## Baseline gate

Before changing source:

```bash
npm run typecheck --prefix apps/web
npm run build --prefix apps/web
npm run test:e2e --prefix apps/web
```

Record the pass count in the working notes. Run build and typecheck sequentially because both use `.next`.

**Known baseline test issue:** on 2026-08-21, the isolated mobile test `primary landing CTA enters the guided
walkthrough` reproduced a 5-second cold-navigation timeout even though the earlier full suite passed. Treat it as
a known test reliability issue, not as an acceptable final state. Task 10 must update the CTA target for Mission
Select and wait for navigation deterministically; the final full suite must be green.

## Task 1 — Centralize deployment and proof truth

**Files**

- Create `apps/web/src/lib/product/deployments.ts`
- Create `apps/web/src/lib/product/proof.ts`
- Modify `apps/web/src/lib/product/capabilities.ts`
- Modify `apps/web/src/app/_components/landing/proof-ledger.tsx`
- Create `apps/web/src/app/proof/page.tsx` as the initial manifest-backed evidence route
- Create `apps/web/e2e/proof-truth.spec.ts`

**Test first**

Add failing assertions that require:

- historical testnet deployments to be explicitly labeled `HISTORICAL` and `builder-controlled` where relevant;
- final Tinjau registry/hook deployment to render `PENDING`, without an invented address;
- explorer links to be generated only from non-null verified addresses or transaction hashes;
- X Listener, final confirmation, and benchmark maturity to remain pending;
- historical contract names to retain the `AfterhoursFeeHook` explanation.

**Implementation**

Define typed evidence records for:

- network identity and explorer base URL;
- historical deployment component, address, proof type, maturity, ownership, and verification time;
- final component status with nullable deployment evidence;
- service/API evidence with last-verified and degraded/stale semantics;
- build evidence with nullable commit/test result fields.

Seed only repository-verified historical X Layer Testnet inventory:

- `EventStateRegistry` `0x713f45f44e74616898FB366E11881196221933aA`;
- `AfterhoursFeeHook` `0xbCb4B7310BA36eA01f2A435A5D64C9b7953d8080`;
- `PoolManager` `0x8F862A8b6f00C99b0610dc764228C661c4909ae1`;
- swap router `0x6F554A0bEE654Ead7C7eACDD300A72170a674C62`;
- mock token addresses from the verified baseline.

Do not add a final contract address. Use the existing X Layer explorer helper rather than repeating URL logic.
The initial `/proof` route and landing proof summary expose enough of the manifest for the truth assertions; Task
9 expands the route into the complete evidence center.

**Verify**

```bash
npm run typecheck --prefix apps/web
npm run test:e2e --prefix apps/web -- e2e/proof-truth.spec.ts
```

**Commit:** `feat(web): centralize Tinjau proof and deployment truth`

## Task 2 — Build the mission domain model and reducer

**Files**

- Create `apps/web/src/lib/demo/mission-types.ts`
- Create `apps/web/src/lib/demo/mission-reducer.ts`
- Create `apps/web/src/lib/demo/mission-storage.ts`
- Create `apps/web/src/lib/demo/missions/rumor.ts`
- Create `apps/web/src/lib/demo/missions/confirmed.ts`
- Create `apps/web/src/lib/demo/missions/comparison.ts`
- Create `apps/web/src/lib/demo/missions/index.ts`
- Replace or reduce `apps/web/src/lib/demo/walkthrough.ts`

**Implementation contract**

The pure reducer must make impossible transitions unrepresentable or return the previous state. Browser behavior
coverage is added before the UI work in Task 3, where the reducer becomes externally observable.

**Implementation**

Model authored missions as typed data. Each stage declares prerequisites, coach copy, accepted/rejected/unavailable
choices, output event ids, optional state transition, optional modal event, and completion condition.

Use a pure reducer with explicit events such as:

- `MISSION_SELECTED`
- `CHOICE_ACCEPTED`
- `CHOICE_REJECTED`
- `STAGE_REVISITED`
- `REPLAY_ACCEPTED`
- `MODAL_ACKNOWLEDGED`
- `MISSION_RESTARTED`
- `MISSION_EXITED`

Persist a schema-versioned serializable state in `sessionStorage`. Validate mission id, stage id, completed stage
order, and revealed event ids before hydration. Never store full evidence fixtures twice; store pointers into the
mission manifest.

**Verify**

```bash
npm run typecheck --prefix apps/web
```

**Commit:** `feat(web): add deterministic guided mission state`

## Task 3 — Replace the demo shell with Mission Select and Guided Console

**Files**

- Replace `apps/web/src/app/demo/_components/demo-experience.tsx`
- Delete `apps/web/src/app/demo/_components/demo-scene-nav.tsx`
- Delete `apps/web/src/app/demo/_components/system-overview.tsx`
- Delete `apps/web/src/app/_components/risk-command-bar.tsx`
- Create `apps/web/src/app/demo/_components/mission-select.tsx`
- Create `apps/web/src/app/demo/_components/guided-mission-shell.tsx`
- Create `apps/web/src/app/demo/_components/coach-console.tsx`
- Replace `apps/web/src/app/demo/_components/demo-stage-rail.tsx`
- Create `apps/web/src/app/demo/_components/decision-panel.tsx`
- Create `apps/web/src/app/demo/_components/progressive-output.tsx`
- Modify `apps/web/src/app/demo/page.tsx`
- Modify `apps/web/src/app/demo/loading.tsx`
- Modify `apps/web/src/app/demo/error.tsx`
- Modify `apps/web/e2e/demo-navigation.spec.ts`
- Create `apps/web/e2e/mission-state.spec.ts`

**Test first**

Add assertions for:

- three mission choices with objective and mode labels;
- permanent Coach Console fields at every stage;
- no output before a decision;
- stage progress text and locked-state descriptions;
- mobile document order: coach, decisions, output;
- keyboard operation of mission and decision controls.
- future stages cannot be opened by controls or query-string deep links;
- accepted/rejected decisions advance or stay in place correctly;
- refresh, invalid storage, and restart behavior match the reducer contract.

**Implementation**

Turn `DemoExperience` into a client-owned session shell. Remove the three components that currently expose the
selected scene and outcome before the user acts. Mission selection starts a clean mission and updates the
URL without making the URL authoritative over unlocked progress. Replace free navigation with a progress rail:
completed stages are revisitable, current stage is active, future stages are disabled with prerequisite text.

The Coach Console always renders:

- What happened
- Objective
- What Tinjau knows
- What remains unknown
- Choose the next action
- Why it matters

System Output uses an explicit empty state until the reducer exposes an output event. Retain flat industrial
styling; do not introduce game illustration, glow, glass, or gamified points.

**Verify**

```bash
npm run test:e2e --prefix apps/web -- e2e/demo-navigation.spec.ts e2e/mission-state.spec.ts
```

**Commit:** `feat(web): turn the demo into a guided console`

## Task 4 — Implement Scene A progressive rumor containment

**Files**

- Complete `apps/web/src/lib/demo/missions/rumor.ts`
- Modify `apps/web/src/app/demo/_components/source-intake.tsx`
- Modify `apps/web/src/app/demo/_components/processing-trace.tsx`
- Modify `apps/web/src/app/demo/_components/event-tape.tsx`
- Reuse/adapt `apps/web/src/app/_components/evidence-circuit.tsx`
- Reuse/adapt `apps/web/src/app/_components/risk-state-core.tsx`
- Modify `apps/web/e2e/demo-scenes.spec.ts`
- Modify `apps/web/e2e/risk-state.spec.ts`

**Test first**

Require the mission to demonstrate:

- the simulated X-shaped claim appears before news evidence;
- `Raise fee now` is selectable and rejected with a stable reason;
- repost/syndication cannot be accepted as independent confirmation;
- original-source retrieval reveals provenance before normalized meaning;
- evidence relations appear only in Relate;
- WATCH appears only after Decide;
- aggressive fee and factual X publication remain blocked;

**Implementation**

Reference the existing `rumor-watch` validated fixture. Stage output events expose only fields appropriate to the
current stage. Reuse existing evidence and risk components in a reveal-aware wrapper instead of copying their
data displays. Keep X Listener and X Publisher as separate capability rows and labels.

**Verify**

```bash
npm run test:e2e --prefix apps/web -- e2e/demo-scenes.spec.ts e2e/risk-state.spec.ts
```

**Commit:** `feat(web): guide the rumor containment mission`

## Task 5 — Implement Scene B current path and lifecycle replay

**Files**

- Complete `apps/web/src/lib/demo/missions/confirmed.ts`
- Modify `apps/web/src/app/_components/market-confirmation.tsx`
- Modify `apps/web/src/app/demo/_components/proof-panel.tsx`
- Modify `apps/web/src/app/demo/_components/action-surface.tsx`
- Create `apps/web/src/app/demo/_components/replay-consent.tsx`
- Create `apps/web/e2e/confirmed-mission.spec.ts`

**Test first**

Require:

- official evidence does not skip provenance or the market gate;
- `Enter PROTECT now` is selectable but rejected before confirmation;
- current mode remains WATCH when confirmation is unavailable;
- no current tx hash or final deployment address appears;
- lifecycle replay starts only after explicit user consent;
- data mode changes to REPLAY before PROTECT is displayed;
- replayed PROTECT, bounded fee, expiry, decay, and NORMAL remain labeled REPLAY;
- historical testnet hook evidence is separated from current action status.

**Implementation**

Use the existing `confirmed-event` fixture for the current branch. Add authored replay-only output events for the
pre-registered target lifecycle; do not mutate the validated current risk record. The replay surface may explain
the historical 500–20,000 fee envelope and deterministic decay, but its action status cannot be `APPLIED` unless
it points to a verified historical transaction and states that it is historical rather than the current mission.

**Verify**

```bash
npm run test:e2e --prefix apps/web -- e2e/confirmed-mission.spec.ts e2e/product-truth.spec.ts
```

**Commit:** `feat(web): separate confirmed mission truth from lifecycle replay`

## Task 6 — Convert Scene C into a progressive comparison mission

**Files**

- Complete `apps/web/src/lib/demo/missions/comparison.ts`
- Replace `apps/web/src/app/demo/_components/comparison-scene.tsx`
- Modify `apps/web/src/app/compare/_components/comparison-scenario-switcher.tsx`
- Modify `apps/web/src/app/compare/_components/input-identity-ribbon.tsx`
- Modify `apps/web/src/app/compare/_components/policy-column.tsx`
- Modify `apps/web/src/app/compare/_components/comparison-matrix.tsx`
- Modify `apps/web/src/app/compare/_components/result-claim-gate.tsx`
- Modify `apps/web/e2e/comparison.spec.ts`

**Test first**

Require:

- case choice occurs before policy results;
- shared input checksum is visible before a policy runs;
- policy columns reveal in static → volatility-only → Tinjau order;
- prediction choice does not affect benchmark results;
- false-rumor and neutral cases preserve null/pending values;
- claim gate remains closed and no winner copy appears.

**Implementation**

Wrap existing preregistration components in mission output events. Do not change the preregistered inputs or
checksums. Treat “run policy” as a tutorial reveal of available evidence, not a fabricated computation when the
T5 payload is absent.

**Verify**

```bash
npm run test:e2e --prefix apps/web -- e2e/comparison.spec.ts
```

**Commit:** `feat(web): guide the three-policy comparison mission`

## Task 7 — Add important-event modals and Mission Recap

**Files**

- Create `apps/web/src/app/demo/_components/state-explanation-modal.tsx`
- Create `apps/web/src/app/demo/_components/mission-recap.tsx`
- Modify `apps/web/src/app/demo/_components/guided-mission-shell.tsx`
- Modify `apps/web/src/lib/ui/motion.ts`
- Create `apps/web/e2e/mission-modal-recap.spec.ts`

**Test first**

Require:

- routine stage completion does not open a modal;
- rejection, WATCH/PROTECT/NORMAL transitions, confirmation unavailability, and replay decay do;
- modal copy includes cause, evidence, guardrail, allowed/prohibited actions, data mode, and maturity;
- focus enters the dialog and returns to the triggering choice;
- Escape behavior matches whether acknowledgement is required;
- reduced motion eliminates modal/reveal translation;
- Recap lists decisions and links to Proof.

**Implementation**

Use a single accessible dialog implementation and one queued important event at a time. Avoid nested dialogs.
Use Motion only for short opacity/position transitions with reduced-motion support. Recap is reducer-derived and
does not reconstruct decisions from rendered DOM.

**Verify**

```bash
npm run test:e2e --prefix apps/web -- e2e/mission-modal-recap.spec.ts e2e/accessibility.spec.ts
```

**Commit:** `feat(web): explain critical mission states and recap decisions`

## Task 8 — Build the Developers route

**Files**

- Create `apps/web/src/lib/product/integrations.ts`
- Create `apps/web/src/app/developers/page.tsx`
- Create `apps/web/src/app/developers/loading.tsx`
- Create `apps/web/src/app/developers/error.tsx`
- Create `apps/web/src/app/developers/_components/integration-paths.tsx`
- Create `apps/web/src/app/developers/_components/quick-start.tsx`
- Create `apps/web/src/app/developers/_components/integration-boundary.tsx`
- Create `apps/web/e2e/developers.spec.ts`

**Test first**

Require four paths: Pool operator, Protocol developer, Evidence integrator, and Observer/dashboard builder. Assert
that every step has capability maturity and that PENDING/ROADMAP items do not display copyable executable
commands. Historical hook instructions must explain the immutable historical name.

**Implementation**

Render role-based navigation from a typed integration manifest. Implemented paths may show code/request examples
derived from current types and read-only helpers. Pending paths show intended interface, missing dependency, and
proof link instead of a false quick start. Include degraded behavior and expected response/state semantics.

**Verify**

```bash
npm run test:e2e --prefix apps/web -- e2e/developers.spec.ts e2e/accessibility.spec.ts
```

**Commit:** `feat(web): add honest Tinjau integration guidance`

## Task 9 — Build the Proof of Work route

**Files**

- Expand `apps/web/src/app/proof/page.tsx`
- Create `apps/web/src/app/proof/loading.tsx`
- Create `apps/web/src/app/proof/error.tsx`
- Create `apps/web/src/app/proof/_components/deployment-ledger.tsx`
- Create `apps/web/src/app/proof/_components/service-evidence.tsx`
- Create `apps/web/src/app/proof/_components/capability-matrix.tsx`
- Create `apps/web/src/app/proof/_components/build-evidence.tsx`
- Create `apps/web/src/app/proof/_components/evidence-link.tsx`
- Expand `apps/web/e2e/proof-truth.spec.ts`

**Test first**

Require:

- page title `Proof of Work` and concise explanatory subtitle;
- historical testnet deployment ledger with X Layer explorer links;
- builder-controlled labels for pool and mocks;
- explicit “final Tinjau deployment pending” state;
- service evidence with last-verified/stale/degraded semantics;
- capability and data-mode axes shown separately;
- no stale public scoreboard link;
- missing evidence cannot produce a clickable link;
- build evidence names its commit or renders unavailable rather than a generic success claim.

**Implementation**

Use the proof and deployment manifests from Task 1. Do not add runtime reachability claims in this frontend pass;
show the repository-verified timestamp and explorer evidence until a dedicated backend proof endpoint exists.
Vercel commit evidence comes from `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` and remains unavailable outside an
identified build. Use `ExternalEvidenceLink` for all outbound evidence.

**Verify**

```bash
npm run test:e2e --prefix apps/web -- e2e/proof-truth.spec.ts e2e/accessibility.spec.ts
```

**Commit:** `feat(web): add Tinjau Proof of Work evidence center`

## Task 10 — Connect navigation, landing, and cross-route claims

**Files**

- Modify `apps/web/src/components/site-header.tsx`
- Modify `apps/web/src/components/site-footer.tsx`
- Modify `apps/web/src/app/_components/landing/proof-ledger.tsx`
- Modify `apps/web/src/app/_components/landing/landing-cta.tsx`
- Modify `apps/web/src/lib/product/system.ts`
- Modify `apps/web/e2e/landing.spec.ts`
- Modify `apps/web/e2e/product-truth.spec.ts`

**Test first**

Require navigation labels for Product, Developers, Proof, and Start Demo. Assert landing proof links to `/proof`,
Mission Recap links to `/proof`, and no route claims final deployment or live X listening.

**Implementation**

Add short public explanations of:

- historical X Layer testnet prototype proof;
- final integration status;
- Developers usage path;
- guided mission CTA.

Keep detailed evidence centralized on `/proof`; landing copy should summarize and link rather than duplicate
addresses or test counts.

**Verify**

```bash
npm run test:e2e --prefix apps/web -- e2e/landing.spec.ts e2e/product-truth.spec.ts
```

**Commit:** `feat(web): connect product, developer, and proof journeys`

## Task 11 — Final quality gate and design documentation

**Files**

- Modify `DESIGN.md`
- Modify `brand.md` only if new semantic treatment requires documentation
- Modify `apps/web/src/app/globals.css` only for shared mission/proof states
- Update affected `apps/web/e2e/*.spec.ts`

**Review**

- Inspect `/`, Mission Select, each mission at an early/middle/recap stage, `/developers`, and `/proof` at desktop
  and mobile sizes.
- Verify empty, loading, rejected, unavailable, stale, degraded, replay-consent, error, and completion states.
- Confirm the Guided Console does not become a nested-card dashboard.
- Confirm there is no gradient, glass, glow, generic bento layout, perpetual motion, or game-like points/badges.
- Confirm focus order and mobile reading order match the design spec.
- Re-run copy scans for prohibited claims and stale AFTERHOURS branding; retain only explained historical names.

**Full verification**

```bash
npm run test:e2e --prefix apps/web
npm run build --prefix apps/web
npm run typecheck --prefix apps/web
git diff --check -- apps/web DESIGN.md brand.md
```

Build must finish before the final typecheck to avoid `.next/types` races.

**Commit:** `test(web): harden guided missions and proof experience`

## Delivery checklist

- [ ] `/demo` starts with Mission Select and no answer leakage.
- [ ] Coach Console remains visible and specific at every stage.
- [ ] Unsafe choices are selectable, rejected, and explained.
- [ ] Data appears only after the corresponding accepted action.
- [ ] Important-event modal frequency matches the approved design.
- [ ] Session refresh, restart, and scenario switching behave deterministically.
- [ ] Scene B clearly separates current WATCH from replayed PROTECT lifecycle.
- [ ] Scene C preserves pending/null benchmark truth.
- [ ] `/developers` never offers fake executable integrations.
- [ ] `/proof` proves historical testnet work without claiming final deployment.
- [ ] All routes pass desktop, mobile, accessibility, reduced-motion, build, and type checks.
