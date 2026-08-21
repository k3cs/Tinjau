import { expect, test } from "@playwright/test";

test("Developers explains four role-based integration paths", async ({ page }) => {
  await page.goto("/developers");
  await expect(page.getByRole("heading", { name: "Use the boundary, not a black box." })).toBeVisible();
  for (const role of ["Pool operator", "Protocol developer", "Evidence integrator", "Observer / dashboard builder"]) {
    await expect(page.getByRole("link", { name: role, exact: true })).toBeVisible();
  }
});

test("pending integrations do not masquerade as executable quick starts", async ({ page }) => {
  await page.goto("/developers");
  await expect(page.getByText(/No executable final integration command is published yet/)).toBeVisible();
  await expect(page.getByText(/No live X discovery provider is authorized/)).toBeVisible();
  await expect(page.getByText("PENDING", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("curl https://tinjau.xyz/api/risk", { exact: true })).toHaveCount(0);
});
