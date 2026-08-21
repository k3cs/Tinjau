# Frontend handoff

Backend → frontend contract for Tinjau. Written by the non-frontend lane; consumed by the
frontend owner. Tracker §0.23 defines what must be here.

**Status: complete. All ten §0.23 artifacts exist and validate.** Phases T0–T5 have run and
T4.2's testnet deployment is live on chain 1952. What follows is what you can build against, and
— just as important — what the data is *not* allowed to be used to claim.

Last regenerated 2026-08-21.

## 1. The three things you must not get wrong

Read these before anything else. Each one is a fact a screen could easily misstate, and each
would misstate it in the direction that flatters us.

1. **Tinjau reaches `PROTECT` on none of the four frozen replay scenarios.** A → `WATCH`,
   B → `WATCH`, C → `WATCH`, D → `NORMAL`. The single `PROTECT` in this directory
   (`scenario-confirmed-protect.json`) comes from **constructed market inputs** on a
   builder-controlled testnet pool, and its `criticalCaveat` block says exactly that. Label it
   constructed at the same visual weight as the state itself.

2. **`canClaimLossAvoided` is `false`.** Tinjau **ties** `STATIC` rather than beating it, and
   "beats" means strictly greater. **No surface may claim Tinjau reduces LP loss.** The
   defensible claim is behavioural: *Tinjau declined to act on two large price moves because
   neither had a qualifying cause, and one of them a volatility-only policy would have traded
   on.* That is restraint, not protection.

3. **X Layer's public RPC serves stale reads.** A consumer polling `currentRecord` can read
   `NORMAL` while a `PROTECT` is live. Follow the `AssessmentPosted` event or pin reads to a
   block number. Details and measurements in `api-contract.md` §0.

## 2. What is here

| Artifact | Status | What it is |
|---|---|---|
| `README.md` | ✅ | this file |
| `api-contract.md` | ✅ | endpoints, parameters, response codes, degraded behaviour, caching, CORS |
| `risk-record.schema.json` | ✅ | the §0.24 view model. `$id .../risk-record/1.0.1.json` |
| `evidence-graph.schema.json` | ✅ | claim, provenance and relationship structure |
| `proof-of-protection.schema.json` | ✅ | observed and replayed outcome schema |
| `scenario-rumor-watch.json` | ✅ | the rumour negative control, end to end |
| `scenario-confirmed-protect.json` | ✅ | the confirmed-event path — **CONSTRUCTED market leg** |
| `three-policy-comparison.json` | ✅ | `STATIC` / `VOLATILITY_ONLY` / `TINJAU` over identical input |
| `deployed-addresses.json` | ✅ | chain 1952, both stacks, bytecode checks, transaction hashes |
| `known-limitations.md` | ✅ | read before writing any user-facing copy |

Two supporting schemas were added so every JSON artifact validates against something named:

| Artifact | What it covers |
|---|---|
| `scenario-result.schema.json` | the two `scenario-*.json` envelopes |
| `deployed-addresses.schema.json` | `deployed-addresses.json` |

And two tools:

| Tool | What it does |
|---|---|
| `tools/generate.ts` | regenerates every JSON artifact, deterministically, with no network and no clock |
| `tools/validate.mjs` | validates everything against the published schemas, zero npm dependencies |

## 3. Prove it rather than trust it

```bash
node docs/buildx-orion-2026/outputs/05-build/frontend-handoff/tools/validate.mjs
```

Exit 0 means: every artifact validates against its schema (cross-file `$ref`s resolved against
the real schema files); no schema uses a keyword the checker silently ignores; 21 deliberately
broken documents were **rejected**; all ten §0.23 artifacts are present; and eight load-bearing
facts still hold. Node 18+, nothing to install.

The same script runs inside the server suite:

```bash
cd apps/server && pnpm test        # includes test/frontendHandoff.test.ts
cd apps/server && pnpm typecheck
```

To regenerate the JSON after a backend change:

```bash
cd apps/server
npx tsx ../../docs/buildx-orion-2026/outputs/05-build/frontend-handoff/tools/generate.ts
```

The generator re-derives the constructed scenario B decision offline and **throws** if its
evidence commitment does not match the one actually posted on chain, so the published artifact
cannot drift from the recorded run.

## 4. Running the backend

There is **no HTTP API for the new risk pipeline.** It is library code, fixtures, and an
on-chain registry. See `api-contract.md` for the on-chain read path and the legacy scoreboard
service.

Everything the frontend needs today can be read straight from this directory with no server at
all. That is the intended development path.

⚠️ **The public `tinjau.xyz/api/scoreboard` is stale.** It serves a payload without the
`provenance` field, so a fabricated test filing is currently indistinguishable from a real SEC
one there. The fix exists in code but is not deployed (T7.3). **Do not cite that endpoint as
evidence, and do not screenshot it for judges** until it is redeployed.

## 5. Things the UI must get right

Product requirements, not styling preferences. Each exists because getting it wrong would make
the interface assert something untrue. The full list with reasoning is `api-contract.md` §5; the
short version:

1. `dataMode: "SIMULATED"` must be unmistakable — one frozen claim is fabricated by us.
2. Show `usableOriginCount`, not `independentOriginCount`.
3. `action.authorized` is false for every state except `PROTECT`.
4. `UNAVAILABLE` ("could not look") ≠ `NOT_CONFIRMED` ("looked, saw nothing").
5. `ANTI_WICK_FAILED` ("it retraced") ≠ `PERSISTENCE_UNOBSERVED` ("we could not tell").
6. Non-promotable claims are displayed, not hidden — they are part of why the state is what it is.
7. `publishedAtPrecision` is real; several claims are known only to the day.
8. `observedAt` is **nullable**. `null` means nothing was observed. Null-check before computing age.
9. Observed and counterfactual numbers must never share a visual treatment.
10. A constructed outcome is labelled constructed, at the weight of the state itself.

## 6. Known integration blocker

`apps/web/src/lib/risk/model.ts` `REASON_CODES` is missing `INSUFFICIENT_SAMPLE`,
`PERSISTENCE_UNOBSERVED` and `UNKNOWN_COMPANY`. `scenario-rumor-watch.json`'s record emits
`INSUFFICIENT_SAMPLE`, so `apps/web/src/lib/risk/validate.ts` throws on a record that is valid
against the published schema.

`apps/web/**` is the frontend owner's lane, so the non-frontend lane reported this rather than
fixing it (§0.22). Diff `model.ts` against the **current** `$defs.reasonCode.enum` — the enum
moved three times during this session.

## 7. Schema stability

Every schema is versioned. If a version bumps, artifacts are regenerated rather than edited in
place and the migration is recorded in the tracker. Fields are not removed or repurposed without
that bump (§0.24).

`contracts/src/TinjauRiskTypes.sol` is the source of truth for every enum ordinal and reason-code
bit. `apps/server/test/riskTypesParity.test.ts` parses that Solidity file and fails if the
TypeScript mirror or the published schema drifts from it — so if these schemas say something,
the contract agrees.

Note the deliberate asymmetry on `risk-record`: the file's `$id` is `1.0.1` while the
`schemaVersion` **field** stays `tinjau.risk/1.0.0`. `observedAt` became nullable, but no
on-chain vocabulary changed, and bumping the field would break parity with the Solidity constant
over a value the contract does not carry.

## 8. Who to ask

Backend, API, contract and benchmark questions: the non-frontend lane. Anything under
`apps/web/**`, `DESIGN.md`, page metadata, or screenshots is the frontend owner's, and the
non-frontend lane does not touch those files.
