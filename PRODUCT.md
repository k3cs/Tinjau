# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, deployed on Vercel. [Inferred/delegated — the user asked me to answer setup questions on his behalf for this session rather than pause and ask; this stack was not explicitly requested.] Reasoning: Vercel is the mandated deploy target (task P0.12 in the project's own task tracker); Next.js is Vercel's native framework with the best support and lowest deploy friction; `apps/server` (the existing backend in this monorepo) already uses TypeScript + `viem@2.53.1` for on-chain reads, so the frontend reuses the same chain-client library and version for consistency; the product's core pages (holder digest, forward calendar) are read-only on-chain lookups that should run client-side (browser calls RPC directly) rather than round-tripping through a backend, which Next.js's client components support directly.

## Users

Primary: holders of tokenised US equities on X Layer (NVDAx, MSTRx, and eventually 8 more) who want to know "what happened to the tokens at this address while I was away" — a corporate-events history lookup with no wallet connection, no signature, and no gas, because the answer is a read, not a transaction. [Inferred from spec §4.4's explicit framing.]

Secondary: hackathon judges evaluating the submission (X Layer "Build X Series — AI Season" and Orion Builder Hackathon) — they need to quickly verify the product is real, deployed, and does what it claims, following a specific demo order the spec already defines (live record → holder digest → forward calendar → reaction-latency study → synthetic injection, last, clearly marked synthetic). [Confirmed from spec §5.3.]

Tertiary: anyone (trader, researcher, or the project's own X feed) who wants to see upcoming scheduled corporate events (dividend dates, split effective dates, earnings times) extracted from filings before they happen. [Confirmed from spec §4.4.]

## Product Purpose

Tinjau is a corporate-events oracle for tokenised equities on X Layer. Tokenised US equities trade 24/7, but the companies behind them file SEC disclosures (8-K material events, Form 4 insider trades) almost exclusively while the US market is closed — so nothing on-chain knows those documents exist until someone tells it. Tinjau runs an agent that polls SEC EDGAR, parses each filing three independent times with separate LLM calls into structured fields, diffs the three parses field-by-field, and posts the result on-chain — bonded in USD₮0, with a challenge window anyone can use to dispute a posted field by proving it doesn't match the source document. The frontend is where a holder or a judge actually sees this: a zero-wallet lookup of what happened to a given address's holdings, a forward calendar of what's scheduled next, and (later phases) a scoreboard and an X feed. [Confirmed from spec §1, §4.]

## Positioning

Not a claim — a bonded, disputable, per-field-verifiable on-chain record. A company's own investor-relations page or a third-party analyst thread asserts what happened; nothing forces it to be checked against the source document, and nothing lets a stranger profit from proving it wrong. Tinjau's registry entries carry (a) a SHA-256 hash of the exact source document, (b) a per-field agreement level showing how many of three independent LLM parses agreed on each fact, and (c) a USD₮0 bond that a successful challenger takes. A neighboring product that just summarizes filings with one LLM call cannot truthfully claim any of the three. [Confirmed from spec §1, §3, §4.2.]

## Operating Context

- Backend is real and already live on X Layer Testnet (chain 1952): `EventStateRegistry` contract at `0x713f45f44e74616898FB366E11881196221933aA`, holding one real posted event as of 2026-08-17 (a Strategy Inc / MSTR capital-raise 8-K, event id 1). The registry is genuinely public and readable by anyone — the frontend's job is to read it, not to trust a copy of it.
- Reference implementation for reading the registry already exists at `apps/server/src/chain/{registryAbi.ts,client.ts,readBack.ts}.ts` — reuse the ABI and address patterns from there rather than re-deriving them.
- Mock tokens exist on testnet standing in for the real wNVDAx/USDG (which have zero bytecode on testnet 1952) — the frontend must not silently present testnet mock-token data as if it were real mainnet holdings; this needs to be visually/textually disclosed wherever it appears, matching the project's established norm of never hiding a testnet-vs-mainnet distinction from a judge.
- Currently only NVDA and MSTR are "live" polled tickers; 8 more (AAPL, GOOGL, TSLA, META, SNDK, CRCL, COIN, AMZN) exist as configured-but-not-yet-polled rows. A holder-digest lookup against one of the other 8 tickers should degrase gracefully (e.g. "not yet tracked"), not error.
- Deadlines: Event A (X Layer) submission 2026-08-21 23:59 UTC; Event B (Orion) 2026-09-02 23:59 UTC. The frontend is on the Event A critical path (tasks P0.12, P3.1, P3.2, P3.3 in the project's task tracker) — it must exist and work by the first deadline.
- No design system, brand assets, logo, or visual identity exist yet for this product. This is the first visual work on it.

## Capabilities and Constraints

- **Holder digest** (task P3.1): paste any address → read on-chain token balances (NVDAx/MSTRx/wNVDAx/wMSTRx, or the testnet mock tokens when demoing testnet-only) via RPC directly from the browser → join against the registry's posted events for that token → show a per-token event list, each entry linking to its source document and its on-chain transaction. No wallet connection, no signature, no gas, ever — it is a read, and the UI must never imply otherwise (no "Connect Wallet" button anywhere on this surface).
- **Forward calendar** (task P3.2): a queryable read exposing future-dated fields already extracted from filings (dividend record/payment dates, split effective dates, announced earnings times) per token. NVDAx's 2026-08-26 earnings date is the one concrete instance that must resolve correctly, since it's the worked example judges will check.
- **Smoke test** (task P3.3): the holder digest must be verified against a real address with real history before this is considered done — not just tested against an empty/synthetic address.
- Constraint: the registry currently holds exactly one real posted event. The UI must handle "this address has zero registry history" as a normal, well-designed empty state, not an edge case to patch later — with 4.5 days left and one real event on-chain, most demo lookups will legitimately hit this state.
- Constraint: this is a hackathon submission judged partly on "product completeness" and "application of AI" — the UI needs to read as a finished product, not a scaffold, even though the underlying dataset is currently thin (one real event, testnet-only).
- Undecided: color palette, typography, and overall visual language are explicitly not part of this record — that decision belongs to new-work, not here.

## Brand Commitments

- Product name is fixed: **Tinjau** — renamed from AFTERHOURS on 2026-08-20, at Dien's request, one day before the Event A deadline. Domain: `tinjau.xyz`. X account: `@tinjauAI`. Older planning documents and historical task-tracker evidence entries still say "AFTERHOURS" in places — that's the correct record of what the product was called at the time that work was done, not a leftover to hunt down and scrub.
- No existing logo, color palette, or typography has been chosen. No visual assets exist yet.
- Tone precedent from the project's own writing (spec, validation docs): plain, factual, willing to state limitations and measured numbers rather than oversell — e.g. the project explicitly refuses to inflate a small measured result into a bigger claim. This factual, non-hype voice is a reasonable default to carry into UI copy, though it has not been explicitly confirmed as a binding brand rule.

## Evidence on Hand

- Real, live, on-chain data: `EventStateRegistry` at `0x713f45f44e74616898FB366E11881196221933aA` on X Layer testnet 1952 — one real event (id 1) as of 2026-08-17, MSTR capital-raise, readable via the ABI in `apps/server/src/chain/registryAbi.ts`.
- Real measurement studies already published and citable as evidence pages/content, not fabricated: `docs/buildx-orion-2026/outputs/05-build/reaction-latency-study.md` (n=46 filings, median 4.6-minute pool staleness) and `markout-study.md` (n=32 events, median $0.06 realised LP loss at 60 minutes). These are real, run, and safe to summarize in-product.
- No screenshots, logos, testimonials, or press exist. Do not fabricate any of these.
- Full architecture and design rationale: `docs/buildx-orion-2026/outputs/02-ideation/afterhours-spec.md` (source of truth for product facts — if this record and that file ever conflict, that file wins and this one should be corrected).

## Product Principles

1. **Never claim more than what's measured or posted on-chain.** The whole product's credibility rests on this; the UI must not editorialize or round a small number up. (Established project-wide norm, confirmed across every prior planning document.)
2. **Zero-wallet, zero-gas for read surfaces.** The holder digest and forward calendar are pure reads; never gate them behind a wallet connection.
3. **Disclose testnet/mock-token status wherever it's relevant**, rather than letting a judge discover it unaided — the project's own spec treats an unaided discovery of a non-canonical deployment as "misrepresentation," and a disclosed one as "competence."
4. **Design for a thin dataset, gracefully.** One real event, two live tickers, a testnet deployment — the UI must look intentional and complete at this scale, not like a placeholder waiting for more data.
5. **The product is evidence-shaped, not marketing-shaped**, even on a persuade-mode surface — every number shown should be traceable to something real (a tx hash, a source document, a published study).

## Accessibility & Inclusion

No product-specific accessibility requirement has been established beyond ordinary web standards. [Not explicitly confirmed — treat WCAG AA as the default floor per general practice, not a project-specific commitment.]
