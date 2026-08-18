/**
 * Thin integration test for the P5.1 scoreboard-api HTTP server (`src/scoreboard-api/server.ts`).
 * Uses Node's `--test` + an ephemeral local port. `getScoreboardData` is stubbed — no live
 * RPC connection is required or attempted. Covers: method lock (405/404), `/health` shape,
 * and rate-limit 429 behavior (using an injectable `now` so the test doesn't need to fire
 * 60+ real requests or wait on a real clock).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createServer, createScoreboardCache, FixedWindowRateLimiter, type ScoreboardEntry } from "../src/scoreboard-api/server.js";

function fakeScoreboardData(): ScoreboardEntry[] {
  return [
    {
      eventId: "1",
      token: "0xAE2f842EF90C0d5213259Ab82639D5BBF649b08E",
      ticker: "MSTRx",
      eventTypeLabel: "8-K — capital_raise",
      postTimeSec: 1_786_968_582,
      postTimeIso: "2026-08-17T12:09:42.000Z",
      reaction: { state: "no_poller_coverage" },
    },
  ];
}

async function withTestServer(
  opts: { rateLimitPerMinute?: number; now?: () => number; getScoreboardData?: () => Promise<ScoreboardEntry[]> },
  fn: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = createServer({
    getScoreboardData: opts.getScoreboardData ?? (async () => fakeScoreboardData()),
    cacheTtlMs: 30_000,
    rateLimitPerMinute: opts.rateLimitPerMinute ?? 60,
    now: opts.now,
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

// ---------------------------------------------------------------------------
// /health
// ---------------------------------------------------------------------------

test("GET /health returns 200 with a status/ts shape", async () => {
  await withTestServer({}, async (base) => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "ok");
    assert.equal(typeof body.ts, "string");
    assert.ok(!Number.isNaN(Date.parse(body.ts)));
  });
});

test("POST /health returns 405 with an Allow: GET header", async () => {
  await withTestServer({}, async (base) => {
    const res = await fetch(`${base}/health`, { method: "POST" });
    assert.equal(res.status, 405);
    assert.equal(res.headers.get("allow"), "GET");
  });
});

// ---------------------------------------------------------------------------
// /scoreboard — happy path + method lock
// ---------------------------------------------------------------------------

test("GET /scoreboard returns 200 with the injected data, no CORS header present", async () => {
  await withTestServer({}, async (base) => {
    const res = await fetch(`${base}/scoreboard`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.length, 1);
    assert.equal(body[0].reaction.state, "no_poller_coverage");
    assert.equal(res.headers.get("access-control-allow-origin"), null);
  });
});

test("POST /scoreboard returns 405 with an Allow: GET header", async () => {
  await withTestServer({}, async (base) => {
    const res = await fetch(`${base}/scoreboard`, { method: "POST" });
    assert.equal(res.status, 405);
    assert.equal(res.headers.get("allow"), "GET");
  });
});

test("GET /unknown-route returns 404", async () => {
  await withTestServer({}, async (base) => {
    const res = await fetch(`${base}/unknown-route`);
    assert.equal(res.status, 404);
  });
});

test("/scoreboard surfaces a compute failure as 503, not a crash", async () => {
  await withTestServer({ getScoreboardData: async () => { throw new Error("rpc down"); } }, async (base) => {
    const res = await fetch(`${base}/scoreboard`);
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.match(body.error, /unavailable/);
  });
});

// ---------------------------------------------------------------------------
// Rate limiting — a real 429 over HTTP, using an injectable clock so this doesn't need to
// fire 60+ real requests or wait on wall-clock time.
// ---------------------------------------------------------------------------

test("GET /scoreboard: 61st request within the same 60s window gets a real 429 with Retry-After", async () => {
  let fakeNowMs = 1_700_000_000_000;
  await withTestServer({ rateLimitPerMinute: 60, now: () => fakeNowMs }, async (base) => {
    for (let i = 0; i < 60; i++) {
      const res = await fetch(`${base}/scoreboard`);
      assert.equal(res.status, 200, `request #${i + 1} should be allowed`);
    }
    const blocked = await fetch(`${base}/scoreboard`);
    assert.equal(blocked.status, 429);
    const retryAfter = blocked.headers.get("retry-after");
    assert.ok(retryAfter !== null);
    assert.ok(Number(retryAfter) > 0 && Number(retryAfter) <= 60);
    const body = await blocked.json();
    assert.match(body.error, /rate limit/i);
  });
});

test("GET /scoreboard: rate limit resets after the 60s window rolls over", async () => {
  let fakeNowMs = 1_700_000_000_000;
  await withTestServer({ rateLimitPerMinute: 2, now: () => fakeNowMs }, async (base) => {
    assert.equal((await fetch(`${base}/scoreboard`)).status, 200);
    assert.equal((await fetch(`${base}/scoreboard`)).status, 200);
    assert.equal((await fetch(`${base}/scoreboard`)).status, 429);
    fakeNowMs += 60_001; // advance past the fixed window
    assert.equal((await fetch(`${base}/scoreboard`)).status, 200);
  });
});

// ---------------------------------------------------------------------------
// Unit-level: FixedWindowRateLimiter directly, and cache coalescing.
// ---------------------------------------------------------------------------

test("FixedWindowRateLimiter: allows up to the limit, blocks the next, per key independently", () => {
  let nowMs = 0;
  const limiter = new FixedWindowRateLimiter(2, () => nowMs);
  assert.equal(limiter.check("ip-a"), null);
  assert.equal(limiter.check("ip-a"), null);
  const blocked = limiter.check("ip-a");
  assert.ok(typeof blocked === "number" && blocked > 0);
  // A different key has its own independent window.
  assert.equal(limiter.check("ip-b"), null);
});

test("createScoreboardCache: coalesces concurrent recomputes into one underlying call", async () => {
  let computeCalls = 0;
  const cache = createScoreboardCache(async () => {
    computeCalls += 1;
    await new Promise((r) => setTimeout(r, 10));
    return fakeScoreboardData();
  }, 30_000);

  const [a, b, c] = await Promise.all([cache.get(), cache.get(), cache.get()]);
  assert.equal(computeCalls, 1);
  assert.deepEqual(a, b);
  assert.deepEqual(b, c);
});

test("createScoreboardCache: recomputes once the TTL has elapsed", async () => {
  let computeCalls = 0;
  let nowMs = 0;
  const cache = createScoreboardCache(async () => {
    computeCalls += 1;
    return fakeScoreboardData();
  }, 1000, () => nowMs);

  await cache.get();
  await cache.get();
  assert.equal(computeCalls, 1, "second call within TTL should reuse the cached value");
  nowMs += 1001;
  await cache.get();
  assert.equal(computeCalls, 2, "call after TTL elapsed should recompute");
});
