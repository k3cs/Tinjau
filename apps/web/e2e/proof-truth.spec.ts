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
  // Addresses are real and deployed, and must still never read as final.
  await expect(page.getByText(/THESE ARE T4.2 WORKING ADDRESSES, NOT THE FINAL LIST/)).toBeVisible();
  await expect(page.getByText("Builder-controlled").first()).toBeVisible();
  await expect(page.getByText(/THE PUBLIC RPC SERVES STALE READS/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Capability evidence" })).toBeVisible();
  await expect(page.getByText("Market-confirmation engine", { exact: true })).toBeVisible();
  await expect(page.getByText("Market-confirmation engine", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /scoreboard/i })).toHaveCount(0);
});
