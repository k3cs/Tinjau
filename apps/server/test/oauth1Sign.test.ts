/**
 * Verifies task P5.3's OAuth 1.0a HMAC-SHA1 signer (src/xbot/oauth1Sign.ts) against
 * Twitter's own historical published worked example ("Creating a signature", the example
 * that shipped in dev.twitter.com's OAuth 1.0a documentation) — a real, independently
 * published test vector, not just internal self-consistency.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { signOAuth1Request } from "../src/xbot/oauth1Sign.js";

// Twitter's documented worked example. Every credential/param below is the literal example
// value from that doc — none of these are real, live credentials.
const EXAMPLE = {
  method: "POST",
  url: "https://api.twitter.com/1/statuses/update.json",
  params: {
    status: "Hello Ladies + Gentlemen, a signed OAuth request!",
    include_entities: "true",
  },
  consumerKey: "xvz1evFS4wEEPTGEFPHBog",
  consumerSecret: "kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw",
  token: "370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb",
  tokenSecret: "LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE",
  nonce: "kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg",
  timestamp: "1318622958",
};

const EXPECTED_SIGNATURE = "tnnArxj06cWHq44gCs1OSKk/jLY=";

test("signOAuth1Request matches the published Twitter OAuth 1.0a worked example", () => {
  const { Authorization } = signOAuth1Request(EXAMPLE);
  assert.match(Authorization, /^OAuth /);

  // Pull oauth_signature out of the header and compare against the documented value.
  const sigMatch = /oauth_signature="([^"]+)"/.exec(Authorization);
  assert.ok(sigMatch, `Authorization header missing oauth_signature: ${Authorization}`);
  const signature = decodeURIComponent(sigMatch![1]);
  assert.equal(signature, EXPECTED_SIGNATURE);
});

test("Authorization header carries all six required oauth_ fields plus the signature", () => {
  const { Authorization } = signOAuth1Request(EXAMPLE);
  for (const field of [
    "oauth_consumer_key",
    "oauth_nonce",
    "oauth_signature",
    "oauth_signature_method",
    "oauth_timestamp",
    "oauth_token",
    "oauth_version",
  ]) {
    assert.ok(Authorization.includes(`${field}=`), `missing ${field} in ${Authorization}`);
  }
  assert.ok(Authorization.includes('oauth_signature_method="HMAC-SHA1"'));
  assert.ok(Authorization.includes('oauth_version="1.0"'));
});

test("changing any credential or param changes the signature", () => {
  const base = signOAuth1Request(EXAMPLE).Authorization;
  const differentConsumerSecret = signOAuth1Request({ ...EXAMPLE, consumerSecret: "different-secret" }).Authorization;
  const differentParams = signOAuth1Request({ ...EXAMPLE, params: { ...EXAMPLE.params, status: "different text" } })
    .Authorization;
  assert.notEqual(base, differentConsumerSecret);
  assert.notEqual(base, differentParams);
});

test("omitting nonce/timestamp still produces a valid-shaped header (real-world usage)", () => {
  const { Authorization } = signOAuth1Request({
    method: "POST",
    url: "https://api.x.com/2/tweets",
    consumerKey: "ck",
    consumerSecret: "cs",
    token: "tk",
    tokenSecret: "ts",
  });
  assert.match(Authorization, /^OAuth oauth_consumer_key="ck"/);
  assert.match(Authorization, /oauth_nonce="[0-9a-f]{32}"/);
  assert.match(Authorization, /oauth_timestamp="\d+"/);
});
