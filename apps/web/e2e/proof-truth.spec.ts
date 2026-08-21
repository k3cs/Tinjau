import { expect, test } from "@playwright/test";
import { DEPLOYMENT_EVIDENCE, deploymentExplorerUrl } from "../src/lib/product/deployments";

test("deployment truth keeps historical and final artifacts separate", () => {
  expect(DEPLOYMENT_EVIDENCE.find((item) => item.id === "historical-hook")).toMatchObject({
    name: "AfterhoursFeeHook",
    maturity: "HISTORICAL",
  });
  expect(DEPLOYMENT_EVIDENCE.find((item) => item.id === "final-risk-registry")).toMatchObject({
    address: null,
    maturity: "PENDING",
  });
  expect(deploymentExplorerUrl(DEPLOYMENT_EVIDENCE.find((item) => item.id === "final-risk-registry")!)).toBeNull();
});

test("Proof of Work shows testnet evidence without claiming final deployment", async ({ page }) => {
  await page.goto("/proof");
  await expect(page.getByRole("heading", { name: "Proof of Work" })).toBeVisible();
  await expect(page.getByText("X Layer Testnet", { exact: true })).toBeVisible();
  await expect(page.getByText("AfterhoursFeeHook", { exact: true })).toBeVisible();
  await expect(page.getByText("No final address — deployment pending").first()).toBeVisible();
  await expect(page.getByText("BUILDER CONTROLLED").first()).toBeVisible();
});
