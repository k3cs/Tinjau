# S5.2 — One frozen intake path, replaced by a live credential-free feed

**Artifact:** `docs/buildx-orion-2026/outputs/05-build/data/s5_2_news_intake_live.json`
**Runner:** `apps/server/src/studies/newsIntakeLive.ts`
**Reader:** `apps/server/src/news/readFeed.ts` (zero npm dependencies, `GET` only)
**Run:** 2026-08-21T18:26:48Z · feed fetched 2026-08-21T18:26:34Z
**Result:** 10 live SEC filings normalised, 10 collapsed to **1** independent origin, decision **NORMAL**

## What this is

Every claim that had ever reached this project's evidence graph was either `REPLAY` — frozen by
hand into `apps/server/scenarios/` during T0.2 — or `SIMULATED`, written by this project as a
negative control. SVC-007 said so plainly, and recorded the limitation that a replay fixture
"proves normalization, reasoning, safety, and demo reproducibility but not live discovery".

S5.1 tried to close that gap on the social side and could not. X answered `402 credits-depleted`
on every content-read endpoint, because `search/recent` is a paid tier. That block is recorded
unedited in `s5_1_x_listener_live.json`, and the lesson it left is the premise of this task: an
intake leg whose only source requires a purchase is not an intake leg.

This run reads a real feed, over HTTPS, with no account, no key, no paid tier, and no terms
accepted, and pushes what it finds through the unchanged pipeline:

```
GET SEC EDGAR company Atom feed  ->  parseFeedItems (hand-rolled, no parser dependency)
  ->  GET each filing index, sha256 the exact bytes
  ->  normalizeClaim (T2.1)      ->  deriveIndependence (T2.3)
  ->  buildEvidenceGraph (T2.3)  ->  resolveAsset (T2.2)
  ->  confirmMarket (T3.3)       ->  decide (T4.1)   ->  one decision record
```

`normalize.ts`, `graph.ts`, `assets.ts`, `confirm.ts`, `promote.ts`, `orchestrate.ts` and
`scenarioRunner.ts` are byte-identical before and after this task. The only thing that changed is
where the claims came from.

## Why SEC EDGAR, and not a news wire

Three credential-free candidates were probed live before a line of this was written. What each
actually returned is recorded in the artifact under `sourceChoice.alternativesProbed`.

| Candidate | Observed | Rejected because |
| --- | --- | --- |
| Yahoo Finance NVDA headline RSS | HTTP 200, 20 items | Most items were about other companies (Webull, Cummins, Coinbase); no publisher element, so the outlet would have to be guessed from the link host |
| `nvidianews.nvidia.com/releases.xml` | HTTP 200, 20 items | Mixes marketing posts with corporate announcements; a self-published release is not `OFFICIAL` here and would be `NEWS` from an interested party |
| `feeds.reuters.com/reuters/businessNews` | Did not resolve | Reuters no longer serves an open RSS feed |

SEC EDGAR wins on every axis that matters. It is the **origin**, not a report about the origin, so
nothing at intake can be a syndicated copy of something else. It timestamps acceptance to the
second. It publishes the document the claim points at, so a content hash commits to bytes a reader
can re-fetch. It needs only the descriptive `User-Agent` SEC requires of every requester — read
through the existing `getEdgarUserAgent()` (SVC-001), so no new service or contact detail was
introduced. And an 8-K is definitionally corporate news: it is the form a US registrant must file
to disclose a material event between periodic reports.

**What that choice does not do.** An 8-K is `OFFICIAL`, not `NEWS`. This replaces the frozen
intake path for *corporate disclosure*. It does not give this project live third-party press
intake, and every `NEWS`-class claim in the product is still the frozen `REPLAY` fixture. SVC-007's
limitation has to be rewritten to say exactly that, not deleted.

## What was read

The CIK came from `SUPPORTED_ASSETS` rather than being typed. The registry holds exactly one
supported asset — wNVDAx, NVIDIA CORPORATION, CIK `0001045810` — one deliberately unsupported
sibling (NVDAx, no verified pool), and **no MSTR-linked asset at all**, so this study could not
have read a feed for one.

```
https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001045810
    &dateb=&owner=include&count=10&output=atom&type=8-K
```

