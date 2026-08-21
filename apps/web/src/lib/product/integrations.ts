import type { CapabilityMaturity } from "./capabilities";
import { DEPLOYED_NETWORK, DEPLOYED_STACKS } from "@/lib/handoff/deployments";

export interface IntegrationStep {
  title: string;
  description: string;
  maturity: CapabilityMaturity;
  proofCapabilityId: string;
  example?: string;
  exampleLabel?: string;
}

export interface IntegrationPath {
  id: string;
  audience: string;
  title: string;
  outcome: string;
  steps: IntegrationStep[];
}

/**
 * The addresses in these examples are resolved from the published handoff, not
 * transcribed.
 *
 * This file used to tell four different developer roles to "wait for the final
 * deployment" long after T7.2 had published it, so every role's last step was a
 * dead end that pointed at work already finished. Transcribed addresses would
 * have re-created exactly that failure the next time anything moved, so the
 * commands below are built from `deployed-addresses.json` at module load and go
 * stale only if the artifact does.
 */
const PRODUCTION = DEPLOYED_STACKS.find((stack) => !stack.isDemoEnvelope) ?? DEPLOYED_STACKS[0];

/**
 * Roles are matched by prefix. `deepHouseStyle` rewrites the em dashes in the
 * handoff's own role strings on the way in, so "risk asset - MOCK wNVDAx" does
 * not survive as an exact string to compare against.
 */
const addressOf = (prefix: string): string =>
  PRODUCTION.contracts.find((contract) => contract.role.startsWith(prefix))?.address ?? "";

const REGISTRY = addressOf("TinjauRiskRegistry");
const HOOK = addressOf("TinjauFeeHook");
const ASSET = addressOf("risk asset");

const READ_COMMAND = [
  "node tools/risk-reader/tinjau-risk-read.mjs \\",
  `  --rpc-url ${DEPLOYED_NETWORK.rpc} --chain-id ${DEPLOYED_NETWORK.chainId} \\`,
  `  --registry ${REGISTRY} \\`,
  `  --asset    ${ASSET} \\`,
  `  --pool-id  ${PRODUCTION.poolId}`,
].join("\n");

