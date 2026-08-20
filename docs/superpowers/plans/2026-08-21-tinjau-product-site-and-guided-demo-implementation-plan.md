# Tinjau Product Site and Guided Demo — Implementation Plan

Status: ready to execute  
Date: 2026-08-21  
Approved design: `docs/superpowers/specs/2026-08-21-tinjau-product-site-and-guided-demo-design.md`  
Scope: frontend-owned T0.5, T6.1, T6.2; browser foundations for T6.5 and frontend T7.1

## Guardrails

- Preserve every unrelated working-tree change, especially `apps/server/**` and tracker updates owned by the
  non-frontend lane.
- Edit project files with `apply_patch` and prefix every shell command with `rtk`.
- Do not manufacture live X/news intake, market confirmation, transaction hashes, deployed addresses,
  benchmark results, alerts, or economic winners.
- Keep capability maturity and data mode as separate fields.
- Keep the current risk/evidence validators and fixture safety assertions.
- Do not install Tailark Quartz or copy gated source.
- Use Motion only for causal state transitions and respect reduced motion.

## Step 1 — Capture baseline and formalize the approved brand

Files:

- create `brand.md`;
- update `apps/web/src/app/layout.tsx`;
- update `apps/web/tailwind.config.ts`;
- update `apps/web/src/app/globals.css`.

Work:

1. Run the existing web typecheck, production build, and Playwright suite and record the baseline.
2. Write the approved brand source of truth: industrial/utilitarian with editorial pacing; OKX black/white,
   warm paper, electric lime, semantic risk colors; no gradients; technical/serious voice.
3. Replace Space Grotesk with `Inter Tight` for display while preserving `Inter` and `JetBrains Mono`.
4. Define route-appropriate paper and carbon surface tokens, semantic status tokens, focus, borders, and a
   restrained radius scale.
5. Keep raw palette values in token definitions only; component files consume semantic classes.
6. Verify the main foreground/background, muted text, primary button, and focus-ring contrast pairs.

Verification:

```bash
rtk npm run typecheck --prefix apps/web
rtk npm run build --prefix apps/web
```

## Step 2 — Introduce manifest-driven product truth

Files:

- create `apps/web/src/lib/product/capabilities.ts`;
- create `apps/web/src/lib/product/system.ts`;
- create `apps/web/src/components/capability-badge.tsx`;
- update `apps/web/src/components/data-mode-label.tsx` if needed for light and dark surfaces;
- add focused unit/browser assertions in `apps/web/e2e/product-truth.spec.ts`.

Work:

1. Define `CapabilityMaturity = IMPLEMENTED | HISTORICAL | PENDING | ROADMAP`.
2. Store the complete product path in one manifest: SEC/news/X intake, retrieval, Evidence Graph, deterministic
   policy, OKX adapter, X Layer telemetry, confirmation engine, registry, fee hook, X publisher, decay, and
   comparison proof.
3. Give every capability a factual summary, maturity, optional data mode, evidence label, limitation, and safe
   link target.
4. Mark T2.4/T3.1/T3.2 implemented while keeping T3.3/T3.4/T4/T5 and live X listening pending.
5. Keep historical `AfterhoursFeeHook` naming intact and adjacent to a historical label.
6. Add tests proving that live X listening is not represented as implemented/live and that comparison output
   remains pending.

Verification:

```bash
rtk npm run typecheck --prefix apps/web
rtk npm run test:e2e --prefix apps/web -- product-truth.spec.ts
```

## Step 3 — Rebuild the shared shell and public branding

Files:

- update `apps/web/src/components/site-header.tsx`;
- update `apps/web/src/components/site-footer.tsx`;
- update `apps/web/src/components/direction-contract.tsx`;
- update `apps/web/src/app/layout.tsx` metadata;
- update `apps/web/src/app/icon.svg` only if the current mark does not remain coherent;
- update legacy redirects under `apps/web/src/app/holdings`, `calendar`, and `scoreboard`.

Work:

1. Replace console navigation with `Product`, `System`, `Why X Layer`, and `Start Demo`.
2. Give the landing shell a paper treatment and the demo shell a carbon treatment without duplicating brand
   identity.
3. Keep the Tinjau wordmark compact and remove old public AFTERHOURS wording while preserving historical
   identifiers in evidence copy.
4. Update metadata to position Tinjau as a bounded LP risk autopilot rather than a generic AI product.
5. Update the Impeccable direction contract to reflect the approved landing + guided-demo architecture.
6. Keep navigation keyboard-accessible and make mobile navigation usable without hiding the primary demo CTA.

Verification:

```bash
rtk rg -n -i "AFTERHOURS" apps/web
rtk npm run typecheck --prefix apps/web
```

Every remaining match must be documented historical evidence, never public brand copy.

## Step 4 — Build the proof-first landing page

Files:

