/**
 * X (Twitter) posting client for the AFTERHOURS bot (task P5.3).
 *
 * `dry-run`: returns immediately, NO network call, and does not read/require any `X_*`
 * credential at all — this lets the service start and run cleanly with zero `X_*` env vars
 * set, which is the only mode this dispatch deploys (P0.1 — creating the real X account —
 * has not happened yet).
 *
 * `live`: a real `POST https://api.x.com/2/tweets`, OAuth 1.0a User Context signed via
 * `oauth1Sign.ts`. Response classification (`auth` / `rate_limit` / `transient` /
 * `bad_request`) mirrors `src/index-poller/okxIndexClient.ts`'s `classifyIndexResponse`
 * style: a small pure function, separately unit-testable from the network call itself.
 */

import { signOAuth1Request } from "./oauth1Sign.js";

export type PostToXResult =
  | { posted: true; id: string; dryRun: false }
  | { posted: true; id: null; dryRun: true; wouldPostText: string }
  | { posted: false; kind: "auth" | "rate_limit" | "transient" | "bad_request"; detail: string; dryRun: false };

export interface PostToXOptions {
  postMode: "dry-run" | "live";
}

const TWEETS_URL = "https://api.x.com/2/tweets";

export interface XCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

/** Reads the four `X_*` env vars — only ever called from the `live` branch of `postToX`. */
export function readXCredentialsFromEnv(): XCredentials {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;
  const missing = [
    ["X_API_KEY", apiKey],
    ["X_API_SECRET", apiSecret],
    ["X_ACCESS_TOKEN", accessToken],
    ["X_ACCESS_TOKEN_SECRET", accessTokenSecret],
  ]
    .filter(([, v]) => !v)
    .map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(
      `[postToX] postMode=live but missing required env var(s): ${missing.join(", ")} — refusing to post.`,
    );
  }
  return {
    apiKey: apiKey!,
    apiSecret: apiSecret!,
    accessToken: accessToken!,
    accessTokenSecret: accessTokenSecret!,
  };
}

/**
 * Classifies a completed (or failed) `POST /2/tweets` HTTP response into exactly one of
 * the 4 non-success outcome kinds. Pure — no fetch, no I/O — so it's directly
 * unit-testable against fixture status codes/bodies, mirroring
 * `okxIndexClient.ts::classifyIndexResponse`.
 */
export function classifyPostToXFailure(status: number, bodyText: string): Extract<PostToXResult, { posted: false }> {
  if (status === 401 || status === 403) {
    return { posted: false, kind: "auth", detail: bodyText.slice(0, 500), dryRun: false };
  }
  if (status === 429) {
    return { posted: false, kind: "rate_limit", detail: bodyText.slice(0, 500), dryRun: false };
  }
  if (status === 400) {
    return { posted: false, kind: "bad_request", detail: bodyText.slice(0, 500), dryRun: false };
  }
  // 5xx, network error, and anything else unrecognized: transient, safe to retry later.
  return { posted: false, kind: "transient", detail: `status=${status} body=${bodyText.slice(0, 500)}`, dryRun: false };
}

/**
 * Posts one tweet. `dry-run`: no network call at all, credentials not read. `live`: real
 * `POST https://api.x.com/2/tweets`.
 */
export async function postToX(text: string, opts: PostToXOptions): Promise<PostToXResult> {
  if (opts.postMode === "dry-run") {
    return { posted: true, id: null, dryRun: true, wouldPostText: text };
  }

  const creds = readXCredentialsFromEnv();
  const body = JSON.stringify({ text });
  const { Authorization } = signOAuth1Request({
    method: "POST",
    url: TWEETS_URL,
    // No signable params: the request body is JSON, not application/x-www-form-urlencoded,
    // so per RFC 5849 §3.4.1.3 only the oauth_* params (added internally by
    // signOAuth1Request) are part of the signature base string.
    consumerKey: creds.apiKey,
    consumerSecret: creds.apiSecret,
    token: creds.accessToken,
    tokenSecret: creds.accessTokenSecret,
  });

  let response: Response;
  try {
    response = await fetch(TWEETS_URL, {
      method: "POST",
      headers: {
        Authorization,
        "Content-Type": "application/json",
      },
      body,
    });
  } catch (err) {
    return {
      posted: false,
      kind: "transient",
      detail: `network error calling ${TWEETS_URL}: ${err instanceof Error ? err.message : String(err)}`,
      dryRun: false,
    };
  }

  const bodyText = await response.text();

  if (!response.ok) {
    return classifyPostToXFailure(response.status, bodyText);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return {
      posted: false,
      kind: "transient",
      detail: `status=${response.status} but body is not valid JSON: ${bodyText.slice(0, 500)}`,
      dryRun: false,
    };
  }

  const id = (parsed as { data?: { id?: string } } | undefined)?.data?.id;
  if (typeof id !== "string" || id.length === 0) {
    return {
      posted: false,
      kind: "transient",
      detail: `status=${response.status} but response JSON had no data.id: ${bodyText.slice(0, 500)}`,
      dryRun: false,
    };
  }

  return { posted: true, id, dryRun: false };
}
