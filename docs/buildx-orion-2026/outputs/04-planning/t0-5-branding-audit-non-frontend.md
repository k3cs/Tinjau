# T0.5 — Branding audit, non-frontend lane

- Date: 2026-08-20
- Task: T0.5, **non-frontend half only** (server/API identifiers and non-UI documentation)
- Owner: external non-frontend AI agent
- Frontend half: **not done here.** `apps/web/**`, page metadata, screenshots and the public
  visual experience belong to the frontend Codex owner.
- Files changed: `apps/server/src/**` only. No `apps/web/**`, no `DESIGN.md`, no `PRODUCT.md`.

## 1. Result

Two user-facing branding defects fixed, one **more serious honesty defect** fixed alongside
them, and every remaining `AFTERHOURS` identifier classified rather than renamed.

Tracker §0.18 forbids globally renaming historical documents, broadcast artifacts, schema
versions, system paths, or contract names for cosmetic consistency, and requires that any
legacy identifier left in place be documented as an immutable deployed name, a compatibility
key, or an unfinished branding defect. §2 does that.

## 2. Every remaining `AFTERHOURS` identifier, classified

| Category | Examples | Verdict |
|---|---|---|
| **Immutable deployed contract name** | `AfterhoursFeeHook.sol`, `AfterhoursFeePolicy.sol`, `getAfterhoursHookAddress()`, every doc comment mirroring their math | **Keep.** The contract deployed at `0xbCb4B7…d8080` is genuinely named `AfterhoursFeeHook`. Claiming otherwise would be false. |
| **Compatibility key committed on chain** | `synthetic://afterhours/P4.4/…` in `sourceUrlGuard.ts`, `syntheticFiling.ts`, `synthetic/README.md` | **Keep.** This scheme is part of the source-hash provenance of already-posted registry events. Rewriting it would break third-party verification of historical events. |
| **Deployed operational identifier** | `afterhours-agent.service`, `afterhours-xbot.service`, `afterhours-scoreboard-api.service`, `SyslogIdentifier=…`, `/opt/afterhours/data`, `/opt/afterhours/env/*.env` | **Keep.** These are live systemd units and paths on Dien's VPS. Renaming them requires a coordinated VPS change that this tracker does not authorise, and it would break running deployments and `journalctl` history for zero user-visible benefit. |
| **Historical task reference in a code comment** | `"AFTERHOURS autonomous agent process (task P0.11)"`, `"task P5.1"`, `"P4.2 demo topology"` | **Keep.** Internal, never rendered to a user, and they are the audit trail linking code to the prototype tasks that produced it. |
| **Workspace package name** | `apps/server/package.json` → `"name": "afterhours-server"` | **Keep.** Internal workspace identifier, never served. Changing it churns lockfiles for no user-visible gain. |
| **Public-facing copy** | tweet fallback text, EDGAR User-Agent example | **Fixed — see §3.** |

Nothing in the non-frontend surface now emits `AFTERHOURS` to a user.

## 3. What was fixed

### 3.1 Public tweet copy (`apps/server/src/xbot/composeTweet.ts:159`)

[Fakta] The deterministic fallback template read
`Event #${eventId} recorded on AFTERHOURS.` and is posted publicly to X whenever no archived
summary is available.

Changed to `recorded on Tinjau.` The test now asserts both the new string **and**
`doesNotMatch(/AFTERHOURS/i)`, so a regression fails rather than quietly ships to a public,
irreversible channel.

### 3.2 EDGAR User-Agent example (`apps/server/src/edgar/client.ts:26`)

[Fakta] The missing-env error message suggested `"AFTERHOURS research@example.com"` as the
User-Agent to send to the SEC. Changed to `"Tinjau research@example.com"`.

[Inferensi] Low severity — the real header comes from `EDGAR_USER_AGENT` — but it is the
string an operator is most likely to copy verbatim into an external-facing header.

### 3.3 The public API presented a fabricated filing as a real one

This is the more serious defect, and it is the reason this task was worth doing carefully.