HTTP 200 · `application/atom+xml` · charset `iso-8859-1` (from the XML prolog; the header sends
none) · 18,529 bytes · feed sha256 `0010a7cd…e90016` · 10 entries · 10 document fetches, 10 ok.

All 10 entries qualified. All 10 normalised with **zero provenance violations** and
`promotable: true`.

## The provenance of the newest claim

Newest filing, `edgar-0001045810-26-000069`. Every field is from the feed, from the fetched
document, or from the registry. Nothing is inferred, and the three fields that genuinely were not
available are recorded as unavailable rather than filled in.

| Field | Value | Where it came from |
| --- | --- | --- |
| `sourceClass` | `OFFICIAL` | an SEC filing on `www.sec.gov` |
| `dataMode` | `LIVE` | read during this run |
| `sourceUrl` | `https://www.sec.gov/Archives/edgar/data/1045810/000104581026000069/0001045810-26-000069-index.htm` | the entry's own `filing-href`, checked with `isRealSecFilingSourceUrl` before fetching |
| `sourceId` | `sec.gov/2026-08-17/0001045810-26-000069` | derived, origin-leading on purpose (see dedup) |
| `publisherOrAuthor` | `NVIDIA CORP — filed with the U.S. Securities and Exchange Commission (EDGAR), CIK 0001045810` | `conformed-name` from the feed + registry CIK |
| `publishedAt` | `2026-08-17T12:41:33.000Z` | `<updated>` = `2026-08-17T08:41:33-04:00`, converted, raw kept |
| `publishedAtPrecision` | `SECOND` | EDGAR states acceptance to the second |
| `sourceContentSha256` | `109763cb17fbb692b3ec88a56983303687ca15501e7f1cf10184be96c72f08d0` | sha256 over the 10,089 bytes that URL served |
| `company` / `tokenSymbol` / `tokenAddress` | NVIDIA CORPORATION / wNVDAx / `0xa8ddb5…50d5` | `evidence/assets.ts` |
| `eventType` | `UNKNOWN` | **unavailable** — mapping 8-K item codes needs a classifier this task did not authorise |
| `materiality` | `UNKNOWN` | **unavailable** — not determined; `promote.ts` fails closed on it |
| `expiresAt` | `null` | **unavailable** — no source fact supports a TTL for a filing |
| `assertionLevel` | `ASSERTED` | derived by `speculation.ts`; the structural hint `ASSERTED` was offered because the issuer signed the filing, and no weaker marker was found |

Anyone can check the hash:

```bash
curl -s -H "User-Agent: <your descriptive UA>" \
  "https://www.sec.gov/Archives/edgar/data/1045810/000104581026000069/0001045810-26-000069-index.htm" \
  | shasum -a 256
# 109763cb17fbb692b3ec88a56983303687ca15501e7f1cf10184be96c72f08d0
```

## The dedup, exercised on live data

`deriveIndependence` and `countDerivedIndependentOrigins` were run unmodified over the 10 live
claims. **10 filings collapsed to 1 independent origin** (`unrecognised:sec.gov`). Zero
syndications, zero unnamed relays, zero disagreements with the declared group.

That is the correct answer under §0.7 and it is the point of the exercise: ten filings by one
registrant through one channel are one source line and cannot corroborate each other, however many
of them there are. It is also the branch that matters for a primary source. The *attribution*
branch — "the Wall Street Journal reported" — was **not** exercised, because EDGAR filings do not
cite other outlets. That branch is still only proven by the frozen fixtures.

### A fragility this surfaced, reported and not patched

`graph.ts::ownOriginKey` derives an unrecognised publisher's origin from
`claim.sourceId.split("/")[0]`. The origin count is therefore a function of a shape the **intake
adapter** chooses. Had this adapter used EDGAR's own per-entry URN
(`urn:tag:sec.gov,2008:accession-number=…`) as `sourceId`, each filing would have become its own
origin and one registrant would have looked like ten independent sources — manufacturing exactly
the corroboration §0.7 exists to withhold.

This run avoids it by using an origin-leading `sourceId`, matching the frozen `NEWS` fixtures
(`cnbc.com/2026-08-15/…`, `wsj/2026-08-14/…`), which are origin-leading for the same reason. Note
that frozen scenario B's `OFFICIAL` claims use `edgar:<accession>/<doc>` instead, which would
*not* collapse across accessions. `graph.ts` was not touched by this task; the fragility is
recorded in the artifact under `dedup.observedFragility` for whoever owns T2.3 next.

