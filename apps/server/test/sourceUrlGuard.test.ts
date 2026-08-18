/**
 * Tests task P5.3's mandatory sourceUrl guard (src/xbot/sourceUrlGuard.ts). Every case
 * here is a case the bot's per-event handler relies on to decide whether an event's
 * sourceUrl is trustworthy enough to ever appear in a public tweet.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { isRealSecFilingSourceUrl } from "../src/xbot/sourceUrlGuard.js";

test("real EDGAR filing URL passes", () => {
  assert.equal(
    isRealSecFilingSourceUrl(
      "https://www.sec.gov/Archives/edgar/data/1045810/000119312526341297/d123456d8k.htm",
    ),
    true,
  );
});

test("P4.4 synthetic scheme is rejected — critical regression case", () => {
  assert.equal(
    isRealSecFilingSourceUrl("synthetic://afterhours/P4.4/nvdax-8k-grave-bankruptcy.html"),
    false,
  );
});

test("empty string is rejected", () => {
  assert.equal(isRealSecFilingSourceUrl(""), false);
});

test("non-URL garbage does not throw and is rejected", () => {
  assert.doesNotThrow(() => isRealSecFilingSourceUrl("not a url"));
  assert.equal(isRealSecFilingSourceUrl("not a url"), false);
});

test("wrong scheme (http, not https) is rejected", () => {
  assert.equal(
    isRealSecFilingSourceUrl("http://www.sec.gov/Archives/edgar/data/1045810/000119312526341297/d123456d8k.htm"),
    false,
  );
});

test("lookalike domain suffix (www.sec.gov.evil.com) is rejected", () => {
  assert.equal(
    isRealSecFilingSourceUrl("https://www.sec.gov.evil.com/Archives/edgar/data/1045810/foo.htm"),
    false,
  );
});

test("lookalike domain prefix (evil-www.sec.gov) is rejected", () => {
  assert.equal(isRealSecFilingSourceUrl("https://evil-www.sec.gov/Archives/edgar/data/1045810/foo.htm"), false);
});

test("sec.gov appearing only in the path, not the host, is rejected", () => {
  assert.equal(isRealSecFilingSourceUrl("https://evil.com/www.sec.gov/Archives/edgar/data/1045810/foo.htm"), false);
});

test("userinfo trick (https://www.sec.gov@evil.com/...) is rejected", () => {
  // Confirms new URL().hostname resolves this to "evil.com", not "www.sec.gov" — a naive
  // startsWith-only check would be fooled by this.
  const url = "https://www.sec.gov@evil.com/Archives/edgar/data/1045810/foo.htm";
  assert.equal(new URL(url).hostname, "evil.com");
  assert.equal(isRealSecFilingSourceUrl(url), false);
});

test("uppercased host (https://WWW.SEC.GOV/...) is rejected — intentionally strict, not case-normalized", () => {
  assert.equal(
    isRealSecFilingSourceUrl("https://WWW.SEC.GOV/Archives/edgar/data/1045810/foo.htm"),
    false,
  );
});

test("bare host with no path is rejected", () => {
  assert.equal(isRealSecFilingSourceUrl("https://www.sec.gov"), false);
});
