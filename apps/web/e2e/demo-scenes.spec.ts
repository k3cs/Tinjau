import { expect, test } from "@playwright/test";
import { choose, expectAndDismissDialog, openCleanMission } from "./helpers/mission";

test("Scene A teaches rumor containment from X signal to deterministic recovery", async ({ page }) => {
  await openCleanMission(page, "A");
  await choose(page, /Inspect signal/);
  await expect(page.getByText("Potential X signal", { exact: true })).toBeVisible();
  await expect(page.getByText("SIMULATED", { exact: true }).first()).toBeVisible();

  await choose(page, /Raise fee now/);
  await expectAndDismissDialog(page, "Aggressive fee blocked");
  await choose(page, /Retrieve source chain/);
  await expect(page.getByRole("link", { name: /Open original/ })).toBeVisible();
  await choose(page, /Normalize claim/);

  await choose(page, /Count every report/);
  await expectAndDismissDialog(page, "Syndication collapsed");
  await choose(page, /Collapse duplicates/);

  await choose(page, /Force PROTECT/);
  await expectAndDismissDialog(page, "Aggressive fee blocked");
  await choose(page, /Hold at WATCH/);
  await expectAndDismissDialog(page, "WATCH entered");
  await expect(page.getByText("WATCH recorded", { exact: true })).toBeVisible();

  await choose(page, /Check market gate/);
  await expectAndDismissDialog(page, "Market data unavailable");
  await choose(page, /Prepare risk record/);

  await choose(page, /Publish as confirmed/);
  await expectAndDismissDialog(page, "Publication blocked");
  await choose(page, /Enforce WATCH limits/);
  await expect(page.getByText("Fee remains at baseline. X Publisher suppresses factual publication.", { exact: true })).toBeVisible();

  await choose(page, /Apply expiry/);
  await expectAndDismissDialog(page, "WATCH expired");
  await expect(page.getByRole("heading", { name: /Mission complete: Contain a rumor/ })).toBeVisible();
  await expect(page.getByText(/REJECTED · RUMOR_ONLY/)).toBeVisible();
});

test("X Listener and X Publisher remain separate truth-labeled capabilities", async ({ page }) => {
  await openCleanMission(page, "A");
  await choose(page, /Inspect signal/);
  await expect(page.getByText("Potential X signal", { exact: true })).toBeVisible();
  await expect(page.getByText("PENDING", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("SIMULATED", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("X Publisher", { exact: true })).toHaveCount(0);
});
