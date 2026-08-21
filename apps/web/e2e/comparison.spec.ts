import { expect, test } from "@playwright/test";

test("false-rumor scenario preserves null economics for all policies", async ({ page }) => {
  await page.goto("/demo?scene=comparison&case=false-rumor");

  await expect(page.getByText("No economic row by design", { exact: true })).toBeVisible();
  const comparison = page.getByRole("region", { name: "Equal policy comparison" });
  await expect(comparison.getByRole("heading", { name: "Static fee", exact: true })).toBeVisible();
  await expect(comparison.getByRole("heading", { name: "Volatility-only", exact: true })).toBeVisible();
  await expect(comparison.getByRole("heading", { name: "Tinjau", exact: true })).toBeVisible();
  await expect(comparison.getByText("No economic row", { exact: true }).first()).toBeVisible();
});

test("economic scenarios remain pending instead of becoming zero", async ({ page }) => {
  await page.goto("/demo?scene=comparison&case=confirmed-event");

  await expect(page.getByText("4,145", { exact: true })).toBeVisible();
  await expect(page.getByText("Pending handoff", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Closed", { exact: true })).toBeVisible();
  await expect(page.getByText("k=2", { exact: true })).toBeVisible();
  await expect(page.getByText("k=3", { exact: true })).toBeVisible();
  await expect(page.getByText("k=5", { exact: true })).toBeVisible();
});

test("neutral control is a first-class deep link", async ({ page }) => {
  await page.goto("/demo?scene=comparison&case=neutral");

  await expect(page).toHaveURL(/case=neutral/);
  await expect(page.getByText("367", { exact: true })).toBeVisible();
  await expect(page.getByText("Neutral control", { exact: true })).toBeVisible();
});
