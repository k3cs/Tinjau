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

const EM_DASH = "—";
const SCAN_EXTENSIONS = [".ts", ".tsx", ".css", ".mjs", ".json"];

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

test("no source file contains an em dash", () => {
  const offenders: string[] = [];
  for (const file of SOURCE_FILES) {
    const text = readFileSync(file, "utf8");
    if (!text.includes(EM_DASH)) continue;
    text.split("\n").forEach((line, i) => {
      if (line.includes(EM_DASH)) {
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
