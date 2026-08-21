import { expect, test } from "@playwright/test";

test("landing introduces the product before the demo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Tokenized-stock liquidity should not react blind." })).toBeVisible();
  await expect(page.getByRole("link", { name: /Start the 3-scene demo/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Evidence to bounded action" })).toBeVisible();
  await expect(page.getByText("AI proposes. Policy decides. Contracts constrain.")).toBeVisible();
});

test("landing covers the whole system without claiming live X listening", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "What exists. What does not. One ledger." })).toBeVisible();
  const xListener = page.getByRole("article").filter({ hasText: "X Listener" });
  await expect(xListener.getByText("PENDING", { exact: true })).toBeVisible();
  await expect(xListener.getByText("SIMULATED", { exact: true })).toBeVisible();
  await expect(page.getByText("No live X discovery provider is authorized for this MVP.")).toBeVisible();
});

test("primary landing CTA enters the guided walkthrough", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Start the 3-scene demo/ }).click();
  await expect(page).toHaveURL(/\/demo/);
  await expect(page.getByRole("heading", { name: "Choose a field exercise." })).toBeVisible();
  await expect(page.getByRole("button", { name: /Start Scene A/ })).toBeVisible();
});

test("global navigation exposes developer and proof routes", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Developers" })).toHaveAttribute("href", "/developers");
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Proof" })).toHaveAttribute("href", "/proof");
});
