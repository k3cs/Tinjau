import { expect, test } from "@playwright/test";

/**
 * The claim boundary, enforced in the browser.
 *
 * `test/handoff-parity.test.ts` pins the *data*. This pins the *rendering*: an
 * overclaim can be introduced without touching a single number, just by writing
 * a sentence. These tests read what a judge would actually see.
 */

const PUBLIC_ROUTES = ["/", "/why-it-matters", "/risk", "/proof", "/x-layer", "/roadmap", "/developers", "/demo"];

// §0.19 and known-limitations.md §18. Each of these is a sentence the evidence
// does not support, phrased the way it would most plausibly slip back in.
const FORBIDDEN = [
  /reduces LP loss/i,
  /loss avoided/i,
  /outperform\w* the baseline/i,
  /dual[ -]?(OKX|venue)[ /-]?(X Layer )?confirmation/i,
  /production[- ]ready/i,
  /manipulation[- ]proof/i,
  /first (AI |multi-agent |on-chain |CEX|self-protecting)/i,
  /protected TVL/i,
];

/**
 * A phrase is only an overclaim when it is asserted. The site deliberately
 * writes several of these down in order to disown them. "No claim that it
 * reduces LP loss" must pass, "Tinjau reduces LP loss" must not, so each match
 * is checked against the words immediately before it.
 */
const NEGATION = /\b(no|not|never|cannot|can't|does not|doesn't|may not|must not|without|forbidden|prohibited|refus\w*|decline\w*|excluded|unavailable|nothing)\b|[“"”']$/i;

function assertedClaims(text: string, pattern: RegExp): string[] {
  const global = new RegExp(pattern.source, `${pattern.flags.replace("g", "")}g`);
  const asserted: string[] = [];
  for (const match of text.matchAll(global)) {
    const index = match.index ?? 0;
    const before = text.slice(Math.max(0, index - 80), index);
    if (NEGATION.test(before)) continue;
    // Inside an open quotation: /proof prints the prohibited sentences
    // verbatim, in quotes, under a heading saying the result does not support
    // them. Quoting a claim in order to rule it out is not asserting it.
    if (before.lastIndexOf("“") > before.lastIndexOf("”")) continue;
    asserted.push(text.slice(Math.max(0, index - 80), index + match[0].length + 20));
  }
  return asserted;
}

for (const route of PUBLIC_ROUTES) {
  test(`no prohibited claim renders on ${route}`, async ({ page }) => {
    await page.goto(route);
    const text = await page.locator("body").innerText();
    for (const pattern of FORBIDDEN) {
      expect(
        assertedClaims(text, pattern),
        `${route} asserts a prohibited claim matching ${pattern}`,
      ).toEqual([]);
    }
  });
}

test("the one forbidden phrase the landing page prints is struck through and disowned", async ({
  page,
}) => {
  await page.goto("/");
  // The landing page names "Tinjau reduces LP loss" in order to rule it out.
  // A caption above it is not enough: in display type a cropped screenshot or a
  // skim reads the heading as the claim. The disavowal has to travel with the
  // words, so it is a <del> and it carries a screen-reader prefix.
  const struck = page.locator("del", { hasText: "Tinjau reduces LP loss" });
  await expect(struck).toBeVisible();
  await expect(struck).toHaveCSS("text-decoration-line", "line-through");
  await expect(page.getByText("What we will not say")).toBeVisible();
  await expect(page.getByText(/We do not claim:/)).toBeAttached();
  // And it is the only place any surface prints it at all.
  expect(await page.locator("del", { hasText: "Tinjau reduces LP loss" }).count()).toBe(1);
});

test("the constructed PROTECT is labelled constructed on the same screen as the state", async ({
  page,
}) => {
  await page.goto("/risk");
  await page.getByRole("tab", { name: /Confirmed event/ }).click();

  await expect(page.getByText("PROTECT", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /THIS PROTECT IS NOT A REPLAY RESULT/ }),
  ).toBeVisible();
  await expect(page.getByText(/The canonical mainnet replay of this exact evidence resolves to WATCH/)).toBeVisible();
  await expect(page.getByText("MARKET LEG CONSTRUCTED")).toBeVisible();
});

test("the rumour scenario shows WATCH, a blocked action, and its simulated origin", async ({
  page,
}) => {
  await page.goto("/risk");
  await expect(page.getByText("WATCH", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("SIMULATED").first()).toBeVisible();
  // The refusal, stated as a refusal.
  await expect(page.getByText(/the gate authorised nothing/i)).toBeVisible();
  await expect(page.getByText(/UNAVAILABLE/).first()).toBeVisible();
});

test("what the AI is forbidden to do is on the same screen as the state", async ({ page }) => {
  await page.goto("/risk");
  await expect(page.getByRole("heading", { name: "AI proposes. The contract decides." })).toBeVisible();
  await expect(page.getByText("Forbidden to the AI")).toBeVisible();
  await expect(page.getByText("Set a fee, or any number the pool charges")).toBeVisible();
  await expect(page.getByText("Authorise an action, or overrule a refusal")).toBeVisible();
});

test("the OKX leg is never shown as available", async ({ page }) => {
  await page.goto("/risk");
  await expect(
    page.getByText(/The OKX index leg is unavailable for every frozen scenario/),
  ).toBeVisible();
});

test("the comparison shows both metric bases and picks no winner", async ({ page }) => {
  await page.goto("/proof");
  await expect(page.getByText("Pre-registered basis").first()).toBeVisible();
  await expect(page.getByText("AMD-002 basis (post-hoc)").first()).toBeVisible();
  await expect(page.getByText(/canClaimLossAvoided/).first()).toBeVisible();
  await expect(page.getByText("false", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Excluded from the claim gate/).first()).toBeVisible();
});

test("roadmap items are labelled roadmap and never read as shipped", async ({ page }) => {
  await page.goto("/roadmap");
  await expect(page.getByText("Roadmap · nothing here is shipped")).toBeVisible();
  const roadmapBadges = page.getByText("Roadmap", { exact: true });
  expect(await roadmapBadges.count()).toBeGreaterThan(4);
  // Every roadmap item states what blocks it rather than when it lands.
  await expect(page.getByText("Blocked by:").first()).toBeVisible();
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/\bQ[1-4]\b|\bcoming soon\b|\bshipping\b/i);
});

test("the public API no longer serves an unlabelled synthetic event", async ({ request }) => {
  const response = await request.get("/api/scoreboard");
  expect(response.status()).toBe(200);
  const body = await response.json();

  expect(body._READ_THIS_FIRST).toMatch(/REPLAYED FIXTURE DATA, NOT A LIVE FEED/);
  expect(body.canClaimLossAvoided).toBe(false);
  expect(JSON.stringify(body)).not.toMatch(/bankruptcy_or_restructuring/);

  for (const entry of body.entries) {
    // The field whose absence made the old payload assert a fabricated
    // corporate event about a real company.
    expect(entry.provenance).toBeTruthy();
    expect(entry.provenance.dataMode).not.toBe("LIVE");
    expect(entry.provenance.label.length).toBeGreaterThan(0);
    expect(entry.marketConfirmation.okxLeg).toBe("UNAVAILABLE");
  }
});
