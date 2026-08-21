import { expect, test } from "@playwright/test";
import { choose, openCleanMission } from "./helpers/mission";

test("guided console keeps permanent explanations beside progressively unlocked output", async ({ page }) => {
  await openCleanMission(page, "A");
  for (const label of ["What happened", "Objective", "What Tinjau knows", "What remains unknown", "Why it matters", "Choose the next action"]) {
    await expect(page.getByRole("heading", { name: label })).toBeVisible();
  }
  await expect(page.getByText("0 revealed", { exact: true })).toBeVisible();
  await choose(page, /Inspect signal/);
  await expect(page.getByText("1 revealed", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "03 Understand" })).toBeDisabled();
});

test("all nine evidence stages are visible but future work stays locked", async ({ page }) => {
  await openCleanMission(page, "B");
  for (const name of ["01 Listen", "02 Retrieve", "03 Understand", "04 Relate", "05 Decide", "06 Confirm", "07 Record", "08 Act", "09 Recover"]) {
    await expect(page.getByRole("button", { name })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "09 Recover" })).toBeDisabled();
});

test("mobile reading order keeps guidance before system output", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile project only");
  await openCleanMission(page, "A");
  const guide = page.getByRole("complementary", { name: "Your guide" });
  const output = page.getByRole("region", { name: "System output" });
  const guideBox = await guide.boundingBox();
  const outputBox = await output.boundingBox();
  expect(guideBox).not.toBeNull();
  expect(outputBox).not.toBeNull();
  expect(guideBox!.y).toBeLessThan(outputBox!.y);
});
