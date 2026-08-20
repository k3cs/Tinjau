# T0.1 — Revised MVP Baseline Audit

- Date: 2026-08-20
- Scope: read-only Stage 4 readiness audit
- Result: **pass with disclosed compatibility gaps**
- Product behavior changed: no

## Commands and results

| Area | Command | Result |
|---|---|---|
| Server tests | `cd apps/server && pnpm test` | 153 passed, 0 failed |
| Server typecheck | `cd apps/server && pnpm typecheck` | passed |
| Web production build | `cd apps/web && npm run build` | passed; `/`, `/holdings`, `/calendar`, `/scoreboard`, `/api/scoreboard` generated |
| Web typecheck | `cd apps/web && npm run typecheck` | passed when run after the production build |
| Contract tests/fuzz | `cd contracts && forge test` | 56 passed, 0 failed |
| Public app | `curl -I https://tinjau.xyz` | HTTP 200 via Vercel |
| Public API | `curl https://tinjau.xyz/api/scoreboard` | HTTP 200; two event records returned |
| Testnet bytecode | `cast codesize <address> --rpc-url https://testrpc.xlayer.tech` | non-zero for registry, hook, PoolManager, swap router, and three mock tokens |

The first concurrent web typecheck raced with `next build` while `.next/types` was being regenerated and returned missing-generated-file errors. Running the same typecheck after the build completed passed. This is a test-orchestration race, not a reproduced source-code failure; final CI should sequence build/type generation before standalone typecheck or isolate their output directories.

## Existing reusable implementation

| Capability | Evidence | Reuse status for revised MVP |
|---|---|---|
| SEC EDGAR ingestion, HTML/XBRL stripping, three independent structured parses, field agreement | server code plus 153 passing tests | reusable; preserve official-evidence behavior |
| Bonded/challengeable official event registry | deployed `EventStateRegistry`, codesize 5,940 | reusable foundation; schema migration required |
| Bounded v4 dynamic fee with automatic time decay | deployed `AfterhoursFeeHook`, codesize 4,900; contract tests/fuzz pass | reusable math and pool integration; final state/policy controls required |
| OKX reference-price polling | index-poller code and tests | reusable; freshness plus pool-side confirmation required |
| Builder-controlled X Layer test pool and swap path | PoolManager codesize 17,151; router codesize 5,035 | reusable and must stay labeled builder-controlled |
| Frontend and scoreboard API | production build succeeds; public site/API return HTTP 200 | reusable shell; final risk UI/benchmark/provenance and redeploy required |
| Historical studies and synthetic fixtures | repository artifacts and tests | reusable inputs; not substitutes for the three-policy benchmark |

## Verified X Layer Testnet inventory

| Component | Address | Codesize / state |
|---|---|---|
| EventStateRegistry | `0x713f45f44e74616898FB366E11881196221933aA` | 5,940; `nextEventId() = 3` |
| AfterhoursFeeHook | `0xbCb4B7310BA36eA01f2A435A5D64C9b7953d8080` | 4,900 |
| PoolManager | `0x8F862A8b6f00C99b0610dc764228C661c4909ae1` | 17,151 |
| Swap router | `0x6F554A0bEE654Ead7C7eACDD300A72170a674C62` | 5,035 |
| mock wNVDAx | `0xf07A9D89848bc694c7154Fda4cce707Eb409F903` | 1,737 |
| mock USDG | `0x666e81CCb9D4d6c2e7A3ed9f317E3dFBa2410e99` | 1,737 |
| mock USD₮0 | `0x95F998c232A2a0F127488fb9769C54aEe52a3eFe` | 1,737 |

The deployed hook currently exposes `baseFee = 500`, `maxFee = 20,000`, `widenDuration = 3,600 seconds`, and `decayDuration = 18,000 seconds`.

## Compatibility gaps against the final design

1. The deployed registry records corporate events, not the final versioned `NORMAL/WATCH/PROTECT` risk record.
2. The existing policy is bounded and time-decayed but lacks the final rumor gate, dual-confirmation transition model, cooldown, signed assessment/nonce rules, and policy-version semantics.
3. No final news/social normalization or AI Evidence Graph exists.
4. The OKX poller exists, but the final freshness-aware OKX-plus-X-Layer market-confirmation engine and executable-depth decision are not integrated.
5. No static-vs-volatility-only-vs-Tinjau replay runner or Proof of Protection record exists.
6. The local web source uses Tinjau branding, but the public `tinjau.xyz` deployment still served an older AFTERHOURS title, description, navigation label, and copy during this audit.
7. The public scoreboard API returned event `2` as an NVDAx bankruptcy/restructuring event. Repository evidence identifies this as a synthetic test event, but the API response does not include its `synthetic://` source or an explicit replay/simulated label. The final UI/API must not present it as an observed official event.

## Schedule conclusion

The plan is schedule-compatible only as a narrow reuse-heavy vertical slice:

- preserve and adapt the existing official-evidence, OKX polling, v4 pool, contract-testing, hosting, and UI foundations;
- use the approved immutable source-linked replay fixtures for MVP news/rumor input;
- keep T8/P1 and every P2 feature below the cut line;
- do not redesign the UI shell or broaden asset/provider coverage;
- preserve the full differentiating proof: rumor containment, confirmed bounded action, deterministic recovery, and the three-policy comparison.

This is a compressed plan, not evidence that the missing final behavior already exists.
