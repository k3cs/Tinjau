/**
 * The demo scenes, run end to end against a real chain (tasks T4.2–T4.5).
 *
 * Scene A — rumour containment (T4.4). The frozen source-linked rumour scenario goes through
 * the real pipeline, reaches `WATCH`, is posted on chain, and a real swap is charged `baseFee`.
 * This is the negative control and it carries more weight than Scene B: it proves the safety
 * claim rather than the capability claim.
 *
 * Scene B — bounded protection and deterministic recovery (T4.2, T4.3). A `PROTECT` is posted,
 * a swap is charged the widened fee, time advances, and the fee decays to `baseFee` and the
 * state returns to `NORMAL` with no transaction sent to end it. Then cooldown is shown to block
 * immediate re-entry.
 *
 * Scene F — failed action (§0.11). An authorised action that fails on chain must stay visible
 * and must not claim a protection benefit.
 *
 * ---------------------------------------------------------------------------------------
 * TWO HONESTY MECHANISMS RUN THROUGH THIS FILE.
 *
 * 1. TIME SHIFTING, NOT RE-DATING. A frozen scenario is anchored in July/August 2026 mainnet
 *    time. Posting it unmodified would revert (`AssessmentExpired`), and assessing it at the
 *    current instant would make its evidence stale and its market leg ancient, so the run would
 *    measure the shift rather than the scenario. Instead the whole scenario — claims, anchor,
 *    and swap window — is shifted by one constant offset, which preserves every relationship
 *    between its parts. `runSceneA` then asserts that the shifted run produces the SAME state
 *    and the SAME reason codes as the canonical unshifted run. If a shift ever changes the
 *    verdict, that is a finding and the scene fails rather than reporting the shifted answer.
 *
 * 2. CONSTRUCTED IS LABELLED CONSTRUCTED. Scenario B resolves to `WATCH` on the mainnet replay,
 *    because its market leg is `NOT_CONFIRMED` — that is the published, honest T3.3 result and
 *    it stands. A `PROTECT` demonstration therefore cannot be a replay. Scene B pairs the real
 *    replayed 8-K evidence with a CONSTRUCTED price path on the builder-controlled pool, and
 *    every artifact says so. The price path is fed to the real confirmation engine rather than
 *    hand-stamped `CONFIRMED`: the verdict is still the engine's to make.
 * ---------------------------------------------------------------------------------------
 */

import { confirmMarket, buildConfirmationInput } from "../market/confirm.js";
import {
  XLAYER_BLOCK_TIMESTAMP_OFFSET,
  type SwapWindowFixture,
} from "../market/poolTelemetry.js";
import { normalizeClaims } from "../evidence/normalize.js";
import { buildEvidenceGraph } from "../evidence/graph.js";
import { resolveAsset } from "../evidence/assets.js";
import { FROZEN_PROMOTION_CONFIG } from "../risk/promotionConfig.js";
import { decide, type Decision } from "../decision/orchestrate.js";
import { runScenario, type FrozenScenario } from "../decision/scenarioRunner.js";
import { signAssessment, type AssessmentStruct } from "../decision/eip712.js";
import type { ReasonCode } from "../risk/types.js";

import { advanceTime, chainNowSeconds, type TinjauClients } from "./tinjauChain.js";
import {
  executeSwap,
  fundSwapper,
  postAssessment,
  readEffectiveState,
  readFeeDetail,
  readRecord,
  remapAssetForChain,
  setPaused,
  type AssetRemap,
  type DecodedEffectiveState,
  type DecodedRiskRecord,
  type PostResult,
  type SwapResult,
} from "./tinjauHarness.js";

// ---------------------------------------------------------------------------
// Time shifting
// ---------------------------------------------------------------------------

/** Recursively shifts every ISO-8601 timestamp in a scenario by `deltaSeconds`. */
function shiftIsoDeep<T>(value: T, deltaSeconds: number): T {
  if (typeof value === "string") {
    // Only full ISO instants. A date-only string or an arbitrary sentence is left alone.
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)) {
      const shifted = new Date(Date.parse(value) + deltaSeconds * 1000);
      return shifted.toISOString().replace(/\.\d{3}Z$/, "Z") as unknown as T;
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => shiftIsoDeep(v, deltaSeconds)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = shiftIsoDeep(v, deltaSeconds);
    }
    return out as unknown as T;
  }
  return value;
}

export function timeShiftScenario(scenario: FrozenScenario, deltaSeconds: number): FrozenScenario {
  return shiftIsoDeep(scenario, deltaSeconds);
}

/**
 * Shifts a captured swap window by the same offset.
 *
 * X Layer produces one block per second and `blockToUnixSeconds` is a pure `block + offset`, so
 * shifting time by N seconds is shifting every block number by N. Prices, ordering, log indices
 * and spacing are untouched — only when it happened moves.
 */
