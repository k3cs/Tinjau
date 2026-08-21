import { expect, test } from "@playwright/test";
import { PRODUCT_CAPABILITIES } from "../src/lib/product/capabilities";

test("capability maturity does not manufacture unfinished integrations", () => {
  expect(PRODUCT_CAPABILITIES.find((item) => item.id === "x-listener")).toMatchObject({ maturity: "PENDING", dataMode: "SIMULATED" });
  expect(PRODUCT_CAPABILITIES.find((item) => item.id === "confirmation-engine")).toMatchObject({ maturity: "PENDING" });
  expect(PRODUCT_CAPABILITIES.find((item) => item.id === "policy-benchmark")).toMatchObject({ maturity: "PENDING", dataMode: "REPLAY" });
});

test("implemented adapters remain distinct from the confirmation engine", () => {
  expect(PRODUCT_CAPABILITIES.find((item) => item.id === "okx-reference")?.maturity).toBe("IMPLEMENTED");
  expect(PRODUCT_CAPABILITIES.find((item) => item.id === "pool-telemetry")?.maturity).toBe("IMPLEMENTED");
  expect(PRODUCT_CAPABILITIES.find((item) => item.id === "confirmation-engine")?.maturity).toBe("PENDING");
});
