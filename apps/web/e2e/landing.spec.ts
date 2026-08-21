import { expect, test } from "@playwright/test";

test("landing introduces the product before the demo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Tokenized-stock liquidity should not react blind." })).toBeVisible();
  await expect(page.getByRole("link", { name: /See a decision/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Evidence to bounded action" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "It declined to act, twice." })).toBeVisible();
});

test("landing covers the whole system without claiming live X listening", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "What exists. What does not. One ledger." })).toBeVisible();
  const xListener = page.getByRole("article").filter({ hasText: "X Listener" });
  await expect(xListener.getByText("PENDING", { exact: true })).toBeVisible();
  await expect(xListener.getByText("SIMULATED", { exact: true })).toBeVisible();
  await expect(page.getByText("No live X discovery provider is authorized for this MVP.")).toBeVisible();
});

test("primary landing CTA opens the single-screen risk state", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /See a decision/ }).click();
  await expect(page).toHaveURL(/\/risk/);
  await expect(page.getByRole("heading", { name: "Read the decision, not the dashboard." })).toBeVisible();
});

test("the guided walkthrough is still reachable from the header", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Walk through it" }).click();
  await expect(page).toHaveURL(/\/demo/);
  await expect(page.getByRole("heading", { name: "Choose a field exercise." })).toBeVisible();
});

test("global navigation exposes every judge-facing route", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Primary" });
  for (const [label, href] of [
    ["Risk state", "/risk"],
    ["Compare", "/compare"],
    ["Proof", "/proof"],
    ["Roadmap", "/roadmap"],
    ["Developers", "/developers"],
  ] as const) {
    await expect(nav.getByRole("link", { name: label })).toHaveAttribute("href", href);
  }
});