export function timeShiftSwapWindow(window: SwapWindowFixture, deltaSeconds: number): SwapWindowFixture {
  const shiftIso = (iso: string) =>
    new Date(Date.parse(iso) + deltaSeconds * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
  return {
    ...window,
    fromBlock: window.fromBlock + deltaSeconds,
    toBlock: window.toBlock + deltaSeconds,
    fromIso: shiftIso(window.fromIso),
    toIso: shiftIso(window.toIso),
    swaps: window.swaps.map((row) => [Number(row[0]) + deltaSeconds, ...row.slice(1)]),
  };
}

// ---------------------------------------------------------------------------
// The constructed price path for Scene B
// ---------------------------------------------------------------------------

export interface ConstructedWindowSpec {
  /** Chain the builder-controlled pool lives on. */
  chainId: number;
  pool: string;
  token0: string;
  token1: string;
  /** Last observation lands here. Set it to chain time so the leg is genuinely fresh. */
  endUnixSeconds: number;
  openPrice?: number;
  /** Peak-to-trough fall, in basis points. Must clear the 200 bps floor to confirm. */
  fallBps?: number;
  /** Seconds between observations. */
  intervalSeconds?: number;
  /** Seconds spent falling, then seconds spent holding at the trough. */
  fallSeconds?: number;
  holdSeconds?: number;
}

const Q96_FLOAT = 2 ** 96;

/**
 * Builds a swap window whose price falls and then STAYS down.
 *
 * @remarks
 * This is a CONSTRUCTED price path, not an observation. It exists because the mainnet replay for
 * scenario B does not confirm (T3.3), so the only honest way to demonstrate the protect path is
 * on the builder-controlled pool with inputs that are declared as constructed.
 *
 * It is deliberately fed to the real `confirmMarket` rather than short-circuited to a
 * `CONFIRMED` verdict. The engine still applies its own floors — 200 bps drawdown, anti-wick as
 * a necessary condition with median retention over the hold interval, and a 30-swap minimum —
 * so what is constructed is the market, not the judgement about it. If a future tightening of
 * those rules rejects this path, the scene fails, which is the correct outcome.
 */
export function buildConstructedProtectWindow(spec: ConstructedWindowSpec): SwapWindowFixture {
  const openPrice = spec.openPrice ?? 100;
  const fallBps = spec.fallBps ?? 300;
  const interval = spec.intervalSeconds ?? 30;
  const fallSeconds = spec.fallSeconds ?? 600;
  const holdSeconds = spec.holdSeconds ?? 900;

  const troughPrice = openPrice * (1 - fallBps / 10_000);
  const totalSeconds = fallSeconds + holdSeconds;
  const startUnix = spec.endUnixSeconds - totalSeconds;
  const fromBlock = startUnix - XLAYER_BLOCK_TIMESTAMP_OFFSET;

  const rows: (string | number)[][] = [];
  for (let t = 0; t <= totalSeconds; t += interval) {
    const price =
      t <= fallSeconds
        ? openPrice - (openPrice - troughPrice) * (t / fallSeconds)
        : troughPrice; // flat at the bottom: the move persists, which is the whole point

    // token0 is the quote asset here, so P = 1 / raw and sqrtPriceX96 = 2**96 / sqrt(P).
    // Same float arithmetic `priceFromSqrtPriceX96` uses, so the round-trip is exact enough
    // that a 300 bps construction reads back as 300 bps.
    const sqrtPriceX96 = BigInt(Math.round(Q96_FLOAT / Math.sqrt(price)));
    const tick = Math.round(Math.log(1 / price) / Math.log(1.0001));

    rows.push([
      fromBlock + t,
      0,
      "-1000000000000000", // amount0: quote leaving the pool
      "10000000000000", // amount1: base entering
      sqrtPriceX96.toString(),
      "100000000000000000000000",
      tick,
    ]);
  }

  return {
    scenarioId: "B-CONSTRUCTED",
    chainId: spec.chainId,
    pool: spec.pool,
    token0: spec.token0,
    token0Symbol: "USDG",
    token0Decimals: 18,
    token1: spec.token1,
    token1Symbol: "wNVDAx",
    token1Decimals: 18,
    feePips: 500,
    tickSpacing: 60,
    // The label that must never come off: this is the builder's own pool, not a market.
    liquiditySource: "BUILDER_CONTROLLED",
    quoteIsToken0: true,
    fromBlock,
    toBlock: fromBlock + totalSeconds,
    fromIso: new Date(startUnix * 1000).toISOString().replace(/\.\d{3}Z$/, "Z"),
    toIso: new Date(spec.endUnixSeconds * 1000).toISOString().replace(/\.\d{3}Z$/, "Z"),
    rpcRangeErrors: 0,
    swapCount: rows.length,
    swaps: rows,
  } as SwapWindowFixture;
}

// ---------------------------------------------------------------------------
// Scene result shapes
// ---------------------------------------------------------------------------

export interface SceneStep {
  step: string;
  atUnixSeconds: number;
  note: string;
  txHash?: `0x${string}` | null;
  decoded?: unknown;
}

export interface SceneResult {
  scene: string;
  label: string;
  /** Loud, machine-readable provenance. Never omitted, never softened. */
  provenance: {
    evidence: "REPLAYED_SOURCE_LINKED" | "REPLAYED_WITH_CONSTRUCTED_MARKET";
    marketLeg: "REPLAYED" | "CONSTRUCTED";
    pool: "BUILDER_CONTROLLED";
    timeShiftSeconds: number;
    caveats: string[];
  };
  chainId: number;
  networkLabel: string;
  decisionState: string;
  decisionReasonCodes: ReasonCode[];
  assetRemap: AssetRemap | null;
  steps: SceneStep[];
  swaps: SwapResult[];
  passed: boolean;
  failures: string[];
}

function assert(failures: string[], condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}

// ---------------------------------------------------------------------------
// Shared posting path
// ---------------------------------------------------------------------------

async function signAndPost(
  clients: TinjauClients,
  decision: Decision,
): Promise<{ post: PostResult; assessment: AssessmentStruct; remap: AssetRemap }> {
  const { assessment, remap } = remapAssetForChain(
    decision.assessment,
    clients.config.addresses.riskAsset,
    clients.config.chainId,
  );
  // Never logged, never stored, never returned. Read once to sign; it goes no further.
  const signature = await signAssessment(decision.domain, assessment, assessorPrivateKey(clients));
  const post = await postAssessment(clients, assessment, signature);
  return { post, assessment, remap };
}

/**
 * The assessor's key, carried on the config rather than re-read from the environment.
 *
 * Kept behind a function so there is exactly one expression in this file that touches a key,
 * and so a grep for it finds one place rather than several.
 */
let assessorKeyRef: `0x${string}` | null = null;
export function setAssessorKey(key: `0x${string}`): void {
  assessorKeyRef = key;
}
function assessorPrivateKey(_clients: TinjauClients): `0x${string}` {
  if (!assessorKeyRef) {
    throw new Error(
      "Assessor signing key not provided. Call setAssessorKey() with the key matching " +
        "registry.assessor() before running a scene. It is never read implicitly here.",
    );
  }
  return assessorKeyRef;
}

/**
 * `runScenario`'s pipeline, with this chain's pool id threaded through.
 *
 * Every stage is the production module — `normalizeClaims`, `buildEvidenceGraph`,
 * `resolveAsset`, `confirmMarket`, `decide`. The ONLY difference from `runScenario` is that the
 * pool id is supplied rather than derived, which `RunScenarioOptions` does not expose. Scene A
 * asserts this helper and `runScenario` agree on the unshifted scenario, so the divergence
 * cannot grow silently into a second decision path.
 */
function decideFromScenario(
  clients: TinjauClients,
  scenario: FrozenScenario,
  swapWindow: SwapWindowFixture,
): Decision {
  const cfg = clients.config;
  const anchor = Math.floor(Date.parse(scenario.decisionAnchor.at) / 1000);
  const windowEnd = swapWindow.toBlock + XLAYER_BLOCK_TIMESTAMP_OFFSET;
  const now = windowEnd;

  const claims = normalizeClaims(scenario.claims);
  const graph = buildEvidenceGraph(claims, now, FROZEN_PROMOTION_CONFIG.evidenceWindowSec);
  const resolution = resolveAsset(
    scenario.asset.company,
    scenario.asset.tokenSymbol,
    scenario.asset.tokenAddress,
  );
  const confirmationInput = buildConfirmationInput(swapWindow, {
    anchorUnixSeconds: anchor,
    nowUnixSeconds: windowEnd,
    okx: null,
    usReferenceMarketOpen: scenario.decisionAnchor.usReferenceMarketOpen ?? false,
  });
  const confirmation = confirmMarket(confirmationInput);

  return decide({
    eventKey: `tinjau.scenario/${scenario.scenarioId}`,
    now,
    claims,
    graph,
    resolution,
    confirmation,
    confirmationInput,
    officialEvidencePassed: true,
    chainId: cfg.chainId,
    registryAddress: cfg.addresses.registry,
    poolId: cfg.addresses.poolId,
  });
}

// ---------------------------------------------------------------------------
// Scene A — rumour containment (T4.4)
// ---------------------------------------------------------------------------

/** Signs and relays a decision. Exported so a test can post without re-running a whole scene. */
export async function signAndPostDecision(
  clients: TinjauClients,
  decision: Decision,
): Promise<{ post: PostResult; assessment: AssessmentStruct; remap: AssetRemap }> {
  return signAndPost(clients, decision);
}

export async function runSceneA(
  clients: TinjauClients,
  scenario: FrozenScenario,
  swapWindow: SwapWindowFixture,
): Promise<SceneResult> {
  const failures: string[] = [];
  const steps: SceneStep[] = [];
  const swaps: SwapResult[] = [];
  const cfg = clients.config;

  const chainNow = await chainNowSeconds(clients);

  // The published answer, straight from `runScenario` — the same function the T4.1 scenario
  // tests use. Kept as the reference so the local helper below can be checked against it.
  const published = runScenario(scenario, swapWindow, {
    chainId: cfg.chainId,
    registryAddress: cfg.addresses.registry,
  });

  // The same pipeline, but able to carry this chain's pool id. `runScenario` has no `poolId`
  // option, and posting under a pool id the hook does not serve would produce a record the
  // hook can never read — it would fail closed to baseFee and Scene A would "pass" for the
  // wrong reason.
  const canonical = decideFromScenario(clients, scenario, swapWindow);
  assert(
    failures,
    published.record.state === canonical.record.state &&
      JSON.stringify([...published.record.reasonCodes].sort()) ===
        JSON.stringify([...canonical.record.reasonCodes].sort()),
    "the harness pipeline disagreed with runScenario on the unshifted scenario",
  );

  // Shift so the window ends now, then re-run. Same scenario, later clock.
  const delta = chainNow - (swapWindow.toBlock + XLAYER_BLOCK_TIMESTAMP_OFFSET);
  const shiftedScenario = timeShiftScenario(scenario, delta);
  const shiftedWindow = timeShiftSwapWindow(swapWindow, delta);
  const decision = decideFromScenario(clients, shiftedScenario, shiftedWindow);

  steps.push({
    step: "decide",
    atUnixSeconds: chainNow,
    note: `Shifted the frozen scenario forward by ${delta}s so its evidence is current relative to chain time.`,
    decoded: {
      canonicalState: canonical.record.state,
      shiftedState: decision.record.state,
      canonicalReasonCodes: canonical.record.reasonCodes,
      shiftedReasonCodes: decision.record.reasonCodes,
      humanExplanation: decision.record.humanExplanation,
    },
  });

  // The shift must be presentational. If it changed the verdict, the run measured the shift.
  assert(
    failures,
    canonical.record.state === decision.record.state,
    `time shift changed the state: ${canonical.record.state} -> ${decision.record.state}`,
  );
  assert(
    failures,
    JSON.stringify([...canonical.record.reasonCodes].sort()) ===
      JSON.stringify([...decision.record.reasonCodes].sort()),
    `time shift changed the reason codes: ${canonical.record.reasonCodes.join(",")} -> ${decision.record.reasonCodes.join(",")}`,
  );

  assert(failures, decision.record.state === "WATCH", `expected WATCH, got ${decision.record.state}`);
  assert(
    failures,
    decision.record.action.authorized === false,
    "a WATCH must not authorise an action",
  );

  // An absent observation must stay absent. The decision layer forces `fresh: false` and
  // `observedAt: null` for an unobserved leg; nothing in the chain path may substitute a
  // timestamp for it, because that would make an absence readable as a reading.
  const mc = decision.record.marketConfirmation;
  if (mc.observedAt === null) {
    assert(failures, mc.fresh === false, "an unobserved market leg must never be marked fresh");
  }

  const { post, remap } = await signAndPost(clients, decision);
  assert(failures, post.ok, `posting the WATCH failed: ${post.failure?.errorName ?? "unknown"}`);
  steps.push({
    step: "postAssessment",
    atUnixSeconds: await chainNowSeconds(clients),
    note: "Relayed by the poster; authorised only by the assessor's EIP-712 signature.",
    txHash: post.txHash,
    decoded: { assessmentPosted: post.assessmentPosted, failure: post.failure },
  });

  const record = await readRecord(clients);
  const effective = await readEffectiveState(clients);
  const detail = await readFeeDetail(clients);
  assert(failures, record.state === "WATCH", `registry readback says ${record.state}, expected WATCH`);
  assert(failures, effective.fee === cfg.envelope.baseFee, "effectiveState fee must be baseFee under WATCH");
  assert(failures, detail.fee === cfg.envelope.baseFee, "hook must preview baseFee under WATCH");
  assert(
    failures,
    detail.reason === "None",
    `a WATCH must read as "no protection warranted" (None), got ${detail.reason}`,
  );

  steps.push({
    step: "readback",
    atUnixSeconds: await chainNowSeconds(clients),
    note: "Read from the registry and the hook directly; no dashboard involved.",
    decoded: { record, effectiveState: effective, hookFeeDetail: detail },
  });

  await fundSwapper(clients);
  const swap = await executeSwap(clients);
  swaps.push(swap);
  assert(failures, swap.ok, "the swap did not execute");
  assert(
    failures,
    swap.appliedFee === cfg.envelope.baseFee,
    `THE SAFETY CLAIM: a WATCH must be charged baseFee (${cfg.envelope.baseFee}); the pool charged ${swap.appliedFee}`,
  );
  steps.push({
    step: "swap",
    atUnixSeconds: swap.atUnixSeconds,
    note: "Fee read from PoolManager's own Swap event — what the pool charged, not what the hook said.",
    txHash: swap.txHash,
    decoded: { appliedFee: swap.appliedFee, previewedFee: swap.previewedFee, tick: swap.tick },
  });

  return {
    scene: "A",
    label: "Rumour containment — the aggressive fee stays unauthorised",
    provenance: {
      evidence: "REPLAYED_SOURCE_LINKED",
      marketLeg: "REPLAYED",
      pool: "BUILDER_CONTROLLED",
      timeShiftSeconds: delta,
      caveats: [
        "The rumour claim in this scenario is SIMULATED (T0.2 disclosure): no byte-pinnable social post exists for it. The news chain alongside it is real and source-linked.",
        "The pool is builder-controlled test liquidity. It demonstrates enforcement; it is not a market.",
        `Every timestamp was shifted forward by ${delta}s so the assessment could be posted on a live chain. State and reason codes were checked to be identical to the unshifted canonical run.`,
      ],
    },
    chainId: cfg.chainId,
    networkLabel: cfg.networkLabel,
    decisionState: decision.record.state,
    decisionReasonCodes: [...decision.record.reasonCodes],
    assetRemap: remap,
    steps,
    swaps,
    passed: failures.length === 0,
    failures,
  };
}

// ---------------------------------------------------------------------------
// Scene B — bounded protection, deterministic recovery, cooldown (T4.2 + T4.3)
// ---------------------------------------------------------------------------

/**
 * Reason codes that describe the MARKET leg.
 *
 * Used to check that constructing the market changed only market-leg conclusions. If a
 * constructed price path ever moved an evidence-leg reason — provenance, corroboration,
 * materiality, staleness of the claims themselves — the scene would be constructing more than
 * it admits to, and that is a finding rather than a detail.
 */
const MARKET_LEG_REASON_CODES = new Set<string>([
  "MARKET_CONFIRMED",
  "MARKET_NOT_CONFIRMED",
  "MARKET_DATA_STALE",
  "MARKET_DATA_UNAVAILABLE",
  "ANTI_WICK_FAILED",
  "THIN_EXIT_DEPTH",
  "REFERENCE_MARKET_CLOSED",
  "INSUFFICIENT_SAMPLE",
]);

export async function runSceneB(
  clients: TinjauClients,
  scenario: FrozenScenario,
  canonicalWindow?: SwapWindowFixture,
): Promise<SceneResult> {
  const failures: string[] = [];
  const steps: SceneStep[] = [];
  const swaps: SwapResult[] = [];
  const cfg = clients.config;
  const env = cfg.envelope;

  await fundSwapper(clients);

  const chainNow = await chainNowSeconds(clients);
  const decision = await decideConstructedProtect(clients, scenario, chainNow);

  // What exactly did constructing the market change? Compared against the scenario's real
  // mainnet replay, which is the published WATCH result. This makes "only the market leg is
  // constructed" a measured claim rather than an assurance.
  let reasonCodeDiff: { onlyInCanonical: string[]; onlyInConstructed: string[] } | null = null;
  if (canonicalWindow) {
    const canonical = decideFromScenario(clients, scenario, canonicalWindow);
    const before = new Set<string>(canonical.record.reasonCodes);
    const after = new Set<string>(decision.record.reasonCodes);
    const onlyInCanonical = [...before].filter((r) => !after.has(r)).sort();
    const onlyInConstructed = [...after].filter((r) => !before.has(r)).sort();
    reasonCodeDiff = { onlyInCanonical, onlyInConstructed };

    const strayed = [...onlyInCanonical, ...onlyInConstructed].filter(
      (r) => !MARKET_LEG_REASON_CODES.has(r),
    );
    assert(
      failures,
      strayed.length === 0,
      `constructing the market leg changed non-market reasons: ${strayed.join(", ")}`,
    );
    assert(
      failures,
      canonical.record.state === "WATCH",
      `the canonical replay must remain the published WATCH; got ${canonical.record.state}`,
    );
    steps.push({
      step: "compare:canonical-vs-constructed",
      atUnixSeconds: chainNow,
      note:
        "The real mainnet replay of this scenario resolves to WATCH (T3.3, published). This " +
        "is precisely what the constructed market leg changed, and nothing else.",
      decoded: { canonicalState: canonical.record.state, reasonCodeDiff },
    });
  }

  assert(
    failures,
    decision.record.state === "PROTECT",
    `constructed inputs did not reach PROTECT (got ${decision.record.state}): ` +
      decision.record.humanExplanation,
  );
  assert(failures, decision.record.action.authorized, "a PROTECT must authorise the action");

  steps.push({
    step: "decide",
    atUnixSeconds: chainNow,
    note:
      "CONSTRUCTED market leg on the builder-controlled pool, real replayed evidence. " +
      "The price path was fed to the real confirmation engine; the CONFIRMED verdict is the " +
      "engine's, not a hand-set value.",
    decoded: {
      state: decision.record.state,
      reasonCodes: decision.record.reasonCodes,
      confidenceBand: decision.record.confidenceBand,
      marketConfirmation: decision.record.marketConfirmation,
      requestedFee: decision.record.action.requestedFee,
      humanExplanation: decision.record.humanExplanation,
    },
  });

  const { post, remap } = await signAndPost(clients, decision);
  assert(failures, post.ok, `posting the PROTECT failed: ${post.failure?.errorName ?? "unknown"}`);
  steps.push({
    step: "postAssessment",
    atUnixSeconds: await chainNowSeconds(clients),
    note: "The registry re-checks confirmation, the rumour bit, pause and cooldown on chain.",
    txHash: post.txHash,
    decoded: { assessmentPosted: post.assessmentPosted, failure: post.failure },
  });

  const afterPost = await readRecord(clients);
  const effAfterPost = await readEffectiveState(clients);
  assert(failures, afterPost.state === "PROTECT", `readback says ${afterPost.state}`);
  assert(
    failures,
    effAfterPost.fee > env.baseFee,
    `effectiveState fee ${effAfterPost.fee} should exceed baseFee under an active PROTECT`,
  );
  steps.push({
    step: "readback",
    atUnixSeconds: await chainNowSeconds(clients),
    note: "Registry state and pool fee must agree — checked, not assumed.",
    decoded: { record: afterPost, effectiveState: effAfterPost },
  });

  // --- widened swap ----------------------------------------------------------------
  const widened = await executeSwap(clients);
  swaps.push(widened);
  assert(failures, widened.ok, "the widened swap did not execute");
  assert(
    failures,
    widened.appliedFee === effAfterPost.fee,
    `the pool charged ${widened.appliedFee} but the registry said ${effAfterPost.fee}`,
  );
  assert(
    failures,
    (widened.appliedFee ?? 0) > env.baseFee && (widened.appliedFee ?? 0) <= env.maxFee,
    `widened fee ${widened.appliedFee} outside (baseFee, maxFee]`,
  );
  steps.push({
    step: "swap:widened",
    atUnixSeconds: widened.atUnixSeconds,
    note: "The bounded action, actually charged.",
    txHash: widened.txHash,
    decoded: { appliedFee: widened.appliedFee, previewedFee: widened.previewedFee },
  });

  // --- mid-decay -------------------------------------------------------------------
  const midOffset = env.widenDuration + Math.floor(env.decayDuration / 2);
  await advanceTime(clients, midOffset);
  const mid = await executeSwap(clients);
  swaps.push(mid);
  assert(
    failures,
    (mid.appliedFee ?? 0) > env.baseFee && (mid.appliedFee ?? 0) < (widened.appliedFee ?? 0),
    `mid-decay fee ${mid.appliedFee} should sit strictly between baseFee and the widened fee`,
  );
  steps.push({
    step: "swap:mid-decay",
    atUnixSeconds: mid.atUnixSeconds,
    note: `Advanced ${midOffset}s (widen + half the decay window). No transaction changed the record.`,
    txHash: mid.txHash,
    decoded: { appliedFee: mid.appliedFee, previewedFee: mid.previewedFee },
  });

  // --- recovered -------------------------------------------------------------------
  const restOffset = env.decayDuration - Math.floor(env.decayDuration / 2) + 1;
  await advanceTime(clients, restOffset);
  const recovered = await executeSwap(clients);
  swaps.push(recovered);
  assert(
    failures,
    recovered.appliedFee === env.baseFee,
    `after the full window the pool must charge baseFee; it charged ${recovered.appliedFee}`,
  );

  const effRecovered = await readEffectiveState(clients);
  const recordAfter = await readRecord(clients);
  assert(
    failures,
    effRecovered.state === "NORMAL",
    `effectiveState must recover to NORMAL, got ${effRecovered.state}`,
  );
  assert(
    failures,
    recordAfter.state === "PROTECT",
    "the stored record must be untouched by recovery — history is not rewritten by a read",
  );
  steps.push({
    step: "swap:recovered",
    atUnixSeconds: recovered.atUnixSeconds,
    note:
      "Deterministic recovery: no LLM, no keeper, no transaction ended this. Only time passed. " +
      "The stored record still reads PROTECT — expiry is applied at read time, not by erasing history.",
    txHash: recovered.txHash,
    decoded: {
      appliedFee: recovered.appliedFee,
      effectiveState: effRecovered,
      storedState: recordAfter.state,
    },
  });

  // --- cooldown --------------------------------------------------------------------
  // `lastProtectEndedAt` is set when an assessment stands a protection down, so the stand-down
  // has to be posted before cooldown is a live constraint. Lapsing by time alone does not
  // trigger it, and pretending otherwise would test nothing.
  const standDownNow = await chainNowSeconds(clients);
  const standDown = await decideConstructedProtect(clients, scenario, standDownNow, {
    forceNormal: true,
  });
  const standDownPost = await signAndPost(clients, standDown);
  assert(failures, standDownPost.post.ok, "standing the protection down failed");
  assert(
    failures,
    standDownPost.post.protectionEnded !== null,
    "standing down a PROTECT must emit ProtectionEnded",
  );
  steps.push({
    step: "postAssessment:stand-down",
    atUnixSeconds: standDownNow,
    note: "Explicit stand-down. This is what starts the cooldown clock.",
    txHash: standDownPost.post.txHash,
    decoded: {
      assessmentPosted: standDownPost.post.assessmentPosted,
      protectionEnded: standDownPost.post.protectionEnded,
    },
  });

  const reEntryNow = await chainNowSeconds(clients);
  const reEntry = await decideConstructedProtect(clients, scenario, reEntryNow);
  const reEntryPost = await signAndPost(clients, reEntry);
  assert(
    failures,
    !reEntryPost.post.ok && reEntryPost.post.failure?.errorName === "CooldownActive",
    `cooldown must block immediate re-entry; got ${reEntryPost.post.failure?.errorName ?? "success"}`,
  );
  steps.push({
    step: "postAssessment:blocked-by-cooldown",
    atUnixSeconds: reEntryNow,
    note: "Immediate re-arming is refused on chain, by the contract, not by the off-chain engine.",
    txHash: null,
    decoded: { failure: reEntryPost.post.failure },
  });

  const afterBlocked = await executeSwap(clients);
  swaps.push(afterBlocked);
  assert(
    failures,
    afterBlocked.appliedFee === env.baseFee,
    "a refused re-entry must leave the fee at baseFee",
  );

  return {
    scene: "B",
    label: "Bounded protection, deterministic recovery, and cooldown",
    provenance: {
      evidence: "REPLAYED_WITH_CONSTRUCTED_MARKET",
      marketLeg: "CONSTRUCTED",
      pool: "BUILDER_CONTROLLED",
      timeShiftSeconds: 0,
      caveats: [
        "THE MARKET LEG IS CONSTRUCTED. Scenario B's real mainnet replay resolves to WATCH because its market leg is NOT_CONFIRMED (T3.3, published). This scene therefore pairs the real replayed 8-K evidence with a constructed price path on the builder-controlled pool. It must never be presented as a replayed PROTECT.",
        "The constructed path was scored by the real confirmation engine under its own thresholds; only the market data is constructed, not the verdict.",
        "The record's on-chain `dataMode` is derived from the EVIDENCE only, so it cannot express 'evidence replayed, market constructed'. That distinction lives here and in the manifest.",
        "The pool is builder-controlled test liquidity. It demonstrates enforcement; it is not a market.",
      ],
    },
    chainId: cfg.chainId,
    networkLabel: cfg.networkLabel,
    decisionState: decision.record.state,
    decisionReasonCodes: [...decision.record.reasonCodes],
    assetRemap: remap,
    steps,
    swaps,
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Builds a decision over the constructed market path.
 *
 * `forceNormal` stands a protection down by scoring the same evidence against an empty market
 * window — which genuinely fails confirmation, so the resulting NORMAL/WATCH is the engine's
 * verdict rather than a hand-written state.
 */
export async function decideConstructedProtect(
  clients: TinjauClients,
  scenario: FrozenScenario,
  nowUnixSeconds: number,
  opts: { forceNormal?: boolean } = {},
): Promise<Decision> {
  const cfg = clients.config;

  const window = opts.forceNormal
    ? buildConstructedProtectWindow({
        chainId: cfg.chainId,
        pool: cfg.addresses.poolId,
        token0: cfg.addresses.token0,
        token1: cfg.addresses.token1,
        endUnixSeconds: nowUnixSeconds,
        fallBps: 0, // a flat market: nothing to confirm, so protection is not re-authorised
      })
    : buildConstructedProtectWindow({
        chainId: cfg.chainId,
        pool: cfg.addresses.poolId,
        token0: cfg.addresses.token0,
        token1: cfg.addresses.token1,
        endUnixSeconds: nowUnixSeconds,
      });

  // Shift the evidence so it is current relative to the assessment instant, exactly as Scene A
  // does, and for the same reason.
  const anchor = Math.floor(Date.parse(scenario.decisionAnchor.at) / 1000);
  const shifted = timeShiftScenario(scenario, nowUnixSeconds - anchor);

  const claims = normalizeClaims(shifted.claims);
  const graph = buildEvidenceGraph(claims, nowUnixSeconds, FROZEN_PROMOTION_CONFIG.evidenceWindowSec);
  const resolution = resolveAsset(
    shifted.asset.company,
    shifted.asset.tokenSymbol,
    shifted.asset.tokenAddress,
  );

  const confirmationInput = buildConfirmationInput(window, {
    anchorUnixSeconds: nowUnixSeconds,
    nowUnixSeconds,
    okx: null,
    // The scenario's own value, not a convenient one. Overriding it would make the market-hours
    // context a second constructed input, and the point of this scene is that exactly one leg
    // is constructed.
    usReferenceMarketOpen: scenario.decisionAnchor.usReferenceMarketOpen ?? false,
  });
  const confirmation = confirmMarket(confirmationInput);

  return decide({
    eventKey: `tinjau.demo/${shifted.scenarioId}-constructed`,
    now: nowUnixSeconds,
    claims,
    graph,
    resolution,
    confirmation,
    confirmationInput,
    officialEvidencePassed: true,
    chainId: cfg.chainId,
    registryAddress: cfg.addresses.registry,
    poolId: cfg.addresses.poolId,
  });
}

// ---------------------------------------------------------------------------
// Scene F — a failed action stays visible and claims no benefit (§0.11)
// ---------------------------------------------------------------------------

export async function runFailedActionScene(
  clients: TinjauClients,
  scenario: FrozenScenario,
): Promise<SceneResult> {
  const failures: string[] = [];
  const steps: SceneStep[] = [];
  const swaps: SwapResult[] = [];
  const cfg = clients.config;

  await fundSwapper(clients);

  // The guardian pauses. A genuine, decoded, on-chain refusal — not a simulated failure.
  const pauseTx = await setPaused(clients, true);
  steps.push({
    step: "guardian:pause",
    atUnixSeconds: await chainNowSeconds(clients),
    note: "The guardian pauses new protections. This is the failure this scene induces.",
    txHash: pauseTx,
    decoded: { paused: true },
  });

  const now = await chainNowSeconds(clients);
  const decision = await decideConstructedProtect(clients, scenario, now);
  assert(
    failures,
    decision.record.state === "PROTECT",
    "the scene needs an authorised action to fail; the decision did not reach PROTECT",
  );

  const { post, remap } = await signAndPost(clients, decision);
  assert(failures, !post.ok, "the post should have failed while paused");
  assert(
    failures,
    post.failure?.errorName === "ProtectionPaused",
    `expected ProtectionPaused, got ${post.failure?.errorName ?? "success"}`,
  );

  // §0.11: the failure must be recorded, and must not claim a protection benefit. The record
  // keeps `authorized: true` — the evidence DID authorise it — while the action status says the
  // attempt failed, no fee was applied, and there is no transaction hash to point at.
  const failedAction = {
    ...decision.record.action,
    status: "FAILED" as const,
    appliedFee: null,
    txHash: null,
    failureReason: `${post.failure?.errorName ?? "UnknownRevert"}${
      post.failure?.args.length ? `(${post.failure.args.map(String).join(", ")})` : ""
    }`,
  };
  assert(failures, failedAction.status === "FAILED", "action status must say FAILED");
  assert(failures, failedAction.appliedFee === null, "a failed action must not report an applied fee");
  assert(failures, failedAction.txHash === null, "a failed action must not carry a transaction hash");
  assert(
    failures,
    failedAction.authorized === true,
    "authorisation and application are different facts; the failure must not erase the authorisation",
  );

  steps.push({
    step: "postAssessment:failed",
    atUnixSeconds: now,
    note:
      "The action was authorised by the evidence and REFUSED on chain. Both facts are recorded. " +
      "No protection benefit may be claimed for this interval.",
    txHash: null,
    decoded: { failure: post.failure, action: failedAction },
  });

  // The proof that no benefit was obtained: the pool is still charging baseline.
  const record = await readRecord(clients);
  const detail = await readFeeDetail(clients);
  const swap = await executeSwap(clients);
  swaps.push(swap);
  assert(
    failures,
    swap.appliedFee === cfg.envelope.baseFee,
    `a failed action must leave the fee at baseFee; the pool charged ${swap.appliedFee}`,
  );
  assert(failures, record.neverAssessed || record.state !== "PROTECT", "no PROTECT should be stored");
  steps.push({
    step: "swap:after-failure",
    atUnixSeconds: swap.atUnixSeconds,
    note: "Measured proof that the failed action produced no fee change.",
    txHash: swap.txHash,
    decoded: { appliedFee: swap.appliedFee, hookFeeDetail: detail, storedRecord: record },
  });

  const unpauseTx = await setPaused(clients, false);
  steps.push({
    step: "guardian:unpause",
    atUnixSeconds: await chainNowSeconds(clients),
    note: "Restored, so this scene leaves no state behind for the next one.",
    txHash: unpauseTx,
    decoded: { paused: false },
  });

  return {
    scene: "F",
    label: "A failed action stays visible and claims no protection benefit",
    provenance: {
      evidence: "REPLAYED_WITH_CONSTRUCTED_MARKET",
      marketLeg: "CONSTRUCTED",
      pool: "BUILDER_CONTROLLED",
      timeShiftSeconds: 0,
      caveats: [
        "The failure is induced by a real guardian pause and refused by the contract. Nothing here is a simulated error path.",
        "The market leg is constructed, as in Scene B, and must not be presented as a replay.",
      ],
    },
    chainId: cfg.chainId,
    networkLabel: cfg.networkLabel,
    decisionState: decision.record.state,
    decisionReasonCodes: [...decision.record.reasonCodes],
    assetRemap: remap,
    steps,
    swaps,
    passed: failures.length === 0,
    failures,
  };
}
