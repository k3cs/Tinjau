import { expect, test } from "@playwright/test";

test("walkthrough exposes all nine stages as shareable controls", async ({ page }) => {
  await page.goto("/demo?scene=rumor&stage=listen");
  const controls = page.getByRole("region", { name: "Walkthrough stage controls" });
  for (const label of ["Listen", "Retrieve", "Understand", "Relate", "Decide", "Confirm", "Record", "Act", "Recover"]) {
    await expect(controls.getByRole("link", { name: new RegExp(label) })).toBeVisible();
  }
  await controls.getByRole("link", { name: /Decide/ }).click();
  await expect(page).toHaveURL(/stage=decide/);
  await expect(page.getByText("Aggressive fee not authorized", { exact: true })).toBeVisible();
});

test("confirmed scene keeps the missing final confirmation explicit", async ({ page }) => {
  await page.goto("/demo?scene=confirmed&stage=confirm");
  await expect(page.getByRole("heading", { name: "Official evidence still needs the market gate." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "UNAVAILABLE", exact: true })).toBeVisible();
  await expect(page.getByText("Not delivered", { exact: true })).toBeVisible();
});

test("comparison remains a first-class scene", async ({ page }) => {
  await page.goto("/demo?scene=comparison&case=neutral");
  await expect(page.getByRole("heading", { name: "Same input. Three policies. No predetermined winner." })).toBeVisible();
  await expect(page.getByText("Matched input checksum", { exact: true })).toBeVisible();
  await expect(page.getByText("Pending handoff", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Closed", { exact: true })).toBeVisible();
});
