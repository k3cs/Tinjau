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

### The measured result (T5.4 / T5.5, 2026-08-21)

All three scenes ran, and the third one did not go Tinjau's way. This is the governing fact for every piece of copy in the product.

- **Tinjau never promotes to `PROTECT` on any of the four frozen replay scenarios**, at any threshold in the sensitivity grid. Its fee stays at base throughout, so its replayed economics are **identical to the static do-nothing policy, not better**.
- **`canClaimLossAvoided` is `false`.** "Beats" means strictly greater and a tie is not a win. No surface may claim "Tinjau reduces LP loss".
- **On markout the benchmark cannot determine which policy did better.** All 27 comparable cells flip sign between the pre-registered metric and a post-hoc consistent-fee-basis metric. The benchmark brackets the answer and the bracket spans the sign; neither basis is clean.
- **Scenario B, the confirmed-event showcase, resolves to `WATCH`** on canonical mainnet data. The only observed `PROTECT` interval exists on the builder-controlled X Layer Testnet stack with a **constructed** market leg, so it demonstrates enforcement rather than benefit.
- **The claim that survives is behavioural:** Tinjau declined to act on two large price moves because neither had a qualifying cause, and one of them a volatility-only policy would have traded on at every `k` in the grid. That is restraint, not protection, and it arrives from the neutral control rather than from the showcase.

Artifacts: `docs/buildx-orion-2026/outputs/05-build/three-policy-benchmark.{md,json}`, `proof-of-protection.json`, `t5-5-proof-of-protection.md`.

## Positioning

Tinjau combines five observable mechanisms that neighboring products cannot copy by changing marketing copy alone:

1. source-grounded causal evidence rather than volatility alone;
2. rumor containment that caps rumor-only input at `WATCH`;
3. independent corroboration plus fresh OKX/X Layer market confirmation for non-official promotion;
4. tokenized-equity-aware mapping, market context, pool flow, basis, and exit depth;
5. measured three-policy outcomes over identical inputs.

Every one of those five mechanisms has prior art, and the product narrative must say so before it says anything else. Corporate-action extraction is occupied by Chainlink and 24 institutions; news and event intelligence by RavenPack-class providers; AI or telemetry-driven Uniswap v4 fee control by RiskClaw, NeuralHook, Sentinel Agent, UniBrain and AnchorHookV4; automated on-chain risk response by Hypernative and Chaos Labs; adverse-selection AMM design by volatility, TWAP, flow-aware and cross-venue mechanisms including Arrakis HOT; RWA position protection by Argus on Mantle. Tinjau's ground is the combination and the domain, not any single layer.

The safe public claim is narrow: no complete public product with the exact reviewed combination of source-grounded tokenized-equity evidence, rumor containment, OKX/X Layer confirmation, bounded LP action, deterministic recovery, and measured three-policy outcome was found. "Not found" means not found in the public documentation reviewed on 2026-08-20; it is not evidence that no such system exists privately. Tinjau must not claim to be the first AI dynamic-fee hook, first corporate-action oracle, first on-chain risk registry, first CEX/DEX risk agent, or first self-protecting pool, and must not present the Evidence Graph as a moat.

The narrative order for every judge-facing surface is `problem → alternatives → Tinjau addition → proof → X Layer ecosystem value`. The claim-to-artifact map and the full competitor matrix live in `docs/buildx-orion-2026/outputs/05-build/t6-4-claims-and-competitive-position.md`; the repository `README.md` follows the same order.

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

The frontend depends on a versioned handoff under `docs/buildx-orion-2026/outputs/05-build/frontend-handoff/`, whose contents and completeness status are stated in that directory's own `README.md`. Frontend design may build only against artifacts that directory marks as ready; anything it marks as pending must appear as a clearly labeled structural placeholder, never as an inferred backend claim.

