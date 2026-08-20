import type { RiskRecordView } from "./model";
import { RiskRecordValidationError, validateRiskRecord } from "./validate";

export type RiskAdapterResult =
  | { kind: "ready"; record: RiskRecordView }
  | { kind: "stale"; record: RiskRecordView }
  | { kind: "unavailable"; record: RiskRecordView }
  | { kind: "invalid"; message: string };

export function adaptRiskRecord(input: unknown): RiskAdapterResult {
  try {
    const record = validateRiskRecord(input);
    if (record.marketConfirmation.status === "STALE") return { kind: "stale", record };
    if (record.marketConfirmation.status === "UNAVAILABLE") return { kind: "unavailable", record };
    return { kind: "ready", record };
  } catch (error) {
    return {
      kind: "invalid",
      message:
        error instanceof RiskRecordValidationError
          ? error.message
          : "Risk record could not be validated.",
    };
  }
}
