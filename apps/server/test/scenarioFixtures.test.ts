/**
 * Pins task T0.2's frozen demo scenarios (`apps/server/scenarios/`).
 *
 * These fixtures are immutable inputs to every later task: the promotion rules (T1.2), the
 * Evidence Graph (T2.x), market confirmation (T3.x), both end-to-end proofs (T4.4/T4.5) and
 * the three-policy benchmark (T5.x) all read them. So this suite guards the properties that
 * would silently invalidate that downstream work if they drifted:
 *
 *   - the byte-pinned source documents are present and hash to their frozen sha256
 *   - the simulated rumour is unmistakably marked simulated and carries no resolvable URL
 *   - official claims really do point at SEC EDGAR and commit to a hash we can recompute
 *   - syndicated copies of one origin share ONE independence group (the invariant that
 *     stops several outlets from looking like several independent sources)
 *   - the unconditional expectations (A's WATCH, D's NORMAL) stay unconditional, so nobody
 *     can quietly relax them to match a buggy engine
 *   - the ambiguous case C keeps its outcome UNDECIDED, so the promotion rule cannot be
 *     reverse-engineered from whichever answer scores better
 *   - the four scenarios still cover every evidence category tracker §0.13 demands
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scenariosDir = join(dirname(fileURLToPath(import.meta.url)), "..", "scenarios");

function readJson(relativePath: string): any {
  return JSON.parse(readFileSync(join(scenariosDir, relativePath), "utf8"));
}

function sha256(relativePath: string): string {
  return createHash("sha256").update(readFileSync(join(scenariosDir, relativePath))).digest("hex");
}

const manifest = readJson("manifest.json");
const scenarios: Record<string, any> = Object.fromEntries(
  manifest.scenarios.map((entry: any) => [entry.scenarioId, readJson(entry.file)]),
);
const all = Object.values(scenarios);

test("every manifest-listed source exists and matches its frozen sha256 and byte length", () => {
  // Six: the 8-K, its Exhibit 99.1, the 8-K directory listing, the simulated rumour, and —
  // added in T2.1 once the normaliser made a byte commitment mandatory for every OFFICIAL
  // claim — scenario D's Form 4 and its directory listing.
  assert.equal(manifest.immutableSources.length, 6);
  for (const source of manifest.immutableSources) {
    assert.equal(sha256(source.path), source.sha256, `sha256 drift in ${source.path}`);
    assert.equal(
      readFileSync(join(scenariosDir, source.path)).byteLength,
      source.bytes,
      `byte-length drift in ${source.path}`,
    );
  }
});

test("the simulated rumour is unmistakably labelled and has no resolvable source URL", () => {
  const rumour = readJson("sources/simulated-rumor-2026-07-27-social.json");

  assert.equal(rumour.dataMode, "SIMULATED");
  assert.equal(rumour.sourceClass, "RUMOR");
  assert.equal(rumour.sourceUrl, null);
  assert.match(rumour.sourceId, /^simulated:\/\//);
  assert.match(rumour._WARNING, /SIMULATED DOCUMENT — NOT A REAL SOCIAL MEDIA POST/);
  assert.equal(rumour.officialConfirmationAtPublication, false);

  // Wherever this fixture is referenced — in-window or disclosed as out-of-window — it must
  // keep both labels. A RUMOR claim that loses `dataMode: SIMULATED` becomes a lie.
  const referencing = all.flatMap((s: any) =>
    [...s.claims, ...(s.outOfWindowEvidence ?? [])].filter((c: any) => c.sourceId === rumour.sourceId),
  );
  assert.ok(referencing.length >= 1);
  for (const claim of referencing) {
    assert.equal(claim.sourceClass, "RUMOR");
    assert.equal(claim.dataMode, "SIMULATED");
    assert.equal(claim.sourceUrl ?? null, null);
  }
});

test("no RUMOR claim anywhere is dressed up as observed data", () => {
  for (const scenario of all) {
    for (const claim of scenario.claims) {
      if (claim.sourceClass !== "RUMOR") continue;
      assert.equal(claim.dataMode, "SIMULATED", `${claim.claimId} must stay SIMULATED`);
      assert.equal(claim.sourceUrl, null, `${claim.claimId} must not carry a resolvable URL`);
      assert.equal(claim.officialConfirmation, false);
    }
  }
});

test("official claims point at SEC EDGAR, and locally stored ones hash to their commitment", () => {
  const official = all.flatMap((s: any) => s.claims.filter((c: any) => c.sourceClass === "OFFICIAL"));
  assert.equal(official.length, 3, "two documents in scenario B, one Form 4 in scenario D");

  for (const claim of official) {
    assert.match(claim.sourceUrl, /^https:\/\/www\.sec\.gov\/Archives\/edgar\/data\//);
    assert.equal(claim.dataMode, "REPLAY");
    assert.equal(claim.officialConfirmation, true);
    if (claim.sourceLocalPath) {
      assert.equal(sha256(claim.sourceLocalPath), claim.sourceContentSha256);
    }
  }

  const primary = scenarios["B-confirmed-protect"].claims.find((c: any) => c.claimId === "claim-b-001");
  assert.equal(primary.accessionNumber, "0001045810-26-000069");
  assert.equal(primary.secForm, "8-K");
  assert.deepEqual(primary.secItems, ["1.01", "2.03", "7.01"]);
  assert.equal(primary.materiality, "MATERIAL");
});

test("syndicated copies of one origin collapse into a single independence group", () => {
  // Scenario A is the pure single-origin case: several outlets, one Wall Street Journal story.
  const news = scenarios["A-rumor-watch"].claims.filter((c: any) => c.sourceClass === "NEWS");
  assert.ok(news.length >= 3, "the story was carried by several outlets");

  const groups = new Set(news.map((c: any) => c.independenceGroup));
  assert.equal(groups.size, 1, "several outlets, one origin — they must not look independent");

  const origins = news.filter((c: any) => c.relation === "ORIGIN");
  assert.equal(origins.length, 1);
  assert.match(origins[0].publisherOrAuthor, /Wall Street Journal/);

  // Every duplicate must name the origin it copies, in every scenario.
  for (const scenario of all) {
    const byId = new Map<string, any>(scenario.claims.map((c: any) => [c.claimId, c]));
    for (const duplicate of scenario.claims.filter((c: any) => c.relation === "DUPLICATE")) {
      assert.ok(duplicate.duplicateOf, `${duplicate.claimId} must name its origin`);
      const origin = byId.get(duplicate.duplicateOf);
      assert.ok(origin, `${duplicate.claimId} points at a claim not in this scenario`);
      assert.equal(origin.independenceGroup, duplicate.independenceGroup);
    }
  }
});

test("scenario C really does contain two independent origins", () => {
  const c = scenarios["C-two-origins-hard-case"];
  const groups = new Set(
    c.claims.filter((x: any) => x.sourceClass === "NEWS").map((x: any) => x.independenceGroup),
  );
  assert.equal(groups.size, 2, "the hard case is only hard if the origins are genuinely two");
  assert.equal(c.independenceSummary.distinctOrigins, 2);
  assert.deepEqual([...groups].sort(), [...c.independenceSummary.origins].sort());

  // No official confirmation exists at C's anchor — that is what makes it the boundary case.
  assert.equal(c.claims.some((x: any) => x.sourceClass === "OFFICIAL"), false);
  for (const claim of c.claims) assert.equal(claim.officialConfirmation, false);
});

test("the unconditional expectations stay unconditional", () => {
  const a = scenarios["A-rumor-watch"].preRegisteredExpectation;
  assert.equal(a.state, "WATCH");
  assert.equal(a.aggressiveFeeAuthorized, false);
  assert.equal(a.mustHoldRegardlessOfMarketData, true);
  assert.ok(a.falsificationCondition.length > 0);
  for (const claim of scenarios["A-rumor-watch"].claims) {
    assert.equal(claim.officialConfirmation, false, `${claim.claimId} must be unconfirmed`);
  }

  const d = scenarios["D-neutral-normal"].preRegisteredExpectation;
  assert.equal(d.state, "NORMAL");
  assert.equal(d.aggressiveFeeAuthorized, false);
  assert.equal(d.mustHoldRegardlessOfMarketData, true);
  assert.ok(d.falsificationCondition.length > 0);
  // The neutral probe is official but non-material. Both halves matter.
  const form4 = scenarios["D-neutral-normal"].claims[0];
  assert.equal(form4.sourceClass, "OFFICIAL");
  assert.equal(form4.materiality, "NON_MATERIAL");
  assert.deepEqual(form4.secItems, []);
});

test("the ambiguous case stays undecided and names the rule that must decide it", () => {
  const c = scenarios["C-two-origins-hard-case"].preRegisteredExpectation;
  assert.equal(c.state, "UNDETERMINED_PENDING_RULE_DECISION");
  assert.ok(c.openRuleQuestion.length > 0);
  assert.deepEqual(c.permittedOutcomes.map((o: any) => o.state).sort(), ["PROTECT", "WATCH"]);
  assert.match(c.hardConstraint, /BEFORE/);
  assert.match(c.notPermitted, /after seeing/);
});

test("scenario B's promotion is conditional on market confirmation, never assumed", () => {
  const b = scenarios["B-confirmed-protect"].preRegisteredExpectation;
  assert.equal(b.state, "PROTECT");
  assert.match(b.conditionalOn, /CONFIRMED/);
  assert.equal(b.ifMarketConfirmationFails.state, "WATCH");
  assert.ok(b.recoveryExpectation.length > 0);
});

test("every scenario resolves to the same asset, pool and a window inside the pool's life", () => {
  const firstPoolBlock = Number(manifest.asset.xLayer.referencePool.firstBlockWithCode);

  for (const scenario of all) {
    assert.equal(scenario.asset.cik, "0001045810");
    assert.equal(scenario.asset.tokenSymbol, "wNVDAx");
    assert.equal(scenario.asset.tokenAddress, manifest.asset.xLayer.tradedToken.address);
    assert.equal(scenario.asset.poolIdOrAddress, manifest.asset.xLayer.referencePool.address);
    assert.equal(scenario.asset.chainId, 196);

    for (const claim of scenario.claims) {
      assert.equal(claim.tokenAddress, manifest.asset.xLayer.tradedToken.address);
    }
  }

  for (const entry of manifest.scenarios) {
    assert.ok(Number(entry.marketWindowBlocks[0]) > firstPoolBlock);
    assert.equal(entry.usReferenceMarketOpen, false, "every anchor must land with the US market shut");
  }
});

test("claims never fall outside the evidence window they are filed under", () => {
  for (const scenario of all) {
    const from = Date.parse(scenario.evidenceWindow.from);
    const to = Date.parse(scenario.evidenceWindow.to);

    for (const claim of scenario.claims) {
      const at = Date.parse(claim.publishedAt);
      assert.ok(at <= to, `${claim.claimId} is published after ${scenario.scenarioId}'s anchor`);
      // A claim admitted below `from` must say so explicitly rather than slip through.
      if (at < from) {
        assert.ok(
          claim.publishedAtNote || claim.clusterEarliestVerifiedAt,
          `${claim.claimId} predates the window without explaining why it was admitted`,
        );
      }
    }

    for (const excluded of scenario.outOfWindowEvidence ?? []) {
      assert.ok(excluded.reasonExcluded, `${excluded.claimId} must say why it was excluded`);
    }
  }
});

test("block numbers agree with X Layer's one-block-per-second timestamp relation", () => {
  const offset = 1_718_769_036; // blockNumber = unixSeconds - offset
  const toUnix = (iso: string) => Math.floor(Date.parse(iso) / 1000);

  for (const entry of manifest.scenarios) {
    const scenario = scenarios[entry.scenarioId];
    assert.equal(Number(scenario.decisionAnchor.blockNumber), toUnix(scenario.decisionAnchor.at) - offset);
    assert.equal(Number(scenario.marketReplayWindow.fromBlock), toUnix(scenario.marketReplayWindow.from) - offset);
    assert.equal(Number(scenario.marketReplayWindow.toBlock), toUnix(scenario.marketReplayWindow.to) - offset);
    assert.equal(scenario.decisionAnchor.blockNumber, entry.anchorBlock);
    assert.deepEqual(
      [scenario.marketReplayWindow.fromBlock, scenario.marketReplayWindow.toBlock],
      entry.marketWindowBlocks,
    );
  }
});

test("the benchmark pre-registration stays bound to the frozen venue and event set", () => {
  const prereg = readJson("benchmark-preregistration.json");
  const pool = manifest.asset.xLayer.referencePool;

  // The pre-registration must describe the same pool the scenarios were frozen against.
  assert.equal(prereg.venue.pool, pool.address);
  assert.equal(prereg.venue.token0, pool.token0);
  assert.equal(prereg.venue.token1, pool.token1);
  assert.equal(prereg.venue.token1Symbol, "wNVDAx");
  assert.equal(prereg.venue.poolFee, 500);

  // The event set is exactly the four frozen scenarios, no more and no fewer.
  assert.deepEqual(
    [...prereg.eventSet.scenarios].sort(),
    manifest.scenarios.map((s: any) => s.scenarioId).sort(),
  );
  assert.equal(prereg.eventSet.mutable, false);

  // A scenario with no trades must be declared as a null economic row in both places.
  const nullRows = manifest.scenarios
    .filter((s: any) => !s.carriesEconomicRow)
    .map((s: any) => s.scenarioId);
  assert.deepEqual([...prereg.eventSet.nullEconomicRows].sort(), nullRows.sort());

  // The undecided scenario must be the one flagged for dual-branch reporting.
  const undecided = manifest.scenarios
    .filter((s: any) => scenarios[s.scenarioId].preRegisteredExpectation.state.startsWith("UNDETERMINED"))
    .map((s: any) => s.scenarioId);
  assert.deepEqual([...prereg.eventSet.dualBranchRows].sort(), undecided.sort());
});

test("the benchmark cannot quietly become a single-threshold or evidence-leaking comparison", () => {
  const prereg = readJson("benchmark-preregistration.json");
  const byId = Object.fromEntries(prereg.policies.map((p: any) => [p.id, p]));

  assert.deepEqual(Object.keys(byId).sort(), ["STATIC", "TINJAU", "VOLATILITY_ONLY"]);

  // The volatility baseline must stay blind to evidence — that is the whole comparison.
  assert.equal(byId.VOLATILITY_ONLY.seesEvidence, false);
  assert.equal(byId.STATIC.seesEvidence, false);
  assert.equal(byId.TINJAU.seesEvidence, true);

  // More than one k must survive, or the strongest could be picked after the fact.
  assert.ok(byId.VOLATILITY_ONLY.trigger.kGrid.length >= 3);

  // Both dynamic policies share one envelope, so the comparison measures signal, not cap.
  assert.deepEqual([...prereg.feeEnvelope.appliesTo].sort(), ["TINJAU", "VOLATILITY_ONLY"]);
  assert.equal(prereg.feeEnvelope.baseFee, prereg.venue.poolFee);

  // The claim gate defaults closed and the counterfactual bias stays declared unresolved.
  assert.equal(prereg.claimGate.defaultValue, false);
  assert.ok(prereg.claimGate.requiresAll.length >= 4);
  assert.equal(prereg.counterfactualLimitation.netSign, "UNDETERMINED");
  assert.equal(prereg.counterfactualLimitation.behaviouralModel, "OUT_OF_SCOPE");
  assert.equal(prereg.reporting.meanAloneAcceptable, false);
  assert.ok(prereg.failureConditions.conditions.length >= 5);
});

test("the frozen set covers every evidence category tracker §0.13 demands", () => {
  const coverage = manifest.coverageAgainstTrackerSection0_13;
  for (const key of [
    "materialNegativeOrDiscontinuousEvent",
    "neutralOrdinaryEvent",
    "falseOrOverstatedRumour",
    "ambiguousBoundaryCase",
    "degradedOrMissingMarketData",
  ]) {
    assert.ok(scenarios[coverage[key]], `§0.13 category ${key} points at no frozen scenario`);
  }

  // A scenario with no trades must not silently claim an economic row in the benchmark.
  for (const entry of manifest.scenarios) {
    assert.equal(
      entry.carriesEconomicRow,
      entry.observedSwapsInWindow > 0,
      `${entry.scenarioId} mislabels whether it can carry an economic row`,
    );
  }
});
