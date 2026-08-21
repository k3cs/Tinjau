/**
 * X (Twitter) READ-ONLY client for the listener leg (task S5.1).
 *
 * ---------------------------------------------------------------------------------------
 * THIS MODULE CANNOT POST. It issues `GET` requests and nothing else.
 *
 * `postToX.ts` is the publisher and is deliberately not imported here, nor is
 * `oauth1Sign`'s result ever attached to a non-GET request in this file. There is no code
 * path in this module that tweets, replies, likes, follows, deletes, or mutates any X
 * resource. A reader auditing "can the listener emit anything?" should be able to answer it
 * from the two lines below: every request goes through `xGet`, and `xGet` hardcodes
 * `method: "GET"`.
 *
 * WHY OAUTH 1.0a AND NOT A BEARER TOKEN. The project holds
 * `X_API_KEY`/`X_API_SECRET`/`X_ACCESS_TOKEN`/`X_ACCESS_TOKEN_SECRET` and no bearer token.
 * `GET /2/tweets/search/recent` accepts OAuth 1.0a User Context, and `signOAuth1Request`
 * already implements it and is already verified against Twitter's published worked example
 * (`test/oauth1Sign.test.ts`). Unlike `POST /2/tweets`, a GET's query parameters ARE part of
 * the RFC 5849 §3.4.1.3 signature base string, which is why `params` is passed through here
 * and is empty in the publisher.
 *
 * TIER. `search/recent` is a paid-tier read endpoint. On a project with no read credits X
 * answers `402 Payment Required` with `title: "Payment Required"` and
 * `type: ".../problems/credits-depleted"` — an access outcome, not a transport failure, and
 * classified as its own kind so a caller can tell "the tier does not permit this" apart from
 * "the network hiccuped". It must never be papered over: the correct response to it is to
 * publish that the listener could not read, not to substitute another source.
 * ---------------------------------------------------------------------------------------
 */

import { signOAuth1Request } from "./oauth1Sign.js";

const SEARCH_RECENT_URL = "https://api.x.com/2/tweets/search/recent";

/** The four OAuth 1.0a values. Read from the environment by name; never logged. */
export interface XReadCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

/**
 * Reads the four `X_*` env vars.
 *
 * Identical contract to `postToX.ts::readXCredentialsFromEnv` and duplicated rather than
 * imported on purpose: importing it would make the listener depend on the publisher module,
 * and the one property this file most wants to be able to state is that it does not.
 * The error names VARIABLES and never values.
 */
export function readXCredentialsFromEnv(): XReadCredentials {
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
    .filter(([, v]) => !v || String(v).trim().length === 0)
    .map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(
      `[readFromX] missing required env var(s): ${missing.join(", ")} — refusing to read.`,
    );
  }
  return {
    apiKey: apiKey!,
    apiSecret: apiSecret!,
    accessToken: accessToken!,
    accessTokenSecret: accessTokenSecret!,
  };
}

// ---------------------------------------------------------------------------
// The API's own shapes, narrowed to the fields this listener uses.
//
// Every field is optional because the API omits what was not requested or not available,
// and the listener must be able to record a field as UNAVAILABLE rather than fill it in.
// ---------------------------------------------------------------------------

export interface XPost {
  id?: string;
  text?: string;
  /** RFC 3339. Present only when `tweet.fields=created_at` was requested AND granted. */
  created_at?: string;
  author_id?: string;
  lang?: string;
  possibly_sensitive?: boolean;
  referenced_tweets?: { type: string; id: string }[];
}

export interface XAuthor {
  id?: string;
  username?: string;
  name?: string;
  /** True for a locked/private account. The listener must skip those unconditionally. */
  protected?: boolean;
  verified?: boolean;
}

export interface XSearchPayload {
  data?: XPost[];
  includes?: { users?: XAuthor[] };
  meta?: { result_count?: number; newest_id?: string; oldest_id?: string };
}

/**
 * The outcome of one read attempt.
 *
 * `ok` with an empty `posts` array is a legitimate, successful result — "nothing matched in
 * the window sampled" is an answer, not a failure, and collapsing it into an error kind would
 * push a caller toward inventing data to fill the gap.
 */
export type XReadResult =
  | { ok: true; payload: XSearchPayload; httpStatus: number; rateLimitRemaining: string | null }
  | { ok: false; kind: XReadFailureKind; httpStatus: number; detail: string; apiTitle: string | null; apiType: string | null };

export type XReadFailureKind =
  /** 402. The project has no read credits / the tier does not include this endpoint. */
  | "no_read_access"
  /** 401/403. Credentials rejected or the app lacks the scope. */
  | "auth"
  /** 429. */
  | "rate_limit"
  /** 400. A malformed query — this listener's bug, not X's. */
  | "bad_request"
  /** 5xx, a network error, or an unparseable body. */
  | "transient";

