import { expect, test } from "@playwright/test";

test("X listening and publishing are separate, truth-labeled surfaces", async ({ page }) => {
  await page.goto("/demo?scene=rumor&stage=listen");
  await expect(page.getByRole("heading", { name: "X-shaped rumor enters." })).toBeVisible();
  await expect(page.getByText("not evidence of live X coverage")).toBeVisible();
  await expect(page.getByText("SIMULATED", { exact: true }).first()).toBeVisible();

  await page.goto("/demo?scene=rumor&stage=act");
  await expect(page.getByText("X Publisher", { exact: true })).toBeVisible();
  await expect(page.getByText(/SUPPRESSED — no public message/)).toBeVisible();
  await expect(page.getByText("HISTORICAL", { exact: true }).last()).toBeVisible();
});

test("record and recovery surfaces do not manufacture a transaction", async ({ page }) => {
  await page.goto("/demo?scene=confirmed&stage=record");
  await expect(page.getByRole("heading", { name: "Versioned risk record." })).toBeVisible();
  await expect(page.getByText("Not available — no final deployment", { exact: true })).toBeVisible();

  await page.goto("/demo?scene=confirmed&stage=recover");
  await expect(page.getByRole("heading", { name: "Decay is deterministic—not an AI judgment." })).toBeVisible();
  await expect(page.getByText(/Historical AfterhoursFeeHook evidence proves/)).toBeVisible();
  await expect(page.getByText("No transaction hash or readback is present.")).toBeVisible();
});