- replace `apps/web/src/app/page.tsx`;
- create `apps/web/src/app/_components/landing/landing-hero.tsx`;
- create `apps/web/src/app/_components/landing/system-schematic.tsx`;
- create `apps/web/src/app/_components/landing/blind-window.tsx`;
- create `apps/web/src/app/_components/landing/defense-comparison.tsx`;
- create `apps/web/src/app/_components/landing/system-story.tsx`;
- create `apps/web/src/app/_components/landing/safety-boundary.tsx`;
- create `apps/web/src/app/_components/landing/why-x-layer.tsx`;
- create `apps/web/src/app/_components/landing/proof-ledger.tsx`;
- create `apps/web/src/app/_components/landing/landing-cta.tsx`;
- update `apps/web/src/app/loading.tsx` and `error.tsx` for the landing route.

Work:

1. Implement the approved asymmetric first viewport and exact product positioning.
2. Make the system schematic the dominant visual artifact, using thin rules, stage indices, maturity badges,
   and separate data-mode labels.
3. Explain the blind window as a causal timeline without invented impact numbers.
4. Use a flat comparison table for architectural alternatives rather than a three-card feature grid.
5. Trace one event through every system surface and include X Listener and X Publisher as distinct nodes.
6. Place the AI/policy/contract safety boundary in the primary reading path.
7. Explain X Layer through need-to-capability relationships.
8. Render the proof ledger directly from the capability manifest.
9. Finish with the single dominant CTA to `/demo`.
10. Keep copy specific, factual, English-only, and free of generic AI/crypto marketing language.

Motion storyboard:

```text
   0ms  headline and primary CTA are immediately available
 120ms  system frame resolves without translating the page
 260ms  one active path draws source → evidence → policy
 420ms  downstream constraints become visible
```

Reduced motion renders the complete schematic immediately. No scroll entrance animations are added to the
reading sections.

Verification:

```bash
rtk npm run typecheck --prefix apps/web
rtk npm run test:e2e --prefix apps/web -- landing.spec.ts
```

## Step 5 — Create the guided `/demo` shell

Files:

- create `apps/web/src/app/demo/page.tsx`;
- create `apps/web/src/app/demo/loading.tsx`;
- create `apps/web/src/app/demo/error.tsx`;
- create `apps/web/src/app/demo/_components/demo-experience.tsx`;
- create `apps/web/src/app/demo/_components/demo-stage-rail.tsx`;
- create `apps/web/src/app/demo/_components/demo-scene-nav.tsx`;
- create `apps/web/src/app/demo/_components/event-tape.tsx`;
- create `apps/web/src/app/demo/_components/system-overview.tsx`;
- create `apps/web/src/lib/demo/walkthrough.ts`;
- update `apps/web/src/lib/ui/motion.ts`.

Work:

1. Define the nine stages and their explicit source, transformation, output, capability maturity, and data
   mode.
2. Use URL parameters for `scene` and `stage` so every walkthrough point is shareable and reload-safe.
3. Keep the scene controls and first action immediately interactive; only the active data path animates.
4. Provide Guided and Inspect modes without hiding limitations.
5. Display an event tape with source time, playback time, state transition, and action result.
6. Announce stage/state changes through a restrained live region.
7. On mobile, turn the stage rail into a sticky horizontal control and the main panels into trace/decision/proof
   sections in reading order.

Motion storyboard:

```text
   0ms  shell, scene controls, and current state are available
 100ms  selected source node becomes active
 220ms  relation path resolves
 340ms  deterministic decision appears
 480ms  authorized or blocked action resolves
```

Use named timing constants and `useReducedMotion`. Do not animate the entire page or use perpetual pulses.

Verification:

```bash
rtk npm run typecheck --prefix apps/web
rtk npm run test:e2e --prefix apps/web -- demo-navigation.spec.ts
```

## Step 6 — Integrate Scene A and Scene B across all product surfaces

Files:

- move or reuse the existing risk components under `apps/web/src/app/_components`;
- update `risk-state-core.tsx`;
- update `evidence-circuit.tsx`;
- update `market-confirmation.tsx`;
- update `protection-envelope.tsx`;
- update `action-lifecycle.tsx`;
- update `risk-command-bar.tsx`;
- update `trust-boundary.tsx`;
- update `apps/web/src/lib/risk/demo-fixtures.ts` only for additional display metadata, never invented outcomes;
- add `apps/web/src/app/demo/_components/source-intake.tsx`;
- add `apps/web/src/app/demo/_components/processing-trace.tsx`;
- add `apps/web/src/app/demo/_components/proof-panel.tsx`.

Work:

1. Scene A traces the simulated X-shaped rumor through retrieval, evidence relationships, `WATCH`, blocked
   aggressive fee, unavailable market data, and suppressed publication.
2. Scene B traces official SEC evidence and shows exactly why it remains `WATCH` in the current handoff: the
   final confirmation and integrated action records are absent.