## The decision

**State: `NORMAL`.** Reason codes: `INSUFFICIENT_SAMPLE`, `MARKET_DATA_UNAVAILABLE`,
`NON_MATERIAL_EVENT`, `REFERENCE_MARKET_CLOSED`, `STALE_EVIDENCE`. Confidence `LOW`, market
confirmation `UNAVAILABLE`.

The engine's own sentence: *"The only evidence in window reports no corporate action affecting
obligations, solvency, or listing status, so the risk state is unchanged. Official provenance does
not by itself make an event material."*

Three gates each block `PROTECT` independently, and the artifact records all three rather than
whichever fired first:

1. every live claim's `materiality` is `UNKNOWN`, and `promote.ts` treats that as non-material;
2. the market leg is a pinned zero-swap replay window, so confirmation is `UNAVAILABLE`, and
   `mayReachProtect` requires exact `CONFIRMED`;
3. `officialEvidencePassed` is published as `false`, because this task did not run the bonded
   three-way parse and asserting that it passed would be a fabrication.

Gate 3 is the one to be suspicious of, so the same decision was recomputed with
`officialEvidencePassed: true` — the value every other published scenario uses. **The state is
`NORMAL` either way.** The refusal is on the merits, not an artefact of assuming the bond failed.

### Invariants

| Invariant | Held |
| --- | --- |
| `INV-DEDUP-ONE-ORIGIN` — copies of one origin count as one source | ✅ 10 → 1 |
| `INV-MARKET-EXACT-CONFIRMED` — only exact `CONFIRMED` satisfies a gate | ✅ `UNAVAILABLE` → no promotion |
| `INV-MATERIALITY-FAILS-CLOSED` — `UNKNOWN` materiality cannot promote | ✅ `NON_MATERIAL_EVENT` emitted |
| `INV-SINGLE-NEWS-CANNOT-PROTECT` — one news source alone is never enough | ⚠️ not exercised: highest class present is `OFFICIAL` |

The fourth is honestly not exercised here. This run carries no `NEWS`-class claim, so the NEWS
branch of `mayReachProtect` was never entered; it remains proven by
`test/riskPromotionScenarios.test.ts` and by frozen scenario C, not by this artifact.

## One thing worth checking, that checked out

Frozen scenario B pins its decision anchor to the EDGAR acceptance timestamp of accession
`0001045810-26-000069`, hand-verified during T0.2 as `2026-08-17T12:41:33Z`. The live feed named
the same accession and gave `2026-08-17T08:41:33-04:00` — the same instant, to the second. The
hand-frozen value and the live read agree exactly.

That verifies the reader, not the engine. It is in the artifact as `crossCheck`.

## What this does not establish

The full list is in the artifact's `limitations` array (12 entries). The four that matter most:

- **One read is not monitoring.** This is one fetch of one feed at one moment. It measures nothing
  about latency and nothing about coverage. No process polls EDGAR as part of this study.
- **`OFFICIAL` is not `NEWS`.** Live third-party press intake remains unbuilt. SVC-007's status
  changes for corporate disclosure only.
- **The materiality gate cuts both ways, and the honest reading is not flattering.** A filing whose
  own SEC summary reads *"Item 1.01: Entry into a Material Definitive Agreement"* still came out as
  `NON_MATERIAL_EVENT`, because nothing in this run classified it. That is safe in the sense that
  it cannot raise a fee for nothing. It is **not** evidence that the pipeline would notice a
  material event. It is a missing classifier, not a virtue.
- **The market leg is still a fixture.** Scenario A's zero-swap chain-196 window was used — not
  scenario B's, even though the newest live filing *is* scenario B's 8-K — precisely because a
  zero-swap window cannot flatter the outcome. A live market capture was out of scope and would
  have been a second live input nobody reviewed.

## Reproducing it

```bash
cd apps/server
EDGAR_USER_AGENT="<your name and contact>" npx tsx src/studies/newsIntakeLive.ts
```

Read-only: `news/readFeed.ts` has exactly one request primitive and it hardcodes `method: "GET"`.
Nothing is posted, submitted, or subscribed to. `--help` prints the flags and exits before any
file read or network call.
