/**
 * The four frozen T0.2 scenarios, run end to end through the real pipeline (task T4.1).
 *
 * Every stage is the production module — normalisation (T2.1), the Evidence Graph (T2.3), asset
 * resolution (T2.2), the market-confirmation engine over the captured mainnet swap window
 * (T3.3), and the orchestrator (T4.1). Nothing is stubbed and no fixture carries a pre-baked
 * answer.
 *
 * THE PUBLISHED, HONEST OUTCOMES:
 *
 *   A -> WATCH    one origin behind four outlets; market leg UNAVAILABLE (zero swaps)
 *   B -> WATCH    qualifying official evidence, but the market leg is NOT_CONFIRMED on the
 *                 mainnet replay. T0.2 pre-registered PROTECT *conditional on* fresh market
 *                 confirmation and pre-registered WATCH as the fallback when that fails. The
 *                 fallback is what happened. This is the published result and is NOT worked
 *                 around here.
 *   C -> WATCH    two origins on their face, but one revised its own figure inside the window
 *   D -> NORMAL   official provenance, no materiality
 *
 * WHAT THIS SUITE DELIBERATELY DOES NOT ASSERT: any threshold, signal value, or internal
 * verdict of `market/confirm.ts`. That module is owned elsewhere and its anti-wick rules are
 * being tightened. These tests assert the RISK STATE and the orchestrator's own behaviour, plus
 * the one market property that matters to the promotion gate: nothing confirmed.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runScenario } from "../src/decision/scenarioRunner.js";
import { decide } from "../src/decision/orchestrate.js";
import { normalizeClaims } from "../src/evidence/normalize.js";
import { buildEvidenceGraph } from "../src/evidence/graph.js";
import { resolveAsset } from "../src/evidence/assets.js";
import { confirmMarket, buildConfirmationInput } from "../src/market/confirm.js";
import { blockToUnixSeconds } from "../src/market/poolTelemetry.js";
import { FROZEN_ACTION_ENVELOPE as ENV } from "../src/decision/envelope.js";
import { FROZEN_PROMOTION_CONFIG as CFG } from "../src/risk/promotionConfig.js";
import type { RiskState } from "../src/risk/types.js";

const here = dirname(fileURLToPath(import.meta.url));
const scenariosDir = join(here, "..", "scenarios");
const fixturesDir = join(here, "..", "src", "market", "fixtures");

const readScenario = (file: string) => JSON.parse(readFileSync(join(scenariosDir, file), "utf8"));
const readSwaps = (id: string) =>
  JSON.parse(readFileSync(join(fixturesDir, `pool-scenario-${id}-swaps.json`), "utf8"));

interface Case {
  id: "a" | "b" | "c" | "d";
  label: string;
  file: string;
  expected: RiskState;
  /** The specific refusal the record must name, so §0.12 is checked and not assumed. */
  mustExplain: RegExp;
}

const CASES: Case[] = [
  {
    id: "a",
    label: "A",
    file: "scenario-a-rumor-watch.json",
    expected: "WATCH",
    mustExplain: /one independent origin|syndications of that origin/i,
  },
  {
    id: "b",
    label: "B",
    file: "scenario-b-confirmed-protect.json",
    expected: "WATCH",
    mustExplain: /market confirmation is not confirmed/i,
  },
  {
    id: "c",
    label: "C",
    file: "scenario-c-two-origins-hard-case.json",
    expected: "WATCH",
    mustExplain: /revised its own figure|independent origin/i,
  },
  {
    id: "d",
    label: "D",
    file: "scenario-d-neutral-normal.json",
    expected: "NORMAL",
    mustExplain: /no corporate action affecting obligations/i,
  },
];

const run = (c: Case, options = {}) => runScenario(readScenario(c.file), readSwaps(c.id), options);

// ---------------------------------------------------------------------------
// The headline result
// ---------------------------------------------------------------------------

test("all four frozen scenarios produce their pre-registered risk state end to end", () => {
  for (const c of CASES) {
    const decision = run(c);
    assert.equal(decision.record.state, c.expected, `scenario ${c.label}`);
    assert.equal(
      decision.record.action.authorized,
      c.expected === "PROTECT",
      `scenario ${c.label} authorised an action in state ${decision.record.state}`,
    );
  }
});

test("no frozen scenario authorises the aggressive fee path", () => {
  // The single invariant a reviewer most wants to spot-check, stated once over the whole set.
  for (const c of CASES) {
    const decision = run(c);
    assert.equal(decision.record.action.authorized, false);
    assert.equal(decision.record.action.requestedFee, null);
    assert.equal(decision.record.action.status, "NONE");
    assert.equal(decision.assessment.requestedFee, 0);
    assert.equal(decision.record.action.baseFee, String(ENV.baseFee));
    assert.equal(decision.record.action.maxFee, String(ENV.maxFee));
  }
});

