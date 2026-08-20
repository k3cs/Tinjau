# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing monorepo application: Next.js App Router, React, TypeScript, Tailwind CSS, and `viem`, deployed to Vercel. The frontend lives in `apps/web/**`. Backend, AI/data, contracts, and frontend-handoff artifacts are owned by the non-frontend lane described in the current task tracker.

## Users

Primary users are LPs and operators of tokenized-equity liquidity pools on X Layer. They need to understand whether a discontinuity is credible, whether temporary protection is allowed, what the policy can and cannot do, and when the pool will recover to its baseline configuration.

The immediate evaluation audience is hackathon judges. From a clean browser, a judge must be able to explain within one screen why Tinjau moved to `NORMAL`, `WATCH`, or `PROTECT`; which evidence and market observations were involved; what AI is forbidden to authorize; and whether a displayed result is live, observed, replayed, or simulated.

Future consumers may include wallets, market makers, agents, and other X Layer applications that read the reusable risk record. These are not current adoption claims.

## Product Purpose

Tinjau is a corporate-event-aware market discontinuity guard for tokenized-stock liquidity on X Layer. It turns source-grounded evidence into a safe risk state, independently checks the market consequence through OKX/X Layer data, permits only bounded and temporary pool protection, recovers deterministically, and measures the intervention against simpler policies.

The product exists because tokenized US equities can trade continuously while corporate disclosures, reference-market availability, NAV updates, and on-chain liquidity do not move in sync. A pure alert can arrive too late for an LP, while an unrestricted AI controller creates a second risk. Tinjau separates flexible evidence understanding from deterministic authorization.

Success for the MVP is a reproducible three-scene proof:

1. a rumor enters the Evidence Graph, reaches `WATCH`, and cannot authorize an aggressive fee;
2. a qualifying event with fresh market confirmation reaches `PROTECT`, applies a bounded fee, expires or decays, and returns to `NORMAL`;
3. the same replay input is compared honestly under static, volatility-only, and Tinjau policies.

## Positioning

Tinjau combines five observable mechanisms that neighboring products cannot copy by changing marketing copy alone:

1. source-grounded causal evidence rather than volatility alone;
2. rumor containment that caps rumor-only input at `WATCH`;
3. independent corroboration plus fresh OKX/X Layer market confirmation for non-official promotion;
4. tokenized-equity-aware mapping, market context, pool flow, basis, and exit depth;
5. measured three-policy outcomes over identical inputs.

The safe public claim is narrow: no complete public product with the exact reviewed combination of source-grounded tokenized-equity evidence, rumor containment, OKX/X Layer confirmation, bounded LP action, deterministic recovery, and measured three-policy outcome was found. Tinjau must not claim to be the first AI dynamic-fee hook, first corporate-action oracle, first on-chain risk registry, or first self-protecting pool.

## Operating Context

The core operating loop is:

```text
source-linked evidence
-> AI normalization, entity resolution, clustering, and contradiction detection
-> deterministic NORMAL / WATCH / PROTECT decision
-> independent OKX/X Layer market confirmation
-> bounded X Layer fee action
-> expiry, cooldown, and deterministic decay
-> observed and counterfactual outcome record
```

There are two trust domains. AI may parse ambiguous language, resolve entities, group duplicates, detect contradictions, explain confidence changes, and propose structured evidence. Deterministic code or contracts validate assets, state-transition rules, signatures, freshness, expiry, fee ceilings, duration, cooldown, and recovery. AI never receives unrestricted execution authority.

The Hackathon MVP deliberately uses immutable source-linked replay fixtures for financial news and simulated social rumor input. This proves normalization and safety behavior; it does not prove live news discovery, live social monitoring, or real-time source coverage.

The frontend depends on a versioned handoff under `docs/buildx-orion-2026/outputs/05-build/frontend-handoff/`. A draft `risk-record.schema.json` is present in the working tree, but the required handoff is not complete and T1.1 is not yet verified complete in the tracker. Until the remaining schemas and fixtures arrive, frontend design may use only clearly labeled structural placeholders derived from the tracker, never inferred backend claims.

## Capabilities and Constraints

