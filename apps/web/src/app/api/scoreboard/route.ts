/**
 * Server-side proxy for the P5.1 scoreboard API (`apps/server/src/scoreboard-api`), hosted
 * on the VPS at `SCOREBOARD_API_URL` (deliberately not `NEXT_PUBLIC_`-prefixed — never
 * shipped to the browser bundle; only this Node-runtime Route Handler reads it).
 *
 * The VPS service is plain HTTP with no auth token by design (see its own file header for
 * why) — this is the one place in the whole app allowed to reach it, and only server-side,
 * never proxied blindly to arbitrary client input.
 */

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const base = process.env.SCOREBOARD_API_URL;
  if (!base) {
    return Response.json({ error: "SCOREBOARD_API_URL is not configured" }, { status: 500 });
  }

  try {
    const upstream = await fetch(`${base}/scoreboard`, {
      // This route itself is cached (see the response header below); no need for Next's
      // own fetch cache to also hold a copy.
      cache: "no-store",
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    return Response.json(
      { error: "scoreboard upstream unreachable", detail: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
