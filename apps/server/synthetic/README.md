These are fabricated documents, not SEC filings. Neither file describes a real event —
both were written by the AFTERHOURS team for task P4.4 (end-to-end synthetic-injection
test of the parsing pipeline + `AfterhoursFeeHook` fee widening on X Layer Testnet).

## Files and their sha256 (of the exact committed HTML bytes)

| File | sha256 |
|---|---|
| `nvdax-8k-grave-bankruptcy.html` | `cec4a8eb4ac19d728c0cddccd5808a88f18081822c0ea37a3544f83f34e1a0c1` |
| `nvdax-8k-nonmaterial-annual-meeting.html` | `4899c46626c5fff7b0099b9e929cc2a9252ea3f4f1bf3f7a7b5aceccac20af80` |

Recompute with `shasum -a 256 <file>`. `apps/server/test/syntheticFiling.test.ts` pins both
hashes — editing either file's bytes without updating that test's constants fails CI.

## The `synthetic://` convention

Every event posted from one of these files carries self-identifying markers so nobody
reading the on-chain registry could mistake it for a real EDGAR filing:

- `sourceUrl` is always `synthetic://afterhours/P4.4/<filename>` — never a real EDGAR
  `https://www.sec.gov/Archives/...` URL.
- `accessionNumber` is `SYNTHETIC-P4.4-0001` / `SYNTHETIC-P4.4-0002` — not EDGAR's real
  `NNNNNNNNNN-YY-NNNNNN` format.
- `sourceContentHash` is the sha256 of the exact HTML file committed here, reproducible by
  anyone who clones this repo and hashes the file themselves.

## The HTML-comment banner trick

Each file opens with a large `<!-- ... -->` HTML comment stating plainly that the document
is fabricated. `stripFilingHtml()` (`apps/server/src/parsing/stripFilingHtml.ts`) strips
`<!-- -->` comments *before* the stripped text is ever handed to the LLM parser — so the
banner never contaminates the model's parse of the (fake) filing content. But the comment
**is** part of the raw bytes that `sourceContentHash` commits to on-chain: anyone who
retrieves `documentUrl`'s referenced file (this one, from the repo) and hashes it to verify
`sourceContentHash` sees the "SYNTHETIC DOCUMENT — NOT AN SEC FILING" warning before
anything else. This is deliberate: the bond claim is honest about what it's bonding
(exact bytes, hash-verifiable) while the model-facing text is undistorted by the warning.

## Arms

- `nvdax-8k-grave-bankruptcy.html` — **positive arm**. Item 1.03 (bankruptcy) with an
  Item 3.01 delisting notice attached, written to drive a maximum-severity, high-agreement
  path through the pipeline (tier 3 concern, `Form8K_Bankruptcy`).
- `nvdax-8k-nonmaterial-annual-meeting.html` — **negative control**. Item 5.07
  (annual-meeting voting results) — a real SEC item code with no clean mapping in the
  12-value off-chain `EVENT_TYPES` enum, written to produce genuine 3-way disagreement on
  `eventType` across the three independent LLM parses.

  Pre-registered expected behavior (written before either file was ever run against a live
  model): the three parses disagree on `eventType`, `buildAgreementReport()` returns
  `readyToPost === false`, and `postPipelineResult()` refuses to send any transaction — so
  the registry and the pool fee are left byte-for-byte unchanged by this arm.

  Fallback, also pre-registered: if the three parses unexpectedly agree and
  `readyToPost === true`, the control is NOT posted and NOT rewritten/retried (that would be
  p-hacking a control). Instead the modal eventType/tier/predicted fee is recorded via
  `expectedFee.ts` (no chain write) and reported to the orchestrator as a degraded result.
