import { PRODUCT_CAPABILITIES } from "./capabilities";
import { DEPLOYMENT_EVIDENCE, XLAYER_TESTNET_PROOF } from "./deployments";

export const PROOF_SUMMARY = {
  title: "Proof of Work",
  subtitle: "Testnet deployments, transactions, and implementation evidence.",
  network: XLAYER_TESTNET_PROOF,
  deployments: DEPLOYMENT_EVIDENCE,
  capabilities: PRODUCT_CAPABILITIES,
  services: [
    {
      id: "risk-pipeline",
      name: "Risk pipeline",
      status: "IMPLEMENTED" as const,
      evidence: "Library, frozen fixtures, cross-language policy tests",
      limitation: "No public final risk-record API is deployed yet.",
    },
    {
      id: "public-scoreboard",
      name: "Public scoreboard API",
      status: "PENDING" as const,
      evidence: "Provenance fix exists in repository tests",
      limitation: "Current public deployment is stale and is intentionally not linked as proof.",
    },
  ],
} as const;

export function getBuildCommit(): string | null {
  return process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? null;
}
