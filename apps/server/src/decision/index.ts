/**
 * Public surface of the decision orchestrator (task T4.1).
 *
 * T4.2 (poster/registry/hook) and T5 (benchmark) should import from here rather than reaching
 * into individual files, so the module can be reorganised without breaking them.
 */

export {
  decide,
  DecisionInputError,
  ASSESSMENT_ID_VERSION,
  type Decision,
  type DecisionInput,
  type CurrentRegistryState,
} from "./orchestrate.js";

export {
  FROZEN_ACTION_ENVELOPE,
  targetFeeForConfidence,
  proposeBoundedFee,
  decayedFee,
  type ActionEnvelope,
} from "./envelope.js";

export {
  EVIDENCE_COMMITMENT_VERSION,
  EvidenceCommitmentError,
  evidenceCommitment,
  evidenceCommitmentPreimage,
} from "./commitment.js";

export {
  ASSESSMENT_TYPE_STRING,
  ASSESSMENT_TYPES,
  ASSESSOR_KEY_ENV_VAR,
  AssessorKeyMissingError,
  EIP712_DOMAIN_NAME,
  EIP712_DOMAIN_TYPE_STRING,
  EIP712_DOMAIN_VERSION,
  assessmentDigest,
  assessmentDomain,
  assessmentStructHash,
  assessmentTypeStringFromTypes,
  assessorAddress,
  assessorKeyFromEnv,
  domainSeparator,
  signAssessment,
  type AssessmentDomain,
  type AssessmentStruct,
} from "./eip712.js";

export { runScenario, type FrozenScenario, type RunScenarioOptions } from "./scenarioRunner.js";

export type {
  ActionStatus,
  EvidenceClaimView,
  EvidenceRelation,
  MarketConfirmationView,
  RiskActionView,
  RiskRecordView,
} from "./viewModel.js";