test("every record explains its own specific refusal, not a generic one", () => {
  // §0.12, and the reason the `UNSUPPORTED_ASSET`-for-an-unknown-company defect was logged.
  for (const c of CASES) {
    const decision = run(c);
    assert.match(decision.record.humanExplanation, c.mustExplain, `scenario ${c.label}`);
    assert.ok(decision.record.reasonCodes.length > 0);
    assert.ok(
      decision.record.humanExplanation.includes("No bounded action is authorised"),
      `scenario ${c.label} did not state that no action was authorised`,
    );
  }
});

test("no scenario's market leg reaches CONFIRMED", () => {
  // The load-bearing market fact, asserted without touching any threshold or signal value.
  for (const c of CASES) {
    const decision = run(c);
    assert.notEqual(decision.effectiveConfirmation, "CONFIRMED", `scenario ${c.label}`);
    assert.notEqual(decision.record.marketConfirmation.status, "CONFIRMED");
    assert.equal(
      decision.record.reasonCodes.includes("MARKET_CONFIRMED"),
      false,
      `scenario ${c.label} claimed MARKET_CONFIRMED`,
    );
  }
});

test("no scenario claims dual-leg confirmation, because no OKX data covers any anchor", () => {
  // The T3.1 limitation, carried through to the record's own prose so no artifact can overstate
  // it downstream.
  for (const c of CASES) {
    const decision = run(c);
    assert.ok(
      decision.record.humanExplanation.includes("must not be described as dual-leg") ||
        decision.record.humanExplanation.includes("no artifact may describe this as dual-leg"),
      `scenario ${c.label} did not disclose the missing OKX leg`,
    );
    assert.equal(decision.record.marketConfirmation.okxReferencePrice, null);
  }
});

// ---------------------------------------------------------------------------
// Scenario A — the fail-closed case
// ---------------------------------------------------------------------------

test("scenario A: zero swaps produce a valid, explainable assessment rather than a throw", () => {
  const swaps = readSwaps("a");
  assert.equal(swaps.swapCount, 0, "the fixture must genuinely be empty for this to mean anything");

  const decision = run(CASES[0]);

  assert.equal(decision.record.state, "WATCH", "it neither threw nor silently promoted");
  assert.equal(decision.record.marketConfirmation.status, "UNAVAILABLE");
  assert.notEqual(
    decision.record.marketConfirmation.status,
    "NOT_CONFIRMED",
    "'could not look' and 'looked and saw nothing' must never collapse into one",
  );
  assert.ok(decision.record.reasonCodes.includes("MARKET_DATA_UNAVAILABLE"));

  // The absence of an observation is visible rather than disguised as a reading. `observedAt`
  // is NULL, not the assessment instant: a consumer computing `age = now - observedAt` from a
  // substituted timestamp would read a leg that was never observed as perfectly fresh, which
  // is the failure shape T3.1 removed by measuring OKX freshness from source time.
  assert.equal(decision.record.marketConfirmation.observedAt, null);
  assert.equal(decision.record.marketConfirmation.blockNumber, null);
  assert.equal(decision.record.marketConfirmation.xLayerPoolPrice, null);
  assert.equal(decision.record.marketConfirmation.drawdownBps, null);
  assert.equal(decision.record.marketConfirmation.fresh, false);
  assert.equal(decision.record.marketConfirmation.antiWickSatisfied, false);

  // And it is still a complete record: commitment, expiry, explanation, evidence.
  assert.match(decision.record.evidenceCommitment, /^0x[0-9a-f]{64}$/);
  assert.equal(decision.record.evidence.length, 5);
  assert.ok(Date.parse(decision.record.expiresAt) > Date.parse(decision.record.assessedAt));
});

test("`observedAt` is null only where nothing was observed, and never a lazy default", () => {
  // The inverse of the assertion above. A null that crept in as a default would be just as
  // wrong as a substituted timestamp — it would hide a real observation.
  const observedScenarios = CASES.filter((c) => c.id !== "a");
  assert.equal(observedScenarios.length, 3);

  for (const c of observedScenarios) {
    const m = run(c).record.marketConfirmation;
    assert.notEqual(m.observedAt, null, `scenario ${c.label} was observed but stamped null`);
    assert.match(m.observedAt as string, /^\d{4}-\d{2}-\d{2}T/);
    assert.notEqual(m.blockNumber, null, `scenario ${c.label} has a timestamp but no block`);
  }

  // The structural invariant, across the whole set: the timestamp and the block agree about
  // whether an observation exists, and an unobserved leg is never fresh.
  for (const c of CASES) {
    const m = run(c).record.marketConfirmation;
    assert.equal(
      m.observedAt === null,
      m.blockNumber === null,
      `scenario ${c.label}: observedAt and blockNumber disagree about whether a look happened`,
    );
    if (m.observedAt === null) assert.equal(m.fresh, false);
  }
});

