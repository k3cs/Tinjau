/**
 * Tests task P5.3's X posting client (src/xbot/postToX.ts): dry-run behavior (no network
 * call, no credential requirement) and response classification. The network layer is
 * stubbed/mocked throughout — no live call to api.x.com is ever made by this suite.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { postToX, classifyPostToXFailure, readXCredentialsFromEnv } from "../src/xbot/postToX.js";

test("dry-run: returns immediately with dryRun:true, no network call, no credentials required", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("fetch must not be called in dry-run mode");
  };

  // Explicitly ensure no X_* env vars are set, matching the real dry-run deployment.
  const saved = {
    X_API_KEY: process.env.X_API_KEY,
    X_API_SECRET: process.env.X_API_SECRET,
    X_ACCESS_TOKEN: process.env.X_ACCESS_TOKEN,
    X_ACCESS_TOKEN_SECRET: process.env.X_ACCESS_TOKEN_SECRET,
  };
  delete process.env.X_API_KEY;
  delete process.env.X_API_SECRET;
  delete process.env.X_ACCESS_TOKEN;
  delete process.env.X_ACCESS_TOKEN_SECRET;

  try {
    const result = await postToX("hello world", { postMode: "dry-run" });
    assert.deepEqual(result, { posted: true, id: null, dryRun: true, wouldPostText: "hello world" });
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});

test("live: missing X_* credentials throws before any network call", async () => {
  const saved = {
    X_API_KEY: process.env.X_API_KEY,
    X_API_SECRET: process.env.X_API_SECRET,
    X_ACCESS_TOKEN: process.env.X_ACCESS_TOKEN,
    X_ACCESS_TOKEN_SECRET: process.env.X_ACCESS_TOKEN_SECRET,
  };
  delete process.env.X_API_KEY;
  delete process.env.X_API_SECRET;
  delete process.env.X_ACCESS_TOKEN;
  delete process.env.X_ACCESS_TOKEN_SECRET;
  try {
    assert.throws(() => readXCredentialsFromEnv(), /missing required env var/);
    await assert.rejects(() => postToX("hello", { postMode: "live" }), /missing required env var/);
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});

test("classifyPostToXFailure: 401/403 -> auth", () => {
  assert.equal(classifyPostToXFailure(401, "unauthorized").kind, "auth");
  assert.equal(classifyPostToXFailure(403, "forbidden").kind, "auth");
});

test("classifyPostToXFailure: 429 -> rate_limit", () => {
  assert.equal(classifyPostToXFailure(429, "too many requests").kind, "rate_limit");
});

test("classifyPostToXFailure: 400 -> bad_request", () => {
  assert.equal(classifyPostToXFailure(400, "bad text").kind, "bad_request");
});

test("classifyPostToXFailure: 500/other -> transient", () => {
  assert.equal(classifyPostToXFailure(500, "server error").kind, "transient");
  assert.equal(classifyPostToXFailure(503, "unavailable").kind, "transient");
  assert.equal(classifyPostToXFailure(418, "teapot").kind, "transient");
});

test("live: successful response resolves with posted:true, dryRun:false, id from data.id", async () => {
  const originalFetch = globalThis.fetch;
  process.env.X_API_KEY = "ck";
  process.env.X_API_SECRET = "cs";
  process.env.X_ACCESS_TOKEN = "tk";
  process.env.X_ACCESS_TOKEN_SECRET = "ts";
  // @ts-expect-error — stub, never hits the real network.
  globalThis.fetch = async (url: string, init: RequestInit) => {
    assert.equal(url, "https://api.x.com/2/tweets");
    assert.match((init.headers as Record<string, string>).Authorization, /^OAuth /);
    return new Response(JSON.stringify({ data: { id: "1234567890", text: "hi" } }), { status: 201 });
  };
  try {
    const result = await postToX("hi", { postMode: "live" });
    assert.deepEqual(result, { posted: true, id: "1234567890", dryRun: false });
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.X_API_KEY;
    delete process.env.X_API_SECRET;
    delete process.env.X_ACCESS_TOKEN;
    delete process.env.X_ACCESS_TOKEN_SECRET;
  }
});

test("live: non-ok response is classified via classifyPostToXFailure", async () => {
  const originalFetch = globalThis.fetch;
  process.env.X_API_KEY = "ck";
  process.env.X_API_SECRET = "cs";
  process.env.X_ACCESS_TOKEN = "tk";
  process.env.X_ACCESS_TOKEN_SECRET = "ts";
  globalThis.fetch = async () => new Response("rate limited", { status: 429 });
  try {
    const result = await postToX("hi", { postMode: "live" });
    assert.equal(result.posted, false);
    assert.equal((result as { kind: string }).kind, "rate_limit");
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.X_API_KEY;
    delete process.env.X_API_SECRET;
    delete process.env.X_ACCESS_TOKEN;
    delete process.env.X_ACCESS_TOKEN_SECRET;
  }
});

test("live: network error is classified as transient", async () => {
  const originalFetch = globalThis.fetch;
  process.env.X_API_KEY = "ck";
  process.env.X_API_SECRET = "cs";
  process.env.X_ACCESS_TOKEN = "tk";
  process.env.X_ACCESS_TOKEN_SECRET = "ts";
  globalThis.fetch = async () => {
    throw new Error("ECONNRESET");
  };
  try {
    const result = await postToX("hi", { postMode: "live" });
    assert.equal(result.posted, false);
    assert.equal((result as { kind: string }).kind, "transient");
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.X_API_KEY;
    delete process.env.X_API_SECRET;
    delete process.env.X_ACCESS_TOKEN;
    delete process.env.X_ACCESS_TOKEN_SECRET;
  }
});
