# Service Decision Log — Build X Series AI Season + Orion Builder

Use this file as the source of truth for third-party service decisions and readiness. Define the project need before choosing a provider. Do not write API keys, tokens, passwords, recovery codes, payment details, or any other credential value here.

## Decision and Status Rules

- Decision: `selected` | `deferred` | `not-needed` | `rejected`
- Status: `candidate` | `approved` | `setup` | `ready` | `blocked` | `degraded` | `retired`
- Every relevant category must have a decision before Checkpoint 2.
- Reverify price, plan limits, chain/framework support, deprecations, and permission requirements when they materially affect the decision.
- Link material architecture, budget, scope, or risk trade-offs to `DEC-NNN`.

## Service Decision Index

| ID | Category | Selected Service | Decision | Status | Owner | Verified On |
|---|---|---|---|---|---|---|
| SVC-001 | Corporate filing data source | SEC EDGAR submissions API | selected | ready | Claude (executor) | 2026-08-17 |
| SVC-002 | On-chain read/write (X Layer) | Direct RPC (`rpc.xlayer.tech`, `testrpc.xlayer.tech`) + `cast` | selected | ready | Claude (executor) | 2026-08-17 |
| SVC-003 | Token/market data | `onchainos` CLI v4.4.2 | selected | ready | Claude (executor) | 2026-08-17 |
| SVC-004 | LLM parsing | Google Gemini (Flash tier) — **temporary**, Claude Opus 5 planned once billing is set up | selected | approved | Dien | 2026-08-17 |
| SVC-005 | Frontend hosting (holder digest, forward calendar, scoreboard UI, demo page UI, evidence pages) | Vercel | selected | setup | Dien | 2026-08-17 |
| SVC-006 | Backend compute (event agent, index poller, X/Telegram bots, demo relayer + scoreboard API) | Dien's own VPS | selected | setup | Dien | 2026-08-17 |
| SVC-007 | Financial-news intake | Immutable source-linked repository replay fixture | selected | approved | Dien | 2026-08-20 |
| SVC-008 | Social-rumor intake | Immutable source-linked repository replay fixture | selected | approved | Dien | 2026-08-20 |

## SVC-001 — Corporate filing data source