test("UNAVAILABLE does not by itself imply a null timestamp", () => {
  // Recorded so a future reviewer does not tighten this into a false invariant. `UNAVAILABLE`
  // covers two different situations: scenario A's window, which contains no swaps at all, and
  // a window whose sample is below the engine's floor — the second of those HAS observations
  // and must keep its timestamp. Nullity tracks "was anything observed", not the status.
  const a = run(CASES[0]).record.marketConfirmation;
  assert.equal(a.status, "UNAVAILABLE");
  assert.equal(a.observedAt, null, "A genuinely observed nothing");
  assert.equal(readSwaps("a").swapCount, 0);
});

test("scenario A is labelled SIMULATED at the record level, because one claim is fabricated", () => {
  const decision = run(CASES[0]);
  assert.equal(decision.record.dataMode, "SIMULATED");

  const simulated = decision.record.evidence.filter((e) => e.dataMode === "SIMULATED");
  assert.equal(simulated.length, 1, "exactly one fabricated claim, per the T0.2 freeze");
  assert.equal(simulated[0].sourceUrl, null, "a fabricated claim must not carry a resolvable URL");
  assert.equal(simulated[0].sourceClass, "RUMOR");
});

test("scenario A's market leg cannot create a PROTECT even with the evidence at its strongest", () => {
  // Fail closed, stated as a counterfactual: even granting the bonded path, the missing market
  // leg keeps the state at WATCH.
  const decision = run(CASES[0], { officialEvidencePassed: true });
  assert.equal(decision.record.state, "WATCH");
  assert.equal(decision.record.action.authorized, false);
});

test("scenario A: a protection already running is NOT cancelled by the missing market data", () => {
  // §0.7's other half. Fail closed means refusing to START protection without evidence; it does
  // not mean tearing down protection that is already running because a feed went quiet.
  const swaps = readSwaps("a");
  const windowEnd = blockToUnixSeconds(swaps.toBlock);
  const started = windowEnd - 600;

  const decision = run(CASES[0], { current: { state: "PROTECT", protectStartedAt: started } });

  assert.equal(decision.record.state, "PROTECT");
  assert.equal(decision.protectStartedAt, started, "it kept its original start");
  assert.equal(
    decision.record.expiresAt,
    new Date((started + ENV.maxProtectDurationSec) * 1000).toISOString(),
    "the original expiry schedule continues unchanged",
  );
  assert.equal(decision.record.marketConfirmation.status, "UNAVAILABLE");
});

// ---------------------------------------------------------------------------
// Scenario B — the honest negative
// ---------------------------------------------------------------------------

test("scenario B: the evidence qualifies, and the MARKET leg is what withholds PROTECT", () => {
  // The distinction matters for the demo. B is not refused because its evidence is weak.
  const decision = run(CASES[1]);

  assert.equal(decision.record.state, "WATCH");
  assert.ok(decision.record.reasonCodes.includes("OFFICIAL_FILING"));
  assert.ok(decision.record.reasonCodes.includes("BONDED_EVIDENCE_PASSED"));
  assert.ok(decision.record.reasonCodes.includes("MARKET_NOT_CONFIRMED"));
  assert.match(decision.record.humanExplanation, /market confirmation is not confirmed/i);

  // T0.2's pre-registration named exactly this fallback.
  const scenario = readScenario(CASES[1].file);
  assert.equal(scenario.preRegisteredExpectation.state, "PROTECT");
  assert.equal(scenario.preRegisteredExpectation.ifMarketConfirmationFails.state, "WATCH");
});

