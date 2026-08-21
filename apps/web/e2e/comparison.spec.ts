import { expect, test } from "@playwright/test";
import { choose, openCleanMission } from "./helpers/mission";

test("Scene C reveals matched policies in order and keeps the claim gate closed", async ({ page }) => {
  await openCleanMission(page, "C");
  await expect(page.getByText("Static fee revealed", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Tinjau revealed", { exact: true })).toHaveCount(0);

  await choose(page, /Use false-rumor control/);
  await choose(page, /Lock matched input/);
  await expect(page.getByText("Checksum a69691…03fc22 is shared by all three policies.", { exact: true })).toBeVisible();
  await choose(page, /Predict Tinjau/);

  await choose(page, /Run static policy/);
  await expect(page.getByText("Static fee revealed", { exact: true })).toBeVisible();
  await expect(page.getByText("Volatility-only revealed", { exact: true })).toHaveCount(0);
  await choose(page, /Run volatility-only/);
  await expect(page.getByText("Volatility-only revealed", { exact: true })).toBeVisible();
  await choose(page, /Run Tinjau policy/);
  await expect(page.getByText("Tinjau revealed", { exact: true })).toBeVisible();

  await choose(page, /Inspect claim gate/);
  await expect(page.getByRole("heading", { name: /Mission complete: Compare three policies/ })).toBeVisible();
  await expect(page.getByText(/No validated result supports a winner claim/)).toBeVisible();
});

test("comparison definition preserves missing economics instead of zero", async ({ page }) => {
  await openCleanMission(page, "C");
  await choose(page, /Use false-rumor control/);
  await choose(page, /Lock matched input/);
  await expect(page.getByText(/Economic row: absent/).last()).toBeVisible();
  await expect(page.getByText("Fee revenue: 0", { exact: true })).toHaveCount(0);
});
