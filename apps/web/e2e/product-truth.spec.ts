import { expect, test } from "@playwright/test";
import { PRODUCT_CAPABILITIES } from "../src/lib/product/capabilities";

test("capability maturity does not manufacture unfinished integrations", () => {
  expect(PRODUCT_CAPABILITIES.find((item) => item.id === "x-listener")).toMatchObject({ maturity: "PENDING", dataMode: "SIMULATED" });
  // T3.3/T3.4 and T5 have since run, so these two are implemented. What must
  // stay true is that neither is described as live, and that the benchmark
  // having RUN is not the same as the claim gate having OPENED.
  expect(PRODUCT_CAPABILITIES.find((item) => item.id === "confirmation-engine")).toMatchObject({ maturity: "IMPLEMENTED", dataMode: "REPLAY" });
  expect(PRODUCT_CAPABILITIES.find((item) => item.id === "policy-benchmark")).toMatchObject({ maturity: "IMPLEMENTED", dataMode: "REPLAY" });
  expect(PRODUCT_CAPABILITIES.find((item) => item.id === "policy-benchmark")?.limitation).toMatch(/canClaimLossAvoided is false/);
  expect(PRODUCT_CAPABILITIES.find((item) => item.id === "exchange-os")).toMatchObject({ maturity: "ROADMAP" });
  for (const capability of PRODUCT_CAPABILITIES) {
    expect(capability.dataMode ?? "REPLAY").not.toBe("LIVE");
  }
});

test("implemented adapters remain distinct from the confirmation engine", () => {
  expect(PRODUCT_CAPABILITIES.find((item) => item.id === "okx-reference")?.maturity).toBe("IMPLEMENTED");
  expect(PRODUCT_CAPABILITIES.find((item) => item.id === "pool-telemetry")?.maturity).toBe("IMPLEMENTED");
  // The adapters supply inputs; the engine consumes them. Both real, both
  // separately listed, so neither absorbs the other's evidence.
  expect(PRODUCT_CAPABILITIES.find((item) => item.id === "confirmation-engine")?.limitation).toMatch(/[Nn]ot manipulation-proof/);
});