- Category: Data source
- Need: second-precision-timestamped 8-K and Form 4 filings for 10 corporate underlyings, plus raw document text for parsing
- Candidates: SEC EDGAR submissions API (only real candidate — no paid alternative adds precision EDGAR doesn't already have)
- Decision: selected
- Selected service: SEC EDGAR (`data.sec.gov/submissions/CIK{10-digit}.json` + `www.sec.gov/Archives/edgar/data/...` for documents)
- Reason: free, official, second-precision `acceptanceDateTime`, directly verified working this session (REF-019)
- References: REF-019
- Verified on: 2026-08-17
- Owner: Claude (executor), reviewed by Dien
- Plan and budget: free; requires a descriptive `User-Agent` header per SEC's usage guidelines
- Limits: no documented hard rate limit, but SEC requests reasonable use — poll on a schedule, not tight-loop
- Integration points: task-tracker.md P1.1
- Readiness criteria: poller successfully retrieves and parses at least one real filing end-to-end
- Status: ready
- Fallback: none needed — this is the only ground-truth source
- Lock-in / exit cost: none, public API
- Decision link: DEC-005
- Things to avoid: do not hammer the endpoint faster than a human would file — SEC has been known to rate-limit abusive User-Agents
- Learnings: none yet

## SVC-002 — On-chain read/write (X Layer)

- Category: Blockchain RPC / deployment
- Need: read wrapper token state, read/write the registry and hook contracts, deploy a testnet PoolManager
- Candidates: `rpc.xlayer.tech` (mainnet 196, public), `testrpc.xlayer.tech` (testnet 1952, public) — no third-party RPC provider evaluated, public endpoints already verified sufficient
- Decision: selected
- Selected service: X Layer public RPC endpoints, accessed via Foundry's `cast`
- Reason: already used successfully throughout verification (REF-020); DEC-002 fixed the correct testnet chain ID
- References: REF-020, DEC-002
- Verified on: 2026-08-17
- Owner: Claude (executor), reviewed by Dien
- Plan and budget: free; gas paid in OKB (mainnet real, testnet faucet)
- Limits: `eth_getLogs` capped at 100 blocks per call (verified, error `-32602`); ~10% transient call failure observed — retry logic is mandatory, not optional (see task-tracker.md P2.2)
- Integration points: task-tracker.md P0.5, P1.6–P1.9, P2.2, P2.4, P4.1–P4.3
- Readiness criteria: contract deploys and reads succeed on both chains
- Status: ready
- Fallback: a private/paid RPC provider if the public endpoint's rate limits become a bottleneck during the Event B live window
- Lock-in / exit cost: none, standard EVM JSON-RPC
- Decision link: DEC-002, DEC-005
- Things to avoid: assuming `eth_getLogs` accepts wide ranges — it doesn't, confirmed directly
- Learnings: none yet

## SVC-003 — Token/market data

- Category: Market data API
- Need: token liquidity/pool enumeration, price klines, per-trade history, index price
- Candidates: `onchainos` CLI (OKX Web3 backend wrapper) — no alternative evaluated, already installed and verified
- Decision: selected
- Selected service: `onchainos` CLI v4.4.2
- Reason: already used successfully to enumerate pools, measure price-history depth, and confirm the index endpoint's spot-only limitation (REF-021)
- References: REF-021
- Verified on: 2026-08-17
- Owner: Claude (executor), reviewed by Dien
- Plan and budget: free at this usage level (session tooling, not a paid API key requirement observed)
- Limits: kline endpoint caps at 299 points per call with no time cursor; trades endpoint caps at 500 with no pagination (reaches back only hours); index endpoint is spot-only, no history — all confirmed directly, see REF-021 and spec §7
- Integration points: task-tracker.md P0.8 (index poller), P2.2 (pool enumeration)
- Readiness criteria: poller successfully writes timestamped price rows
- Status: ready
- Fallback: none identified for the index-history gap — this is why the poller must start day 1, it cannot be substituted after the fact
- Lock-in / exit cost: low — CLI wraps public OKX endpoints
- Decision link: DEC-005
- Things to avoid: assuming the index endpoint has history — it does not, confirmed directly
- Learnings: LEARN-010

## SVC-004 — LLM parsing

- Category: AI / LLM API
- Need: three independent structured-output parses per filing, plus a separate severity/direction grade call
- Candidates: Claude API (Opus 5) — original design target, cost already verified negligible at this volume (see prior version of this entry, superseded by DEC-007). Google Gemini (Flash tier) — selected. The bonded-fields requirement (schema-guaranteed output, not best-effort JSON) is satisfied by both providers: Gemini via `responseMimeType: "application/json"` + `responseSchema` (REF-023), Claude via `output_config.format`
- Decision: selected
- Selected service: **Google Gemini, Flash tier — stated as temporary.** Dien's explicit intent, recorded here rather than assumed: migrate to Claude Opus 5 once billing/payment is set up. Do not treat this as the permanent architecture; do not "helpfully" migrate it back without Dien's instruction, and do not delete this note when the swap happens — replace it with the migration record instead
- Reason: Dien's stated constraint is Claude requires payment, and Gemini's Flash tier is reported free with no credit card (REF-026, unverified against Google's own page — see caveat there). Cost itself was not the blocker — Claude Opus 5 at this project's volume was already verified at roughly a two-figure dollar sum for the whole Event A window (~60 filings/month × 3 parses × ~3,700 tokens input, REF-019) — access/billing setup is
- References: REF-023 (structured-output capability, verified against Google's own docs). Pricing/free-tier figures cited in the fields below come from a separate, not-yet-independently-verified reference entry — see REFERENCES.md and reverify before scale-up
- Verified on: 2026-08-17
- Owner: Dien
- Plan and budget: free tier reportedly available — Flash/Flash-Lite models, no card required (REF-026, unverified); paid tier available later at roughly $1.50/$9.00 per 1M tokens for Flash if free-tier limits are ever hit (REF-026, aggregator-sourced)
- Limits: free tier reportedly ~5–15 requests/minute, up to 1,000 requests/day (REF-026, unverified) — AFTERHOURS's actual volume is ~4 calls per filing (3 parses + 1 grade) at roughly 1–2 filings/day across the 2 live names, comfortably inside this cap even on a busy day if the figures hold; re-check if live coverage expands beyond NVDAx/MSTRx, and reverify the cap itself before relying on it
- Pinned model id: **`gemini-3.6-flash`** — pinned as `DEFAULT_GEMINI_MODEL` in `apps/server/src/llm/provider.ts` (2026-08-21); `GEMINI_MODEL` remains an escape hatch, not a second default. The published p2.1 parse-accuracy rows predate this pin and carry five other Flash-family ids (free-tier quota exhaustion on 2026-08-18) — see outputs/05-build/parse-accuracy-study.md
- Integration points: task-tracker.md P1.3, P1.5 (built against Gemini now); P1.10/P1.11 (billing setup + migration to Claude, tracked as real tasks since 2026-08-17, not gated on billing existing first)
- Readiness criteria: one real filing parsed three times with schema-valid output from Gemini
- Status: approved
- Fallback: **Claude API (Opus 5)** — the original design target, already verified cheap at this volume; migration is task-tracker.md P1.11, gated on P1.10 (billing setup, HUMAN-ONLY), not on the critical path for either event
- Lock-in / exit cost: low — the schema-based structured-output pattern is portable between providers; migrating later means re-pointing the API client and re-validating output shape, not a redesign
- Decision link: DEC-005, DEC-007
- Things to avoid: do not skip the XBRL-stripping step (task-tracker.md P1.2) — raw HTML is ~50K tokens of markup for ~3K tokens of content, true for either provider. SEC filings are public documents, so free-tier data-use terms are a low-risk concern here — still worth a glance at Google's current terms before going live. Do not let this temporary-provider note get lost — it's the reason task-tracker.md P1.3 reads the way it does
- Learnings: none yet

## SVC-005 — Frontend hosting

- Category: Static/web hosting
- Need: serve every judge-facing page — holder digest, forward calendar, scoreboard UI, the hosted synthetic-injection demo page, and the published evidence-pack results pages (parse-accuracy, reaction-latency, markout)
- Candidates: Vercel (selected) — no others evaluated, Dien has an existing preference and the monorepo already has an `apps/web` per `HACKATHON.md`
- Decision: selected
- Selected service: Vercel
- Reason: Dien's choice; fits the existing TypeScript monorepo without new tooling, zero-cost at this traffic level, and pages calling out to the SVC-006 backend API for live data (scoreboard, demo trigger) is a standard Vercel + external-API pattern
- References: REF-024 (Dien confirmed account access 2026-08-17)
- Verified on: 2026-08-17
- Owner: Dien
- Plan and budget: free tier expected sufficient for hackathon-scale judge traffic; not separately reverified this session
- Limits: not reverified this session — check Vercel's current serverless-function timeout/rate limits before wiring the demo-trigger call through a Vercel function rather than calling SVC-006 directly from the browser
- Integration points: task-tracker.md P0.12 (new — create the Vercel project), P3.1, P3.2, P5.1, P6.2
- Readiness criteria: a placeholder deploy is live and reachable before any real page is built against it
- Status: setup
- Fallback: Netlify or GitHub Pages if Vercel setup hits a blocker — same static-hosting shape, low switching cost
- Lock-in / exit cost: low — static frontend, no Vercel-specific backend logic planned
- Decision link: DEC-005
- Things to avoid: don't put the demo relayer's private key anywhere in the Vercel deployment (env vars included) — it belongs on the VPS (SVC-006), the Vercel page only calls that API
- Learnings: none yet

## SVC-006 — Backend compute

- Category: Compute (VPS)
- Need: everywhere in the architecture that must run continuously or hold a private key — the EDGAR poller + 3× parse + registry poster (§4.1–§4.2, task P1.1–P1.9), the index-price poller (§4.6, task P0.8, cannot be backfilled if it's ever down), the X feed bot (task P5.3) and later the Telegram bot (task P9.4), and the demo-injection relayer + the small API the Vercel frontend calls for scoreboard data and the demo trigger (task P6.2)
- Candidates: Dien's own VPS (selected) — no managed alternative (Railway/Render/Fly.io) evaluated since Dien already has infrastructure
- Decision: selected
- Selected service: Dien's own VPS (provider/host not recorded here — operational detail, not a service-category decision)
- Reason: Dien's choice; avoids a new vendor relationship and Dien already knows how to operate it
- References: REF-025 (Dien confirmed SSH access 2026-08-17)
- Verified on: 2026-08-17
- Owner: Dien
- Plan and budget: Dien's existing infrastructure — no incremental cost assumed, not separately verified this session
- Limits: uptime is entirely Dien's responsibility now — there's no managed-platform SLA to fall back on; if the VPS goes down during the closed-market window, that's the exact failure mode the whole product argues against, so this is the single highest-consequence operational risk in the plan
- Integration points: task-tracker.md P0.11 (new — provision the VPS), P0.8, P1.1–P1.9, P4.4 (relayer), P5.1 (scoreboard API), P5.3, P9.4
- Readiness criteria: process manager (systemd/pm2/Docker, Dien's choice) keeps the agent running across reboots; secrets (LLM API key — currently Gemini, see SVC-004 — X Layer RPC, registry-poster private key, demo-relayer private key, X/Telegram bot tokens) are configured as environment variables, never committed to the repo
- Status: setup
- Fallback: none identified — if the VPS becomes unavailable mid-window, there is no pre-arranged backup host; consider this before Event B's unattended overnight window around the 2026-08-26 earnings
- Lock-in / exit cost: none, general-purpose compute
- Decision link: DEC-005
- Things to avoid: don't run the registry-poster and demo-relayer private keys with the same key — a bug or abuse of the public demo button should never be able to touch the keys posting real bonded state
- Learnings: none yet

## SVC-007 — Financial-news intake

- Category: Financial news / secondary evidence
- Need: one source-linked news claim for the Hackathon MVP Evidence Graph; later, timely discovery across supported tokenized equities
- Candidates: immutable source-linked repository replay fixture (selected for P0); live financial-news API/provider (deferred to P2 and not selected)
- Decision: selected
- Selected service: immutable source-linked repository replay fixture
- Reason: Dien explicitly approved the reproducible no-account fallback for the Hackathon MVP. It proves normalization, provenance, Evidence Graph behavior, and safe policy handling without creating a credential or paid-provider dependency
- References: REF-028, REF-029
- Verified on: 2026-08-20
- Owner: Dien
- Plan and budget: repository-local fixture, zero incremental service cost, no account or credential. Live provider evaluation remains P2
- Limits: a replay fixture proves normalization, reasoning, safety, and demo reproducibility but not live discovery or real-time latency
- Integration points: revised tracker T0.3, T2.1–T2.4, T4.4–T4.5
- Readiness criteria: one article/record is fetched or frozen with original URL, publisher, publication timestamp, affected entity/token, claim text/source pointer, and `LIVE` or `REPLAY` label
- Status: approved
- Fallback: immutable source-linked historical replay fixture; must never be presented as live ingestion
- Lock-in / exit cost: none; the normalized claim adapter remains provider-portable
- Decision link: DEC-009, DEC-010
- Things to avoid: do not count syndications of one original report as independent sources; do not let a single news item authorize `PROTECT`
- Learnings: LEARN-004, LEARN-005

## SVC-008 — Social-rumor intake

- Category: Social source / rumor discovery
- Need: one source-linked rumor for the Hackathon MVP negative-control path; later, timely discovery of claims before official confirmation
- Candidates: immutable source-linked historical replay fixture (selected for P0); clearly labeled simulated fixture only if no durable historical source can be preserved; live social read/search API (deferred to P2 and not selected)
- Decision: selected
- Selected service: immutable source-linked repository replay fixture
- Reason: Dien explicitly approved the reproducible no-account fallback. Existing X posting credentials are not treated as evidence of read/search entitlement, and no new paid tier is assumed
- References: REF-028, REF-029
- Verified on: 2026-08-20
- Owner: Dien
- Plan and budget: repository-local fixture, zero incremental service cost, no account or credential. Live provider evaluation remains P2
- Limits: a replay or simulated fixture proves rumor containment, not live rumor coverage, source reach, or real-time latency
- Integration points: revised tracker T0.3, T2.1–T2.4, T4.4
- Readiness criteria: one rumor fixture preserves original permalink/source ID when available, author/source, timestamp, affected entity/token, claim text/source pointer, and `RUMOR` plus `REPLAY` or `SIMULATED` labels
- Status: approved
- Fallback: immutable source-linked historical replay; if no durable source is available, a clearly labeled simulated rumor used only to prove the safety invariant
- Lock-in / exit cost: none; the normalized claim adapter remains provider-portable
- Decision link: DEC-009, DEC-010
- Things to avoid: never convert speculation into a factual event through paraphrasing; rumor-only evidence must remain capped at `WATCH`
- Learnings: LEARN-004, LEARN-005

## Service Entry Template

Duplicate this section for every relevant category. Replace `SVC-NNN` with the next unique ID.

## SVC-NNN — Service or Category Title

- Category:
- Need:
- Candidates:
- Decision: selected | deferred | not-needed | rejected
- Selected service:
- Reason:
- References:
- Verified on:
- Owner:
- Plan and budget:
- Limits:
- Integration points:
- Readiness criteria:
- Status: candidate | approved | setup | ready | blocked | degraded | retired
- Fallback:
- Lock-in / exit cost:
- Decision link:
- Things to avoid:
- Learnings:

### Blocker Escalation

Complete every field below when status is `blocked`. Keep safe independent work moving while the blocker is unresolved.

- Blocker:
- Impact:
- Attempted:
- Codex can do:
- User action required:
- Expected result:
- Unblocked when:
- Fallback and deadline:
