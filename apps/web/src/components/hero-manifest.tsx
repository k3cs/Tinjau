"use client";

import { useEffect, useState } from "react";
import { ManifestTag } from "./manifest-tag";
import { fetchAllEvents, findEventPostedTx, type RegistryEvent } from "@/lib/chain/registry";

type LoadState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "error"; message: string }
  | { status: "ready"; entry: RegistryEvent };

export function HeroManifest() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [txInfo, setTxInfo] = useState<{ txHash: `0x${string}`; blockNumber: bigint } | null | "loading">("loading");

  useEffect(() => {
    let cancelled = false;
    fetchAllEvents()
      .then((events) => {
        if (cancelled) return;
        if (events.length === 0) {
          setState({ status: "empty" });
          return;
        }
        const entry = events[0];
        setState({ status: "ready", entry });
        findEventPostedTx(entry.id, entry.event.timestamp).then((info) => {
          if (!cancelled) setTxInfo(info);
        });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: "error", message: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="w-full max-w-xl -rotate-1 animate-pulse border border-kraft-line/40 bg-kraft/40 p-8">
        <div className="h-4 w-32 rounded-sm bg-kraft-line/20" />
        <div className="mt-3 h-8 w-48 rounded-sm bg-kraft-line/20" />
        <div className="mt-6 h-24 rounded-sm bg-kraft-line/10" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="w-full max-w-xl border border-duty/50 bg-duty-soft p-6 font-mono text-sm text-bone">
        <p className="uppercase tracking-[0.1em] text-duty">RPC read failed</p>
        <p className="mt-2 text-bone-muted">{state.message}</p>
        <p className="mt-3 text-bone-muted">
          The registry is still live at{" "}
          <code className="text-tracking">0x713f...933aA</code> on X Layer testnet (chain 1952) — this is a
          transient read failure, not an empty registry.
        </p>
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <div className="w-full max-w-xl border border-dock-line bg-dock-raised p-8">
        <p className="font-stencil text-xl tracking-stencil text-bone">MANIFEST EMPTY</p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-bone-muted">
          No corporate event has cleared the dock yet. The registry is live and reads publicly the
          moment the first filing is posted — nothing here is staged for demo purposes.
        </p>
      </div>
    );
  }

  return <ManifestTag id={state.entry.id} event={state.entry.event} txInfo={txInfo} size="hero" />;
}
