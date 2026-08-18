"use client";

import { useEffect, useState } from "react";
import {
  fetchAllEvents,
  fetchBalances,
  groupEventsByTrackedToken,
  type RegistryEvent,
  type TokenBalance,
} from "@/lib/chain/registry";
import { ManifestTag } from "./manifest-tag";
import { formatTokenAmount, truncateAddress } from "@/lib/format";
import { NOT_YET_TRACKED_TICKERS } from "@/lib/chain/tokenAddresses";
import { explorerAddressUrl } from "@/lib/chain/chain";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      balances: TokenBalance[];
      eventsByToken: Map<string, RegistryEvent[]>;
    };

export function HolderDigest({ address }: { address: `0x${string}` }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    Promise.all([fetchBalances(address), fetchAllEvents()])
      .then(([balances, events]) => {
        if (cancelled) return;
        setState({ status: "ready", balances, eventsByToken: groupEventsByTrackedToken(events) });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: "error", message: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  if (state.status === "loading") {
    return (
      <div className="mt-8 space-y-4">
        {[0, 1].map((i) => (
          <div key={i} className="h-24 animate-pulse border border-dock-line bg-dock-raised" />
        ))}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mt-8 border border-duty/50 bg-duty-soft p-6 font-mono text-sm">
        <p className="uppercase tracking-[0.1em] text-duty">Read failed</p>
        <p className="mt-2 text-bone-muted">{state.message}</p>
        <p className="mt-3 text-bone-muted">
          X Layer testnet has an observed ~10% RPC failure rate. Try inspecting again — reads are
          retried automatically, but a run of bad luck can still exhaust the retry budget.
        </p>
      </div>
    );
  }

  const { balances, eventsByToken } = state;
  const totalEvents = [...eventsByToken.values()].reduce((n, list) => n + list.length, 0);

  return (
    <div className="mt-8 space-y-10">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-[12px] uppercase tracking-[0.1em] text-bone-muted">Balances on record</h2>
          <a
            href={explorerAddressUrl(address)}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[11px] text-tracking underline decoration-tracking/40 underline-offset-4 hover:text-bone"
          >
            {truncateAddress(address)} ↗
          </a>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {balances.map((b) => (
            <div key={b.token.symbol} className="border border-dock-line bg-dock-raised p-4">
              <div className="flex items-center justify-between font-mono text-[12px]">
                <span className="font-bold text-bone">{b.token.symbol}</span>
                {b.contractUnavailable ? (
                  <span className="text-hold">no testnet contract</span>
                ) : (
                  <span className="tabular text-bone">{formatTokenAmount(b.balance ?? 0n, b.decimals)}</span>
                )}
              </div>
              {b.contractUnavailable && (
                <p className="mt-2 text-[11px] leading-relaxed text-bone-muted">
                  {b.token.symbol} has no deployed bytecode on X Layer testnet 1952 — the mainnet address
                  ({truncateAddress(b.token.mainnet)}) is a label, not a queryable balance here.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-mono text-[12px] uppercase tracking-[0.1em] text-bone-muted">Event history by token</h2>
        {totalEvents === 0 ? (
          <div className="mt-3 border border-dock-line bg-dock-raised p-8 text-center">
            <p className="font-stencil text-lg tracking-stencil text-bone">NO REGISTRY HISTORY</p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-bone-muted">
              Nothing has posted yet for the tokens this address can hold. The registry holds one live
              event today (Strategy Inc / MSTR) — most addresses will legitimately see this state until
              more filings clear inspection.
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-8">
            {[...eventsByToken.entries()]
              .filter(([, events]) => events.length > 0)
              .map(([symbol, events]) => (
                <div key={symbol}>
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.08em] text-kraft-light">
                    {symbol} — {events.length} posted event{events.length === 1 ? "" : "s"}
                  </h3>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {events.map((e) => (
                      <ManifestTag key={e.id.toString()} id={e.id} event={e.event} txInfo={null} size="compact" />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <p className="border-t border-dock-line pt-4 font-mono text-[11px] leading-relaxed text-bone-muted">
        Not yet tracked: {NOT_YET_TRACKED_TICKERS.map((t) => `${t}x`).join(", ")} — these tickers are
        configured but not yet polled, so a lookup against them returns nothing rather than an error.
      </p>
    </div>
  );
}