- Final risk states are `NORMAL`, `WATCH`, and `PROTECT`. Historical severity labels such as `ELEVATED` or `GRAVE` are not synonyms and must not appear as the final product state.
- Evidence source classes are `OFFICIAL`, `NEWS`, and `RUMOR`.
- Data modes are `LIVE`, `OBSERVED`, `REPLAY`, and `SIMULATED`; the mode must remain visible wherever it changes how a result can be interpreted.
- Evidence relationships include origin, support, contradiction, and duplicate/syndication. Duplicated reporting from one origin counts as one source, not independent corroboration.
- Rumor-only evidence and a single news source cannot authorize `PROTECT`.
- Non-official `PROTECT` requires at least two genuinely independent sources plus fresh market confirmation.
- Stale, missing, unavailable, or conflicting market data cannot create a new `PROTECT`.
- A missing market update after protection begins does not silently cancel the existing bounded policy; its original expiry and decay continue.
- `WATCH` expires when not refreshed. `PROTECT` has a maximum duration, cooldown, and deterministic return to `NORMAL`.
- Policy thresholds and event selection are versioned and frozen before outcomes are inspected; an LLM does not choose them at runtime.
- Action status is one of `NONE`, `PENDING`, `APPLIED`, `FAILED`, `EXPIRED`, or `DECAYED`.
- The comparison uses identical trades, timestamps, liquidity, costs, and replay windows for static, volatility-only, and Tinjau policies. Comparable dynamic policies use the same ceiling and duration envelope.
- Required comparison metrics include fee revenue, LP markout, adverse selection, action latency, maximum fee, protection duration, decay time, false-positive cost, and relevant false-negative labels where measurable.
- Neutral and false-rumor cases are required. Thin or empty windows are reported as unavailable or indeterminate, not silently scored as success.
- `canClaimLossAvoided` is false unless the backend evidence and counterfactual method explicitly permit the claim.
- Repricing identical observed trades under changed fees has opposing unmeasured biases. The net sign is undetermined, so the UI must not call the estimate conservative.
- Frontend implementation owns `apps/web/**`, public metadata, public branding, responsive/accessibility behavior, and claim presentation. It does not invent API fields, transactions, benchmark results, or contract state.
- Legacy routes and copy currently describe the earlier filing-oracle/holder-digest product. They are migration inputs, not required features of the final MVP.

## Brand Commitments

- Public product name: **Tinjau**. Public domain: `tinjau.xyz`.
- Public `AFTERHOURS` branding must be removed from `apps/web/**`, metadata, screenshots, and judge-facing UI.
- Historical identifiers such as `AfterhoursFeeHook`, previous deployment names, archived evidence, and historical task records remain unchanged when renaming them would falsify provenance or break compatibility. The UI must label them as historical identifiers when exposed.
- Voice is factual, concise, and willing to disclose limits. It avoids hype, invented certainty, unsupported winner language, and unqualified live/production claims.
- The user explicitly pinned an OKX/X Layer-derived black, white, and electric-lime identity. This is a binding brand constraint; exact visual-system decisions remain owned by the implemented design world.

## Evidence on Hand

- Source of truth for the current product and ownership: `docs/buildx-orion-2026/outputs/04-planning/tinjau-lp-risk-autopilot-task-tracker.md`.
- Frozen scenario evidence: `docs/buildx-orion-2026/outputs/04-planning/t0-2-frozen-scenarios.md` and `apps/server/scenarios/`.
- Frozen benchmark method: `docs/buildx-orion-2026/outputs/04-planning/t0-4-benchmark-preregistration.md` and `apps/server/scenarios/benchmark-preregistration.json`.
- Scenario A is a rumor-containment and false-rumor safety case. Its social rumor is `SIMULATED`, and its market window has no economic row.
- Scenario B is a source-linked SEC 8-K replay that may reach `PROTECT` only when the final market-confirmation conditions pass.
- Scenario C is a deliberately unresolved two-origin hard case whose rule must be frozen before market scoring.
- Scenario D is a neutral Form 4 control and economic false-positive probe.
- The frozen reference asset is wNVDAx on X Layer mainnet. A documented NVDAx/wNVDAx mapping defect must be resolved before asset mapping can authorize action.
- Existing contracts, registry records, studies, and `Afterhours*` identifiers are historical implementation evidence. They are not proof that the final `NORMAL/WATCH/PROTECT` flow, final handoff, or final UI is already implemented.
- The mandatory frontend handoff is incomplete: a draft risk-record schema is present, while the remaining schemas, final scenario payloads, deployment evidence, limitations record, and T4/T5 outcomes are still pending. The UI must not fabricate them.
- No customer, protected-TVL, production-adoption, revenue, or loss-avoided evidence exists. Do not fabricate any of these.

## Product Principles

1. **Show why, not only what.** Every state must be traceable to evidence, provenance, market confirmation, policy rules, and time bounds.
2. **Make forbidden actions visible.** Rumor containment and deterministic enforcement are product features, not footnotes.
3. **Label epistemic status at the point of use.** Live, observed, replayed, simulated, unavailable, stale, and counterfactual data must never blur together.
4. **Measure without declaring a preferred outcome.** Tinjau may win, tie, lose, or remain indeterminate; the interface reports what the benchmark supports.
5. **Fail closed and explain the failure.** Missing or invalid inputs prevent unsafe promotion while preserving an understandable audit trail.

## Accessibility & Inclusion

WCAG 2.2 AA is the implementation floor for contrast, keyboard navigation, focus visibility, semantics, motion preferences, and non-color status communication. Dense financial evidence must remain understandable without hover, animation, or a wide desktop viewport. Numbers, units, dates, hashes, and addresses require readable formatting and programmatic labels.
