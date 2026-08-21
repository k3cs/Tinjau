import { expect, test } from "@playwright/test";

test("rumor scene remains WATCH and collapses syndication", async ({ page }) => {
  await page.goto("/demo?scene=rumor&stage=relate");

  await expect(page.getByText("WATCH", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Aggressive fee not authorized", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("5 claims collapse into 2 independence groups.")).toBeVisible();
  await expect(page.getByText("Inspect 3 related claims")).toBeVisible();
  await expect(page.getByText("SIMULATED", { exact: true }).first()).toBeVisible();
});

test("official evidence does not bypass unavailable market confirmation", async ({ page }) => {
  await page.goto("/demo?scene=confirmed&stage=confirm");

  await expect(page.getByRole("heading", { name: "WATCH", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "UNAVAILABLE", exact: true })).toBeVisible();
  await expect(page.getByText("Official Filing", { exact: true })).toBeVisible();
  await expect(page.getByText("Aggressive fee not authorized", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("No action requested", { exact: true })).toBeVisible();
});

test("legacy public routes redirect intentionally", async ({ page }) => {
  await page.goto("/holdings");
  await expect(page).toHaveURL("/");

  await page.goto("/scoreboard");
  await expect(page).toHaveURL(/\/demo\?scene=comparison/);
});

test("evidence semantics remain available on a narrow viewport", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile project only");
  await page.goto("/demo?scene=rumor&stage=relate");

  await expect(page.getByRole("list", { name: "Evidence independence groups" })).toBeVisible();
  await expect(page.getByText("Independent origin 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Independent origin 2", { exact: true })).toBeVisible();
});
