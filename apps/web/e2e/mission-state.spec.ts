import { expect, test, type Page } from "@playwright/test";

async function openClean(page: Page, path = "/demo") {
  await page.goto("/");
  await page.evaluate(() => window.sessionStorage.clear());
  await page.goto(path);
}

test("demo begins at Mission Select without leaking an outcome", async ({ page }) => {
  await openClean(page);
  await expect(page.getByRole("heading", { name: "Choose a field exercise." })).toBeVisible();
  await expect(page.getByText("WATCH recorded", { exact: true })).toHaveCount(0);
  await expect(page.getByText("PROTECT", { exact: true })).toHaveCount(0);
});

test("accepted choice reveals output and unlocks only the next stage", async ({ page }) => {
  await openClean(page);
  await page.getByRole("button", { name: /Start Scene A/ }).click();
  await expect(page.getByRole("heading", { name: "Waiting for your decision." })).toBeVisible();
  await expect(page.getByRole("button", { name: "02 Retrieve" })).toBeDisabled();

  await page.getByRole("button", { name: /Inspect signal/ }).click();
  await expect(page).toHaveURL(/mission=rumor&stage=retrieve/);
  await expect(page.getByText("Potential X signal", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "02 Retrieve" })).toHaveAttribute("aria-current", "step");
  await expect(page.getByRole("button", { name: /Understand/ })).toBeDisabled();
});

test("unsafe choice is selectable, rejected, and does not advance", async ({ page }) => {
  await openClean(page);
  await page.getByRole("button", { name: /Start Scene A/ }).click();
  await page.getByRole("button", { name: /Inspect signal/ }).click();
  await page.getByRole("button", { name: /Raise fee now/ }).click();

  const dialog = page.getByRole("dialog", { name: "Aggressive fee blocked" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Rumor-only evidence cannot authorize PROTECT/)).toBeVisible();
  await dialog.getByRole("button", { name: "Return to mission" }).click();
  await expect(page).toHaveURL(/stage=retrieve/);
  await expect(page.getByRole("button", { name: /Retrieve source chain/ })).toBeVisible();
});

test("valid mission progress survives refresh in the same tab", async ({ page }) => {
  await openClean(page);
  await page.getByRole("button", { name: /Start Scene A/ }).click();
  await page.getByRole("button", { name: /Inspect signal/ }).click();
  await expect(page).toHaveURL(/stage=retrieve/);

  await page.reload();
  await expect(page.getByRole("button", { name: /Retrieve source chain/ })).toBeVisible();
  await expect(page.getByText("Potential X signal", { exact: true })).toBeVisible();
});

test("deep link and invalid session cannot bypass locked stages", async ({ page }) => {
  await openClean(page, "/demo?mission=confirmed&stage=act");
  await expect(page.getByRole("heading", { name: "Choose a field exercise." })).toBeVisible();

  await page.evaluate(() => window.sessionStorage.setItem("tinjau.guided-mission/v1", JSON.stringify({ schemaVersion: 1, missionId: "rumor", currentStageId: "recover" })));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Choose a field exercise." })).toBeVisible();
});