[Fakta] `https://tinjau.xyz/api/scoreboard` returned, on 2026-08-20:

```json
{ "eventId": "2", "ticker": "NVDAx",
  "eventTypeLabel": "8-K — bankruptcy_or_restructuring",
  "postTimeIso": "2026-08-18T04:22:40.000Z", "reaction": { "...": "..." } }
```

There is no source field anywhere in the payload. [Fakta] That event was posted from
`apps/server/synthetic/nvdax-8k-grave-bankruptcy.html`, a document the team fabricated for
task P4.4, whose on-chain `sourceUrl` is `synthetic://afterhours/P4.4/…`.

[Inferensi] Any reader of that API — a judge, a wallet, an indexer — would reasonably conclude
NVIDIA had filed for bankruptcy. This is worse than a stale brand name: it is the API stating
a false corporate event about a real company. Tracker §0.17 item 13 and T0.1 gap 7 both record
it; neither had closed it.

**Fix.** The registry already commits `sourceUrl` and `sourceContentHash` on chain — the API
simply never read them. New module `apps/server/src/scoreboard-api/provenance.ts` classifies
those two on-chain values, and `ScoreboardEntry` now carries a `provenance` object:

```json
"provenance": {
  "sourceClass": "SIMULATED",
  "dataMode": "SIMULATED",
  "isSimulated": true,
  "sourceUrl": "synthetic://afterhours/P4.4/nvdax-8k-grave-bankruptcy.html",
  "sourceContentHash": "0x…",
  "label": "SIMULATED — this document was fabricated by the Tinjau team to test the pipeline. It is not an SEC filing and it describes no real corporate event."
}
```

Design choices worth stating:

- **Classification is closed.** Only a URL that passes the existing `isRealSecFilingSourceUrl`
  guard is `OFFICIAL`. The known `synthetic://` scheme is `SIMULATED`. Everything else is
  `UNKNOWN` **and** `isSimulated: true` — an unrecognised scheme fails closed rather than
  passing as official. Tests cover the wrong-host, lookalike-host and userinfo-trick cases.
- **The change is additive.** Every pre-existing field keeps its shape, so the frontend does
  not break on deploy.
- **The raw on-chain values are passed through unmodified**, so a consumer can verify the
  provenance itself rather than trusting Tinjau's label — which is the §0.12 requirement that
  reads must not depend on trusting the dashboard.

## 4. Boundary respected

- No file under `apps/web/**` was read for editing or changed. The frontend owner must render
  `provenance` — the API can supply the fact, it cannot force a UI to display it.
- `PRODUCT.md` was **not** touched. §0.21 allows the non-frontend agent to update it only when
  T6.4 is active.
- Historical documents under `docs/buildx-orion-2026/outputs/02-ideation/` and the prototype
  `task-tracker.md` were **not** rewritten. They are evidence of what the project was called.

## 5. Not yet closed

1. **The live API still serves the old payload.** This fix exists in code only. Redeploying
   the backend is T7.3, whose non-frontend half is backend readiness. Until then,
   `tinjau.xyz/api/scoreboard` continues to present the synthetic bankruptcy without
   provenance, and no judge-facing material may cite that endpoint as evidence.
2. **The frontend half of T0.5 is outstanding** — page metadata, headings, links, screenshots
   and the public visual experience, plus rendering the new `provenance` field.
3. **`tinjau.xyz` metadata was not verified** here. That check belongs to the frontend lane.

Because of 1 and 2, T0.5 stays **open** in the tracker. This document closes only the
non-frontend half.

## 6. Verification

| Check | Command | Result |
|---|---|---|
| New provenance tests | `cd apps/server && npx tsx --test test/scoreboardProvenance.test.ts` | 4/4 pass |
| Server regression | `cd apps/server && pnpm test` | 172/172 pass (was 153 at T0.1) |
| Server typecheck | `cd apps/server && pnpm typecheck` | pass |
| Non-frontend public-copy sweep | `grep -ri afterhours apps/server/src` | remaining hits are only the §2 keep-categories |
