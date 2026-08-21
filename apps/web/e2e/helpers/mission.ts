import { expect, type Page } from "@playwright/test";

export async function openCleanMission(page: Page, scene: "A" | "B" | "C") {
  await page.goto("/");
  await page.evaluate(() => window.sessionStorage.clear());
  await page.goto("/demo");
  await page.getByRole("button", { name: new RegExp(`Start Scene ${scene}`) }).click();
}

export async function choose(page: Page, name: string | RegExp) {
  await page.getByRole("button", { name }).click();
}

export async function expectAndDismissDialog(page: Page, title: string | RegExp) {
  const dialog = page.getByRole("dialog", { name: title });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Return to mission" }).click();
}
