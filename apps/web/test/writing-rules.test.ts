/**
 * Writing rules that are cheaper to enforce than to remember.
 *
 * 1. The em dash (U+2014) is ruled out of this project entirely: UI copy, code
 *    comments, metadata, and `DESIGN.md`. It kept reappearing because it reads
 *    as natural prose while writing, which is exactly why a habit cannot be the
 *    control. Use parentheses for an aside or split the sentence. The en dash
 *    (U+2013) is still allowed for numeric ranges.
 *
 * 2. The claim boundary in §0.19 has a handful of phrases that must never be
 *    written on any surface. `e2e/claim-boundary.spec.ts` checks the rendered
 *    pages; this checks the source, so a forbidden phrase cannot sit unnoticed
 *    in a component that is temporarily unrouted.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const WEB_ROOT = fileURLToPath(new URL("..", import.meta.url));
const REPO_ROOT = fileURLToPath(new URL("../../..", import.meta.url));

/**
 * Built from the code point rather than typed, so this file can name the
 * character it bans without becoming its own first offender.
 */
const EM_DASH = String.fromCharCode(0x2014);
/**
 * The same character as a JSON/JS escape, which `includes(EM_DASH)` misses.
 * Concatenated so this line does not contain the sequence it searches for.
 */
const EM_DASH_ESCAPE = "\\" + "u2014";
const SCAN_EXTENSIONS = [".ts", ".tsx", ".css", ".mjs", ".json"];

/**
 * Config and manifest files that sit beside `src/` rather than inside it.
 *
 * `package.json` is on this list because its `description` shipped an escaped
 * em dash for months: the old walk started at `src/` and `e2e/`, so nothing at
 * the package root was ever read, and the escape form would have slipped past
 * a literal-only match even if it had been.
 */
const ROOT_FILES = [
  "package.json",
  "next.config.mjs",
  "tailwind.config.ts",
  "postcss.config.mjs",
  "playwright.config.ts",
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (SCAN_EXTENSIONS.some((ext) => entry.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

const SOURCE_FILES = [...walk(join(WEB_ROOT, "src")), ...walk(join(WEB_ROOT, "e2e"))];

/** Source, plus the config files the old `src/`-only walk never looked at. */
const WRITTEN_FILES = [
  ...SOURCE_FILES,
  ...walk(join(WEB_ROOT, "test")),
  ...ROOT_FILES.map((name) => join(WEB_ROOT, name)),
];

function hasEmDash(line: string): boolean {
  return line.includes(EM_DASH) || line.includes(EM_DASH_ESCAPE);
}

test("no written file contains an em dash", () => {
  const offenders: string[] = [];
  for (const file of WRITTEN_FILES) {
    const text = readFileSync(file, "utf8");
    if (!hasEmDash(text)) continue;
    text.split("\n").forEach((line, i) => {
      if (hasEmDash(line)) {
        offenders.push(`${relative(WEB_ROOT, file)}:${i + 1}: ${line.trim()}`);
      }
    });
  }
  assert.deepEqual(
    offenders,
    [],
    `Em dash (U+2014) is not used in this project. Use parentheses or two sentences.\n${offenders.join("\n")}`,
  );
});

/**
 * The handoff is read-only to this lane and it does use em dashes, so the rule
 * cannot be enforced at its source. It is enforced at the boundary instead:
 * `src/lib/handoff/artifacts.ts` runs every artifact through `deepHouseStyle`
 * once, at module load. This test reads what the components actually receive.
 *
 * It is the check that was missing. A component sweep passed while
 * `three-policy-comparison.json` shipped an em dash straight to `/compare`.
 */
test("no string reaching a component from the handoff contains an em dash", async () => {
  const artifacts = await import("../src/lib/handoff/artifacts.ts");
  const offenders: string[] = [];

  function scan(value: unknown, path: string): void {
    if (typeof value === "string") {
      if (hasEmDash(value)) offenders.push(`${path}: ${value.slice(0, 120)}`);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, i) => scan(item, `${path}[${i}]`));
      return;
    }
    if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value)) scan(item, `${path}.${key}`);
    }
  }

  for (const name of ["RUMOUR_SCENARIO", "CONFIRMED_SCENARIO", "COMPARISON", "DEPLOYED"]) {
    scan((artifacts as Record<string, unknown>)[name], name);
  }

  assert.deepEqual(
    offenders,
    [],
    `Handoff copy reached the UI with an em dash. deepHouseStyle should have rewritten it.\n${offenders.join("\n")}`,
  );
});