export const INTEGRATION_PATHS: IntegrationPath[] = [
  {
    id: "pool-operator",
    audience: "Pool operator",
    title: "Connect a bounded liquidity response",
    outcome:
      "Let a risk state authorise a capped, temporary fee, and let it authorise nothing else.",
    steps: [
      {
        title: "Read the limits off the chain, not off this page",
        description:
          "The envelope is stored in the registry: a base fee of 500 pips, a ceiling of 20,000, held fully widened for 3,600s, decaying over 18,000s, capped at 21,600s, then a 3,600s cooldown before it can re-arm. The reference reader prints all of it. Read it yourself before trusting any number written here.",
        maturity: "IMPLEMENTED",
        proofCapabilityId: "risk-registry",
        exampleLabel: "Runs against the public testnet RPC, no credentials",
        example: READ_COMMAND,
      },
      {
        title: "Take the fee from the Swap event, never from previewFee",
        description: `The hook (${HOOK}) is deployed and reads the registry. On a live chain previewFee and the fee actually charged diverge, so decode it from PoolManager's own Swap event. That is the only number that says what the pool did rather than what a view function predicted.`,
        maturity: "IMPLEMENTED",
        proofCapabilityId: "fee-hook",
      },
      {
        title: "Do not point this at real liquidity yet",
        description:
          "Both deployed pools are builder-controlled, seeded with freely-mintable mock tokens that have no value, so they demonstrate enforcement and are not markets. The assessor key is also still derived from the poster key rather than having its own lifecycle, which is acceptable on testnet and not in production.",
        maturity: "PENDING",
        proofCapabilityId: "risk-policy",
      },
    ],
  },
  {
    id: "protocol-developer",
    audience: "Protocol developer",
    title: "Consume a fail-closed risk record",
    outcome:
      "Read state, reasons, expiry and action status straight from the chain, without trusting anything this site says.",
    steps: [
      {
        title: "Read the record with no dependencies at all",
        description: `The registry is published at ${REGISTRY} on ${DEPLOYED_NETWORK.name}. The reference consumer in tools/risk-reader/ reads it over ordinary JSON-RPC with zero npm dependencies, its own hand-transcribed ABI, and no import from this project's server code. Read functions only: the write functions are not in its ABI.`,
        maturity: "IMPLEMENTED",
        proofCapabilityId: "risk-registry",
        exampleLabel: "Runs against the public testnet RPC, no credentials",
        example: READ_COMMAND,
      },
      {
        title: "Act on effectiveState(), never on currentRecord()",
        description:
          "A read never rewrites history, so an expired PROTECT still reads PROTECT in storage. effectiveState() applies expiry and the duration cap and is the value to act on. This is the case a naive consumer gets wrong: it would apply protection the registry no longer authorises.",
        maturity: "IMPLEMENTED",
        proofCapabilityId: "risk-policy",
        exampleLabel: "The distinction that matters",
        example: [
          "// currentRecord() is storage, verbatim. It does not expire on its own.",
          "// effectiveState() applies expiry and the duration cap.",
          "const stored = await registry.currentRecord(asset, poolId);",
          "const live = await registry.effectiveState(asset, poolId);",
          "",
          "// stored.state can still say PROTECT hours after it lapsed.",
          "if (live.state !== \"PROTECT\") denyFeeAction();",
        ].join("\n"),
      },
      {
        title: "Assume the read is stale until you pin it",
        description: DEPLOYED_NETWORK.rpcWarning,
        maturity: "IMPLEMENTED",
        proofCapabilityId: "risk-registry",
      },
    ],
  },
  {
    id: "evidence-integrator",
    audience: "Evidence integrator",
    title: "Add source-grounded evidence",
    outcome: "Preserve provenance, independence, and epistemic status before a claim reaches policy.",
    steps: [
      {
        title: "Provide a canonical source identity",
        description:
          "Supply source class, source id, URL when resolvable, publisher, timestamp precision, and content commitment. Classification fails closed: only a URL passing the EDGAR guard is treated as OFFICIAL.",
        maturity: "IMPLEMENTED",
        proofCapabilityId: "official-intake",
        exampleLabel: "Evidence shape",
        example: [
          "{",
          '  sourceClass: "OFFICIAL",',
          '  dataMode: "REPLAY",',
          '  sourceId: "edgar:<accession>",',
          '  sourceUrl: "https://www.sec.gov/...",',
          "  officialConfirmation: true",
          "}",
        ].join("\n"),
      },
      {
        title: "Keep duplicates and contradictions visible",
        description:
          "Share an independence group so syndication collapses to one origin without deleting the claims that explain WATCH. A claim that disclaims being an origin must say so: it cannot be counted toward independent corroboration.",
        maturity: "IMPLEMENTED",
        proofCapabilityId: "evidence-graph",
      },
      {
        title: "Do not connect a live social provider yet",
        description:
          "The social claim in the frozen scenarios is SIMULATED, written by this project as a safety test, and carries a null source URL. No live discovery provider is authorised for this MVP, so nothing here supports a claim about coverage or latency.",
        maturity: "PENDING",
        proofCapabilityId: "x-listener",
      },
    ],
  },
  {
    id: "observer",
    audience: "Observer / dashboard builder",
    title: "Explain state without action authority",
    outcome: "Render evidence, state, expiry and limitations while staying strictly read-only.",
    steps: [
      {
        title: "Read the public scoreboard API",
        description:
          "The endpoint is live and returns the frozen scenario records. It is REPLAYED fixture data, not a live feed, and it says so in its own payload: a _READ_THIS_FIRST banner, a top-level dataMode, and canClaimLossAvoided set to false.",
        maturity: "IMPLEMENTED",
        proofCapabilityId: "policy-benchmark",
        exampleLabel: "Public, no key required",
        example: [
          "curl -s https://tinjau.xyz/api/scoreboard \\",
          "  | jq '.entries[] | {scenarioId, state, provenance}'",
        ].join("\n"),
      },
      {
        title: "Render provenance next to the state, at the same weight",
        description:
          "Every entry carries a provenance object with sourceClass, dataMode and isSimulated. A WATCH derived from a simulated claim and a WATCH derived from a filing are different claims, and a dashboard that shows only the state has erased the difference.",
        maturity: "IMPLEMENTED",
        proofCapabilityId: "risk-policy",
      },
      {
        title: "Never render a stored PROTECT as a live one",
        description:
          "Show data mode separately from capability maturity, and resolve expiry before display. The reference reader prints stored and effective state separately and reconciles them, which is the behaviour to copy.",
        maturity: "IMPLEMENTED",
        proofCapabilityId: "risk-registry",
      },
    ],
  },
];
