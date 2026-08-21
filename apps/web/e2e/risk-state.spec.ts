import { expect, test } from "@playwright/test";
import { choose, expectAndDismissDialog, openCleanMission } from "./helpers/mission";

test("Scene B separates current WATCH truth from an explicit lifecycle replay", async ({ page }) => {
  await openCleanMission(page, "B");
  await choose(page, /Inspect filing/);
  await choose(page, /Retrieve official source/);
  await expect(page.getByRole("link", { name: /Open original/ })).toBeVisible();
  await choose(page, /Normalize filing/);
  await choose(page, /Resolve evidence graph/);

  await choose(page, /Enter PROTECT now/);
  await expectAndDismissDialog(page, "PROTECT blocked");
  await choose(page, /Hold for market gate/);
  await expectAndDismissDialog(page, "WATCH retained");
  await choose(page, /Run market gate/);
  await expectAndDismissDialog(page, "Confirmation unavailable");
  await expect(page.getByText("Final confirmation unavailable", { exact: true })).toBeVisible();

  await choose(page, /Prepare current record/);
  await choose(page, /Apply final fee now/);
  await expectAndDismissDialog(page, "PROTECT blocked");
  await expect(page.getByText("Current action unavailable", { exact: true })).toBeVisible();

  await choose(page, /Continue with lifecycle replay/);
  await expectAndDismissDialog(page, "REPLAY entered PROTECT");
  await expect(page.getByText("Lifecycle replay: PROTECT", { exact: true })).toBeVisible();
  await expect(page.getByText("REPLAY", { exact: true }).last()).toBeVisible();

  await choose(page, /Run replayed decay/);
  await expectAndDismissDialog(page, "REPLAY returned to NORMAL");
  await expect(page.getByRole("heading", { name: /Mission complete: Verify an official event/ })).toBeVisible();
});

test("legacy public routes redirect without bypassing Mission Select", async ({ page }) => {
  await page.goto("/holdings");
  await expect(page).toHaveURL("/");
  await page.goto("/scoreboard");
  await expect(page).toHaveURL(/\/demo/);
  await expect(page.getByRole("heading", { name: "Choose a field exercise." })).toBeVisible();
});