/**
 * Classifies a completed (or failed) read response into exactly one kind.
 *
 * Pure — no fetch, no I/O — so it is directly testable against fixture status codes, the same
 * shape `postToX.ts::classifyPostToXFailure` and `okxIndexClient.ts::classifyIndexResponse`
 * use. `402` is separated from `auth` deliberately: a 402 means the credentials are fine and
 * the plan is not, and a run that reported it as an auth problem would send someone to rotate
 * a working key.
 */
export function classifyXReadFailure(
  status: number,
  bodyText: string,
): Extract<XReadResult, { ok: false }> {
  let apiTitle: string | null = null;
  let apiType: string | null = null;
  try {
    const parsed = JSON.parse(bodyText) as { title?: unknown; type?: unknown };
    if (typeof parsed?.title === "string") apiTitle = parsed.title;
    if (typeof parsed?.type === "string") apiType = parsed.type;
  } catch {
    // Body was not JSON. Left null; `detail` still carries the truncated text.
  }

  const detail = bodyText.slice(0, 500);
  if (status === 402) return { ok: false, kind: "no_read_access", httpStatus: status, detail, apiTitle, apiType };
  if (status === 401 || status === 403) return { ok: false, kind: "auth", httpStatus: status, detail, apiTitle, apiType };
  if (status === 429) return { ok: false, kind: "rate_limit", httpStatus: status, detail, apiTitle, apiType };
  if (status === 400) return { ok: false, kind: "bad_request", httpStatus: status, detail, apiTitle, apiType };
  return { ok: false, kind: "transient", httpStatus: status, detail, apiTitle, apiType };
}

/**
 * The ONLY request primitive in this module. `method` is not a parameter.
 *
 * Making it a constant rather than an argument is the point: there is no call site, present or
 * future, that can turn this helper into a write by passing a different verb.
 */
async function xGet(
  url: string,
  params: Record<string, string>,
  creds: XReadCredentials,
): Promise<XReadResult> {
  const { Authorization } = signOAuth1Request({
    method: "GET",
    url,
    // A GET's query parameters ARE signable under RFC 5849 §3.4.1.3 — unlike the JSON-bodied
    // POST the publisher signs, where this is empty. Omitting them here produces a valid-looking
    // signature that X rejects, so they are threaded through deliberately.
    params,
    consumerKey: creds.apiKey,
    consumerSecret: creds.apiSecret,
    token: creds.accessToken,
    tokenSecret: creds.accessTokenSecret,
  });

  const qs = new URLSearchParams(params).toString();
  let response: Response;
  try {
    response = await fetch(qs ? `${url}?${qs}` : url, {
      method: "GET",
      headers: { Authorization },
    });
  } catch (err) {
    return {
      ok: false,
      kind: "transient",
      httpStatus: 0,
      detail: `network error calling ${url}: ${err instanceof Error ? err.message : String(err)}`,
      apiTitle: null,
      apiType: null,
    };
  }

  const bodyText = await response.text();
  if (!response.ok) return classifyXReadFailure(response.status, bodyText);

  let payload: XSearchPayload;
  try {
    payload = JSON.parse(bodyText) as XSearchPayload;
  } catch {
    return {
      ok: false,
      kind: "transient",
      httpStatus: response.status,
      detail: `status=${response.status} but body is not valid JSON: ${bodyText.slice(0, 500)}`,
      apiTitle: null,
      apiType: null,
    };
  }

  return {
    ok: true,
    payload,
    httpStatus: response.status,
    rateLimitRemaining: response.headers.get("x-rate-limit-remaining"),
  };
}

export interface SearchRecentOptions {
  query: string;
  /** X permits 10..100. The listener asks for a small number; this is a sample, not a sweep. */
  maxResults: number;
}

/** The exact endpoint and field set this listener requests. Recorded in the artifact verbatim. */
export const SEARCH_RECENT_ENDPOINT = SEARCH_RECENT_URL;

export const SEARCH_RECENT_FIELDS = Object.freeze({
  "tweet.fields": "created_at,author_id,lang,possibly_sensitive,referenced_tweets",
  expansions: "author_id",
  "user.fields": "username,name,protected,verified",
});

/**
 * One read of `GET /2/tweets/search/recent`. Read-only. No retry.
 *
 * No retry on purpose: a rate limit or a credit exhaustion answered by hammering the endpoint
 * is how a listener turns a reportable access problem into a ban. One attempt, and whatever it
 * returns is the run's result.
 */
export async function searchRecentPosts(
  opts: SearchRecentOptions,
  creds: XReadCredentials = readXCredentialsFromEnv(),
): Promise<XReadResult> {
  const params: Record<string, string> = {
    query: opts.query,
    max_results: String(opts.maxResults),
    ...SEARCH_RECENT_FIELDS,
  };
  return xGet(SEARCH_RECENT_URL, params, creds);
}

/** Joins a post to its author from the `includes.users` expansion. Null when absent. */
export function findAuthor(payload: XSearchPayload, authorId: string | undefined): XAuthor | null {
  if (!authorId) return null;
  return payload.includes?.users?.find((u) => u.id === authorId) ?? null;
}
