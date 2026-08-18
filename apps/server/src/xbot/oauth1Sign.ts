/**
 * Pure OAuth 1.0a HMAC-SHA1 request signer (RFC 5849), task P5.3.
 *
 * Uses Node's built-in `crypto` only — no new npm dependency (X/Twitter's v2 API still
 * requires OAuth 1.0a User Context for `POST /2/tweets`, viem/hono don't provide this).
 *
 * `POST https://api.x.com/2/tweets` sends a JSON body, not `application/x-www-form-
 * urlencoded` — per RFC 5849 §3.4.1.3, only the URL's query parameters and (for form-
 * encoded bodies) the body parameters are part of the signature base string, so for this
 * endpoint `params` is normally empty and the base string reduces to the `oauth_*`
 * parameters alone. `params` is still accepted for completeness / future endpoints that do
 * take query params.
 */

import { createHmac, randomBytes } from "node:crypto";

export interface SignOAuth1RequestOptions {
  method: string;
  url: string;
  /** Additional signable params — URL query params, or form-urlencoded body params. Empty
   * for a JSON-bodied request like `POST /2/tweets`. */
  params?: Record<string, string>;
  consumerKey: string;
  consumerSecret: string;
  token: string;
  tokenSecret: string;
  /** Overridable for deterministic tests — omit in production to get a random nonce. */
  nonce?: string;
  /** Overridable for deterministic tests — omit in production to get the current time. */
  timestamp?: string;
}

export interface SignOAuth1RequestResult {
  Authorization: string;
}

/** RFC 3986 percent-encoding — stricter than `encodeURIComponent`, which leaves
 * `! * ' ( )` unescaped. OAuth 1.0a requires all of those escaped too. */
function percentEncode(input: string): string {
  return encodeURIComponent(input).replace(
    /[!*'()]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function buildBaseString(method: string, url: string, allParams: Record<string, string>): string {
  const encodedPairs = Object.entries(allParams)
    .map(([k, v]) => [percentEncode(k), percentEncode(v)] as const)
    // RFC 5849 §3.4.1.3.2: sort lexicographically by encoded key, then by encoded value.
    .sort(([ka, va], [kb, vb]) => (ka === kb ? (va < vb ? -1 : va > vb ? 1 : 0) : ka < kb ? -1 : 1));
  const paramString = encodedPairs.map(([k, v]) => `${k}=${v}`).join("&");
  return [method.toUpperCase(), percentEncode(url), percentEncode(paramString)].join("&");
}

/**
 * Signs one OAuth 1.0a User Context request and returns the `Authorization` header value
 * to send with it. Verified against the published Twitter OAuth 1.0a "Creating a
 * signature" worked example (test/oauth1Sign.test.ts) — not just internal self-consistency.
 */
export function signOAuth1Request(opts: SignOAuth1RequestOptions): SignOAuth1RequestResult {
  const nonce = opts.nonce ?? randomBytes(16).toString("hex");
  const timestamp = opts.timestamp ?? String(Math.floor(Date.now() / 1000));

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: opts.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: opts.token,
    oauth_version: "1.0",
  };

  const allParams = { ...(opts.params ?? {}), ...oauthParams };
  const baseString = buildBaseString(opts.method, opts.url, allParams);
  const signingKey = `${percentEncode(opts.consumerSecret)}&${percentEncode(opts.tokenSecret)}`;
  const signature = createHmac("sha1", signingKey).update(baseString).digest("base64");

  const headerParams: Record<string, string> = { ...oauthParams, oauth_signature: signature };
  const headerString = Object.keys(headerParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(headerParams[k])}"`)
    .join(", ");

  return { Authorization: `OAuth ${headerString}` };
}