test("scenario B would reach PROTECT if — and only if — its market leg confirmed", () => {
  // A COUNTERFACTUAL, clearly labelled as one. It isolates which leg is doing the refusing,
  // which is the question a judge will ask about the demo. It claims NOTHING about the real
  // market: the only thing changed is the confirmation verdict handed to the orchestrator, and
  // the observed run above is what is published.
  const scenario = readScenario(CASES[1].file);
  const swaps = readSwaps("b");
  const anchor = Math.floor(Date.parse(scenario.decisionAnchor.at) / 1000);
  const windowEnd = blockToUnixSeconds(swaps.toBlock);

  const claims = normalizeClaims(scenario.claims);
  const graph = buildEvidenceGraph(claims, windowEnd, CFG.evidenceWindowSec);
  const resolution = resolveAsset(
    scenario.asset.company,
    scenario.asset.tokenSymbol,
    scenario.asset.tokenAddress,
  );
  const confirmationInput = buildConfirmationInput(swaps, {
    anchorUnixSeconds: anchor,
    nowUnixSeconds: windowEnd,
    okx: null,
    usReferenceMarketOpen: false,
  });
  const observedVerdict = confirmMarket(confirmationInput);
  assert.notEqual(observedVerdict.status, "CONFIRMED", "the observed verdict is the negative one");

  const common = {
    eventKey: `tinjau.scenario/${scenario.scenarioId}`,
    now: windowEnd,
    claims,
    graph,
    resolution,
    confirmationInput,
    officialEvidencePassed: true,
    chainId: 196,
    registryAddress: "0x00000000000000000000000000000000000000c1" as const,
  };

  const observed = decide({ ...common, confirmation: observedVerdict });
  assert.equal(observed.record.state, "WATCH", "OBSERVED — the published result");

  const counterfactual = decide({
    ...common,
    confirmation: {
      ...observedVerdict,
      status: "CONFIRMED",
      observedAtUnixSeconds: windowEnd - 60,
      fresh: true,
    },
  });
  assert.equal(counterfactual.record.state, "PROTECT", "COUNTERFACTUAL — market leg forced");
  assert.equal(counterfactual.record.action.authorized, true);
  assert.equal(counterfactual.record.confidenceBand, "HIGH", "official evidence, so the top band");
  assert.equal(
    Number(counterfactual.record.action.requestedFee),
    counterfactual.policyTargetFee,
  );
  assert.ok(Number(counterfactual.record.action.requestedFee) <= ENV.maxFee);
});

// ---------------------------------------------------------------------------
// Determinism and idempotency, over the real scenarios
// ---------------------------------------------------------------------------

test("every scenario is reproducible: two runs are byte-identical", () => {
  for (const c of CASES) {
    const first = run(c);
    const second = run(c);
    assert.equal(first.assessmentId, second.assessmentId, `scenario ${c.label}`);
    assert.equal(first.digest, second.digest);
    assert.equal(JSON.stringify(first.record), JSON.stringify(second.record));
  }
});

test("the four scenarios have four distinct assessment ids and commitments", () => {
  const ids = new Set(CASES.map((c) => run(c).assessmentId));
  const commitments = new Set(CASES.map((c) => run(c).record.evidenceCommitment));
  assert.equal(ids.size, 4);
  assert.equal(commitments.size, 4);
});

test("assessing at the window end drops no evidence that the anchor would have kept", () => {
  // The `scenarioRunner` assesses at the END of the replay window so the market observation is
  // fresh. That choice must not quietly discard evidence, so both instants are compared.
  for (const c of CASES) {
    const scenario = readScenario(c.file);
    const anchor = Math.floor(Date.parse(scenario.decisionAnchor.at) / 1000);
    const windowEnd = blockToUnixSeconds(readSwaps(c.id).toBlock);

    const inWindow = (now: number) =>
      scenario.claims
        .filter((claim: { publishedAt: string }) => {
          const age = now - Math.floor(Date.parse(claim.publishedAt) / 1000);
          return age >= 0 && age <= CFG.evidenceWindowSec;
        })
        .map((claim: { claimId: string }) => claim.claimId);

    assert.deepEqual(
      inWindow(windowEnd),
      inWindow(anchor),
      `scenario ${c.label}: the two assessment instants disagree about which claims are in window`,
    );
  }
});

test("the record's rule versions identify every layer that produced it", () => {
  for (const c of CASES) {
    const decision = run(c);
    assert.equal(decision.ruleVersions.schema, "tinjau.risk/1.0.0");
    assert.equal(decision.ruleVersions.policy, "tinjau.policy/1.0.0");
    assert.ok(decision.ruleVersions.confirmation.length > 0);
    assert.equal(decision.record.policyVersion, "tinjau.policy/1.0.0");
    assert.equal(decision.record.schemaVersion, "tinjau.risk/1.0.0");
  }
});

test("every scenario resolves to the supported wNVDAx pool and is postable", () => {
  for (const c of CASES) {
    const decision = run(c);
    assert.equal(decision.record.assetAddress, "0xa8ddb5cd96b5222afe198316e9a57caa642850d5");
    assert.equal(decision.record.tokenSymbol, "wNVDAx");
    assert.equal(decision.record.poolIdOrAddress, "0x2a2b11730c2b6d99a58034a869dd810d7300a7b2");
    assert.equal(decision.postable, true, `scenario ${c.label} could not be posted on chain`);
  }
});