/**
 * The em dash rewrite must keep the clause, not delete it. Compressing a hedged
 * sentence is how a qualification quietly disappears, and every one of these
 * strings is a backend qualification.
 */
test("houseStyle rewrites an em dash without dropping the clause", async () => {
  const { houseStyle } = await import("../src/lib/copy.ts");
  const dash = EM_DASH;

  assert.equal(
    houseStyle(`No decision anchor is reachable from its input type ${dash} enforced by the type, not by convention.`),
    "No decision anchor is reachable from its input type (enforced by the type, not by convention).",
  );
  assert.equal(
    houseStyle(`The market leg ${dash} unavailable for all four ${dash} cannot confirm.`),
    "The market leg, unavailable for all four, cannot confirm.",
  );
  assert.equal(houseStyle("Untouched text stays identical."), "Untouched text stays identical.");
});

/**
 * Dark is the only theme, and the light half of the OKX ramp was deleted from
 * `tailwind.config.ts` so nothing can reach for it. Tailwind does not error on
 * an unknown class, though: `bg-paper-bright` would just silently produce no
 * background, which on a black page looks almost right and is not. This is the
 * check that turns that silence into a build failure.
 */
const LIGHT_ONLY_CLASS =
  /(?:^|["'\s`{])(?:[a-z-]+:)*(?:bg|text|border|ring|ring-offset|decoration|fill|stroke|divide|placeholder|outline|shadow)-(?:paper|coal|edge-light|signal-deep|normal-deep|watch-deep|protect-deep|confirm-deep)(?![a-z])/;

test("no component reaches for a light-theme token", () => {
  const offenders: string[] = [];
  for (const file of SOURCE_FILES) {
    const text = readFileSync(file, "utf8");
    text.split("\n").forEach((line, i) => {
      if (LIGHT_ONLY_CLASS.test(line)) {
        offenders.push(`${relative(WEB_ROOT, file)}:${i + 1}: ${line.trim().slice(0, 140)}`);
      }
    });
  }
  assert.deepEqual(
    offenders,
    [],
    `Tinjau ships one theme (dark). These tokens no longer exist.\n${offenders.join("\n")}`,
  );
});

/**
 * `color-scheme` and `prefers-color-scheme` are the two ways a light rendering
 * can come back after the tokens are gone: the first lets the browser paint its
 * own light chrome, the second reintroduces a branch.
 */
test("no stylesheet reintroduces a light rendering", () => {
  const css = readFileSync(join(WEB_ROOT, "src/app/globals.css"), "utf8");
  assert.ok(
    /color-scheme:\s*dark\s*;/.test(css),
    "globals.css must pin `color-scheme: dark` so browser chrome matches the page.",
  );
  assert.ok(
    !/color-scheme:\s*light/.test(css),
    "globals.css must not offer a light color-scheme.",
  );
  for (const file of [...SOURCE_FILES, join(WEB_ROOT, "src/app/globals.css")]) {
    assert.ok(
      !readFileSync(file, "utf8").includes("prefers-color-scheme"),
      `${relative(WEB_ROOT, file)} branches on prefers-color-scheme; dark is the only theme.`,
    );
  }
});

test("DESIGN.md contains no em dash", () => {
  const text = readFileSync(join(REPO_ROOT, "DESIGN.md"), "utf8");
  const lines = text
    .split("\n")
    .map((line, i) => (line.includes(EM_DASH) ? `DESIGN.md:${i + 1}: ${line.trim()}` : null))
    .filter((line): line is string => line !== null);
  assert.deepEqual(lines, [], `DESIGN.md must not use an em dash.\n${lines.join("\n")}`);
});

/**
 * Phrases §0.19 and `known-limitations.md` §18 forbid. Each is matched
 * case-insensitively against source text. Kept narrow on purpose: a check that
 * fires on innocent wording gets disabled, and a disabled check protects
 * nothing.
 */
const FORBIDDEN_CLAIMS: Array<[label: string, pattern: RegExp]> = [
  ["first AI dynamic-fee hook", /first\s+ai\s+dynamic[- ]fee\s+hook/i],
  ["first multi-agent corporate-action oracle", /first\s+multi[- ]agent\s+corporate[- ]action/i],
  ["first on-chain risk registry", /first\s+on[- ]chain\s+risk\s+registry/i],
  ["first CEX/DEX risk agent", /first\s+cex\s*\/\s*dex\s+risk\s+agent/i],
  ["first self-protecting pool", /first\s+self[- ]protecting\s+pool/i],
  ["dual OKX/X Layer confirmation", /dual\s+okx\s*\/\s*x\s*layer\s+confirmation/i],
  ["protected TVL", /protected\s+tvl/i],
];

/**
 * "Reduces LP loss" must be catchable while the site's own disclaimers, which
 * quote the phrase in order to disown it, must pass. So the pattern requires an
 * asserting subject immediately before it and no negation attached.
 */
const REDUCES_LP_LOSS = /(tinjau|the\s+pool|this\s+product|we)\s+(reduce[sd]?|prevent[sed]*|avoid[sed]*)\s+lp\s+loss/i;

/**
 * Two files exist in order to name the forbidden phrases, so a text match
 * inside them is the file working rather than failing. Both are listed
 * explicitly instead of loosening the patterns, because a pattern loose enough
 * to spare them would also spare a genuine overclaim.
 *
 *  - `e2e/claim-boundary.spec.ts` asserts the rendered pages do not carry them.
 *  - `landing/measured-result.tsx` prints one struck through, under the heading
 *    "What we will not say", to disown it in public. The strike-through and the
 *    screen-reader prefix are asserted by the e2e spec.
 */
const CLAIM_ALLOWLIST = new Set([
  "e2e/claim-boundary.spec.ts",
  "src/app/_components/landing/measured-result.tsx",
]);

/**
 * A bare `<div>` has the implicit role `generic`, which **prohibits**
 * `aria-label`. Every loading skeleton had one, so the accessible name was
 * silently dropped and nothing was announced while a route loaded. It only
 * surfaced against the deployed site, because a warm local dev server never
 * shows the skeleton long enough for axe to sample it.
 *
 * `role="status"` both permits the name and makes it a polite live region,
 * which is the behaviour these were reaching for.
 */
test("every loading skeleton that names itself also carries a role", () => {
  const offenders: string[] = [];
  for (const file of SOURCE_FILES) {
    if (!file.endsWith("loading.tsx")) continue;
    const text = readFileSync(file, "utf8");
    if (!text.includes("aria-label")) continue;
    if (!/role=["']status["']|role=["']alert["']/.test(text)) {
      offenders.push(
        `${relative(WEB_ROOT, file)}: aria-label on an element with no naming role (generic prohibits it)`,
      );
    }
  }
  assert.deepEqual(offenders, [], offenders.join("\n"));
});

test("no source file makes a claim the evidence does not support", () => {
  const offenders: string[] = [];
  for (const file of SOURCE_FILES) {
    if (CLAIM_ALLOWLIST.has(relative(WEB_ROOT, file))) continue;
    const text = readFileSync(file, "utf8");
    for (const [label, pattern] of FORBIDDEN_CLAIMS) {
      if (pattern.test(text)) offenders.push(`${relative(WEB_ROOT, file)}: ${label}`);
    }
    if (REDUCES_LP_LOSS.test(text)) {
      offenders.push(`${relative(WEB_ROOT, file)}: asserts reduced LP loss (canClaimLossAvoided is false)`);
    }
  }
  assert.deepEqual(offenders, [], `Forbidden claim found in source.\n${offenders.join("\n")}`);
});
