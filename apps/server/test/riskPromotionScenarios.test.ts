/**
 * The frozen T0.2 scenarios, run through the T1.2 promotion engine.
 *
 * This is where the two halves meet. T0.2 pre-registered what each scenario must produce,
 * before any engine existed; T1.2 wrote the rules without being allowed to look at market
 * outcomes. This suite checks the engine against those pre-registrations.
 *
 * It also RESOLVES the open rule T0.2 §5 deferred. Scenario C clears the "two genuinely
 * independent origins" bar with no official confirmation anywhere, so the literal §0.7 rule
 * permits PROTECT. The self-revision rule frozen in `promote.ts` is what decides it, and the
 * decision is recorded here as an executable assertion rather than as prose.
 *
 * Market confirmation is T3.x work and does not exist yet. Rather than guess at it, every
 * scenario is evaluated under BOTH branches — confirmed and not — so the evidence-side
 * determination is pinned independently of a component that has not been built.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promote, type EvidenceClaim } from "../src/risk/promote.js";
import type { ConfirmationStatus, RiskState } from "../src/risk/types.js";

const scenariosDir = join(dirname(fileURLToPath(import.meta.url)), "..", "scenarios");
const readScenario = (file: string) => JSON.parse(readFileSync(join(scenariosDir, file), "utf8"));

const A = readScenario("scenario-a-rumor-watch.json");
const B = readScenario("scenario-b-confirmed-protect.json");
const C = readScenario("scenario-c-two-origins-hard-case.json");
const D = readScenario("scenario-d-neutral-normal.json");

const epoch = (iso: string) => Math.floor(Date.parse(iso) / 1000);

/**
 * Maps a frozen fixture claim onto the engine's input shape.
 *
 * `selfRevised` is derived from the fixture's own `revisesClaim` pointer rather than being
 * asserted here, so the engine sees what the frozen evidence actually recorded.
 */
function toClaim(raw: any): EvidenceClaim {
  return {
    claimId: raw.claimId,
    sourceClass: raw.sourceClass,
    independenceGroup: raw.independenceGroup,
    relation: raw.relation,
    publishedAt: epoch(raw.publishedAt),
    officialConfirmation: Boolean(raw.officialConfirmation),
    materiality: raw.materiality,
    selfRevised: raw.revisesClaim !== undefined,
  };
}

function runScenario(
  scenario: any,
  status: ConfirmationStatus,
  overrides: { officialEvidencePassed?: boolean } = {},
) {
  const now = epoch(scenario.decisionAnchor.at);
  return promote({
    claims: scenario.claims.map(toClaim),
    marketConfirmation: { status, observedAt: now - 60 },
    now,
    currentState: "NORMAL",
    resolutionOutcome: "RESOLVED",
    officialEvidencePassed: overrides.officialEvidencePassed ?? false,
  });
}

const ALL_STATUSES: ConfirmationStatus[] = ["CONFIRMED", "NOT_CONFIRMED", "UNAVAILABLE", "STALE"];

test("scenario A holds at WATCH under every market condition, as pre-registered", () => {
  assert.equal(A.preRegisteredExpectation.state, "WATCH");
  assert.equal(A.preRegisteredExpectation.mustHoldRegardlessOfMarketData, true);

  for (const status of ALL_STATUSES) {
    const result = runScenario(A, status);
    assert.equal(result.state, "WATCH", `scenario A moved off WATCH with market ${status}`);
    assert.equal(result.aggressiveFeeAuthorized, false);
  }

  const confirmed = runScenario(A, "CONFIRMED");
  assert.ok(confirmed.reasonCodes.includes("SINGLE_SOURCE"));
  assert.ok(confirmed.reasonCodes.includes("DUPLICATE_SYNDICATION"));
  assert.equal(
    confirmed.independentSourceCount,
    1,
    "CNBC, The Next Web and DataCenterDynamics all carry one WSJ story — that is one source",
  );

  // Note the reason code that is deliberately ABSENT: scenario A is not `RUMOR_ONLY`, because
  // it also carries real NEWS claims. The simulated rumour rides along without adding any
  // authority, which is a different — and more realistic — shape than a pure rumour set.
  assert.equal(confirmed.reasonCodes.includes("RUMOR_ONLY"), false);
  assert.equal(confirmed.highestSourceClass, "NEWS");
});

test("scenario A's rumour, taken alone, is capped by the rumour invariant itself", () => {
  // The complement of the test above: strip the NEWS claims and the hard cap is what holds it.
  const rumourClaims = A.claims.filter((c: any) => c.sourceClass === "RUMOR").map(toClaim);
  assert.equal(rumourClaims.length, 1, "scenario A carries exactly one simulated rumour");

  const now = epoch(A.decisionAnchor.at);
  const result = promote({
    claims: rumourClaims,
    marketConfirmation: { status: "CONFIRMED", observedAt: now - 60 },
    now,
    currentState: "NORMAL",
    resolutionOutcome: "RESOLVED",
    officialEvidencePassed: true,
  });

  assert.equal(result.state, "WATCH");
  assert.ok(result.reasonCodes.includes("RUMOR_ONLY"));
  assert.match(result.explanation, /never authorise the aggressive fee path/);
});

