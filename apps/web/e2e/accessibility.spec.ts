import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openCleanMission } from "./helpers/mission";

for (const path of ["/", "/demo", "/developers", "/proof"]) {
  test(`has no serious accessibility violations: ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    );
    expect(serious).toEqual([]);
  });
}

test("important state modal has no serious accessibility violations", async ({ page }) => {
  await openCleanMission(page, "A");
  await page.getByRole("button", { name: /Inspect signal/ }).click();
  await page.getByRole("button", { name: /Raise fee now/ }).click();
  await expect(page.getByRole("dialog", { name: "Aggressive fee blocked" })).toBeVisible();
  await expect(page).toHaveTitle(/Tinjau/);

  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact ?? ""),
  );
  expect(serious).toEqual([]);
});