The Proof of Protection schema and record are published one level up, at `docs/buildx-orion-2026/outputs/05-build/proof-of-protection.schema.json` and `proof-of-protection.json`, with a readable companion in `t5-5-proof-of-protection.md`. Two rules bind any surface that renders that record: `observedOnChainProtection` and `replayedCounterfactualBaselines` must never share a visual treatment, a total, or an axis, because they are different chains, different pools, and different epistemic status; and the record's `_READ_THIS_FIRST` block must be rendered wherever the record is rendered, because it is the sentence that stops a constructed interval being read as a result.

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
- Scenario B is a source-linked SEC 8-K replay. **Measured outcome: it resolves to `WATCH`, not `PROTECT`** — its 235 bps drawdown retains only 13% after five minutes, so the market leg is `NOT_CONFIRMED`. The verdict was tested against the correction that would have favored it and got weaker, not stronger.
- Scenario C is a two-origin hard case. Its rule was frozen before market scoring: a source line that materially revised its own quantitative claim inside the window may support `WATCH` but may not corroborate. It resolves to `WATCH`.
- Scenario D is a neutral Form 4 control and economic false-positive probe. **It moved more (241 bps) than the material 8-K (235 bps)**, and the volatility-only baseline fires on it at every `k` while Tinjau declines it twice.
- The frozen reference asset is wNVDAx on X Layer mainnet. A documented NVDAx/wNVDAx mapping defect must be resolved before asset mapping can authorize action.
- The OKX leg of market confirmation is `UNAVAILABLE` for all four frozen scenarios. **No surface may describe any replayed scenario as dual OKX/X Layer confirmation.**
- On-chain evidence exists on X Layer Testnet chain 1952 (`t4-demo-manifest-xlayer-testnet.json`): a bounded fee of 20,000 pips actually charged, decay to 9,470, deterministic recovery to 500 with no keeper transaction, cooldown refused on chain, and a guardian-paused action recorded as failed with no fee change. The pool is **builder-controlled** with valueless mock tokens, the run used a 60x-compressed demo envelope, and every address is a **T4.2 working address, not final**.
- Executable exit depth is a lower bound, and the mainnet pool is extraordinarily thin: 0.53-2.29 wNVDAx (~$120-$517) provably quotable within one tick range. Do not present exit-depth figures as representative of a liquid market.
- X Layer's public RPC serves stale reads, measured 2,519-2,746 ms convergence lag per write. A naive consumer can read `NORMAL` while a `PROTECT` is live.
- Existing contracts, registry records, studies, and `Afterhours*` identifiers are historical implementation evidence. They are not proof that the final `NORMAL/WATCH/PROTECT` flow, final handoff, or final UI is already implemented.
- Handoff completeness is stated in `docs/buildx-orion-2026/outputs/05-build/frontend-handoff/README.md`, which is the authority on what may be built against. The UI must not fabricate anything that directory marks as pending.
- No customer, protected-TVL, production-adoption, revenue, or loss-avoided evidence exists. `canClaimLossAvoided` is `false` and was measured, not assumed. Do not fabricate any of these.

## Product Principles

1. **Show why, not only what.** Every state must be traceable to evidence, provenance, market confirmation, policy rules, and time bounds.
2. **Make forbidden actions visible.** Rumor containment and deterministic enforcement are product features, not footnotes.
3. **Label epistemic status at the point of use.** Live, observed, replayed, simulated, unavailable, stale, and counterfactual data must never blur together.
4. **Measure without declaring a preferred outcome.** Tinjau may win, tie, lose, or remain indeterminate; the interface reports what the benchmark supports.
5. **Fail closed and explain the failure.** Missing or invalid inputs prevent unsafe promotion while preserving an understandable audit trail.

## Accessibility & Inclusion

WCAG 2.2 AA is the implementation floor for contrast, keyboard navigation, focus visibility, semantics, motion preferences, and non-color status communication. Dense financial evidence must remain understandable without hover, animation, or a wide desktop viewport. Numbers, units, dates, hashes, and addresses require readable formatting and programmatic labels.