test("scenario B reaches PROTECT only with the bonded path AND fresh confirmation", () => {
  assert.equal(B.preRegisteredExpectation.state, "PROTECT");

  const full = runScenario(B, "CONFIRMED", { officialEvidencePassed: true });
  assert.equal(full.state, "PROTECT");
  assert.equal(full.aggressiveFeeAuthorized, true);
  assert.ok(full.reasonCodes.includes("OFFICIAL_FILING"));
  assert.ok(full.reasonCodes.includes("BONDED_EVIDENCE_PASSED"));

  // The pre-registered fallback: if the market cannot corroborate, the answer is WATCH.
  assert.equal(B.preRegisteredExpectation.ifMarketConfirmationFails.state, "WATCH");
  for (const status of ["NOT_CONFIRMED", "UNAVAILABLE", "STALE"] as ConfirmationStatus[]) {
    const degraded = runScenario(B, status, { officialEvidencePassed: true });
    assert.equal(degraded.state, "WATCH", `scenario B promoted with market ${status}`);
  }

  // An official filing whose bonded checks did not pass is not a licence to act.
  const unbonded = runScenario(B, "CONFIRMED", { officialEvidencePassed: false });
  assert.equal(unbonded.state, "WATCH");
});

test("scenario C resolves to WATCH — the open rule from T0.2 §5, now decided", () => {
  // T0.2 deliberately left this undecided so the rule could not be fitted to an outcome.
  assert.equal(C.preRegisteredExpectation.state, "UNDETERMINED_PENDING_RULE_DECISION");
  assert.deepEqual(
    C.preRegisteredExpectation.permittedOutcomes.map((o: any) => o.state).sort(),
    ["PROTECT", "WATCH"],
  );

  // C genuinely clears the two-independent-origin bar on its face: WSJ and The Information.
  assert.equal(C.independenceSummary.distinctOrigins, 2);

  const result = runScenario(C, "CONFIRMED");

  // The decision. The WSJ line revised its own figure from $250bn to below $120bn inside the
  // window, so it cannot serve as corroboration of a number it was itself wrong about. That
  // leaves one usable origin, which is below the bar.
  assert.equal(result.state, "WATCH");
  assert.equal(result.aggressiveFeeAuthorized, false);
  assert.equal(result.independentSourceCount, 1);
  assert.match(result.explanation, /materially revised its own figure/);

  // The chosen branch must be one the pre-registration actually permitted.
  assert.ok(
    C.preRegisteredExpectation.permittedOutcomes.some((o: any) => o.state === result.state),
    "the engine produced an outcome T0.2 did not list as permissible",
  );

  // And it must hold under every market condition, since the block is on the evidence side.
  for (const status of ALL_STATUSES) {
    assert.equal(runScenario(C, status).state, "WATCH");
  }
});

test("scenario C would have promoted without the self-revision rule — the rule is load-bearing", () => {
  // Strip the revision pointer and the same evidence clears the bar. This is what makes the
  // frozen rule the actual decider rather than an incidental detail, and it is why the rule
  // had to be fixed before C's market data was scored.
  const withoutRevision = promote({
    claims: C.claims.map((raw: any) => ({ ...toClaim(raw), selfRevised: false })),
    marketConfirmation: { status: "CONFIRMED", observedAt: epoch(C.decisionAnchor.at) - 60 },
    now: epoch(C.decisionAnchor.at),
    currentState: "NORMAL",
    resolutionOutcome: "RESOLVED",
    officialEvidencePassed: false,
  });

  assert.equal(withoutRevision.state, "PROTECT");
  assert.equal(withoutRevision.independentSourceCount, 2);
});

test("scenario D stays at NORMAL — a routine Form 4 is official but not material", () => {
  assert.equal(D.preRegisteredExpectation.state, "NORMAL");
  assert.equal(D.preRegisteredExpectation.mustHoldRegardlessOfMarketData, true);

  for (const status of ALL_STATUSES) {
    const result = runScenario(D, status, { officialEvidencePassed: true });
    assert.equal(result.state, "NORMAL", `the neutral control moved with market ${status}`);
    assert.equal(result.aggressiveFeeAuthorized, false);
    assert.ok(result.reasonCodes.includes("NON_MATERIAL_EVENT"));
  }
});

test("no frozen scenario authorises an aggressive fee outside PROTECT", () => {
  // The invariant a reviewer most wants to spot-check, stated once over the whole set.
  for (const [name, scenario] of [["A", A], ["B", B], ["C", C], ["D", D]] as const) {
    for (const status of ALL_STATUSES) {
      for (const bonded of [false, true]) {
        const result = runScenario(scenario, status, { officialEvidencePassed: bonded });
        assert.equal(
          result.aggressiveFeeAuthorized,
          result.state === "PROTECT",
          `${name} authorised a fee in state ${result.state}`,
        );
      }
    }
  }
});

test("every scenario's result is reproducible and carries the policy version", () => {
  for (const scenario of [A, B, C, D]) {
    const first = runScenario(scenario, "CONFIRMED", { officialEvidencePassed: true });
    const second = runScenario(scenario, "CONFIRMED", { officialEvidencePassed: true });
    assert.deepEqual(first, second);
    assert.equal(first.policyVersion, "tinjau.policy/1.0.0");
  }
});
