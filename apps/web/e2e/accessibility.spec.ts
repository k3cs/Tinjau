import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openCleanMission } from "./helpers/mission";

// Reduced motion is emulated for two reasons: it is the path that must be
// clean for the users who need it, and it stops axe sampling a colour
// mid-fade and reporting a contrast failure the settled page does not have.
for (const path of ["/", "/why-it-matters", "/risk", "/proof", "/x-layer", "/roadmap", "/demo", "/developers"]) {
  test(`has no serious accessibility violations: ${path}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    );
    expect(serious).toEqual([]);
  });
}

test("important state modal has no serious accessibility violations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
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