3. Display the target `PROTECT → bounded fee → expiry → decay → NORMAL` path as a clearly labeled pending or
   historical capability sequence, not as a completed current transaction.
4. Show `usable origin count`, source precision, and non-promotable evidence.
5. Keep `UNAVAILABLE` distinct from `NOT_CONFIRMED` and `PROTECT` distinct from `APPLIED`.
6. Make proof links real links and unavailable proof an explanatory non-link.
7. Add publisher state (`SUPPRESSED`, `PENDING`, `PUBLISHED`) only where the backing evidence supports it.

Verification:

```bash
rtk npm run test:e2e --prefix apps/web -- risk-state.spec.ts demo-scenes.spec.ts
```

## Step 7 — Fold the three-policy comparison into Scene C

Files:

- replace `apps/web/src/app/compare/page.tsx` with an intentional redirect;
- reuse/update comparison components under `apps/web/src/app/compare/_components` or move them under demo;
- update `apps/web/src/lib/comparison/preregistration.ts` only for display metadata/checksum;
- add `apps/web/src/app/demo/_components/comparison-scene.tsx`;
- update comparison error/loading coverage under `/demo`.

Work:

1. Render static, volatility-only, and Tinjau side-by-side under `/demo?scene=comparison`.
2. Preserve all four preregistered benchmark scenarios as sub-scenario controls.
3. Add a matched-input identity checksum and keep it visible while comparing.
4. Preserve `No economic row` for the zero-swap false-rumor scene.
5. Display `Not measured` or `Pending handoff` rather than zero for unavailable metrics.
6. Keep observed and counterfactual basis labels structural, not decorative.
7. Keep the claim gate closed and remove every visual convention that could imply a predetermined winner.

Verification:

```bash
rtk npm run test:e2e --prefix apps/web -- comparison.spec.ts
```

## Step 8 — Complete state, responsive, and accessibility coverage

Files:

- update route loading/error components;
- create shared state primitives only when at least two routes need them;
- update `apps/web/e2e/accessibility.spec.ts`;
- add responsive and keyboard assertions to demo and landing tests.

Work:

1. Implement loading skeletons that match the final geometry.
2. Add explicit empty, stale, degraded, and action-failure examples or fixture-controlled states.
3. Verify keyboard order, Escape behavior for proof panels, focus return, visible focus rings, and 44px mobile
   targets.
4. Give the system schematic and Evidence Graph textual equivalents.
5. Verify 375px, 768px, and 1280px layouts.
6. Ensure color and motion are never required to understand state.

Verification:

```bash
rtk npm run test:a11y --prefix apps/web
rtk npm run test:e2e --prefix apps/web
```

## Step 9 — Run anti-AI, claim, and code scans

Scans:

```bash
rtk rg -n "transition-all|transition: all" apps/web/src
rtk rg -n "p-\\[|m-\\[|gap-\\[" apps/web/src
rtk rg -n -i "revolutionary|game-changing|best-in-class|first AI|loss avoided|production-ready" apps/web/src
rtk rg -n "from-violet|to-purple|backdrop-blur|shadow-xl|rounded-3xl" apps/web/src
rtk rg -n -i "AFTERHOURS" apps/web/src
```

Work:

1. Review each match and remove accidental template/AI-slop signals.
2. Confirm all remaining arbitrary typography/geometry values are deliberate and tokenized where practical.
3. Compare code and screenshots against the capability manifest and tracker.
4. Run the convergence test on landing, Scene A, Scene B, Scene C, and mobile.
5. Confirm 21st.dev/Tailark influence is limited to anatomy and editorial rhythm, with no recognizable copied
   template.

## Step 10 — Final validation, visual review, and documentation

Files:

- update `DESIGN.md` only after the implemented UI is visually reviewed, per Impeccable;
- update or add Playwright screenshot coverage where useful;
- do not modify tracker ownership fields unless explicitly requested.

Commands:

```bash
rtk npm run typecheck --prefix apps/web
rtk npm run build --prefix apps/web
rtk npm run test:e2e --prefix apps/web
rtk git diff --check
```

Visual review matrix:

- landing hero and complete system path;
- blind-window mechanism;
- proof ledger;
- Scene A `AGGRESSIVE FEE BLOCKED`;
- Scene B official evidence plus unavailable final confirmation;
- target protection envelope and historical/pending labels;
- Scene C matched-input comparison;
- loading, empty, error, stale, and degraded states;
- 375px, 768px, and 1280px;
- reduced motion.

Final acceptance:

- a judge understands the product and its differentiation in the first 30 seconds;
- all Tinjau surfaces, including X intake and X publishing, are visible in the walkthrough;
- unfinished integrations remain visible but unmistakably pending/replayed/historical;
- the interface does not look like a generic AI-generated crypto template;
- build, typecheck, browser, and accessibility gates pass;
- unrelated working-tree changes remain untouched.
